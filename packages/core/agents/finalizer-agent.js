/**
 * @fileoverview Finalizer Agent
 * Consolidates builder phase outputs into immutable simulation blueprint
 */

const BaseAgent = require('./base-agent');

/**
 * @class FinalizerAgent
 * @extends BaseAgent
 * @description Creates immutable simulation blueprint from builder phase data
 */
class FinalizerAgent extends BaseAgent {
  /**
   * Execute finalizer - create simulation blueprint
   * @returns {Promise<Object>} Simulation blueprint
   */
  async execute() {
    // Read all builder phase data
    const scenarioOutline = await this.read('scenario_outline');
    const parsedData = await this.read('parsed_data');
    const settings = await this.read('simulation_settings') || this.getDefaultSettings();
    const validationResult = await this.read('validation_result');

    // Validate prerequisites
    this.validatePrerequisites(scenarioOutline, parsedData, validationResult);

    // Assemble blueprint
    const blueprint = this.assembleBlueprint(
      scenarioOutline,
      parsedData,
      settings,
      validationResult
    );

    // Write immutable blueprint to protocol
    await this.write('simulation_blueprint', blueprint);

    return blueprint;
  }

  /**
   * Validate that all required data exists before finalizing
   * @private
   * @param {Object} outline - Scenario outline
   * @param {Object} parsedData - Parsed data
   * @param {Object} validation - Validation result
   * @throws {Error} If prerequisites not met
   */
  validatePrerequisites(outline, parsedData, validation) {
    if (!outline) {
      throw new Error('Cannot finalize: scenario_outline is missing');
    }

    if (!parsedData) {
      throw new Error('Cannot finalize: parsed_data is missing');
    }

    if (!validation) {
      throw new Error('Cannot finalize: validation_result is missing');
    }

    if (!validation.valid) {
      throw new Error(
        `Cannot finalize: validation failed with ${validation.errors.length} errors`
      );
    }

    // Validate outline structure
    if (!outline.goals || outline.goals.length === 0) {
      throw new Error('Cannot finalize: scenario_outline must have at least one goal');
    }
  }

  /**
   * Assemble complete simulation blueprint
   * @private
   * @param {Object} outline - Scenario outline from SAG
   * @param {Object} parsedData - Parsed data from Parser
   * @param {Object} settings - Simulation settings
   * @param {Object} validation - Validation result
   * @returns {Object} Complete blueprint
   */
  assembleBlueprint(outline, parsedData, settings, validation) {
    return {
      // Core scenario data
      scenario_id: outline.scenario_id,
      title: outline.title,
      description: outline.description,
      scenario_text: parsedData.context?.situation || outline.description,

      // Actors
      actors: this.assembleActors(outline.actors, parsedData.actors),

      // Learning objectives and structure
      goals: outline.goals,
      rules: outline.rules || [],
      triggers: outline.triggers || [], // Preserve SAG trigger array
      encounters: outline.encounters || [],
      lessons: outline.lessons || [],
      tests: outline.tests || [],

      // Director configuration
      director_settings: {
        evaluation_frequency: settings.evaluation_frequency || 3,
        narrative_freedom: settings.narrative_freedom || 0.7,
        intervention_style: settings.intervention_style || 'subtle',
        goal_tracking: settings.goal_tracking !== false
      },

      // Actor configuration
      actor_settings: {
        socratic_mode: settings.socratic_mode !== false,
        temperature: settings.actor_temperature || 0.7,
        max_response_tokens: settings.max_response_tokens || 500,
        personality_traits: settings.personality_traits || {}
      },

      // Context from parsing
      context: parsedData.context || {},

      // Metadata
      metadata: {
        created_at: Date.now(),
        finalized_by: this.agentId,
        builder_version: '1.0',
        validation_passed: true,
        source_data_hashes: {
          outline_hash: this.hashData(outline),
          parsed_data_hash: this.hashData(parsedData),
          settings_hash: this.hashData(settings)
        }
      },

      // Immutability marker
      immutable: true,
      locked_at: Date.now()
    };
  }

  /**
   * Assemble actor list from outline and parsed data
   * @private
   * @param {Array} outlineActors - Actors from scenario outline
   * @param {Array} parsedActors - Actors from parsed data
   * @returns {Array} Consolidated actor list
   */
  assembleActors(outlineActors, parsedActors) {
    const actors = outlineActors || [];

    // If no actors in outline but some in parsed data, use those
    if (actors.length === 0 && parsedActors && parsedActors.length > 0) {
      return parsedActors.map(name => ({
        name: typeof name === 'string' ? name : name.name,
        role: typeof name === 'string' ? 'advisor' : (name.role || 'advisor'),
        personality: typeof name === 'string' ? {} : (name.personality || {})
      }));
    }

    // Ensure actors have proper structure
    return actors.map(actor => ({
      name: actor.name || 'Unnamed Actor',
      role: actor.role || 'advisor',
      personality: actor.personality || {},
      goals: actor.goals || []
    }));
  }

  /**
   * Get default simulation settings
   * @private
   * @returns {Object} Default settings
   */
  getDefaultSettings() {
    return {
      evaluation_frequency: 3,
      narrative_freedom: 0.7,
      intervention_style: 'subtle',
      socratic_mode: true,
      actor_temperature: 0.7,
      max_response_tokens: 500,
      goal_tracking: true
    };
  }

  /**
   * Hash data for audit trail
   * @private
   * @param {any} data - Data to hash
   * @returns {string} Hash string
   */
  hashData(data) {
    const crypto = require('crypto');
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto.createHash('sha256').update(str).digest('hex').substring(0, 16);
  }
}

module.exports = FinalizerAgent;
