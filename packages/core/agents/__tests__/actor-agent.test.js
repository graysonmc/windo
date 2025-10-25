/**
 * @fileoverview Actor Agent Tests
 * Tests student message processing, response generation, and Director integration
 */

const { MCPProtocolV1 } = require('../../protocol/mcp-v1-simple');
const ActorAgent = require('../actor-agent');

describe('ActorAgent', () => {
  let protocol;
  let actor;
  let mockBlueprint;

  beforeEach(() => {
    protocol = new MCPProtocolV1();
    actor = new ActorAgent(protocol, { agentId: 'actor' });

    // Set phase to runtime where actor operates
    protocol.phase = 'runtime';

    // Create mock blueprint
    mockBlueprint = {
      scenario_id: 'test-scenario',
      title: 'Test Scenario',
      description: 'A test business crisis',
      scenario_text: 'Your company faces a critical decision about market expansion.',
      actors: [
        {
          name: 'CFO',
          role: 'advisor',
          personality: {
            assertiveness: 'direct',
            cooperation: 'cooperative'
          },
          goals: ['Maintain financial stability', 'Control costs']
        }
      ],
      goals: [
        {
          id: 'goal_1',
          title: 'Analyze stakeholders',
          description: 'Identify key stakeholders',
          success_criteria: ['Identifies at least 3 stakeholders']
        }
      ],
      rules: [
        'Use Socratic method',
        'Never provide direct answers',
        'Challenge assumptions'
      ],
      actor_settings: {
        temperature: 0.7,
        max_response_tokens: 500,
        socratic_mode: true
      }
    };

    protocol.data.set('simulation_blueprint', mockBlueprint);

    // Mock LLM responses
    actor.llmComplete = jest.fn().mockResolvedValue(
      'What factors are you considering in this decision? Have you thought about the potential risks?'
    );
  });

  // ===== Basic Message Processing =====

  describe('Basic Message Processing', () => {
    test('should process student message and return AI response', async () => {
      const result = await actor.execute({
        studentMessage: 'I think we should expand to the new market',
        conversationHistory: []
      });

      expect(result).toBeDefined();
      expect(result.message).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(actor.llmComplete).toHaveBeenCalled();
    });

    test('should call LLM with GPT-4 model', async () => {
      await actor.execute({
        studentMessage: 'What should I do?',
        conversationHistory: []
      });

      const callArgs = actor.llmComplete.mock.calls[0];
      expect(callArgs[1]).toBe('gpt-4'); // Model parameter
    });

    test('should use blueprint temperature setting', async () => {
      await actor.execute({
        studentMessage: 'Test message',
        conversationHistory: []
      });

      const callArgs = actor.llmComplete.mock.calls[0];
      expect(callArgs[2].temperature).toBe(0.7);
    });

    test('should use blueprint max_tokens setting', async () => {
      await actor.execute({
        studentMessage: 'Test message',
        conversationHistory: []
      });

      const callArgs = actor.llmComplete.mock.calls[0];
      expect(callArgs[2].max_tokens).toBe(500);
    });

    test('should write response to protocol', async () => {
      await actor.execute({
        studentMessage: 'Test message',
        conversationHistory: []
      });

      const actorResponse = await protocol.read('actor_responses');
      expect(actorResponse).toBeDefined();
      expect(actorResponse.message).toBeDefined();
      expect(actorResponse.metadata).toBeDefined();
    });

    test('should require studentMessage parameter', async () => {
      await expect(
        actor.execute({ conversationHistory: [] })
      ).rejects.toThrow('Cannot process: studentMessage is required');
    });

    test('should handle missing blueprint', async () => {
      protocol.data.delete('simulation_blueprint');

      await expect(
        actor.execute({
          studentMessage: 'Test',
          conversationHistory: []
        })
      ).rejects.toThrow('Cannot process: simulation_blueprint is missing');
    });
  });

  // ===== System Prompt Building =====

  describe('System Prompt Building', () => {
    test('should include scenario in system prompt', () => {
      const prompt = actor.buildSystemPrompt(mockBlueprint, null, [], []);

      expect(prompt).toContain('SCENARIO:');
      expect(prompt).toContain('Your company faces a critical decision');
    });

    test('should include actors in system prompt', () => {
      const prompt = actor.buildSystemPrompt(mockBlueprint, null, [], []);

      expect(prompt).toContain('AI CHARACTERS YOU EMBODY');
      expect(prompt).toContain('CFO');
      expect(prompt).toContain('advisor');
      expect(prompt).toContain('Maintain financial stability');
    });

    test('should include learning objectives in system prompt', () => {
      const prompt = actor.buildSystemPrompt(mockBlueprint, null, [], []);

      expect(prompt).toContain('LEARNING OBJECTIVES');
      expect(prompt).toContain('Analyze stakeholders');
      expect(prompt).toContain('Identify key stakeholders');
    });

    test('should include Socratic rules in system prompt', () => {
      const prompt = actor.buildSystemPrompt(mockBlueprint, null, [], []);

      expect(prompt).toContain('SOCRATIC METHOD RULES');
      expect(prompt).toContain('Use Socratic method');
      expect(prompt).toContain('Never provide direct answers');
    });

    test('should include core pedagogical rules', () => {
      const prompt = actor.buildSystemPrompt(mockBlueprint, null, [], []);

      expect(prompt).toContain('CRITICAL PEDAGOGICAL RULES');
      expect(prompt).toContain('NEVER provide direct answers');
      expect(prompt).toContain('Use the Socratic method');
    });

    test('should format personality traits', () => {
      const prompt = actor.buildSystemPrompt(mockBlueprint, null, [], []);

      expect(prompt).toContain('Personality');
      expect(prompt).toContain('direct');
      expect(prompt).toContain('cooperative');
    });
  });

  // ===== Director Intervention Integration =====

  describe('Director Intervention Integration', () => {
    test('should include Director interventions in system prompt', () => {
      const directorState = {
        evaluations: [
          {
            decision: {
              intervention: 'Ask the student to consider stakeholder impacts',
              action: 'challenge'
            }
          }
        ]
      };

      const prompt = actor.buildSystemPrompt(mockBlueprint, directorState, [], []);

      expect(prompt).toContain('DIRECTOR GUIDANCE');
      expect(prompt).toContain('Ask the student to consider stakeholder impacts');
      expect(prompt).toContain('Increase difficulty');
    });

    test('should add Director guidance to messages', () => {
      const directorState = {
        evaluations: [
          {
            decision: {
              intervention: 'Challenge their assumptions about costs',
              action: 'challenge'
            }
          }
        ]
      };

      const messages = actor.buildMessages(
        'System prompt',
        [],
        'Student message',
        [],
        directorState
      );

      const directorMessages = messages.filter(m => m.content.includes('DIRECTOR NOTE'));
      expect(directorMessages).toHaveLength(1);
      expect(directorMessages[0].content).toContain('Challenge their assumptions about costs');
    });

    test('should not add Director message for "Continue current approach"', () => {
      const directorState = {
        evaluations: [
          {
            decision: {
              intervention: 'Continue current approach',
              action: 'continue'
            }
          }
        ]
      };

      const messages = actor.buildMessages(
        'System prompt',
        [],
        'Student message',
        [],
        directorState
      );

      const directorMessages = messages.filter(m => m.content.includes('DIRECTOR NOTE'));
      expect(directorMessages).toHaveLength(0);
    });

    test('should suggest encounters when Director recommends', () => {
      const directorState = {
        evaluations: [
          {
            decision: {
              intervention: 'Introduce complication',
              action: 'encounter',
              suggested_encounters: ['budget_pressure']
            }
          }
        ]
      };

      const interventions = actor.getActiveInterventions(directorState);

      expect(interventions.some(i => i.includes('encounter: budget_pressure'))).toBe(true);
    });

    test('should handle redirect action', () => {
      const directorState = {
        evaluations: [
          {
            decision: {
              intervention: 'Guide back to core objectives',
              action: 'redirect'
            }
          }
        ]
      };

      const interventions = actor.getActiveInterventions(directorState);

      expect(interventions.some(i => i.includes('redirect student back to core objectives'))).toBe(true);
    });
  });

  // ===== Trigger Evaluation =====

  describe('Trigger Evaluation', () => {
    test('should trigger keyword-based actions', () => {
      const triggers = [
        {
          id: 'trigger_1',
          title: 'Budget Discussion',
          condition: 'When student mentions "budget" or "cost"',
          effect: 'Express concern about financial implications'
        }
      ];

      const triggered = actor.evaluateTriggers(
        triggers,
        [],
        'I am worried about the budget for this project'
      );

      expect(triggered).toHaveLength(1);
      expect(triggered[0].title).toBe('Budget Discussion');
      expect(triggered[0].effect).toContain('financial implications');
    });

    test('should be case-insensitive for keywords', () => {
      const triggers = [
        {
          id: 'trigger_1',
          title: 'Budget Mention',
          condition: 'When student says "BUDGET"',
          effect: 'React to budget mention'
        }
      ];

      const triggered = actor.evaluateTriggers(
        triggers,
        [],
        'The budget looks tight'
      );

      expect(triggered).toHaveLength(1);
    });

    test('should trigger message count-based actions', () => {
      const triggers = [
        {
          id: 'trigger_1',
          title: 'Timeline Urgency',
          condition: 'After 5 messages',
          effect: 'Express urgency about timeline'
        }
      ];

      const history = new Array(4).fill({ role: 'student', content: 'Test' });

      const triggered = actor.evaluateTriggers(
        triggers,
        history,
        'Current message'
      );

      expect(triggered).toHaveLength(1);
      expect(triggered[0].effect).toContain('urgency');
    });

    test('should handle multiple triggers', () => {
      const triggers = [
        {
          id: 'trigger_1',
          title: 'Budget Alert 1',
          condition: 'When student mentions "budget"',
          effect: 'Action 1'
        },
        {
          id: 'trigger_2',
          title: 'Budget Alert 2',
          condition: 'When student says "budget"',
          effect: 'Action 2'
        }
      ];

      const triggered = actor.evaluateTriggers(
        triggers,
        [],
        'Talking about budget'
      );

      expect(triggered).toHaveLength(2);
    });

    test('should add triggered actions to messages', () => {
      const triggeredActions = [
        { triggerId: 'trigger_1', title: 'Budget Concern', effect: 'Express budget concern', condition: 'keyword' }
      ];

      const messages = actor.buildMessages(
        'System prompt',
        [],
        'Student message',
        triggeredActions,
        null
      );

      const triggerMessages = messages.filter(m => m.content.includes('TRIGGERS ACTIVATED'));
      expect(triggerMessages).toHaveLength(1);
      expect(triggerMessages[0].content).toContain('Budget Concern');
      expect(triggerMessages[0].content).toContain('Express budget concern');
    });
  });

  // ===== Conversation History =====

  describe('Conversation History', () => {
    test('should include conversation history in messages', () => {
      const history = [
        { role: 'student', content: 'Message 1' },
        { role: 'ai', content: 'Response 1' },
        { role: 'student', content: 'Message 2' }
      ];

      const messages = actor.buildMessages(
        'System prompt',
        history,
        'Message 3',
        [],
        null
      );

      // Should have: system + 3 history + student message = 5
      expect(messages.length).toBeGreaterThanOrEqual(4);
      expect(messages.filter(m => m.role === 'user')).toHaveLength(3);
      expect(messages.filter(m => m.role === 'assistant')).toHaveLength(1);
    });

    test('should handle ai_advisor role from history', () => {
      const history = [
        { role: 'student', content: 'Question' },
        { role: 'ai_advisor', content: 'Answer' }
      ];

      const messages = actor.buildMessages(
        'System prompt',
        history,
        'Follow-up',
        [],
        null
      );

      const assistantMessages = messages.filter(m => m.role === 'assistant');
      expect(assistantMessages).toHaveLength(1);
      expect(assistantMessages[0].content).toBe('Answer');
    });

    test('should append new student message last', () => {
      const history = [
        { role: 'student', content: 'Message 1' }
      ];

      const messages = actor.buildMessages(
        'System prompt',
        history,
        'Latest message',
        [],
        null
      );

      const lastMessage = messages[messages.length - 1];
      expect(lastMessage.role).toBe('user');
      expect(lastMessage.content).toBe('Latest message');
    });
  });

  // ===== Metadata =====

  describe('Metadata', () => {
    test('should include triggers in metadata', async () => {
      mockBlueprint.triggers = [
        {
          id: 'trigger_1',
          title: 'Risk Discussion',
          condition: 'When student mentions "risk"',
          effect: 'Highlight risks'
        }
      ];
      protocol.data.set('simulation_blueprint', mockBlueprint);

      const result = await actor.execute({
        studentMessage: 'What are the risks?',
        conversationHistory: []
      });

      expect(result.metadata.triggers_activated).toBeDefined();
      expect(result.metadata.triggers_activated.length).toBeGreaterThan(0);
      expect(result.metadata.triggers_activated[0].title).toBe('Risk Discussion');
    });

    test('should include director interventions in metadata', async () => {
      const directorState = {
        evaluations: [
          {
            decision: {
              intervention: 'Test intervention',
              action: 'challenge'
            }
          }
        ]
      };
      protocol.data.set('director_state', directorState);

      const result = await actor.execute({
        studentMessage: 'Test',
        conversationHistory: []
      });

      expect(result.metadata.director_interventions).toBeDefined();
      expect(result.metadata.director_interventions.length).toBeGreaterThan(0);
    });

    test('should include timestamp in metadata', async () => {
      const beforeTime = Date.now();
      const result = await actor.execute({
        studentMessage: 'Test',
        conversationHistory: []
      });
      const afterTime = Date.now();

      expect(result.metadata.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(result.metadata.timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  // ===== Error Handling =====

  describe('Error Handling', () => {
    test('should handle LLM failure gracefully', async () => {
      actor.llmComplete.mockRejectedValue(new Error('API Error'));

      await expect(
        actor.execute({
          studentMessage: 'Test',
          conversationHistory: []
        })
      ).rejects.toThrow('API Error');
    });

    test('should handle empty conversation history', async () => {
      await expect(
        actor.execute({
          studentMessage: 'Test',
          conversationHistory: []
        })
      ).resolves.toBeDefined();
    });

    test('should handle blueprint without actors', async () => {
      const minimalBlueprint = {
        ...mockBlueprint,
        actors: []
      };
      protocol.data.set('simulation_blueprint', minimalBlueprint);

      await expect(
        actor.execute({
          studentMessage: 'Test',
          conversationHistory: []
        })
      ).resolves.toBeDefined();
    });

    test('should handle blueprint without rules', async () => {
      const blueprintNoRules = {
        ...mockBlueprint,
        rules: []
      };
      protocol.data.set('simulation_blueprint', blueprintNoRules);

      const prompt = actor.buildSystemPrompt(blueprintNoRules, null, [], []);
      expect(prompt).toBeDefined();
    });
  });

  // ===== Protocol Integration =====

  describe('Protocol Integration', () => {
    test('should respect runtime phase permissions', async () => {
      // Actor should be able to write actor_responses in runtime phase
      await expect(
        actor.execute({
          studentMessage: 'Test',
          conversationHistory: []
        })
      ).resolves.toBeDefined();

      const response = await protocol.read('actor_responses');
      expect(response).toBeDefined();
    });

    test('should not be able to write in building phase', async () => {
      protocol.phase = 'building';

      // Actor should not have write permissions in building phase
      await expect(
        actor.execute({
          studentMessage: 'Test',
          conversationHistory: []
        })
      ).rejects.toThrow('Permission denied');
    });

    test('should be able to read blueprint in runtime', async () => {
      await actor.execute({
        studentMessage: 'Test',
        conversationHistory: []
      });

      // Should have successfully read blueprint (no errors)
      expect(actor.llmComplete).toHaveBeenCalled();
    });
  });
});
