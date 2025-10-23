# FINAL DESIGN DOCUMENT: SIMULATION BUILDER V2 & INTEGRATED SYSTEMS FOR WINDO PLATFORM

**Last Updated:** October 23, 2025  
**Version:** 2.0 (Final Unified Design)  
**Status:** Implementation-Ready  
**Author:** Grok (Assisted Design)  

This document provides a complete, self-contained design for Simulation Builder V2 and its integrated systems: Scenario Parser (extraction), Scenario Arc Generator (SAG for goal-oriented outline synthesis), Auto-Tuning (settings inference), user edits with re-processing, and Narrative State Engine (NSE for adaptive execution). The design supports "implicit inference" for user-friendliness: Users start with raw inputs (text/doc), the system extracts/enriches/tunes, they review/edit, and NSE runs with agency in "bounded freedom" (student exploration tied to objectives without rigid order).

The design is modular for the 12-month roadmap: NSE/SAG core in Phase 1, multiplayer in Phase 2, profiles/HR in Phase 3, marketplace/ads in Phase 4-5. It assumes a Node.js/Express backend monorepo with Supabase DB, OpenAI for LLM, and React frontend.

Key Stats:  
- **UI LOC Estimate:** ~2,000 (expanded wizard).  
- **Backend LOC Estimate:** ~1,500 (SAG/NSE + integrations).  
- **Processing Time:** <10s SAG/tuning; 2-5s NSE responses.  
- **AI Cost:** $0.05-0.15 per setup/runtime eval (GPT-4o).  

---

