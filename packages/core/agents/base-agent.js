/**
 * @fileoverview Base Agent Class
 * All MCP agents extend this class to get protocol access and LLM utilities
 */

const OpenAI = require('openai');

/**
 * @class BaseAgent
 * @description Base class for all MCP agents - provides protocol access and LLM utilities
 *
 * Key features:
 * - Fresh OpenAI context per agent (no pollution between agents)
 * - Protocol wrapper methods (automatic agent ID injection)
 * - LLM completion utilities
 * - Abstract execute method that subclasses must implement
 */
class BaseAgent {
  /**
   * @param {Object} protocol - MCP protocol instance
   * @param {Object} config - Agent configuration
   * @param {string} config.agentId - Unique agent identifier
   * @param {Object} [config.llmOptions] - Default LLM options
   */
  constructor(protocol, config) {
    if (!protocol) {
      throw new Error('BaseAgent requires a protocol instance');
    }
    if (!config || !config.agentId) {
      throw new Error('BaseAgent requires config with agentId');
    }

    /** @type {Object} MCP Protocol instance */
    this.protocol = protocol;

    /** @type {Object} Agent configuration */
    this.config = config;

    /** @type {string} Agent ID for permissions and audit */
    this.agentId = config.agentId;

    /** @type {OpenAI} Fresh OpenAI client for this agent */
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    /** @type {Object} Default LLM options */
    this.defaultLLMOptions = config.llmOptions || {};
  }

  // ===== LLM Utilities =====

  /**
   * Call LLM with fresh context (isolated per agent)
   * @param {Array} messages - Chat message array [{role: 'system'|'user'|'assistant', content: string}]
   * @param {string} [model='gpt-4'] - Model to use
   * @param {Object} [options={}] - Additional options
   * @param {number} [options.temperature=0.7] - Temperature (0-2)
   * @param {number} [options.max_tokens=4000] - Max tokens to generate
   * @param {Object} [options.response_format] - Response format (e.g., {type: 'json_object'})
   * @returns {Promise<string>} - LLM response content
   */
  async llmComplete(messages, model = 'gpt-4', options = {}) {
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error('llmComplete requires non-empty messages array');
    }

    const response = await this.openai.chat.completions.create({
      model,
      messages,
      temperature: options.temperature ?? this.defaultLLMOptions.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? this.defaultLLMOptions.max_tokens ?? 4000,
      ...options
    });

    return response.choices[0].message.content;
  }

  /**
   * Call LLM and parse JSON response
   * @param {Array} messages - Chat message array
   * @param {string} [model='gpt-4'] - Model to use
   * @param {Object} [options={}] - Additional options
   * @returns {Promise<Object>} - Parsed JSON response
   */
  async llmCompleteJSON(messages, model = 'gpt-4', options = {}) {
    const content = await this.llmComplete(messages, model, {
      ...options,
      response_format: { type: 'json_object' }
    });

    try {
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to parse LLM JSON response: ${error.message}\n\nResponse: ${content}`);
    }
  }

  // ===== Protocol Wrapper Methods =====

  /**
   * Read data from protocol
   * @param {string} key - Data key
   * @returns {Promise<any>} Data value
   */
  async read(key) {
    return await this.protocol.read(key);
  }

  /**
   * Write data to protocol (agent ID injected automatically)
   * @param {string} key - Data key
   * @param {any} value - Data value
   * @returns {Promise<void>}
   */
  async write(key, value) {
    return await this.protocol.write(key, value, this.agentId);
  }

  /**
   * Delete data from protocol (agent ID injected automatically)
   * @param {string} key - Data key
   * @returns {Promise<void>}
   */
  async delete(key) {
    return await this.protocol.delete(key, this.agentId);
  }

  /**
   * Check if data exists in protocol
   * @param {string} key - Data key
   * @returns {Promise<boolean>} True if exists
   */
  async exists(key) {
    return await this.protocol.exists(key);
  }

  /**
   * Call another agent through protocol
   * @param {string} agent - Target agent ID
   * @param {string} tool - Tool/method name
   * @param {any} params - Parameters
   * @returns {Promise<any>} Agent response
   */
  async call(agent, tool, params) {
    return await this.protocol.call(agent, tool, params);
  }

  /**
   * Broadcast event to all agents
   * @param {string} event - Event name
   * @param {any} data - Event data
   * @returns {Promise<void>}
   */
  async broadcast(event, data) {
    return await this.protocol.broadcast(event, data);
  }

  /**
   * Check if this agent has permission for action
   * @param {string} action - Action (read/write/delete)
   * @param {string} resource - Resource/key
   * @returns {Promise<boolean>} True if permitted
   */
  async hasPermission(action, resource) {
    return await this.protocol.checkPermission(this.agentId, action, resource);
  }

  // ===== Abstract Methods =====

  /**
   * Execute agent's primary task - MUST be implemented by subclasses
   * @param {any} params - Execution parameters (agent-specific)
   * @returns {Promise<any>} - Agent-specific result
   * @abstract
   */
  async execute(params) {
    throw new Error(`Agent '${this.agentId}' must implement execute() method`);
  }

  /**
   * Validate agent is properly configured
   * @returns {boolean} True if valid
   */
  validate() {
    if (!this.agentId) {
      throw new Error('Agent missing agentId');
    }
    if (!this.protocol) {
      throw new Error('Agent missing protocol instance');
    }
    if (!this.openai) {
      throw new Error('Agent missing OpenAI instance');
    }
    return true;
  }
}

module.exports = BaseAgent;
