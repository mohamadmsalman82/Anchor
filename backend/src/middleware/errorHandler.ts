import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

/**
 * Error handler middleware
 * Centralized error handling for all routes
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Error:', err);

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation error',
      details: err.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    // Handle unique constraint violations
    if ((err as any).code === 'P2002') {
      res.status(409).json({
        error: 'Resource already exists',
        field: (err as any).meta?.target,
      });
      return;
    }
    // Handle not found errors
    if ((err as any).code === 'P2025') {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }
  }

  // Handle custom error messages
  if (err.message) {
    const statusCode = (err as any).statusCode || 500;
    res.status(statusCode).json({
      error: err.message,
    });
    return;
  }

  // Default error response
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
}

/**
 * 404 handler for undefined routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
  });
}

