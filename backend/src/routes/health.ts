import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';

const router = Router();

/**
 * GET /api/healthz
 * Health check endpoint
 */
router.get('/healthz', (_req: Request, res: Response) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

  res.status(200).json({
    ok: true,
    timestamp: new Date().toISOString(),
    database: dbStatus,
  });
});

export default router;
