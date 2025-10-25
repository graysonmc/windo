/**
 * @fileoverview MCP Protocol V1 Implementation
 * Simple in-memory implementation with phase management, permissions, and audit trails
 */

const IMCPProtocol = require('./mcp-protocol');
const crypto = require('crypto');

/**
 * Phase constants
 */
const PHASES = Object.freeze({
  BUILDING: 'building',
  REVIEWING: 'reviewing',
  FINALIZED: 'finalized',
  RUNTIME: 'runtime'
});

/**
 * @class MCPProtocolV1
 * @extends IMCPProtocol
 * @description V1 implementation with in-memory storage, phase-based permissions, and progressive enrichment
 */
class MCPProtocolV1 extends IMCPProtocol {
  constructor() {
    super();

    /** @type {Map<string, any>} In-memory data store */
    this.data = new Map();

    /** @type {string} Current phase */
    this.phase = PHASES.BUILDING;

    /** @type {Array<Object>} Audit log entries */
    this.auditLog = [];

    /** @type {Map<string, Function>} Registered agents */
    this.agents = new Map();

    /** @type {Object} Phase-based permission configuration */
    this.phasePermissions = this._initializePermissions();
  }

  /**
   * Initialize phase-based permissions
   * @private
   * @returns {Object} Permission configuration
   */
  _initializePermissions() {
    return {
      [PHASES.BUILDING]: {
        parser: {
          reads: ['raw_input'],
          writes: ['parsed_data'],
          preserves: ['parsed_data'] // Fixed: Version parser's OWN output, not its input
        },
        sag: {
          reads: ['parsed_data', 'simulation_settings'],
          writes: ['scenario_outline'],
          preserves: ['scenario_outline'] // Fixed: Version SAG's OWN output, not its input
        },
        validator: {
          reads: ['*'],
          writes: ['validation_result'], // Fixed: was 'validation_warnings', but agent writes 'validation_result'
          preserves: ['*'] // Read-only except validation_result
        },
        user: {
          reads: ['*'],
          writes: ['raw_input', 'simulation_settings'],
          preserves: []
        }
      },
      [PHASES.REVIEWING]: {
        user: {
          reads: ['*'],
          writes: ['user_modifications'],
          preserves: ['*']
        },
        recalibrator: {
          reads: ['*'],
          writes: ['recalibrated_settings'],
          preserves: ['scenario_outline', 'proposed_settings']
        }
      },
      [PHASES.FINALIZED]: {
        finalizer: {
          reads: ['*'],
          writes: ['simulation_blueprint'],
          preserves: ['*']
        },
        '*': { // All other agents
          reads: ['simulation_blueprint'],
          writes: [],
          preserves: ['*']
        }
      },
      [PHASES.RUNTIME]: {
        director: {
          reads: ['simulation_blueprint', 'conversation_history'],
          writes: ['director_state', 'director_logs'],
          preserves: ['simulation_blueprint']
        },
        actor: {
          reads: ['simulation_blueprint', 'director_state', 'conversation_history'],
          writes: ['actor_responses'],
          preserves: ['simulation_blueprint', 'director_state']
        },
        session_manager: {
          reads: ['*'],
          writes: ['conversation_history'],
          preserves: ['simulation_blueprint']
        }
      }
    };
  }

  /**
   * Get permissions for agent in current phase
   * @private
   * @param {string} agentId - Agent ID
   * @returns {Object|null} Permission object or null
   */
  _getAgentPermissions(agentId) {
    const phasePerms = this.phasePermissions[this.phase];
    if (!phasePerms) return null;

    // Check for specific agent permissions
    if (phasePerms[agentId]) {
      return phasePerms[agentId];
    }

    // Check for wildcard permissions
    if (phasePerms['*']) {
      return phasePerms['*'];
    }

    return null;
  }

  /**
   * Hash value for audit log
   * @private
   * @param {any} value - Value to hash
   * @returns {string} Hash string
   */
  _hash(value) {
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    return crypto.createHash('sha256').update(str).digest('hex').substring(0, 16);
  }

  /**
   * Check if key matches pattern (supports wildcards)
   * @private
   * @param {string} key - Key to check
   * @param {Array<string>} patterns - Patterns to match against
   * @returns {boolean} True if matches
   */
  _matchesPattern(key, patterns) {
    if (!patterns || patterns.length === 0) return false;
    if (patterns.includes('*')) return true;
    return patterns.includes(key);
  }

