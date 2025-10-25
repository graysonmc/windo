/**
 * @fileoverview MCP Protocol Base Class
 * Defines the core interface for all MCP protocol implementations.
 * This interface never changes - implementations can evolve but must maintain this contract.
 */

/**
 * @class IMCPProtocol
 * @description Base class for MCP Protocol - all implementations must extend this
 *
 * The MCP Protocol provides:
 * - Phase-based permissions (building → reviewing → finalized → runtime)
 * - Progressive enrichment (versioned data, immutable history)
 * - Complete audit trails (who changed what and when)
 * - Agent isolation (fresh contexts, no pollution)
 */
class IMCPProtocol {
  // ===== Core Operations =====

  /**
   * Read data from protocol storage
   * @param {string} key - Data key to read
   * @returns {Promise<any>} Data value
   */
  async read(key) {
    throw new Error('Must implement read()');
  }

  /**
   * Write data to protocol storage
   * @param {string} key - Data key to write
   * @param {any} value - Data value
   * @param {string} agentId - Agent performing the write
   * @returns {Promise<void>}
   */
  async write(key, value, agentId) {
    throw new Error('Must implement write()');
  }

  /**
   * Delete data from protocol storage
   * @param {string} key - Data key to delete
   * @param {string} agentId - Agent performing the delete
   * @returns {Promise<void>}
   */
  async delete(key, agentId) {
    throw new Error('Must implement delete()');
  }

  /**
   * Check if data exists
   * @param {string} key - Data key to check
   * @returns {Promise<boolean>} True if exists
   */
  async exists(key) {
    throw new Error('Must implement exists()');
  }

  // ===== Agent Communication =====

  /**
   * Call another agent through protocol
   * @param {string} agent - Target agent ID
   * @param {string} tool - Tool/method name
   * @param {any} params - Parameters for the call
   * @returns {Promise<any>} Agent response
   */
  async call(agent, tool, params) {
    throw new Error('Must implement call()');
  }

  /**
   * Broadcast event to all agents
   * @param {string} event - Event name
   * @param {any} data - Event data
   * @returns {Promise<void>}
   */
  async broadcast(event, data) {
    throw new Error('Must implement broadcast()');
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
    throw new Error('Must implement checkPermission()');
  }

  /**
   * Grant permission to agent
   * @param {string} agent - Agent ID
   * @param {Object} permission - Permission object
   * @returns {Promise<void>}
   */
  async grantPermission(agent, permission) {
    throw new Error('Must implement grantPermission()');
  }

  // ===== Phase Management =====

  /**
   * Transition to new phase (one-way only)
   * @param {string} newPhase - Target phase (building|reviewing|finalized|runtime)
   * @returns {Promise<void>}
   */
  async transitionPhase(newPhase) {
    throw new Error('Must implement transitionPhase()');
  }

  /**
   * Get current phase
   * @returns {string} Current phase
   */
  getCurrentPhase() {
    throw new Error('Must implement getCurrentPhase()');
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
  async getAuditLog(filters) {
    throw new Error('Must implement getAuditLog()');
  }
}

module.exports = IMCPProtocol;
