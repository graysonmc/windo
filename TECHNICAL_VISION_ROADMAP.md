# WINDO TECHNICAL VISION ROADMAP
## Complete Architecture Evolution: From MVP to Revolutionary Platform

**Version:** 1.0
**Date:** October 2024
**Status:** Strategic Blueprint
**Horizon:** 24 Months

---

## Executive Summary

This roadmap details Windo's evolution from current MVP to a revolutionary AI-powered work simulation platform. It incorporates MCP (Model Context Protocol) architecture, NSM (Narrative State Machine), collaborative artifacts, individual AI agents, and unified simulation universes. Each phase builds on previous work with zero throwaway code.

### Core Design Principles
1. **Protocol-First Architecture**: All components speak through defined protocols from day 1
2. **Progressive Enhancement**: Simple implementations evolve to complex without changing interfaces
3. **Modular Composition**: Every component is plug-and-play replaceable
4. **Interface Segregation**: Components only know what they need
5. **Clean Break Over Compatibility**: Prioritize clean architecture over legacy support; Phase 0 serves as reference implementation for MCP refactor
6. **Test-Driven Development**: Protocol-based architecture enables comprehensive testing
7. **Zero Throwaway Code**: Everything built is foundation for future

---

## 📊 Phase 0: Foundation [COMPLETE] ✅
**Timeline:** Complete
**Investment:** Complete
**Status:** Production Ready

### Achievements
- Modular architecture with clean separation
- Actor/Director split implementation
- Translation service with validation
- Shared contracts with Zod schemas
- API router refactoring (41% code reduction)
- Director prototype in observation mode

### Architecture State
```
┌─────────────────┐
│   Web UI        │
└────────┬────────┘
         │ REST
┌────────▼────────┐
│  API Server     │
│  (Modular)      │
└────────┬────────┘
         │
    ┌────▼────┐
    │   DB    │
    └─────────┘

Components:
- actor-module.js (600 lines)
- director-prototype.js (248 lines)
- translation-service.js (296 lines)
- shared-contracts/ (418 lines)
```

### Transition to MCP Architecture
**Decision:** Clean break refactor to MCP protocol-based architecture

**Rationale:**
- Phase 0 demonstrated value of modular separation (Actor/Director)
- MCP enables fresh-context agents and protocol-based communication
- Clean break allows proper MCP implementation without compromise
- Phase 0 code archived as reference, not maintained alongside MCP

**Phase 0 Becomes:**
- Reference implementation for agent behavior
- Validation that Actor/Director pattern works
- Foundation for understanding requirements
- Code archived in `/packages/archive/` for reference

---

## 🔄 Architecture Transition: Phase 0 → Stage 1

### Clean Break Approach

**What This Means:**
- Phase 0 code moves to `/packages/archive/` as reference
- No backwards compatibility layers built
- New MCP architecture built from protocol-first principles
- Phase 0 validates patterns (Actor/Director); MCP implements them cleanly

**Migration Strategy:**

```javascript
// Phase 0 (Direct calls)
const engine = new SimulationEngine();
const response = await engine.processMessage(...);

// Stage 1 (MCP protocol)
const mcp = new MCPProtocol();
const actorAgent = new ActorAgent(mcp);
const response = await actorAgent.process(...);
```

**Why Clean Break:**
1. **Fresh Agent Contexts** - Each agent gets isolated GPT context (no pollution)
2. **Protocol Purity** - No compromises to fit old patterns
3. **Faster Development** - No time spent on compatibility layers
4. **Clear Architecture** - One way to do things, not two
5. **End-to-End Testing** - Forces validation of complete pipeline

**What We Keep:**
- ✅ Actor/Director dual-layer pattern (core NSM design)
- ✅ Shared contracts and schemas (Zod validation)
- ✅ Database schema and tables
- ✅ Web UI (connects to new MCP endpoints)
- ✅ Core business logic and prompts

**What Gets Rebuilt:**
- 🔄 Communication layer (direct calls → MCP protocol)
- 🔄 Agent isolation (monolithic → isolated with fresh contexts)
- 🔄 API endpoints (REST → MCP-aware REST)
- 🔄 Data flow (database reads → MCP protocol reads)

**Timeline:**
- Week 1: Archive Phase 0, build MCP core
- Week 2: Build first agents (Parser, SAG)
- Week 3: Build runtime agents (Director, Actor)
- Week 4: End-to-end testing and validation

---

## 🚀 Stage 1: Protocol Foundation & Basic Intelligence
**Timeline:** Weeks 1-4
**Investment:** 2 engineers
**Goal:** Implement MCP protocol-first architecture with clean break from Phase 0

### Week 1-2: Protocol Layer Introduction

#### Implementation
```javascript
// New Protocol Structure
packages/
├── core/
│   ├── protocol/
│   │   ├── interfaces/
│   │   │   └── mcp-protocol.interface.ts    // Core contract (never changes)
│   │   ├── implementations/
│   │   │   ├── mcp-v1-simple.ts            // Week 1: Basic read/write
│   │   │   └── mcp-v2-permissions.ts       // Week 3: Add permissions
│   │   └── index.ts
│   │
│   ├── agents/                             // NEW: MCP-based agents
│   │   ├── base-agent.ts                   // All agents extend this
│   │   ├── parser-agent.ts                 // Fresh context parser
│   │   ├── sag-agent.ts                    // NEW: Goal extraction
│   │   └── director-agent.ts               // Fresh context director
│   │
│   └── archive/                            // Phase 0 reference code
│       ├── actor-module.js                 // Reference for Actor Agent
│       └── director-prototype.js           // Reference for Director Agent
```

#### Protocol Interface (Permanent Contract)
```typescript
interface IMCPProtocol {
  // Core Operations (Week 1)
  read(key: string): Promise<any>;
  write(key: string, value: any): Promise<void>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;

  // Agent Communication (Week 2)
  call(agent: string, tool: string, params: any): Promise<any>;
  broadcast(event: string, data: any): Promise<void>;

  // Permissions (Week 3)
  checkPermission?(agent: string, action: string, resource: string): Promise<boolean>;
  grantPermission?(agent: string, permission: Permission): Promise<void>;

  // Events & Subscriptions (Week 4)
  subscribe?(event: string, handler: EventHandler): Unsubscribe;
  emit?(event: string, data: any): Promise<void>;

  // Artifacts (Stage 2)
  createArtifact?(type: string, initial: any): Promise<ArtifactHandle>;
  editArtifact?(id: string, changes: any): Promise<Version>;
}
```

#### Phase-Based Permissions & Progressive Enrichment

The MCP protocol enforces different permissions based on the current phase, creating an immutable audit trail:

```javascript
class MCPProtocolV1 {
  constructor() {
    this.phase = 'building';  // building → reviewing → finalized → runtime
    this.data = {};
    this.auditLog = [];

    // Define phase-based permissions
    this.phasePermissions = {
      building: {
        parser: { reads: ['raw_input'], writes: ['parsed_data'], preserves: ['raw_input'] },
        sag: { reads: ['parsed_data'], writes: ['scenario_outline'], preserves: ['parsed_data'] },
        autoTuner: { reads: ['*'], writes: ['proposed_settings'], preserves: ['scenario_outline'] },
        validator: { reads: ['*'], writes: ['validation_warnings'], preserves: ['*'] }  // Can't modify data
      },
      reviewing: {
        user: { reads: ['*'], writes: ['user_modifications'], preserves: ['*'] },
        recalibrator: { reads: ['*'], writes: ['recalibrated_settings'], preserves: ['proposed_settings'] }
      },
      finalized: {
        finalizer: { reads: ['*'], writes: ['simulation_blueprint'], preserves: ['*'] },
        '*': { reads: ['simulation_blueprint'], writes: [], preserves: ['*'] }  // Read-only after finalize
      },
      runtime: {
        director: { reads: ['simulation_blueprint'], writes: ['director_state'], preserves: ['*'] },
        actor: { reads: ['simulation_blueprint', 'director_state'], writes: ['responses'], preserves: ['*'] }
      }
    };
  }

  async write(key, value, agentId) {
    // Check phase-based permission
    const permissions = this.phasePermissions[this.phase][agentId];
    if (!permissions?.writes?.includes(key) && !permissions?.writes?.includes('*')) {
      throw new Error(`Agent ${agentId} cannot write ${key} in phase ${this.phase}`);
    }

    // Progressive enrichment - preserve previous values
    if (permissions.preserves?.includes(key) || permissions.preserves?.includes('*')) {
      // Store as new version, don't overwrite
      this.data[`${key}_v${Date.now()}`] = value;
      this.data[`${key}_latest`] = value;
    } else {
      this.data[key] = value;
    }

    // Audit log for perfect traceability
    this.auditLog.push({
      timestamp: Date.now(),
      phase: this.phase,
      agent: agentId,
      action: 'write',
      key,
      value_hash: this.hash(value)
    });
  }

  async transitionPhase(newPhase) {
    // Phase transitions are one-way
    const validTransitions = {
      building: ['reviewing'],
      reviewing: ['finalized'],
      finalized: ['runtime'],
      runtime: []  // Terminal phase
    };

    if (!validTransitions[this.phase].includes(newPhase)) {
      throw new Error(`Cannot transition from ${this.phase} to ${newPhase}`);
    }

    this.phase = newPhase;
    this.auditLog.push({
      timestamp: Date.now(),
      action: 'phase_transition',
      from: this.phase,
      to: newPhase
    });
  }
}
```

**Progressive Enrichment Benefits:**
- **Immutable History**: Every change is versioned, nothing is lost
- **Perfect Debugging**: Can replay exact sequence of transformations
- **Security**: Agents can't corrupt earlier work
- **Auditability**: Complete trail of who changed what and when

#### Cost-Optimized Agent Routing

The MCP protocol intelligently routes tasks to appropriate AI models based on complexity and cost:

