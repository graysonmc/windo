import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import SimulationEngine from '../core/simulation-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

let currentSimulation = null;

app.post('/api/professor/setup', async (req, res) => {
  try {
    const { scenario, instructions } = req.body;

    if (!scenario || !instructions) {
      return res.status(400).json({
        error: 'Both scenario and instructions are required',
        received: { scenario: !!scenario, instructions: !!instructions }
      });
    }

    currentSimulation = new SimulationEngine(scenario, instructions);

    res.status(201).json({
      message: 'Simulation created successfully',
      simulationId: currentSimulation.simulationId,
      state: currentSimulation.getCurrentState()
    });
  } catch (error) {
    console.error('Error creating simulation:', error);
    res.status(500).json({
      error: 'Failed to create simulation',
      details: error.message
    });
  }
});

app.post('/api/student/respond', async (req, res) => {
  try {
    if (!currentSimulation) {
      return res.status(404).json({
        error: 'No active simulation found',
        message: 'Please ask your professor to set up the simulation first'
      });
    }

    const { studentInput } = req.body;

    if (!studentInput || typeof studentInput !== 'string' || studentInput.trim() === '') {
      return res.status(400).json({
        error: 'Student input is required and must be a non-empty string'
      });
    }

    const response = await currentSimulation.processStudentInput(studentInput);

    res.status(200).json({
      success: true,
      ...response
    });
  } catch (error) {
    console.error('Error processing student response:', error);
    res.status(500).json({
      error: 'Failed to process student input',
      details: error.message
    });
  }
});

app.patch('/api/professor/edit', async (req, res) => {
  try {
    if (!currentSimulation) {
      return res.status(404).json({
        error: 'No active simulation found',
        message: 'Please set up a simulation first'
      });
    }

    const { scenario, instructions } = req.body;

    if (!scenario && !instructions) {
      return res.status(400).json({
        error: 'At least one of scenario or instructions must be provided'
      });
    }

    let result;
    if (scenario && instructions) {
      result = currentSimulation.editScenarioAndInstructions(scenario, instructions);
    } else if (scenario) {
      result = currentSimulation.editScenario(scenario);
    } else {
      result = currentSimulation.editInstructions(instructions);
    }

    res.status(200).json({
      message: 'Simulation updated successfully',
      ...result
    });
  } catch (error) {
    console.error('Error editing simulation:', error);
    res.status(500).json({
      error: 'Failed to edit simulation',
      details: error.message
    });
  }
});

app.get('/api/simulation/state', (req, res) => {
  try {
    if (!currentSimulation) {
      return res.status(404).json({
        error: 'No active simulation found',
        message: 'No simulation has been set up yet'
      });
    }

    const state = currentSimulation.getCurrentState();
    res.status(200).json(state);
  } catch (error) {
    console.error('Error getting simulation state:', error);
    res.status(500).json({
      error: 'Failed to retrieve simulation state',
      details: error.message
    });
  }
});

app.get('/api/simulation/export', (req, res) => {
  try {
    if (!currentSimulation) {
      return res.status(404).json({
        error: 'No active simulation found',
        message: 'No simulation to export'
      });
    }

    const exportData = currentSimulation.exportConversation();

    const format = req.query.format;
    if (format === 'text') {
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="simulation-${exportData.simulationId}.txt"`);

      let textExport = `Simulation Export - ${exportData.simulationId}\n`;
      textExport += `Created: ${exportData.metadata.createdAt}\n`;
      textExport += `Exported: ${exportData.metadata.exportedAt}\n`;
      textExport += `\n=== Scenario ===\n${exportData.scenario}\n`;
      textExport += `\n=== AI Instructions ===\n${exportData.instructions}\n`;
      textExport += `\n=== Conversation ===\n`;
      textExport += currentSimulation.getFormattedConversation();

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

app.delete('/api/simulation/clear', (req, res) => {
  try {
    if (!currentSimulation) {
      return res.status(404).json({
        error: 'No active simulation found',
        message: 'No simulation to clear'
      });
    }

    const clearConversation = req.query.conversation === 'true';
    const clearAll = req.query.all === 'true';

    if (clearAll) {
      currentSimulation = null;
      res.status(200).json({
        success: true,
        message: 'Simulation completely cleared'
      });
    } else if (clearConversation) {
      const result = currentSimulation.clearConversation();
      res.status(200).json(result);
    } else {
      currentSimulation = null;
      res.status(200).json({
        success: true,
        message: 'Simulation cleared'
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

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date(),
    hasActiveSimulation: !!currentSimulation
  });
});

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

app.listen(PORT, () => {
  console.log(`Windo API Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('Available endpoints:');
  console.log('  POST   /api/professor/setup');
  console.log('  POST   /api/student/respond');
  console.log('  PATCH  /api/professor/edit');
  console.log('  GET    /api/simulation/state');
  console.log('  GET    /api/simulation/export');
  console.log('  DELETE /api/simulation/clear');
  console.log('  GET    /api/health');
});