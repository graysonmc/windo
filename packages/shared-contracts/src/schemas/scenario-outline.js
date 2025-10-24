/**
 * Scenario Outline Schema - Enhanced for NSM
 * Defines the structure for simulation scenarios with learning objectives,
 * success criteria, and director triggers
 */

import { z } from 'zod';

// Success Criteria Schema
export const SuccessCriteriaSchema = z.object({
  required_evidence: z.array(z.string()).describe('Evidence that must be demonstrated'),
  minimum_depth: z.string().optional().describe('Description of required depth of understanding'),
  assessment_method: z.enum(['llm_analysis', 'keyword_match', 'manual_review']).default('llm_analysis'),
  partial_credit: z.boolean().default(true)
});

// Progress Tracking Schema
export const ProgressTrackingSchema = z.object({
  milestones: z.array(z.object({
    at: z.number().min(0).max(1).describe('Progress percentage (0.0-1.0)'),
    indicator: z.string().describe('What indicates this milestone is reached')
  })),
  measurement: z.enum(['progress_llm_scoring', 'keyword_detection', 'manual']).default('progress_llm_scoring')
});

// Test Schema
export const TestSchema = z.object({
  type: z.enum(['decision_point', 'reflection_question', 'scenario_response']),
  description: z.string(),
  evidence_of_learning: z.string().optional()
});

// Goal Schema (Enhanced)
export const GoalSchema = z.object({
  id: z.string(),
  description: z.string(),
  priority: z.number().int().min(1),
  required: z.boolean().default(true),
  success_criteria: SuccessCriteriaSchema,
  progress_tracking: ProgressTrackingSchema,
  tests: z.array(TestSchema).optional()
});

// Actor Trigger Schema
export const ActorTriggerSchema = z.object({
  actor: z.string(),
  type: z.enum(['keyword', 'sentiment', 'progress', 'message_count', 'time_elapsed']),
  condition: z.string().describe('Condition that activates the trigger'),
  action: z.string().describe('What the actor should do'),
  priority: z.number().int().min(1).default(1)
});

// Director Trigger Schema
export const DirectorTriggerSchema = z.object({
  name: z.string(),
  condition: z.string().describe('JavaScript-like condition expression'),
  director_action: z.string().describe('What the Director should do'),
  urgency: z.enum(['low', 'medium', 'high']).default('medium')
});

// Suggested Structure Schema
export const SuggestedStructureSchema = z.object({
  beginning: z.object({
    suggested_duration: z.object({
      messages: z.number().int().optional(),
      progress: z.number().min(0).max(1).optional()
    }),
    goals_to_introduce: z.array(z.string()),
    tone: z.string().optional(),
    avoid: z.array(z.string()).optional()
  }).optional(),
  middle: z.object({
    suggested_duration: z.object({
      progress: z.number().min(0).max(1).optional()
    }).optional(),
    goals_to_test: z.array(z.string()),
    escalation: z.string().optional(),
    tone: z.string().optional()
  }).optional(),
  end: z.object({
    triggered_by: z.array(z.string()),
    goals_to_conclude: z.array(z.string()),
    include_tests: z.array(z.string()).optional(),
    tone: z.string().optional()
  }).optional(),
  flexibility_note: z.string().optional()
});

// Adaptation Constraints Schema
export const AdaptationConstraintsSchema = z.object({
  can_do: z.array(z.string()).describe('What Director is allowed to adjust'),
  cannot_do: z.array(z.string()).describe('What Director must not change'),
  if_student_completely_lost: z.object({
    threshold: z.string(),
    action: z.string()
  }).optional()
});

// Encounter Schema
export const EncounterSchema = z.object({
  id: z.string(),
  description: z.string(),
  related_goals: z.array(z.string()),
  escalation: z.enum(['low', 'moderate', 'high']).optional()
});

// Lesson Schema
export const LessonSchema = z.object({
  id: z.string(),
  key_points: z.array(z.string()),
  evidence_of_coverage: z.string()
});

// Main Scenario Outline Schema
export const ScenarioOutlineSchema = z.object({
  schema_version: z.string().default('1.0.0'),
  goals: z.array(GoalSchema),
  rules: z.array(z.string()).optional(),
  encounters: z.array(EncounterSchema).optional(),
  lessons: z.array(LessonSchema).optional(),
  tests: z.array(TestSchema).optional(),
  actor_triggers: z.array(ActorTriggerSchema).optional(),
  director_triggers: z.array(DirectorTriggerSchema).optional(),
  suggested_structure: SuggestedStructureSchema.optional(),
  adaptation_constraints: AdaptationConstraintsSchema.optional()
});

// Type exports for TypeScript-like usage
export const validateScenarioOutline = (data) => ScenarioOutlineSchema.parse(data);
export const validateScenarioOutlineSafe = (data) => ScenarioOutlineSchema.safeParse(data);