```javascript
class CostOptimizedMCPRouter {
  constructor() {
    // Model configurations with cost per 1K tokens
    this.models = {
      'gpt-4': {
        cost: 0.03,
        capabilities: ['complex_reasoning', 'creativity', 'nuance'],
        contextLimit: 128000,
        bestFor: ['sag_generation', 'director_decisions', 'complex_analysis']
      },
      'gpt-4-turbo': {
        cost: 0.01,
        capabilities: ['reasoning', 'speed', 'large_context'],
        contextLimit: 128000,
        bestFor: ['outline_generation', 'actor_responses', 'document_analysis']
      },
      'gpt-3.5-turbo': {
        cost: 0.0015,
        capabilities: ['basic_reasoning', 'classification', 'extraction'],
        contextLimit: 16000,
        bestFor: ['parsing', 'validation', 'simple_classification', 'swarm_behavior']
      },
      'gpt-3.5-turbo-instruct': {
        cost: 0.0015,
        capabilities: ['completion', 'simple_tasks'],
        contextLimit: 4000,
        bestFor: ['keyword_extraction', 'formatting', 'simple_validation']
      }
    };

    // Track costs
    this.costTracking = {
      session: {},
      daily: {},
      monthly: {}
    };
  }

  async routeToOptimalModel(task: Task, context: any): Promise<Response> {
    // Analyze task requirements
    const requirements = this.analyzeTaskRequirements(task);

    // Select optimal model
    const model = this.selectModel(requirements);

    // Optimize context if needed
    const optimizedContext = await this.optimizeContext(context, model);

    // Execute with selected model
    const response = await this.executeWithModel(model, task, optimizedContext);

    // Track costs
    this.trackCost(model, task, optimizedContext);

    return response;
  }

  analyzeTaskRequirements(task: Task) {
    const requirements = {
      complexity: 'low',
      contextSize: 0,
      creativity: false,
      precision: false,
      speed: 'normal'
    };

    // Task-based routing rules
    switch (task.type) {
      case 'sag_generation':
        requirements.complexity = 'high';
        requirements.creativity = true;
        requirements.precision = true;
        break;

      case 'parsing':
        requirements.complexity = 'low';
        requirements.speed = 'fast';
        break;

      case 'actor_response':
        requirements.complexity = 'medium';
        requirements.creativity = true;
        break;

      case 'validation':
        requirements.complexity = 'low';
        requirements.precision = true;
        requirements.speed = 'fast';
        break;

      case 'swarm_behavior':
        requirements.complexity = 'low';
        requirements.speed = 'fast';
        break;

      case 'director_analysis':
        requirements.complexity = 'high';
        requirements.precision = true;
        break;
    }

    requirements.contextSize = JSON.stringify(task.context).length;
    return requirements;
  }

  selectModel(requirements: Requirements): string {
    // Decision tree for model selection
    if (requirements.complexity === 'high' && requirements.creativity) {
      return 'gpt-4';
    }

    if (requirements.complexity === 'high' && requirements.precision) {
      return 'gpt-4-turbo';
    }

    if (requirements.complexity === 'medium') {
      // Balance cost and capability
      if (requirements.contextSize > 8000) {
        return 'gpt-4-turbo';  // Better context handling
      }
      return 'gpt-3.5-turbo';
    }

    if (requirements.complexity === 'low' && requirements.speed === 'fast') {
      return 'gpt-3.5-turbo';
    }

    // Default fallback
    return 'gpt-3.5-turbo';
  }

  async optimizeContext(context: any, model: string): Promise<any> {
    const modelConfig = this.models[model];
    const contextString = JSON.stringify(context);

    // If context fits, return as is
    if (contextString.length < modelConfig.contextLimit * 0.8) {
      return context;
    }

    // Otherwise, intelligently compress
    return await this.compressContext(context, modelConfig.contextLimit);
  }

  async compressContext(context: any, limit: number): Promise<any> {
    // Smart compression strategies
    const strategies = {
      // Remove redundant data
      deduplication: () => this.removeDuplicates(context),

      // Summarize verbose sections
      summarization: async () => await this.summarizeLongSections(context),

      // Keep only relevant history
      truncation: () => this.truncateHistory(context, limit * 0.5),

      // Extract key points only
      extraction: () => this.extractKeyPoints(context)
    };

    // Apply strategies in order until context fits
    let compressed = context;
    for (const [name, strategy] of Object.entries(strategies)) {
      compressed = await strategy(compressed);
      if (JSON.stringify(compressed).length < limit * 0.8) {
        break;
      }
    }

    return compressed;
  }

  trackCost(model: string, task: Task, context: any) {
    const tokens = this.estimateTokens(context);
    const cost = (tokens / 1000) * this.models[model].cost;

    // Track by session
    if (!this.costTracking.session[task.sessionId]) {
      this.costTracking.session[task.sessionId] = 0;
    }
    this.costTracking.session[task.sessionId] += cost;

    // Track daily
    const today = new Date().toDateString();
    if (!this.costTracking.daily[today]) {
      this.costTracking.daily[today] = 0;
    }
    this.costTracking.daily[today] += cost;

    // Alert if costs exceed thresholds
    if (this.costTracking.session[task.sessionId] > 10) {
      console.warn(`Session ${task.sessionId} exceeds $10 in AI costs`);
    }
  }

  estimateTokens(context: any): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(JSON.stringify(context).length / 4);
  }

  async getCostReport(): Promise<CostReport> {
    return {
      sessions: this.costTracking.session,
      daily: this.costTracking.daily,
      monthly: this.costTracking.monthly,
      projectedMonthlyCost: this.projectMonthlyCost(),
      recommendations: await this.generateCostRecommendations()
    };
  }

  async generateCostRecommendations(): Promise<string[]> {
    const recommendations = [];

    // Analyze usage patterns
    const avgSessionCost = this.calculateAverageSessionCost();

    if (avgSessionCost > 5) {
      recommendations.push('Consider caching Director decisions for similar scenarios');
      recommendations.push('Implement response caching for common student queries');
    }

    if (this.getModelUsage('gpt-4') > 0.5) {
      recommendations.push('Review if all GPT-4 usage is necessary');
      recommendations.push('Consider GPT-4-turbo for large context tasks');
    }

    return recommendations;
  }
}
```

**Cost Optimization Benefits:**
- **80% Cost Reduction**: Use cheaper models where appropriate
- **Intelligent Routing**: Match task complexity to model capability
- **Context Optimization**: Compress intelligently when needed
- **Cost Tracking**: Monitor and alert on spending
- **Scalability**: Enable profitable unit economics at scale

### Week 3-4: SAG 2.0 Implementation & Basic Artifacts

#### SAG 2.0: Goal-Oriented Outline Architecture

**Philosophy:**
SAG 2.0 generates flexible "goal-oriented outlines" - toolkits of objectives, rules, triggers, encounters, and tests - NOT rigid sequential phases. This enables:
- **Bounded Agency**: NSM Director structures narrative dynamically while staying within outline goals
- **Progress-Based Adaptation**: Flow emerges from student actions, not predetermined sequences
- **Flexible Achievement**: Multiple paths to same learning objectives

**Output Structure:**
```javascript
{
  goals: [
    {
      id: 'goal_1',
      description: 'Understand supply chain tradeoffs',
      priority: 1,
      required: true,
      success_criteria: {
        required_evidence: [
          'Student discusses cost vs speed',
          'Student references risk frameworks',
          'Student considers alternatives'
        ],
        minimum_depth: 'Must articulate reasoning with 2+ supporting points',
        assessment_method: 'llm_analysis',  // or 'keyword_match', 'manual_review'
        partial_credit: true
      },
      progress_tracking: {
        milestones: [
          { at: 0.2, indicator: 'Acknowledges time pressure' },
          { at: 0.5, indicator: 'Proposes mitigation strategy' },
          { at: 1.0, indicator: 'Defends strategy under challenge' }
        ],
        measurement: 'progress_llm_scoring'  // or 'keyword_detection', 'manual'
      },
      tests: [
        {
          type: 'decision_point',  // or 'reflection_question', 'scenario_response'
          description: 'Choose between fast/expensive vs slow/cheap',
          evidence_of_learning: 'Justifies with trade-off analysis'
        }
      ]
    }
  ],
  rules: [
    'Maintain Socratic questioning; never reveal final answer',
    'Reference source document for factual claims'
  ],
  encounters: [
    {
      id: 'encounter_inventory_crisis',
      description: 'Unexpected demand spike strains inventory',
      related_goals: ['goal_1'],
      escalation: 'moderate'  // low, moderate, high
    }
  ],
  lessons: [
    {
      id: 'lesson_agility',
      key_points: ['Speed vs cost trade-off', 'Supplier diversification'],
      evidence_of_coverage: 'Student references at least one mitigation tactic'
    }
  ],
  actor_triggers: [
    {
      actor: 'CEO',
      type: 'keyword',  // or 'sentiment', 'progress', 'message_count', 'time_elapsed'
      condition: 'cost',
      action: 'Express concern about margins',
      priority: 2
    }
  ],
  director_triggers: [
    {
      name: 'student_stuck',
      condition: 'three_similar_messages && progress.goal_1 < 0.1',
      director_action: 'Introduce encounter_inventory_crisis',
      urgency: 'high'  // low, medium, high
    }
  ],
  suggested_structure: {
    beginning: {
      suggested_duration: { messages: 10, progress: 0.2 },
      goals_to_introduce: ['goal_1'],
      tone: 'exploratory',
      avoid: ['forcing commitments']
    },
    middle: {
      suggested_duration: { progress: 0.7 },
      goals_to_test: ['goal_1'],
      escalation: 'Introduce encounters',
      tone: 'challenging'
    },
    end: {
      triggered_by: ['progress >= 0.8', 'message_count >= 25'],
      goals_to_conclude: ['goal_1'],
      include_tests: ['test_risk_tolerance'],
      tone: 'decisive'
    },
    flexibility_note: 'Director may reorder segments if student leads with solution'
  },
  adaptation_constraints: {
    can_do: [
      'Reorder encounters',
      'Extend/shorten phases within ±30% duration',
      'Adjust actor tone within configured ranges',
      'Introduce optional goals when student excels'
    ],
    cannot_do: [
      'Skip required goals',
      'Invent new encounters not listed',
      'Change learning objectives',
      'Switch AI mode outside permitted spectrum',
      'Exceed max_session_duration'
    ],
    if_student_completely_lost: {
      threshold: 'progress.goal_1 < 0.05 && message_count >= 20',
      action: 'Pause, offer hint path or restart suggestion'
    }
  }
}
```

