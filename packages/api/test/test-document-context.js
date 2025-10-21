#!/usr/bin/env node

/**
 * Test script for document context in simulations
 *
 * This tests:
 * 1. Document upload and analysis
 * 2. Using document for setup auto-population
 * 3. Creating simulation with document context
 * 4. Running simulation with document-aware AI responses
 */

import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';

// Test configuration
const TEST_FILE_PATH = path.join(__dirname, 'test-case-study.txt');
const TEST_CASE_CONTENT = `
CASE STUDY: GreenTech Energy Solutions - Strategic Crossroads

Company Background:
GreenTech Energy Solutions is a renewable energy company founded in 2015 by Sarah Martinez and David Chen. The company specializes in solar panel installation and energy storage solutions for commercial buildings. With 250 employees and $45 million in annual revenue, GreenTech has grown steadily in the Pacific Northwest market.

Current Situation:
Q3 2024 Financial Highlights:
- Revenue: $12.5M (15% YoY growth)
- Operating margin: 18%
- Cash reserves: $8.2M
- Outstanding debt: $5.5M
- Customer retention: 92%

The Opportunity:
TechCorp, a Fortune 500 technology company, has offered GreenTech an exclusive 5-year contract worth $120 million to retrofit all 50 of their North American facilities with solar installations. However, accepting this contract would require:
- Hiring 150 additional technicians within 3 months
- Securing $25M in equipment financing
- Dedicating 80% of company resources to this single client
- Relocating operations headquarters to Silicon Valley

The Alternative:
EcoVentures, a private equity firm focused on sustainable businesses, has simultaneously offered to acquire GreenTech for $85 million, with the following terms:
- $60M upfront cash payment
- $25M in performance-based earnouts over 3 years
- Founders retain 15% equity stake
- Current management team stays in place
- Access to $50M growth capital for expansion

Key Stakeholders:
1. Sarah Martinez (Co-founder/CEO): Wants to maintain company culture and employee welfare
2. David Chen (Co-founder/CTO): Focused on technological innovation and market leadership
3. Board of Directors: Split between growth opportunity and risk mitigation
4. Emily Rodriguez (CFO): Concerned about cash flow and financial stability
5. Union Representatives: Worried about job security and working conditions
6. Existing Customers: Fear service quality degradation if company pivots

Critical Factors:
- Market Analysis: Solar industry growing 22% annually, but increasing competition
- Regulatory Environment: New federal incentives worth $10B for renewable energy
- Technology Shift: Next-gen solar efficiency breakthrough expected within 18 months
- Talent Market: Severe shortage of qualified solar technicians (15,000 open positions nationally)
- Economic Indicators: Potential recession predicted for 2025

Time Pressure:
- TechCorp contract decision required by October 31, 2024
- EcoVentures offer expires November 15, 2024
- Current contracts worth $15M completing in Q1 2025
- Equipment supplier credit terms renegotiation due November 1, 2024

Financial Projections:
Scenario A (TechCorp Contract):
- Year 1: Revenue $65M, Operating Margin 12%
- Year 2: Revenue $75M, Operating Margin 20%
- Risk: 60% revenue concentration with single client

Scenario B (EcoVentures Acquisition):
- Immediate liquidity for shareholders
- Access to growth capital
- Reduced entrepreneurial control

Hidden Information:
- TechCorp is secretly considering developing in-house solar capabilities
- A major competitor, SunPower Industries, is planning aggressive West Coast expansion
- David Chen has received a personal offer to join a stealth startup with $50M funding

Learning Objectives:
1. Evaluate strategic growth opportunities versus stability
2. Analyze stakeholder interests and manage conflicts
3. Assess financial risk and reward trade-offs
4. Consider long-term sustainability versus short-term gains
5. Navigate complex multi-party negotiations
`;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function createTestFile() {
  log('Creating test case study document...', 'blue');
  fs.writeFileSync(TEST_FILE_PATH, TEST_CASE_CONTENT);
  log('✓ Test document created', 'green');
}

