# Simulation Builder V2

## Purpose
Simulation Builder V2 is the orchestration surface for authoring adaptive simulations that plug directly into the Narrative State Machine (NSM). It guides professors from raw inputs (text, thoughts, documents) through automated extraction, outline generation, configuration review, and deployment—while exposing how each decision shapes NSM Director and Actor behavior. V2 introduces translation, validation, and preview layers so the builder, NSM, and runtime analytics share a unified contract.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Simulation Builder UI                          │
│  • Guided input (text/chat/doc)   • Streaming AI feedback               │
│  • Outline & goal editor          • Simulation diff preview             │
│  • Director configuration         • Test harness (NSM sandbox)          │
└───────────────▲─────────────────────────────────────────────────────────┘
                │ React state, optimistic updates, AI streaming
┌───────────────┴─────────────────────────────────────────────────────────┐
│                 Builder Orchestration Services (API Layer)              │
│  1. Scenario Parser                                                     │
│  2. Scenario Arc Generator (SAG 2.0)                                    │
│  3. Auto-Tuning + Success Criteria Inference                            │
│  4. Translation Layer → NSM Contracts                                   │
│  5. Diff & Provenance Engine                                            │
└───────────────▲─────────────────────────────────────────────────────────┘
                │ Structured payloads (parsed_data, scenario_outline, …)
┌───────────────┴─────────────────────────────────────────────────────────┐
│         Supabase Persistence & Runtime Integration                      │
│  • simulations: scenario_outline, director_settings, actors, …          │
│  • sessions: arc_adjustments, learning_progress                         │
│  • analytics: diff history, author notes                                │
└─────────────────────────────────────────────────────────────────────────┘

## Design Principles
1. **Inference-First Authoring:** Minimize upfront cognitive load—let AI draft goals, success criteria, structures, and interventions, while instructors approve or refine.
2. **Explainable Adaptation:** Show how configuration maps to NSM behavior (translation layer + diff preview) so professors see downstream impact before runtime.
3. **Real-Time Collaboration Feel:** Use streaming responses, optimistic state, and progressive disclosure (inspired by modern co-authoring tools) to keep authors engaged during AI calls.
4. **Composable Flow:** Implement builder steps as metadata-driven modules (Retool/Stripe style) to support experimentation, multiplayer authoring, and future marketplace features.
5. **Robust NSM Alignment:** Capture every element NSM requires—success criteria, progress milestones, director triggers, adaptation boundaries, actor dynamics, initial structure.

## Core Components

### 1. Scenario Intake Layer
- **Inputs:** Freeform description, guided form fields, optional chat-based elicitation, document upload with instructions.
- **Techniques:**  
  - Use multi-column prompt composer (similar to Notion’s AI block) for “Goals”, “Key Stakeholders”, “Known Conflicts”.  
  - Provide auto-complete for industry/role archetypes to reuse presets.  
  - Preview token count and estimated processing time.

### 2. Real-Time Parsing & Streaming Feedback
- **Implementation:** React 18 `useTransition` + Suspense boundaries for parser/SAG results. Show skeleton states and progressively stream key findings (objectives, actors, hidden info) à la GitHub Copilot Chat.
- **Streaming Channel:** Server sends incremental JSON patches over SSE/WebSockets (whichever cost-effective) so UI updates while still processing.

### 3. Scenario Arc Generator (SAG 2.0)
- **Outputs (enhanced):**  
  - `goals` with IDs, priorities, success criteria, progress milestones, assessment methods.  
  - `actor_triggers` and `dynamic_behavior` templates leveraging actor metadata.  
  - `director_triggers`, `suggested_structure`, `adaptation_constraints`.  
  - `encounters`, `lessons`, `tests`, `rules` consistent with NSM schema.
- **Inference Techniques:**  
  - Use “chain-of-thought to schema” prompts where LLM reasons aloud (captured in logs) before emitting JSON.  
  - Seed prompts with curated exemplars from top-performing simulations.  
  - Apply self-critique step to ensure every goal has measurable evidence.

### 4. Auto-Tuning & Success Metrics Engine
- **Responsibilities:**  
  - Recommend `director_settings` (intensity, cadence, verification tolerance) based on scenario risk and instructor preferences.  
  - Suggest actor personality ranges that align with adaptation flexibility.  
  - Propose tests/decision points that satisfy required goals.  
  - Generate rubric templates for LLM-based assessment (e.g., JSON scoring guidelines).