#### SAG Agent Implementation
```javascript
class SAGAgent extends BaseAgent {
  async execute(): Promise<ScenarioOutline> {
    // Read from protocol (not database)
    const parsedData = await this.protocol.read('parsed_data');
    const settings = await this.protocol.read('simulation_settings');

    // Generate goal-oriented outline (NOT sequential phases)
    const outline = await this.generateGoalOrientedOutline(parsedData, settings);

    // Write to protocol (not database)
    await this.protocol.write('scenario_outline', outline);

    // Notify other agents
    await this.protocol.broadcast('outline_ready', { id: outline.id });

    return outline;
  }

  async generateGoalOrientedOutline(parsedData, settings) {
    const prompt = `Generate goal-oriented outline from parsed data.
    Focus on WHAT to achieve (goals, rules, triggers, encounters, lessons, tests).
    Avoid rigid sequencing unless explicit dependencies exist.
    Allow Director agency to structure narrative based on progress.`;

    const response = await this.llm.complete({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: JSON.stringify({ parsedData, settings }) }
      ],
      response_format: { type: 'json_schema', json_schema: OutlineSchema }
    });

    return JSON.parse(response.content);
  }
}
```

#### Simulation Builder Pipeline & Auto-Tuning

**Complete Builder Workflow:**

The Builder guides professors through a structured creation process with AI assistance at each step:

**Step 1: Intake & Input Collection**
```javascript
// Guided text prompt mode (default)
{
  goals: 'What are the learning objectives?',
  scenario: 'Describe the business situation...',
  thoughts: 'Share any initial ideas...',
  documents: [] // Optional uploads
}

// Optional: Chat-based elicitation
// AI asks questions, compiles responses to text
// Then auto-parses into structured input
```

**Step 2: Parsing & Extraction**
```javascript
class ParserAgent {
  async parse(rawInput) {
    // Extract explicit elements
    const explicit = {
      objectives: extractObjectives(rawInput),
      actors: extractActors(rawInput),
      conflicts: extractConflicts(rawInput)
    };

    // Infer missing elements
    const inferred = await this.inferElements(explicit, rawInput);

    return {
      parsed_data: { ...explicit, ...inferred },
      raw_text: rawInput.text, // Preserve original
      confidence_scores: this.calculateConfidence(explicit, inferred)
    };
  }
}
```

**Step 2.5: Conditional Pipeline Routing**

Based on scenario type, route through specialized processing pipelines:

```javascript
class ConditionalPipelineRouter {
  constructor(protocol: IMCPProtocol) {
    this.protocol = protocol;

    // Domain-specific pipeline configurations
    this.pipelines = {
      'crisis_management': {
        parser: 'CrisisParserAgent',
        sag: 'CrisisSAGAgent',
        features: ['time_pressure', 'stakeholder_matrix', 'damage_control'],
        defaultIntensity: 'assertive'
      },
      'negotiation': {
        parser: 'NegotiationParserAgent',
        sag: 'NegotiationSAGAgent',
        features: ['batna', 'interests_positions', 'power_dynamics'],
        defaultIntensity: 'assist'
      },
      'financial_analysis': {
        parser: 'FinancialParserAgent',
        sag: 'FinancialSAGAgent',
        features: ['metrics_tracking', 'scenario_modeling', 'risk_assessment'],
        defaultIntensity: 'off'  // More sandbox-like
      },
      'leadership_development': {
        parser: 'LeadershipParserAgent',
        sag: 'LeadershipSAGAgent',
        features: ['personality_conflicts', 'team_dynamics', 'coaching_moments'],
        defaultIntensity: 'assist'
      },
      'default': {
        parser: 'GeneralParserAgent',
        sag: 'GeneralSAGAgent',
        features: ['adaptive'],
        defaultIntensity: 'assist'
      }
    };
  }

  async routeScenario(rawInput: RawInput): Promise<ProcessedScenario> {
    // Detect scenario type using lightweight classification
    const scenarioType = await this.classifyScenario(rawInput);

    // Select appropriate pipeline
    const pipeline = this.pipelines[scenarioType] || this.pipelines.default;

    // Route through specialized agents
    const parsedData = await this.protocol.call(pipeline.parser, 'parse', {
      input: rawInput,
      features: pipeline.features
    });

    // Specialized SAG for this domain
    const outline = await this.protocol.call(pipeline.sag, 'generate', {
      parsed: parsedData,
      domainFeatures: pipeline.features,
      defaultSettings: {
        intensity: pipeline.defaultIntensity,
        domainSpecific: this.getDomainSettings(scenarioType)
      }
    });

    return {
      scenarioType,
      parsedData,
      outline,
      pipeline: pipeline.name,
      domainFeatures: pipeline.features
    };
  }

  async classifyScenario(input: RawInput): Promise<string> {
    // Lightweight classification using keywords and patterns
    const indicators = {
      crisis_management: ['crisis', 'emergency', 'urgent', 'damage', 'scandal'],
      negotiation: ['negotiate', 'deal', 'terms', 'agreement', 'compromise'],
      financial_analysis: ['ROI', 'NPV', 'budget', 'forecast', 'valuation'],
      leadership_development: ['team', 'leadership', 'culture', 'motivation']
    };

    // Score each type
    const scores = {};
    for (const [type, keywords] of Object.entries(indicators)) {
      scores[type] = keywords.filter(k =>
        input.text.toLowerCase().includes(k.toLowerCase())
      ).length;
    }

    // Return highest scoring type or default
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) return 'default';

    return Object.entries(scores)
      .find(([type, score]) => score === maxScore)[0];
  }

  getDomainSettings(scenarioType: string) {
    // Domain-specific default settings
    const settings = {
      crisis_management: {
        time_pressure: 'high',
        information_flow: 'rapid',
        decision_reversibility: 'low',
        stakeholder_complexity: 'high'
      },
      negotiation: {
        information_asymmetry: 'high',
        relationship_importance: 'variable',
        outcome_flexibility: 'high',
        power_dynamics: 'explicit'
      },
      financial_analysis: {
        data_precision: 'high',
        analytical_depth: 'deep',
        scenario_branching: 'multiple',
        quantitative_focus: 'primary'
      },
      leadership_development: {
        emotional_intelligence: 'high',
        feedback_frequency: 'continuous',
        reflection_prompts: 'frequent',
        growth_mindset: 'emphasized'
      }
    };

    return settings[scenarioType] || {};
  }
}
```

**Specialized Agent Examples:**

```javascript
class CrisisSAGAgent extends SAGAgent {
  async generateOutline(parsed, settings) {
    // Crisis-specific outline generation
    const outline = await super.generateOutline(parsed, settings);

    // Add crisis-specific elements
    outline.escalation_timeline = this.generateEscalationPath(parsed);
    outline.pressure_points = this.identifyPressurePoints(parsed);
    outline.media_events = this.planMediaInterventions(parsed);
    outline.stakeholder_management = this.mapStakeholderReactions(parsed);

    return outline;
  }
}

class NegotiationSAGAgent extends SAGAgent {
  async generateOutline(parsed, settings) {
    const outline = await super.generateOutline(parsed, settings);

    // Negotiation-specific elements
    outline.batna_revelation = this.planBATNAStrategy(parsed);
    outline.concession_ladder = this.buildConcessionSequence(parsed);
    outline.deadlock_scenarios = this.createDeadlockBreakers(parsed);
    outline.trust_building = this.designTrustMoments(parsed);

    return outline;
  }
}
```

**Conditional Pipeline Benefits:**
- **Domain Expertise**: Specialized agents for different scenario types
- **Better Defaults**: Appropriate settings for each domain
- **Richer Features**: Domain-specific elements automatically included
- **Quality Improvement**: Each pipeline optimized for its use case

**Step 3: SAG Generation (as described above)**

**Step 4: Auto-Tuning**

Auto-tuning runs POST-SAG to infer optimal settings:

```javascript
class AutoTuningAgent {
  async tuneSettings(outline, parsedData) {
    const prompt = `
      Analyze this scenario outline and recommend settings.

      Outline: ${JSON.stringify(outline)}
      Parsed Data: ${JSON.stringify(parsedData)}

      Recommend:
      - Director intensity (off/assist/assertive)
      - Evaluation cadence (message_interval)
      - Adaptation flexibility (0-1)
      - Complexity level (simple/escalating/complex)
      - Actor personality ranges

      Provide reasoning for each recommendation.
    `;

    const recommendations = await this.llm.complete({
      model: 'gpt-4',
      messages: [{ role: 'system', content: prompt }],
      response_format: { type: 'json_object' }
    });

    return {
      director_settings: {
        intensity: recommendations.intensity,
        evaluation_cadence: {
          message_interval: recommendations.cadence,
          event_triggers: this.inferTriggers(outline)
        },
        adaptation_flexibility: recommendations.flexibility
      },
      actor_configs: recommendations.actor_personalities,
      reasoning: recommendations.explanations
    };
  }
}
```

**Step 5: Review & Edit with Intelligent Recalibration**

When professor edits settings, the system intelligently recalibrates related parameters:

```javascript
async handleUserEdit(field, newValue) {
  // Update state
  this.state[field] = newValue;

  // Trigger intelligent recalibration
  const recalibrated = await this.recalibratorAgent.recalibrate(
    this.state,
    { field, newValue }
  );

  this.setState(recalibrated);
}
```

**Recalibrator Agent - Intelligent Setting Coherence**

The Recalibrator ensures all settings remain coherent when professors make changes:

