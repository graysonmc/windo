/**
 * @fileoverview Validator Agent
 * Validates scenario outline and director settings against NSM contracts
 */

const BaseAgent = require('./base-agent');

/**
 * @class ValidatorAgent
 * @extends BaseAgent
 * @description Validates scenario data without modifying it
 *
 * Responsibilities:
 * - Read 'scenario_outline' from protocol
 * - Optionally read 'director_settings' from protocol
 * - Perform basic structural validation
 * - Generate warnings for missing optional but recommended fields
 * - Write 'validation_result' to protocol
 * - Ensure read-only (preserves all data, never modifies)
 *
 * Note: This is a simplified validator for MCP Phase 1.
 * Full Zod schema validation will be added in Phase 2 when integrating with NSM runtime.
 */
class ValidatorAgent extends BaseAgent {
  /**
   * Execute validation task
   * @param {Object} [params] - Optional parameters
   * @returns {Promise<Object>} Validation result
   */
  async execute(params = {}) {
    // Read from protocol
    const scenarioOutline = await this.read('scenario_outline');
    const directorSettings = await this.read('director_settings');

    if (!scenarioOutline) {
      throw new Error('ValidatorAgent: No scenario_outline found in protocol');
    }

    // Validate outline
    const outlineValidation = this._validateOutline(scenarioOutline);

    // Validate settings if present
    let settingsValidation = null;
    if (directorSettings) {
      settingsValidation = this._validateSettings(directorSettings);
    }

    // Aggregate results
    const validation = this._aggregateValidation(outlineValidation, settingsValidation);

    // Write validation result to protocol
    await this.write('validation_result', validation);

    // Broadcast event
    await this.broadcast('validation_complete', {
      valid: validation.valid,
      errorCount: validation.errors.length,
      warningCount: validation.warnings.length
    });

    return validation;
  }

  /**
   * Validate scenario outline structure
   * @param {Object} outline - Scenario outline
   * @returns {Object} Validation result
   */
  _validateOutline(outline) {
    const errors = [];
    const warnings = [];

    // Required fields
    if (!outline.scenario_id) errors.push({ path: 'scenario_id', message: 'scenario_id is required' });
    if (!outline.title) errors.push({ path: 'title', message: 'title is required' });
    if (!outline.description) errors.push({ path: 'description', message: 'description is required' });

    // Required arrays
    if (!Array.isArray(outline.goals)) {
      errors.push({ path: 'goals', message: 'goals must be an array' });
    } else {
      // Validate each goal
      outline.goals.forEach((goal, index) => {
        if (!goal.id) errors.push({ path: `goals[${index}].id`, message: 'Goal id is required' });
        if (!goal.description) errors.push({ path: `goals[${index}].description`, message: 'Goal description is required' });

        // Warnings for missing success criteria
        if (!goal.success_criteria || !goal.success_criteria.required_evidence || goal.success_criteria.required_evidence.length === 0) {
          warnings.push({
            severity: 'warning',
            field: `goals[${index}].success_criteria`,
            message: `Goal "${goal.description}" lacks success criteria - Director won't be able to track progress`
          });
        }

        // Warnings for missing progress tracking
        if (!goal.progress_tracking || !goal.progress_tracking.milestones || goal.progress_tracking.milestones.length === 0) {
          warnings.push({
            severity: 'info',
            field: `goals[${index}].progress_tracking`,
            message: `Goal "${goal.description}" has no progress milestones - Director will use binary completion only`
          });
        }
      });
    }

    // Check optional but recommended fields
    if (!outline.director_triggers || outline.director_triggers.length === 0) {
      warnings.push({
        severity: 'info',
        field: 'director_triggers',
        message: 'No Director triggers defined - Director will only evaluate on message intervals'
      });
    }

    if (!outline.adaptation_constraints) {
      warnings.push({
        severity: 'info',
        field: 'adaptation_constraints',
        message: 'No adaptation constraints defined - Director will use default boundaries'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      schema_version: '1.0.0'
    };
  }

  /**
   * Validate director settings structure
   * @param {Object} settings - Director settings
   * @returns {Object} Validation result
   */
  _validateSettings(settings) {
    const errors = [];
    const warnings = [];

    // Required fields
    if (!settings.intensity) {
      errors.push({ path: 'intensity', message: 'intensity is required' });
    } else {
      // Check valid intensity values
      const validIntensities = ['off', 'light', 'balanced', 'active', 'intensive'];
      if (!validIntensities.includes(settings.intensity)) {
        errors.push({ path: 'intensity', message: `intensity must be one of: ${validIntensities.join(', ')}` });
      }

      // Warn if intensity is off
      if (settings.intensity === 'off') {
        warnings.push({
          severity: 'warning',
          field: 'intensity',
          message: 'Director intensity is OFF - no interventions will occur'
        });
      }
    }

    // Check evaluation cadence
    if (!settings.evaluation_cadence) {
      errors.push({ path: 'evaluation_cadence', message: 'evaluation_cadence is required' });
    } else {
      const cadence = settings.evaluation_cadence;
      if (!cadence.message_interval && !cadence.time_interval_seconds && (!cadence.event_triggers || cadence.event_triggers.length === 0)) {
        warnings.push({
          severity: 'error',
          field: 'evaluation_cadence',
          message: 'No evaluation cadence defined - Director will never run'
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      schema_version: '1.0.0'
    };
  }

  /**
   * Aggregate validation results
   * @param {Object} outlineValidation - Outline validation result
   * @param {Object} settingsValidation - Settings validation result (optional)
   * @returns {Object} Aggregated validation
   */
  _aggregateValidation(outlineValidation, settingsValidation) {
    const result = {
      valid: outlineValidation.valid,
      errors: [],
      warnings: [],
      schema_version: '1.0.0',
      validated_at: Date.now()
    };

    // Add outline errors/warnings
    if (!outlineValidation.valid) {
      result.errors.push(...outlineValidation.errors.map(e => ({
        source: 'scenario_outline',
        ...e
      })));
    }

    result.warnings.push(...(outlineValidation.warnings || []).map(w => ({
      source: 'scenario_outline',
      ...w
    })));

    // Add settings errors/warnings if present
    if (settingsValidation) {
      if (!settingsValidation.valid) {
        result.valid = false;
        result.errors.push(...settingsValidation.errors.map(e => ({
          source: 'director_settings',
          ...e
        })));
      }

      result.warnings.push(...(settingsValidation.warnings || []).map(w => ({
        source: 'director_settings',
        ...w
      })));
    }

    return result;
  }

  /**
   * Get summary of validation results
   * @param {Object} validation - Validation result
   * @returns {string} Summary
   */
  getSummary(validation) {
    return `
Validation Status: ${validation.valid ? 'PASS' : 'FAIL'}
Errors: ${validation.errors.length}
Warnings: ${validation.warnings.length}
Schema Version: ${validation.schema_version}
    `.trim();
  }
}

module.exports = ValidatorAgent;
