/**
 * Director State Schema
 * Runtime state tracking for NSM Director
 */

import { z } from 'zod';

// Actor Engagement Schema
export const ActorEngagementSchema = z.object({
  talk_time: z.number().min(0).max(1).describe('Percentage of conversation'),
  compliance: z.number().min(0).max(1).describe('How well actor follows Director guidance')
});

// Pending Event Schema
export const PendingEventSchema = z.object({
  id: z.string(),
  scheduled_at_message: z.number().int().min(0).optional(),
  scheduled_at_time: z.string().optional().describe('ISO timestamp'),
  event_type: z.string().optional()
});

// Main Director State Schema
export const DirectorStateSchema = z.object({
  schema_version: z.string().default('1.0.0'),
  last_evaluated_message: z.number().int().min(0),
  current_phase_id: z.string().optional(),
  tension_score: z.number().min(0).max(1).optional().describe('Left 4 Dead style tension tracking'),
  divergence_score: z.number().min(0).max(1).describe('How far off-track from scenario arc'),
  objective_progress: z.record(z.string(), z.number().min(0).max(1)).describe('Progress per learning objective'),
  actor_engagement: z.record(z.string(), ActorEngagementSchema).optional(),
  pending_events: z.array(PendingEventSchema).default([]),
  notes: z.array(z.string()).default([]).describe('Director reasoning notes')
});

// Validation helpers
export const validateDirectorState = (data) => DirectorStateSchema.parse(data);
export const validateDirectorStateSafe = (data) => DirectorStateSchema.safeParse(data);
