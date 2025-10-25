/**
 * @fileoverview Validator Agent Unit Tests
 */

const ValidatorAgent = require('../validator-agent');
const { MCPProtocolV1 } = require('../../protocol/mcp-v1-simple');

describe('ValidatorAgent', () => {
  let protocol;
  let validator;

  beforeEach(() => {
    protocol = new MCPProtocolV1();
    validator = new ValidatorAgent(protocol, { agentId: 'validator' });

    // Grant validator permissions (read-only in building phase)
    protocol.grantPermission('validator', {
      reads: ['*'],
      writes: ['validation_result'],
      preserves: ['*'] // Validator never modifies data
    });

    // Grant permissions for test data setup
    protocol.grantPermission('sag', {
      reads: ['parsed_data'],
      writes: ['scenario_outline', 'director_settings'],
      preserves: ['parsed_data']
    });
  });

  // ===== Basic Validation =====

  describe('Basic Validation', () => {
    test('should validate valid scenario outline', async () => {
      const validOutline = {
        scenario_id: 'test-scenario',
        title: 'Test Scenario',
        description: 'A test scenario',
        actors: [],
        goals: [
          {
            id: 'goal_1',
            description: 'Test goal',
            success_criteria: {
              required_evidence: ['Student demonstrates understanding']
            },
            progress_tracking: {
              milestones: []
            },
            tests: []
          }
        ],
        rules: [],
        encounters: [],
        lessons: [],
        actor_triggers: [],
        director_triggers: [],
        suggested_structure: {
          beginning: { guidance: 'Start here' },
          middle: { guidance: 'Continue' },
          end: { guidance: 'Finish' }
        },
        adaptation_constraints: {
          actor_freedom: 'moderate',
          director_authority: 'adaptive'
        }
      };

      await protocol.write('scenario_outline', validOutline, 'sag');

      const result = await validator.execute();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.schema_version).toBeDefined();
    });

    test('should write validation result to protocol', async () => {
      const outline = {
        scenario_id: 'test',
        title: 'Test',
        description: 'Test',
        actors: [],
        goals: [{
          id: 'g1',
          description: 'Goal',
          success_criteria: { required_evidence: ['Evidence'] },
          progress_tracking: { milestones: [] },
          tests: []
        }],
        rules: [],
        encounters: [],
        lessons: [],
        actor_triggers: [],
        director_triggers: [],
        suggested_structure: {
          beginning: { guidance: 'Start' },
          middle: { guidance: 'Middle' },
          end: { guidance: 'End' }
        },
        adaptation_constraints: {
          actor_freedom: 'moderate',
          director_authority: 'adaptive'
        }
      };

      await protocol.write('scenario_outline', outline, 'sag');
      await validator.execute();

      const validationResult = await protocol.read('validation_result');
      expect(validationResult).toBeDefined();
      expect(validationResult.valid).toBeDefined();
    });

    test('should broadcast validation_complete event', async () => {
      const outline = {
        scenario_id: 'test',
        title: 'Test',
        description: 'Test',
        actors: [],
        goals: [{
          id: 'g1',
          description: 'Goal',
          success_criteria: { required_evidence: ['Evidence'] },
          progress_tracking: { milestones: [] },
          tests: []
        }],
        rules: [],
        encounters: [],
        lessons: [],
        actor_triggers: [],
        director_triggers: [],
        suggested_structure: {
          beginning: { guidance: 'Start' },
          middle: { guidance: 'Middle' },
          end: { guidance: 'End' }
        },
        adaptation_constraints: {
          actor_freedom: 'moderate',
          director_authority: 'adaptive'
        }
      };

      await protocol.write('scenario_outline', outline, 'sag');
      await validator.execute();

      const auditLog = await protocol.getAuditLog();
      const broadcastEvent = auditLog.find(
        e => e.action === 'broadcast' && e.event === 'validation_complete'
      );

      expect(broadcastEvent).toBeDefined();
      expect(broadcastEvent.event).toBe('validation_complete');
    });
  });

  // ===== Error Handling =====

  describe('Error Handling', () => {
    test('should throw error if no scenario_outline exists', async () => {
      await expect(validator.execute()).rejects.toThrow('No scenario_outline found');
    });

    test('should detect invalid scenario outline', async () => {
      const invalidOutline = {
        scenario_id: 'test',
        // Missing required fields: title, description, goals, etc.
      };

      await protocol.write('scenario_outline', invalidOutline, 'sag');

      const result = await validator.execute();

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should identify specific validation errors', async () => {
      const invalidOutline = {
        scenario_id: 'test',
        title: 'Test',
        // Missing description, goals, etc.
      };

      await protocol.write('scenario_outline', invalidOutline, 'sag');

      const result = await validator.execute();

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toHaveProperty('path');
      expect(result.errors[0]).toHaveProperty('message');
    });
  });

  // ===== Warnings =====

  describe('Validation Warnings', () => {
    test('should generate warnings for missing optional fields', async () => {
      const outlineWithMissingOptionals = {
        scenario_id: 'test',
        title: 'Test Scenario',
        description: 'A test scenario',
        actors: [],
        goals: [
          {
            id: 'goal_1',
            description: 'Test goal',
            success_criteria: {
              required_evidence: [] // Empty - should warn
            },
            progress_tracking: {
              milestones: [] // Empty - should warn
            },
            tests: []
          }
        ],
        rules: [],
        encounters: [],
        lessons: [],
        actor_triggers: [],
        director_triggers: [], // Empty - should warn
        suggested_structure: {
          beginning: { guidance: 'Start' },
          middle: { guidance: 'Middle' },
          end: { guidance: 'End' }
        },
        // Missing adaptation_constraints - should warn
      };

      await protocol.write('scenario_outline', outlineWithMissingOptionals, 'sag');

      const result = await validator.execute();

      // Should be valid but have warnings
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    test('should categorize warnings by source', async () => {
      const outline = {
        scenario_id: 'test',
        title: 'Test',
        description: 'Test',
        actors: [],
        goals: [{
          id: 'g1',
          description: 'Goal',
          success_criteria: { required_evidence: [] }, // Will warn
          progress_tracking: { milestones: [] },
          tests: []
        }],
        rules: [],
        encounters: [],
        lessons: [],
        actor_triggers: [],
        director_triggers: [],
        suggested_structure: {
          beginning: { guidance: 'Start' },
          middle: { guidance: 'Middle' },
          end: { guidance: 'End' }
        },
        adaptation_constraints: {
          actor_freedom: 'moderate',
          director_authority: 'adaptive'
        }
      };

      await protocol.write('scenario_outline', outline, 'sag');

      const result = await validator.execute();

      const outlineWarnings = result.warnings.filter(w => w.source === 'scenario_outline');
      expect(outlineWarnings.length).toBeGreaterThan(0);
    });
  });

  // ===== Director Settings Validation =====

  describe('Director Settings Validation', () => {
    test('should validate director settings if present', async () => {
      const outline = {
        scenario_id: 'test',
        title: 'Test',
        description: 'Test',
        actors: [],
        goals: [{
          id: 'g1',
          description: 'Goal',
          success_criteria: { required_evidence: ['Evidence'] },
          progress_tracking: { milestones: [] },
          tests: []
        }],
        rules: [],
        encounters: [],
        lessons: [],
        actor_triggers: [],
        director_triggers: [],
        suggested_structure: {
          beginning: { guidance: 'Start' },
          middle: { guidance: 'Middle' },
          end: { guidance: 'End' }
        },
        adaptation_constraints: {
          actor_freedom: 'moderate',
          director_authority: 'adaptive'
        }
      };

      const settings = {
        intensity: 'balanced',
        evaluation_cadence: {
          message_interval: 5,
          time_interval_seconds: null,
          event_triggers: []
        },
        learning_objective_targets: [],
        verification_policy: {
          require_evidence: true,
          evidence_strength: 'moderate'
        }
      };

      await protocol.write('scenario_outline', outline, 'sag');
      await protocol.write('director_settings', settings, 'sag');

      const result = await validator.execute();

      expect(result.valid).toBe(true);
    });

    test('should detect invalid director settings', async () => {
      const outline = {
        scenario_id: 'test',
        title: 'Test',
        description: 'Test',
        actors: [],
        goals: [{
          id: 'g1',
          description: 'Goal',
          success_criteria: { required_evidence: ['Evidence'] },
          progress_tracking: { milestones: [] },
          tests: []
        }],
        rules: [],
        encounters: [],
        lessons: [],
        actor_triggers: [],
        director_triggers: [],
        suggested_structure: {
          beginning: { guidance: 'Start' },
          middle: { guidance: 'Middle' },
          end: { guidance: 'End' }
        },
        adaptation_constraints: {
          actor_freedom: 'moderate',
          director_authority: 'adaptive'
        }
      };

      const invalidSettings = {
        intensity: 'invalid_value', // Invalid
        // Missing evaluation_cadence
      };

      await protocol.write('scenario_outline', outline, 'sag');
      await protocol.write('director_settings', invalidSettings, 'sag');

      const result = await validator.execute();

      expect(result.valid).toBe(false);
      const settingsErrors = result.errors.filter(e => e.source === 'director_settings');
      expect(settingsErrors.length).toBeGreaterThan(0);
    });

    test('should work without director settings', async () => {
      const outline = {
        scenario_id: 'test',
        title: 'Test',
        description: 'Test',
        actors: [],
        goals: [{
          id: 'g1',
          description: 'Goal',
          success_criteria: { required_evidence: ['Evidence'] },
          progress_tracking: { milestones: [] },
          tests: []
        }],
        rules: [],
        encounters: [],
        lessons: [],
        actor_triggers: [],
        director_triggers: [],
        suggested_structure: {
          beginning: { guidance: 'Start' },
          middle: { guidance: 'Middle' },
          end: { guidance: 'End' }
        },
        adaptation_constraints: {
          actor_freedom: 'moderate',
          director_authority: 'adaptive'
        }
      };

      await protocol.write('scenario_outline', outline, 'sag');
      // No director_settings written

      const result = await validator.execute();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  // ===== Protocol Integration =====

  describe('Protocol Integration', () => {
    test('should respect phase-based permissions', async () => {
      const outline = {
        scenario_id: 'test',
        title: 'Test',
        description: 'Test',
        actors: [],
        goals: [{
          id: 'g1',
          description: 'Goal',
          success_criteria: { required_evidence: ['Evidence'] },
          progress_tracking: { milestones: [] },
          tests: []
        }],
        rules: [],
        encounters: [],
        lessons: [],
        actor_triggers: [],
        director_triggers: [],
        suggested_structure: {
          beginning: { guidance: 'Start' },
          middle: { guidance: 'Middle' },
          end: { guidance: 'End' }
        },
        adaptation_constraints: {
          actor_freedom: 'moderate',
          director_authority: 'adaptive'
        }
      };

      await protocol.write('scenario_outline', outline, 'sag');

      // Validator should be able to write validation_result in building phase
      await expect(validator.execute()).resolves.toBeDefined();

      // Verify write was recorded in audit log
      const auditLog = await protocol.getAuditLog();
      const writeEntry = auditLog.find(
        e => e.action === 'write' && e.key === 'validation_result' && e.agent === 'validator'
      );

      expect(writeEntry).toBeDefined();
    });

    test('should preserve input data (read-only behavior)', async () => {
      const originalOutline = {
        scenario_id: 'test',
        title: 'Test',
        description: 'Test',
        actors: [],
        goals: [{
          id: 'g1',
          description: 'Goal',
          success_criteria: { required_evidence: ['Evidence'] },
          progress_tracking: { milestones: [] },
          tests: []
        }],
        rules: [],
        encounters: [],
        lessons: [],
        actor_triggers: [],
        director_triggers: [],
        suggested_structure: {
          beginning: { guidance: 'Start' },
          middle: { guidance: 'Middle' },
          end: { guidance: 'End' }
        },
        adaptation_constraints: {
          actor_freedom: 'moderate',
          director_authority: 'adaptive'
        }
      };

      await protocol.write('scenario_outline', originalOutline, 'sag');

      await validator.execute();

      // Verify outline unchanged
      const outline = await protocol.read('scenario_outline');
      expect(outline).toEqual(originalOutline);
    });
  });

  // ===== Summary Generation =====

  describe('Summary Generation', () => {
    test('should generate human-readable summary', () => {
      const validation = {
        valid: true,
        errors: [],
        warnings: [{ message: 'Test warning' }],
        schema_version: '1.0.0'
      };

      const summary = validator.getSummary(validation);

      expect(summary).toContain('PASS');
      expect(summary).toContain('Errors: 0');
      expect(summary).toContain('Warnings: 1');
      expect(summary).toContain('Schema Version: 1.0.0');
    });

    test('should show FAIL for invalid validation', () => {
      const validation = {
        valid: false,
        errors: [{ message: 'Test error' }],
        warnings: [],
        schema_version: '1.0.0'
      };

      const summary = validator.getSummary(validation);

      expect(summary).toContain('FAIL');
      expect(summary).toContain('Errors: 1');
    });
  });
});
