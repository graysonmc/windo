# CONSTRUCTION PLAN: MCP Architecture Refactor
**Phase:** Stage 1 - Protocol Foundation
**Timeline:** 4 weeks (Weeks 1-4)
**Status:** Planning
**Created:** October 24, 2025
**Last Updated:** October 24, 2025

---

## 1. Phase Overview

### Objective
Implement clean-break refactor from Phase 0 monolithic architecture to MCP (Model Context Protocol) protocol-first architecture, enabling isolated agent contexts, progressive enrichment, and complete audit trails.

### Context
Phase 0 successfully validated the Actor/Director dual-layer pattern and modular architecture principles. However, the current implementation lacks:
- **Fresh agent contexts**: All agents share same OpenAI context, causing pollution
- **Protocol-based communication**: Agents call each other directly instead of through protocol
- **Phase-based permissions**: No enforcement of what agents can read/write in different phases
- **Audit trails**: Limited visibility into who changed what and when

The MCP refactor addresses these limitations by rebuilding the system from protocol-first principles while keeping validated Phase 0 code as reference.

### Clean Break Approach
**What moves to archive:**
- `/packages/core/simulation-engine.js` → `/packages/core/archive/simulation-engine.js`
- `/packages/core/modules/actor-module.js` → `/packages/core/archive/actor-module.js`
- `/packages/core/director-prototype.js` → `/packages/core/archive/director-prototype.js`

**What stays:**
- Database schema and tables
- Shared contracts (`/packages/shared-contracts/`)
- Translation service (will become Validator Agent wrapper)
- Web UI (will connect to new MCP endpoints)
- Core prompts and business logic

**What gets rebuilt:**
- Communication layer (direct calls → MCP protocol)
- Agent isolation (monolithic → isolated with fresh contexts)
- API endpoints (REST → MCP-aware REST)
- Data flow (database reads → MCP protocol reads)

---

## 2. Success Criteria

### Must Have (P0)
- ✅ **MCP Protocol Core**: Fully functional protocol layer with read/write/call/broadcast operations
- ✅ **Phase-Based Permissions**: Enforced permissions for building → reviewing → finalized → runtime phases
- ✅ **Progressive Enrichment**: All data versioned, nothing overwritten
- ✅ **Audit Trail**: Complete log of all agent actions
- ✅ **Builder Pipeline Agents**: Parser, SAG, Validator, Finalizer all operational
- ✅ **Runtime Agents**: Director and Actor with fresh GPT contexts
- ✅ **End-to-End Test**: Raw input → Parsed → Outline → Validated → Blueprint → Conversation (working)
- ✅ **API Endpoints**: New MCP-based endpoints for builder pipeline
- ✅ **Zero Regressions**: All Phase 0 capabilities maintained

### Should Have (P1)
- 📋 **Cost Optimization**: Intelligent model routing (GPT-4 vs GPT-3.5)
- 📋 **Auto-Tuning**: Settings inference from scenario outline
- 📋 **Recalibrator**: Intelligent setting coherence when professor edits
- 📋 **Comprehensive Tests**: Unit tests for all agents and protocol operations

### Nice to Have (P2)
- 💡 **Conditional Pipeline Routing**: Domain-specific agents (Crisis, Negotiation, etc.)
- 💡 **Diff Preview**: Show professor what changed between AI suggestions and final
- 💡 **NSM Sandbox Testing**: Test simulations before deployment

### Metrics
- **Code Quality**: 100% of agents extend BaseAgent class
- **Protocol Purity**: 0 direct database calls from agents (all via protocol)
- **Test Coverage**: 100% of critical path tested (Raw → Blueprint → Conversation)
- **Performance**: End-to-end pipeline completes in <60 seconds
- **Audit Completeness**: Every write operation logged with agent ID, timestamp, phase

---

## 3. Technical Approach

### Architecture Principles
1. **Protocol-First**: All agent communication through MCP interface
2. **Agent Isolation**: Each agent gets fresh OpenAI context (no pollution)
3. **Phase Enforcement**: Protocol validates permissions based on current phase
4. **Immutable History**: Progressive enrichment preserves all versions
5. **Test-Driven**: Protocol enables comprehensive testing (mock protocol in tests)

### MCP Protocol Layer

#### Core Interface (Never Changes)
```typescript
interface IMCPProtocol {
  // Core Operations
  read(key: string): Promise<any>;
  write(key: string, value: any, agentId: string): Promise<void>;
  delete(key: string, agentId: string): Promise<void>;
  exists(key: string): Promise<boolean>;

  // Agent Communication
  call(agent: string, tool: string, params: any): Promise<any>;
  broadcast(event: string, data: any): Promise<void>;

  // Permissions
  checkPermission(agent: string, action: string, resource: string): Promise<boolean>;
  grantPermission(agent: string, permission: Permission): Promise<void>;

  // Phase Management
  transitionPhase(newPhase: string): Promise<void>;
  getCurrentPhase(): string;

  // Audit
  getAuditLog(filters?: AuditFilter): Promise<AuditEntry[]>;
}
```

#### Phase-Based Permissions
```javascript
phasePermissions = {
  building: {
    parser: {
      reads: ['raw_input'],
      writes: ['parsed_data'],
      preserves: ['raw_input']
    },
    sag: {
      reads: ['parsed_data'],
      writes: ['scenario_outline'],
      preserves: ['parsed_data']
    },
    validator: {
      reads: ['*'],
      writes: ['validation_warnings'],
      preserves: ['*']  // Can't modify data
    }
  },
  reviewing: {
    user: {
      reads: ['*'],
      writes: ['user_modifications'],
      preserves: ['*']
    },
    recalibrator: {
      reads: ['*'],
      writes: ['recalibrated_settings'],
      preserves: ['proposed_settings']
    }
  },
  finalized: {
    finalizer: {
      reads: ['*'],
      writes: ['simulation_blueprint'],
      preserves: ['*']
    },
    '*': {
      reads: ['simulation_blueprint'],
      writes: [],
      preserves: ['*']  // Read-only after finalize
    }
  },
  runtime: {
    director: {
      reads: ['simulation_blueprint'],
      writes: ['director_state'],
      preserves: ['*']
    },
    actor: {
      reads: ['simulation_blueprint', 'director_state'],
      writes: ['responses'],
      preserves: ['*']
    }
  }
};
```

