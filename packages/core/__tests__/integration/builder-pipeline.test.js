/**
 * @fileoverview Builder Pipeline Integration Tests
 * Tests the complete flow: Raw Input → Parser → SAG → Validator
 */

const { MCPProtocolV1 } = require('../../protocol/mcp-v1-simple');
const { ParserAgent, SAGAgent, ValidatorAgent } = require('../../agents');

describe('Builder Pipeline Integration', () => {
  let protocol;
  let parser;
  let sag;
  let validator;

  beforeEach(() => {
    // Initialize protocol
    protocol = new MCPProtocolV1();

    // Initialize agents
    parser = new ParserAgent(protocol, { agentId: 'parser' });
    sag = new SAGAgent(protocol, { agentId: 'sag' });
    validator = new ValidatorAgent(protocol, { agentId: 'validator' });

    // Grant permissions for all agents
    protocol.grantPermission('user', {
      reads: [],
      writes: ['raw_input', 'simulation_settings'],
      preserves: []
    });

    protocol.grantPermission('parser', {
      reads: ['raw_input'],
      writes: ['parsed_data'],
      preserves: ['raw_input']
    });

    protocol.grantPermission('sag', {
      reads: ['parsed_data', 'simulation_settings'],
      writes: ['scenario_outline'],
      preserves: ['parsed_data']
    });

    protocol.grantPermission('validator', {
      reads: ['*'],
      writes: ['validation_result'],
      preserves: ['*']
    });
  });

  // ===== Complete Pipeline Flow =====

  describe('Complete Pipeline Flow', () => {
    test('should process raw input through entire pipeline', async () => {
      // Sample raw input
      const rawInput = `
        TechCorp is facing a critical decision. The CEO, Sarah Johnson, must decide
        whether to recall a faulty product line that could cost $50M but save the
        company's reputation. The VP of Operations, Mike Chen, warns that the recall
        will strain manufacturing capacity. The company has 30 days to decide before
        regulatory pressure intensifies. Stakeholders are watching closely.
      `;

      // Mock LLM responses
      parser.llmCompleteJSON = jest.fn().mockResolvedValue({
        scenario_type: 'crisis',
        industry: 'technology',
        context: {
          company_name: 'TechCorp',
          situation: 'Product recall decision',
          timeframe: '30 days',
          stakes: '$50M cost and reputation risk'
        },
        actors: [
          { role: 'CEO', name: 'Sarah Johnson', description: 'Decision maker' },
          { role: 'VP of Operations', name: 'Mike Chen', description: 'Manufacturing concerns' }
        ],
        constraints: ['$50M budget impact', '30 day deadline', 'Regulatory pressure'],
        objectives: ['Decide on product recall', 'Protect company reputation'],
        key_challenges: ['Cost vs reputation tradeoff', 'Time pressure', 'Stakeholder management']
      });

      sag.llmCompleteJSON = jest.fn().mockResolvedValue({
        scenario_id: 'test-scenario-001',
        title: 'TechCorp Product Recall Crisis',
        description: 'CEO must decide on $50M product recall amid time pressure and stakeholder scrutiny',
        actors: [
          { role: 'CEO', name: 'Sarah Johnson', description: 'Decision maker facing board pressure' },
          { role: 'VP of Operations', name: 'Mike Chen', description: 'Manufacturing concerns' }
        ],
        goals: [
          {
            id: 'goal_1',
            title: 'Navigate Crisis Decision',
            description: 'Evaluate product recall decision considering all stakeholders',
            learning_objective: 'Understand crisis decision-making under pressure',
            success_criteria: [
              'Student considers financial implications',
              'Student analyzes stakeholder impacts',
              'Student weighs short-term vs long-term consequences'
            ],
            required_evidence: [
              'Student discusses cost-benefit analysis',
              'Student identifies key stakeholders',
              'Student evaluates reputation risk'
            ],
            dependencies: []
          }
        ],
        rules: [
          {
            id: 'rule_1',
            type: 'constraint',
            title: 'Budget Constraint',
            description: '$50M maximum for recall costs',
            violation_consequence: 'Financial strain on company'
          }
        ],
        triggers: [
          {
            id: 'trigger_1',
            title: 'Regulatory Pressure',
            condition: 'After 5 messages or goal_1 progress > 50%',
            effect: 'Introduce regulatory compliance concerns',
            priority: 'high'
          }
        ],
        encounters: [
          {
            id: 'encounter_1',
            actor_role: 'CEO',
            trigger_condition: 'Initial conversation',
            purpose: 'Challenge student thinking on crisis response',
            challenge_type: 'ethical_dilemma',
            personality_mode: 'challenging',
            knowledge_level: 'expert',
            hidden_info: ['Board is considering CEO replacement if this fails'],
            loyalties: {
              supports: ['Shareholders', 'Company reputation'],
              opposes: ['Short-term cost cutting']
            },
            priorities: ['Company survival', 'Reputation protection'],
            socratic_prompts: [
              'What are the long-term implications of each choice?',
              'Who bears the cost if we get this wrong?'
            ]
          }
        ],
        lessons: [
          {
            id: 'lesson_1',
            concept: 'Crisis decision-making requires balancing competing priorities',
            discovery_path: 'Through interaction with CEO and VP of Operations',
            related_goals: ['goal_1'],
            misconceptions: ['Decisions can be purely rational without trade-offs']
          }
        ],
        tests: [
          {
            id: 'test_1',
            goal_id: 'goal_1',
            test_type: 'decision_quality',
            evaluation_criteria: 'Student demonstrates consideration of multiple factors and trade-offs'
          }
        ]
      });

      // Step 1: Write raw input
      await protocol.write('raw_input', rawInput, 'user');

      // Step 2: Run Parser
      const parsedData = await parser.execute();

      expect(parsedData).toBeDefined();
      expect(parsedData.scenario_type).toBe('crisis');
      expect(parsedData.actors).toHaveLength(2);
      expect(parsedData.context.company_name).toBe('TechCorp');

      // Verify parsed_data written to protocol
      const parsedFromProtocol = await protocol.read('parsed_data');
      expect(parsedFromProtocol).toEqual(parsedData);

      // Step 3: Run SAG
      const outline = await sag.execute();

      expect(outline).toBeDefined();
      expect(outline.goals).toHaveLength(1);
      expect(outline.goals[0].title).toBe('Navigate Crisis Decision');
      expect(outline.encounters).toHaveLength(1);
      expect(outline.encounters[0].personality_mode).toBe('challenging');

      // Verify scenario_outline written to protocol
      const outlineFromProtocol = await protocol.read('scenario_outline');
      expect(outlineFromProtocol).toEqual(outline);

      // Step 4: Run Validator
      const validation = await validator.execute();

      expect(validation).toBeDefined();

      // Debug validation errors if any
      if (!validation.valid) {
        console.log('Validation errors:', JSON.stringify(validation.errors, null, 2));
      }

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      // Verify validation_result written to protocol
      const validationFromProtocol = await protocol.read('validation_result');
      expect(validationFromProtocol).toEqual(validation);
    });

    test('should maintain data integrity through pipeline', async () => {
      const rawInput = 'RetailCo needs to expand into new markets.';

      parser.llmCompleteJSON = jest.fn().mockResolvedValue({
        scenario_type: 'strategy',
        industry: 'retail',
        context: {
          company_name: 'RetailCo',
          situation: 'Market expansion',
          timeframe: 'Quarterly',
          stakes: 'Growth targets'
        },
        actors: [{ role: 'CEO', name: 'Jane Doe', description: 'Leader' }],
        constraints: ['Budget'],
        objectives: ['Expand'],
        key_challenges: ['Competition']
      });

      sag.llmCompleteJSON = jest.fn().mockResolvedValue({
        goals: [{
          id: 'goal_1',
          title: 'Market Expansion',
          description: 'Evaluate market opportunities',
          learning_objective: 'Strategic analysis',
          success_criteria: ['Analyze markets'],
          required_evidence: ['Consider risks'],
          dependencies: []
        }],
        rules: [],
        triggers: [],
        encounters: [],
        lessons: [],
        tests: []
      });

      await protocol.write('raw_input', rawInput, 'user');

      // Run pipeline
      await parser.execute();
      await sag.execute();
      await validator.execute();

      // Verify all data preserved
      const finalRawInput = await protocol.read('raw_input');
      const finalParsedData = await protocol.read('parsed_data');
      const finalOutline = await protocol.read('scenario_outline');

      expect(finalRawInput).toBe(rawInput);
      expect(finalParsedData.context.company_name).toBe('RetailCo');
      expect(finalOutline.goals[0].title).toBe('Market Expansion');
    });
  });

  // ===== Audit Trail Verification =====

  describe('Audit Trail', () => {
    test('should log all agent actions in audit trail', async () => {
      const rawInput = 'Test scenario';

      parser.llmCompleteJSON = jest.fn().mockResolvedValue({
        scenario_type: 'other',
        industry: 'general',
        context: { company_name: 'Test', situation: 'Test', timeframe: 'Test', stakes: 'Test' },
        actors: [],
        constraints: [],
        objectives: [],
        key_challenges: []
      });

      sag.llmCompleteJSON = jest.fn().mockResolvedValue({
        goals: [{
          id: 'g1',
          title: 'Test',
          description: 'Test',
          learning_objective: 'Test',
          success_criteria: ['Test'],
          required_evidence: ['Test'],
          dependencies: []
        }],
        rules: [],
        triggers: [],
        encounters: [],
        lessons: [],
        tests: []
      });

      await protocol.write('raw_input', rawInput, 'user');
      await parser.execute();
      await sag.execute();
      await validator.execute();

      const auditLog = await protocol.getAuditLog();

      // Verify parser actions
      const parserWrites = auditLog.filter(e => e.agent === 'parser' && e.action === 'write');
      expect(parserWrites.length).toBeGreaterThan(0);
      expect(parserWrites.some(e => e.key === 'parsed_data')).toBe(true);

      // Verify SAG actions
      const sagWrites = auditLog.filter(e => e.agent === 'sag' && e.action === 'write');
      expect(sagWrites.length).toBeGreaterThan(0);
      expect(sagWrites.some(e => e.key === 'scenario_outline')).toBe(true);

      // Verify Validator actions
      const validatorWrites = auditLog.filter(e => e.agent === 'validator' && e.action === 'write');
      expect(validatorWrites.length).toBeGreaterThan(0);
      expect(validatorWrites.some(e => e.key === 'validation_result')).toBe(true);

      // Verify broadcasts
      const broadcasts = auditLog.filter(e => e.action === 'broadcast');
      expect(broadcasts.some(e => e.event === 'parsing_complete')).toBe(true);
      expect(broadcasts.some(e => e.event === 'outline_ready')).toBe(true);
      expect(broadcasts.some(e => e.event === 'validation_complete')).toBe(true);
    });

    test('should record audit log in chronological order', async () => {
      const rawInput = 'Test scenario';

      parser.llmCompleteJSON = jest.fn().mockResolvedValue({
        scenario_type: 'other',
        industry: 'general',
        context: { company_name: 'Test', situation: 'Test', timeframe: 'Test', stakes: 'Test' },
        actors: [],
        constraints: [],
        objectives: [],
        key_challenges: []
      });

      sag.llmCompleteJSON = jest.fn().mockResolvedValue({
        goals: [{
          id: 'g1',
          title: 'Test',
          description: 'Test',
          learning_objective: 'Test',
          success_criteria: ['Test'],
          required_evidence: ['Test'],
          dependencies: []
        }],
        rules: [],
        triggers: [],
        encounters: [],
        lessons: [],
        tests: []
      });

      const startTime = Date.now() - 1; // Subtract 1ms to avoid race condition

      await protocol.write('raw_input', rawInput, 'user');
      await parser.execute();
      await sag.execute();
      await validator.execute();

      const auditLog = await protocol.getAuditLog();

      // Verify timestamps are in order
      for (let i = 1; i < auditLog.length; i++) {
        expect(auditLog[i].timestamp).toBeGreaterThanOrEqual(auditLog[i - 1].timestamp);
      }

      // Verify all timestamps are after start (with 1ms tolerance for timing precision)
      auditLog.forEach(entry => {
        expect(entry.timestamp).toBeGreaterThanOrEqual(startTime);
      });
    });
  });

  // ===== Error Propagation =====

  describe('Error Propagation', () => {
    test('should stop pipeline if parser fails', async () => {
      await protocol.write('raw_input', 'Test', 'user');

      // Mock parser failure
      parser.llmCompleteJSON = jest.fn().mockRejectedValue(new Error('OpenAI API error'));

      await expect(parser.execute()).rejects.toThrow('OpenAI API error');

      // Verify no parsed_data written
      const parsedData = await protocol.read('parsed_data');
      expect(parsedData).toBeUndefined();
    });

    test('should stop pipeline if SAG fails', async () => {
      parser.llmCompleteJSON = jest.fn().mockResolvedValue({
        scenario_type: 'other',
        industry: 'general',
        context: { company_name: 'Test', situation: 'Test', timeframe: 'Test', stakes: 'Test' },
        actors: [],
        constraints: [],
        objectives: [],
        key_challenges: []
      });

      await protocol.write('raw_input', 'Test', 'user');
      await parser.execute();

      // Mock SAG failure
      sag.llmCompleteJSON = jest.fn().mockRejectedValue(new Error('GPT-4 error'));

      await expect(sag.execute()).rejects.toThrow('GPT-4 error');

      // Verify no scenario_outline written
      const outline = await protocol.read('scenario_outline');
      expect(outline).toBeUndefined();
    });

    test('should report validation errors but not crash', async () => {
      parser.llmCompleteJSON = jest.fn().mockResolvedValue({
        scenario_type: 'other',
        industry: 'general',
        context: { company_name: 'Test', situation: 'Test', timeframe: 'Test', stakes: 'Test' },
        actors: [],
        constraints: [],
        objectives: [],
        key_challenges: []
      });

      sag.llmCompleteJSON = jest.fn().mockResolvedValue({
        // Invalid outline - missing required fields
        goals: [{
          id: 'g1',
          // Missing title, description, etc.
        }]
      });

      await protocol.write('raw_input', 'Test', 'user');
      await parser.execute();
      await sag.execute();

      const validation = await validator.execute();

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  // ===== Progressive Enrichment =====

  describe('Progressive Enrichment', () => {
    test('should preserve raw_input through pipeline', async () => {
      const rawInput = 'Original scenario text';

      parser.llmCompleteJSON = jest.fn().mockResolvedValue({
        scenario_type: 'other',
        industry: 'general',
        context: { company_name: 'Test', situation: 'Test', timeframe: 'Test', stakes: 'Test' },
        actors: [],
        constraints: [],
        objectives: [],
        key_challenges: []
      });

      sag.llmCompleteJSON = jest.fn().mockResolvedValue({
        goals: [{
          id: 'g1',
          title: 'Test',
          description: 'Test',
          learning_objective: 'Test',
          success_criteria: ['Test'],
          required_evidence: ['Test'],
          dependencies: []
        }],
        rules: [],
        triggers: [],
        encounters: [],
        lessons: [],
        tests: []
      });

      await protocol.write('raw_input', rawInput, 'user');
      await parser.execute();
      await sag.execute();
      await validator.execute();

      // raw_input should be unchanged
      const finalRawInput = await protocol.read('raw_input');
      expect(finalRawInput).toBe(rawInput);
    });

    test('should preserve parsed_data after SAG runs', async () => {
      parser.llmCompleteJSON = jest.fn().mockResolvedValue({
        scenario_type: 'crisis',
        industry: 'healthcare',
        context: { company_name: 'HealthCo', situation: 'Crisis', timeframe: 'Immediate', stakes: 'High' },
        actors: [{ role: 'CEO', name: 'Dr. Smith', description: 'Leader' }],
        constraints: ['Budget'],
        objectives: ['Resolve crisis'],
        key_challenges: ['Time pressure']
      });

      sag.llmCompleteJSON = jest.fn().mockResolvedValue({
        goals: [{
          id: 'g1',
          title: 'Test',
          description: 'Test',
          learning_objective: 'Test',
          success_criteria: ['Test'],
          required_evidence: ['Test'],
          dependencies: []
        }],
        rules: [],
        triggers: [],
        encounters: [],
        lessons: [],
        tests: []
      });

      await protocol.write('raw_input', 'Test', 'user');
      const parsedData = await parser.execute();
      await sag.execute();

      // parsed_data should be unchanged
      const finalParsedData = await protocol.read('parsed_data');
      expect(finalParsedData).toEqual(parsedData);
      expect(finalParsedData.context.company_name).toBe('HealthCo');
    });
  });

  // ===== Phase Permissions =====

  describe('Phase-Based Permissions', () => {
    test('should allow agents to read data written by previous agents', async () => {
      parser.llmCompleteJSON = jest.fn().mockResolvedValue({
        scenario_type: 'other',
        industry: 'general',
        context: { company_name: 'Test', situation: 'Test', timeframe: 'Test', stakes: 'Test' },
        actors: [],
        constraints: [],
        objectives: [],
        key_challenges: []
      });

      sag.llmCompleteJSON = jest.fn().mockResolvedValue({
        goals: [{
          id: 'g1',
          title: 'Test',
          description: 'Test',
          learning_objective: 'Test',
          success_criteria: ['Test'],
          required_evidence: ['Test'],
          dependencies: []
        }],
        rules: [],
        triggers: [],
        encounters: [],
        lessons: [],
        tests: []
      });

      await protocol.write('raw_input', 'Test', 'user');

      // Parser can read raw_input
      await expect(parser.execute()).resolves.toBeDefined();

      // SAG can read parsed_data
      await expect(sag.execute()).resolves.toBeDefined();

      // Validator can read scenario_outline
      await expect(validator.execute()).resolves.toBeDefined();
    });

    test('should enforce write permissions per agent', async () => {
      // Parser should not be able to write scenario_outline
      await expect(
        protocol.write('scenario_outline', {}, 'parser')
      ).rejects.toThrow('Permission denied');

      // SAG should not be able to write validation_result
      await expect(
        protocol.write('validation_result', {}, 'sag')
      ).rejects.toThrow('Permission denied');
    });
  });
});