### 5. Translation Layer
- **Purpose:** Map builder data structures to NSM runtime contracts, catching gaps early.  
- **Steps:**  
  1. Validate outline coverage: every learning objective must have success criteria and milestones.  
  2. Normalize actor info into NSM `dynamic_behavior` schema (if missing, propose defaults).  
  3. Merge user overrides with auto-tuned defaults to produce `scenario_outline` + `director_settings`.  
  4. Emit warnings/diffs when edits break NSM expectations (e.g., removing required trigger).  
  5. Unit-testable functions to ensure schema drift is caught pre-runtime.

### 6. Simulation Diff Preview
- **UI:** Side-by-side comparison showing original AI suggestions, user edits, and resulting NSM payload.  
- **Functionality:**  
  - Highlight impact on goals, triggers, structure, director settings.  
  - Provide “What NSM will do” tooltips summarizing Director behavior given current config.  
  - Allow rollback to previous versions (per-step history).

### 7. Test Harness & NSM Sandbox
- **Embedded Playground:** Launch mini session with streaming responses and visible Director notes (tension graph, progress bars).  
- **Features:**  
  - Toggle Director intensity, view intervention triggers firing in real time.  
  - Inspect success criteria checkmarks as LLM detects evidence.  
  - Export transcripts for peer review.

## Data Model & Schema
Extends NSM schema with builder-specific provenance and approval metadata.

```sql
ALTER TABLE simulations
  ADD COLUMN IF NOT EXISTS scenario_outline JSONB,        -- Enhanced outline
  ADD COLUMN IF NOT EXISTS director_settings JSONB,       -- Auto-tuned + overrides
  ADD COLUMN IF NOT EXISTS builder_history JSONB,         -- Diff snapshots & comments
  ADD COLUMN IF NOT EXISTS actor_dynamic_config JSONB;    -- Cached dynamic behaviors

ALTER TABLE simulation_sessions
  ADD COLUMN IF NOT EXISTS outline_snapshot JSONB;        -- Outline at session start
```

### Scenario Outline Schema (Enhanced)
```jsonc
{
  "goals": [
    {
      "id": "goal_1",
      "description": "Understand supply chain tradeoffs",
      "priority": 1,
      "required": true,
      "success_criteria": {
        "required_evidence": [
          "Student discusses cost vs speed",
          "Student references risk assessment frameworks",
          "Student considers alternative options"
        ],
        "minimum_depth": "Student must articulate reasoning with at least two supporting points",
        "assessment_method": "llm_analysis",
        "partial_credit": true
      },
      "progress_tracking": {
        "milestones": [
          { "at": 0.2, "indicator": "Acknowledges time pressure" },
          { "at": 0.5, "indicator": "Proposes agile mitigation" },
          { "at": 1.0, "indicator": "Defends chosen strategy under challenge" }
        ],
        "measurement": "progress_llm_scoring"
      },
      "tests": [
        {
          "type": "decision_point",
          "description": "Choose between fast/expensive vs. slow/cheap approach",
          "evidence_of_learning": "Justifies choice with trade-off analysis"
        }
      ]
    }
  ],
  "rules": [
    "Maintain Socratic questioning; never reveal final answer",
    "Reference source document for factual claims"
  ],
  "encounters": [
    {
      "id": "encounter_inventory_crisis",
      "description": "Unexpected spike in demand strains inventory",
      "related_goals": ["goal_1"],
      "escalation": "Moderate"
    }
  ],
  "lessons": [
    {
      "id": "lesson_agility",
      "key_points": ["Speed vs cost trade-off", "Supplier diversification"],
      "evidence_of_coverage": "Student references at least one mitigation tactic"
    }
  ],
  "tests": [
    {
      "id": "test_risk_tolerance",
      "type": "reflection_question",
      "prompt": "How would you justify increased costs to the board?",
      "evaluation": "llm_freeform_scoring"
    }
  ],
  "actor_triggers": [
    {
      "actor": "CEO",
      "type": "keyword",
      "condition": "cost",
      "action": "Express concern about margins",
      "priority": 2
    },
    {
      "actor": "CFO",
      "type": "progress",
      "condition": "goal_1 < 0.3 && message_count > 10",
      "action": "Introduce cash-flow warning",
      "priority": 1
    }
  ],
  "director_triggers": [
    {
      "name": "student_stuck",
      "condition": "three_similar_messages && progress.goal_1 < 0.1",
      "director_action": "Pull encounter 'encounter_inventory_crisis'",
      "urgency": "high"
    },
    {
      "name": "off_objective",
      "condition": "five_messages_without_goal_reference",
      "director_action": "Have CEO ask about supply trade-offs",
      "urgency": "medium"
    },
    {
      "name": "ready_for_decision",
      "condition": "all_required_goals >= 0.7 && student_requests_guidance",
      "director_action": "Trigger decision point test_risk_tolerance",
      "urgency": "high"
    }
  ],
  "suggested_structure": {
    "beginning": {
      "suggested_duration": { "messages": 10, "progress": 0.2 },
      "goals_to_introduce": ["goal_1"],
      "tone": "exploratory",
      "avoid": ["forcing commitments"]
    },
    "middle": {
      "suggested_duration": { "progress": 0.7 },
      "goals_to_test": ["goal_1"],
      "escalation": "Introduce encounters",
      "tone": "challenging"
    },
    "end": {
      "triggered_by": ["progress >= 0.8", "message_count >= 25"],
      "goals_to_conclude": ["goal_1"],
      "include_tests": ["test_risk_tolerance"],
      "tone": "decisive"
    },
    "flexibility_note": "Director may reorder segments if student leads with solution."
  },
  "adaptation_constraints": {
    "can_do": [
      "Reorder encounters",
      "Extend/shorten phases within ±30% duration",
      "Adjust actor tone within configured ranges",
      "Introduce optional goals when student excels"
    ],
    "cannot_do": [
      "Skip required goals",
      "Invent new encounters not listed",
      "Change learning objectives",
      "Switch AI mode outside permitted spectrum",
      "Exceed max_session_duration"
    ],
    "if_student_completely_lost": {
      "threshold": "progress.goal_1 < 0.05 && message_count >= 20",
      "action": "Pause, offer hint path or restart suggestion"
    }
  }
}
```

