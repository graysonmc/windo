/**
 * Director Settings Schema
 * Configuration for NSM Director behavior and intervention policy
 */

import { z } from 'zod';

// Evaluation Cadence Schema
export const EvaluationCadenceSchema = z.object({
  message_interval: z.number().int().min(1).optional().describe('Evaluate every N messages'),
  event_triggers: z.array(z.string()).optional().describe('Event names that trigger evaluation'),
  time_interval_seconds: z.number().int().min(1).optional().describe('Evaluate every N seconds')
});

// Learning Objective Target Schema
export const LearningObjectiveTargetSchema = z.object({
  threshold: z.number().min(0).max(1).describe('Minimum progress required (0.0-1.0)'),
  priority: z.enum(['low', 'medium', 'high']).default('medium')
});

// Verification Policy Schema
export const VerificationPolicySchema = z.object({
  enabled: z.boolean().default(true),
  retry_limit: z.number().int().min(0).max(3).default(1),
  temperature_override: z.number().min(0).max(2).optional().describe('Temperature for verification retries')
});

// Main Director Settings Schema
export const DirectorSettingsSchema = z.object({
  schema_version: z.string().default('1.0.0'),
  intensity: z.enum(['off', 'assist', 'assertive']).default('assist').describe('How proactive the Director is'),
  evaluation_cadence: EvaluationCadenceSchema,
  learning_objective_targets: z.record(z.string(), LearningObjectiveTargetSchema).optional(),
  allowed_actor_interventions: z.array(z.enum([
    'goal_shift',
    'enter_exit_actor',
    'hidden_info_reveal',
    'tone_adjustment',
    'event_trigger'
  ])).default(['goal_shift', 'enter_exit_actor', 'hidden_info_reveal']),
  adaptation_flexibility: z.number().min(0).max(100).default(50).describe('0-100 scale of how much Director can adapt'),
  max_latency_ms: z.number().int().min(100).max(10000).default(3500).describe('Maximum acceptable Director latency'),
  max_cost_per_decision: z.number().min(0).max(1).default(0.02).describe('Maximum cost per Director decision in USD'),
  verification_policy: VerificationPolicySchema.optional()
});

// Validation helpers
export const validateDirectorSettings = (data) => DirectorSettingsSchema.parse(data);
export const validateDirectorSettingsSafe = (data) => DirectorSettingsSchema.safeParse(data);
