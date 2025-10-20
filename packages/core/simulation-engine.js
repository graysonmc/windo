import OpenAI from 'openai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../.env') });

/**
 * SimulationEngine - Stateless AI conversation processor
 *
 * This engine processes student messages in the context of a simulation.
 * It does NOT store state internally - all state management is handled by the API layer.
 */
class SimulationEngine {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not found in environment variables');
    }
  }

  /**
   * Process a student's message in the context of a simulation
   *
   * @param {Object} simulation - The simulation configuration from database
   * @param {Array} conversationHistory - Array of previous messages
   * @param {String} studentMessage - The new message from the student
   * @returns {Promise<String>} The AI's response
   */
  async processMessage(simulation, conversationHistory, studentMessage) {
    try {
      // Evaluate triggers
      const triggeredActions = this._evaluateTriggers(
        simulation.actors || [],
        conversationHistory,
        studentMessage
      );

      const messages = this._buildOpenAIMessages(
        simulation,
        conversationHistory,
        studentMessage,
        triggeredActions
      );

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
      });

      const aiResponse = response.choices[0].message.content;
      return aiResponse;

    } catch (error) {
      console.error('Error processing student input:', error);
      throw new Error(`Failed to process student input: ${error.message}`);
    }
  }

  /**
   * Build the messages array for OpenAI API
   * Includes system prompt, conversation history, and new message
   */
  _buildOpenAIMessages(simulation, conversationHistory, studentMessage, triggeredActions = []) {
    // Extract parameters with defaults
    const params = simulation.parameters || {};
    const aiMode = params.ai_mode || 'challenger';
    const complexity = params.complexity || 'escalating';

    // Build dynamic system prompt based on simulation configuration
    const systemPrompt = this._buildSystemPrompt(simulation, aiMode, complexity);

    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history
    conversationHistory.forEach(entry => {
      if (entry.role === 'student') {
        messages.push({ role: 'user', content: entry.content });
      } else if (entry.role === 'ai_advisor') {
        messages.push({ role: 'assistant', content: entry.content });
      }
    });

    // Add triggered actions as a system message if any
    if (triggeredActions.length > 0) {
      let triggerMessage = '⚡ TRIGGERS ACTIVATED:\n';
      triggeredActions.forEach(trigger => {
        triggerMessage += `- ${trigger.actorName}: ${trigger.action}\n`;
      });
      messages.push({ role: 'system', content: triggerMessage });
    }

    // Add new student message
    messages.push({ role: 'user', content: studentMessage });

    return messages;
  }

  /**
   * Build the system prompt based on simulation configuration
   */
  _buildSystemPrompt(simulation, aiMode, complexity) {
    const scenario = simulation.scenario_text || simulation.scenario || '';
    const actors = simulation.actors || [];
    const objectives = simulation.objectives || [];

    // Find the student's actor configuration
    const studentActor = actors.find(a => a.is_student_role);

    // Find AI actors
    const aiActors = actors.filter(a => !a.is_student_role);

    let prompt = `You are an AI advisor in an educational business simulation.

SCENARIO:
${scenario}

`;

    // Add document context if present
    const params = simulation.parameters || {};
    if (params.document_name) {
      prompt += `SOURCE DOCUMENT: ${params.document_name}\n`;
      if (params.document_instructions) {
        prompt += `Document Context: ${params.document_instructions}\n`;
      }
      prompt += `\n`;
    }

    // Add actor information
    if (studentActor) {
      prompt += `STUDENT ROLE: ${studentActor.role || studentActor.name}
`;
    }

    if (aiActors.length > 0) {
      prompt += `\nAI CHARACTERS YOU EMBODY:\n`;
      aiActors.forEach(actor => {
        prompt += `\n${actor.name || actor.role}`;
        if (actor.role && actor.name !== actor.role) {
          prompt += ` (${actor.role})`;
        }
        if (actor.personality_mode) {
          prompt += ` - ${actor.personality_mode} personality`;
        }
        prompt += `\n`;

        // Add personality traits if present
        if (actor.personality_traits) {
          const traitDesc = this._formatPersonalityTraits(actor.personality_traits);
          if (traitDesc) {
            prompt += `  Personality: ${traitDesc}\n`;
          }
        }

        // Add goals if present
        if (actor.goals && actor.goals.length > 0) {
          prompt += `  Goals:\n`;
          actor.goals.forEach(goal => {
            if (goal && goal.trim()) {
              prompt += `    - ${goal}\n`;
            }
          });
        }

        // Add hidden information if present
        if (actor.hidden_info && actor.hidden_info.length > 0) {
          prompt += `  Hidden Information (reveal strategically when relevant):\n`;
          actor.hidden_info.forEach(info => {
            if (info && info.trim()) {
              prompt += `    - ${info}\n`;
            }
          });
        }

        // Add triggers if present
        if (actor.triggers && actor.triggers.length > 0) {
          prompt += `  Behavioral Triggers:\n`;
          actor.triggers.forEach(trigger => {
            if (trigger && trigger.action && trigger.action.trim()) {
              const triggerDesc = this._formatTriggerDescription(trigger);
              prompt += `    - ${triggerDesc}: ${trigger.action}\n`;
            }
          });
        }

        // Add loyalties if present
        if (actor.loyalties) {
          if (actor.loyalties.supports && actor.loyalties.supports.length > 0) {
            prompt += `  Supports/Allies: ${actor.loyalties.supports.join(', ')}\n`;
          }
          if (actor.loyalties.opposes && actor.loyalties.opposes.length > 0) {
            prompt += `  Opposes/Rivals: ${actor.loyalties.opposes.join(', ')}\n`;
          }
        }

        // Add priorities if present
        if (actor.priorities && actor.priorities.length > 0) {
          prompt += `  Priorities (in order):\n`;
          actor.priorities.forEach((priority, idx) => {
            if (priority && priority.trim()) {
              prompt += `    ${idx + 1}. ${priority}\n`;
            }
          });
        }
      });
    }

    // Add learning objectives
    if (objectives.length > 0) {
      prompt += `\nLEARNING OBJECTIVES:\n`;
      objectives.forEach(obj => {
        prompt += `- ${obj}\n`;
      });
    }

    // Add AI mode instructions
    prompt += `\nAI BEHAVIOR MODE: ${aiMode.toUpperCase()}\n`;

    switch (aiMode) {
      case 'challenger':
        prompt += `- Actively challenge assumptions and push back on ideas
- Point out flaws and risks
- Make the student defend their thinking
- Be skeptical but not dismissive\n`;
        break;
      case 'coach':
        prompt += `- Guide discovery through supportive questions
- Encourage exploration of alternatives
- Provide hints when stuck
- Build confidence while developing thinking\n`;
        break;
      case 'expert':
        prompt += `- Provide relevant data and context
- Share domain expertise when asked
- Clarify complex concepts
- Balance information giving with questioning\n`;
        break;
      case 'adaptive':
        prompt += `- Adjust approach based on student performance
- More supportive when struggling, more challenging when confident
- Vary style to maintain engagement
- Respond to student's emotional state\n`;
        break;
      case 'custom':
        // Use custom instructions from parameters
        const customInstructions = simulation.parameters?.custom_instructions || simulation.parameters?.instructions;
        if (customInstructions) {
          prompt += `${customInstructions}\n`;
        }
        break;
    }

    // Add core pedagogical rules (always apply)
    prompt += `
CRITICAL PEDAGOGICAL RULES:
1. NEVER provide direct answers or solutions
2. Use the Socratic method - ask probing questions that challenge assumptions
3. Make students think critically about consequences and trade-offs
4. Focus on making them discover insights themselves
5. Challenge their thinking without being dismissive
6. If they ask for a direct answer, redirect with a thought-provoking question
7. Help them develop the thinking process, not just reach an answer

COMPLEXITY: ${complexity}
`;

    if (complexity === 'escalating') {
      prompt += `- Start with simpler challenges, increase difficulty as they show competence\n`;
    } else if (complexity === 'adaptive') {
      prompt += `- Adjust difficulty based on their responses - easier if struggling, harder if excelling\n`;
    }

    prompt += `\nRemember: Your role is to develop critical thinking, not to provide solutions.`;

    return prompt;
  }

  /**
   * Format a trigger description for the system prompt
   */
  _formatTriggerDescription(trigger) {
    const type = trigger.trigger_type || 'keyword';
    const condition = trigger.condition || '';

    switch (type) {
      case 'keyword':
        return `When student mentions "${condition}"`;
      case 'sentiment':
        return `When student expresses ${condition} sentiment`;
      case 'message_count':
        return `After ${condition} messages`;
      case 'time_elapsed':
        return `After ${condition} minutes`;
      default:
        return `When ${condition}`;
    }
  }

  /**
   * Format personality traits into a natural language description
   */
  _formatPersonalityTraits(traits) {
    if (!traits || Object.keys(traits).length === 0) return '';

    const descriptions = [];

    // Aggressive/Passive
    if (traits.aggressive_passive !== undefined) {
      if (traits.aggressive_passive < 30) descriptions.push('very passive and yielding');
      else if (traits.aggressive_passive < 45) descriptions.push('somewhat passive');
      else if (traits.aggressive_passive >= 55 && traits.aggressive_passive < 70) descriptions.push('assertive');
      else if (traits.aggressive_passive >= 70) descriptions.push('very assertive and forceful');
    }

    // Cooperative/Antagonistic
    if (traits.cooperative_antagonistic !== undefined) {
      if (traits.cooperative_antagonistic < 30) descriptions.push('antagonistic and resistant');
      else if (traits.cooperative_antagonistic < 45) descriptions.push('somewhat resistant');
      else if (traits.cooperative_antagonistic >= 55 && traits.cooperative_antagonistic < 70) descriptions.push('cooperative');
      else if (traits.cooperative_antagonistic >= 70) descriptions.push('very cooperative and collaborative');
    }

    // Analytical/Intuitive
    if (traits.analytical_intuitive !== undefined) {
      if (traits.analytical_intuitive < 30) descriptions.push('highly intuitive');
      else if (traits.analytical_intuitive < 45) descriptions.push('somewhat intuitive');
      else if (traits.analytical_intuitive >= 55 && traits.analytical_intuitive < 70) descriptions.push('analytical');
      else if (traits.analytical_intuitive >= 70) descriptions.push('very analytical and data-driven');
    }

    // Formal/Casual
    if (traits.formal_casual !== undefined) {
      if (traits.formal_casual < 30) descriptions.push('very casual and relaxed');
      else if (traits.formal_casual < 45) descriptions.push('somewhat casual');
      else if (traits.formal_casual >= 55 && traits.formal_casual < 70) descriptions.push('formal');
      else if (traits.formal_casual >= 70) descriptions.push('very formal and professional');
    }

    // Patient/Impatient
    if (traits.patient_impatient !== undefined) {
      if (traits.patient_impatient < 30) descriptions.push('impatient and urgent');
      else if (traits.patient_impatient < 45) descriptions.push('somewhat impatient');
      else if (traits.patient_impatient >= 55 && traits.patient_impatient < 70) descriptions.push('patient');
      else if (traits.patient_impatient >= 70) descriptions.push('very patient and deliberate');
    }

    return descriptions.join(', ');
  }

  /**
   * Evaluate triggers against current conversation state
   * Returns array of triggered actions
   */
  _evaluateTriggers(actors, conversationHistory, studentMessage) {
    const triggeredActions = [];
    const messageCount = conversationHistory.length + 1;

    actors.forEach(actor => {
      if (!actor.triggers || actor.triggers.length === 0) return;

      actor.triggers.forEach(trigger => {
        let isTriggered = false;

        switch (trigger.trigger_type) {
          case 'keyword':
            // Check if keyword appears in student message (case insensitive)
            if (trigger.condition && studentMessage) {
              const keywords = trigger.condition.toLowerCase().split(',').map(k => k.trim());
              const messageLower = studentMessage.toLowerCase();
              isTriggered = keywords.some(keyword => messageLower.includes(keyword));
            }
            break;

          case 'message_count':
            // Check if we've reached the message count threshold
            const targetCount = parseInt(trigger.condition, 10);
            isTriggered = !isNaN(targetCount) && messageCount >= targetCount;
            break;

          case 'sentiment':
            // Sentiment analysis would require additional AI call
            // For MVP, include in prompt and let AI interpret
            // Full implementation: use OpenAI to analyze sentiment
            isTriggered = false; // Handled by AI via prompt
            break;

          case 'time_elapsed':
            // Time-based triggers would require session start time tracking
            // For MVP, include in prompt for AI awareness
            // Full implementation: track session start time in database
            isTriggered = false; // Handled by AI via prompt
            break;
        }

        if (isTriggered && trigger.action) {
          triggeredActions.push({
            actorName: actor.name || actor.role,
            action: trigger.action,
            triggerType: trigger.trigger_type
          });
        }
      });
    });

    return triggeredActions;
  }

  /**
   * Generate a formatted export of a conversation
   */
  formatConversationForExport(simulation, conversationHistory) {
    let formatted = '';

    conversationHistory.forEach(entry => {
      const role = entry.role === 'student' ? 'Student' : 'AI Advisor';
      const timestamp = new Date(entry.timestamp).toLocaleString();
      formatted += `[${timestamp}] ${role}: ${entry.content}\n\n`;
    });

    return formatted;
  }
}

export default SimulationEngine;