  // ===== Core Operations =====

  /**
   * Read data from protocol storage
   * @param {string} key - Data key
   * @returns {Promise<any>} Data value
   */
  async read(key) {
    // Get the raw value
    const value = this.data.get(key);

    // Return undefined if not found
    if (value === undefined) {
      return undefined;
    }

    // Deep clone to prevent mutations from affecting stored data
    // This ensures "immutable history" - agents can't mutate what they read
    return structuredClone(value);
  }

  /**
   * Write data to protocol storage
   * @param {string} key - Data key
   * @param {any} value - Data value
   * @param {string} agentId - Agent performing write
   * @returns {Promise<void>}
   */
  async write(key, value, agentId) {
    // Check permissions
    const canWrite = await this.checkPermission(agentId, 'write', key);
    if (!canWrite) {
      throw new Error(`Permission denied: ${agentId} cannot write '${key}' in phase '${this.phase}'`);
    }

    // Deep clone value before storing to prevent future mutations from affecting storage
    // This ensures immutability - agents can't accidentally corrupt stored data
    const clonedValue = structuredClone(value);

    // Get agent permissions to check preservation rules
    const permissions = this._getAgentPermissions(agentId);

    // Progressive enrichment - preserve previous values if required
    if (permissions && this._matchesPattern(key, permissions.preserves)) {
      // Store versioned copy with collision-proof key
      // Format: key_v{timestamp}_{uuid} ensures uniqueness even with same-millisecond writes
      const versionKey = `${key}_v${Date.now()}_${crypto.randomUUID()}`;
      this.data.set(versionKey, clonedValue);

      // Update latest pointer
      this.data.set(`${key}_latest`, clonedValue);

      // Also store as current (for backward compatibility)
      this.data.set(key, clonedValue);
    } else {
      // Direct overwrite (no versioning)
      this.data.set(key, clonedValue);
    }

    // Audit log
    this.auditLog.push({
      timestamp: Date.now(),
      phase: this.phase,
      agent: agentId,
      action: 'write',
      key,
      value_hash: this._hash(value),
      preserved: permissions && this._matchesPattern(key, permissions.preserves)
    });
  }

  /**
   * Delete data from protocol storage
   * @param {string} key - Data key
   * @param {string} agentId - Agent performing delete
   * @returns {Promise<void>}
   */
  async delete(key, agentId) {
    // Check permissions
    const canDelete = await this.checkPermission(agentId, 'delete', key);
    if (!canDelete) {
      throw new Error(`Permission denied: ${agentId} cannot delete '${key}' in phase '${this.phase}'`);
    }

    this.data.delete(key);

    // Audit log
    this.auditLog.push({
      timestamp: Date.now(),
      phase: this.phase,
      agent: agentId,
      action: 'delete',
      key
    });
  }

  /**
   * Check if data exists
   * @param {string} key - Data key
   * @returns {Promise<boolean>} True if exists
   */
  async exists(key) {
    return this.data.has(key);
  }

  // ===== Agent Communication =====

  /**
   * Register an agent for protocol calls
   * @param {string} agentId - Agent ID
   * @param {Object} agentInstance - Agent instance with execute method
   */
  registerAgent(agentId, agentInstance) {
    this.agents.set(agentId, agentInstance);
  }

  /**
   * Call another agent through protocol
   * @param {string} agent - Target agent ID
   * @param {string} tool - Tool/method name
   * @param {any} params - Parameters
   * @returns {Promise<any>} Agent response
   */
  async call(agent, tool, params) {
    const agentInstance = this.agents.get(agent);
    if (!agentInstance) {
      throw new Error(`Agent '${agent}' not registered`);
    }

    // For now, we only support 'execute' tool
    if (tool !== 'execute') {
      throw new Error(`Unknown tool '${tool}' for agent '${agent}'`);
    }

    // Call agent's execute method
    const result = await agentInstance.execute(params);

    // Audit log
    this.auditLog.push({
      timestamp: Date.now(),
      phase: this.phase,
      action: 'agent_call',
      caller: 'protocol',
      target: agent,
      tool,
      result_hash: this._hash(result)
    });

    return result;
  }

