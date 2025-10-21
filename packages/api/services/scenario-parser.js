import OpenAI from 'openai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../../.env') });

/**
 * ScenarioParser - Uses OpenAI function calling to extract structured data from scenario text
 *
 * Extracts:
 * - Actors (names, roles, student vs AI)
 * - Scenario type (ethical_dilemma, crisis_management, negotiation, strategic_planning)
 * - Context (industry, stakes, constraints)
 * - Suggested objectives
 * - Confidence score
 */
class ScenarioParser {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 50000, // 50 second timeout
      maxRetries: 2,
    });

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not found in environment variables');
    }
  }

  /**
   * Parse a scenario text into structured configuration
   * @param {string} scenarioText - The scenario description
   * @returns {Promise<Object>} Parsed scenario data
   */
  async parseScenario(scenarioText) {
    console.log('Starting scenario parsing with OpenAI...');
    console.log('Scenario text length:', scenarioText?.length || 0);

    try {
      console.log('Calling OpenAI API...');
      const startTime = Date.now();

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert at analyzing business case studies and educational scenarios.
Your job is to extract COMPREHENSIVE structured information that will be used to configure an AI-powered simulation.

Key principles:
- Identify all actors/characters with their goals, priorities, and hidden information
- Determine which role the student should play (usually the decision-maker)
- Extract specific learning objectives from the document (not generic ones)
- Identify relationships and loyalties between actors
- Find potential trigger conditions and responses
- Extract all contextual details that make the scenario realistic
- Provide rich character details to enable deep role-playing`
          },
          {
            role: 'user',
            content: `Analyze this scenario and extract structured information:\n\n${scenarioText}`
          }
        ],
        functions: [
          {
            name: 'extract_scenario_structure',
            description: 'Extract actors, scenario type, context, and learning objectives from a business scenario',
            parameters: {
              type: 'object',
              properties: {
                actors: {
                  type: 'array',
                  description: 'All characters or roles mentioned in the scenario',
                  items: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string',
                        description: 'Name or title of the actor (e.g., "CEO", "Board Member", "Sarah Johnson")'
                      },
                      role: {
                        type: 'string',
                        description: 'Their role or position in the scenario'
                      },
                      is_student_role: {
                        type: 'boolean',
                        description: 'True if this is the role the student should play'
                      },
                      personality_mode: {
                        type: 'string',
                        enum: ['supportive', 'challenging', 'neutral', 'expert', 'conflicted', 'professional'],
                        description: 'Suggested personality for AI actors (only for non-student roles)'
                      },
                      knowledge_level: {
                        type: 'string',
                        enum: ['expert', 'intermediate', 'basic'],
                        description: 'Level of expertise this character has (only for non-student roles)'
                      },
                      goals: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Character goals (only for non-student roles)'
                      },
                      hidden_info: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Hidden information (only for non-student roles)'
                      },
                      priorities: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Ordered priorities (only for non-student roles)'
                      },
                      loyalties: {
                        type: 'object',
                        properties: {
                          supports: { type: 'array', items: { type: 'string' } },
                          opposes: { type: 'array', items: { type: 'string' } }
                        },
                        description: 'Relationship dynamics (only for non-student roles)'
                      },
                      description: {
                        type: 'string',
                        description: 'Brief description of the actor and their situation'
                      }
                    },
                    required: ['name', 'role', 'is_student_role']
                  }
                },
                scenario_type: {
                  type: 'string',
                  enum: ['ethical_dilemma', 'crisis_management', 'negotiation', 'strategic_planning', 'leadership_challenge', 'conflict_resolution'],
                  description: 'The primary type of scenario'
                },
                context: {
                  type: 'object',
                  description: 'Contextual information about the scenario',
                  properties: {
                    industry: {
                      type: 'string',
                      description: 'The industry or domain (e.g., "technology", "healthcare", "finance")'
                    },
                    stakes: {
                      type: 'string',
                      description: 'What is at risk (e.g., "company reputation", "10 million customers", "employee jobs")'
                    },
                    time_pressure: {
                      type: 'boolean',
                      description: 'Whether there is urgency or time constraints'
                    },
                    complexity_level: {
                      type: 'string',
                      enum: ['low', 'medium', 'high'],
                      description: 'Overall complexity of the situation'
                    }
                  }
                },
                learning_objectives: {
                  type: 'array',
                  description: 'Specific learning objectives extracted from or suggested for this scenario - can be standard or custom objectives',
                  items: {
                    type: 'string'
                  },
                  minItems: 1,
                  maxItems: 15
                },
                suggested_ai_mode: {
                  type: 'string',
                  description: 'Suggested AI behavior mode - can be standard (challenger, coach, expert, adaptive, socratic) or custom with description'
                },
                custom_ai_mode_description: {
                  type: 'string',
                  description: 'If suggested_ai_mode is custom, describe the specific behavior'
                },
                key_decision_points: {
                  type: 'array',
                  description: 'The main decisions or questions the student must address',
                  items: { type: 'string' }
                },
                suggested_triggers: {
                  type: 'array',
                  description: 'Behavioral triggers based on scenario events',
                  items: {
                    type: 'object',
                    properties: {
                      condition: {
                        type: 'string',
                        description: 'When this happens (e.g., "mentions budget cuts")'
                      },
                      action: {
                        type: 'string',
                        description: 'AI should do this (e.g., "express concern about employee morale")'
                      },
                      actor: {
                        type: 'string',
                        description: 'Which actor this trigger applies to'
                      }
                    }
                  }
                },
                confidence: {
                  type: 'number',
                  description: 'Confidence score from 0.0 to 1.0 based on clarity and completeness of the scenario',
                  minimum: 0,
                  maximum: 1
                },
                ambiguities: {
                  type: 'array',
                  description: 'Aspects of the scenario that are unclear or need clarification',
                  items: { type: 'string' }
                }
              },
              required: ['actors', 'scenario_type', 'context', 'learning_objectives', 'confidence']
            }
          }
        ],
        function_call: { name: 'extract_scenario_structure' },
        temperature: 0.3 // Lower temperature for more consistent extraction
      });

      const elapsedTime = Date.now() - startTime;
      console.log(`OpenAI API responded in ${elapsedTime}ms`);

      const functionCall = response.choices[0].message.function_call;
      const parsedData = JSON.parse(functionCall.arguments);
      console.log('Successfully parsed scenario data');

      // Post-process: Add suggested AI parameters based on scenario type
      const suggestedParameters = this._suggestParametersForScenarioType(parsedData.scenario_type);

      return {
        success: true,
        parsed: {
          actors: parsedData.actors,
          scenario_type: parsedData.scenario_type,
          context: parsedData.context,
          suggested_objectives: parsedData.suggested_objectives,
          key_decision_points: parsedData.key_decision_points || [],
          confidence: parsedData.confidence,
          ambiguities: parsedData.ambiguities || []
        },
        suggested_parameters: suggestedParameters,
        raw_response: parsedData
      };

    } catch (error) {
      console.error('Error parsing scenario:', error);

      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        throw new Error('OpenAI API request timed out. Please try with a shorter scenario.');
      } else if (error.code === 'invalid_api_key') {
        throw new Error('Invalid OpenAI API key. Please check your configuration.');
      } else if (error.status === 429) {
        throw new Error('OpenAI API rate limit exceeded. Please try again later.');
      }

      throw new Error(`Failed to parse scenario: ${error.message}`);
    }
  }

  /**
   * Suggest AI behavior parameters based on scenario type
   * @private
   */
  _suggestParametersForScenarioType(scenarioType) {
    const parameterMap = {
      ethical_dilemma: {
        ai_mode: 'challenger',
        complexity: 'escalating',
        narrative_freedom: 0.7,
        duration: 20,
        reasoning: 'Ethical dilemmas benefit from challenging assumptions and exploring consequences'
      },
      crisis_management: {
        ai_mode: 'adaptive',
        complexity: 'escalating',
        narrative_freedom: 0.5,
        duration: 25,
        reasoning: 'Crisis scenarios need adaptive support with structured progression'
      },
      negotiation: {
        ai_mode: 'expert',
        complexity: 'adaptive',
        narrative_freedom: 0.6,
        duration: 30,
        reasoning: 'Negotiations benefit from expert guidance and flexible scenarios'
      },
      strategic_planning: {
        ai_mode: 'coach',
        complexity: 'linear',
        narrative_freedom: 0.8,
        duration: 30,
        reasoning: 'Strategic planning needs supportive guidance with high exploration freedom'
      },
      leadership_challenge: {
        ai_mode: 'challenger',
        complexity: 'escalating',
        narrative_freedom: 0.6,
        duration: 25,
        reasoning: 'Leadership scenarios benefit from being challenged on decisions'
      },
      conflict_resolution: {
        ai_mode: 'coach',
        complexity: 'adaptive',
        narrative_freedom: 0.7,
        duration: 20,
        reasoning: 'Conflict resolution needs supportive coaching with flexibility'
      }
    };

    return parameterMap[scenarioType] || {
      ai_mode: 'adaptive',
      complexity: 'escalating',
      narrative_freedom: 0.6,
      duration: 20,
      reasoning: 'Default balanced approach for general scenarios'
    };
  }

  /**
   * Validate and enhance parsed actors
   * Ensures at least one student role and provides suggestions if missing
   */
  validateActors(actors) {
    const studentRoles = actors.filter(a => a.is_student_role);

    if (studentRoles.length === 0) {
      return {
        valid: false,
        warning: 'No student role identified. Please specify which role the student should play.',
        suggestion: 'The primary decision-maker should typically be the student role.'
      };
    }

    if (studentRoles.length > 1) {
      return {
        valid: false,
        warning: 'Multiple student roles identified. Only one role should be assigned to the student.',
        suggestion: 'Choose the main protagonist or decision-maker as the student role.'
      };
    }

    return { valid: true };
  }
}

export default ScenarioParser;
