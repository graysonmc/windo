/**
 * @fileoverview Parser Agent
 * Extracts structured data from raw scenario input
 */

const BaseAgent = require('./base-agent');

/**
 * @class ParserAgent
 * @extends BaseAgent
 * @description Parses raw scenario text into structured data for downstream agents
 *
 * Responsibilities:
 * - Read 'raw_input' from protocol
 * - Extract actors, context, scenario type, constraints
 * - Write 'parsed_data' to protocol
 * - Use GPT-3.5-turbo for fast, cost-effective extraction
 */
class ParserAgent extends BaseAgent {
  /**
   * Execute parsing task
   * @param {Object} [params] - Optional parameters (not used, reads from protocol)
   * @returns {Promise<Object>} Parsed data structure
   */
  async execute(params = {}) {
    // Read raw input from protocol
    const rawInput = await this.read('raw_input');
    if (!rawInput) {
      throw new Error('ParserAgent: No raw_input found in protocol');
    }

    // Parse the input
    const parsedData = await this.parseScenario(rawInput);

    // Write parsed data to protocol
    await this.write('parsed_data', parsedData);

    // Broadcast event
    await this.broadcast('parsing_complete', {
      actorCount: parsedData.actors?.length || 0,
      scenarioType: parsedData.scenario_type
    });

    return parsedData;
  }

  /**
   * Parse scenario text into structured data
   * @param {string} rawInput - Raw scenario text
   * @returns {Promise<Object>} Parsed data
   */
  async parseScenario(rawInput) {
    const prompt = this.buildParserPrompt(rawInput);

    const response = await this.llmCompleteJSON(
      [
        {
          role: 'system',
          content: 'You are a business scenario parser. Extract structured information from scenario descriptions. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      'gpt-3.5-turbo' // Fast and cheap for extraction
    );

    // Validate and normalize response
    return this.validateParsedData(response);
  }

  /**
   * Build parsing prompt
   * @param {string} rawInput - Raw scenario text
   * @returns {string} Prompt for LLM
   */
  buildParserPrompt(rawInput) {
    return `Extract structured information from this business scenario:

---
${rawInput}
---

Extract the following in JSON format:

{
  "scenario_type": "<crisis|negotiation|strategy|operations|leadership|other>",
  "industry": "<specific industry or 'general'>",
  "context": {
    "company_name": "<company name if specified, else 'Not specified'>",
    "situation": "<brief description of the situation>",
    "timeframe": "<time context if specified>",
    "stakes": "<what's at risk or important>"
  },
  "actors": [
    {
      "role": "<job title or role>",
      "name": "<name if specified, else role>",
      "description": "<brief description of their position/relevance>"
    }
  ],
  "constraints": [
    "<any explicit constraints, limitations, or requirements>"
  ],
  "objectives": [
    "<any explicitly stated goals or objectives>"
  ],
  "key_challenges": [
    "<main problems or challenges identified>"
  ]
}

IMPORTANT:
- scenario_type should be one of: crisis, negotiation, strategy, operations, leadership, other
- If information is not explicitly stated, use reasonable inference
- actors array should include all named people or roles
- constraints are hard limits (budget, time, regulations, etc.)
- objectives are explicitly stated goals
- key_challenges are problems that need solving

Return ONLY the JSON object, no additional text.`;
  }

  /**
   * Validate and normalize parsed data
   * @param {Object} data - Raw parsed data from LLM
   * @returns {Object} Validated and normalized data
   */
  validateParsedData(data) {
    // Ensure required fields exist
    const validated = {
      scenario_type: this.validateScenarioType(data.scenario_type),
      industry: data.industry || 'general',
      context: {
        company_name: data.context?.company_name || 'Not specified',
        situation: data.context?.situation || 'No description provided',
        timeframe: data.context?.timeframe || 'Not specified',
        stakes: data.context?.stakes || 'Not specified'
      },
      actors: this.validateActors(data.actors),
      constraints: Array.isArray(data.constraints) ? data.constraints : [],
      objectives: Array.isArray(data.objectives) ? data.objectives : [],
      key_challenges: Array.isArray(data.key_challenges) ? data.key_challenges : []
    };

    return validated;
  }

  /**
   * Validate scenario type
   * @param {string} type - Scenario type from LLM
   * @returns {string} Valid scenario type
   */
  validateScenarioType(type) {
    const validTypes = [
      'crisis',
      'negotiation',
      'strategy',
      'operations',
      'leadership',
      'other'
    ];

    const normalized = (type || 'other').toLowerCase();
    return validTypes.includes(normalized) ? normalized : 'other';
  }

  /**
   * Validate actors array
   * @param {Array} actors - Actors from LLM
   * @returns {Array} Validated actors
   */
  validateActors(actors) {
    if (!Array.isArray(actors)) {
      return [];
    }

    return actors.map(actor => ({
      role: actor.role || 'Unknown role',
      name: actor.name || actor.role || 'Unnamed',
      description: actor.description || 'No description'
    }));
  }

  /**
   * Get summary of parsed data
   * @param {Object} parsedData - Parsed data
   * @returns {string} Human-readable summary
   */
  getSummary(parsedData) {
    return `
Scenario Type: ${parsedData.scenario_type}
Industry: ${parsedData.industry}
Actors: ${parsedData.actors.length}
Constraints: ${parsedData.constraints.length}
Objectives: ${parsedData.objectives.length}
Key Challenges: ${parsedData.key_challenges.length}
    `.trim();
  }
}

module.exports = ParserAgent;
