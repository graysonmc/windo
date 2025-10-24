/**
 * Comprehensive Test Suite for Translation Service
 * Tests validation, warning generation, and integration
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000/api/translation';

// ANSI color codes for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Test counter
let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name, passed, details = '') {
  testsRun++;
  if (passed) {
    testsPassed++;
    log(`✓ ${name}`, 'green');
  } else {
    testsFailed++;
    log(`✗ ${name}`, 'red');
    if (details) log(`  ${details}`, 'yellow');
  }
}

function logSection(title) {
  log(`\n${'='.repeat(60)}`, 'blue');
  log(`  ${title}`, 'blue');
  log('='.repeat(60), 'blue');
}

// Test data fixtures
const validOutline = {
  goals: [
    {
      id: 'goal-1',
      description: 'Understand market segmentation',
      priority: 1,
      required: true,
      success_criteria: {
        required_evidence: [
          'Student identifies target segments',
          'Student explains segmentation rationale'
        ],
        assessment_method: 'llm_analysis',
        partial_credit: true
      },
      progress_tracking: {
        milestones: [
          {
            at: 0.5,
            indicator: 'Student identifies at least 3 market segments with characteristics'
          },
          {
            at: 1.0,
            indicator: 'Student explains rationale for segmentation strategy'
          }
        ],
        measurement: 'progress_llm_scoring'
      }
    }
  ],
  rules: [
    'Actor should not reveal the answer directly',
    'Challenge student assumptions'
  ],
  director_triggers: [
    {
      name: 'Student stuck on basic concept',
      condition: 'Student asks same question 3+ times',
      director_action: 'Simplify explanation or provide example',
      urgency: 'high'
    }
  ]
};

const outlineWithoutSuccessCriteria = {
  goals: [
    {
      id: 'goal-1',
      description: 'Understand market segmentation',
      priority: 1,
      required: true,
      success_criteria: {
        required_evidence: [], // Empty - should trigger warning
        assessment_method: 'llm_analysis',
        partial_credit: true
      },
      progress_tracking: {
        milestones: [
          {
            at: 1.0,
            indicator: 'Student completes goal'
          }
        ],
        measurement: 'progress_llm_scoring'
      }
    }
  ]
};

const invalidOutline = {
  goals: [
    {
      id: 'goal-1',
      description: 'Test goal',
      priority: 'high', // Should be number
      required: true
    }
  ]
};

const validSettings = {
  intensity: 'assist',
  evaluation_cadence: {
    message_interval: 3,
    time_interval_seconds: 120,
    event_triggers: ['student_stuck', 'off_track']
  },
  learning_objective_targets: {
    'goal-1': {
      threshold: 0.7,
      priority: 'high'
    }
  },
  allowed_actor_interventions: ['goal_shift', 'tone_adjustment'],
  adaptation_flexibility: 60
};

const settingsWithIntensityOff = {
  intensity: 'off',
  evaluation_cadence: {
    message_interval: 5
  }
};

const settingsWithNoCadence = {
  intensity: 'assist',
  evaluation_cadence: {
    // No message_interval, time_interval, or event_triggers
  }
};

// Test functions
async function testValidateOutline() {
  logSection('TEST: Validate Outline Endpoint');

  // Test 1: Valid outline
  try {
    const response = await fetch(`${API_BASE}/validate-outline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outline: validOutline })
    });
    const result = await response.json();

    logTest(
      'Valid outline should pass validation',
      result.valid === true && response.status === 200,
      !result.valid ? JSON.stringify(result.errors) : ''
    );

    if (result.valid) {
      log(`  Schema version: ${result.schema_version}`, 'blue');
      log(`  Warnings: ${result.warnings.length}`, 'blue');
    }
  } catch (error) {
    logTest('Valid outline should pass validation', false, error.message);
  }

  // Test 2: Outline missing success criteria (should warn)
  try {
    const response = await fetch(`${API_BASE}/validate-outline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outline: outlineWithoutSuccessCriteria })
    });
    const result = await response.json();

    const hasWarning = result.warnings && result.warnings.some(w =>
      w.field.includes('success_criteria')
    );

    logTest(
      'Missing success criteria should generate warning',
      hasWarning,
      !hasWarning ? 'No success_criteria warning found' : ''
    );

    if (hasWarning) {
      log(`  Warning: ${result.warnings[0].message}`, 'yellow');
    }
  } catch (error) {
    logTest('Missing success criteria should generate warning', false, error.message);
  }

  // Test 3: Invalid outline (wrong data types)
  try {
    const response = await fetch(`${API_BASE}/validate-outline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outline: invalidOutline })
    });
    const result = await response.json();

    logTest(
      'Invalid outline should fail validation',
      result.valid === false && response.status === 400,
      result.valid ? 'Validation should have failed' : ''
    );

    if (!result.valid) {
      log(`  Errors found: ${result.errors.length}`, 'blue');
      log(`  First error: ${result.errors[0].message}`, 'blue');
    }
  } catch (error) {
    logTest('Invalid outline should fail validation', false, error.message);
  }
}

async function testValidateSettings() {
  logSection('TEST: Validate Settings Endpoint');

  // Test 1: Valid settings
  try {
    const response = await fetch(`${API_BASE}/validate-settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: validSettings })
    });
    const result = await response.json();

    logTest(
      'Valid settings should pass validation',
      result.valid === true && response.status === 200,
      !result.valid ? JSON.stringify(result.errors) : ''
    );
  } catch (error) {
    logTest('Valid settings should pass validation', false, error.message);
  }

  // Test 2: Intensity OFF (should warn)
  try {
    const response = await fetch(`${API_BASE}/validate-settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: settingsWithIntensityOff })
    });
    const result = await response.json();

    const hasWarning = result.warnings && result.warnings.some(w =>
      w.field === 'intensity'
    );

    logTest(
      'Intensity OFF should generate warning',
      hasWarning,
      !hasWarning ? 'No intensity warning found' : ''
    );

    if (hasWarning) {
      log(`  Warning: ${result.warnings[0].message}`, 'yellow');
    }
  } catch (error) {
    logTest('Intensity OFF should generate warning', false, error.message);
  }

  // Test 3: No evaluation cadence (should error)
  try {
    const response = await fetch(`${API_BASE}/validate-settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: settingsWithNoCadence })
    });
    const result = await response.json();

    const hasError = result.warnings && result.warnings.some(w =>
      w.severity === 'error' && w.field === 'evaluation_cadence'
    );

    logTest(
      'No evaluation cadence should generate error warning',
      hasError,
      !hasError ? 'No evaluation_cadence error found' : ''
    );

    if (hasError) {
      log(`  Error: ${result.warnings.find(w => w.severity === 'error').message}`, 'yellow');
    }
  } catch (error) {
    logTest('No evaluation cadence should generate error warning', false, error.message);
  }
}

async function testValidateComplete() {
  logSection('TEST: Validate Complete Configuration');

  // Test 1: Valid complete config
  try {
    const response = await fetch(`${API_BASE}/validate-complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenario_outline: validOutline,
        director_settings: validSettings
      })
    });
    const result = await response.json();

    logTest(
      'Valid complete config should pass',
      result.valid === true && response.status === 200,
      !result.valid ? JSON.stringify(result.errors) : ''
    );

    if (result.valid) {
      log(`  Schema version: ${result.schema_version}`, 'blue');
      log(`  Total warnings: ${result.warnings.length}`, 'blue');
      log(`  Has normalized outline: ${!!result.normalized.scenario_outline}`, 'blue');
      log(`  Has normalized settings: ${!!result.normalized.director_settings}`, 'blue');
    }
  } catch (error) {
    logTest('Valid complete config should pass', false, error.message);
  }

  // Test 2: Invalid outline + valid settings
  try {
    const response = await fetch(`${API_BASE}/validate-complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenario_outline: invalidOutline,
        director_settings: validSettings
      })
    });
    const result = await response.json();

    const hasOutlineError = result.errors && result.errors.some(e =>
      e.field === 'scenario_outline'
    );

    logTest(
      'Invalid outline should fail complete validation',
      result.valid === false && hasOutlineError,
      !hasOutlineError ? 'Should have scenario_outline error' : ''
    );
  } catch (error) {
    logTest('Invalid outline should fail complete validation', false, error.message);
  }
}

async function testSnapshot() {
  logSection('TEST: Snapshot Creation');

  // Test 1: Create snapshot with valid config
  try {
    const response = await fetch(`${API_BASE}/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        simulationId: 'test-sim-123',
        config: {
          scenario_outline: validOutline,
          director_settings: validSettings
        }
      })
    });
    const result = await response.json();

    const snapshotValid = result.success === true &&
                          result.snapshot &&
                          result.snapshot.snapshot_id &&
                          result.snapshot.simulation_id === 'test-sim-123';

    logTest(
      'Valid config should create snapshot',
      snapshotValid,
      !snapshotValid ? JSON.stringify(result) : ''
    );

    if (snapshotValid) {
      log(`  Snapshot ID: ${result.snapshot.snapshot_id}`, 'blue');
      log(`  Schema version: ${result.snapshot.schema_version}`, 'blue');
      log(`  Created at: ${result.snapshot.created_at}`, 'blue');
      log(`  Warnings: ${result.snapshot.warnings.length}`, 'blue');
    }
  } catch (error) {
    logTest('Valid config should create snapshot', false, error.message);
  }

  // Test 2: Invalid config should fail snapshot
  try {
    const response = await fetch(`${API_BASE}/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        simulationId: 'test-sim-456',
        config: {
          scenario_outline: invalidOutline,
          director_settings: validSettings
        }
      })
    });
    const result = await response.json();

    logTest(
      'Invalid config should fail snapshot creation',
      result.error === 'Snapshot creation failed',
      !result.error ? 'Should have returned error' : ''
    );

    if (result.error) {
      log(`  Error: ${result.error}`, 'blue');
    }
  } catch (error) {
    logTest('Invalid config should fail snapshot creation', false, error.message);
  }
}

async function testSchemaVersioning() {
  logSection('TEST: Schema Versioning');

  try {
    const response = await fetch(`${API_BASE}/validate-outline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outline: validOutline })
    });
    const result = await response.json();

    logTest(
      'Response should include schema version',
      result.schema_version === '1.0.0',
      result.schema_version !== '1.0.0' ? `Got: ${result.schema_version}` : ''
    );

    if (result.valid && result.outline) {
      logTest(
        'Normalized outline should include schema version',
        result.outline.schema_version === '1.0.0',
        result.outline.schema_version !== '1.0.0' ? `Got: ${result.outline.schema_version}` : ''
      );
    }
  } catch (error) {
    logTest('Response should include schema version', false, error.message);
  }
}

// Run all tests
async function runAllTests() {
  log('\n🧪 Translation Service Test Suite', 'blue');
  log('Testing Phase 0 Components: Shared Contracts + Translation Service\n', 'blue');

  try {
    await testValidateOutline();
    await testValidateSettings();
    await testValidateComplete();
    await testSnapshot();
    await testSchemaVersioning();

    // Summary
    logSection('TEST RESULTS SUMMARY');
    log(`Total tests run: ${testsRun}`, 'blue');
    log(`Passed: ${testsPassed}`, 'green');
    log(`Failed: ${testsFailed}`, testsFailed > 0 ? 'red' : 'green');
    log(`Success rate: ${((testsPassed / testsRun) * 100).toFixed(1)}%\n`,
        testsFailed === 0 ? 'green' : 'yellow');

    if (testsFailed === 0) {
      log('✅ All tests passed! Phase 0 validation complete.', 'green');
      log('\nNext steps:', 'blue');
      log('  1. Refactor API into feature routers', 'blue');
      log('  2. Split simulation-engine into actor/director modules', 'blue');
    } else {
      log('❌ Some tests failed. Review errors above.', 'red');
    }

    process.exit(testsFailed > 0 ? 1 : 0);
  } catch (error) {
    log(`\n❌ Test suite error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run tests
runAllTests();