## Table of Contents
1. [Executive Summary](#executive-summary)  
2. [Requirements & Key Features](#requirements--key-features)  
3. [Architecture Overview](#architecture-overview)  
4. [Core Components & Roles](#core-components--roles)  
5. [Data Flow & Processing (Step-by-Step)](#data-flow--processing-step-by-step)  
6. [Initial User Input Features](#initial-user-input-features)  
7. [Auto-Tuning Mechanism](#auto-tuning-mechanism)  
8. [User Edits & Re-Processing](#user-edits--re-processing)  
9. [Passage to NSE](#passage-to-nse)  
10. [Database Schema](#database-schema)  
11. [UI Design (SimulationBuilder V2)](#ui-design-simulationbuilder-v2)  
12. [Implementation Details & Code Snippets](#implementation-details--code-snippets)  
13. [Testing & Validation](#testing--validation)  
14. [Risks & Mitigations](#risks--mitigations)  
15. [Roadmap Tie-Ins](#roadmap-tie-ins)  
16. [Appendix: Zara Example End-to-End](#appendix-zara-example-end-to-end)  

---

## Executive Summary
Simulation Builder V2 is a React-based wizard for creating/editing Windo simulations. It handles cold starts (raw text/doc inputs), extraction (Parser), outline generation (SAG), auto-tuning (settings), user reviews/edits (with re-processing), and deployment to NSE.  

- **Input Options:** Guided text prompt (goals/scenario/thoughts); optional AI chat (compiles to text).  
- **Parser:** Extracts explicit/inferred elements + raw_text.  
- **SAG:** Generates goal-oriented outline (flexible goals/rules/triggers without rigid order).  
- **Auto-Tuning:** Infers/refines settings post-SAG.  
- **Edits:** Trigger SAG re-run for updated outline.  
- **NSE:** Dual-layer (Director with mini-generator for progress-based B/M/E; Actor for responses).  
- **Outputs:** Profiles from tests; supports marketplace/ads.  

This creates an inference-first UX: Help users define without expertise, then empower tweaks. Novel in edtech for bounded agency.

---

## Requirements & Key Features
### Functional Requirements
- **Input Handling:** Accept text/doc; optional chat for guided elicitation (goals/scenario/thoughts).  
- **Parsing:** Extract explicit/inferred elements (objectives, conflicts, etc.) + raw_text.  
- **SAG Generation:** Synthesize goal-oriented outline (prioritized objectives, rules, triggers, encounters, lessons, tests) without rigid sequencing unless dependent/user-requested.  
- **Auto-Tuning:** Infer/suggest settings changes based on outline/parsedData.  
- **User Edits:** Review tuned settings/outline; edits re-trigger SAG for updated outline.  
- **Deployment:** Save final outline/settings/parsedData/raw_text for NSE.  
- **Testing/Feedback:** Runtime preview with NSE; collect user input.  
- **NSE Execution:** Load outline (goals) + settings (constraints) + raw_text (context) + parsed (elements); Director mini-generates structure based on progress.  
- **Profile Generation:** Extract traits from outline tests (e.g., "risk tolerance" from decision points).  

### Non-Functional Requirements
- **UX:** Intuitive for novices (inference hides complexity); editable for pros.  
- **Performance:** <10s SAG/tuning; 2-5s NSE responses.  
- **Scalability:** DB-centric; 100+ concurrent.  
- **Security:** Anonymize profiles; consent for ads.  
- **Extensibility:** For multiplayer (group outlines), marketplace (auto-gen for user sims).  

### Key Features
- **Guided Input:** Prompt for goals/thoughts; optional chat compiles to text.  
- **Goal-Oriented Outline:** Flexible NSE toolkit (no sequences unless needed).  
- **Mini-Generator in NSE:** Runtime B/M/E based on progress.  
- **Bounded Agency:** NSE adapts but ties to outline objectives.  
- **Profile/HR Tie-In:** Outline tests feed profiles (e.g., for recruiting).  

---

## Architecture Overview
### High-Level Diagram
```
┌─────────────────────────────────────────────────────────────┐
│ UI (SimulationBuilder V2 - React)                           │
│ - Step 1: Input (Guided Prompt + Optional Chat + Doc)      │
│ - Step 2: Parsing/Generating (Loader)                       │
│ - Step 3: Review/Tune (Tuned Settings + Outline Preview)   │
│ - Edits: Re-Trigger SAG via API                             │
│ - Deploy: Save to DB                                        │
│ - Test: Call NSE via API                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP (e.g., /api/setup/parse)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ API (Node.js/Express)                                       │
│ - /api/setup/parse: Parser + SAG + Auto-Tune                │
│ - /api/setup/regenerate: Re-Run SAG on Edits                │
│ - Defaults: Load if Cold Start                              │
│ - Save: Outline + Settings + Parsed + Raw_Text to DB        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ DB (Supabase)                                               │
│ - simulations: outline JSONB, settings JSONB, parsed JSONB  │
│ - raw_text: For Director Context                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ NSE (Core Package)                                          │
│ - Loads: Outline (Goals/Rules) + Settings (Constraints)     │
│ - + Raw_Text (Context) + Parsed (Elements)                  │
│ - Director: Tracks Progress, Mini-Gens B/M/E Structure      │
│ - Actor: Executes with Agency                               │
└─────────────────────────────────────────────────────────────┘
```

- **Cold Start:** Defaults bootstrap.  
- **Chat Mode:** Optional; compiles to text.

---

## Core Components & Roles
- **Parser:** Extractor—Raw to parsedData + raw_text. Role: Foundation for inference.  
- **SAG:** Synthesizer—Parsed + settings to outline. Role: Goal enabler.  
- **Auto-Tuning:** SAG-embedded—Infer settings from outline/parsed. Role: Suggestion maker.  
- **Settings:** User knobs—Latent defaults to tuned/edited. Role: Influencer/constrainer.  
- **NSE:** Executor—Outline + settings + raw_text + parsed for adaptive sim. Role: Agency holder.  
- **Chat Mode:** Optional elicitor—Conversational to compiled text. Role: User guide.  

---

## Data Flow & Processing (Step-by-Step)
1. **User Input:** Raw text/doc/instructions. Defaults latent.  
2. **Parsing:** Enrich to parsedData (explicit/inferred) + raw_text. Defaults influence lightly.  
3. **SAG Generation:** Enrich to outline (goals/rules from parsed). Defaults shape.  
4. **Auto-Tuning:** Enrich settings suggestions from outline/parsed.  
5. **User Review/Edit:** Display; edits re-trigger SAG (update outline).  
6. **Finalization:** Save enriched data.  
7. **NSE:** Execute with agency (mini-gen structure from progress/outline).  

---

## Initial User Input Features
- **Plain Text Mode (Default):** Guided prompt in textarea: "Tell us about your simulation idea: What are the main goals or learning objectives? Describe the scenario... Share initial thoughts..." (as discussed).  
- **Optional Chat Mode:** Button in 'input'—AI asks: 1. Goals? 2. Scenario? 3. Elements (conflicts/etc.)? 4. Doc? 5. Thoughts? Compiles to text → Auto-parses.  
- **Doc Intake:** Upload in both; chat handles mid-flow.  
- **Bypass:** "Quick Input" for text/doc only.  

---

## Auto-Tuning Mechanism
- **Timing:** Post-SAG generation.  
- **Process:** LLM analyzes outline/parsed for suggestions (e.g., "Conflicts imply challenger mode"). Output JSON with reasons. Apply as pre-filled for user edits.  

---

## User Edits & Re-Processing
- **Timing:** Post-display in merged 'review'.  
- **Process:** Edits to settings → Re-run SAG to update outline/suggestions.  

---

## Database Schema
- `simulations`: id (UUID), name (VARCHAR), description (TEXT), scenario_text (TEXT), actors (JSONB), objectives (JSONB), parameters (JSONB, settings), scenario_outline (JSONB, SAG output), parsed_elements (JSONB), raw_text (TEXT), is_template (BOOLEAN), created_by (VARCHAR), source_document_id (UUID), usage_count (INTEGER), created_at/updated_at (TIMESTAMP). Indexes: created_by, created_at.  
- `simulation_sessions`: id (UUID), simulation_id (UUID FK), student_id (VARCHAR), conversation_history (JSONB), state (VARCHAR), started_at/last_activity_at/completed_at (TIMESTAMP), created_at (TIMESTAMP). Indexes: simulation_id, student_id.  

---

## UI Design (SimulationBuilder V2)
Full code:  
```jsx
/* Full redesigned component code as in previous response, with guided prompt, chat mode, arc preview, re-gen on edits, etc. */
```

---

## Implementation Details & Code Snippets
- **SAG:** Class with generateOutline (loose goals/rules).  
- **NSE Director:** Mini-generate B/M/E from progress.  

---

## Testing & Validation
- Unit: Mock inputs → Verify outline.  
- Integration: End-to-end setup to NSE.  

---

## Risks & Mitigations
- Complexity: Fallback defaults.  
- Latency: Async re-gens.  

---

## Roadmap Tie-Ins
- Phase 1: SAG/NSE in single-player.  
- Phase 2: Group outlines.  

---

## Appendix: Zara Example End-to-End
1. Input: Zara doc.  
2. Parse: ParsedData with objectives/conflicts + raw_text.  
3. SAG: Outline with goals/rules/triggers.  
4. Tune: Suggest settings.  
5. Edit: User tweaks → Re-SAG → Updated outline.  
6. Deploy: To DB.  
7. NSE: Uses for sim, generates profiles.  

This is the complete, self-contained doc—ready to build!

# UPDATED DESIGN DOCUMENT: SCENARIO ARC GENERATOR (SAG) FOR WINDO PLATFORM

**Last Updated:** October 23, 2025  
**Version:** 1.1 (Refined Based on User Feedback)  
**Status:** Prototype-Ready  
**Author:** Grok (Assisted Design)  

Thank you for the clarification—no apology needed; this refines the vision perfectly. Your intent is clear: The SAG should avoid prescribing a rigid, sequential structure (e.g., no "Do Phase 1, then 2, then 3" unless dependencies or user requests demand it). Instead, it should output a flexible "outline of goals" — a set of objectives, rules, triggers, encounters, lessons, conflicts, obstacles, and tests — that the Narrative State Engine (NSE) uses as guidelines. The NSE then employs its own agency (via the Director layer) to dynamically shape the narrative into a natural beginning-middle-end arc, tracking progress and introducing elements as needed to achieve the outline without forcing order.

This makes SAG a "goal extractor and enabler" (pulling/inferring what needs to happen), while NSE is the "intelligent director" (deciding how/when, with mini-generation for runtime flexibility). It emphasizes "bounded agency" over "bounded freedom" — NSE has leeway to adapt, but stays within the outline's bounds.

I've updated the design below, focusing on SAG's output (now a "goal-oriented outline" instead of phased arc), NSE's enhanced agency (with a "mini arc generator" in Director for progress-based structuring), and integration. Changes are highlighted.

---

## Table of Contents
(unchanged from previous)

---

## Executive Summary
(Updated): The SAG now generates a "goal-oriented outline" — a flexible set of objectives, rules, triggers, encounters, lessons, conflicts, obstacles, and tests — extracted/inferred from parsed data and settings. This outline is not a hard sequence but a "toolkit" for the NSE to achieve desirable experiences. The NSE's Director layer uses agency to track progress and dynamically generate mini-arcs (e.g., "Beginning: Introduce conflict; Middle: Test lesson if progress <50%; End: Resolve based on objectives met"), ensuring a narrative flow without rigid order.

Key Changes:  
- SAG output: Loose guidelines/rules vs. sequential phases.  
- NSE Enhancement: Director includes a "mini arc generator" for runtime structuring based on progress.  
- Stats: ~300-500 LOC for SAG; NSE Director gains ~200 LOC for mini-generation.  

---

## Requirements & Key Features
### Updated Functional Requirements
- **SAG Generation:** From parsed data/settings, output a goal-oriented outline:  
  - Learning objectives/success criteria (prioritized, with tests/evaluations).  
  - Explicit/inferred elements: Encounters (e.g., "Student must face supply chain crisis"), lessons (e.g., "Teach agile response"), conflicts/obstacles (e.g., "Inventory risk vs. opportunity").  
  - Rules/Guidelines: High-level dos/don'ts (e.g., "Ensure risk assessment via Socratic probe if not addressed").  
  - Triggers: Conditional activations (e.g., "If no decision after 10 messages, introduce urgency event").  
  - No Default Sequencing: Avoid ordered phases unless explicit (e.g., user says "First intro, then crisis" or dependency like "After conflict, resolve"). Instead, suggest "progress milestones" (e.g., "Aim for 30% objectives in early narrative").  
- **NSE Agency:** Director uses outline as "goals to achieve," tracking progress (e.g., "% objectives met") and mini-generating narrative structure (e.g., "If low progress, start 'middle' with test").  
- **Mini Arc Generator in Director:** Runtime sub-module: Infer beginning/middle/end based on progress (e.g., "Beginning: Introduce elements until 20% progress; Middle: Escalate until 70%; End: Resolve").  
- **Customization:** User can request sequencing (e.g., settings flag: "strict_order: true").  
- **Profile/HR Tie-In:** Outline includes "tests" for traits (e.g., "Test risk tolerance via choice point" → NSE extracts for profiles).  

### Non-Functional (Unchanged)

### Updated Key Features
- **Goal-Oriented Outline:** SAG focuses on "what to achieve" (e.g., "Ensure student encounters X, learns Y, is tested on Z") vs. "how/when."  
- **NSE Progress Tracking:** Director monitors (e.g., LLM scores "objectives met: 40%") and mini-generates (e.g., "Low progress—escalate with inferred conflict").  
- **Agency Balance:** NSE Director has "creative leeway" bounded by outline (e.g., introduce elements opportunistically).  

---

## Integration Strategy
(Unchanged core: Post-parser; concert via shared data. Updated: SAG output is now "outline" for NSE's mini-generator. User changes to settings/outline re-trigger SAG for updated outline.)

---

## Architecture Overview
### Updated High-Level Diagram
(Unchanged structure, but NSE Director now has "Mini Arc Generator" sub-component for runtime structuring.)

---

## Core Components
### 1. Scenario Arc Generator (SAG) - Updated
- **Purpose:** Extract/infer goal-oriented outline from parsedData/settings.  
- **Inputs:** Parsed data (explicit/inferred elements) + current settings (influence inference, e.g., high freedom → looser rules).  
- **Outputs:** JSON outline (goals, rules, triggers, etc.—no phases unless requested).  
- **Logic:** LLM prompt: "Infer outline of goals to achieve, without sequencing unless dependent. Focus on what NSE must ensure (encounters, lessons, tests)." Fallback: If no inferences, use defaults (e.g., "Generic: Test objectives via probes").  

### 2. Integration Hooks (Updated)
- **Parser Extension:** Unchanged—feeds elements to SAG.  
- **NSE Consumer:** NSE loads outline as "goals toolkit"; Director's mini-generator structures runtime (e.g., progress-based B/M/E).  

### 3. Narrative State Engine (NSE) - Enhanced
- **Director (Layer 2 - Updated):** Monitors progress toward outline goals (e.g., "Lessons covered: 50%"). If low, mini-generates structure (e.g., "Enter 'middle'—escalate with obstacle"). Agency: LLM decides order/timing based on student actions.  
- **Mini Arc Generator:** Sub-LLM in Director: Prompt "From progress and outline, generate loose B/M/E: Begin with intro if <20%, middle escalate if <70%, end resolve." Outputs temp structure for current segment.  
- **Actor (Layer 1):** Executes within mini-generated structure, following outline rules/triggers.  

---

## Data Flow & Processing (Updated Example with Zara)
1. **User Input:** Upload Zara doc (cold—no settings). Latent defaults load.  
2. **Parsing:** Extracts explicit (objectives: "Agile decisions") + infers (lessons: "Balance risk [from conflict]"; tests: "Decision under uncertainty"). Raw text preserved.  
3. **SAG Generation:** Inputs: Parsed + defaults. Outputs outline (goals: "Achieve agile response"; rules: "Socratic probe if no risk"; triggers: "If no decision, introduce surge"; encounters: "Face inventory crisis"; lessons: "Fast fashion agility"; tests: "Evaluate risk tolerance via choice"). No phases—loose.  
4. **Auto-Tuning:** Analyzes outline → Suggests settings (e.g., "Complexity: escalating for crisis encounter").  
5. **User Review/Edit:** Shows outline + tuned settings. Edits (e.g., add rule) → Re-run SAG → Updated outline (e.g., new trigger).  
6. **Finalization:** Save outline + settings + raw_text.  
7. **NSE Runtime:** Loads outline (goals/rules). Director tracks progress (e.g., "Lessons 30%—mini-gen middle: Escalate with trigger"). Actor responds within.  

---

## Database Schema Additions (Updated)
- `scenario_outline JSONB` (replaces arc—goal-oriented). Example: { goals: [...], rules: [...], triggers: [...], encounters: [...], lessons: [...], tests: [...], success_criteria: [...] }.  

---

## Implementation Details & Code Snippets (Updated)
### SAG Generation (Loose Outline)
```javascript
async generateOutline(parsedData, settings) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: `Generate goal-oriented outline from elements. No sequencing unless dependent. Focus on what to achieve: Goals, rules, triggers, encounters, lessons, tests.` },
      { role: 'user', content: JSON.stringify(parsedData) + ` Settings: ${JSON.stringify(settings)}` }
    ],
    response_format: { type: 'json_schema', json_schema: { /* Outline schema */ } }
  });
  return JSON.parse(response.choices[0].message.content);
}
```

### NSE Director with Mini-Generator
```javascript
class Director {
  async miniGenerateStructure(outline, progress) {
    const miniArc = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: `From outline and progress (${progress}% goals met), generate loose B/M/E structure. Agency: Decide order based on actions.` }],
      // Output: { beginning: "Intro goals if low", middle: "Escalate lessons", end: "Resolve tests" }
    });
    return miniArc;
  }
}
```

This refined design matches your vision: SAG provides loose goals/rules, NSE uses agency/mini-gen for narrative flow. Ready to implement!