  /**
   * Broadcast event to all agents
   * @param {string} event - Event name
   * @param {any} data - Event data
   * @returns {Promise<void>}
   */
  async broadcast(event, data) {
    // Audit log
    this.auditLog.push({
      timestamp: Date.now(),
      phase: this.phase,
      action: 'broadcast',
      event,
      data_hash: this._hash(data)
    });

    // In V1, we just log broadcasts
    // V2+ could implement actual event handlers
  }

  // ===== Permissions =====

  /**
   * Check if agent has permission for action on resource
   * @param {string} agent - Agent ID
   * @param {string} action - Action (read/write/delete)
   * @param {string} resource - Resource/key
   * @returns {Promise<boolean>} True if permitted
   */
  async checkPermission(agent, action, resource) {
    const permissions = this._getAgentPermissions(agent);
    if (!permissions) {
      return false; // No permissions defined for agent in this phase
    }

    // Check based on action
    switch (action) {
      case 'read':
        return this._matchesPattern(resource, permissions.reads);

      case 'write':
        return this._matchesPattern(resource, permissions.writes);

      case 'delete':
        // Delete requires write permission
        return this._matchesPattern(resource, permissions.writes);

      default:
        return false;
    }
  }

  /**
   * Grant permission to agent (dynamic permission granting)
   * @param {string} agent - Agent ID
   * @param {Object} permission - Permission object
   * @returns {Promise<void>}
   */
  async grantPermission(agent, permission) {
    // Ensure phase permissions exist
    if (!this.phasePermissions[this.phase]) {
      this.phasePermissions[this.phase] = {};
    }

    // Merge with existing permissions
    if (!this.phasePermissions[this.phase][agent]) {
      this.phasePermissions[this.phase][agent] = permission;
    } else {
      const existing = this.phasePermissions[this.phase][agent];
      this.phasePermissions[this.phase][agent] = {
        reads: [...(existing.reads || []), ...(permission.reads || [])],
        writes: [...(existing.writes || []), ...(permission.writes || [])],
        preserves: [...(existing.preserves || []), ...(permission.preserves || [])]
      };
    }

    // Audit log
    this.auditLog.push({
      timestamp: Date.now(),
      phase: this.phase,
      action: 'grant_permission',
      agent,
      permission
    });
  }

  // ===== Phase Management =====

  /**
   * Transition to new phase (one-way only)
   * @param {string} newPhase - Target phase
   * @returns {Promise<void>}
   */
  async transitionPhase(newPhase) {
    const validTransitions = {
      [PHASES.BUILDING]: [PHASES.REVIEWING],
      [PHASES.REVIEWING]: [PHASES.FINALIZED],
      [PHASES.FINALIZED]: [PHASES.RUNTIME],
      [PHASES.RUNTIME]: [] // Terminal phase
    };

    // Validate transition
    const allowedTransitions = validTransitions[this.phase];
    if (!allowedTransitions || !allowedTransitions.includes(newPhase)) {
      throw new Error(`Invalid phase transition: ${this.phase} → ${newPhase}`);
    }

    const oldPhase = this.phase;
    this.phase = newPhase;

    // Audit log
    this.auditLog.push({
      timestamp: Date.now(),
      action: 'phase_transition',
      from: oldPhase,
      to: newPhase
    });
  }

  /**
   * Get current phase
   * @returns {string} Current phase
   */
  getCurrentPhase() {
    return this.phase;
  }

  // ===== Audit =====

  /**
   * Get audit log with optional filters
   * @param {Object} [filters] - Optional filters
   * @param {string} [filters.agent] - Filter by agent ID
   * @param {string} [filters.action] - Filter by action type
   * @param {number} [filters.since] - Filter by timestamp
   * @returns {Promise<Array<Object>>} Audit log entries
   */
  async getAuditLog(filters = {}) {
    let logs = this.auditLog;

    // Apply filters
    if (filters.agent) {
      logs = logs.filter(entry => entry.agent === filters.agent);
    }

    if (filters.action) {
      logs = logs.filter(entry => entry.action === filters.action);
    }

    if (filters.since) {
      logs = logs.filter(entry => entry.timestamp >= filters.since);
    }

    return logs;
  }

  /**
   * Get all data (for debugging/export)
   * @returns {Object} All data as object
   */
  getAllData() {
    const obj = {};
    for (const [key, value] of this.data.entries()) {
      obj[key] = value;
    }
    return obj;
  }
}

module.exports = { MCPProtocolV1, PHASES };
