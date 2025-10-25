/**
 * @fileoverview Actor Agent
 * Processes student messages and generates AI advisor responses during runtime
 */

const BaseAgent = require('./base-agent');

/**
 * @class ActorAgent
 * @extends BaseAgent
 * @description Processes student messages and generates contextual responses
 */
class ActorAgent extends BaseAgent {
  /**
   * Execute actor processing - generate response to student message
   * @param {Object} params - Processing parameters
   * @param {string} params.studentMessage - Student's message
   * @param {Array} params.conversationHistory - Conversation history
   * @returns {Promise<Object>} Actor response with metadata
   */
  async execute(params) {
    const { studentMessage, conversationHistory = [] } = params;

    if (!studentMessage) {
      throw new Error('Cannot process: studentMessage is required');
    }

    // Read from protocol
    const blueprint = await this.read('simulation_blueprint');
    if (!blueprint) {
      throw new Error('Cannot process: simulation_blueprint is missing');
    }

    const directorState = await this.read('director_state');

    // Evaluate triggers
    const triggeredActions = this.evaluateTriggers(
      blueprint.actors || [],
      conversationHistory,
      studentMessage
    );

    // Build system prompt with Director guidance
    const systemPrompt = this.buildSystemPrompt(
      blueprint,
      directorState,
      conversationHistory,
      triggeredActions
    );

    // Build messages array for LLM
    const messages = this.buildMessages(
      systemPrompt,
      conversationHistory,
      studentMessage,
      triggeredActions,
      directorState
    );

    // Generate response with GPT-4
    const aiResponse = await this.llmComplete(
      messages,
      'gpt-4', // Actor uses GPT-4 for quality (student-facing)
      {
        temperature: blueprint.actor_settings?.temperature || 0.7,
        max_tokens: blueprint.actor_settings?.max_response_tokens || 500
      }
    );

    // Prepare response metadata
    const metadata = {
      triggers_activated: triggeredActions.map(t => ({
        actor: t.actorName,
        action: t.action
      })),
      director_interventions: this.getActiveInterventions(directorState),
      timestamp: Date.now()
    };

    // Write response to protocol
    await this.write('actor_responses', {
      message: aiResponse,
      metadata,
      timestamp: Date.now()
    });

    return {
      message: aiResponse,
      metadata
    };
  }

  /**
   * Build system prompt with Director guidance
   * @param {Object} blueprint - Simulation blueprint
   * @param {Object} directorState - Current director state
   * @param {Array} history - Conversation history
   * @param {Array} triggeredActions - Triggered actor actions
   * @returns {string} System prompt
   */
  buildSystemPrompt(blueprint, directorState, history, triggeredActions) {
    let prompt = `You are an AI advisor in an educational business simulation.

SCENARIO:
${blueprint.scenario_text || blueprint.description}

`;

    // Add actors
    if (blueprint.actors && blueprint.actors.length > 0) {
      prompt += `AI CHARACTERS YOU EMBODY:\n`;
      blueprint.actors.forEach(actor => {
        prompt += `\n${actor.name}`;
        if (actor.role) {
          prompt += ` (${actor.role})`;
        }
        prompt += `\n`;

        if (actor.personality) {
          const traits = this.formatPersonalityTraits(actor.personality);
          if (traits) {
            prompt += `  Personality: ${traits}\n`;
          }
        }

        if (actor.goals && actor.goals.length > 0) {
          prompt += `  Goals:\n`;
          actor.goals.forEach(goal => {
            prompt += `    - ${goal}\n`;
          });
        }
      });
      prompt += `\n`;
    }

    // Add learning objectives
    if (blueprint.goals && blueprint.goals.length > 0) {
      prompt += `LEARNING OBJECTIVES:\n`;
      blueprint.goals.forEach(goal => {
        prompt += `- ${goal.title}: ${goal.description}\n`;
      });
      prompt += `\n`;
    }

    // Add rules
    if (blueprint.rules && blueprint.rules.length > 0) {
      prompt += `SOCRATIC METHOD RULES:\n`;
      blueprint.rules.forEach(rule => {
        prompt += `- ${rule}\n`;
      });
      prompt += `\n`;
    }

    // Add Director interventions if present
    if (directorState) {
      const interventions = this.getActiveInterventions(directorState);
      if (interventions.length > 0) {
        prompt += `DIRECTOR GUIDANCE:\n`;
        interventions.forEach(intervention => {
          prompt += `- ${intervention}\n`;
        });
        prompt += `\n`;
      }
    }

    // Add core pedagogical rules
    prompt += `CRITICAL PEDAGOGICAL RULES:
1. NEVER provide direct answers or solutions
2. Use the Socratic method - ask probing questions that challenge assumptions
3. Make students think critically about consequences and trade-offs
4. Focus on making them discover insights themselves
5. Challenge their thinking without being dismissive
6. If they ask for a direct answer, redirect with a thought-provoking question
7. Help them develop the thinking process, not just reach an answer

Remember: Your role is to develop critical thinking, not to provide solutions.`;

    return prompt;
  }