```javascript
class RecalibratorAgent extends BaseAgent {
  async recalibrate(currentState, userChange) {
    // Analyze impact of user change
    const impact = this.analyzeImpact(userChange);

    // Smart recalibration based on change type
    if (userChange.field === 'director_settings.intensity') {
      return this.recalibrateForIntensity(currentState, userChange.newValue);
    }

    if (userChange.field === 'narrative_freedom') {
      return this.recalibrateForFreedom(currentState, userChange.newValue);
    }

    // Default: regenerate dependent structures
    return this.recalibrateDefault(currentState, userChange);
  }

  async recalibrateForIntensity(state, newIntensity) {
    // When user changes intensity, adjust related settings coherently
    const adjustments = {
      ...state,
      director_settings: {
        ...state.director_settings,
        intensity: newIntensity
      }
    };

    // Intensity ripple effects
    if (newIntensity === 'assertive') {
      // Assertive Director needs more frequent evaluation
      adjustments.director_settings.evaluation_cadence = {
        ...adjustments.director_settings.evaluation_cadence,
        message_interval: 3  // More frequent checking
      };

      // Actors become more challenging
      adjustments.actors = state.actors.map(actor => ({
        ...actor,
        personality_traits: {
          ...actor.personality_traits,
          aggressive_passive: Math.min(100, actor.personality_traits.aggressive_passive + 15),
          patient_impatient: Math.max(0, actor.personality_traits.patient_impatient - 20)
        }
      }));

      // Adaptation flexibility increases
      adjustments.adaptation_flexibility = Math.min(1, state.adaptation_flexibility + 0.2);

    } else if (newIntensity === 'assist') {
      // Assist mode: gentler settings
      adjustments.director_settings.evaluation_cadence.message_interval = 7;

      adjustments.actors = state.actors.map(actor => ({
        ...actor,
        personality_traits: {
          ...actor.personality_traits,
          cooperative_antagonistic: Math.min(100, actor.personality_traits.cooperative_antagonistic + 20)
        }
      }));
    }

    // Re-run SAG with new settings for coherent outline
    const updatedOutline = await this.protocol.call('sag', 'regenerate', {
      parsed_data: state.parsed_data,
      settings: adjustments.director_settings
    });

    adjustments.scenario_outline = updatedOutline;

    // Log recalibration for transparency
    adjustments.recalibration_log = {
      user_change: `intensity → ${newIntensity}`,
      automatic_adjustments: {
        evaluation_cadence: adjustments.director_settings.evaluation_cadence.message_interval,
        actor_personalities: 'adjusted',
        outline: 'regenerated'
      },
      reasoning: this.generateReasoning(newIntensity)
    };

    return adjustments;
  }

  async recalibrateForFreedom(state, narrativeFreedom) {
    // Narrative freedom affects multiple aspects
    const adjustments = { ...state, narrative_freedom: narrativeFreedom };

    if (narrativeFreedom > 0.8) {
      // High freedom: loosen constraints
      adjustments.adaptation_constraints = {
        ...state.adaptation_constraints,
        can_do: [
          ...state.adaptation_constraints.can_do,
          'Introduce improvised encounters',
          'Significantly extend conversation phases'
        ]
      };

      // Director gets more creative
      adjustments.director_settings.adaptation_flexibility = Math.min(1, narrativeFreedom);

    } else if (narrativeFreedom < 0.3) {
      // Low freedom: tighten to script
      adjustments.adaptation_constraints = {
        ...state.adaptation_constraints,
        cannot_do: [
          ...state.adaptation_constraints.cannot_do,
          'Deviate from suggested structure',
          'Introduce unplanned elements'
        ]
      };
    }

    return adjustments;
  }

  generateReasoning(intensity) {
    const reasons = {
      assertive: 'Increased evaluation frequency and actor challenge to match assertive Director style',
      assist: 'Reduced pressure and increased cooperation to support assist mode',
      off: 'Director disabled - actors operate autonomously'
    };
    return reasons[intensity];
  }
}
```

**Recalibration Benefits:**
- **Coherence**: All settings remain internally consistent
- **Intelligence**: System understands relationships between parameters
- **Transparency**: Shows professor what was auto-adjusted and why
- **Efficiency**: One change properly cascades to all related settings

**Step 6: Translation & Validation Layer**

Before deployment, validate NSM compatibility:

```javascript
class TranslationValidator {
  async validate(builderState) {
    const issues = [];
    const warnings = [];

    // Check: Every goal has success criteria
    for (const goal of builderState.outline.goals) {
      if (!goal.success_criteria?.required_evidence?.length) {
        issues.push({
          type: 'missing_success_criteria',
          goal: goal.id,
          message: 'Goal lacks measurable success criteria'
        });
      }

      // Check: Every goal has progress milestones
      if (!goal.progress_tracking?.milestones?.length) {
        warnings.push({
          type: 'missing_milestones',
          goal: goal.id,
          message: 'No progress milestones defined'
        });
      }
    }

    // Check: Adaptation constraints defined
    if (!builderState.outline.adaptation_constraints) {
      warnings.push({
        type: 'no_constraints',
        message: 'No adaptation boundaries set - Director has full freedom'
      });
    }

    // Check: Actor dynamic behaviors present
    for (const actor of builderState.actors) {
      if (!actor.dynamic_behavior) {
        warnings.push({
          type: 'static_actor',
          actor: actor.name,
          message: 'Actor has no adaptive behavior rules'
        });
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings,
      nsm_ready: this.checkNSMCompatibility(builderState)
    };
  }
}
```

**Step 7: Diff Preview**

Show professor what changed:

```javascript
{
  ai_suggested: {
    goals: [...],  // Original SAG output
    director_settings: {...}
  },
  user_edited: {
    goals: [...],  // After professor edits
    director_settings: {...}
  },
  final_translated: {
    scenario_outline: {...},  // NSM-ready format
    director_settings: {...}
  },
  impact_summary: {
    goals_added: 1,
    goals_modified: 2,
    triggers_added: 3,
    director_intensity_changed: 'assist → assertive',
    estimated_runtime_change: '+5 minutes'
  }
}
```

**Step 8: NSM Sandbox Testing**

Test before deployment:

```javascript
class NSMSandbox {
  async launchTest(outline, settings) {
    // Create ephemeral session
    const testSession = {
      outline,
      settings,
      mode: 'sandbox',
      visible_director_notes: true
    };

    // UI shows:
    // - Student conversation
    // - Progress bars per goal
    // - Director tension/divergence scores
    // - Trigger activations
    // - Mini-arc generation events

    return {
      session_id: uuid(),
      test_mode: true,
      analytics_enabled: true
    };
  }
}
```

**Step 9: Publish & Deploy**

Finalize and save to database:

```javascript
async publishSimulation() {
  // Run final validation
  const validation = await this.validator.validate(this.state);

  if (!validation.valid) {
    throw new Error('Cannot publish - validation failed');
  }

  // Create immutable snapshot
  const snapshot = {
    scenario_outline: this.state.scenario_outline,
    director_settings: this.state.director_settings,
    actors: this.state.actors,
    parsed_data: this.state.parsed_data,
    raw_text: this.state.raw_text,
    builder_version: '2.0',
    created_at: Date.now(),
    auto_tuned: true,
    user_modifications: this.state.edit_history
  };

  // Write to protocol (eventually database)
  await this.protocol.storeFinal('simulation_blueprint', snapshot);
  await this.protocol.transitionPhase('runtime');

  return snapshot;
}
```

#### Basic Artifact System
```javascript
class ArtifactSystemV1 {
  supported_types = ['json', 'text', 'markdown'];

  async create(type: string, data: any): Promise<Artifact> {
    const artifact = {
      id: uuid(),
      type,
      data,
      version: 1,
      editors: []
    };

    await this.protocol.write(`artifacts.${artifact.id}`, artifact);
    return artifact;
  }
}
```

### Architecture at End of Stage 1
```
┌─────────────────────────────────────────────┐
│                 Web UI                       │
└────────────────┬─────────────────────────────┘
                 │ REST
┌────────────────▼─────────────────────────────┐
│            API Gateway                       │
│         (Route to Agents)                    │
└────────────────┬─────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────┐
│          MCP Protocol Layer V1               │
│   [Simple Read/Write + Permissions]          │
└────────────────┬─────────────────────────────┘
                 │
     ┌───────────┼───────────┬──────────┐
     ▼           ▼           ▼          ▼
[Parser Agent][SAG Agent][Director][Actor Agent]
     │           │           │          │
     └───────────▼───────────┴──────────┘
              Protocol Store
                   │
                   ▼
              [Database]

Codebase: ~12,000 lines
New Components: Protocol layer, SAG, Basic artifacts
Investment: $20K (2 engineers × 4 weeks)
```

---

## 🎯 Stage 2: Individual Bots & Basic Artifacts
**Timeline:** Weeks 5-12
**Investment:** 3 engineers
**Goal:** Enable AI colleagues with simple artifact interaction

### Week 5-6: Individual Bot Architecture

#### Bot System Design
```javascript
packages/
├── core/
│   ├── bots/
│   │   ├── bot-manager.ts
│   │   ├── individual-bot.ts
│   │   └── templates/
│   │       ├── ceo-bot.ts
│   │       ├── cfo-bot.ts
│   │       └── coworker-bot.ts
```

#### Individual Bot Implementation
```javascript
class IndividualBot extends BaseAgent {
  constructor(
    protocol: IMCPProtocol,
    character: CharacterProfile,
    memory: MemorySystem
  ) {
    super(protocol);
    this.character = character;
    this.memory = memory;  // Isolated memory per bot
    this.context = new FreshContext();  // Fresh GPT context
  }

  async respond(event: Event): Promise<Response> {
    // Each bot has its own GPT conversation
    const response = await this.llm.complete({
      model: this.character.model,  // Can vary by bot
      temperature: this.character.temperature,
      messages: [
        { role: 'system', content: this.character.prompt },
        ...this.memory.getRelevant(event),
        { role: 'user', content: event.content }
      ]
    });

    // Store in bot's memory
    this.memory.add(event, response);

    return response;
  }
}
```

### Week 7-8: Simple Artifact System

