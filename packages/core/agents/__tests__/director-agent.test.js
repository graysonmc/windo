/**
 * @fileoverview Director Agent Tests
 * Tests conversation evaluation, progress tracking, and intervention logic
 */

const { MCPProtocolV1 } = require('../../protocol/mcp-v1-simple');
const DirectorAgent = require('../director-agent');

describe('DirectorAgent', () => {
  let protocol;
  let director;
  let mockBlueprint;

  beforeEach(() => {
    protocol = new MCPProtocolV1();
    director = new DirectorAgent(protocol, { agentId: 'director' });

    // Set phase to runtime where director operates
    protocol.phase = 'runtime';

    // Create mock blueprint
    mockBlueprint = {
      scenario_id: 'test-scenario',
      title: 'Test Scenario',
      description: 'A test crisis scenario',
      goals: [
        {
          id: 'goal_1',
          title: 'Analyze stakeholders',
          description: 'Identify key stakeholders',
          success_criteria: ['Identifies at least 3 stakeholders', 'Considers their interests'],
          required_evidence: ['Stakeholder analysis']
        },
        {
          id: 'goal_2',
          title: 'Evaluate options',
          description: 'Compare decision options',
          success_criteria: ['Lists pros and cons', 'Considers trade-offs'],
          required_evidence: ['Option comparison']
        }
      ],
      director_settings: {
        evaluation_frequency: 3,
        narrative_freedom: 0.7
      },
      encounters: [
        { id: 'encounter_1', description: 'Budget pressure from CFO' },
        { id: 'encounter_2', description: 'Timeline concern from PM' }
      ]
    };

    protocol.data.set('simulation_blueprint', mockBlueprint);

    // Mock LLM responses
    director.llmCompleteJSON = jest.fn().mockResolvedValue({
      phase: 'exploration',
      student_state: 'engaged',
      action: 'continue',
      intervention: 'Continue current approach',
      goal_progress: [],
      confidence: 0.8,
      reasoning: 'Student is making good progress'
    });
  });

  // ===== State Initialization =====

  describe('State Initialization', () => {
    test('should initialize director state correctly', () => {
      const state = director.initializeState(mockBlueprint);

      expect(state.phase).toBe('intro');
      expect(state.student_state).toBe('engaged');
      expect(state.message_count).toBe(0);
      expect(state.last_evaluated_message).toBe(0);
      expect(state.evaluations).toEqual([]);
      expect(state.encounters_triggered).toEqual([]);
      expect(state.goal_progress).toBeDefined();
      expect(state.goal_progress.goal_1).toEqual({
        status: 'not_started',
        evidence_collected: [],
        last_updated: expect.any(Number)
      });
    });

    test('should initialize goal progress for all goals', () => {
      const state = director.initializeState(mockBlueprint);

      expect(Object.keys(state.goal_progress)).toHaveLength(2);
      expect(state.goal_progress.goal_1).toBeDefined();
      expect(state.goal_progress.goal_2).toBeDefined();
      expect(state.goal_progress.goal_1.status).toBe('not_started');
      expect(state.goal_progress.goal_2.status).toBe('not_started');
    });
  });

  // ===== Evaluation Frequency Logic =====

  describe('Evaluation Frequency Logic', () => {
    test('should evaluate when frequency threshold is reached', () => {
      const state = {
        last_evaluated_message: 0,
        message_count: 0
      };

      const conversationHistory = [
        { role: 'student', content: 'Message 1' },
        { role: 'ai', content: 'Response 1' },
        { role: 'student', content: 'Message 2' },
        { role: 'ai', content: 'Response 2' },
        { role: 'student', content: 'Message 3' }
      ];

      const shouldEval = director.shouldEvaluate(
        state,
        conversationHistory,
        { evaluation_frequency: 3 }
      );

      expect(shouldEval).toBe(true); // 5 messages >= 3 frequency
    });

    test('should not evaluate before frequency threshold', () => {
      const state = {
        last_evaluated_message: 0
      };

      const conversationHistory = [
        { role: 'student', content: 'Message 1' },
        { role: 'ai', content: 'Response 1' }
      ];

      const shouldEval = director.shouldEvaluate(
        state,
        conversationHistory,
        { evaluation_frequency: 3 }
      );

      expect(shouldEval).toBe(false); // 2 messages < 3 frequency
    });

    test('should respect custom evaluation frequency', () => {
      const state = {
        last_evaluated_message: 0
      };

      const conversationHistory = new Array(10).fill({ role: 'student', content: 'Test' });

      const shouldEval = director.shouldEvaluate(
        state,
        conversationHistory,
        { evaluation_frequency: 5 }
      );

      expect(shouldEval).toBe(true); // 10 messages >= 5 frequency
    });

    test('should return none action when not time to evaluate', async () => {
      const conversationHistory = [
        { role: 'student', content: 'Message 1' }
      ];

      const result = await director.execute({ conversationHistory });

      expect(result.action).toBe('none');
      expect(result.reasoning).toContain('Not time to evaluate');
      expect(result.next_evaluation_at).toBeDefined();
    });
  });

  // ===== Progress Evaluation =====

  describe('Progress Evaluation', () => {
    test('should call LLM with proper prompt when evaluation time', async () => {
      const conversationHistory = [
        { role: 'student', content: 'Message 1' },
        { role: 'ai', content: 'Response 1' },
        { role: 'student', content: 'Message 2' },
        { role: 'ai', content: 'Response 2' },
        { role: 'student', content: 'Message 3' }
      ];

      await director.execute({
        conversationHistory,
        latestMessage: 'Message 3'
      });

      expect(director.llmCompleteJSON).toHaveBeenCalled();
      const callArgs = director.llmCompleteJSON.mock.calls[0];

      // Verify prompt structure
      const messages = callArgs[0];
      expect(messages[0].role).toBe('system');
      expect(messages[1].role).toBe('user');
      expect(messages[1].content).toContain('LEARNING GOALS');
      expect(messages[1].content).toContain('RECENT CONVERSATION');

      // Verify model selection
      expect(callArgs[1]).toBe('gpt-3.5-turbo');

      // Verify options
      expect(callArgs[2].temperature).toBe(0.3);
    });

    test('should update director state after evaluation', async () => {
      director.llmCompleteJSON.mockResolvedValue({
        phase: 'decision',
        student_state: 'ready_to_advance',
        action: 'challenge',
        intervention: 'Ask about stakeholder trade-offs',
        goal_progress: ['goal_1'],
        confidence: 0.9,
        reasoning: 'Student ready for harder questions'
      });

      const conversationHistory = new Array(3).fill({ role: 'student', content: 'Test' });

      await director.execute({ conversationHistory });

      const state = await protocol.read('director_state');
      expect(state.phase).toBe('decision');
      expect(state.student_state).toBe('ready_to_advance');
      expect(state.last_evaluated_message).toBe(3);
      expect(state.goal_progress.goal_1.status).toBe('in_progress');
    });

    test('should track multiple goal progress', async () => {
      director.llmCompleteJSON.mockResolvedValue({
        phase: 'exploration',
        student_state: 'engaged',
        action: 'continue',
        intervention: 'Continue',
        goal_progress: ['goal_1', 'goal_2'],
        confidence: 0.85,
        reasoning: 'Making progress on both goals'
      });

      const conversationHistory = new Array(3).fill({ role: 'student', content: 'Test' });

      await director.execute({ conversationHistory });

      const state = await protocol.read('director_state');
      expect(state.goal_progress.goal_1.status).toBe('in_progress');
      expect(state.goal_progress.goal_2.status).toBe('in_progress');
      expect(state.goal_progress.goal_1.last_updated).toBeDefined();
      expect(state.goal_progress.goal_2.last_updated).toBeDefined();
    });
  });

  // ===== Intervention Logic =====

  describe('Intervention Logic', () => {
    test('should suggest encounters when action is encounter', async () => {
      director.llmCompleteJSON.mockResolvedValue({
        phase: 'exploration',
        student_state: 'engaged',
        action: 'encounter',
        intervention: 'Introduce budget pressure',
        goal_progress: [],
        confidence: 0.8,
        reasoning: 'Good time for complication'
      });

      const conversationHistory = new Array(3).fill({ role: 'student', content: 'Test' });

      const result = await director.execute({ conversationHistory });

      expect(result.action).toBe('encounter');
      expect(result.suggested_encounters).toBeDefined();
      expect(result.suggested_encounters.length).toBeGreaterThan(0);
      expect(result.suggested_encounters).toContain('encounter_1');
    });

    test('should not suggest already triggered encounters', async () => {
      // Set up state with already triggered encounter
      const existingState = director.initializeState(mockBlueprint);
      existingState.encounters_triggered = ['encounter_1'];
      protocol.data.set('director_state', existingState);

      director.llmCompleteJSON.mockResolvedValue({
        phase: 'exploration',
        student_state: 'engaged',
        action: 'encounter',
        intervention: 'Introduce complication',
        goal_progress: [],
        confidence: 0.8,
        reasoning: 'Need challenge'
      });

      const conversationHistory = new Array(3).fill({ role: 'student', content: 'Test' });

      const result = await director.execute({ conversationHistory });

      // Should not include already triggered encounter
      expect(result.suggested_encounters).not.toContain('encounter_1');
      expect(result.suggested_encounters).toContain('encounter_2');
    });

    test('should handle different action types', async () => {
      const actionTests = [
        { action: 'continue', expectedAction: 'continue' },
        { action: 'challenge', expectedAction: 'challenge' },
        { action: 'redirect', expectedAction: 'redirect' },
        { action: 'advance_phase', expectedAction: 'advance_phase' }
      ];

      for (const { action, expectedAction } of actionTests) {
        // Reset state for each iteration
        protocol.data.delete('director_state');

        director.llmCompleteJSON.mockResolvedValue({
          phase: 'exploration',
          student_state: 'engaged',
          action,
          intervention: `Test ${action}`,
          goal_progress: [],
          confidence: 0.8,
          reasoning: 'Test'
        });

        const conversationHistory = new Array(3).fill({ role: 'student', content: 'Test' });
        const result = await director.execute({ conversationHistory });

        expect(result.action).toBe(expectedAction);
      }
    });
  });

  // ===== Error Handling =====

  describe('Error Handling', () => {
    test('should handle LLM failure gracefully', async () => {
      director.llmCompleteJSON.mockRejectedValue(new Error('API Error'));

      const conversationHistory = new Array(3).fill({ role: 'student', content: 'Test' });

      const result = await director.execute({ conversationHistory });

      expect(result.error).toBe(true);
      expect(result.action).toBe('continue');
      expect(result.reasoning).toContain('Evaluation failed');
      expect(result.confidence).toBe(0);
    });

    test('should handle missing blueprint', async () => {
      protocol.data.delete('simulation_blueprint');

      const conversationHistory = new Array(3).fill({ role: 'student', content: 'Test' });

      await expect(
        director.execute({ conversationHistory })
      ).rejects.toThrow('Cannot evaluate: simulation_blueprint is missing');
    });

    test('should continue with invalid LLM response', async () => {
      director.llmCompleteJSON.mockResolvedValue({
        // Missing required fields
        invalid: 'response'
      });

      const conversationHistory = new Array(3).fill({ role: 'student', content: 'Test' });

      const result = await director.execute({ conversationHistory });

      // Should provide defaults
      expect(result.phase).toBeDefined();
      expect(result.action).toBeDefined();
      expect(result.student_state).toBeDefined();
    });
  });

  // ===== State Management =====

  describe('State Management', () => {
    test('should maintain evaluation history', async () => {
      director.llmCompleteJSON.mockResolvedValue({
        phase: 'exploration',
        student_state: 'engaged',
        action: 'continue',
        intervention: 'Continue',
        goal_progress: [],
        confidence: 0.8,
        reasoning: 'Good progress'
      });

      const conversationHistory = new Array(3).fill({ role: 'student', content: 'Test' });

      await director.execute({ conversationHistory });

      const state = await protocol.read('director_state');
      expect(state.evaluations).toHaveLength(1);
      expect(state.evaluations[0].message_number).toBe(3);
      expect(state.evaluations[0].decision).toBeDefined();
      expect(state.evaluations[0].timestamp).toBeDefined();
    });

    test('should limit evaluation history to last 20', async () => {
      // Create state with 20 evaluations
      const existingState = director.initializeState(mockBlueprint);
      existingState.evaluations = new Array(20).fill({
        message_number: 1,
        decision: {},
        timestamp: Date.now()
      });
      existingState.last_evaluated_message = 0;
      protocol.data.set('director_state', existingState);

      director.llmCompleteJSON.mockResolvedValue({
        phase: 'exploration',
        student_state: 'engaged',
        action: 'continue',
        intervention: 'Continue',
        goal_progress: [],
        confidence: 0.8,
        reasoning: 'Test'
      });

      const conversationHistory = new Array(3).fill({ role: 'student', content: 'Test' });

      await director.execute({ conversationHistory });

      const state = await protocol.read('director_state');
      // Should still be 20 (oldest removed, new added)
      expect(state.evaluations).toHaveLength(20);
    });

    test('should update timestamps correctly', async () => {
      const conversationHistory = new Array(3).fill({ role: 'student', content: 'Test' });

      const beforeTime = Date.now();
      await director.execute({ conversationHistory });
      const afterTime = Date.now();

      const state = await protocol.read('director_state');
      expect(state.updated_at).toBeGreaterThanOrEqual(beforeTime);
      expect(state.updated_at).toBeLessThanOrEqual(afterTime);
    });
  });

  // ===== Protocol Integration =====

  describe('Protocol Integration', () => {
    test('should respect runtime phase permissions', async () => {
      const conversationHistory = new Array(3).fill({ role: 'student', content: 'Test' });

      // Director should be able to write director_state in runtime phase
      await expect(director.execute({ conversationHistory })).resolves.toBeDefined();

      // Verify state was written
      const state = await protocol.read('director_state');
      expect(state).toBeDefined();
    });

    test('should not be able to write in building phase', async () => {
      protocol.phase = 'building';

      const conversationHistory = new Array(3).fill({ role: 'student', content: 'Test' });

      // Director should not have write permissions in building phase
      await expect(director.execute({ conversationHistory })).rejects.toThrow('Permission denied');
    });

    test('should be able to read blueprint in runtime', async () => {
      const conversationHistory = new Array(3).fill({ role: 'student', content: 'Test' });

      await director.execute({ conversationHistory });

      // Should have successfully read blueprint (no errors)
      expect(director.llmCompleteJSON).toHaveBeenCalled();
    });
  });

  // ===== Conversation Formatting =====

  describe('Conversation Formatting', () => {
    test('should format conversation history correctly', () => {
      const messages = [
        { role: 'student', content: 'Hello, I need help with this decision' },
        { role: 'ai', content: 'I can help guide you. What have you considered so far?' },
        { role: 'student', content: 'I think we should focus on cost' }
      ];

      const formatted = director.formatConversation(messages);

      expect(formatted).toContain('STUDENT');
      expect(formatted).toContain('AI ADVISOR');
      expect(formatted).toContain('Hello, I need help');
      expect(formatted).toContain('focus on cost');
    });

    test('should truncate long messages', () => {
      const longMessage = 'A'.repeat(300);
      const messages = [
        { role: 'student', content: longMessage }
      ];

      const formatted = director.formatConversation(messages);

      // Should be truncated to ~200 chars
      expect(formatted.length).toBeLessThan(250);
    });

    test('should handle empty conversation', () => {
      const formatted = director.formatConversation([]);

      expect(formatted).toBe('No conversation yet');
    });
  });
});