  /**
   * Build messages array for LLM
   * @param {string} systemPrompt - System prompt
   * @param {Array} history - Conversation history
   * @param {string} studentMessage - Latest student message
   * @param {Array} triggeredActions - Triggered actions
   * @param {Object} directorState - Director state
   * @returns {Array} Messages array
   */
  buildMessages(systemPrompt, history, studentMessage, triggeredActions, directorState) {
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history
    history.forEach(entry => {
      if (entry.role === 'student') {
        messages.push({ role: 'user', content: entry.content });
      } else if (entry.role === 'ai' || entry.role === 'ai_advisor') {
        messages.push({ role: 'assistant', content: entry.content });
      }
    });

    // Add triggered actions as system message if any
    if (triggeredActions.length > 0) {
      let triggerMessage = '⚡ TRIGGERS ACTIVATED:\n';
      triggeredActions.forEach(trigger => {
        triggerMessage += `- ${trigger.actorName}: ${trigger.action}\n`;
      });
      messages.push({ role: 'system', content: triggerMessage });
    }

    // Add Director's latest intervention as system message
    if (directorState && directorState.evaluations && directorState.evaluations.length > 0) {
      const latestEval = directorState.evaluations[directorState.evaluations.length - 1];
      if (latestEval.decision.intervention && latestEval.decision.intervention !== 'Continue current approach') {
        messages.push({
          role: 'system',
          content: `🎬 DIRECTOR NOTE: ${latestEval.decision.intervention}`
        });
      }
    }

    // Add new student message
    messages.push({ role: 'user', content: studentMessage });

    return messages;
  }

  /**
   * Get active interventions from director state
   * @param {Object} directorState - Director state
   * @returns {Array<string>} Array of intervention strings
   */
  getActiveInterventions(directorState) {
    if (!directorState || !directorState.evaluations || directorState.evaluations.length === 0) {
      return [];
    }

    const interventions = [];
    const latestEval = directorState.evaluations[directorState.evaluations.length - 1];

    if (latestEval.decision.intervention && latestEval.decision.intervention !== 'Continue current approach') {
      interventions.push(latestEval.decision.intervention);
    }

    // Add action-specific guidance
    if (latestEval.decision.action === 'challenge') {
      interventions.push('Increase difficulty - ask harder questions');
    } else if (latestEval.decision.action === 'redirect') {
      interventions.push('Gently redirect student back to core objectives');
    } else if (latestEval.decision.action === 'encounter') {
      if (latestEval.decision.suggested_encounters && latestEval.decision.suggested_encounters.length > 0) {
        interventions.push(`Consider introducing encounter: ${latestEval.decision.suggested_encounters[0]}`);
      }
    }

    return interventions;
  }

  /**
   * Evaluate triggers against current conversation state
   * @param {Array} actors - Actor configurations
   * @param {Array} history - Conversation history
   * @param {string} studentMessage - Latest student message
   * @returns {Array} Triggered actions
   */
  evaluateTriggers(actors, history, studentMessage) {
    const triggeredActions = [];
    const messageCount = history.length + 1;

    actors.forEach(actor => {
      if (!actor.triggers || actor.triggers.length === 0) return;

      actor.triggers.forEach(trigger => {
        let isTriggered = false;

        switch (trigger.trigger_type) {
          case 'keyword':
            // Check if keyword appears in student message
            if (trigger.condition && studentMessage) {
              const keywords = trigger.condition.toLowerCase().split(',').map(k => k.trim());
              const messageLower = studentMessage.toLowerCase();
              isTriggered = keywords.some(keyword => messageLower.includes(keyword));
            }
            break;

          case 'message_count':
            // Check if message count threshold reached
            const targetCount = parseInt(trigger.condition, 10);
            isTriggered = !isNaN(targetCount) && messageCount >= targetCount;
            break;

          default:
            // Other trigger types handled by AI via prompt
            isTriggered = false;
        }

        if (isTriggered && trigger.action) {
          triggeredActions.push({
            actorName: actor.name || actor.role || 'Actor',
            action: trigger.action,
            triggerType: trigger.trigger_type
          });
        }
      });
    });

    return triggeredActions;
  }

  /**
   * Format personality traits into natural language
   * @param {Object} traits - Personality trait values
   * @returns {string} Formatted description
   */
  formatPersonalityTraits(traits) {
    if (!traits || typeof traits !== 'object') return '';

    const descriptions = [];

    // Map trait values to descriptions
    if (traits.assertiveness) {
      descriptions.push(traits.assertiveness);
    }
    if (traits.cooperation) {
      descriptions.push(traits.cooperation);
    }
    if (traits.formality) {
      descriptions.push(traits.formality);
    }

    // Handle legacy numeric traits
    if (traits.aggressive_passive !== undefined) {
      if (traits.aggressive_passive < 30) descriptions.push('passive');
      else if (traits.aggressive_passive >= 70) descriptions.push('assertive');
    }

    if (traits.cooperative_antagonistic !== undefined) {
      if (traits.cooperative_antagonistic < 30) descriptions.push('antagonistic');
      else if (traits.cooperative_antagonistic >= 70) descriptions.push('cooperative');
    }

    return descriptions.join(', ');
  }
}

module.exports = ActorAgent;