#### Basic Read-Only Artifacts
```javascript
class BasicArtifact extends BaseArtifact {
  // Simple artifact types for Stage 2
  supported_types = ['text', 'markdown', 'json', 'document'];

  async create(type: string, data: any, owner: string): Promise<Artifact> {
    const artifact = {
      id: uuid(),
      type,
      data,
      owner,
      version: 1,
      created_at: Date.now(),
      updated_at: Date.now()
    };

    await this.protocol.write(`artifacts.${artifact.id}`, artifact);

    // Broadcast creation
    await this.protocol.broadcast('artifact_created', {
      artifactId: artifact.id,
      type,
      owner
    });

    return artifact;
  }

  async read(artifactId: string): Promise<any> {
    return await this.protocol.read(`artifacts.${artifactId}`);
  }

  async update(artifactId: string, data: any, editorId: string): Promise<void> {
    const artifact = await this.read(artifactId);

    artifact.data = data;
    artifact.version++;
    artifact.updated_at = Date.now();
    artifact.last_editor = editorId;

    await this.protocol.write(`artifacts.${artifactId}`, artifact);

    // Notify about change
    await this.protocol.broadcast('artifact_updated', {
      artifactId,
      editor: editorId,
      version: artifact.version
    });
  }
}
```

### Week 9-12: Bot-Artifact Integration

#### Teaching Through Documents
```javascript
class CoworkerTeacherBot extends IndividualBot {
  async teachWithDocument(
    concept: Concept
  ): Promise<TeachingInteraction> {
    // Bot creates a simple document to explain concept
    const document = await this.artifactSystem.create('markdown', {
      title: concept.title,
      content: this.generateExplanation(concept)
    }, this.id);

    // Generate teaching dialogue
    return {
      message: `I've created a document explaining ${concept.title}. Take a look and let me know if you have questions.`,
      artifact: document,
      next_steps: concept.practice_tasks
    };
  }

  async shareExample(exampleData: any): Promise<Artifact> {
    // Bot shares JSON data as example
    return await this.artifactSystem.create('json', {
      description: 'Example financial analysis',
      data: exampleData,
      annotations: this.generateAnnotations(exampleData)
    }, this.id);
  }
}
```

### Architecture at End of Stage 2
```
┌─────────────────────────────────────────────┐
│            Web UI + Real-time Updates        │
└────────────────┬─────────────────────────────┘
                 │ REST + WebSocket
┌────────────────▼─────────────────────────────┐
│            API Gateway                       │
└────────────────┬─────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────┐
│          MCP Protocol Layer V2               │
│   [Permissions + Events + Artifacts]         │
└────────────────┬─────────────────────────────┘
                 │
     ┌───────────┼──────────────┬──────────┐
     ▼           ▼              ▼          ▼
[Parser Agent][SAG Agent]  [Director]  [Bot Manager]
                                           │
                              ┌────────────┼────────────┐
                              ▼            ▼            ▼
                         [CEO Bot]   [CFO Bot]  [Coworker Bot]
                              │            │            │
                              └────────────┼────────────┘
                                          │
                                 [Basic Artifacts]
                                 - Text documents
                                 - Markdown files
                                 - JSON data
                                 - Simple versioning

Codebase: ~18,000 lines
New: Individual bots, Basic artifacts, Event system
Investment: $60K (3 engineers × 8 weeks)
```

---

## 🌐 Stage 3: Collaborative Artifacts & Dynamic Structures
**Timeline:** Weeks 13-20
**Investment:** 3 engineers
**Goal:** Enable collaborative work artifacts, runtime structure generation, and dynamic evaluation frameworks

### Week 13-14: Collaborative Artifact System

#### Real-time Collaborative Artifacts
```javascript
class CollaborativeArtifact extends BaseArtifact {
  // Advanced artifact types with collaboration
  supported_types = ['spreadsheet', 'presentation', 'code', 'whiteboard'];

  async collaborativeEdit(
    editorId: string,
    location: string,  // cell, slide, line, etc.
    value: any
  ): Promise<void> {
    // Lock location during edit
    await this.protocol.call('locks', 'acquire', {
      resource: `${this.id}.${location}`,
      owner: editorId,
      timeout: 5000
    });

    // Apply edit with operational transformation for conflicts
    const edit = {
      location,
      value,
      editor: editorId,
      timestamp: Date.now(),
      version: this.version
    };

    this.applyEdit(edit);
    this.version++;

    // Notify all collaborators in real-time
    await this.protocol.broadcast('artifact_changed', {
      artifactId: this.id,
      edit,
      activeEditors: this.getActiveEditors()
    });

    // Release lock
    await this.protocol.call('locks', 'release', {
      resource: `${this.id}.${location}`
    });
  }

  async addComment(
    location: string,
    text: string,
    authorId: string
  ): Promise<void> {
    const comment = {
      id: uuid(),
      location,
      text,
      author: authorId,
      timestamp: Date.now(),
      resolved: false
    };

    this.comments.push(comment);

    await this.protocol.broadcast('comment_added', {
      artifactId: this.id,
      comment
    });
  }
}
```

#### Teaching Through Collaborative Work
```javascript
class CollaborativeTeacherBot extends IndividualBot {
  async teachThroughSpreadsheet(
    concept: FinancialConcept
  ): Promise<TeachingInteraction> {
    // Bot creates shared spreadsheet
    const spreadsheet = await this.artifactSystem.create('spreadsheet', {
      title: `${concept.title} Analysis`,
      sheets: [{
        name: 'Analysis',
        data: this.generateTemplate(concept)
      }]
    }, this.id);

    // Bot demonstrates technique
    await spreadsheet.collaborativeEdit(
      this.id,
      'B2',
      '=VLOOKUP(A2, Historical!A:B, 2, FALSE)'
    );

    // Add teaching comment
    await spreadsheet.addComment(
      'B2',
      'This VLOOKUP finds historical data. Try applying similar logic to B3.',
      this.id
    );

    return {
      message: "I've started the analysis. Let's work on this together - you try cell B3.",
      artifact: spreadsheet,
      demonstration_cell: 'B2',
      student_task: 'B3'
    };
  }
}
```

### Week 15-16: Structure Generation System

#### Dynamic Structure Architecture
```javascript
packages/
├── core/
│   ├── structures/
│   │   ├── structure-generator.ts
│   │   ├── structure-manager.ts
│   │   ├── templates/
│   │   │   ├── evaluation-framework.ts
│   │   │   ├── collaboration-model.ts
│   │   │   └── success-criteria.ts
│   │   └── runtime/
│   │       ├── structure-controller.ts
│   │       └── structure-validator.ts
```

#### Runtime Structure Generation
```javascript
class DynamicStructureGenerator {
  async generateFromContext(
    scenario: ParsedScenario,
    objectives: LearningObjective[]
  ): Promise<RuntimeStructure> {
    // AI generates structure
    const prompt = this.buildStructurePrompt(scenario, objectives);

    const structure = await this.llm.generateStructure({
      model: 'gpt-4',
      prompt,
      schema: RuntimeStructureSchema
    });

    // Validate against contracts
    await this.protocol.call('validator', 'validateStructure', structure);

    // Store as available (not active)
    await this.protocol.write(`structures.available.${structure.id}`, structure);

    return structure;
  }
}
```

### Week 17-18: Director Structure Control

#### Director Managing Structures
```javascript
class DirectorWithStructureControl extends DirectorAgent {
  async evaluateAndActivateStructures(
    session: Session,
    progress: Progress
  ): Promise<void> {
    // Director decides when to activate structures
    if (progress.ready_for_deliverable && !this.hasActiveStructure('evaluation')) {
      const structure = await this.selectStructure('evaluation', session);

      // Customize for current context
      const customized = await this.customizeStructure(structure, {
        difficulty: session.student_performance,
        time_pressure: session.time_remaining,
        help_level: this.calculateHelpLevel(progress)
      });

      // Activate and grant permissions
      await this.activateStructure(customized);
      await this.grantStructurePermissions(customized);

      // Notify relevant agents
      await this.protocol.broadcast('structure_activated', customized);
    }
  }
}
```

### Week 19-20: Full NSM Implementation

#### Complete Narrative State Machine with Mini Arc Generator

**NSM Runtime Architecture:**

The NSM operates with dual-layer intelligence:
1. **Director Layer**: Monitors progress, generates runtime structure, issues guidance
2. **Actor Layer**: Executes moment-to-moment responses within Director's structure

**Key Runtime Concepts:**

**Director State Tracking:**
```javascript
{
  last_evaluated_message: 20,
  current_phase_id: 'phase_complication',
  tension_score: 0.62,              // 0-1: Tracks conflict intensity, ensures ebb/flow
  divergence_score: 0.15,           // 0: on track, 1: fully off-arc
  objective_progress: {
    'goal_1': 0.45,
    'goal_2': 0.20
  },
  actor_engagement: {
    CEO: { talk_time: 0.35, compliance: 0.8 },
    CFO: { talk_time: 0.25, compliance: 0.9 }
  },
  pending_events: [
    { id: 'event_crisis', scheduled_at_message: 22 }
  ],
  notes: [
    'Student focusing on cost-cutting; introduce growth counterpoint next turn'
  ]
}
```

**Director Settings:**
```javascript
{
  intensity: 'assist',  // off | assist | assertive
  evaluation_cadence: {
    message_interval: 5,
    event_triggers: ['arc_divergence', 'objective_regression'],
    time_interval_seconds: 90
  },
  learning_objective_targets: {
    goal_1: { threshold: 0.7, priority: 'high' },
    goal_2: { threshold: 0.6, priority: 'medium' }
  },
  allowed_actor_interventions: [
    'goal_shift',
    'enter_exit_actor',
    'hidden_info_reveal'
  ],
  adaptation_flexibility: 0.7,  // 0-1: How much Director can deviate
  verification_policy: {
    enabled: true,
    retry_limit: 1,
    temperature_override: 0.2
  }
}
```

**Mini Arc Generator:**

The Mini Arc Generator is a Director sub-module that dynamically creates runtime structure based on progress:

```javascript
class MiniArcGenerator {
  async generate(directorState, outline): Promise<RuntimeStructure> {
    const progress = this.calculateProgress(directorState);

    // Generate phase-appropriate structure
    const prompt = `
      Current Progress: ${progress.percentage}% objectives met
      Outline Goals: ${JSON.stringify(outline.goals)}
      Student Behavior: ${directorState.notes.join('; ')}

      Generate runtime structure (beginning/middle/end guidance):
      - If progress < 20%: Beginning phase - introduce goals
      - If progress 20-70%: Middle phase - escalate with encounters/tests
      - If progress > 70%: End phase - conclude and reflect

      Maintain flexibility - this is guidance, not rigid script.
    `;

    const structure = await this.llm.complete({
      model: 'gpt-4',
      messages: [{ role: 'system', content: prompt }]
    });

    return {
      current_phase: structure.phase,
      active_goals: structure.goals_to_focus,
      escalation_level: structure.escalation,
      next_trigger: structure.suggested_next_event,
      actor_guidance: structure.actor_instructions
    };
  }
}
```

**Director Loop Workflow:**

```javascript
class DirectorLayer {
  async evaluate(session, newMessage) {
    // Step 1: Gather Signals
    const signals = {
      conversation_snippet: session.last_n_messages(5),
      trigger_activations: this.checkTriggers(newMessage),
      objective_heuristics: await this.evaluateObjectives(session)
    };

    // Step 2: Analyze Student Behavior
    const analysis = await this.analyzeStudentBehavior(signals);
    // Returns: { focus, misconceptions, engagement, divergence }

    // Step 3: Reflect & Plan
    const decision = await this.planAdjustments(analysis, session);
    // Returns: DirectorDecision with arc adjustments, actor changes, scheduled events

    // Step 4: Update State
    await this.updateDirectorState(decision);
    await this.protocol.write('director_state', this.state);

    // Step 5: Schedule Guidance for Next Turn
    await this.protocol.write('actor_guidance', decision.guidance);

    // Step 6: Mini-generate structure if needed
    if (this.shouldRegenerateStructure(analysis)) {
      const newStructure = await this.miniArcGenerator.generate(
        this.state,
        session.outline
      );
      await this.protocol.write('runtime_structure', newStructure);
    }

    return decision;
  }

