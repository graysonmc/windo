import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import SimulationEngine from '../core/simulation-engine.js';
import { db } from './database/supabase.js';
import ScenarioParser from './services/scenario-parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Create a single instance of the simulation engine (stateless)
const engine = new SimulationEngine();

// Create a single instance of the scenario parser
const parser = new ScenarioParser();

// ============================================================================
// SETUP ENDPOINTS - Parse and configure simulations
// ============================================================================

/**
 * POST /api/setup/parse
 * Parse scenario text using AI to extract actors, objectives, and configuration
 * Body: { scenario_text }
 */
app.post('/api/setup/parse', async (req, res) => {
  try {
    const { scenario_text } = req.body;

    if (!scenario_text || typeof scenario_text !== 'string' || scenario_text.trim() === '') {
      return res.status(400).json({
        error: 'scenario_text is required and must be a non-empty string'
      });
    }

    // Use AI to parse the scenario
    const parseResult = await parser.parseScenario(scenario_text);

    // Validate actors
    const actorValidation = parser.validateActors(parseResult.parsed.actors);

    res.status(200).json({
      success: true,
      ...parseResult,
      actor_validation: actorValidation
    });

  } catch (error) {
    console.error('Error parsing scenario:', error);
    res.status(500).json({
      error: 'Failed to parse scenario',
      details: error.message
    });
  }
});

// ============================================================================
// PROFESSOR ENDPOINTS - Create and manage simulations
// ============================================================================

/**
 * POST /api/professor/setup
 * Create a new simulation configuration
 */
app.post('/api/professor/setup', async (req, res) => {
  try {
    const { scenario, instructions, name } = req.body;

    if (!scenario || !instructions) {
      return res.status(400).json({
        error: 'Both scenario and instructions are required',
        received: { scenario: !!scenario, instructions: !!instructions }
      });
    }

    // Create simulation in database with basic structure
    const simulation = await db.createSimulation({
      name: name || 'Untitled Simulation',
      scenario_text: scenario,
      actors: [], // Will be enhanced by setup system later
      objectives: [], // Will be enhanced by setup system later
      parameters: {
        duration: 20,
        ai_mode: 'challenger',
        complexity: 'escalating',
        narrative_freedom: 0.7,
        // Legacy: store instructions for backwards compatibility
        instructions: instructions
      }
    });

    res.status(201).json({
      message: 'Simulation created successfully',
      simulationId: simulation.id,
      simulation: simulation
    });
  } catch (error) {
    console.error('Error creating simulation:', error);
    res.status(500).json({
      error: 'Failed to create simulation',
      details: error.message
    });
  }
});

// ============================================================================
// STUDENT ENDPOINTS - Interact with simulations
// ============================================================================

/**
 * POST /api/student/respond
 * Send a message in a simulation session
 * Body: { simulationId, sessionId (optional), studentInput }
 */
app.post('/api/student/respond', async (req, res) => {
  try {
    const { simulationId, sessionId, studentInput } = req.body;

    if (!simulationId) {
      return res.status(400).json({
        error: 'simulationId is required'
      });
    }

    if (!studentInput || typeof studentInput !== 'string' || studentInput.trim() === '') {
      return res.status(400).json({
        error: 'Student input is required and must be a non-empty string'
      });
    }

    // Get simulation configuration
    const simulation = await db.getSimulation(simulationId);

    if (!simulation) {
      return res.status(404).json({
        error: 'Simulation not found',
        simulationId
      });
    }

    // Get or create session
    let session;
    if (sessionId) {
      session = await db.getSession(sessionId);
      if (!session || session.simulation_id !== simulationId) {
        return res.status(404).json({
          error: 'Session not found or does not belong to this simulation'
        });
      }
    } else {
      // Create new session
      session = await db.createSession(simulationId);
    }

    // Process the message with AI
    const aiResponse = await engine.processMessage(
      simulation,
      session.conversation_history,
      studentInput
    );

    // Add student message to history
    await db.addMessageToSession(session.id, {
      role: 'student',
      content: studentInput,
      timestamp: new Date().toISOString()
    });

    // Add AI response to history
    const updatedSession = await db.addMessageToSession(session.id, {
      role: 'ai_advisor',
      content: aiResponse,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      response: aiResponse,
      sessionId: session.id,
      simulationId: simulation.id,
      messageCount: updatedSession.conversation_history.length
    });

  } catch (error) {
    console.error('Error processing student response:', error);
    res.status(500).json({
      error: 'Failed to process student input',
      details: error.message
    });
  }
});

// ============================================================================
// CONFIGURATION ENDPOINTS - Edit simulations
// ============================================================================

/**
 * PATCH /api/professor/edit
 * Update simulation configuration
 * Body: { simulationId, scenario?, instructions?, actors?, objectives?, parameters? }
 */
app.patch('/api/professor/edit', async (req, res) => {
  try {
    const { simulationId, scenario, instructions, actors, objectives, parameters } = req.body;

    if (!simulationId) {
      return res.status(400).json({
        error: 'simulationId is required'
      });
    }

    // Build update object
    const updates = {};

    if (scenario) {
      updates.scenario_text = scenario;
    }

    if (actors) {
      updates.actors = actors;
    }

    if (objectives) {
      updates.objectives = objectives;
    }

    if (parameters || instructions) {
      // Get current simulation to merge parameters
      const current = await db.getSimulation(simulationId);
      updates.parameters = {
        ...current.parameters,
        ...parameters
      };

      // Legacy: support instructions field
      if (instructions) {
        updates.parameters.instructions = instructions;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'At least one field must be provided to update'
      });
    }

    const updatedSimulation = await db.updateSimulation(simulationId, updates);

    res.status(200).json({
      message: 'Simulation updated successfully',
      simulation: updatedSimulation
    });

  } catch (error) {
    console.error('Error editing simulation:', error);
    res.status(500).json({
      error: 'Failed to edit simulation',
      details: error.message
    });
  }
});

