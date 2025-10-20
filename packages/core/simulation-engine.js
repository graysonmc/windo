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
      const messages = this._buildOpenAIMessages(simulation, conversationHistory, studentMessage);

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
  _buildOpenAIMessages(simulation, conversationHistory, studentMessage) {
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