### Agent Architecture

All agents extend a base class and communicate only via protocol:

```javascript
class BaseAgent {
  constructor(protocol, config) {
    this.protocol = protocol;
    this.config = config;
    this.agentId = config.agentId;
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  // Each agent gets fresh OpenAI context
  async llmComplete(messages, model = 'gpt-4') {
    return await this.openai.chat.completions.create({
      model,
      messages,
      ...this.config.llmOptions
    });
  }

  // Protocol operations with automatic agent ID injection
  async read(key) {
    return await this.protocol.read(key);
  }

  async write(key, value) {
    return await this.protocol.write(key, value, this.agentId);
  }

  async call(agent, tool, params) {
    return await this.protocol.call(agent, tool, params);
  }

  // Abstract method - each agent implements
  async execute(params) {
    throw new Error('Agent must implement execute()');
  }
}
```

### Data Flow

**Building Phase Flow:**
```
Raw Input (user)
    ↓ [protocol.write('raw_input', data)]
Parser Agent (reads: raw_input, writes: parsed_data)
    ↓ [protocol.write('parsed_data', result)]
SAG Agent (reads: parsed_data, writes: scenario_outline)
    ↓ [protocol.write('scenario_outline', outline)]
Validator Agent (reads: *, writes: validation_warnings)
    ↓ [protocol.transitionPhase('reviewing')]
User Review (reads: *, writes: user_modifications)
    ↓ [protocol.transitionPhase('finalized')]
Finalizer Agent (reads: *, writes: simulation_blueprint)
    ↓ [protocol.transitionPhase('runtime')]
Director/Actor (reads: simulation_blueprint, writes: state/responses)
```

**Key Difference from Phase 0:**
- Phase 0: `engine.processMessage()` → Direct database calls → Monolithic processing
- Stage 1: `protocol.call('actor', 'process', {})` → Protocol enforcement → Isolated agent

---

## 4. Build Order & Dependencies

### Week 1: Archive Phase 0 & Build MCP Core

#### Day 1-2: Archive & Setup
- [ ] **1.1**: Create `/packages/core/archive/` directory
- [ ] **1.2**: Move Phase 0 code to archive:
  - `simulation-engine.js` → `archive/simulation-engine.js`
  - `modules/actor-module.js` → `archive/actor-module.js`
  - `director-prototype.js` → `archive/director-prototype.js`
- [ ] **1.3**: Create new directory structure:
  ```
  packages/core/
  ├── archive/              # Phase 0 reference code
  ├── protocol/
  │   ├── interfaces/
  │   │   └── mcp-protocol.interface.ts
  │   ├── implementations/
  │   │   └── mcp-v1-simple.ts
  │   └── index.ts
  ├── agents/
  │   ├── base-agent.ts
  │   └── index.ts
  └── index.ts
  ```
- [ ] **1.4**: Update package.json dependencies (add TypeScript support)

#### Day 3-4: Protocol Implementation
- [ ] **1.5**: Implement `IMCPProtocol` interface (TypeScript)
- [ ] **1.6**: Implement `MCPProtocolV1` class with:
  - In-memory data store (for Week 1)
  - Phase management (building → reviewing → finalized → runtime)
  - Permission checking
  - Progressive enrichment (versioned writes)
  - Audit logging
- [ ] **1.7**: Implement `BaseAgent` class
- [ ] **1.8**: Write unit tests for protocol:
  - Permission enforcement
  - Phase transitions (one-way only)
  - Audit trail completeness
  - Progressive enrichment (no overwrites)

#### Day 5: Integration Tests
- [ ] **1.9**: Create mock agent for testing
- [ ] **1.10**: Test complete phase lifecycle:
  - building → reviewing → finalized → runtime
  - Verify permissions work correctly in each phase
- [ ] **1.11**: Test protocol operations:
  - read, write, delete, exists
  - call, broadcast
  - checkPermission, grantPermission

**Week 1 Deliverable**: Fully functional MCP protocol with tests (no agents yet)

---

### Week 2: Build Builder Pipeline Agents

#### Day 6-7: Parser Agent
- [ ] **2.1**: Create `ParserAgent` extending `BaseAgent`
- [ ] **2.2**: Wrap existing `scenario-parser.js` logic:
  - Read `raw_input` from protocol
  - Parse with OpenAI (existing logic)
  - Write `parsed_data` to protocol
- [ ] **2.3**: Update to use fresh OpenAI context (not shared)
- [ ] **2.4**: Add tests: Raw input → Parser → Verify parsed_data in protocol
- [ ] **2.5**: Register Parser Agent in protocol registry

#### Day 8-9: SAG Agent (NEW)
- [ ] **2.6**: Create `SAGAgent` extending `BaseAgent`
- [ ] **2.7**: Implement goal-oriented outline generation:
  - Read `parsed_data` from protocol
  - Generate scenario outline with:
    - goals (with success_criteria, progress_tracking, tests)
    - rules, encounters, lessons
    - actor_triggers, director_triggers
    - suggested_structure
    - adaptation_constraints
  - Write `scenario_outline` to protocol
- [ ] **2.8**: Use GPT-4 with structured output (JSON schema)
- [ ] **2.9**: Add tests: Parsed data → SAG → Verify outline structure
- [ ] **2.10**: Reference Phase 0 for business logic inspiration