### Actor Dynamic Configuration
```jsonc
{
  "CEO": {
    "base_personality": {
      "aggressive_passive": 40,
      "cooperative_antagonistic": 65,
      "analytical_intuitive": 55
    },
    "dynamic_behavior": {
      "if_student_struggling": {
        "mode": "coach",
        "action": "Share reflective questions about trade-offs"
      },
      "if_student_advanced": {
        "mode": "challenger",
        "action": "Introduce board pressure scenario"
      },
      "if_off_track": {
        "mode": "redirector",
        "action": "Ask how decision impacts supply chain goal_1"
      }
    },
    "trigger_priority_policy": "higher_priority_overrides",
    "allowed_tone_range": { "min": 30, "max": 70 }
  }
}
```

### Director Settings
```jsonc
{
  "intensity": "assist",
  "evaluation_cadence": { "message_interval": 5, "time_interval_seconds": 90 },
  "learning_objective_targets": {
    "goal_1": { "threshold": 0.7, "priority": "high" }
  },
  "allowed_actor_interventions": [
    "goal_shift",
    "enter_exit_actor",
    "hidden_info_reveal"
  ],
  "adaptation_flexibility": 55,
  "adaptation_constraints": "reference: scenario_outline.adaptation_constraints",
  "verification_policy": { "enabled": true, "retry_limit": 1, "temperature_override": 0.2 }
}
```

## Builder Workflow

1. **Intake & Preset Selection**  
   - User selects scenario archetype (e.g., “Crisis Management”) or starts blank.  
   - Chat-style assistant gathers missing pieces (“Who are the key stakeholders?”).  
   - Document upload triggers background OCR; user continues editing while processing.

2. **Streaming Parse & Outline Draft**  
   - Parser returns incremental results: actors first, then objectives, then hidden info.  
   - SAG 2.0 streams outline components; UI highlights new goals, triggers, structure as they arrive.

3. **Review Smart Summary**  
   - Builder displays AI summary, suggested goals, success criteria, progress milestones.  
   - Provide quick actions (“Tighten success evidence”, “Add alternative encounter”).

4. **Customise & Diff**  
   - Editors for goals, actors, director triggers, adaptation boundaries.  
   - As edits occur, translation layer validates and updates live diff preview.  
   - “NSM Impact” panel describes how director/actors will adjust (“Director intervenes if 5 messages without goal mention”).

5. **Advanced Settings & Testing**  
   - Adaptive behavior controls (sliders, dropdowns) for struggling/excelling students.  
   - Launch NSM sandbox to experience conversation, with progress bars per goal and real-time director notes.

6. **Simulation Diff Preview & Approval**  
   - Side-by-side “Suggested vs Final vs Runtime” view.  
   - Export diff log for recordkeeping or peer review.  
   - Require explicit confirmation for any goal lacking success criteria (guardrail).

7. **Publish & Sync**  
   - On publish, translation layer writes normalized outline, director settings, actors, parsed data, raw text to Supabase.  
   - Session creation snapshot ensures each runtime uses locked version (support future versioning).

## Frontend Architecture Highlights
- **State Management:**  
  - Use `zustand` or React context with immutability helpers to manage `builderState`.  
  - Keep AI responses in normalized store keyed by `stepId`; diff engine subscribes to changes.

