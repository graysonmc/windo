import OpenAI from 'openai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../.env') });

class SimulationEngine {
  constructor(scenario = '', instructions = '') {
    this.scenario = scenario;
    this.instructions = instructions;
    this.conversationHistory = [];
    this.simulationId = Date.now().toString();
    this.createdAt = new Date();
    this.lastModified = new Date();

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not found in environment variables');
    }
  }

  async processStudentInput(studentMessage) {
    try {
      this.conversationHistory.push({
        role: 'student',
        content: studentMessage,
        timestamp: new Date()
      });

      const messages = this._buildOpenAIMessages(studentMessage);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
      });

      const aiResponse = response.choices[0].message.content;

      this.conversationHistory.push({
        role: 'ai_advisor',
        content: aiResponse,
        timestamp: new Date()
      });

      return {
        response: aiResponse,
        conversationId: this.simulationId,
        messageCount: this.conversationHistory.length
      };
    } catch (error) {
      console.error('Error processing student input:', error);
      throw new Error(`Failed to process student input: ${error.message}`);
    }
  }

  _buildOpenAIMessages(studentMessage) {
    const systemPrompt = `You are an AI advisor in an educational business simulation.

Scenario: ${this.scenario}

Behavioral Instructions: ${this.instructions}

CRITICAL RULES:
1. NEVER provide direct answers or solutions
2. Use the Socratic method - ask probing questions that challenge assumptions
3. Make students think critically about consequences and trade-offs
4. Focus on making them discover insights themselves
5. Challenge their thinking without being dismissive
6. If they ask for a direct answer, redirect with a thought-provoking question

Remember: Your role is to develop critical thinking, not to provide solutions.`;

    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    this.conversationHistory.forEach(entry => {
      if (entry.role === 'student') {
        messages.push({ role: 'user', content: entry.content });
      } else if (entry.role === 'ai_advisor') {
        messages.push({ role: 'assistant', content: entry.content });
      }
    });

    messages.push({ role: 'user', content: studentMessage });

    return messages;
  }

  editScenario(newScenario) {
    this.scenario = newScenario;
    this.lastModified = new Date();
    return {
      success: true,
      scenario: this.scenario,
      lastModified: this.lastModified
    };
  }

  editInstructions(newInstructions) {
    this.instructions = newInstructions;
    this.lastModified = new Date();
    return {
      success: true,
      instructions: this.instructions,
      lastModified: this.lastModified
    };
  }

  editScenarioAndInstructions(newScenario, newInstructions) {
    this.scenario = newScenario;
    this.instructions = newInstructions;
    this.lastModified = new Date();
    return {
      success: true,
      scenario: this.scenario,
      instructions: this.instructions,
      lastModified: this.lastModified
    };
  }

  getCurrentState() {
    return {
      simulationId: this.simulationId,
      scenario: this.scenario,
      instructions: this.instructions,
      conversationHistory: this.conversationHistory,
      messageCount: this.conversationHistory.length,
      createdAt: this.createdAt,
      lastModified: this.lastModified
    };
  }

  getConversationHistory() {
    return this.conversationHistory;
  }

  getFormattedConversation() {
    return this.conversationHistory.map(entry => {
      const role = entry.role === 'student' ? 'Student' : 'AI Advisor';
      const timestamp = entry.timestamp.toLocaleString();
      return `[${timestamp}] ${role}: ${entry.content}`;
    }).join('\n\n');
  }

  exportConversation() {
    return {
      simulationId: this.simulationId,
      scenario: this.scenario,
      instructions: this.instructions,
      conversation: this.conversationHistory,
      metadata: {
        createdAt: this.createdAt,
        lastModified: this.lastModified,
        totalMessages: this.conversationHistory.length,
        exportedAt: new Date()
      }
    };
  }

  clearConversation() {
    this.conversationHistory = [];
    this.lastModified = new Date();
    return {
      success: true,
      message: 'Conversation history cleared'
    };
  }
}

export default SimulationEngine;




