/**
 * Shared Contracts - Schema Exports
 * All Zod schemas for NSM validation
 */

// Scenario Outline Schemas
export {
  ScenarioOutlineSchema,
  GoalSchema,
  SuccessCriteriaSchema,
  ProgressTrackingSchema,
  TestSchema,
  ActorTriggerSchema,
  DirectorTriggerSchema,
  SuggestedStructureSchema,
  AdaptationConstraintsSchema,
  EncounterSchema,
  LessonSchema,
  validateScenarioOutline,
  validateScenarioOutlineSafe
} from './scenario-outline.js';

// Director Settings Schemas
export {
  DirectorSettingsSchema,
  EvaluationCadenceSchema,
  LearningObjectiveTargetSchema,
  VerificationPolicySchema,
  validateDirectorSettings,
  validateDirectorSettingsSafe
} from './director-settings.js';

// Director State Schemas
export {
  DirectorStateSchema,
  ActorEngagementSchema,
  PendingEventSchema,
  validateDirectorState,
  validateDirectorStateSafe
} from './director-state.js';

// Schema version constant
export const SCHEMA_VERSION = '1.0.0';

/**
 * Validate all schemas for a complete simulation configuration
 */
export function validateSimulationConfig(config) {
  const results = {
    valid: true,
    errors: []
  };

  // Validate scenario outline if present
  if (config.scenario_outline) {
    const outlineResult = validateScenarioOutlineSafe(config.scenario_outline);
    if (!outlineResult.success) {
      results.valid = false;
      results.errors.push({
        field: 'scenario_outline',
        errors: outlineResult.error.errors
      });
    }
  }

  // Validate director settings if present
  if (config.director_settings) {
    const settingsResult = validateDirectorSettingsSafe(config.director_settings);
    if (!settingsResult.success) {
      results.valid = false;
      results.errors.push({
        field: 'director_settings',
        errors: settingsResult.error.errors
      });
    }
  }

  // Validate director state if present
  if (config.director_state) {
    const stateResult = validateDirectorStateSafe(config.director_state);
    if (!stateResult.success) {
      results.valid = false;
      results.errors.push({
        field: 'director_state',
        errors: stateResult.error.errors
      });
    }
  }

  return results;
}
