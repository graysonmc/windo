/**
 * @fileoverview Finalizer Agent Tests
 * Tests blueprint assembly, validation, and immutability
 */

const { MCPProtocolV1 } = require('../../protocol/mcp-v1-simple');
const FinalizerAgent = require('../finalizer-agent');

describe('FinalizerAgent', () => {
  let protocol;
  let finalizer;

  beforeEach(() => {
    protocol = new MCPProtocolV1();
    finalizer = new FinalizerAgent(protocol, { agentId: 'finalizer' });
  });

  /**
   * Helper to set up test data directly in protocol (bypasses permissions for testing)
   * @param {Object} data - Data to set
   */
  function setupTestData(data) {
    Object.entries(data).forEach(([key, value]) => {
      protocol.data.set(key, value);
    });
    // Set phase to finalized for finalizer execution
    protocol.phase = 'finalized';
  }

  // ===== Basic Execution =====

  describe('Basic Execution', () => {
    test('should create valid blueprint from complete data', async () => {
      setupTestData({
        raw_input: 'Test scenario input',
        parsed_data: {
          scenario_type: 'crisis',
          industry: 'technology',
          context: {
            company_name: 'TestCorp',
            situation: 'Critical decision point',
            timeframe: '30 days',
            stakes: 'High'
          },
          actors: ['CEO', 'CFO'],
          constraints: [],
          objectives: []
        },
        scenario_outline: {
          scenario_id: 'test-001',
          title: 'Test Scenario',
          description: 'A test scenario',
          actors: [
            { name: 'CEO', role: 'decision_maker', personality: { tone: 'direct' } }
          ],
          goals: [
            {
              id: 'goal_1',
              title: 'Test Goal',
              description: 'Test goal description',
              learning_objective: 'Learn testing',
              success_criteria: ['Criterion 1'],
              required_evidence: ['Evidence 1'],
              dependencies: []
            }
          ],
          rules: ['Use Socratic method'],
          triggers: [],
          encounters: [],
          lessons: [],
          tests: []
        },
        validation_result: {
          valid: true,
          errors: []
        },
        simulation_settings: {
          evaluation_frequency: 5,
          narrative_freedom: 0.8
        }
      });

      const blueprint = await finalizer.execute();

      // Verify blueprint structure
      expect(blueprint).toBeDefined();
      expect(blueprint.scenario_id).toBe('test-001');
      expect(blueprint.title).toBe('Test Scenario');
      expect(blueprint.description).toBe('A test scenario');
      expect(blueprint.actors).toHaveLength(1);
      expect(blueprint.goals).toHaveLength(1);
      expect(blueprint.immutable).toBe(true);
      expect(blueprint.locked_at).toBeDefined();
    });

    test('should write blueprint to protocol', async () => {
      setupTestData({
        parsed_data: {
          context: { situation: 'Test' },
          actors: []
        },
        scenario_outline: {
          scenario_id: 'test-002',
          title: 'Test',
          description: 'Test',
          actors: [],
          goals: [{ id: 'g1', title: 'Goal', description: 'Test', learning_objective: 'Learn', success_criteria: [], required_evidence: [], dependencies: [] }],
          rules: []
        },
        validation_result: { valid: true, errors: [] }
      });

      await finalizer.execute();

      // Verify blueprint was written
      const stored = await protocol.read('simulation_blueprint');
      expect(stored).toBeDefined();
      expect(stored.scenario_id).toBe('test-002');
    });
  });

  // ===== Prerequisites Validation =====

  describe('Prerequisites Validation', () => {
    test('should reject if scenario_outline is missing', async () => {
      setupTestData({
        parsed_data: { context: {} },
        validation_result: { valid: true, errors: [] }
      });

      await expect(finalizer.execute()).rejects.toThrow(
        'Cannot finalize: scenario_outline is missing'
      );
    });

    test('should reject if parsed_data is missing', async () => {
      setupTestData({
        scenario_outline: {
          scenario_id: 'test',
          title: 'Test',
          description: 'Test',
          goals: [{ id: 'g1', title: 'Goal', description: 'Test', learning_objective: 'Learn', success_criteria: [], required_evidence: [], dependencies: [] }]
        },
        validation_result: { valid: true, errors: [] }
      });

      await expect(finalizer.execute()).rejects.toThrow(
        'Cannot finalize: parsed_data is missing'
      );
    });

    test('should reject if validation_result is missing', async () => {
      setupTestData({
        parsed_data: { context: {} },
        scenario_outline: {
          scenario_id: 'test',
          title: 'Test',
          description: 'Test',
          goals: [{ id: 'g1', title: 'Goal', description: 'Test', learning_objective: 'Learn', success_criteria: [], required_evidence: [], dependencies: [] }]
        }
      });

      await expect(finalizer.execute()).rejects.toThrow(
        'Cannot finalize: validation_result is missing'
      );
    });

    test('should reject if validation failed', async () => {
      setupTestData({
        parsed_data: { context: {} },
        scenario_outline: {
          scenario_id: 'test',
          title: 'Test',
          description: 'Test',
          goals: [{ id: 'g1', title: 'Goal', description: 'Test', learning_objective: 'Learn', success_criteria: [], required_evidence: [], dependencies: [] }]
        },
        validation_result: {
          valid: false,
          errors: [{ path: 'goals', message: 'Invalid goal structure' }]
        }
      });

      await expect(finalizer.execute()).rejects.toThrow(
        'Cannot finalize: validation failed with 1 errors'
      );
    });

    test('should reject if scenario has no goals', async () => {
      setupTestData({
        parsed_data: { context: {} },
        scenario_outline: {
          scenario_id: 'test',
          title: 'Test',
          description: 'Test',
          goals: [] // Empty goals
        },
        validation_result: { valid: true, errors: [] }
      });

      await expect(finalizer.execute()).rejects.toThrow(
        'Cannot finalize: scenario_outline must have at least one goal'
      );
    });
  });

  // ===== Blueprint Assembly =====

  describe('Blueprint Assembly', () => {
    test('should merge actors from outline and parsed data', async () => {
      setupTestData({
        parsed_data: {
          context: {},
          actors: ['Actor1', 'Actor2'] // String array
        },
        scenario_outline: {
          scenario_id: 'test',
          title: 'Test',
          description: 'Test',
          actors: [], // Empty in outline
          goals: [{ id: 'g1', title: 'Goal', description: 'Test', learning_objective: 'Learn', success_criteria: [], required_evidence: [], dependencies: [] }]
        },
        validation_result: { valid: true, errors: [] }
      });

      const blueprint = await finalizer.execute();

      // Should use actors from parsed data
      expect(blueprint.actors).toHaveLength(2);
      expect(blueprint.actors[0].name).toBe('Actor1');
      expect(blueprint.actors[0].role).toBe('advisor'); // Default role
    });

    test('should use outline actors if provided', async () => {
      setupTestData({
        parsed_data: {
          context: {},
          actors: ['ParsedActor']
        },
        scenario_outline: {
          scenario_id: 'test',
          title: 'Test',
          description: 'Test',
          actors: [
            { name: 'OutlineActor', role: 'expert', personality: { trait: 'analytical' } }
          ],
          goals: [{ id: 'g1', title: 'Goal', description: 'Test', learning_objective: 'Learn', success_criteria: [], required_evidence: [], dependencies: [] }]
        },
        validation_result: { valid: true, errors: [] }
      });

      const blueprint = await finalizer.execute();

      // Should use actors from outline (priority over parsed)
      expect(blueprint.actors).toHaveLength(1);
      expect(blueprint.actors[0].name).toBe('OutlineActor');
      expect(blueprint.actors[0].role).toBe('expert');
      expect(blueprint.actors[0].personality).toEqual({ trait: 'analytical' });
    });

    test('should use default settings if not provided', async () => {
      setupTestData({
        parsed_data: { context: {} },
        scenario_outline: {
          scenario_id: 'test',
          title: 'Test',
          description: 'Test',
          goals: [{ id: 'g1', title: 'Goal', description: 'Test', learning_objective: 'Learn', success_criteria: [], required_evidence: [], dependencies: [] }]
        },
        validation_result: { valid: true, errors: [] }
      });
      // No simulation_settings

      const blueprint = await finalizer.execute();

      // Should have default settings
      expect(blueprint.director_settings.evaluation_frequency).toBe(3);
      expect(blueprint.director_settings.narrative_freedom).toBe(0.7);
      expect(blueprint.actor_settings.socratic_mode).toBe(true);
    });

    test('should merge custom settings with defaults', async () => {
      setupTestData({
        parsed_data: { context: {} },
        scenario_outline: {
          scenario_id: 'test',
          title: 'Test',
          description: 'Test',
          goals: [{ id: 'g1', title: 'Goal', description: 'Test', learning_objective: 'Learn', success_criteria: [], required_evidence: [], dependencies: [] }]
        },
        validation_result: { valid: true, errors: [] },
        simulation_settings: {
          evaluation_frequency: 10,
          custom_field: 'custom_value'
        }
      });

      const blueprint = await finalizer.execute();

      // Should merge custom with defaults
      expect(blueprint.director_settings.evaluation_frequency).toBe(10);
      expect(blueprint.director_settings.narrative_freedom).toBe(0.7); // Default
    });

    test('should include all outline components in blueprint', async () => {
      setupTestData({
        parsed_data: { context: {} },
        scenario_outline: {
          scenario_id: 'test',
          title: 'Test',
          description: 'Test',
          actors: [],
          goals: [{ id: 'g1', title: 'Goal', description: 'Test', learning_objective: 'Learn', success_criteria: [], required_evidence: [], dependencies: [] }],
          rules: [{ id: 'r1', title: 'Rule 1', description: 'First rule' }, { id: 'r2', title: 'Rule 2', description: 'Second rule' }],
          triggers: [{ id: 't1', title: 'Trigger 1', condition: 'when X', effect: 'do Y' }],
          encounters: [{ id: 'e1', description: 'Encounter' }],
          lessons: [{ id: 'l1', content: 'Lesson' }],
          tests: [{ id: 't1', question: 'Test' }]
        },
        validation_result: { valid: true, errors: [] }
      });

      const blueprint = await finalizer.execute();

      expect(blueprint.rules).toHaveLength(2);
      expect(blueprint.triggers).toHaveLength(1);
      expect(blueprint.encounters).toHaveLength(1);
      expect(blueprint.lessons).toHaveLength(1);
      expect(blueprint.tests).toHaveLength(1);
    });
  });

  // ===== Metadata & Immutability =====

  describe('Metadata & Immutability', () => {
    test('should include complete metadata', async () => {
      setupTestData({
        parsed_data: { context: {} },
        scenario_outline: {
          scenario_id: 'test',
          title: 'Test',
          description: 'Test',
          goals: [{ id: 'g1', title: 'Goal', description: 'Test', learning_objective: 'Learn', success_criteria: [], required_evidence: [], dependencies: [] }]
        },
        validation_result: { valid: true, errors: [] }
      });

      const blueprint = await finalizer.execute();

      expect(blueprint.metadata).toBeDefined();
      expect(blueprint.metadata.created_at).toBeDefined();
      expect(blueprint.metadata.finalized_by).toBe('finalizer');
      expect(blueprint.metadata.builder_version).toBe('1.0');
      expect(blueprint.metadata.validation_passed).toBe(true);
      expect(blueprint.metadata.source_data_hashes).toBeDefined();
      expect(blueprint.metadata.source_data_hashes.outline_hash).toBeDefined();
      expect(blueprint.metadata.source_data_hashes.parsed_data_hash).toBeDefined();
    });

    test('should mark blueprint as immutable', async () => {
      setupTestData({
        parsed_data: { context: {} },
        scenario_outline: {
          scenario_id: 'test',
          title: 'Test',
          description: 'Test',
          goals: [{ id: 'g1', title: 'Goal', description: 'Test', learning_objective: 'Learn', success_criteria: [], required_evidence: [], dependencies: [] }]
        },
        validation_result: { valid: true, errors: [] }
      });

      const blueprint = await finalizer.execute();

      expect(blueprint.immutable).toBe(true);
      expect(blueprint.locked_at).toBeDefined();
      expect(typeof blueprint.locked_at).toBe('number');
    });

    test('should hash source data for audit trail', async () => {
      const parsedData = { context: { test: 'data' } };
      const outline = {
        scenario_id: 'test',
        title: 'Test',
        description: 'Test',
        goals: [{ id: 'g1', title: 'Goal', description: 'Test', learning_objective: 'Learn', success_criteria: [], required_evidence: [], dependencies: [] }]
      };

      setupTestData({
        parsed_data: parsedData,
        scenario_outline: outline,
        validation_result: { valid: true, errors: [] }
      });

      const blueprint = await finalizer.execute();

      // Hashes should be deterministic
      expect(blueprint.metadata.source_data_hashes.outline_hash).toHaveLength(16);
      expect(blueprint.metadata.source_data_hashes.parsed_data_hash).toHaveLength(16);
    });
  });

  // ===== Protocol Integration =====

  describe('Protocol Integration', () => {
    test('should respect finalized phase permissions', async () => {
      setupTestData({
        parsed_data: { context: {} },
        scenario_outline: {
          scenario_id: 'test',
          title: 'Test',
          description: 'Test',
          goals: [{ id: 'g1', title: 'Goal', description: 'Test', learning_objective: 'Learn', success_criteria: [], required_evidence: [], dependencies: [] }]
        },
        validation_result: { valid: true, errors: [] }
      });

      // Finalizer should be able to write simulation_blueprint in finalized phase
      await expect(finalizer.execute()).resolves.toBeDefined();

      // Verify blueprint was written
      const blueprint = await protocol.read('simulation_blueprint');
      expect(blueprint).toBeDefined();
    });

    test('should not be able to write in building phase', async () => {
      // Set data but keep phase as building
      protocol.data.set('parsed_data', { context: {} });
      protocol.data.set('scenario_outline', {
        scenario_id: 'test',
        title: 'Test',
        description: 'Test',
        goals: [{ id: 'g1', title: 'Goal', description: 'Test', learning_objective: 'Learn', success_criteria: [], required_evidence: [], dependencies: [] }]
      });
      protocol.data.set('validation_result', { valid: true, errors: [] });

      // Keep phase as building (default)
      expect(protocol.phase).toBe('building');

      // Finalizer should not have write permissions in building phase
      await expect(finalizer.execute()).rejects.toThrow('Permission denied');
    });
  });
});