#### Day 10: Validator Agent
- [ ] **2.11**: Create `ValidatorAgent` extending `BaseAgent`
- [ ] **2.12**: Wrap existing `translation-service.js`:
  - Read `scenario_outline` and `director_settings` from protocol
  - Validate with Zod schemas (existing shared-contracts)
  - Write `validation_warnings` to protocol
- [ ] **2.13**: Ensure read-only (cannot modify data, only add warnings)
- [ ] **2.14**: Add tests: Validate valid and invalid outlines

**Week 2 Deliverable**: Parser, SAG, Validator agents all working via protocol

---

### Week 3: Build Runtime Agents & Finalizer

#### Day 11-12: Finalizer Agent
- [ ] **3.1**: Create `FinalizerAgent` extending `BaseAgent`
- [ ] **3.2**: Implement blueprint creation:
  - Read all data from protocol (outline, settings, actors, etc.)
  - Create immutable `simulation_blueprint` object
  - Write `simulation_blueprint` to protocol
  - Trigger phase transition to `runtime`
- [ ] **3.3**: Add tests: Full data → Finalizer → Verify blueprint immutability

#### Day 13-14: Director Agent
- [ ] **3.4**: Create `DirectorAgent` extending `BaseAgent`
- [ ] **3.5**: Port logic from `archive/director-prototype.js`:
  - Read `simulation_blueprint` from protocol
  - Initialize director state
  - Implement evaluation logic (every N messages)
  - Write `director_state` to protocol
- [ ] **3.6**: Ensure fresh OpenAI context (isolated from Actor)
- [ ] **3.7**: Add tests: Blueprint → Director evaluation → State updates

#### Day 15: Actor Agent
- [ ] **3.8**: Create `ActorAgent` extending `BaseAgent`
- [ ] **3.9**: Port logic from `archive/actor-module.js`:
  - Read `simulation_blueprint` and `director_state` from protocol
  - Process student message
  - Generate AI response
  - Write `response` to protocol
- [ ] **3.10**: Ensure fresh OpenAI context (isolated from Director)
- [ ] **3.11**: Add tests: Student message → Actor → Verify response

**Week 3 Deliverable**: All agents operational (Parser, SAG, Validator, Finalizer, Director, Actor)

---

### Week 4: API Integration & End-to-End Testing

#### Day 16-17: API Endpoints
- [ ] **4.1**: Create new router: `/packages/api/routers/mcp-builder-router.js`
- [ ] **4.2**: Implement builder pipeline endpoints:
  - `POST /api/mcp-builder/start` - Initialize protocol, store raw input
  - `POST /api/mcp-builder/parse` - Trigger Parser Agent
  - `POST /api/mcp-builder/generate-outline` - Trigger SAG Agent
  - `POST /api/mcp-builder/validate` - Trigger Validator Agent
  - `POST /api/mcp-builder/finalize` - Trigger Finalizer Agent
  - `GET /api/mcp-builder/state` - Get current protocol state
  - `GET /api/mcp-builder/audit-log` - Get audit trail
- [ ] **4.3**: Create runtime router: `/packages/api/routers/mcp-runtime-router.js`
- [ ] **4.4**: Implement runtime endpoints:
  - `POST /api/mcp-runtime/start-session` - Initialize runtime phase
  - `POST /api/mcp-runtime/student-message` - Trigger Director + Actor
  - `GET /api/mcp-runtime/session-state` - Get session state
- [ ] **4.5**: Update `server.js` to register new routers

#### Day 18-19: End-to-End Testing
- [ ] **4.6**: Create comprehensive E2E test: `test-mcp-pipeline.js`
- [ ] **4.7**: Test complete flow:
  1. POST raw input → Parser → Verify parsed_data
  2. Trigger SAG → Verify scenario_outline
  3. Trigger Validator → Verify validation results
  4. Trigger Finalizer → Verify blueprint creation
  5. Start runtime session → Verify phase transition
  6. Send student message → Verify Director evaluation + Actor response
  7. Verify audit log completeness
- [ ] **4.8**: Test phase permission enforcement:
  - Attempt writes in wrong phase → Verify rejection
  - Attempt unauthorized reads → Verify rejection
- [ ] **4.9**: Test progressive enrichment:
  - Verify all versions preserved
  - Verify latest pointers updated
- [ ] **4.10**: Performance testing:
  - Measure pipeline time (target: <60s)
  - Measure response time (target: <5s per message)

#### Day 20: Documentation & Handoff
- [ ] **4.11**: Update `SYSTEM_ARCHITECTURE.md` with MCP architecture
- [ ] **4.12**: Document all agent responsibilities
- [ ] **4.13**: Document protocol interface
- [ ] **4.14**: Create migration guide (Phase 0 → Stage 1)
- [ ] **4.15**: Mark Construction Plan as COMPLETE
- [ ] **4.16**: Archive this plan to `/docs/archive/construction-plans/`

**Week 4 Deliverable**: Complete MCP architecture, fully tested, documented, ready for production

---

## 5. Implementation Details

### Component 1: MCP Protocol Core (`/packages/core/protocol/`)

**Files:**
- `interfaces/mcp-protocol.interface.ts` (~50 lines)
- `implementations/mcp-v1-simple.ts` (~400 lines)
- `index.ts` (~20 lines)

