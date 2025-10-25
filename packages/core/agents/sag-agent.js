/**
 * @fileoverview SAG Agent (Scenario Arc Generator)
 * Generates goal-oriented scenario outlines from parsed data
 */

const BaseAgent = require('./base-agent');

/**
 * @class SAGAgent
 * @extends BaseAgent
 * @description Generates goal-oriented scenario outlines with learning objectives
 *
 * Responsibilities:
 * - Read 'parsed_data' and 'simulation_settings' from protocol
 * - Generate goals, rules, triggers, encounters, lessons
 * - Focus on WHAT to achieve, not HOW (Director handles that)
 * - Avoid rigid sequencing - allow Director agency
 * - Write 'scenario_outline' to protocol
 * - Use GPT-4 for complex reasoning
 */
class SAGAgent extends BaseAgent {
  /**
   * Execute SAG generation task
   * @param {Object} [params] - Optional parameters
   * @returns {Promise<Object>} Scenario outline
   */
  async execute(params = {}) {
    // Read from protocol
    const parsedData = await this.read('parsed_data');
    const settings = await this.read('simulation_settings') || this.getDefaultSettings();

    if (!parsedData) {
      throw new Error('SAGAgent: No parsed_data found in protocol');
    }

    // Generate outline
    const outline = await this.generateOutline(parsedData, settings);

    // Write to protocol
    await this.write('scenario_outline', outline);

    // Broadcast event
    await this.broadcast('outline_ready', {
      goalCount: outline.goals?.length || 0,
      encounterCount: outline.encounters?.length || 0
    });

    return outline;
  }

