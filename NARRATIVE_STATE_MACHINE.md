# Narrative State Machine (NSM)

## Purpose
The Narrative State Machine introduces a two-layer orchestration system that guides simulations toward learning objectives while preserving student agency. It augments the existing stateless `SimulationEngine` (actor layer) with a Director layer that continuously analyzes conversation dynamics, adjusts arc progression, and issues targeted instructions to AI actors in real time.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          Human Participants                                   │
│                    (Students, Professors, Observers)                         │
└───────────────▲──────────────────────────────────────────────────────────────┘
                │
                │  Student messages, context
                │
┌───────────────┴──────────────────────────────────────────────────────────────┐
│                        LAYER 1: ACTOR ENGINE                                 │
│                      (Existing SimulationEngine)                             │
│  - Generates in-character responses                                          │
│  - Honors goals, triggers, and personality                                  │
│  - Executes Director instructions                                           │
│  - Emits conversation events & metadata                                     │
└───────────────▲──────────────────────────────────────────────────────────────┘
                │ Actor guidance, adjusted arc
                │
┌───────────────┴──────────────────────────────────────────────────────────────┐
│                        LAYER 2: DIRECTOR AI                                  │
│                 (Narrative State Machine Controller)                         │
│  - Reads student behavior & objective progress                              │
│  - Maintains adaptive scenario arc                                          │
│  - Schedules events & phase transitions                                     │
│  - Issues instructions to Actor Engine                                      │
│  - Logs interventions for analytics                                         │
└───────────────▲──────────────────────────────────────────────────────────────┘
                │
                │  Simulation configuration, learning objectives, behavior logs
                │
┌───────────────┴──────────────────────────────────────────────────────────────┐
│                     Data Models & Persistence (Supabase)                     │
└──────────────────────────────────────────────────────────────────────────────┘

