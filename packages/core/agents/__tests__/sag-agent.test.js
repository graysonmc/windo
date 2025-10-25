/**
 * @fileoverview SAG Agent Unit Tests
 * Tests for Scenario Arc Generator with Phase 0 patterns
 */

const SAGAgent = require('../sag-agent');
const { MCPProtocolV1 } = require('../../protocol/mcp-v1-simple');

describe('SAGAgent', () => {
  let protocol;
  let sag;

  beforeEach(() => {
    protocol = new MCPProtocolV1();
    sag = new SAGAgent(protocol, { agentId: 'sag' });

    // Grant SAG permissions
    protocol.grantPermission('sag', {
      reads: ['parsed_data', 'simulation_settings'],
      writes: ['scenario_outline'],
      preserves: ['parsed_data']
    });
  });

  // ===== Basic Functionality =====

  describe('Basic Outline Generation', () => {
    test('should generate scenario outline from parsed data', async () => {
      const parsedData = {
        scenario_type: 'crisis',
        industry: 'technology',
        context: {
          company_name: 'TechCorp',
          situation: 'Product recall decision',
          timeframe: '30 days',
          stakes: '$50M cost'
        },
        actors: [
          { role: 'CEO', name: 'Sarah Johnson', description: 'Final decision maker' }
        ],
        constraints: ['$50M budget', '30 day deadline'],
        objectives: ['Decide on product recall'],
        key_challenges: ['Cost vs safety tradeoff']
      };

      await protocol.write('parsed_data', parsedData, 'parser');

      // Mock LLM response
      sag.llmCompleteJSON = jest.fn().mockResolvedValue({
        goals: [{
          id: 'goal_1',
          title: 'Evaluate recall decision',
          description: 'Determine if product recall is necessary',
          learning_objective: 'Understand cost-benefit analysis under pressure',
          success_criteria: ['Student considers stakeholder impact'],
          required_evidence: ['Student discusses safety vs cost'],
          dependencies: []
        }],
        rules: [{
          id: 'rule_1',
          type: 'budget',
          title: 'Budget constraint',
          description: '$50M maximum exposure',
          violation_consequence: 'Company bankruptcy'
        }],
        triggers: [],
        encounters: [],
        lessons: [],
        tests: []
      });

      const result = await sag.execute();

      expect(result.goals).toHaveLength(1);
      expect(result.goals[0].title).toBe('Evaluate recall decision');
      expect(result.rules).toHaveLength(1);
    });

    test('should write outline to protocol', async () => {
      const parsedData = {
        scenario_type: 'strategy',
        industry: 'general',
        context: { situation: 'Test' },
        actors: [],
        constraints: [],
        objectives: [],
        key_challenges: []
      };

      await protocol.write('parsed_data', parsedData, 'parser');

      sag.llmCompleteJSON = jest.fn().mockResolvedValue({
        goals: [],
        rules: [],
        triggers: [],
        encounters: [],
        lessons: [],
        tests: []
      });

      await sag.execute();

      const outline = await protocol.read('scenario_outline');
      expect(outline).toBeDefined();
      expect(outline.metadata).toHaveProperty('generated_at');
      expect(outline.metadata.generator).toBe('SAGAgent');
    });

    test('should broadcast outline_ready event', async () => {
      const parsedData = {
        scenario_type: 'strategy',
        industry: 'general',
        context: {},
        actors: [],
        constraints: [],
        objectives: [],
        key_challenges: []
      };

      await protocol.write('parsed_data', parsedData, 'parser');

      sag.llmCompleteJSON = jest.fn().mockResolvedValue({
        goals: [{ id: 'g1' }],
        rules: [],
        triggers: [],
        encounters: [{ id: 'e1' }],
        lessons: [],
        tests: []
      });

      await sag.execute();

      const auditLog = await protocol.getAuditLog();
      const broadcastEvent = auditLog.find(e => e.action === 'broadcast' && e.event === 'outline_ready');

      expect(broadcastEvent).toBeDefined();
    });
  });

  // ===== Error Handling =====

  describe('Error Handling', () => {
    test('should throw error if no parsed_data exists', async () => {
      await expect(sag.execute()).rejects.toThrow('No parsed_data found');
    });

    test('should handle LLM errors gracefully', async () => {
      await protocol.write('parsed_data', { scenario_type: 'test', context: {}, actors: [], constraints: [], objectives: [], key_challenges: [] }, 'parser');

      sag.llmCompleteJSON = jest.fn().mockRejectedValue(new Error('OpenAI API error'));

      await expect(sag.execute()).rejects.toThrow('OpenAI API error');
    });

    test('should use default settings if none provided', async () => {
      const parsedData = {
        scenario_type: 'crisis',
        industry: 'tech',
        context: {},
        actors: [],
        constraints: [],
        objectives: [],
        key_challenges: []
      };

      await protocol.write('parsed_data', parsedData, 'parser');

      const buildPromptSpy = jest.spyOn(sag, 'buildSAGPrompt');

      sag.llmCompleteJSON = jest.fn().mockResolvedValue({
        goals: [],
        rules: [],
        triggers: [],
        encounters: [],
        lessons: [],
        tests: []
      });

      await sag.execute();

      const defaultSettings = sag.getDefaultSettings();
      expect(buildPromptSpy).toHaveBeenCalledWith(parsedData, defaultSettings);
    });
  });

  // ===== Phase 0 Patterns - Default Settings =====

  describe('Phase 0 Default Settings', () => {
    test('should include Phase 0 AI modes in defaults', () => {
      const defaults = sag.getDefaultSettings();

      expect(defaults.ai_mode).toBe('challenger');
      expect(['challenger', 'coach', 'expert', 'adaptive', 'custom']).toContain(defaults.ai_mode);
    });

    test('should include Phase 0 time horizons in defaults', () => {
      const defaults = sag.getDefaultSettings();

      expect(defaults.time_horizon).toBe('immediate');
      expect(['immediate', 'short', 'quarterly', 'annual', 'strategic']).toContain(defaults.time_horizon);
    });

    test('should include Phase 0 complexity in defaults', () => {
      const defaults = sag.getDefaultSettings();

      expect(defaults.complexity).toBe('escalating');
    });
  });

  // ===== Validation - Goals =====

  describe('Goal Validation', () => {
    test('should validate goals array', () => {
      const goals = sag.validateGoals([
        {
          id: 'goal_1',
          title: 'Test Goal',
          description: 'Test description',
          learning_objective: 'Learn something',
          success_criteria: ['criteria 1'],
          required_evidence: ['evidence 1'],
          dependencies: ['goal_0']
        }
      ]);

      expect(goals).toHaveLength(1);
      expect(goals[0].id).toBe('goal_1');
      expect(goals[0].title).toBe('Test Goal');
      expect(goals[0].success_criteria).toEqual(['criteria 1']);
      expect(goals[0].dependencies).toEqual(['goal_0']);
    });

    test('should fill missing goal fields', () => {
      const goals = sag.validateGoals([
        { title: 'Partial Goal' }
      ]);

      expect(goals[0].id).toBeDefined();
      expect(goals[0].description).toBe('');
      expect(goals[0].learning_objective).toBe('');
      expect(goals[0].success_criteria).toEqual([]);
      expect(goals[0].required_evidence).toEqual([]);
      expect(goals[0].dependencies).toEqual([]);
    });

    test('should handle invalid goals gracefully', () => {
      expect(sag.validateGoals(null)).toEqual([]);
      expect(sag.validateGoals(undefined)).toEqual([]);
      expect(sag.validateGoals('not an array')).toEqual([]);
    });
  });

  // ===== Validation - Encounters (Phase 0 Attributes) =====

  describe('Encounter Validation with Phase 0 Attributes', () => {
    test('should validate encounters with Phase 0 personality_mode', () => {
      const encounters = sag.validateEncounters([
        {
          id: 'enc_1',
          actor_role: 'CEO',
          personality_mode: 'challenging',
          knowledge_level: 'expert',
          hidden_info: ['Secret data'],
          loyalties: {
            supports: ['Board'],
            opposes: ['Activists']
          },
          priorities: ['Profit', 'Safety']
        }
      ]);

      expect(encounters[0].personality_mode).toBe('challenging');
      expect(encounters[0].knowledge_level).toBe('expert');
      expect(encounters[0].hidden_info).toEqual(['Secret data']);
      expect(encounters[0].loyalties.supports).toEqual(['Board']);
      expect(encounters[0].loyalties.opposes).toEqual(['Activists']);
      expect(encounters[0].priorities).toEqual(['Profit', 'Safety']);
    });

    test('should default personality_mode to neutral', () => {
      const encounters = sag.validateEncounters([
        { actor_role: 'CFO' }
      ]);

      expect(encounters[0].personality_mode).toBe('neutral');
    });

    test('should default knowledge_level to experienced', () => {
      const encounters = sag.validateEncounters([
        { actor_role: 'CFO' }
      ]);

      expect(encounters[0].knowledge_level).toBe('experienced');
    });

    test('should handle missing loyalties gracefully', () => {
      const encounters = sag.validateEncounters([
        { actor_role: 'VP' }
      ]);

      expect(encounters[0].loyalties).toEqual({
        supports: [],
        opposes: []
      });
    });

    test('should handle missing arrays gracefully', () => {
      const encounters = sag.validateEncounters([
        {
          actor_role: 'CTO',
          hidden_info: null,
          priorities: undefined,
          socratic_prompts: 'not an array'
        }
      ]);

      expect(encounters[0].hidden_info).toEqual([]);
      expect(encounters[0].priorities).toEqual([]);
      expect(encounters[0].socratic_prompts).toEqual([]);
    });
  });

  // ===== Validation - Rules =====

  describe('Rule Validation', () => {
    test('should validate rules array', () => {
      const rules = sag.validateRules([
        {
          id: 'rule_1',
          type: 'budget',
          title: 'Budget constraint',
          description: '$50M limit',
          violation_consequence: 'Bankruptcy'
        }
      ]);

      expect(rules).toHaveLength(1);
      expect(rules[0].type).toBe('budget');
      expect(rules[0].violation_consequence).toBe('Bankruptcy');
    });

    test('should default rule type to constraint', () => {
      const rules = sag.validateRules([
        { title: 'Test Rule' }
      ]);

      expect(rules[0].type).toBe('constraint');
    });
  });

  // ===== Validation - Triggers =====

  describe('Trigger Validation', () => {
    test('should validate triggers array', () => {
      const triggers = sag.validateTriggers([
        {
          id: 'trigger_1',
          title: 'Goal completion trigger',
          condition: 'goal_1 completed',
          effect: 'Unlock new information',
          priority: 'high'
        }
      ]);

      expect(triggers).toHaveLength(1);
      expect(triggers[0].priority).toBe('high');
    });

    test('should default priority to medium', () => {
      const triggers = sag.validateTriggers([
        { title: 'Test Trigger' }
      ]);

      expect(triggers[0].priority).toBe('medium');
    });
  });

  // ===== Validation - Lessons & Tests =====

  describe('Lesson and Test Validation', () => {
    test('should validate lessons array', () => {
      const lessons = sag.validateLessons([
        {
          id: 'lesson_1',
          concept: 'Risk management',
          discovery_path: 'Through decision consequences',
          related_goals: ['goal_1'],
          misconceptions: ['Risk can be eliminated']
        }
      ]);

      expect(lessons).toHaveLength(1);
      expect(lessons[0].concept).toBe('Risk management');
      expect(lessons[0].misconceptions).toEqual(['Risk can be eliminated']);
    });

    test('should validate tests array', () => {
      const tests = sag.validateTests([
        {
          id: 'test_1',
          goal_id: 'goal_1',
          test_type: 'decision_quality',
          evaluation_criteria: 'Considers multiple perspectives'
        }
      ]);

      expect(tests).toHaveLength(1);
      expect(tests[0].test_type).toBe('decision_quality');
    });
  });

  // ===== Prompt Building =====

  describe('Prompt Building', () => {
    test('should build comprehensive SAG prompt', () => {
      const parsedData = {
        scenario_type: 'crisis',
        industry: 'technology',
        context: {
          company_name: 'TechCorp',
          situation: 'Crisis situation',
          timeframe: '30 days',
          stakes: 'High stakes'
        },
        actors: [{ role: 'CEO', name: 'John', description: 'Leader' }],
        constraints: ['Budget', 'Time'],
        objectives: ['Survive'],
        key_challenges: ['Competition']
      };

      const settings = {
        difficulty: 'hard',
        focus_areas: ['ethics', 'strategy'],
        student_level: 'graduate',
        ai_mode: 'challenger',
        time_horizon: 'strategic',
        complexity: 'escalating'
      };

      const prompt = sag.buildSAGPrompt(parsedData, settings);

      expect(prompt).toContain('TechCorp');
      expect(prompt).toContain('crisis');
      expect(prompt).toContain('CEO');
      expect(prompt).toContain('Budget');
      expect(prompt).toContain('ethics');
      expect(prompt).toContain('challenger');
      expect(prompt).toContain('strategic');
    });

    test('should include Phase 0 Socratic method in prompt', () => {
      const parsedData = {
        scenario_type: 'crisis',
        industry: 'tech',
        context: {},
        actors: [],
        constraints: [],
        objectives: [],
        key_challenges: []
      };

      const prompt = sag.buildSAGPrompt(parsedData, sag.getDefaultSettings());

      expect(prompt).toContain('Socratic Method');
      expect(prompt).toContain('NEVER provide direct answers');
      expect(prompt).toContain('probing questions');
      expect(prompt).toContain('challenge assumptions');
    });

    test('should include Phase 0 personality modes in prompt', () => {
      const parsedData = {
        scenario_type: 'negotiation',
        industry: 'general',
        context: {},
        actors: [],
        constraints: [],
        objectives: [],
        key_challenges: []
      };

      const prompt = sag.buildSAGPrompt(parsedData, sag.getDefaultSettings());

      expect(prompt).toContain('personality_mode');
      expect(prompt).toContain('knowledge_level');
      expect(prompt).toContain('skeptical');
      expect(prompt).toContain('expert');
    });

    test('should include Phase 0 hidden info mechanics in prompt', () => {
      const parsedData = {
        scenario_type: 'strategy',
        industry: 'general',
        context: {},
        actors: [],
        constraints: [],
        objectives: [],
        key_challenges: []
      };

      const prompt = sag.buildSAGPrompt(parsedData, sag.getDefaultSettings());

      expect(prompt).toContain('hidden_info');
      expect(prompt).toContain('RIGHT QUESTIONS');
    });

    test('should include loyalties and priorities from Phase 0', () => {
      const parsedData = {
        scenario_type: 'leadership',
        industry: 'general',
        context: {},
        actors: [],
        constraints: [],
        objectives: [],
        key_challenges: []
      };

      const prompt = sag.buildSAGPrompt(parsedData, sag.getDefaultSettings());

      expect(prompt).toContain('loyalties');
      expect(prompt).toContain('priorities');
      expect(prompt).toContain('supports');
      expect(prompt).toContain('opposes');
    });
  });

  // ===== System Prompt =====

  describe('System Prompt', () => {
    test('should define Socratic philosophy', () => {
      const systemPrompt = sag.getSystemPrompt();

      expect(systemPrompt).toContain('Socratic method');
      expect(systemPrompt).toContain("don't give answers");
      expect(systemPrompt).toContain('exploration');
      expect(systemPrompt).toContain('discovery');
    });

    test('should specify goal-oriented structure', () => {
      const systemPrompt = sag.getSystemPrompt();

      expect(systemPrompt).toContain('WHAT students should achieve');
      expect(systemPrompt).toContain('goals');
    });
  });

  // ===== Protocol Integration =====

  describe('Protocol Integration', () => {
    test('should respect phase-based permissions', async () => {
      const parsedData = {
        scenario_type: 'crisis',
        industry: 'tech',
        context: {},
        actors: [],
        constraints: [],
        objectives: [],
        key_challenges: []
      };

      await protocol.write('parsed_data', parsedData, 'parser');

      sag.llmCompleteJSON = jest.fn().mockResolvedValue({
        goals: [],
        rules: [],
        triggers: [],
        encounters: [],
        lessons: [],
        tests: []
      });

      await expect(sag.execute()).resolves.toBeDefined();

      // Verify write was recorded
      const auditLog = await protocol.getAuditLog();
      const writeEntry = auditLog.find(
        e => e.action === 'write' && e.key === 'scenario_outline' && e.agent === 'sag'
      );

      expect(writeEntry).toBeDefined();
    });

    test('should use gpt-4 model for complex reasoning', async () => {
      const parsedData = {
        scenario_type: 'strategy',
        industry: 'general',
        context: {},
        actors: [],
        constraints: [],
        objectives: [],
        key_challenges: []
      };

      await protocol.write('parsed_data', parsedData, 'parser');

      const llmSpy = jest.spyOn(sag, 'llmCompleteJSON');

      llmSpy.mockResolvedValue({
        goals: [],
        rules: [],
        triggers: [],
        encounters: [],
        lessons: [],
        tests: []
      });

      await sag.execute();

      expect(llmSpy).toHaveBeenCalledWith(expect.any(Array), 'gpt-4');
    });

    test('should preserve parsed_data when writing outline', async () => {
      const parsedData = {
        scenario_type: 'operations',
        industry: 'manufacturing',
        context: {},
        actors: [],
        constraints: [],
        objectives: [],
        key_challenges: []
      };

      await protocol.write('parsed_data', parsedData, 'parser');

      sag.llmCompleteJSON = jest.fn().mockResolvedValue({
        goals: [],
        rules: [],
        triggers: [],
        encounters: [],
        lessons: [],
        tests: []
      });

      await sag.execute();

      // parsed_data should still exist
      const stillExists = await protocol.read('parsed_data');
      expect(stillExists).toEqual(parsedData);
    });
  });

  // ===== Summary Generation =====

  describe('Summary Generation', () => {
    test('should generate summary of outline', () => {
      const outline = {
        goals: [{}, {}],
        rules: [{}, {}, {}],
        triggers: [{}],
        encounters: [{}],
        lessons: [{}, {}],
        tests: [{}]
      };

      const summary = sag.getSummary(outline);

      expect(summary).toContain('Goals: 2');
      expect(summary).toContain('Rules: 3');
      expect(summary).toContain('Triggers: 1');
      expect(summary).toContain('Encounters: 1');
      expect(summary).toContain('Lessons: 2');
      expect(summary).toContain('Tests: 1');
    });
  });

  // ===== Integration Tests =====

  describe('Integration with ParserAgent Output', () => {
    test('should process typical ParserAgent output', async () => {
      const typicalParserOutput = {
        scenario_type: 'crisis',
        industry: 'healthcare',
        context: {
          company_name: 'MedTech Solutions',
          situation: 'Critical equipment malfunction during surgery',
          timeframe: '48 hours',
          stakes: 'Patient safety and company reputation'
        },
        actors: [
          { role: 'CEO', name: 'Dr. Emma Rodriguez', description: 'Responsible for crisis response' },
          { role: 'Chief Medical Officer', name: 'Dr. James Park', description: 'Clinical expertise' },
          { role: 'Legal Counsel', name: 'Sarah Mitchell', description: 'Liability concerns' }
        ],
        constraints: [
          'FDA reporting requirements',
          '48 hour disclosure window',
          'Ongoing surgeries using equipment'
        ],
        objectives: [
          'Ensure patient safety',
          'Comply with regulations',
          'Protect company reputation'
        ],
        key_challenges: [
          'Incomplete data on malfunction cause',
          'Multiple stakeholder interests',
          'Time pressure for decision'
        ]
      };

      await protocol.write('parsed_data', typicalParserOutput, 'parser');

      sag.llmCompleteJSON = jest.fn().mockResolvedValue({
        goals: [
          {
            id: 'goal_1',
            title: 'Assess equipment risk',
            description: 'Determine severity and scope of malfunction',
            learning_objective: 'Understand risk assessment under uncertainty',
            success_criteria: ['Considers incomplete data', 'Weighs patient safety'],
            required_evidence: ['Discusses uncertainty', 'Prioritizes safety over other concerns'],
            dependencies: []
          }
        ],
        rules: [
          {
            id: 'rule_1',
            type: 'regulation',
            title: 'FDA reporting requirement',
            description: 'Must report within 48 hours',
            violation_consequence: 'Regulatory fines and investigation'
          }
        ],
        triggers: [
          {
            id: 'trigger_1',
            title: 'Data completeness check',
            condition: 'Student requests technical analysis',
            effect: 'Reveal engineering team has partial data only',
            priority: 'high'
          }
        ],
        encounters: [
          {
            id: 'encounter_1',
            actor_role: 'Chief Medical Officer',
            trigger_condition: 'Student begins safety discussion',
            purpose: 'Challenge assumptions about data sufficiency',
            challenge_type: 'ethical_dilemma',
            personality_mode: 'challenging',
            knowledge_level: 'expert',
            hidden_info: ['Previous similar incident was not disclosed'],
            loyalties: {
              supports: ['Patients', 'Medical ethics'],
              opposes: ['Financial pressure', 'Delay tactics']
            },
            priorities: ['Patient safety above all', 'Professional integrity'],
            socratic_prompts: [
              'How can you make a safety decision with incomplete data?',
              'What would medical ethics require in this situation?'
            ]
          }
        ],
        lessons: [
          {
            id: 'lesson_1',
            concept: 'Decision-making under uncertainty',
            discovery_path: 'Through grappling with incomplete data and time pressure',
            related_goals: ['goal_1'],
            misconceptions: ['Good decisions require complete information']
          }
        ],
        tests: [
          {
            id: 'test_1',
            goal_id: 'goal_1',
            test_type: 'stakeholder_awareness',
            evaluation_criteria: 'Student identifies and weighs competing stakeholder interests'
          }
        ]
      });

      const result = await sag.execute();

      expect(result.goals).toHaveLength(1);
      expect(result.encounters).toHaveLength(1);
      expect(result.encounters[0].personality_mode).toBe('challenging');
      expect(result.encounters[0].hidden_info).toBeDefined();
      expect(result.encounters[0].loyalties.supports).toContain('Patients');
      expect(result.lessons[0].misconceptions).toBeDefined();
    });
  });
});
