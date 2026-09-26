import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): Response {
  logger.error(
    {
      requestId: req.id,
      path: req.path,
      method: req.method,
      error: err.message,
      stack: err.stack
    },
    'Unhandled request error'
  );

  if (err instanceof ZodError) {
    return sendError(res, 'Validation error', 400, 'VALIDATION_ERROR', err.errors);
  }

  return sendError(
    res,
    process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    500,
    'INTERNAL_SERVER_ERROR'
  );
}
