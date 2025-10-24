/**
 * Director Prototype - Lightweight analysis-only Director
 *
 * Purpose: Validate Director concept by observing conversations and logging
 * suggestions without intervening. Helps decide if full NSM is worth building.
 *
 * Design: Zero refactoring, minimal dependencies, observation-only mode
 */

class DirectorPrototype {
  constructor(openaiClient) {
    if (!openaiClient) {
      throw new Error('DirectorPrototype requires OpenAI client');
    }
    this.openai = openaiClient;
  }

  /**
   * Analyze a conversation and suggest what Director would do
   * @param {Object} simulation - The simulation configuration
   * @param {Array} conversationHistory - Array of message objects
   * @param {String} latestMessage - The most recent student message
   * @returns {Promise<Object>} Analysis with suggestions and metrics
   */
  async analyzeConversation(simulation, conversationHistory, latestMessage) {
    try {
      const analysis = await this._runAnalysis(simulation, conversationHistory, latestMessage);

      return {
        timestamp: new Date().toISOString(),
        current_phase: analysis.phase,
        student_state: analysis.studentState,
        suggestion: analysis.suggestion,
        confidence: analysis.confidence,
        reasoning: analysis.reasoning,
        cost: analysis.cost,
        latency_ms: analysis.latency
      };
    } catch (error) {
      console.error('Director analysis failed:', error);
      return this._createErrorAnalysis(error);
    }
  }

  /**
   * Run the actual AI analysis
   * @private
   */
  async _runAnalysis(simulation, conversationHistory, latestMessage) {
    const startTime = Date.now();

    // Build analysis prompt
    const prompt = this._buildAnalysisPrompt(simulation, conversationHistory, latestMessage);

    // Call GPT-3.5-turbo (cheaper and faster than GPT-4)
    const response = await this.openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{
        role: "system",
        content: prompt
      }],
      temperature: 0.3,  // Lower temperature for more consistent analysis
      max_tokens: 300    // Keep responses concise
    });

    const latency = Date.now() - startTime;

    // Parse response
    const result = this._parseAnalysis(response.choices[0].message.content);
    result.latency = latency;
    result.cost = this._estimateCost(response.usage);

    return result;
  }

  /**
   * Build the analysis prompt for the AI
   * @private
   */
  _buildAnalysisPrompt(simulation, conversationHistory, latestMessage) {
    // Get learning objectives
    const objectives = this._extractObjectives(simulation);

    // Format recent conversation
    const recentConversation = this._formatConversation(conversationHistory);

    // Get message count for context
    const messageCount = conversationHistory.length;

    return `You are a Director AI analyzing an educational simulation conversation to determine if intervention would help.

SCENARIO CONTEXT:
${simulation.scenario_text || 'Not specified'}

LEARNING OBJECTIVES:
${objectives}

CONVERSATION STATUS:
- Message count: ${messageCount}
- Latest student message: "${latestMessage}"

RECENT CONVERSATION:
${recentConversation}

ANALYSIS TASK:
Analyze this conversation and determine:

1. **Current Phase** - Where is the student in their learning journey?
   - "intro" - Just starting, building context
   - "exploration" - Actively exploring the problem
   - "decision" - Ready to make or discussing decisions
   - "conclusion" - Wrapping up or reflecting

2. **Student State** - How is the student doing?
   - "engaged" - Progressing well, no intervention needed
   - "stuck" - Repeating similar ideas, not progressing
   - "off_track" - Pursuing irrelevant tangents
   - "ready_to_advance" - Showing readiness for next challenge

3. **Suggestion** - What intervention would help? (one specific action)
   - If engaged: "Continue current approach"
   - If stuck: Suggest a specific question or challenge
   - If off_track: Suggest how to redirect
   - If ready: Suggest next phase or complexity increase

4. **Confidence** - How confident are you? (0.0 to 1.0)

5. **Reasoning** - Brief explanation of your analysis (2-3 sentences)

RESPOND WITH VALID JSON ONLY:
{
  "phase": "intro|exploration|decision|conclusion",
  "studentState": "engaged|stuck|off_track|ready_to_advance",
  "suggestion": "specific intervention suggestion here",
  "confidence": 0.85,
  "reasoning": "brief explanation of analysis"
}`;
  }

  /**
   * Extract learning objectives from simulation
   * @private
   */
  _extractObjectives(simulation) {
    if (simulation.objectives && Array.isArray(simulation.objectives)) {
      return simulation.objectives.join('\n- ');
    }
    if (simulation.learning_objectives && Array.isArray(simulation.learning_objectives)) {
      return simulation.learning_objectives.join('\n- ');
    }
    return 'Not specified';
  }

  /**
   * Format conversation history for analysis
   * @private
   */
  _formatConversation(conversationHistory) {
    if (!conversationHistory || conversationHistory.length === 0) {
      return 'No conversation yet';
    }

    // Get last 10 messages for analysis
    const recentMessages = conversationHistory.slice(-10);

    return recentMessages.map((msg, index) => {
      const role = msg.role === 'student' ? 'STUDENT' : 'AI ADVISOR';
      const content = msg.content.substring(0, 200); // Truncate long messages
      return `${index + 1}. ${role}: ${content}`;
    }).join('\n');
  }

  /**
   * Parse AI response into structured analysis
   * @private
   */
  _parseAnalysis(content) {
    try {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Validate required fields
        if (!parsed.phase || !parsed.studentState || !parsed.suggestion) {
          throw new Error('Missing required fields in analysis');
        }

        return {
          phase: parsed.phase,
          studentState: parsed.studentState,
          suggestion: parsed.suggestion,
          confidence: parsed.confidence || 0.5,
          reasoning: parsed.reasoning || 'No reasoning provided'
        };
      }

      throw new Error('No JSON found in response');
    } catch (e) {
      console.error('Failed to parse analysis:', e);

      // Fallback analysis
      return {
        phase: "unknown",
        studentState: "unknown",
        suggestion: "Analysis parsing failed - unable to provide suggestion",
        confidence: 0,
        reasoning: `Parse error: ${e.message}`
      };
    }
  }

  /**
   * Estimate cost of the analysis call
   * @private
   */
  _estimateCost(usage) {
    if (!usage) return 0;

    // GPT-3.5-turbo pricing (as of Oct 2024)
    // Input: ~$0.0015 per 1K tokens
    // Output: ~$0.002 per 1K tokens
    const inputCost = (usage.prompt_tokens / 1000) * 0.0015;
    const outputCost = (usage.completion_tokens / 1000) * 0.002;

    return parseFloat((inputCost + outputCost).toFixed(6));
  }

  /**
   * Create error analysis when something fails
   * @private
   */
  _createErrorAnalysis(error) {
    return {
      timestamp: new Date().toISOString(),
      current_phase: 'error',
      student_state: 'error',
      suggestion: 'Analysis failed',
      confidence: 0,
      reasoning: error.message,
      cost: 0,
      latency_ms: 0,
      error: true
    };
  }
}

export default DirectorPrototype;
