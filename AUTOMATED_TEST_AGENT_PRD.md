# PRD: Automated Simulation Test Agent
**Last Updated:** October 23, 2025  

---

## 1. Overview
Build a detached “lab harness” that automatically plays simulations, evaluates the experience, and proposes configuration tweaks without touching core Simulation Builder V2 or NSM internals. The system must rely only on stable contracts (shared schemas + translation gateway) so it remains functional while the core platform evolves rapidly.

---

## 2. Goals & Non-Goals
### Goals
1. Automatically run simulation sessions using a configurable “player agent”.
2. Score the experience against scenario success criteria and NSM metadata.
3. Recommend configuration adjustments (e.g., director settings, adaptation flexibility).
4. Record each run and its suggested changes for iterative testing.
5. Operate independently of core repos, only consuming published contracts/APIs.

### Non-Goals
- Modifying simulations directly in production databases.
- Building a full professor-facing dashboard (can be added later).
- Integrating with unfinished core features; the harness must function with mock data until Phase 0 contracts are ready.

---

Key use cases:
1. Run nightly regression simulations on latest outlines, producing quality scores.
2. Experiment with alternative director settings and see impact before deploying to real students.
3. Provide quick feedback when new goals or success criteria are added to an outline.

---

## 4. Success Metrics
- Ability to execute a test run end-to-end using only published translation/NSM APIs.
- High signal-to-noise on suggested adjustments (manual review accepts ≥60% of recommendations).
- Run history captures execution time, outcome, and deltas for ≥90% of attempts.
- Zero impact on production builder/NSM uptime (no shared writes or blocking dependencies).

---

## 5. Scope & Deliverables
### In Scope
- Stand-alone repository/module (`packages/test-agent` or separate repo).
- CLI & optional API for triggering simulations (`npm exec test-agent simulate ./snapshots/sim.json`).
- Player agent (LLM- or rules-based) configurable via JSON.
- Evaluator module mapping transcripts to scores and adjustment suggestions.
- Report generator (Markdown/CSV/JSON) with run summaries.
- Storage of run artifacts (local filesystem, S3, or dedicated DB) independent of production Supabase.

### Out of Scope (for MVP)
- GUI dashboard (can be phase 2).
- Integration with professor dashboards or production auto-tuning loops.
- Direct writes to production simulations.

---

## 6. Architecture Overview
```
┌──────────────────────────────┐
│ Test Agent CLI / Scheduler   │
└───────────────▲──────────────┘
                │
                │ Uses shared contracts + REST client
┌───────────────┴──────────────────────────────────────┐
│ Test Harness Core                                    │
│ 1. Outline Loader (snapshot or API fetch via          │
│    translation gateway)                               │
│ 2. Player Agent (LLM prompt or scripted policy)       │
│ 3. Session Runner (calls runtime endpoints / mocks)   │
│ 4. Evaluator (scores vs success criteria)             │
│ 5. Recommendation Engine (settings deltas)            │
│ 6. Reporter (persist results + export)                │
└───────────────▲──────────────────────────────────────┘
                │
                │ Consumes ONLY stable APIs:
                │  • /api/v1/translation/snapshot (read-only)
                │  • /api/v1/runtime/test-run (flagged sandbox)
┌───────────────┴──────────────────────────────────────┐
│ Core Platform (Builder V2 / NSM)                     │
│  • Shared contracts package                          │
│  • Translation gateway                               │
│  • NSM runtime (flagged endpoints)                   │
└──────────────────────────────────────────────────────┘
```

Isolation tactics:
- Harness runs in its own repo / package, deployed separately.
- Uses feature-flagged runtime endpoints (`test-run`) or mock adapters until Phase 0 contracts are delivered.
- Stores data in dedicated location (local JSON, SQLite, or separate Supabase project).

---

## 7. Functional Requirements
### 7.1 Snapshot Intake
- Accept simulation snapshots (outline + director settings + actor config) from:
  - Local JSON files.
  - Translation service (`/api/v1/translation/snapshot?id=...`) once available.
- Validate snapshots against shared contracts (`schema_version` enforced).

### 7.2 Player Agent
- Configurable agent strategies:
  - **Heuristic mode:** scripted responses referencing success criteria.
  - **LLM mode:** generic business-student persona driven via prompt template.