  async analyzeStudentBehavior(signals) {
    // Lightweight analysis with GPT-3.5-turbo
    const analysis = await this.llm.complete({
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'system',
        content: 'Analyze student behavior for: focus areas, misconceptions, engagement level, divergence from goals'
      }],
      response_format: { type: 'json_object' }
    });

    return JSON.parse(analysis.content);
  }
}
```

**Complete NSM Implementation:**
```javascript
class NarrativeStateMachine {
  constructor(protocol: IMCPProtocol) {
    this.protocol = protocol;
    this.director = new DirectorLayer(protocol);
    this.actor = new ActorLayer(protocol);
    this.miniArcGenerator = new MiniArcGenerator(protocol);
  }

  async processInteraction(input: StudentInput): Promise<Response> {
    // Retrieve pending Director guidance
    const guidance = await this.protocol.read('actor_guidance');
    const structure = await this.protocol.read('runtime_structure');

    // Actor responds immediately with guidance applied
    const actorResponse = await this.actor.generateResponse(
      input,
      guidance,
      structure
    );

    // Director evaluates async (non-blocking)
    this.evaluateAsync(input, actorResponse);

    return actorResponse;
  }

  private async evaluateAsync(
    input: StudentInput,
    response: Response
  ): Promise<void> {
    // Check if evaluation needed (based on cadence)
    if (!this.shouldEvaluate()) return;

    // Director analysis
    const decision = await this.director.evaluate(this.session, input);

    // Log intervention for analytics
    await this.logDirectorDecision(decision);

    // Generate mini arc if significant progress change
    if (decision.requires_structure_update) {
      const miniArc = await this.miniArcGenerator.generate(
        this.director.state,
        this.session.outline
      );

      await this.protocol.write('runtime_structure', miniArc);
    }
  }
}
```

**Actor Dynamic Behavior:**

Actors respond differently based on student performance:

```javascript
{
  CEO: {
    base_personality: {
      aggressive_passive: 40,
      cooperative_antagonistic: 65,
      analytical_intuitive: 55
    },
    dynamic_behavior: {
      if_student_struggling: {
        mode: 'coach',
        action: 'Share reflective questions about trade-offs'
      },
      if_student_advanced: {
        mode: 'challenger',
        action: 'Introduce board pressure scenario'
      },
      if_off_track: {
        mode: 'redirector',
        action: 'Ask how decision impacts goal_1'
      }
    },
    allowed_tone_range: { min: 30, max: 70 }
  }
}
```

#### Simulation Replay & Analysis System

The MCP's comprehensive audit log enables powerful replay and analysis features:

```javascript
class SimulationReplaySystem {
  constructor(protocol: IMCPProtocol) {
    this.protocol = protocol;
  }

  async replaySession(sessionId: string, options: ReplayOptions) {
    // Retrieve complete event history from audit log
    const history = await this.protocol.getAuditLog(sessionId);

    if (options.mode === 'professor_view') {
      // Full transparency mode - everything visible
      return this.createProfessorReplay(history, {
        include: [
          'director_decisions',      // AI reasoning
          'actor_thoughts',          // Internal AI state
          'progress_metrics',        // Learning objectives tracking
          'trigger_activations',     // What caused what
          'adaptation_reasons'       // Why Director changed strategy
        ],
        annotations: true,  // Add explanatory notes
        playback_speed: options.speed || 2.0,
        pause_points: this.identifyTeachingMoments(history)
      });
    } else if (options.mode === 'student_review') {
      // Student-appropriate replay
      return this.createStudentReplay(history, {
        include: [
          'conversations',           // Their dialogue
          'visible_events',         // What they experienced
          'decisions_made'          // Their choices
        ],
        highlight: [
          'critical_decisions',     // Key choice points
          'learning_achievements',  // When objectives were met
          'missed_opportunities'    // What they could have explored
        ],
        exclude: ['ai_internals', 'hidden_information']
      });
    } else if (options.mode === 'highlight_reel') {
      // Auto-generated highlights
      return this.createHighlightReel(history);
    }
  }

  async createHighlightReel(history: EventLog[]) {
    // Extract key moments automatically
    const highlights = history.filter(event => {
      return (
        event.importance > 0.7 ||                    // High importance events
        event.type === 'objective_achieved' ||       // Learning milestones
        event.type === 'critical_decision' ||        // Key choices
        event.tension_delta > 0.3 ||                 // Dramatic moments
        event.student_insight_detected               // Breakthrough moments
      );
    });

    // Generate narrative summary
    const narrative = await this.generateNarrative(highlights);

    return {
      highlights,
      narrative,
      duration: this.calculateDuration(highlights),
      chapters: this.createChapters(highlights)
    };
  }

  async analyzeSession(sessionId: string): Promise<SessionAnalysis> {
    const history = await this.protocol.getAuditLog(sessionId);

    return {
      learning_objectives: {
        attempted: this.extractAttemptedObjectives(history),
        achieved: this.extractAchievedObjectives(history),
        partially_met: this.extractPartialObjectives(history)
      },
      student_behavior: {
        engagement_pattern: this.analyzeEngagement(history),
        decision_quality: this.analyzeDecisions(history),
        exploration_depth: this.analyzeExploration(history),
        collaboration_effectiveness: this.analyzeCollaboration(history)
      },
      ai_performance: {
        director_interventions: this.analyzeDirector(history),
        actor_consistency: this.analyzeActors(history),
        adaptation_effectiveness: this.analyzeAdaptation(history)
      },
      recommendations: await this.generateRecommendations(history)
    };
  }

  identifyTeachingMoments(history: EventLog[]) {
    // Find moments worth pausing to discuss
    return history
      .filter(event => {
        return (
          event.type === 'misconception_detected' ||
          event.type === 'near_miss_decision' ||
          event.type === 'excellent_reasoning' ||
          event.type === 'pattern_recognized'
        );
      })
      .map(event => ({
        timestamp: event.timestamp,
        reason: event.teaching_value,
        suggested_discussion: event.discussion_prompt
      }));
  }

  async generateNarrative(events: EventLog[]) {
    // Use AI to create a coherent story from events
    const prompt = `Create a narrative summary of this simulation session focusing on:
    - Key decisions and their consequences
    - Learning progression
    - Dramatic arc of the scenario
    - Student growth demonstrated`;

    const narrative = await this.llm.complete({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: JSON.stringify(events) }
      ]
    });

    return narrative.content;
  }
}
```

**Replay System Benefits:**
- **Multi-Perspective Review**: Different views for different audiences
- **Automatic Highlights**: AI identifies key learning moments
- **Teaching Tools**: Pause points for discussion
- **Performance Analytics**: Deep analysis of learning outcomes
- **Narrative Generation**: AI creates coherent story from events

### Architecture at End of Stage 3
```
┌─────────────────────────────────────────────┐
│  Web UI + Real-time + Collaborative Editor  │
└────────────────┬─────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────┐
│            Orchestration Layer               │
│         (NSM + Structure Control)            │
└────────────────┬─────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────┐
│          MCP Protocol Layer V3               │
│    [Full Features + Structure Management]    │
└────────────────┬─────────────────────────────┘
                 │
    ┌────────────┼─────────────┬───────────┐
    ▼            ▼             ▼           ▼
[Director]  [Actor Layer]  [Structures]  [Bots]
    │            │             │           │
    │      ┌─────┴─────┐      │      ┌────┴────┐
    │      ▼           ▼      │      ▼         ▼
    │   [Mini Arc] [Guidance] │   [CEO Bot] [CFO Bot]
    │                         │
    └─────────┬──────────────┘
              ▼
    [Dynamic Structures]
    - Evaluation Frameworks
    - Success Criteria
    - Collaboration Models
              ▼
    [Collaborative Artifacts]
    - Spreadsheets (real-time)
    - Presentations
    - Code editors
    - Whiteboards

Codebase: ~35,000 lines
New: NSM complete, Collaborative artifacts, Dynamic structures
Investment: $80K (3 engineers × 8 weeks)
```

---

## 🌟 Stage 4: Unified Universe & Multiplayer
**Timeline:** Weeks 21-32
**Investment:** 4 engineers
**Goal:** Persistent multi-participant simulations

### Week 21-24: Universe Foundation

#### Unified Simulation Universe
```javascript
class UnifiedSimulationUniverse {
  constructor(protocol: IMCPProtocol) {
    this.worldState = new PersistentWorldState();
    this.participants = new ParticipantManager();
    this.physics = new SimulationPhysics();  // Economic/business physics
  }