-
- **Step Configuration:**  
  ```javascript
  const STEPS = [
    { id: 'intake', component: IntakeStep, completionGuard: hasBasicScenario },
    { id: 'outline', component: OutlineReviewStep, dependsOn: ['intake'] },
    { id: 'actors', component: ActorConfigStep, dependsOn: ['outline'] },
    { id: 'goals', component: GoalSuccessStep, dependsOn: ['outline'] },
    { id: 'director', component: DirectorSettingsStep, dependsOn: ['goals'] },
    { id: 'diff', component: DiffPreviewStep },
    { id: 'test', component: PlaybackStep }
  ];
  ```
  Enables easy insertion/removal of steps (Retool-style).

- **Optimistic Actions:**  
  - Use optimistic updates when user edits goals; translation layer runs in background.  
  - Show inline warnings if validation fails (“Milestone missing for Goal 2”).  
  - Provide undo/redo stack using `immer` patches.

- **Streaming UI:**  
  - Implement `useEventSource` hook to process parser/SAG updates.  
  - Display timeline of AI actions (e.g., “Identified new encounter: inventory crisis”).  
  - Allow user to pause/resume streaming if they want to edit current draft.

- **Inline Natural Language Commands:**  
  - Inspired by Pitch AI: text box “Make the CFO more risk-averse” translates to actor trait adjustments via small LLM call.

## Backend Services

### Scenario Parser
- No major changes; ensure output includes rationale snippets for diff preview.

### SAG 2.0 Service
- Behavior described above; enforce JSON schema with partial credit fields, milestones, triggers, etc.
- Implement guardrails: if success criteria missing, run refinement pass.

### Auto-Tuning Service
- Combine heuristics + LLM to set defaults: intensity, evaluation cadence, adaptation flexibility.  
- Provide explanation strings for each recommendation (displayed in diff preview).

### Translation & Validation Service
- Accept builder state JSON.  
- Verify required fields: each goal has success criteria & milestones; adaptation constraints defined; dynamic behavior present for each actor.  
- Emit `translationResult` with normalized outline + warnings array.  
- Update diff history.

### Diff Service
- Compute structural diffs (JSON patch) between: `aiSuggested`, `userEdited`, `finalTranslated`.  
- Store in `builder_history` with timestamps, author, optional comments.

### Streaming Orchestrator
- Manage SSE/WebSocket connections for streaming feedback.  
- Batch outgoing updates to avoid flooding UI.  
- Provide reconnection/resume tokens.

## Testing Strategy
- **Unit Tests:** translation layer, schema validation, diff engine.  
- **Contract Tests:** ensure builder output matches NSM schema via shared TypeScript types.  
- **Snapshot Tests:** UI diff preview state combos.  
- **Integration Tests:** end-to-end authoring flow with mocked LLM responses.  
- **Runtime Tests:** Use NSM sandbox to replay saved transcripts and validate success criteria detection.

## Risks & Mitigations
- **LLM Latency:** Mitigate with streaming, staged AI calls, caching repeated arcs.  
- **Schema Drift:** Shared types + translation validation + CI tests.  
- **User Overwhelm:** Keep inference-first; hide advanced controls behind accordions; provide helper text.  
- **Cost:** Use GPT-3.5 for iterative outline refinement, reserve GPT-4 for final validation/success criteria.

## Roadmap Extensions
1. **Collaborative Authoring:** Real-time co-editing via CRDT store; share diff preview across editors.  
2. **Template Marketplace:** Allow exporting outlines as shareable templates with ratings.  
3. **Multiplayer Scenarios:** Extend outline schema with per-role goals, shared director triggers.  
4. **Analytics Loop:** Feed runtime success metrics back into builder suggestions (auto-tuning learns from outcomes).  
5. **Professor Profiles:** Remember preferred settings/intensity, auto-apply on new simulations.

## Implementation Checklist
- [ ] Define TypeScript interfaces for enhanced outline and director settings.  
- [ ] Implement translation layer with exhaustive validation + unit tests.  
- [ ] Upgrade SAG prompt & schema to produce success criteria, milestones, triggers, boundaries.  
- [ ] Build streaming endpoint for parser/SAG progress.  
- [ ] Implement diff preview component with JSON patch visualisation.  
- [ ] Add progress tracking editor UI.  
- [ ] Add adaptive behavior controls for Director.  
- [ ] Integrate NSM sandbox preview with director notes.  
- [ ] Update Supabase schema + migrations.  
- [ ] Document authoring workflow & write onboarding tutorial.

---

Simulation Builder V2, with these enhancements, delivers an inference-first yet transparent authoring experience. It ensures every simulation arrives at NSM with complete success criteria, progress metadata, director triggers, dynamic actor behavior, and adaptation boundaries—while giving professors confidence through streaming feedback and diff previews before they ever press “Start Simulation”.
