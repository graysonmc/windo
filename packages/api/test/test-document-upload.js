#!/usr/bin/env node

/**
 * Test script for document upload and storage functionality
 *
 * Usage: node test-document-upload.js
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
const TEST_FILE_PATH = path.join(__dirname, 'test-document.txt');
const TEST_FILE_CONTENT = `
Business Case Study: TechStart Innovation Hub

Background:
TechStart Innovation Hub is a growing tech incubator facing critical decisions about expansion and partnership strategies. Founded in 2018, the company has successfully launched 45 startups with a 72% survival rate after 18 months.

Current Situation:
The company has received a $10 million investment offer from VentureGlobal Partners, but accepting it would require giving up 35% equity and board control. Meanwhile, a competing incubator, LaunchPad Dynamics, has proposed a merger that would create the region's largest startup ecosystem.

Key Stakeholders:
- Sarah Chen (CEO): Favors maintaining independence
- Marcus Johnson (COO): Supports the merger for operational efficiency
- The Board of Directors: Divided on the best path forward
- Portfolio Companies: Concerned about changes to support structure
- Investment Team: Pushing for aggressive growth

Learning Objectives:
1. Evaluate strategic partnership decisions
2. Analyze equity vs growth trade-offs
3. Consider stakeholder perspectives in decision-making
4. Assess market positioning strategies

Critical Decision Points:
- Accept VentureGlobal's investment with equity dilution
- Pursue the merger with LaunchPad Dynamics
- Seek alternative funding sources
- Maintain current operations and organic growth
`;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function createTestFile() {
  log('Creating test document...', 'blue');
  fs.writeFileSync(TEST_FILE_PATH, TEST_FILE_CONTENT);
  log('✓ Test document created', 'green');
}

async function testBasicUpload() {
  log('\n=== Testing Basic File Upload (No Database Save) ===', 'magenta');

  const form = new FormData();
  form.append('file', fs.createReadStream(TEST_FILE_PATH));
  form.append('document_instructions', 'Extract key business insights and stakeholder perspectives');

  try {
    const response = await fetch(`${API_BASE_URL}/api/setup/parse-file`, {
      method: 'POST',
      body: form
    });

    const result = await response.json();

    if (response.ok) {
      log('✓ File uploaded and processed successfully', 'green');
      log(`  - File: ${result.document.fileName}`, 'blue');
      log(`  - Text length: ${result.document.extractedLength} characters`, 'blue');
      log(`  - Saved to DB: ${result.document.saved}`, 'blue');
    } else {
      log(`✗ Upload failed: ${result.error}`, 'red');
    }

    return response.ok;
  } catch (error) {
    log(`✗ Request failed: ${error.message}`, 'red');
    return false;
  }
}

async function testUploadWithDatabaseSave() {
  log('\n=== Testing File Upload with Database Save ===', 'magenta');

  const form = new FormData();
  form.append('file', fs.createReadStream(TEST_FILE_PATH));
  form.append('document_instructions', 'Focus on strategic decisions and learning outcomes');
  form.append('save_to_database', 'true');
  form.append('uploaded_by', 'test-script');

  try {
    const response = await fetch(`${API_BASE_URL}/api/setup/parse-file`, {
      method: 'POST',
      body: form
    });

    const result = await response.json();

    if (response.ok) {
      log('✓ File uploaded and saved to database', 'green');
      log(`  - Document ID: ${result.document.id}`, 'blue');
      log(`  - File: ${result.document.fileName}`, 'blue');
      log(`  - Saved: ${result.document.saved}`, 'blue');

      if (result.document.analysis) {
        log('  - Analysis summary:', 'yellow');
        log(`    ${result.document.analysis.summary || 'No summary'}`, 'blue');
      }

      return result.document.id;
    } else {
      log(`✗ Upload failed: ${result.error}`, 'red');
      return null;
    }
  } catch (error) {
    log(`✗ Request failed: ${error.message}`, 'red');
    return null;
  }
}

async function testRetrieveDocument(documentId) {
  if (!documentId) {
    log('\n=== Skipping Document Retrieval (no document ID) ===', 'yellow');
    return false;
  }

  log('\n=== Testing Document Retrieval ===', 'magenta');

  try {
    const response = await fetch(`${API_BASE_URL}/api/documents/${documentId}`);
    const result = await response.json();

    if (response.ok) {
      log('✓ Document retrieved successfully', 'green');
      log(`  - ID: ${result.document.id}`, 'blue');
      log(`  - File: ${result.document.file_name}`, 'blue');
      log(`  - Type: ${result.document.file_type}`, 'blue');
      log(`  - Size: ${result.document.file_size} bytes`, 'blue');
      log(`  - Status: ${result.document.processing_status}`, 'blue');
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

async function testListDocuments() {
  log('\n=== Testing Document Listing ===', 'magenta');

  try {
    const response = await fetch(`${API_BASE_URL}/api/documents?uploaded_by=test-script`);
    const result = await response.json();

    if (response.ok) {
      log('✓ Documents listed successfully', 'green');
      log(`  - Total documents: ${result.count}`, 'blue');

      if (result.documents.length > 0) {
        log('  - Recent documents:', 'yellow');
        result.documents.slice(0, 3).forEach(doc => {
          log(`    • ${doc.file_name} (${doc.file_type})`, 'blue');
        });
      }
      return true;
    } else {
      log(`✗ Listing failed: ${result.error}`, 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Request failed: ${error.message}`, 'red');
    return false;
  }
}

async function testCreateSimulationFromDocument(documentId) {
  if (!documentId) {
    log('\n=== Skipping Simulation Creation (no document ID) ===', 'yellow');
    return false;
  }

  log('\n=== Testing Simulation Creation from Document ===', 'magenta');

  try {
    const response = await fetch(`${API_BASE_URL}/api/documents/${documentId}/create-simulation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Simulation - TechStart Case',
        instructions: 'Challenge students to think critically about growth strategies',
        parameters: {
          duration: 25,
          ai_mode: 'socratic',
          complexity: 'adaptive'
        }
      })
    });

    const result = await response.json();

    if (response.ok) {
      log('✓ Simulation created from document', 'green');
      log(`  - Simulation ID: ${result.simulationId}`, 'blue');
      log(`  - Name: ${result.simulation.name}`, 'blue');
      log(`  - Actors: ${result.simulation.actors.length}`, 'blue');
      log(`  - Objectives: ${result.simulation.objectives.length}`, 'blue');
      return result.simulationId;
    } else {
      log(`✗ Simulation creation failed: ${result.error}`, 'red');
      return null;
    }
  } catch (error) {
    log(`✗ Request failed: ${error.message}`, 'red');
    return null;
  }
}

async function testUploadAndCreateSimulation() {
  log('\n=== Testing Upload + Create Simulation (All-in-One) ===', 'magenta');

  const form = new FormData();
  form.append('file', fs.createReadStream(TEST_FILE_PATH));
  form.append('document_instructions', 'Focus on decision-making scenarios');
  form.append('simulation_name', 'All-in-One Test Simulation');
  form.append('simulation_instructions', 'Use Socratic questioning to explore trade-offs');
  form.append('uploaded_by', 'test-script');

  try {
    const response = await fetch(`${API_BASE_URL}/api/setup/upload-and-create-simulation`, {
      method: 'POST',
      body: form
    });

    const result = await response.json();

    if (response.ok) {
      log('✓ Document uploaded and simulation created successfully', 'green');
      log(`  - Document ID: ${result.document.id}`, 'blue');
      log(`  - Simulation ID: ${result.simulation.id}`, 'blue');
      log(`  - Simulation Name: ${result.simulation.name}`, 'blue');
      return true;
    } else {
      log(`✗ Operation failed: ${result.error}`, 'red');
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
  log('====================================', 'magenta');
  log('Document Upload & Storage Test Suite', 'magenta');
  log('====================================', 'magenta');

  try {
    // Create test file
    await createTestFile();

    // Run tests
    const basicUploadSuccess = await testBasicUpload();
    const documentId = await testUploadWithDatabaseSave();
    const retrieveSuccess = await testRetrieveDocument(documentId);
    const listSuccess = await testListDocuments();
    const simulationId = await testCreateSimulationFromDocument(documentId);
    const allInOneSuccess = await testUploadAndCreateSimulation();

    // Summary
    log('\n====================================', 'magenta');
    log('Test Summary', 'magenta');
    log('====================================', 'magenta');

    const tests = [
      { name: 'Basic Upload', success: basicUploadSuccess },
      { name: 'Upload with DB Save', success: !!documentId },
      { name: 'Document Retrieval', success: retrieveSuccess },
      { name: 'Document Listing', success: listSuccess },
      { name: 'Create Simulation from Doc', success: !!simulationId },
      { name: 'All-in-One Upload & Create', success: allInOneSuccess }
    ];

    tests.forEach(test => {
      const icon = test.success ? '✓' : '✗';
      const color = test.success ? 'green' : 'red';
      log(`${icon} ${test.name}`, color);
    });

    const allPassed = tests.every(t => t.success);
    const passedCount = tests.filter(t => t.success).length;

    log(`\nPassed: ${passedCount}/${tests.length}`, allPassed ? 'green' : 'yellow');

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