  async processAction(
    participantId: string,
    action: Action
  ): Promise<WorldUpdate> {
    // Validate action
    const valid = await this.physics.validateAction(action);
    if (!valid) throw new InvalidActionError();

    // Calculate impact
    const impact = await this.physics.calculateImpact(
      action,
      this.worldState
    );

    // Apply to world
    this.worldState.apply(impact);

    // Broadcast to all participants
    const update = this.createUpdate(impact);
    await this.broadcastToParticipants(update);

    // Trigger bot reactions
    await this.triggerBotReactions(action, impact);

    return update;
  }
}
```

### Week 25-28: Multiplayer Coordination

#### Team Coordination System
```javascript
class TeamCoordinator extends BaseAgent {
  async coordinateTeam(
    teamId: string,
    universe: UnifiedSimulationUniverse
  ): Promise<void> {
    const teamState = await this.getTeamState(teamId);

    // Detect coordination needs
    if (this.detectConflict(teamState)) {
      await this.initiateConflictResolution(teamId);
    }

    if (this.detectSynergy(teamState)) {
      await this.unlockTeamBonus(teamId);
    }

    // Manage shared artifacts
    await this.synchronizeTeamArtifacts(teamId);
  }
}
```

#### Dynamic Role-Based Context Filtering

The Universe maintains a single shared context but filters it based on each participant's role and information access:

```javascript
class ContextFilterManager {
  constructor(protocol: IMCPProtocol) {
    this.protocol = protocol;
  }

  async distributeContext(globalContext: GlobalContext) {
    const participants = await this.protocol.read('participants');

    for (const [id, participant] of Object.entries(participants)) {
      // Filter context based on role
      const filteredContext = this.filterForRole(globalContext, participant);

      // Store participant-specific view
      await this.protocol.write(`context.${id}`, filteredContext);

      // Notify participant with their view
      await this.notifyParticipant(participant, filteredContext);
    }
  }

  filterForRole(context: GlobalContext, participant: Participant) {
    // Information asymmetry based on role
    switch (participant.role) {
      case 'CEO':
        // CEO sees everything
        return {
          ...context,
          visibility: 'full',
          financials: context.financials,
          internal_discussions: context.internal_discussions,
          board_communications: context.board_communications,
          market_intelligence: context.market_intelligence
        };

      case 'CFO':
        // CFO sees financial data and relevant discussions
        return {
          ...context,
          visibility: 'financial_focus',
          financials: context.financials,
          internal_discussions: context.internal_discussions.filter(
            d => d.tags.includes('finance') || d.tags.includes('budget')
          ),
          board_communications: context.board_communications.filter(
            c => c.financial_implications
          ),
          market_intelligence: null  // No competitive intel
        };

      case 'External_Consultant':
        // Consultant only sees what's shared with them
        return {
          ...context,
          visibility: 'external_limited',
          financials: context.financials.public_only,
          internal_discussions: [],  // No internal access
          board_communications: [],   // No board access
          market_intelligence: context.market_intelligence.public_sources
        };

      case 'Junior_Employee':
        // Limited view based on clearance
        return {
          ...context,
          visibility: 'restricted',
          financials: null,
          internal_discussions: context.internal_discussions.filter(
            d => d.clearance_level <= participant.clearance
          ),
          board_communications: [],
          market_intelligence: null
        };

      case 'AI_Competitor':
        // AI bot playing competitor role - only public info
        return {
          visibility: 'competitive',
          market_data: context.market_state,
          public_announcements: context.public_announcements,
          stock_price: context.company_metrics.stock_price,
          // Can infer but not directly see internal data
          inferred_strategy: this.inferFromPublicData(context)
        };
    }
  }

  async handleInformationLeak(
    leaker: Participant,
    receiver: Participant,
    information: Information
  ) {
    // Simulate information spreading
    const wasPrivate = information.classification === 'confidential';

    if (wasPrivate) {
      // Update context - information is now known by receiver
      await this.protocol.write(`leaked_info.${Date.now()}`, {
        from: leaker.id,
        to: receiver.id,
        information,
        impact: this.assessLeakImpact(information)
      });

      // Trigger market reaction if significant
      if (information.market_sensitive) {
        await this.protocol.broadcast('market_event', {
          type: 'information_leak',
          severity: 'high'
        });
      }
    }
  }
}
```

**Information Asymmetry Benefits:**
- **Realistic Dynamics**: Different roles have different information access
- **Strategic Depth**: Players must work with incomplete information
- **Negotiation Training**: Learn to handle information disparities
- **Security Concepts**: Understand data classification and need-to-know

#### AI Bot Swarms - Collective Behavior Simulation

Swarms simulate large groups (customers, investors, markets) as unified entities with emergent behavior:

```javascript
class AISwarmController {
  constructor(protocol: IMCPProtocol) {
    this.protocol = protocol;
    this.swarms = new Map();
  }

  async deploySwarm(config: SwarmConfig): Promise<SwarmHandle> {
    const swarm = {
      id: `swarm_${config.type}_${Date.now()}`,
      type: config.type,  // 'customers', 'investors', 'competitors', 'market'
      size: config.size || 1000,
      behavior_model: config.behavior,
      sentiment: 0.5,  // -1 (negative) to 1 (positive)
      volatility: config.volatility || 0.3,
      memory: []  // Recent events affecting the swarm
    };

    await this.protocol.write(`swarms.${swarm.id}`, swarm);
    this.swarms.set(swarm.id, swarm);

    // Subscribe swarm to relevant events
    await this.protocol.subscribe('market_event', (event) => {
      this.processSwarmReaction(swarm, event);
    });

    return {
      id: swarm.id,
      control: this.createSwarmControls(swarm)
    };
  }

  async processSwarmReaction(swarm: Swarm, event: MarketEvent) {
    // Calculate collective response using simplified AI
    const prompt = `
      Swarm: ${swarm.size} ${swarm.type}
      Current sentiment: ${swarm.sentiment}
      Event: ${event.description}

      How does this collective group react? Consider:
      - Herd mentality effects
      - Information cascades
      - Panic/euphoria dynamics
      - Rational vs emotional responses
    `;

    const response = await this.llm.complete({
      model: 'gpt-3.5-turbo',  // Lighter model for swarm behavior
      messages: [
        { role: 'system', content: 'Simulate collective market behavior' },
        { role: 'user', content: prompt }
      ]
    });

    const swarmAction = {
      type: response.action_type,  // 'buy', 'sell', 'hold', 'protest', 'support'
      intensity: response.intensity,  // 0-1 scale
      sentiment_shift: response.sentiment_change,
      cascade_probability: response.cascade_risk  // Will others follow?
    };

    // Update swarm state
    swarm.sentiment = Math.max(-1, Math.min(1,
      swarm.sentiment + swarmAction.sentiment_shift
    ));
    swarm.memory.push({ event, reaction: swarmAction });

    // Broadcast swarm action to universe
    await this.protocol.broadcast('swarm_action', {
      swarm_id: swarm.id,
      action: swarmAction,
      impact: this.calculateMarketImpact(swarm, swarmAction)
    });
  }

  calculateMarketImpact(swarm: Swarm, action: SwarmAction) {
    // Swarm size and intensity determine market impact
    const impactMultiplier = (swarm.size / 10000) * action.intensity;

    switch (swarm.type) {
      case 'customers':
        return {
          sales_volume: action.type === 'buy' ? impactMultiplier : -impactMultiplier,
          brand_sentiment: action.sentiment_shift * 0.1,
          viral_probability: action.cascade_probability
        };

      case 'investors':
        return {
          stock_price: impactMultiplier * 10,  // Investors have outsized impact
          volatility_index: Math.abs(action.sentiment_shift),
          analyst_rating: action.sentiment_shift > 0 ? 'upgrade' : 'downgrade'
        };

      case 'competitors':
        return {
          market_share: -impactMultiplier * 0.05,
          pricing_pressure: action.type === 'price_cut' ? 'high' : 'low',
          innovation_pressure: action.intensity
        };

      case 'market':
        return {
          overall_conditions: action.sentiment_shift,
          sector_performance: impactMultiplier,
          macro_trends: this.identifyTrends(swarm.memory)
        };
    }
  }

  createSwarmControls(swarm: Swarm) {
    return {
      // Professor can influence swarm behavior
      injectSentiment: async (shift: number) => {
        swarm.sentiment = Math.max(-1, Math.min(1, swarm.sentiment + shift));
        await this.protocol.write(`swarms.${swarm.id}.sentiment`, swarm.sentiment);
      },

      triggerEvent: async (eventType: string) => {
        const events = {
          'panic': { sentiment_shift: -0.5, volatility: 0.9 },
          'euphoria': { sentiment_shift: 0.5, volatility: 0.8 },
          'uncertainty': { sentiment_shift: 0, volatility: 0.6 }
        };

        const event = events[eventType];
        if (event) {
          await this.processSwarmReaction(swarm, event);
        }
      }
    };
  }
}
```

**Swarm Behavior Benefits:**
- **Market Dynamics**: Simulate realistic market forces and crowd psychology
- **Scalable Complexity**: One swarm represents thousands of individuals
- **Emergent Behavior**: Complex patterns from simple rules
- **Teaching Tool**: Demonstrate market psychology and systemic risks

### Week 29-32: Professor Control & Monitoring

#### Professor Control System
```javascript
class ProfessorControlPanel {
  async deployBot(
    universe: UnifiedSimulationUniverse,
    config: BotConfig
  ): Promise<BotHandle> {
    const bot = await this.createBot(config);

    // Add to universe
    await universe.addParticipant(bot);

    // Set autonomy level
    await bot.setAutonomy(config.autonomy);

    // Professor can puppet at any time
    return {
      id: bot.id,
      override: (action) => bot.forceAction(action),
      adjust: (params) => bot.adjustBehavior(params)
    };
  }

