/**
 * @fileoverview Director Agent
 * Evaluates student progress and manages narrative arc during runtime
 */

const BaseAgent = require('./base-agent');

/**
 * @class DirectorAgent
 * @extends BaseAgent
 * @description Evaluates conversation progress and suggests interventions
 */
class DirectorAgent extends BaseAgent {
  /**
   * Execute director evaluation
   * @param {Object} params - Evaluation parameters
   * @param {Array} params.conversationHistory - Conversation messages
   * @param {string} [params.latestMessage] - Latest student message
   * @returns {Promise<Object>} Director decision
   */
  async execute(params) {
    const { conversationHistory = [], latestMessage = '' } = params;

    // Read from protocol
    const blueprint = await this.read('simulation_blueprint');
    if (!blueprint) {
      throw new Error('Cannot evaluate: simulation_blueprint is missing');
    }

    const currentState = await this.read('director_state') || this.initializeState(blueprint);

    // Should we evaluate now?
    if (!this.shouldEvaluate(currentState, conversationHistory, blueprint.director_settings)) {
      return {
        action: 'none',
        reasoning: 'Not time to evaluate yet',
        next_evaluation_at: this.calculateNextEvaluation(currentState, blueprint.director_settings)
      };
    }

    // Run evaluation
    const decision = await this.evaluateProgress(
      blueprint,
      currentState,
      conversationHistory,
      latestMessage
    );

    // Update state
    const updatedState = this.updateState(currentState, decision, conversationHistory);
    await this.write('director_state', updatedState);

    return decision;
  }

  /**
   * Initialize director state
   * @param {Object} blueprint - Simulation blueprint
   * @returns {Object} Initial state
   */
  initializeState(blueprint) {
    return {
      phase: 'intro',
      student_state: 'engaged',
      message_count: 0,
      last_evaluated_message: 0,
      evaluations: [],
      goal_progress: this.initializeGoalProgress(blueprint.goals),
      encounters_triggered: [],
      created_at: Date.now(),
      updated_at: Date.now()
    };
  }

  /**
   * Initialize goal progress tracking
   * @private
   * @param {Array} goals - Learning goals from blueprint
   * @returns {Object} Goal progress map
   */
  initializeGoalProgress(goals) {
    const progress = {};
    goals.forEach(goal => {
      progress[goal.id] = {
        status: 'not_started',
        evidence_collected: [],
        last_updated: Date.now()
      };
    });
    return progress;
  }

  /**
   * Determine if evaluation should run now
   * @param {Object} state - Current director state
   * @param {Array} conversationHistory - Conversation messages
   * @param {Object} settings - Director settings
   * @returns {boolean} True if should evaluate
   */
  shouldEvaluate(state, conversationHistory, settings) {
    const messageCount = conversationHistory.length;
    const messagesSinceLastEval = messageCount - state.last_evaluated_message;
    const evaluationFrequency = settings.evaluation_frequency || 3;

    return messagesSinceLastEval >= evaluationFrequency;
  }

  /**
   * Calculate when next evaluation should happen
   * @private
   * @param {Object} state - Current state
   * @param {Object} settings - Director settings
   * @returns {number} Message number for next evaluation
   */
  calculateNextEvaluation(state, settings) {
    const frequency = settings.evaluation_frequency || 3;
    return state.last_evaluated_message + frequency;
  }

  /**
   * Evaluate student progress
   * @param {Object} blueprint - Simulation blueprint
   * @param {Object} state - Current director state
   * @param {Array} history - Conversation history
   * @param {string} latestMessage - Latest student message
   * @returns {Promise<Object>} Director decision
   */
  async evaluateProgress(blueprint, state, history, latestMessage) {
    const prompt = this.buildEvaluationPrompt(blueprint, state, history, latestMessage);

    try {
      const response = await this.llmCompleteJSON(
        [
          { role: 'system', content: this.getSystemPrompt() },
          { role: 'user', content: prompt }
        ],
        'gpt-3.5-turbo', // Cost optimization
        {
          temperature: 0.3, // Lower for more consistent analysis
          max_tokens: 500
        }
      );

      return this.validateAndEnhanceDecision(response, blueprint, state);
    } catch (error) {
      console.error('Director evaluation failed:', error);
      return this.createFallbackDecision(error);
    }
  }

  /**
   * Get system prompt for director
   * @private
   * @returns {string} System prompt
   */
  getSystemPrompt() {
    return `You are a Director AI that analyzes educational simulation conversations to guide learning progress.

Your role:
- Assess student progress toward learning objectives
- Identify when students are stuck, off-track, or ready to advance
- Suggest interventions to enhance learning (questions, encounters, tone adjustments)
- Track which goals have been addressed

You do NOT directly respond to students - the Actor agent does that.
You provide strategic guidance to shape the conversation's direction.`;
  }

