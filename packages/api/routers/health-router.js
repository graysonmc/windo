/**
 * Health Router
 * Health check and status endpoints
 */

import express from 'express';

const router = express.Router();

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'windo-api',
    version: '1.0.0'
  });
});

export default router;