## Design Principles
1. **Dual Intelligence:** Separate meta-planning (Director) from moment-to-moment dialog (Actor), inspired by Inworld's stateful characters, AI Dungeon's director/storyteller split, and Left 4 Dead's tension Director.
2. **Pedagogical Optimization:** Guide the conversation toward learning outcomes (Generative Agents' reflections + adaptive learning principles) without erasing student agency.
3. **Adaptive Narrative Arcs:** Use structured phases and events (AI Dungeon acts, Voiceflow branching) that can be reordered, stretched, or skipped based on Director assessments.
4. **Transparent Modularity:** Maintain existing `SimulationEngine` APIs; wrap them with Director logic to limit risk and enable incremental rollout.
5. **Explainability & Logging:** Capture Director rationale, interventions, and outcomes for debugging, professor visibility, and patent defensibility.

## Core Components
### 1. Scenario Arc Generator (Offline / Setup)
- Expands current setup flow (parser + manual edits) to produce `scenario_arc` structures using inputs: learning objectives, scenario text, actor data, duration, complexity, narrative freedom.
- Uses GPT-4 (or equivalent) to draft default phases, events, and pacing guards; professors can review/edit.
- Stores arc in `simulations.scenario_arc`.

### 2. Director Runtime (Online)
- Runs alongside `/api/student/respond`.
- Evaluates session context on configurable cadence (every *N* messages, on flagged triggers, or when objectives deviate).
- Generates `DirectorDecision` objects that mutate `current_arc` and emit `actor_guidance`.
- Uses GPT-3.5/GPT-4 depending on cost/performance (Director is lighter-weight analysis; actor remains GPT-4 initially).
- Writes adjustments to `simulation_sessions.arc_adjustments` and `simulations.current_arc`.

### 3. Actor Engine Integration
- Receives Director guidance via system-level prompt injections and metadata overrides (e.g., toggling active actors, revealing hidden info, tightening tone).
- Adds post-response verification loop: Director can veto/adjust actor output when it violates critical instructions (lightweight in v1).

### 4. Progress & Analytics
- Tracks learning objective coverage (`learning_progress`), phase completion, student divergence, and intervention effectiveness.
- Feeds professor dashboards and future recommendation loops.

### 5. Control Surfaces
- Professor-level settings: Director intensity (`off`, `assist`, `assertive`), pacing bias, allowable deviation, streaming preference.
- Simulation-level tolerances: `narrative_freedom`, `complexity`, custom heuristics per arc phase.

## Data Model & Schema
Extends Supabase tables with NSM-specific fields.

```sql
-- TABLE: simulations (additions)
ALTER TABLE simulations
  ADD COLUMN IF NOT EXISTS scenario_arc JSONB,        -- Authored/AI-generated arc blueprint
  ADD COLUMN IF NOT EXISTS current_arc JSONB,         -- Last Director-adjusted arc snapshot
  ADD COLUMN IF NOT EXISTS director_settings JSONB,   -- Overrides (intensity, cadence, allowed agents)
  ADD COLUMN IF NOT EXISTS director_notes JSONB;      -- Historical interventions (rolling window)

-- TABLE: simulation_sessions (additions)
ALTER TABLE simulation_sessions
  ADD COLUMN IF NOT EXISTS arc_adjustments JSONB,     -- Per-session adjustment log
  ADD COLUMN IF NOT EXISTS learning_progress JSONB,   -- Objective coverage timeline
  ADD COLUMN IF NOT EXISTS director_metrics JSONB,    -- Tension, divergence, latency, etc.
  ADD COLUMN IF NOT EXISTS director_state JSONB;      -- Last Director snapshot for quick resume
```

### Scenario Arc Blueprint (`scenario_arc`)
```jsonc
{
  "total_duration_minutes": 25,
  "pacing_policy": {
    "target_messages": 40,
    "complexity": "escalating",
    "narrative_freedom": 0.7
  },
  "phases": [
    {
      "id": "phase_intro",
      "name": "Context Building",
      "sequence": 1,
      "estimated_duration": { "minutes": 5, "messages": 8 },
      "entry_conditions": ["message_count >= 0"],
      "exit_conditions": [
        "student_demonstrates_understanding",
        "message_count >= 8"
      ],
      "ai_behavior": {
        "mode": "coach",
        "objective_focus": ["Strategic Thinking"],
        "tone": "supportive",
        "question_style": "open"
      },
      "actor_script": {
        "active_roles": ["CEO", "Student"],
        "hidden_info_policy": "withhold",
        "allowed_events": ["introduce_company_context"]
      },
      "learning_checks": [
        { "objective": "Strategic Thinking", "signal": "student articulates problem scope" }
      ],
      "fallback_plan": "If student stalls, prompt with board meeting urgency."
    },
    {
      "id": "phase_complication",
      "name": "Rising Tension",
      "sequence": 2,
      "estimated_duration": { "minutes": 10, "messages": 18 },
      "entry_conditions": [
        "objective_progress.Strategic Thinking >= 0.3",
        "or passage_of_time >= 7m"
      ],
      "ai_behavior": {
        "mode": "challenger",
        "tone": "probing",
        "question_style": "why/how challenges"
      },
      "actor_script": {
        "active_roles": ["CEO", "CFO", "Board Member"],
        "hidden_info_policy": "reveal_incremental",
        "allowed_events": [
          {
            "trigger": { "message_count": 15 },
            "action": "Board Member introduces funding concern",
            "goal_adjustments": {
              "Board Member": {
                "goals": ["Protect investment"],
                "loyalties": { "supports": ["CFO"], "opposes": [] }
              }
            }
          }
        ]
      },
      "learning_checks": [
        { "objective": "Risk Assessment", "signal": "student addresses downside scenarios" }
      ],
      "fallback_plan": "If student avoids conflict, Director summons CMO to surface tension."
    },
    {
      "id": "phase_decision",
      "name": "Critical Decision",
      "sequence": 3,
      "estimated_duration": { "minutes": 6, "messages": 9 },
      "entry_conditions": ["student acknowledges trade-offs", "message_count >= 26"],
      "decision_point": {
        "required": true,
        "prompt": "Summarize your recommendation with supporting rationale.",
        "accepted_formats": ["structured_summary", "multiple_choice"]
      },
      "ai_behavior": {
        "mode": "expert",
        "tone": "concise",
        "question_style": "confirmatory"
      },
      "actor_script": {
        "active_roles": ["All"],
        "hidden_info_policy": "fully_reveal"
      },
      "learning_checks": [
        { "objective": "Decision Making Under Uncertainty", "signal": "student weighs competing priorities" }
      ]
    },
    {
      "id": "phase_reflection",
      "name": "Reflection & Feedback",
      "sequence": 4,
      "estimated_duration": { "minutes": 4, "messages": 5 },
      "entry_conditions": ["decision_logged = true"],
      "ai_behavior": {
        "mode": "coach",
        "tone": "supportive",
        "question_style": "metacognitive"
      },
      "actor_script": {
        "active_roles": ["Mentor"],
        "hidden_info_policy": "n/a"
      },
      "learning_checks": [
        { "objective": "Systems Thinking", "signal": "student reflects on broader impact" }
      ],
      "exit_conditions": ["reflection_recorded"]
    }
  ]
}
```

### Director Settings (`director_settings`)
```jsonc
{
  "intensity": "assist",                  // off | assist | assertive
  "evaluation_cadence": {                 // Mixed triggers
    "message_interval": 5,
    "event_triggers": ["arc_divergence", "objective_regression"],
    "time_interval_seconds": 90
  },
  "learning_objective_targets": {
    "Strategic Thinking": { "threshold": 0.7, "priority": "high" },
    "Risk Assessment": { "threshold": 0.6, "priority": "medium" }
  },
  "allowed_actor_interventions": ["goal_shift", "enter_exit_actor", "hidden_info_reveal"],
  "max_latency_ms": 3500,
  "max_cost_per_decision": 0.02,          // to swap lower-cost model dynamically
  "verification_policy": {
    "enabled": true,
    "retry_limit": 1,
    "temperature_override": 0.2
  }
}
```

### Director State Snapshot (`director_state`)
```jsonc
{
  "last_evaluated_message": 20,
  "current_phase_id": "phase_complication",
  "tension_score": 0.62,                // 0–1 scale (Left 4 Dead style)
  "divergence_score": 0.15,             // 0: on track, 1: fully off-arc
  "objective_progress": {
    "Strategic Thinking": 0.45,
    "Risk Assessment": 0.20,
    "Decision Making Under Uncertainty": 0.05
  },
  "actor_engagement": {
    "CEO": { "talk_time": 0.35, "compliance": 0.8 },
    "CFO": { "talk_time": 0.25, "compliance": 0.9 }
  },
  "pending_events": [
    { "id": "event_growth_vs_cost", "scheduled_at_message": 22 }
  ],
  "notes": [
    "Student leaning hard into cost-cutting; plan to introduce growth counterpoint next turn."
  ]
}
```

### Director Decision Log (`arc_adjustments` entry)
```jsonc
[
  {
    "at_message": 15,
    "analysis": {
      "student_focus": "Cost reduction",
      "unique_direction": "Exploring aggressive layoffs",
      "should_allow_exploration": true,
      "engagement_level": "moderate"
    },
    "actions": {
      "phase_adjustments": [
        { "phase": "phase_complication", "new_estimated_duration": { "messages": 22 } }
      ],
      "actor_changes": [
        {
          "actor": "CFO",
          "new_goals": ["Balance cost control with growth opportunity"],
          "new_mode": "conflicted"
        }
      ],
      "scheduled_events": [
        {
          "id": "event_growth_vs_cost",
          "trigger": "next_message",
          "description": "Sales Head introduces pipeline opportunity"
        }
      ],
      "difficulty_adjustment": "maintain"
    },
    "director_note": "Allow brief exploration of layoffs, then surface growth trade-off."
  }
]
```

## Director Loop Workflow

1. **Intake:** On each `/student/respond`, API retrieves `simulation`, `session`, `scenario_arc`, `current_arc`, `director_state`, and new message.
2. **Actor Response First (Async Director):** Actor engine produces response immediately using latest guidance to maintain latency targets (<3s).
3. **Director Evaluation (async worker or background promise):**
   1. **Gather Signals:** new conversation snippet, metadata (trigger activations, actor compliance), objective heuristics (keyword spotting, rubric checks).
   2. **Analyze Behavior:** Use smaller model (e.g., GPT-3.5-turbo with JSON schema) to derive `StudentBehaviorAnalysis` (focus, misconceptions, engagement, divergence).
   3. **Reflect & Plan:** Feed analysis + current arc into planning prompt (LangGraph-inspired state evaluation) to decide adjustments; include previous `director_state` and `director_settings`. Output structured `DirectorDecision`.
   4. **Update State:** Apply decision to `current_arc`, update `director_state`, append to `arc_adjustments` & `director_notes`.
   5. **Schedule Guidance:** Store `actor_guidance` for next message: system prompt insertion, event injection, actor goal overrides.
4. **Next Student Turn:** When new `/student/respond` arrives:
   - Merge queued guidance with simulation payload before invoking actor engine.
   - Reset/advance `director_state` counters.
   - Optionally reconcile Director verification if previous actor output diverged.

### Pseudocode (API Flow)
```javascript
const director = new ArcDirector(simulation, session);

// Step 1: Retrieve pending guidance (if any) for immediate application
const guidance = await director.getPendingGuidance();

// Step 2: Actor response (low latency)
const aiResult = await engine.processMessage(
  director.applyGuidance(simulation, guidance),
  session.conversation_history,
  studentInput,
  documentContext
);

// Step 3: Persist actor output
await db.addMessageToSession(...);

// Step 4: Kick Director evaluation asynchronously
queueMicrotask(async () => {
  const decision = await director.evaluate(aiResult, studentInput);
  if (decision) {
    await director.persistDecision(decision);
  }
});
```

## Technology & Technique Synthesis
- **Inworld AI:** Multi-state actor configs (goals, emotions) inform our actor metadata schema. Director manipulates `goals`, `emotional bias` (via personality sliders) in real time.
- **Generative Agents (Stanford):** Director's `analysis → reflection → plan` loop mirrors memory stream + reflection process. Every *N* messages or high importance event triggers reflection to adjust future plans.
- **AI Dungeon Story Act Model:** Scenario arc phases map to acts. Director transitions phases when conditions met; each phase swaps system prompts for actor engine.
- **LangGraph:** Director uses an internal state graph (intro → exploration → decision → reflection) with conditional edges; implementation via explicit state machine or LangGraph-like library to manage transitions.
- **Voiceflow:** Visualizable flows align with `scenario_arc` structure, enabling future UI for professors to drag/drop phase nodes and event blocks.
- **Replica Relationship Levels:** Director tracks relationship scores between student and actors (proto in `director_metrics.actor_trust`). Unlocks deeper topics/behaviors when thresholds reached.
- **Left 4 Dead AI Director:** Tension score calculates based on recent conflict, frequency, and student stress signals; ensures ebb/flow (intensity modulation).
- **Adaptive Learning Systems:** Learning objective progress uses rubric heuristics (e.g., keywords, evaluation LLM) to ensure educational efficacy, not just entertainment.

## Compliance & Verification
1. **Instruction Insertion:** Director guidance inserted as high-priority system prompt (before actor persona). Example:
   ```
   🎬 DIRECTOR NOTE:
   Student over-indexing on layoffs. CFO must surface workforce morale risks.
   ```
2. **Actor Output Verification:** Lightweight post-check using cheaper model: “Did the response raise workforce morale concern?” If not, either re-roll or append corrective follow-up message.
3. **Escalation Policy:** After repeated actor non-compliance, Director may inject direct response snippet or temporarily elevate intensity (`assertive`).

## Performance & Cost Considerations
- **Async Processing:** Director evaluation off main request path; actor response remains primary UX driver.
- **Cadence Control:** Default every 5 messages; adjustable via `director_settings`. Event-based triggers for critical inflection points (e.g., student triggers "decision" keyword).
- **Model Selection:** Director analysis on GPT-3.5-turbo (json mode), Director planning on GPT-4o-mini or GPT-4 depending on intensity; actor stays GPT-4 for fidelity.
- **Caching & Streaming:** Reuse prior analyses for short intervals; adopt streaming actor responses to mask latency.

## Risks & Mitigations
- **Latency Stack-Up:** Director analysis plus actor generation can push response times beyond the 3–4s comfort zone.  
  *Mitigation:* Keep Director work asynchronous, stream actor replies immediately, and cache repetitive analyses/decisions.
- **Actor Non-Compliance:** Actor layer may ignore Director directives, eroding narrative coherence.  
  *Mitigation:* Inject high-priority system notes, run lightweight compliance checks, retry once at lower temperature, and escalate with explicit directives when necessary.
- **Operational Cost:** Running multiple LLM calls per turn increases spend.  
  *Mitigation:* Use lower-cost models for Director analysis, throttle cadence based on need, and bundle adjustments when possible.
- **Debug Complexity:** Two-layer orchestration can make failures hard to diagnose.  
  *Mitigation:* Persist director notes, expose debugging dashboards, and support session replay with decision logs.
- **Schema Drift:** Builder and NSM contracts might diverge, leading to runtime breakage.  
  *Mitigation:* Share typed interfaces, validate inputs at translation time, and add CI contract tests.

## Implementation Roadmap
1. **Phase 0 – Foundations**
   - Extend database schema (migrations).
   - Define TypeScript interfaces / JSON schemas (`DirectorSettings`, `ScenarioArc`, `DirectorState`, `DirectorDecision`).
   - Implement Arc Generator service (offline function + API endpoints).

2. **Phase 1 – Minimal Director (Assist Mode)**
   - Wrap `/student/respond` with async Director evaluation (message interval only).
   - Support limited actions: phase duration tweaks, single actor goal change, schedule one event.
   - Log decisions in Supabase, expose debug endpoint.

3. **Phase 2 – Adaptive Director**
   - Add objective tracking heuristics and divergence scoring.
   - Enable event scheduling and conditional phase skipping.
   - Introduce verification loop and professor intensity controls.

4. **Phase 3 – Advanced Orchestration**
   - Introduce tension modeling, dynamic actor entry/exit, relationship scores.
   - Provide UI visualizer (Voiceflow-style) and analytics dashboards.
   - Optimize latency via background workers / queue + streaming.

5. **Phase 4 – Multiplayer Extensions**
   - Extend arc schema to coordinate multiple student roles and shared decisions.
   - Director balances inter-role conflicts, consensus mechanisms, and asynchronous pacing.

## Safety & Transparency
- **Professor Debug Mode:** Toggle to view Director notes, objective coverage, intervention rationale in real time.
- **Student Transparency:** Optionally surface subtle cues (“let’s revisit the growth implications”) to avoid heavy-handed steering.
- **Fallback:** If Director fails or cost budget exceeded, system reverts to baseline actor behavior, preserving conversation continuity.

## Future Enhancements
- **Learning Analytics Loop:** Feed session outcomes back into Director’s planning prompts (meta-learning).
- **Auto-Testing:** Use Replay + Director to simulate varied student personas for regression testing.
- **Patent Support:** Document control flow, dual-layer orchestration, and pedagogical adaptation for provisional filing.

---

This NSM architecture preserves the strengths of the existing simulation stack while unlocking adaptive, pedagogically grounded narratives. By parameterizing the Director with existing simulation settings and layering best practices from gaming, conversational AI, and adaptive learning, we can deliver a unique, defensible experience that scales from single-player demos to multiplayer team simulations.
