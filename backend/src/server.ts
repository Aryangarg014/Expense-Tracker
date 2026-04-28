// Load .env variables FIRST — before any import that reads process.env
import 'dotenv/config';

import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import connectDB from './config/db';
import { globalErrorHandler } from './middleware/errorHandler';
import { AppError } from './utils/AppError';
import healthRouter from './routes/health';
import authRouter from './routes/auth';
import expenseRouter from './routes/expenses';

// ─── App Setup ────────────────────────────────────────────────────────────────
const app: Application = express();
const PORT = parseInt(process.env.PORT ?? '5000', 10);

// ─── Security & Rate Limiting Middleware ──────────────────────────────────────
app.use(helmet());

// Realistic General API Limit: 100 requests per 15 minutes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { status: 'fail', message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Realistic Auth Limit: 20 requests per 15 minutes to prevent brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { status: 'fail', message: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// cors() allows the Vite frontend (port 5173) to call this API cross-origin
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Idempotency-Key', // custom header — required for duplicate-prevention (Phase 4)
    ],
  })
);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
// Limit to 10kb — mitigates payload-based DoS attacks
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/health', healthRouter);
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/expenses', apiLimiter, expenseRouter);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
// Express 5 requires named wildcards in path patterns
app.all('/{*path}', (req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(`Route ${req.originalUrl} not found.`, 404));
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
// Must be registered LAST — Express identifies it by the 4-parameter signature
app.use(globalErrorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const startServer = async (): Promise<void> => {
  await connectDB(); // connect to MongoDB before accepting requests
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/api/health`);
  });
};

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export default app;
