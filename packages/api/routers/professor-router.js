/**
 * Professor Router
 * Handles professor operations: creating, editing, and managing simulations
 */

import express from 'express';

const router = express.Router();

/**
 * Initialize router with dependencies
 */
export function createProfessorRouter(dependencies) {
  const { db } = dependencies;

  /**
   * POST /setup
   * Create a new simulation
   * Body: { scenario, instructions, name?, actors?, objectives?, parameters? }
   */
  router.post('/setup', async (req, res) => {
    try {
      const { scenario, instructions, name, actors, objectives, parameters } = req.body;

      if (!scenario || !instructions) {
        return res.status(400).json({
          error: 'Both scenario and instructions are required',
          received: { scenario: !!scenario, instructions: !!instructions }
        });
      }

      // Create simulation in database with data from setup system
      const simulation = await db.createSimulation({
        name: name || 'Untitled Simulation',
        scenario_text: scenario,
        actors: actors || [],
        objectives: objectives || [],
        parameters: {
          duration: parameters?.duration || 20,
          ai_mode: parameters?.ai_mode || 'challenger',
          complexity: parameters?.complexity || 'escalating',
          narrative_freedom: parameters?.narrative_freedom || 0.7,
          ...parameters,
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

  /**
   * PATCH /edit
   * Update simulation configuration
   * Body: { simulationId, name?, scenario?, instructions?, actors?, objectives?, parameters? }
   */
  router.patch('/edit', async (req, res) => {
    try {
      const { simulationId, name, scenario, instructions, actors, objectives, parameters } = req.body;

      if (!simulationId) {
        return res.status(400).json({
          error: 'simulationId is required'
        });
      }

      // Build update object
      const updates = {};

      if (name) {
        updates.name = name;
      }

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

  /**
   * GET /simulations
   * List all simulations for a professor
   * Query params: created_by?
   */
  router.get('/simulations', async (req, res) => {
    try {
      const filters = { is_template: false };

      if (req.query.created_by) {
        filters.created_by = req.query.created_by;
      }

      const simulations = await db.listSimulations(filters);

      res.status(200).json({
        simulations: simulations,
        count: simulations.length
      });

    } catch (error) {
      console.error('Error listing professor simulations:', error);
      res.status(500).json({
        error: 'Failed to list simulations',
        details: error.message
      });
    }
  });

  return router;
}

export default createProfessorRouter;
