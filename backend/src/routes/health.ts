import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';

const router = Router();

// GET /api/health
// Returns server + database status. Used by uptime monitors and deployment checks.
router.get('/', (_req: Request, res: Response) => {
  // mongoose.connection.readyState: 0=disconnected, 1=connected, 2=connecting
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    environment: process.env.NODE_ENV ?? 'development',
  });
});

export default router;
