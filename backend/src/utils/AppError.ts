// ─── AppError ─────────────────────────────────────────────────────────────────
// A custom error class that carries an HTTP status code alongside the message.
// Usage: throw new AppError('Not found', 404)
// The global error handler in errorHandler.ts catches this and sends a clean
// JSON response instead of leaking a raw stack trace to the client.
export class AppError extends Error {
  public readonly statusCode: number;

  // isOperational = true means this is a predictable, user-facing error
  // (e.g. "wrong password"). false would mean a programmer bug or system failure.
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);           // pass message up to the base Error class
    this.statusCode = statusCode;
    this.isOperational = true;

    // Restore the prototype chain — required when extending built-in classes in TS
    Object.setPrototypeOf(this, new.target.prototype);

    // Capture stack trace, excluding this constructor frame
    Error.captureStackTrace(this, this.constructor);
  }
}