**Key Implementation:**
```typescript
class MCPProtocolV1 implements IMCPProtocol {
  private data: Map<string, any>;
  private phase: Phase;
  private auditLog: AuditEntry[];
  private phasePermissions: PhasePermissions;

  async write(key: string, value: any, agentId: string): Promise<void> {
    // Check permissions
    const canWrite = await this.checkPermission(agentId, 'write', key);
    if (!canWrite) {
      throw new PermissionDeniedError(`${agentId} cannot write ${key} in ${this.phase}`);
    }

    // Progressive enrichment
    const permissions = this.phasePermissions[this.phase][agentId];
    if (permissions.preserves?.includes(key) || permissions.preserves?.includes('*')) {
      // Store versioned
      this.data.set(`${key}_v${Date.now()}`, value);
      this.data.set(`${key}_latest`, value);
    } else {
      // Direct overwrite
      this.data.set(key, value);
    }

    // Audit log
    this.auditLog.push({
      timestamp: Date.now(),
      phase: this.phase,
      agent: agentId,
      action: 'write',
      key,
      value_hash: this.hash(value)
    });
  }

  async transitionPhase(newPhase: Phase): Promise<void> {
    const validTransitions = {
      building: ['reviewing'],
      reviewing: ['finalized'],
      finalized: ['runtime'],
      runtime: []  // Terminal
    };

    if (!validTransitions[this.phase].includes(newPhase)) {
      throw new InvalidPhaseTransitionError(`Cannot go from ${this.phase} to ${newPhase}`);
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

---

### Component 2: Base Agent (`/packages/core/agents/base-agent.ts`)

**File:** `base-agent.ts` (~150 lines)

**Key Implementation:**
```typescript
abstract class BaseAgent {
  protected protocol: IMCPProtocol;
  protected config: AgentConfig;
  protected agentId: string;
  protected openai: OpenAI;

  constructor(protocol: IMCPProtocol, config: AgentConfig) {
    this.protocol = protocol;
    this.config = config;
    this.agentId = config.agentId;
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  // Fresh OpenAI context for each agent
  protected async llmComplete(
    messages: ChatMessage[],
    model: string = 'gpt-4',
    options?: CompletionOptions
  ): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.max_tokens ?? 4000,
      ...options
    });

    return response.choices[0].message.content;
  }

  // Protocol wrapper methods (automatic agent ID injection)
  protected async read(key: string): Promise<any> {
    return await this.protocol.read(key);
  }

  protected async write(key: string, value: any): Promise<void> {
    return await this.protocol.write(key, value, this.agentId);
  }

  protected async call(agent: string, tool: string, params: any): Promise<any> {
    return await this.protocol.call(agent, tool, params);
  }

  protected async broadcast(event: string, data: any): Promise<void> {
    return await this.protocol.broadcast(event, data);
  }

  // Abstract method - each agent must implement
  abstract execute(params?: any): Promise<any>;
}
```

---

### Component 3: SAG Agent (`/packages/core/agents/sag-agent.ts`)

**File:** `sag-agent.ts` (~350 lines)

**Responsibilities:**
- Read `parsed_data` from protocol
- Generate goal-oriented scenario outline
- Write `scenario_outline` to protocol
- Broadcast `outline_ready` event

**Key Logic:**
```typescript
class SAGAgent extends BaseAgent {
  async execute(): Promise<ScenarioOutline> {
    // Read from protocol
    const parsedData = await this.read('parsed_data');
    const settings = await this.read('simulation_settings');

    // Generate outline
    const outline = await this.generateGoalOrientedOutline(parsedData, settings);

    // Validate with schema
    const validated = ScenarioOutlineSchema.parse(outline);

    // Write to protocol
    await this.write('scenario_outline', validated);

    // Notify
    await this.broadcast('outline_ready', { id: validated.id });

    return validated;
  }

  private async generateGoalOrientedOutline(
    parsedData: ParsedData,
    settings: SimulationSettings
  ): Promise<ScenarioOutline> {
    const prompt = this.buildSAGPrompt(parsedData, settings);

    const response = await this.llmComplete(
      [
        { role: 'system', content: this.systemPrompt },
        { role: 'user', content: prompt }
      ],
      'gpt-4',  // SAG requires GPT-4 for quality
      {
        response_format: {
          type: 'json_schema',
          json_schema: OutlineSchema
        }
      }
    );

    return JSON.parse(response);
  }

  private buildSAGPrompt(parsed: ParsedData, settings: SimulationSettings): string {
    return `
Generate a goal-oriented scenario outline from this parsed data.

PHILOSOPHY:
- Focus on WHAT to achieve (goals, rules, triggers, encounters, lessons, tests)
- Avoid rigid sequencing unless explicit dependencies exist
- Allow Director agency to structure narrative based on progress

PARSED DATA:
${JSON.stringify(parsed, null, 2)}

SETTINGS:
${JSON.stringify(settings, null, 2)}

OUTPUT STRUCTURE:
{
  goals: [/* with success_criteria, progress_tracking, tests */],
  rules: [/* Socratic method, document usage */],
  encounters: [/* events Director can introduce */],
  lessons: [/* key learning points */],
  actor_triggers: [/* when actors should act */],
  director_triggers: [/* when Director should intervene */],
  suggested_structure: {/* beginning, middle, end guidance */},
  adaptation_constraints: {/* what Director can/cannot do */}
}
    `.trim();
  }
}
```

---

### Component 4: Director Agent (`/packages/core/agents/director-agent.ts`)

**File:** `director-agent.ts` (~300 lines)

**Responsibilities:**
- Read `simulation_blueprint` from protocol
- Evaluate conversation progress every N messages
- Update `director_state` in protocol
- Decide interventions (encounters, tone adjustments)

**Key Differences from Phase 0:**
- Fresh OpenAI context (not shared with Actor)
- Reads from protocol, not database
- Writes state to protocol (protocol handles DB persistence)

**Key Logic:**
```typescript
class DirectorAgent extends BaseAgent {
  async execute(params: DirectorEvalParams): Promise<DirectorDecision> {
    // Read from protocol
    const blueprint = await this.read('simulation_blueprint');
    const currentState = await this.read('director_state') || this.initializeState(blueprint);
    const conversationHistory = params.conversationHistory;

    // Should we evaluate?
    if (!this.shouldEvaluate(currentState, conversationHistory, blueprint.director_settings)) {
      return { action: 'none', reasoning: 'Not time to evaluate yet' };
    }

    // Run evaluation
    const decision = await this.evaluateProgress(
      blueprint,
      currentState,
      conversationHistory
    );

    // Update state
    const updatedState = this.updateState(currentState, decision, conversationHistory);
    await this.write('director_state', updatedState);

    return decision;
  }