  /**
   * Generate scenario outline from parsed data
   * @param {Object} parsedData - Parsed scenario data
   * @param {Object} settings - Simulation settings
   * @returns {Promise<Object>} Scenario outline
   */
  async generateOutline(parsedData, settings) {
    const prompt = this.buildSAGPrompt(parsedData, settings);

    const response = await this.llmCompleteJSON(
      [
        {
          role: 'system',
          content: this.getSystemPrompt()
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      'gpt-4' // Complex reasoning required
    );

    // Validate and normalize
    return this.validateOutline(response);
  }

  /**
   * Get SAG system prompt
   * @returns {string} System prompt
   */
  getSystemPrompt() {
    return `You are a Scenario Arc Generator for educational business simulations. Your role is to transform scenario descriptions into goal-oriented learning structures.

PHILOSOPHY:
- Focus on WHAT students should achieve (goals), not HOW they get there
- Avoid rigid sequencing - let the Director adapt based on student progress
- Design for exploration and discovery, not linear paths
- Use Socratic method - challenge thinking, don't give answers
- Create meaningful consequences for decisions

STRUCTURE:
- Goals: Learning objectives framed as business outcomes
- Rules: Constraints and boundaries (budget, time, regulations)
- Triggers: Conditions that unlock new information or events
- Encounters: Key moments/people that test understanding
- Lessons: Core concepts students should discover
- Tests: Ways to measure if goals are achieved

Always respond with valid JSON.`;
  }

  /**
   * Build SAG prompt
   * @param {Object} parsedData - Parsed scenario data
   * @param {Object} settings - Settings
   * @returns {string} Prompt for LLM
   */
  buildSAGPrompt(parsedData, settings) {
    return `Generate a goal-oriented scenario outline for this business simulation:

**Scenario Details:**
Type: ${parsedData.scenario_type}
Industry: ${parsedData.industry}
Situation: ${parsedData.context.situation}
Timeframe: ${parsedData.context.timeframe}
Stakes: ${parsedData.context.stakes}

**Actors:**
${parsedData.actors.map(a => `- ${a.role} (${a.name}): ${a.description}`).join('\n')}

**Constraints:**
${parsedData.constraints.join('\n- ')}

**Stated Objectives:**
${parsedData.objectives.join('\n- ')}

**Key Challenges:**
${parsedData.key_challenges.join('\n- ')}

**Settings:**
- Difficulty: ${settings.difficulty || 'medium'}
- Focus Areas: ${(settings.focus_areas || ['critical thinking', 'decision making']).join(', ')}
- Student Level: ${settings.student_level || 'undergraduate'}

---

Generate a scenario outline with the following structure:

{
  "goals": [
    {
      "id": "<goal_1|goal_2|...>",
      "title": "<Clear goal title>",
      "description": "<What student should achieve>",
      "learning_objective": "<Educational outcome>",
      "success_criteria": [
        "<Observable indicator of success>"
      ],
      "required_evidence": [
        "<What students must demonstrate: e.g. 'Student discusses risk vs reward'>",
        "<What students must consider: e.g. 'Student analyzes stakeholder impact'>"
      ],
      "dependencies": ["<goal_id_that_must_come_first>"] // Empty if no dependencies
    }
  ],
  "rules": [
    {
      "id": "<rule_1|rule_2|...>",
      "type": "<constraint|regulation|budget|time|ethical>",
      "title": "<Rule name>",
      "description": "<What the rule enforces>",
      "violation_consequence": "<What happens if violated>"
    }
  ],
  "triggers": [
    {
      "id": "<trigger_1|trigger_2|...>",
      "title": "<Trigger name>",
      "condition": "<What activates this: goal completion, message count, keywords, etc.>",
      "effect": "<What happens when triggered>",
      "priority": "<high|medium|low>"
    }
  ],
  "encounters": [
    {
      "id": "<encounter_1|encounter_2|...>",
      "actor_role": "<Which actor from scenario>",
      "trigger_condition": "<When this encounter should happen>",
      "purpose": "<Why this encounter matters>",
      "challenge_type": "<ethical_dilemma|technical_problem|interpersonal_conflict|strategic_choice>",
      "socratic_prompts": [
        "<Question that challenges thinking>",
        "<Prompt that reveals complexity>"
      ]
    }
  ],
  "lessons": [
    {
      "id": "<lesson_1|lesson_2|...>",
      "concept": "<Core business/leadership concept>",
      "discovery_path": "<How students should discover this>",
      "related_goals": ["<goal_id>"],
      "misconceptions": [
        "<Common wrong assumptions students might have>"
      ]
    }
  ],
  "tests": [
    {
      "id": "<test_1|test_2|...>",
      "goal_id": "<related_goal>",
      "test_type": "<decision_quality|analysis_depth|consideration_breadth|stakeholder_awareness>",
      "evaluation_criteria": "<How Director evaluates student responses>"
    }
  ]
}

IMPORTANT GUIDELINES:
1. Goals should be OUTCOMES (e.g., "Navigate stakeholder conflict") not tasks (e.g., "Talk to CFO")
2. Required evidence should be THINKING (e.g., "considers trade-offs") not actions (e.g., "sends email")
3. Triggers should activate based on PROGRESS (goals, depth) not just message count
4. Encounters should CHALLENGE, not INSTRUCT
5. Lessons should be DISCOVERED, not told
6. Tests should measure UNDERSTANDING, not just completion
7. Avoid rigid sequencing - use dependencies sparingly
8. Design for ${settings.difficulty || 'medium'} difficulty
9. Focus on ${(settings.focus_areas || ['critical thinking']).join(', ')}

Return ONLY the JSON object, no additional text.`;
  }

  /**
   * Validate and normalize outline
   * @param {Object} outline - Raw outline from LLM
   * @returns {Object} Validated outline
   */
  validateOutline(outline) {
    return {
      goals: this.validateGoals(outline.goals),
      rules: this.validateRules(outline.rules),
      triggers: this.validateTriggers(outline.triggers),
      encounters: this.validateEncounters(outline.encounters),
      lessons: this.validateLessons(outline.lessons),
      tests: this.validateTests(outline.tests),
      metadata: {
        generated_at: Date.now(),
        generator: 'SAGAgent',
        version: '1.0'
      }
    };
  }

  /**
   * Validate goals array
   * @param {Array} goals - Goals from LLM
   * @returns {Array} Validated goals
   */
  validateGoals(goals) {
    if (!Array.isArray(goals)) return [];

    return goals.map((goal, index) => ({
      id: goal.id || `goal_${index + 1}`,
      title: goal.title || 'Untitled Goal',
      description: goal.description || '',
      learning_objective: goal.learning_objective || '',
      success_criteria: Array.isArray(goal.success_criteria) ? goal.success_criteria : [],
      required_evidence: Array.isArray(goal.required_evidence) ? goal.required_evidence : [],
      dependencies: Array.isArray(goal.dependencies) ? goal.dependencies : []
    }));
  }

  /**
   * Validate rules array
   * @param {Array} rules - Rules from LLM
   * @returns {Array} Validated rules
   */
  validateRules(rules) {
    if (!Array.isArray(rules)) return [];

    return rules.map((rule, index) => ({
      id: rule.id || `rule_${index + 1}`,
      type: rule.type || 'constraint',
      title: rule.title || 'Untitled Rule',
      description: rule.description || '',
      violation_consequence: rule.violation_consequence || 'Unspecified'
    }));
  }

  /**
   * Validate triggers array
   * @param {Array} triggers - Triggers from LLM
   * @returns {Array} Validated triggers
   */
  validateTriggers(triggers) {
    if (!Array.isArray(triggers)) return [];

    return triggers.map((trigger, index) => ({
      id: trigger.id || `trigger_${index + 1}`,
      title: trigger.title || 'Untitled Trigger',
      condition: trigger.condition || '',
      effect: trigger.effect || '',
      priority: trigger.priority || 'medium'
    }));
  }

  /**
   * Validate encounters array
   * @param {Array} encounters - Encounters from LLM
   * @returns {Array} Validated encounters
   */
  validateEncounters(encounters) {
    if (!Array.isArray(encounters)) return [];

    return encounters.map((encounter, index) => ({
      id: encounter.id || `encounter_${index + 1}`,
      actor_role: encounter.actor_role || 'Unknown',
      trigger_condition: encounter.trigger_condition || '',
      purpose: encounter.purpose || '',
      challenge_type: encounter.challenge_type || 'strategic_choice',
      socratic_prompts: Array.isArray(encounter.socratic_prompts) ? encounter.socratic_prompts : []
    }));
  }

  /**
   * Validate lessons array
   * @param {Array} lessons - Lessons from LLM
   * @returns {Array} Validated lessons
   */
  validateLessons(lessons) {
    if (!Array.isArray(lessons)) return [];

    return lessons.map((lesson, index) => ({
      id: lesson.id || `lesson_${index + 1}`,
      concept: lesson.concept || '',
      discovery_path: lesson.discovery_path || '',
      related_goals: Array.isArray(lesson.related_goals) ? lesson.related_goals : [],
      misconceptions: Array.isArray(lesson.misconceptions) ? lesson.misconceptions : []
    }));
  }

  /**
   * Validate tests array
   * @param {Array} tests - Tests from LLM
   * @returns {Array} Validated tests
   */
  validateTests(tests) {
    if (!Array.isArray(tests)) return [];

    return tests.map((test, index) => ({
      id: test.id || `test_${index + 1}`,
      goal_id: test.goal_id || '',
      test_type: test.test_type || 'decision_quality',
      evaluation_criteria: test.evaluation_criteria || ''
    }));
  }

  /**
   * Get default simulation settings
   * @returns {Object} Default settings
   */
  getDefaultSettings() {
    return {
      difficulty: 'medium',
      focus_areas: ['critical thinking', 'decision making'],
      student_level: 'undergraduate',
      socratic_intensity: 'moderate'
    };
  }

  /**
   * Get summary of outline
   * @param {Object} outline - Scenario outline
   * @returns {string} Summary
   */
  getSummary(outline) {
    return `
Goals: ${outline.goals?.length || 0}
Rules: ${outline.rules?.length || 0}
Triggers: ${outline.triggers?.length || 0}
Encounters: ${outline.encounters?.length || 0}
Lessons: ${outline.lessons?.length || 0}
Tests: ${outline.tests?.length || 0}
    `.trim();
  }
}

module.exports = SAGAgent;