- Support adjustable randomness/temperature and scenario-specific hints.
- Allow plugging in future personas without changing core harness.

### 7.3 Session Runner
- Execute conversation loop until NSM ends session or max messages reached.
- Capture:
  - Transcript (student + AI messages).
  - NSM metadata (goal progress, director notes, interventions).
  - Latency and error stats.
- Provide option to run against:
  - Live sandbox endpoint (feature flag).
  - Local mock server (for development).

### 7.4 Evaluator
- Parse transcript + metadata and score:
  - Learning goal completion (using success criteria).
  - Scenario flow quality (e.g., number of off-track interventions).
  - Latency/pace metrics.
- Use templated LLM prompts or deterministic rules; scores stored with explanations.

### 7.5 Recommendation Engine
- Produce configuration suggestions using shared contracts:
  - e.g., increase `adaptation_flexibility`, adjust `director_triggers`.
- Express adjustments as diff patches (`JSON Patch` or descriptive text).
- Optionally simulate recommended changes (next run uses patched settings).

### 7.6 Reporting & Storage
- Persist run artifact (input snapshot, transcript, scores, recommendations).
- Export summary report (Markdown/CSV/JSON) for review.
- Store run history with timestamps and environment info.

### 7.7 CLI & Automation
- Commands:
  - `simulate <snapshot>` – single run.
  - `schedule <config>` – batch runs (e.g., nightly).
  - `report <runId>` – view summary.
- Provide GitHub Actions / cron examples for automated execution.

---

## 8. Non-Functional Requirements
- **Isolation:** No writes to production databases or reliance on unstable APIs.
- **Resilience:** Handle runtime errors gracefully (retry/backoff, log and continue).
- **Observability:** Structured logs; run metadata accessible for debugging.
- **Portability:** Runnable on developer machines or CI without complex setup.
- **Security:** Store API keys via `.env` (never committed); restrict runtime endpoints with feature flags.

---

## 9. Dependencies
- Phase 0 completion of Joint Implementation Plan (shared contracts + translation gateway).
- Access to sandbox NSM endpoint or mock server.
- OpenAI (or equivalent) API keys if LLM agents/evaluators are used.

---

## 10. Implementation Phases
### Phase A – Harness Skeleton (Volunteer-ready)
1. Set up repo/package with CLI structure.
2. Implement outline loader (local JSON) + schema validation.
3. Create mock NSM server for local testing.
4. Build reporter + local storage (JSON/SQLite).

### Phase B – Agent & Evaluator
1. Implement heuristic player agent.
2. Add basic evaluator scoring using success criteria.
3. Generate recommendation diffs (static heuristics).

### Phase C – API Integration & Automation
1. Integrate translation gateway + sandbox runtime endpoints.
2. Add LLM-based player/evaluator options (configurable).
3. Provide CI/CD workflow examples for scheduled runs.

### Phase D – Enhancements (Optional)
- Dashboard UI consuming run history.
- Multi-persona support (e.g., different student profiles).
- Automated ticket creation when scores drop below threshold.

---

## 11. Risks & Mitigations
- **Core Dependency Drift:** If shared contracts change, harness breaks.  
  *Mitigation:* Depend on versioned package; fail fast if `schema_version` mismatch.
- **Runtime Rate/Cost Overrun:** Automated tests could spam NSM.  
  *Mitigation:* Require sandbox feature flag, enforce rate limiting in harness.
- **Noisy Recommendations:** Suggestions may lack accuracy.  
  *Mitigation:* Start with heuristic adjustments; flag confidence; require manual review.


---

## 12. Acceptance Criteria
- CLI tool runs a simulation using only a snapshot and produces a report.
- Evaluator surfaces at least one actionable recommendation per run.
- Harness can execute multiple runs without interfering with builder/NSM pipelines.
- Documentation exists for setup, environment config, and run interpretation.

---

## 13. Documentation & Handover
- README with setup instructions, CLI usage, environment variables.
- Sample snapshots and transcripts stored in `/samples`.
- Developer guide describing architecture, extension points, and coding standards.
- Change log tracking contract versions and compatibility notes.
