/**
 * Simulation Router
 * Handles simulation state, export, and management
 */

import express from 'express';

const router = express.Router();

/**
 * Initialize router with dependencies
 */
export function createSimulationRouter(dependencies) {
  const { db, engine } = dependencies;

  /**
   * GET /state
   * Get current state of a simulation or session
   * Query: simulationId (required), sessionId (optional)
   */
  router.get('/state', async (req, res) => {
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
   * GET /export
   * Export a simulation session
   * Query: sessionId (required), format (optional: 'json' or 'text')
   */
  router.get('/export', async (req, res) => {
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
   * DELETE /clear
   * Clear or delete simulation/session
   * Query: sessionId (to clear session) OR simulationId (to delete simulation)
   */
  router.delete('/clear', async (req, res) => {
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
   * GET /list (mounted at /api/simulations)
   * List all simulations (optionally filtered)
   * Query: is_template (optional boolean)
   */
  router.get('/list', async (req, res) => {
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

  return router;
}

export default createSimulationRouter;