  async injectEvent(
    universe: UnifiedSimulationUniverse,
    event: Event
  ): Promise<void> {
    // Professor injects crisis
    await universe.injectEvent(event, {
      priority: 'immediate',
      override_director: true
    });
  }
}
```

### Architecture at End of Stage 4
```
┌──────────────────────────────────────────────────┐
│         Multi-User Web UI + Dashboards           │
└────────────────┬─────────────────────────────────┘
                 │ WebSocket + REST
┌────────────────▼─────────────────────────────────┐
│           Real-time Gateway                      │
│         (Socket.io / WebRTC)                     │
└────────────────┬─────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────┐
│         Unified Universe Controller              │
│    (World State + Physics + Coordination)        │
└────────────────┬─────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────┐
│          MCP Protocol Layer V4                   │
│      [Universe-aware + Multi-participant]        │
└────────────────┬─────────────────────────────────┘
                 │
    ┌────────────┼────────────┬────────────┬──────────┐
    ▼            ▼            ▼            ▼          ▼
[Director]   [Actor]    [Bot Swarm]  [Humans]  [Professor]
    │            │            │            │          │
    └────────────┼────────────┴────────────┴──────────┘
                 ▼
         [Shared Universe]
         - Persistent State
         - Market Dynamics
         - Team Artifacts
         - Global Events

Codebase: ~50,000 lines
New: Universe system, Multiplayer, Professor tools, Swarms
Investment: $120K (4 engineers × 12 weeks)
```

---

## 🚀 Stage 5: Market & Scale
**Timeline:** Weeks 33-52
**Investment:** 5 engineers
**Goal:** Marketplace, enterprise features, and scale

### Week 33-40: Simulation Marketplace

#### Marketplace Architecture
```javascript
class SimulationMarketplace {
  async publishSimulation(
    simulation: Simulation,
    author: Author
  ): Promise<MarketplaceListing> {
    // Package simulation
    const package = await this.packageSimulation(simulation);

    // Generate metadata
    const metadata = {
      title: simulation.name,
      learning_objectives: simulation.objectives,
      difficulty: this.calculateDifficulty(simulation),
      estimated_duration: simulation.duration,
      bot_count: simulation.bots.length,
      artifact_types: simulation.artifacts.map(a => a.type),
      price: author.pricing
    };

    // Create listing
    const listing = await this.createListing(package, metadata);

    // Deploy to CDN
    await this.deployCDN(listing);

    return listing;
  }
}
```

### Week 41-48: Enterprise Features

#### Enterprise Management System
```javascript
class EnterpriseSystem {
  features = {
    single_sign_on: 'SAML/OAuth',
    role_based_access: 'Admin/Instructor/Student',
    analytics_dashboard: 'Real-time learning metrics',
    custom_branding: 'White-label support',
    api_access: 'REST/GraphQL APIs',
    bulk_provisioning: 'CSV/API user creation',
    compliance: 'GDPR/FERPA compliant'
  };

  async provisionOrganization(
    org: Organization
  ): Promise<OrgInstance> {
    // Create isolated universe
    const universe = await this.createOrgUniverse(org);

    // Apply customizations
    await this.applyBranding(universe, org.branding);

    // Set up SSO
    await this.configureSAML(org.sso_config);

    // Initialize analytics
    await this.setupAnalytics(org);

    return universe;
  }
}
```

### Week 49-52: Scale & Performance

#### Scaling Architecture
```javascript
class ScalableInfrastructure {
  components = {
    load_balancer: 'AWS ALB / Cloudflare',
    api_servers: 'Auto-scaling ECS/K8s',
    protocol_layer: 'Redis Cluster for MCP store',
    database: 'Aurora PostgreSQL with read replicas',
    artifacts: 'S3 with CloudFront CDN',
    real_time: 'Managed WebSocket (AWS API Gateway)',
    ai_calls: 'Rate-limited with queue system',
    monitoring: 'DataDog / New Relic'
  };

  async handleScale(concurrent_users: number): Promise<void> {
    if (concurrent_users > 1000) {
      await this.scaleHorizontally();
      await this.enableCaching();
      await this.optimizeAICalls();
    }

    if (concurrent_users > 10000) {
      await this.enableGlobalCDN();
      await this.shardByRegion();
      await this.implementEdgeComputing();
    }
  }
}
```

### Final Architecture (End of Year 2)
```
┌────────────────────────────────────────────────────┐
│          Global User Interface Layer               │
│    (Web, Mobile, API, Enterprise Portals)          │
└────────────────┬───────────────────────────────────┘
                 │
┌────────────────▼───────────────────────────────────┐
│            Edge Computing Layer                    │
│         (CloudFlare Workers)                       │
└────────────────┬───────────────────────────────────┘
                 │
┌────────────────▼───────────────────────────────────┐
│          Load Balancer / API Gateway               │
└────────────────┬───────────────────────────────────┘
                 │
┌────────────────▼───────────────────────────────────┐
│      Microservices Architecture                    │
├─────────────────────────────────────────────────────┤
│ • Universe Service    • Bot Service                │
│ • Artifact Service    • Analytics Service          │
│ • Marketplace Service • Enterprise Service         │
└────────────────┬───────────────────────────────────┘
                 │
┌────────────────▼───────────────────────────────────┐
│          MCP Protocol Layer V5                     │
│         (Distributed / Sharded)                    │
└────────────────┬───────────────────────────────────┘
                 │
┌────────────────▼───────────────────────────────────┐
│           Data Layer (Sharded)                     │
├─────────────────────────────────────────────────────┤
│ • PostgreSQL Cluster  • Redis Cluster              │
│ • S3 Object Storage   • ElasticSearch              │
│ • Time-series DB      • Graph Database             │
└─────────────────────────────────────────────────────┘

Codebase: ~100,000 lines
Microservices: 8+
Scale: 100,000+ concurrent users
Investment: $200K (5 engineers × 20 weeks)
```

---

## 📊 Investment & ROI Timeline

### Financial Roadmap
```
Stage 1 (Weeks 1-4):    $20K  → MVP Enhancement
Stage 2 (Weeks 5-12):   $60K  → Collaborative Learning
Stage 3 (Weeks 13-20):  $80K  → Dynamic Intelligence
Stage 4 (Weeks 21-32):  $120K → Multiplayer Universe
Stage 5 (Weeks 33-52):  $200K → Market & Scale

Total Year 1: $480K
Expected ARR by Year 1 End: $2M+
```

### Milestone Revenue Targets
```
Month 3:  $10K MRR  (100 users)
Month 6:  $50K MRR  (500 users)
Month 9:  $150K MRR (1,500 users)
Month 12: $300K MRR (3,000 users + enterprise)
Month 18: $1M MRR   (10,000 users + 10 enterprises)
Month 24: $3M MRR   (30,000 users + 50 enterprises)
```

---

## 🔧 Implementation Principles

### 1. Protocol-First Development
Every component speaks protocol from day 1, even if protocol is simple.

### 2. Interface Stability
```typescript
// This interface NEVER changes after v1.0
interface IMCPProtocol {
  // Core methods defined once
}
```

### 3. Progressive Enhancement
```javascript
// Week 1
const protocol = new MCPv1();  // Simple

// Week 8 - Just swap implementation
const protocol = new MCPv2();  // With permissions

// All agents still work unchanged!
```

### 4. Zero Throwaway Code
Everything built in Stage 1 is still running in Stage 5.

### 5. Test-Driven Architecture
```javascript
// Protocol makes testing trivial
const mockProtocol = new MockMCPProtocol();
const agent = new SAGAgent(mockProtocol);
// Test in complete isolation
```

### 6. Clean Break Over Legacy

When architecture fundamentally changes, embrace clean break over compatibility:
- Archive old code as reference, don't maintain it
- Build new system properly from first principles
- Use old code as specification/validation
- Faster iteration without compromise

**Example:**
```javascript
// Don't build compatibility shims
if (USE_OLD_SYSTEM) { legacyHandler() }  // ❌ NO

// Do build clean MCP implementation
const agent = new MCPAgent(protocol);    // ✅ YES
```

---

## 🎯 Success Metrics

### Technical Metrics
- **Code Reuse**: >80% of code from each stage used in next
- **Test Coverage**: >90% for protocol layer, >80% overall
- **Performance**: <3s response time at scale
- **Reliability**: 99.9% uptime
- **AI Costs**: <$0.50 per user session

### Business Metrics
- **User Retention**: >60% monthly active
- **Learning Completion**: >70% finish simulations
- **Enterprise Adoption**: 50+ by Year 2
- **Marketplace Content**: 1,000+ simulations
- **Global Scale**: 100,000+ users

---

## 🚦 Risk Mitigation

### Technical Risks
1. **AI Latency**: Mitigated by async Director, caching
2. **Cost Overrun**: Tiered AI models, usage limits
3. **Complexity**: Modular architecture, clean interfaces
4. **Scale**: Built for horizontal scaling from Stage 1

### Business Risks
1. **Slow Adoption**: Freemium model, university partnerships
2. **Competition**: Patent protection, first-mover advantage
3. **AI Dependency**: Multi-provider support planned
4. **Enterprise Sales**: Building sales team Month 6

---

## 🏁 Getting Started Tomorrow

### Day 1 Tasks
```bash
# Create protocol interface
touch packages/core/protocol/interfaces/mcp-protocol.interface.ts

# Create simple implementation
touch packages/core/protocol/implementations/mcp-v1-simple.ts

# Create base agent
touch packages/core/agents/base-agent.ts

# Create SAG agent
touch packages/core/agents/sag-agent.ts
```

### Week 1 Deliverable
Working SAG with protocol layer generating goal-oriented outlines.

### Month 1 Demo
Student collaborating with AI coworker on spreadsheet task.

### Quarter 1 Goal
Full NSM with individual bots in production.

### Year 1 Vision
10,000+ students learning through AI work simulation daily.

---

**This is the path from MVP to revolutionary platform. Every line of code written tomorrow is permanent foundation for the $100M+ opportunity ahead.**