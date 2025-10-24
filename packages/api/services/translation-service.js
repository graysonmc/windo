/**
 * Translation Service
 *
 * Validates and normalizes scenario data against NSM contracts
 * Acts as gateway between Builder V2 and NSM Runtime
 */

import {
  validateScenarioOutline,
  validateScenarioOutlineSafe,
  validateDirectorSettings,
  validateDirectorSettingsSafe,
  validateSimulationConfig,
  SCHEMA_VERSION
} from '../../shared-contracts/src/index.js';

class TranslationService {
  constructor() {
    this.schemaVersion = SCHEMA_VERSION;
  }

  /**
   * Validate and normalize a scenario outline
   * @param {Object} outline - Raw outline from Builder
   * @returns {Object} Validation result with normalized data or errors
   */
  async validateOutline(outline) {
    try {
      // Add schema version if not present
      const outlineWithVersion = {
        schema_version: this.schemaVersion,
        ...outline
      };

      // Validate with Zod
      const result = validateScenarioOutlineSafe(outlineWithVersion);

      if (!result.success) {
        return {
          valid: false,
          errors: this._formatZodErrors(result.error),
          warnings: []
        };
      }

      // Normalize and add defaults
      const normalized = result.data;

      // Generate warnings for missing optional but recommended fields
      const warnings = this._generateWarnings(normalized);

      return {
        valid: true,
        outline: normalized,
        warnings,
        schema_version: this.schemaVersion
      };
    } catch (error) {
      return {
        valid: false,
        errors: [{ message: error.message }],
        warnings: []
      };
    }
  }

  /**
   * Validate Director settings
   */
  async validateSettings(settings) {
    try {
      const settingsWithVersion = {
        schema_version: this.schemaVersion,
        ...settings
      };

      const result = validateDirectorSettingsSafe(settingsWithVersion);

      if (!result.success) {
        return {
          valid: false,
          errors: this._formatZodErrors(result.error),
          warnings: []
        };
      }

      return {
        valid: true,
        settings: result.data,
        warnings: this._generateSettingsWarnings(result.data),
        schema_version: this.schemaVersion
      };
    } catch (error) {
      return {
        valid: false,
        errors: [{ message: error.message }],
        warnings: []
      };
    }
  }

  /**
   * Validate complete simulation configuration
   */
  async validateComplete(config) {
    const results = {
      valid: true,
      normalized: {},
      errors: [],
      warnings: []
    };

    // Validate outline
    if (config.scenario_outline) {
      const outlineResult = await this.validateOutline(config.scenario_outline);
      if (!outlineResult.valid) {
        results.valid = false;
        results.errors.push(...outlineResult.errors.map(e => ({
          field: 'scenario_outline',
          ...e
        })));
      } else {
        results.normalized.scenario_outline = outlineResult.outline;
        results.warnings.push(...outlineResult.warnings);
      }
    }

    // Validate settings
    if (config.director_settings) {
      const settingsResult = await this.validateSettings(config.director_settings);
      if (!settingsResult.valid) {
        results.valid = false;
        results.errors.push(...settingsResult.errors.map(e => ({
          field: 'director_settings',
          ...e
        })));
      } else {
        results.normalized.director_settings = settingsResult.settings;
        results.warnings.push(...settingsResult.warnings);
      }
    }

    results.schema_version = this.schemaVersion;
    return results;
  }

  /**
   * Create a snapshot for NSM runtime
   */
  async createSnapshot(simulationId, config) {
    const validation = await this.validateComplete(config);

    if (!validation.valid) {
      throw new Error(`Cannot create snapshot: validation failed\n${JSON.stringify(validation.errors, null, 2)}`);
    }

    return {
      snapshot_id: `${simulationId}_${Date.now()}`,
      simulation_id: simulationId,
      schema_version: this.schemaVersion,
      created_at: new Date().toISOString(),
      config: validation.normalized,
      warnings: validation.warnings
    };
  }

  /**
   * Format Zod errors for user consumption
   */
  _formatZodErrors(zodError) {
    return zodError.errors.map(err => ({
      path: err.path.join('.'),
      message: err.message,
      code: err.code
    }));
  }

  /**
   * Generate warnings for missing optional but recommended fields
   */
  _generateWarnings(outline) {
    const warnings = [];

    // Check if goals have success criteria
    outline.goals?.forEach((goal, index) => {
      if (!goal.success_criteria || goal.success_criteria.required_evidence.length === 0) {
        warnings.push({
          severity: 'warning',
          field: `goals[${index}].success_criteria`,
          message: `Goal "${goal.description}" lacks success criteria - Director won't be able to track progress`
        });
      }

      if (!goal.progress_tracking || !goal.progress_tracking.milestones || goal.progress_tracking.milestones.length === 0) {
        warnings.push({
          severity: 'info',
          field: `goals[${index}].progress_tracking`,
          message: `Goal "${goal.description}" has no progress milestones - Director will use binary completion only`
        });
      }
    });

    // Check for director triggers
    if (!outline.director_triggers || outline.director_triggers.length === 0) {
      warnings.push({
        severity: 'info',
        field: 'director_triggers',
        message: 'No Director triggers defined - Director will only evaluate on message intervals'
      });
    }

    // Check for adaptation constraints
    if (!outline.adaptation_constraints) {
      warnings.push({
        severity: 'info',
        field: 'adaptation_constraints',
        message: 'No adaptation constraints defined - Director will use default boundaries'
      });
    }

    return warnings;
  }

  /**
   * Generate warnings for Director settings
   */
  _generateSettingsWarnings(settings) {
    const warnings = [];

    // Check if intensity is off
    if (settings.intensity === 'off') {
      warnings.push({
        severity: 'warning',
        field: 'intensity',
        message: 'Director intensity is OFF - no interventions will occur'
      });
    }

    // Check evaluation cadence
    if (!settings.evaluation_cadence.message_interval &&
        !settings.evaluation_cadence.time_interval_seconds &&
        (!settings.evaluation_cadence.event_triggers || settings.evaluation_cadence.event_triggers.length === 0)) {
      warnings.push({
        severity: 'error',
        field: 'evaluation_cadence',
        message: 'No evaluation cadence defined - Director will never run'
      });
    }

    return warnings;
  }
}

export default TranslationService;