  private async evaluateProgress(
    blueprint: SimulationBlueprint,
    state: DirectorState,
    history: Message[]
  ): Promise<DirectorDecision> {
    const prompt = this.buildEvaluationPrompt(blueprint, state, history);

    const response = await this.llmComplete(
      [
        { role: 'system', content: this.directorSystemPrompt },
        { role: 'user', content: prompt }
      ],
      'gpt-3.5-turbo',  // Director uses GPT-3.5 (cost optimization)
      { response_format: { type: 'json_object' } }
    );

    return JSON.parse(response);
  }
}
```

---

### Component 5: Actor Agent (`/packages/core/agents/actor-agent.ts`)

**File:** `actor-agent.ts` (~400 lines)

**Responsibilities:**
- Read `simulation_blueprint` and `director_state` from protocol
- Process student message
- Generate AI response following Director guidance
- Write response to protocol

**Key Differences from Phase 0:**
- Fresh OpenAI context (not shared with Director)
- Reads from protocol, not database
- Implements Director decisions (tone, encounters, interventions)

**Key Logic:**
```typescript
class ActorAgent extends BaseAgent {
  async execute(params: ActorProcessParams): Promise<ActorResponse> {
    // Read from protocol
    const blueprint = await this.read('simulation_blueprint');
    const directorState = await this.read('director_state');
    const studentMessage = params.studentMessage;
    const conversationHistory = params.conversationHistory;

    // Build system prompt with Director guidance
    const systemPrompt = this.buildSystemPrompt(
      blueprint,
      directorState,
      conversationHistory
    );

    // Generate response
    const aiResponse = await this.llmComplete(
      [
        { role: 'system', content: systemPrompt },
        ...this.formatHistory(conversationHistory),
        { role: 'user', content: studentMessage }
      ],
      'gpt-4',  // Actor uses GPT-4 for quality
      {
        temperature: blueprint.parameters.narrative_freedom ?? 0.7,
        max_tokens: 500
      }
    );

    // Write response
    await this.write('actor_response', {
      message: aiResponse,
      timestamp: Date.now(),
      metadata: {
        director_interventions: directorState?.pending_interventions ?? [],
        triggers_activated: this.evaluateTriggers(blueprint, studentMessage, conversationHistory)
      }
    });

    return {
      message: aiResponse,
      metadata: { /* ... */ }
    };
  }

  private buildSystemPrompt(
    blueprint: SimulationBlueprint,
    directorState: DirectorState,
    history: Message[]
  ): string {
    let prompt = `You are an AI advisor in a business simulation.

SCENARIO:
${blueprint.scenario_text}

LEARNING OBJECTIVES:
${blueprint.goals.map(g => `- ${g.description}`).join('\n')}

SOCRATIC METHOD RULES:
${blueprint.rules.join('\n')}

CURRENT ACTORS:
${this.formatActors(blueprint.actors)}
`;

    // Inject Director interventions
    if (directorState?.pending_interventions?.length) {
      prompt += `\n\nDIRECTOR GUIDANCE:\n`;
      for (const intervention of directorState.pending_interventions) {
        prompt += `- ${intervention.action}: ${intervention.reasoning}\n`;
      }
    }

    return prompt;
  }
}
```

---

### Component 6: MCP Builder Router (`/packages/api/routers/mcp-builder-router.js`)

**File:** `mcp-builder-router.js` (~250 lines)

**Endpoints:**

```javascript
const express = require('express');
const router = express.Router();
const { MCPProtocolV1 } = require('@windo/core/protocol');
const { ParserAgent, SAGAgent, ValidatorAgent, FinalizerAgent } = require('@windo/core/agents');

// Store active protocols (in production, use Redis)
const activeProtocols = new Map();

