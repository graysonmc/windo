# Joint Implementation Plan: Simulation Builder V2 & Narrative State Machine

**Purpose:** Deliver the upgraded Simulation Builder and NSM as a cohesive platform, while refactoring the codebase for modular, reusable components across upcoming roadmap initiatives.

---

## Phase 0 – Contracts & Foundations
1. **Shared Schema Package**
   - Extract TypeScript interfaces + JSON schemas for `scenario_outline`, `director_settings`, `actor_dynamic_config`, and `translation_result` into `/packages/shared-contracts`.
   - Add `schema_version` + `schema_digest` (hash) to every persisted outline; enforce via Zod validators.
   - Publish package for consumption by builder (web), API, and NSM (core).

2. **Translation Service (Gateway)**
   - Create `/packages/api/services/translation-service.js` with endpoints:
     - `POST /api/translation/validate` – accepts builder drafts, returns normalized outline + warnings.
     - `POST /api/translation/snapshot` – persists validated outline for session initialization.
   - Ensure NSM session start fetches `translation/snapshot` to hydrate runtime state.

3. **Database & Config Updates**
   - Supabase migrations:
     - `scenario_outline`, `director_settings`, `actor_dynamic_config`, `builder_history`, `outline_snapshot`, `schema_version`.
   - Centralize environment config in `/config/index.js`; define required keys for builder/NSM integration.

4. **Refactor for Modularity**
   - Break down `/packages/api/server.js` into feature routers (`/routes/simulations`, `/routes/translation`, `/routes/runtime`).
   - Move simulation engine helper utilities to `/packages/core/lib`.
   - Introduce `/packages/core/director` (Director runtime) and `/packages/core/actor` (existing engine) folders with index exports.

---

## Phase 1 – Authoring Upgrades
1. **Scenario Arc Generator 2.0**
   - Upgrade prompts to produce enhanced outline (success criteria, milestones, director triggers, suggested structure, adaptation bounds).
   - Add refinement loop to fill missing fields; log rationales for diff history.

2. **Builder UX Enhancements**
   - Implement streaming parser/SAG feedback (SSE/WebSockets).
   - Add success criteria & progress milestone editors, adaptive behavior controls, diff preview with JSON patches.
   - Embed NSM sandbox (mock runtime using shared contracts) with director notes display.

3. **Diff & History System**
   - Build `/packages/api/services/diff-service.js` to compute and store diffs (`aiSuggested`, `userEdited`, `finalNormalized`).
   - Update builder to show “What NSM will do” tooltips from translation results.

4. **Codebase Reorganization**
   - Extract builder-specific React hooks/components into `/apps/web/src/features/simulation-builder`.
   - Introduce `useStreamingLLM` hook shared between builder and future tools.

---

## Phase 2 – NSM Integration
1. **Director Runtime Alignment**
   - Modify NSM to ingest normalized outline, honoring director triggers, adaptation boundaries, dynamic actor behaviors, and suggested structure.
   - Cache initial director state (structure + queued events) per session to reduce first-turn latency.

2. **Verification & Compliance**
   - Implement lightweight response verification loop; configure thresholds from `director_settings`.
   - Write integration tests ensuring NSM respects adaptation constraints.

3. **Shared Streaming & Telemetry**
   - Reuse builder’s streaming infrastructure for NSM debug output (director notes, goal progress).
   - Add metrics logging (latency, schema mismatches, director interventions) via `/packages/api/telemetry`.

4. **Runtime Refactors**
   - Split `simulation-engine.js` into:
     - `/packages/core/actor/engine.js` (dialog generation)
     - `/packages/core/actor/prompt-builders.js`
     - `/packages/core/director/controller.js`
   - Introduce `SessionInitializer` module to coordinate translation fetch, caching, and snapshotting.

---

## Phase 3 – Operational Hardening
1. **Plug-and-Play API Standards**
   - Adopt REST naming conventions + versioning (`/api/v1/...`); provide OpenAPI docs in `/packages/api/docs`.
   - Standardize request/response envelopes (`{ data, warnings, meta }`) across endpoints.
   - Provide SDK wrappers in `/packages/sdk` for internal tools to bootstrap integrations quickly.

2. **Resource & Rate Controls**
   - Implement rate limiting per simulation author and per runtime session.
   - Add circuit breakers for SAG/Director calls to prevent cascading failures.

3. **Monitoring & Alerting**
   - Centralize logs (structured) and metrics; configure alerts on latency, error spikes, schema mismatches.
   - Provide dashboard templates for builder publish success rate, NSM compliance, and translation errors.

4. **Developer Experience**
   - Add scripts for running translation validation locally (`npm run validate-outline path/to/file.json`).
   - Document shared contract usage, translation API, and runtime boot sequence in `/docs/architecture/`.

---

## Plug-and-Play Standards
1. **Shared Contracts & Versioning**
   - All cross-service data flows rely on `/packages/shared-contracts`.  
   - `schema_version` + `schema_digest` tracked in DB; NSM refuses outdated versions unless compatibility flag enabled.

2. **Translation Gateway**
   - Any new system must call translation service before interacting with NSM to guarantee alignment.

3. **Standardized Endpoints**
   - Endpoint naming: `/api/v1/{capability}/{resource}` (e.g., `/api/v1/simulations/{id}/snapshot`).  
   - Uniform response shape:  
     ```json
     {
       "data": { ... },
       "warnings": [...],
       "meta": { "schema_version": "1.0.0" }
     }
     ```

4. **SDK & CLI**
   - Provide REST client + CLI (`npm exec windo-cli`) to trigger translation, publish simulations, and inspect NSM diagnostics.

5. **Testing Conventions**
   - Shared test fixtures for outlines and translation results stored in `/packages/test-fixtures`.  
   - Contract tests run in CI ensuring builder > translation > NSM pipeline remains intact.

---

## Immediate Next Actions
1. Stand up `/packages/shared-contracts` with outline schema + versioning.  
2. Draft translation service endpoints + Supabase migrations.  
3. Begin refactoring API routers and core modules per new structure.  
4. Once foundations are in place, proceed to Phase 1 authoring upgrades.

This plan supersedes related items in `DEVELOPMENT_ROADMAP.md` until Builder V2 and NSM are jointly delivered. Future roadmap tasks should consume the shared contracts and translation gateway to keep integrations plug-and-play.