async function testDocumentForSetup() {
  log('\n=== Testing Document Analysis for Setup Auto-Population ===', 'magenta');

  const form = new FormData();
  form.append('file', fs.createReadStream(TEST_FILE_PATH));
  form.append('custom_instructions', 'Extract all stakeholders, financial data, and decision points for simulation setup');

  try {
    const response = await fetch(`${API_BASE_URL}/api/setup/parse-document-for-setup`, {
      method: 'POST',
      body: form
    });

    const result = await response.json();

    if (response.ok) {
      log('✓ Document analyzed for setup', 'green');
      log(`  - Simulation name: ${result.setup.name}`, 'blue');
      log(`  - Actors identified: ${result.setup.actors.length}`, 'blue');
      log(`  - Objectives: ${result.setup.objectives.length}`, 'blue');
      log(`  - Suggested triggers: ${result.setup.suggestedTriggers.length}`, 'blue');

      // Display some actors
      if (result.setup.actors.length > 0) {
        log('  - Key stakeholders:', 'cyan');
        result.setup.actors.slice(0, 3).forEach(actor => {
          log(`    • ${actor.name} (${actor.role})`, 'blue');
        });
      }

      return result.setup;
    } else {
      log(`✗ Setup analysis failed: ${result.error}`, 'red');
      return null;
    }
  } catch (error) {
    log(`✗ Request failed: ${error.message}`, 'red');
    return null;
  }
}

async function testUploadAndCreateSimulation() {
  log('\n=== Testing Document Upload with Simulation Creation ===', 'magenta');

  const form = new FormData();
  form.append('file', fs.createReadStream(TEST_FILE_PATH));
  form.append('document_instructions', 'Focus on financial data, stakeholder perspectives, and strategic decisions');
  form.append('simulation_name', 'GreenTech Strategic Decision Simulation');
  form.append('simulation_instructions', 'Use Socratic method to explore trade-offs between growth and stability');
  form.append('uploaded_by', 'test-script');

  try {
    const response = await fetch(`${API_BASE_URL}/api/setup/upload-and-create-simulation`, {
      method: 'POST',
      body: form
    });

    const result = await response.json();

    if (response.ok) {
      log('✓ Document uploaded and simulation created', 'green');
      log(`  - Document ID: ${result.document.id}`, 'blue');
      log(`  - Simulation ID: ${result.simulation.id}`, 'blue');
      log(`  - Simulation Name: ${result.simulation.name}`, 'blue');

      return {
        documentId: result.document.id,
        simulationId: result.simulation.id
      };
    } else {
      log(`✗ Failed to create simulation: ${result.error}`, 'red');
      return null;
    }
  } catch (error) {
    log(`✗ Request failed: ${error.message}`, 'red');
    return null;
  }
}