// POST /api/mcp-builder/start
router.post('/start', async (req, res) => {
  try {
    const { raw_input, simulation_settings } = req.body;

    // Initialize protocol
    const protocol = new MCPProtocolV1();
    const sessionId = generateSessionId();
    activeProtocols.set(sessionId, protocol);

    // Store initial data
    await protocol.write('raw_input', raw_input, 'user');
    await protocol.write('simulation_settings', simulation_settings, 'user');

    res.json({
      success: true,
      sessionId,
      phase: protocol.getCurrentPhase()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/mcp-builder/parse
router.post('/parse', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const protocol = activeProtocols.get(sessionId);
    if (!protocol) throw new Error('Session not found');

    // Run Parser Agent
    const parser = new ParserAgent(protocol, { agentId: 'parser' });
    const result = await parser.execute();

    res.json({
      success: true,
      parsed_data: result,
      phase: protocol.getCurrentPhase()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/mcp-builder/generate-outline
router.post('/generate-outline', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const protocol = activeProtocols.get(sessionId);
    if (!protocol) throw new Error('Session not found');

    // Run SAG Agent
    const sag = new SAGAgent(protocol, { agentId: 'sag' });
    const outline = await sag.execute();

    res.json({
      success: true,
      scenario_outline: outline,
      phase: protocol.getCurrentPhase()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/mcp-builder/validate
router.post('/validate', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const protocol = activeProtocols.get(sessionId);
    if (!protocol) throw new Error('Session not found');

    // Run Validator Agent
    const validator = new ValidatorAgent(protocol, { agentId: 'validator' });
    const validation = await validator.execute();

    res.json({
      success: true,
      validation,
      phase: protocol.getCurrentPhase()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/mcp-builder/finalize
router.post('/finalize', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const protocol = activeProtocols.get(sessionId);
    if (!protocol) throw new Error('Session not found');

    // Run Finalizer Agent
    const finalizer = new FinalizerAgent(protocol, { agentId: 'finalizer' });
    const blueprint = await finalizer.execute();

    // Transition to runtime phase
    await protocol.transitionPhase('runtime');

    res.json({
      success: true,
      simulation_blueprint: blueprint,
      phase: protocol.getCurrentPhase()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/mcp-builder/state
router.get('/state/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const protocol = activeProtocols.get(sessionId);
    if (!protocol) throw new Error('Session not found');

    const state = {
      phase: protocol.getCurrentPhase(),
      data: await protocol.read('*'),  // Get all data
      audit_log: await protocol.getAuditLog()
    };

    res.json({ success: true, state });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

---

## 6. Testing Strategy

### Unit Tests

**Protocol Tests** (`/packages/core/protocol/__tests__/mcp-protocol.test.ts`)
```typescript
describe('MCPProtocolV1', () => {
  test('enforces phase-based permissions', async () => {
    const protocol = new MCPProtocolV1();

    // Building phase - parser can write parsed_data
    await expect(
      protocol.write('parsed_data', {}, 'parser')
    ).resolves.not.toThrow();

    // Building phase - parser cannot write scenario_outline
    await expect(
      protocol.write('scenario_outline', {}, 'parser')
    ).rejects.toThrow(PermissionDeniedError);
  });

  test('prevents backwards phase transitions', async () => {
    const protocol = new MCPProtocolV1();
    await protocol.transitionPhase('reviewing');

    await expect(
      protocol.transitionPhase('building')
    ).rejects.toThrow(InvalidPhaseTransitionError);
  });

  test('progressive enrichment preserves all versions', async () => {
    const protocol = new MCPProtocolV1();

    await protocol.write('parsed_data', { v: 1 }, 'parser');
    await protocol.write('parsed_data', { v: 2 }, 'parser');

    const versions = await protocol.read('parsed_data_*');
    expect(versions).toHaveLength(2);
    expect(await protocol.read('parsed_data_latest')).toEqual({ v: 2 });
  });

  test('audit log captures all writes', async () => {
    const protocol = new MCPProtocolV1();

    await protocol.write('key1', 'value1', 'agent1');
    await protocol.write('key2', 'value2', 'agent2');

    const log = await protocol.getAuditLog();
    expect(log).toHaveLength(2);
    expect(log[0]).toMatchObject({
      agent: 'agent1',
      action: 'write',
      key: 'key1'
    });
  });
});
```

**Agent Tests** (`/packages/core/agents/__tests__/*.test.ts`)
```typescript
describe('SAGAgent', () => {
  test('generates valid scenario outline from parsed data', async () => {
    const mockProtocol = new MockMCPProtocol();
    await mockProtocol.write('parsed_data', sampleParsedData, 'test');

    const sag = new SAGAgent(mockProtocol, { agentId: 'sag' });
    const outline = await sag.execute();

    expect(outline).toHaveProperty('goals');
    expect(outline.goals[0]).toHaveProperty('success_criteria');
    expect(outline.goals[0]).toHaveProperty('progress_tracking');

    // Verify written to protocol
    const written = await mockProtocol.read('scenario_outline');
    expect(written).toEqual(outline);
  });
});
```

### Integration Tests

**Builder Pipeline Test** (`/packages/api/__tests__/mcp-pipeline.test.js`)
```javascript
describe('MCP Builder Pipeline', () => {
  test('complete flow: raw input to blueprint', async () => {
    // 1. Start session
    let response = await request(app)
      .post('/api/mcp-builder/start')
      .send({
        raw_input: sampleRawInput,
        simulation_settings: sampleSettings
      });

    const { sessionId } = response.body;
    expect(response.body.phase).toBe('building');

    // 2. Parse
    response = await request(app)
      .post('/api/mcp-builder/parse')
      .send({ sessionId });

    expect(response.body.success).toBe(true);
    expect(response.body.parsed_data).toBeDefined();

    // 3. Generate outline
    response = await request(app)
      .post('/api/mcp-builder/generate-outline')
      .send({ sessionId });

    expect(response.body.scenario_outline).toBeDefined();

    // 4. Validate
    response = await request(app)
      .post('/api/mcp-builder/validate')
      .send({ sessionId });

    expect(response.body.validation.valid).toBe(true);

    // 5. Finalize
    response = await request(app)
      .post('/api/mcp-builder/finalize')
      .send({ sessionId });

    expect(response.body.simulation_blueprint).toBeDefined();
    expect(response.body.phase).toBe('runtime');

    // 6. Verify audit log
    response = await request(app)
      .get(`/api/mcp-builder/state/${sessionId}`);

    const auditLog = response.body.state.audit_log;
    expect(auditLog.length).toBeGreaterThan(5);
    expect(auditLog.some(e => e.agent === 'parser')).toBe(true);
    expect(auditLog.some(e => e.agent === 'sag')).toBe(true);
  });
});
```

### End-to-End Tests

**Full Simulation Flow** (`/test/e2e/mcp-full-simulation.test.js`)
```javascript
test('raw input to student conversation', async () => {
  // Build phase
  const sessionId = await buildSimulation(sampleInput);

  // Runtime phase
  const runtimeSession = await startRuntimeSession(sessionId);

  // Student interaction
  const response1 = await sendStudentMessage(runtimeSession, "What should I do first?");
  expect(response1.message).toBeDefined();

  // Verify Director evaluated
  const state = await getSessionState(runtimeSession);
  expect(state.director_state).toBeDefined();
  expect(state.director_state.last_evaluated_message).toBeGreaterThan(0);

  // Continue conversation
  const response2 = await sendStudentMessage(runtimeSession, "Why is that important?");
  expect(response2.message).toBeDefined();

  // Verify audit trail
  const auditLog = await getAuditLog(sessionId);
  expect(auditLog).toContainEntries(['parser', 'sag', 'validator', 'finalizer', 'director', 'actor']);
});
```

### Performance Tests

```javascript
test('pipeline completes within 60 seconds', async () => {
  const startTime = Date.now();

  const sessionId = await buildSimulation(sampleInput);

  const duration = Date.now() - startTime;
  expect(duration).toBeLessThan(60000);
});

test('student message response within 5 seconds', async () => {
  const session = await startRuntimeSession(existingBlueprint);

  const startTime = Date.now();
  await sendStudentMessage(session, "Test message");
  const duration = Date.now() - startTime;

  expect(duration).toBeLessThan(5000);
});
```

---

## 7. Known Risks

### High Priority Risks

**R1: Agent Context Pollution**
- **Risk**: Even with separate agent classes, OpenAI contexts might leak if not properly isolated
- **Mitigation**: Each agent instantiates its own `OpenAI` client; test context isolation
- **Contingency**: If pollution occurs, implement context clearing between calls

**R2: Protocol Performance Bottleneck**
- **Risk**: All data flowing through protocol might add latency
- **Mitigation**: Benchmark protocol operations; optimize hot paths
- **Contingency**: Implement protocol caching for read-heavy operations

**R3: Phase Transition Bugs**
- **Risk**: One-way phase transitions are critical; bugs could corrupt state
- **Mitigation**: Comprehensive testing of all transition paths
- **Contingency**: Implement phase rollback mechanism (emergency only)

**R4: Migration Complexity**
- **Risk**: Phase 0 → Stage 1 migration might break existing simulations
- **Mitigation**: Keep Phase 0 running in parallel during Week 1-2; gradual cutover
- **Contingency**: Rollback plan if critical bugs found

### Medium Priority Risks

**R5: API Compatibility**
- **Risk**: New MCP endpoints might break existing Web UI
- **Mitigation**: Maintain backward-compatible wrapper endpoints during transition
- **Contingency**: Feature flag to toggle between Phase 0 and Stage 1 backends

**R6: Testing Coverage Gaps**
- **Risk**: Complex protocol interactions might have untested edge cases
- **Mitigation**: Property-based testing for protocol; mutation testing for agents
- **Contingency**: Gradual rollout with monitoring; quick rollback capability

**R7: TypeScript Integration**
- **Risk**: Adding TypeScript to Node.js project might cause build issues
- **Mitigation**: Use ts-node for development; ensure build scripts work
- **Contingency**: Revert to JavaScript if TypeScript causes blockers

### Low Priority Risks

**R8: Audit Log Storage**
- **Risk**: Audit logs might grow large and impact performance
- **Mitigation**: Implement log rotation; archive old logs
- **Contingency**: Disable audit logging for non-critical operations

**R9: Cost Optimization Complexity**
- **Risk**: Intelligent model routing might not save costs as expected
- **Mitigation**: Track actual costs vs. estimates; adjust routing rules
- **Contingency**: Simplify to fixed model assignments if routing overhead too high

---

## 8. Progress Tracking

### Week 1: Archive & Protocol Core
- [ ] Archive Phase 0 code (Tasks 1.1-1.4)
- [ ] Implement protocol interface and V1 (Tasks 1.5-1.8)
- [ ] Protocol unit tests (Tasks 1.9-1.11)
- **Milestone**: Protocol fully functional with tests passing

### Week 2: Builder Agents
- [ ] Parser Agent (Tasks 2.1-2.5)
- [ ] SAG Agent (Tasks 2.6-2.10)
- [ ] Validator Agent (Tasks 2.11-2.14)
- **Milestone**: Complete builder pipeline operational

### Week 3: Runtime Agents & Finalizer
- [ ] Finalizer Agent (Tasks 3.1-3.3)
- [ ] Director Agent (Tasks 3.4-3.7)
- [ ] Actor Agent (Tasks 3.8-3.11)
- **Milestone**: All agents implemented

### Week 4: Integration & Testing
- [ ] API endpoints (Tasks 4.1-4.5)
- [ ] End-to-end tests (Tasks 4.6-4.10)
- [ ] Documentation (Tasks 4.11-4.16)
- **Milestone**: Complete MCP architecture ready for production

### Daily Standup Questions
1. What did I complete yesterday?
2. What am I working on today?
3. Are there any blockers?
4. Am I on track for this week's milestone?

### Weekly Review Checklist
- [ ] All tasks for the week completed
- [ ] Tests passing (unit + integration)
- [ ] Code reviewed and merged
- [ ] Documentation updated
- [ ] Next week's tasks ready

---

## 9. Decisions Log

### Decision 1: Clean Break vs. Gradual Migration
**Date:** October 24, 2025
**Decision:** Clean break - archive Phase 0, rebuild with MCP
**Rationale:**
- Phase 0 validated Actor/Director pattern works
- MCP requires protocol-first design; compatibility layers would compromise architecture
- Faster development without maintaining two systems
- End-to-end testing forces validation of complete pipeline
**Alternatives Considered:**
- Gradual migration (rejected: too complex, compromise quality)
- Parallel systems (rejected: double maintenance burden)
**Status:** Approved

### Decision 2: TypeScript for Protocol Layer
**Date:** October 24, 2025
**Decision:** Use TypeScript for protocol and agents, JavaScript for API
**Rationale:**
- Protocol interface benefits from strong typing (safety, autocomplete)
- Agents benefit from type safety with complex data structures
- API can remain JavaScript (less critical, faster iteration)
**Alternatives Considered:**
- Full TypeScript conversion (rejected: too much scope for this phase)
- Full JavaScript (rejected: lose type safety benefits for critical protocol)
**Status:** Approved

### Decision 3: In-Memory Protocol Storage (Week 1-3)
**Date:** October 24, 2025
**Decision:** Week 1-3 use in-memory Map; Week 4 add database persistence
**Rationale:**
- Simplifies initial development and testing
- Protocol interface unchanged when adding persistence
- Allows focus on protocol logic before persistence complexity
**Alternatives Considered:**
- Database from day 1 (rejected: premature optimization, slower development)
- Never persist (rejected: data loss on server restart)
**Status:** Approved

### Decision 4: GPT Model Assignments
**Date:** October 24, 2025
**Decision:**
- Parser: GPT-3.5-turbo (fast, cheap, sufficient for extraction)
- SAG: GPT-4 (complex reasoning, quality critical)
- Validator: GPT-3.5-turbo (rule-based, speed matters)
- Director: GPT-3.5-turbo (frequent calls, cost matters)
- Actor: GPT-4 (student-facing, quality critical)
**Rationale:**
- Balance quality vs. cost
- Student-facing quality is paramount (Actor)
- Internal processing can be cheaper (Parser, Validator, Director)
**Alternatives Considered:**
- All GPT-4 (rejected: 20x more expensive, unnecessary for some tasks)
- All GPT-3.5 (rejected: quality degradation for complex tasks)
**Status:** Approved

### Decision 5: Phase Transition Mechanism
**Date:** October 24, 2025
**Decision:** One-way phase transitions enforced by protocol
**Rationale:**
- Prevents accidental data corruption (can't go back to building after runtime starts)
- Clear state machine (building → reviewing → finalized → runtime)
- Audit trail integrity (can't modify past phases)
**Alternatives Considered:**
- Bidirectional transitions (rejected: data corruption risk)
- No phase enforcement (rejected: security and audit concerns)
**Status:** Approved

---

## Appendix A: File Structure After Completion

```
windo/
├── packages/
│   ├── core/
│   │   ├── archive/                          # Phase 0 reference code
│   │   │   ├── simulation-engine.js
│   │   │   ├── actor-module.js
│   │   │   └── director-prototype.js
│   │   ├── protocol/
│   │   │   ├── interfaces/
│   │   │   │   └── mcp-protocol.interface.ts (~50 lines)
│   │   │   ├── implementations/
│   │   │   │   └── mcp-v1-simple.ts          (~400 lines)
│   │   │   ├── __tests__/
│   │   │   │   └── mcp-protocol.test.ts      (~200 lines)
│   │   │   └── index.ts                      (~20 lines)
│   │   ├── agents/
│   │   │   ├── base-agent.ts                 (~150 lines)
│   │   │   ├── parser-agent.ts               (~250 lines)
│   │   │   ├── sag-agent.ts                  (~350 lines)
│   │   │   ├── validator-agent.ts            (~200 lines)
│   │   │   ├── finalizer-agent.ts            (~150 lines)
│   │   │   ├── director-agent.ts             (~300 lines)
│   │   │   ├── actor-agent.ts                (~400 lines)
│   │   │   ├── __tests__/
│   │   │   │   ├── parser-agent.test.ts
│   │   │   │   ├── sag-agent.test.ts
│   │   │   │   └── ...
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── api/
│   │   ├── routers/
│   │   │   ├── mcp-builder-router.js         (~250 lines, NEW)
│   │   │   ├── mcp-runtime-router.js         (~200 lines, NEW)
│   │   │   ├── translation-router.js         (existing)
│   │   │   ├── student-router.js             (existing)
│   │   │   ├── professor-router.js           (existing)
│   │   │   ├── simulation-router.js          (existing)
│   │   │   └── health-router.js              (existing)
│   │   ├── services/
│   │   │   ├── translation-service.js        (existing - becomes Validator wrapper)
│   │   │   ├── document-processor.js         (existing)
│   │   │   └── scenario-parser.js            (existing - becomes Parser wrapper)
│   │   ├── __tests__/
│   │   │   └── mcp-pipeline.test.js          (~300 lines, NEW)
│   │   ├── server.js                         (updated with MCP routers)
│   │   └── package.json
│   │
│   └── shared-contracts/                     (unchanged)
│       └── src/schemas/
│
├── test/
│   └── e2e/
│       └── mcp-full-simulation.test.js       (~200 lines, NEW)
│
├── docs/
│   └── archive/
│       └── construction-plans/
│           └── CONSTRUCTION_PLAN_PHASE_0.md  (archived)
│
├── SYSTEM_ARCHITECTURE.md                    (updated for MCP)
├── CONSTRUCTION_PLAN_MCP_REFACTOR.md         (this file)
└── TECHNICAL_VISION_ROADMAP.md               (updated - Stage 1 complete)
```

**Total New Lines of Code Estimate:**
- Protocol: ~670 lines (interfaces + implementation + tests)
- Agents: ~2,000 lines (7 agents + base + tests)
- API: ~750 lines (2 routers + tests + E2E)
- **Total: ~3,420 new lines**

**Removed Lines (to archive):**
- Phase 0 code: ~1,500 lines (archived, not deleted)

**Net Change: +1,920 lines** (cleaner, more maintainable, protocol-first)

---

## Appendix B: Quick Reference

### Starting Development

```bash
# Install dependencies
npm install

# Install TypeScript (if not already)
npm install -D typescript ts-node @types/node

# Run tests
npm test

# Start API server
npm run api

# Start web UI
cd apps/web && npm run dev
```

### Running Tests

```bash
# Protocol tests
cd packages/core && npm test protocol

# Agent tests
cd packages/core && npm test agents

# API integration tests
cd packages/api && npm test

# E2E tests
npm run test:e2e
```

### Common Commands

```bash
# Archive Phase 0 code
git mv packages/core/simulation-engine.js packages/core/archive/

# Create new agent
npm run create-agent <agent-name>

# Run specific test
npm test -- --testPathPattern=mcp-protocol

# Build TypeScript
cd packages/core && npm run build
```

### Debugging

```bash
# Enable protocol debug logging
DEBUG=protocol:* npm run api

# Enable agent debug logging
DEBUG=agent:* npm run api

# View audit log
curl http://localhost:3000/api/mcp-builder/state/<sessionId> | jq .state.audit_log
```

---

**END OF CONSTRUCTION PLAN**

This plan will be marked COMPLETE and archived to `/docs/archive/construction-plans/` when all tasks are finished and Stage 1 MCP architecture is production-ready.