  /**
   * Build evaluation prompt
   * @private
   * @param {Object} blueprint - Simulation blueprint
   * @param {Object} state - Current state
   * @param {Array} history - Conversation history
   * @param {string} latestMessage - Latest message
   * @returns {string} Evaluation prompt
   */
  buildEvaluationPrompt(blueprint, state, history, latestMessage) {
    const goals = blueprint.goals.map((g, idx) =>
      `${idx + 1}. ${g.title}: ${g.description}\n   Success criteria: ${g.success_criteria.join(', ')}`
    ).join('\n');

    const recentConversation = this.formatConversation(history.slice(-10));
    const messageCount = history.length;

    return `Analyze this educational simulation conversation.

SCENARIO:
${blueprint.description || blueprint.title}

LEARNING GOALS:
${goals}

CURRENT STATE:
- Phase: ${state.phase}
- Student state: ${state.student_state}
- Message count: ${messageCount}
- Latest message: "${latestMessage}"

RECENT CONVERSATION:
${recentConversation}

ANALYSIS TASK:
Evaluate the conversation and provide:

1. **Phase** - Where is the student in their learning journey?
   - "intro" - Building context, just starting
   - "exploration" - Actively exploring the problem
   - "decision" - Making or discussing decisions
   - "conclusion" - Wrapping up, reflecting

2. **Student State** - How is the student doing?
   - "engaged" - Progressing well
   - "stuck" - Repeating ideas, not progressing
   - "off_track" - Pursuing irrelevant tangents
   - "ready_to_advance" - Ready for next challenge

3. **Action** - What should happen next?
   - "continue" - Keep current approach
   - "challenge" - Introduce harder question
   - "redirect" - Guide back on track
   - "encounter" - Trigger a scenario event
   - "advance_phase" - Move to next phase

4. **Intervention** - Specific guidance for the Actor
   Example: "Ask the student to consider stakeholder impacts" or "Introduce the CFO character with budget concerns"

5. **Goal Progress** - Which goal IDs (if any) has the student made progress on?
   Array of goal IDs that show evidence of progress

6. **Confidence** - How confident are you? (0.0 to 1.0)

7. **Reasoning** - Brief explanation (2-3 sentences)

RESPOND WITH VALID JSON:
{
  "phase": "intro|exploration|decision|conclusion",
  "student_state": "engaged|stuck|off_track|ready_to_advance",
  "action": "continue|challenge|redirect|encounter|advance_phase",
  "intervention": "specific guidance here",
  "goal_progress": ["goal_id_1", "goal_id_2"],
  "confidence": 0.85,
  "reasoning": "brief explanation"
}`;
  }

  /**
   * Format conversation for analysis
   * @private
   * @param {Array} messages - Conversation messages
   * @returns {string} Formatted conversation
   */
  formatConversation(messages) {
    if (!messages || messages.length === 0) {
      return 'No conversation yet';
    }

    return messages.map((msg, idx) => {
      const role = msg.role === 'student' ? 'STUDENT' : 'AI ADVISOR';
      const content = msg.content.substring(0, 200);
      return `${idx + 1}. ${role}: ${content}`;
    }).join('\n');
  }

  /**
   * Validate and enhance decision from LLM
   * @private
   * @param {Object} response - LLM response
   * @param {Object} blueprint - Simulation blueprint
   * @param {Object} state - Current state
   * @returns {Object} Validated decision
   */
  validateAndEnhanceDecision(response, blueprint, state) {
    // Ensure required fields
    const decision = {
      phase: response.phase || state.phase,
      student_state: response.student_state || 'engaged',
      action: response.action || 'continue',
      intervention: response.intervention || 'Continue current approach',
      goal_progress: Array.isArray(response.goal_progress) ? response.goal_progress : [],
      confidence: response.confidence || 0.5,
      reasoning: response.reasoning || 'No reasoning provided',
      timestamp: Date.now()
    };

    // Add encounter suggestions if action is 'encounter'
    if (decision.action === 'encounter' && blueprint.encounters) {
      decision.suggested_encounters = blueprint.encounters
        .filter(e => !state.encounters_triggered.includes(e.id))
        .slice(0, 3)
        .map(e => e.id);
    }

    return decision;
  }

  /**
   * Create fallback decision when evaluation fails
   * @private
   * @param {Error} error - The error that occurred
   * @returns {Object} Fallback decision
   */
  createFallbackDecision(error) {
    return {
      phase: 'unknown',
      student_state: 'engaged',
      action: 'continue',
      intervention: 'Continue current approach (evaluation unavailable)',
      goal_progress: [],
      confidence: 0,
      reasoning: `Evaluation failed: ${error.message}`,
      timestamp: Date.now(),
      error: true
    };
  }

  /**
   * Update director state with new decision
   * @param {Object} state - Current state
   * @param {Object} decision - Director decision
   * @param {Array} history - Conversation history
   * @returns {Object} Updated state
   */
  updateState(state, decision, history) {
    // Update goal progress
    const updatedGoalProgress = { ...state.goal_progress };
    decision.goal_progress.forEach(goalId => {
      if (updatedGoalProgress[goalId]) {
        updatedGoalProgress[goalId].status = 'in_progress';
        updatedGoalProgress[goalId].last_updated = Date.now();
      }
    });

    // Track encounter if triggered
    const encountersTrigger = [...state.encounters_triggered];
    if (decision.action === 'encounter' && decision.suggested_encounters) {
      encountersTrigger.push(...decision.suggested_encounters);
    }

    return {
      ...state,
      phase: decision.phase,
      student_state: decision.student_state,
      message_count: history.length,
      last_evaluated_message: history.length,
      goal_progress: updatedGoalProgress,
      encounters_triggered: encountersTrigger,
      evaluations: [
        ...state.evaluations,
        {
          message_number: history.length,
          decision,
          timestamp: Date.now()
        }
      ].slice(-20), // Keep last 20 evaluations
      updated_at: Date.now()
    };
  }
}

module.exports = DirectorAgent;
