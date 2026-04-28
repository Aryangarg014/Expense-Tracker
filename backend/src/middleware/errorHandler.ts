import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

// ─── ErrorResponse shape ──────────────────────────────────────────────────────
// Every error from this API returns the same JSON shape so the frontend
// always knows what to expect regardless of what went wrong.
interface ErrorResponse {
  status: 'fail' | 'error'; // 'fail' = 4xx (client mistake), 'error' = 5xx (server)
  message: string;
  stack?: string;            // only included in development mode
}

// ─── globalErrorHandler ───────────────────────────────────────────────────────
// Express identifies an error-handling middleware by its 4-parameter signature.
// MUST be registered LAST in server.ts (after all routes).
export const globalErrorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction   // must be declared even if unused — Express requires it
): void => {
  let statusCode = 500;
  let status: 'fail' | 'error' = 'error';
  let message = 'Something went wrong. Please try again later.';

  // ── Our own AppError (predictable, operational) ───────────────────────────
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    status = statusCode < 500 ? 'fail' : 'error';
    message = err.message;
  }

  // ── Mongoose duplicate key (e.g. duplicate email on register) ─────────────
  if ((err as { code?: number }).code === 11000) {
    statusCode = 409;
    status = 'fail';
    message = 'A record with that value already exists.';
  }

  // ── Mongoose validation error (e.g. missing required field) ──────────────
  if (err.name === 'ValidationError') {
    statusCode = 400;
    status = 'fail';
    // Cast through unknown — TS requires this when types don't sufficiently overlap
    const mongooseErr = (err as unknown) as {
      errors: Record<string, { message: string }>;
    };
    message = Object.values(mongooseErr.errors)
      .map((e) => e.message)
      .join(', ');
  }

  // ── JWT errors (handled here so auth middleware stays clean) ──────────────
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    status = 'fail';
    message = 'Invalid token. Please log in again.';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    status = 'fail';
    message = 'Your session has expired. Please log in again.';
  }

  const response: ErrorResponse = { status, message };

  // Expose stack trace only in development — never leak internals in production
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};
