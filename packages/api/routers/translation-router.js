/**
 * Translation Router
 * Validation gateway for NSM - validates scenario outlines and director settings
 */

import express from 'express';

const router = express.Router();

/**
 * Initialize router with translation service dependency
 */
export function createTranslationRouter(translationService) {
  /**
   * POST /validate-outline
   * Validate scenario outline against NSM schemas
   * Body: { outline: {...} }
   */
  router.post('/validate-outline', async (req, res) => {
    try {
      const { outline } = req.body;

      if (!outline) {
        return res.status(400).json({
          error: 'outline is required'
        });
      }

      const result = await translationService.validateOutline(outline);
      res.status(result.valid ? 200 : 400).json(result);
    } catch (error) {
      console.error('Translation validation error:', error);
      res.status(500).json({
        error: 'Validation failed',
        details: error.message
      });
    }
  });

  /**
   * POST /validate-settings
   * Validate Director settings against NSM schemas
   * Body: { settings: {...} }
   */
  router.post('/validate-settings', async (req, res) => {
    try {
      const { settings } = req.body;

      if (!settings) {
        return res.status(400).json({
          error: 'settings are required'
        });
      }

      const result = await translationService.validateSettings(settings);
      res.status(result.valid ? 200 : 400).json(result);
    } catch (error) {
      console.error('Settings validation error:', error);
      res.status(500).json({
        error: 'Validation failed',
        details: error.message
      });
    }
  });

  /**
   * POST /validate-complete
   * Validate complete simulation configuration
   * Body: { scenario_outline: {...}, director_settings: {...} }
   */
  router.post('/validate-complete', async (req, res) => {
    try {
      const result = await translationService.validateComplete(req.body);
      res.status(result.valid ? 200 : 400).json(result);
    } catch (error) {
      console.error('Complete validation error:', error);
      res.status(500).json({
        error: 'Validation failed',
        details: error.message
      });
    }
  });

  /**
   * POST /snapshot
   * Create validated snapshot for NSM runtime
   * Body: { simulationId: "...", config: {...} }
   */
  router.post('/snapshot', async (req, res) => {
    try {
      const { simulationId, config } = req.body;

      if (!simulationId || !config) {
        return res.status(400).json({
          error: 'simulationId and config are required'
        });
      }

      const snapshot = await translationService.createSnapshot(simulationId, config);

      // Optionally save snapshot to database here
      // await db.saveSnapshot(snapshot);

      res.status(200).json({
        success: true,
        snapshot
      });
    } catch (error) {
      console.error('Snapshot creation error:', error);
      res.status(400).json({
        error: 'Snapshot creation failed',
        details: error.message
      });
    }
  });

  return router;
}

export default createTranslationRouter;
