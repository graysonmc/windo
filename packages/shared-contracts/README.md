# @windo/shared-contracts

Shared schemas and type definitions for Windo NSM.

## Purpose

Ensures contract alignment between:
- Simulation Builder V2
- NSM Director Runtime
- Translation Service
- API Layer

## Installation

```bash
npm install @windo/shared-contracts
```

## Usage

```javascript
import {
  validateScenarioOutline,
  validateDirectorSettings,
  validateSimulationConfig
} from '@windo/shared-contracts';

// Validate a scenario outline
const result = validateScenarioOutline(myOutline);

// Validate complete config
const configResult = validateSimulationConfig({
  scenario_outline: myOutline,
  director_settings: mySettings
});

if (!configResult.valid) {
  console.error('Validation errors:', configResult.errors);
}
```

## Schemas

### Scenario Outline
- Goals with success criteria and progress milestones
- Actor triggers (keyword, sentiment, progress-based)
- Director triggers (intervention conditions)
- Suggested structure (beginning/middle/end)
- Adaptation constraints (what Director can/cannot do)

### Director Settings
- Intensity level (off/assist/assertive)
- Evaluation cadence (message intervals, events)
- Learning objective targets
- Allowed interventions
- Verification policy

### Director State
- Current phase tracking
- Objective progress (per goal)
- Tension/divergence scores
- Pending events
- Actor engagement metrics

## Schema Versioning

All schemas include `schema_version` field.

Current version: **1.0.0**

## Development

```bash
# Run tests (when implemented)
npm test

# Publish (for maintainers)
npm publish
```