async function testSimulationWithDocumentContext(simulationId) {
  if (!simulationId) {
    log('\n=== Skipping Simulation Test (no simulation ID) ===', 'yellow');
    return false;
  }

  log('\n=== Testing Simulation with Document Context ===', 'magenta');

  // Test questions that should trigger document context usage
  const testQuestions = [
    "What is GreenTech's current financial situation?",
    "Tell me about the TechCorp contract opportunity",
    "What are Sarah Martinez's priorities in this decision?",
    "What are the risks of accepting the TechCorp contract?",
    "How much is EcoVentures offering for the acquisition?"
  ];

  let sessionId = null;
  let allTestsPassed = true;

  for (let i = 0; i < testQuestions.length; i++) {
    const question = testQuestions[i];
    log(`\n  Testing Question ${i + 1}: "${question}"`, 'cyan');

    try {
      const response = await fetch(`${API_BASE_URL}/api/student/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          simulationId: simulationId,
          sessionId: sessionId,
          studentInput: question
        })
      });

      const result = await response.json();

      if (response.ok) {
        sessionId = result.sessionId; // Save for next question

        log(`    ✓ Response received`, 'green');
        log(`    - Document context used: ${result.documentContextUsed}`, 'blue');
        log(`    - Response length: ${result.response.length} chars`, 'blue');

        // Check if response references specific document details
        const responseText = result.response.toLowerCase();
        const hasSpecificDetails =
          responseText.includes('greentech') ||
          responseText.includes('sarah martinez') ||
          responseText.includes('techcorp') ||
          responseText.includes('120 million') ||
          responseText.includes('ecoventures') ||
          responseText.includes('85 million') ||
          responseText.includes('solar');

        if (hasSpecificDetails) {
          log(`    ✓ Response contains specific document details`, 'green');
        } else {
          log(`    ⚠ Response may not be using document context fully`, 'yellow');
        }

        // Display first 200 chars of response
        const preview = result.response.substring(0, 200);
        log(`    - Response preview: "${preview}..."`, 'cyan');

      } else {
        log(`    ✗ Failed: ${result.error}`, 'red');
        allTestsPassed = false;
      }
    } catch (error) {
      log(`    ✗ Request failed: ${error.message}`, 'red');
      allTestsPassed = false;
    }
  }

  return allTestsPassed;
}

async function testDocumentRetrieval(documentId) {
  if (!documentId) {
    log('\n=== Skipping Document Retrieval Test (no document ID) ===', 'yellow');
    return false;
  }

  log('\n=== Testing Document Retrieval with Context ===', 'magenta');

  try {
    const response = await fetch(`${API_BASE_URL}/api/documents/${documentId}`);
    const result = await response.json();

    if (response.ok) {
      log('✓ Document retrieved successfully', 'green');

      const doc = result.document;
      log(`  - File: ${doc.file_name}`, 'blue');
      log(`  - Processing status: ${doc.processing_status}`, 'blue');

      if (doc.analysis) {
        log('  - Analysis summary:', 'cyan');
        const summary = doc.analysis.summary || 'No summary';
        log(`    "${summary.substring(0, 150)}..."`, 'blue');

        if (doc.analysis.actors && doc.analysis.actors.length > 0) {
          log(`  - Actors extracted: ${doc.analysis.actors.length}`, 'blue');
        }

        if (doc.analysis.decisions && doc.analysis.decisions.length > 0) {
          log(`  - Key decisions identified: ${doc.analysis.decisions.length}`, 'blue');
        }
      }

      return true;
    } else {
      log(`✗ Retrieval failed: ${result.error}`, 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Request failed: ${error.message}`, 'red');
    return false;
  }
}

async function cleanup() {
  log('\n=== Cleanup ===', 'magenta');
  if (fs.existsSync(TEST_FILE_PATH)) {
    fs.unlinkSync(TEST_FILE_PATH);
    log('✓ Test file removed', 'green');
  }
}

async function runTests() {
  log('==========================================', 'magenta');
  log('Document Context in Simulations Test Suite', 'magenta');
  log('==========================================', 'magenta');

  try {
    // Create test file
    await createTestFile();

    // Run tests
    const setupConfig = await testDocumentForSetup();
    const { documentId, simulationId } = await testUploadAndCreateSimulation() || {};
    const simulationTestPassed = await testSimulationWithDocumentContext(simulationId);
    const retrievalPassed = await testDocumentRetrieval(documentId);

    // Summary
    log('\n==========================================', 'magenta');
    log('Test Summary', 'magenta');
    log('==========================================', 'magenta');

    const tests = [
      { name: 'Document Analysis for Setup', success: !!setupConfig },
      { name: 'Upload & Create Simulation', success: !!simulationId },
      { name: 'Simulation with Context', success: simulationTestPassed },
      { name: 'Document Retrieval', success: retrievalPassed }
    ];

    tests.forEach(test => {
      const icon = test.success ? '✓' : '✗';
      const color = test.success ? 'green' : 'red';
      log(`${icon} ${test.name}`, color);
    });

    const allPassed = tests.every(t => t.success);
    const passedCount = tests.filter(t => t.success).length;

    log(`\nPassed: ${passedCount}/${tests.length}`, allPassed ? 'green' : 'yellow');

    if (allPassed) {
      log('\n✅ Document context is fully integrated and working!', 'green');
    } else {
      log('\n⚠️  Some tests failed. Check implementation.', 'yellow');
    }

  } catch (error) {
    log(`\nUnexpected error: ${error.message}`, 'red');
  } finally {
    await cleanup();
  }
}

// Check if API is running
async function checkAPIHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Main execution
async function main() {
  log('Checking API availability...', 'yellow');

  const apiHealthy = await checkAPIHealth();

  if (!apiHealthy) {
    log('✗ API is not running or not accessible', 'red');
    log(`  Please ensure the API server is running at ${API_BASE_URL}`, 'yellow');
    log('  You can start it with: npm run api', 'yellow');
    process.exit(1);
  }

  log('✓ API is running', 'green');
  await runTests();
}

main().catch(error => {
  log(`Fatal error: ${error.message}`, 'red');
  process.exit(1);
});