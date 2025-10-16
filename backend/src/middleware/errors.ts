import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Custom application error class with HTTP status code
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Centralized error handler middleware
 * Maps errors to consistent { error: string } response format
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Default to 500 if not an AppError
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err.message || 'Internal server error';

  // Log error details
  logger.error('Request error', {
    method: req.method,
    path: req.path,
    statusCode,
    message,
    userId: req.userId,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Send error response
  res.status(statusCode).json({ error: message });
}

/**
 * Helper to create common error types
 */
export const errors = {
  badRequest: (message: string) => new AppError(400, message),
  unauthorized: (message: string) => new AppError(401, message),
  notFound: (message: string) => new AppError(404, message),
  conflict: (message: string) => new AppError(409, message),
  gone: (message: string) => new AppError(410, message),
  internal: (message: string) => new AppError(500, message),
};