// ============================================================================
// STATE & EXPORT ENDPOINTS
// ============================================================================

/**
 * GET /api/simulation/state
 * Get current state of a simulation or session
 * Query: simulationId (required), sessionId (optional)
 */
app.get('/api/simulation/state', async (req, res) => {
  try {
    const { simulationId, sessionId } = req.query;

    if (!simulationId) {
      return res.status(400).json({
        error: 'simulationId query parameter is required'
      });
    }

    const simulation = await db.getSimulation(simulationId);

    if (!simulation) {
      return res.status(404).json({
        error: 'Simulation not found'
      });
    }

    // If sessionId provided, include session data
    if (sessionId) {
      const session = await db.getSession(sessionId);

      if (!session || session.simulation_id !== simulationId) {
        return res.status(404).json({
          error: 'Session not found or does not belong to this simulation'
        });
      }

      res.status(200).json({
        simulation: simulation,
        session: {
          id: session.id,
          state: session.state,
          conversationHistory: session.conversation_history,
          messageCount: session.conversation_history.length,
          startedAt: session.started_at,
          lastActivityAt: session.last_activity_at
        }
      });
    } else {
      // Just return simulation configuration
      res.status(200).json({
        simulation: simulation
      });
    }

  } catch (error) {
    console.error('Error getting simulation state:', error);
    res.status(500).json({
      error: 'Failed to retrieve simulation state',
      details: error.message
    });
  }
});

/**
 * GET /api/simulation/export
 * Export a simulation session
 * Query: sessionId (required), format (optional: 'json' or 'text')
 */
app.get('/api/simulation/export', async (req, res) => {
  try {
    const { sessionId, format } = req.query;

    if (!sessionId) {
      return res.status(400).json({
        error: 'sessionId query parameter is required'
      });
    }

    const session = await db.getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        error: 'Session not found'
      });
    }

    const simulation = session.simulations; // Joined from database query

    const exportData = {
      sessionId: session.id,
      simulationId: simulation.id,
      simulationName: simulation.name,
      scenario: simulation.scenario_text,
      conversation: session.conversation_history,
      metadata: {
        startedAt: session.started_at,
        completedAt: session.completed_at,
        totalMessages: session.conversation_history.length,
        exportedAt: new Date().toISOString()
      }
    };

    if (format === 'text') {
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="session-${session.id}.txt"`);

      let textExport = `Simulation Session Export\n`;
      textExport += `Session ID: ${session.id}\n`;
      textExport += `Simulation: ${simulation.name}\n`;
      textExport += `Started: ${new Date(session.started_at).toLocaleString()}\n`;
      textExport += `Exported: ${new Date().toLocaleString()}\n`;
      textExport += `\n=== SCENARIO ===\n${simulation.scenario_text}\n`;
      textExport += `\n=== CONVERSATION ===\n`;
      textExport += engine.formatConversationForExport(simulation, session.conversation_history);

      res.status(200).send(textExport);
    } else {
      res.status(200).json(exportData);
    }

  } catch (error) {
    console.error('Error exporting simulation:', error);
    res.status(500).json({
      error: 'Failed to export simulation',
      details: error.message
    });
  }
});

/**
 * DELETE /api/simulation/clear
 * Clear or delete simulation/session
 * Query: sessionId (to clear session) OR simulationId (to delete simulation)
 */
app.delete('/api/simulation/clear', async (req, res) => {
  try {
    const { sessionId, simulationId } = req.query;

    if (!sessionId && !simulationId) {
      return res.status(400).json({
        error: 'Either sessionId or simulationId query parameter is required'
      });
    }

    if (sessionId) {
      // Delete specific session
      await db.deleteSession(sessionId);
      res.status(200).json({
        success: true,
        message: 'Session deleted successfully'
      });
    } else if (simulationId) {
      // Delete simulation (cascades to sessions)
      await db.deleteSimulation(simulationId);
      res.status(200).json({
        success: true,
        message: 'Simulation and all associated sessions deleted successfully'
      });
    }

  } catch (error) {
    console.error('Error clearing simulation:', error);
    res.status(500).json({
      error: 'Failed to clear simulation',
      details: error.message
    });
  }
});

/**
 * GET /api/simulations
 * List all simulations (optionally filtered)
 * Query: is_template (optional boolean)
 */
app.get('/api/simulations', async (req, res) => {
  try {
    const filters = {};

    if (req.query.is_template !== undefined) {
      filters.is_template = req.query.is_template === 'true';
    }

    const simulations = await db.listSimulations(filters);

    res.status(200).json({
      simulations: simulations,
      count: simulations.length
    });

  } catch (error) {
    console.error('Error listing simulations:', error);
    res.status(500).json({
      error: 'Failed to list simulations',
      details: error.message
    });
  }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date(),
    database: 'connected'
  });
});

// ============================================================================
// ERROR HANDLERS
// ============================================================================

app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(`\n🚀 Windo API Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💾 Database: Connected to Supabase\n`);
  console.log('Available endpoints:');
  console.log('  POST   /api/setup/parse           - Parse scenario with AI');
  console.log('  POST   /api/professor/setup       - Create simulation');
  console.log('  POST   /api/student/respond       - Send message in session');
  console.log('  PATCH  /api/professor/edit        - Update simulation');
  console.log('  GET    /api/simulation/state      - Get simulation/session state');
  console.log('  GET    /api/simulation/export     - Export session conversation');
  console.log('  DELETE /api/simulation/clear      - Delete session/simulation');
  console.log('  GET    /api/simulations           - List all simulations');
  console.log('  GET    /api/health                - Health check\n');
});
