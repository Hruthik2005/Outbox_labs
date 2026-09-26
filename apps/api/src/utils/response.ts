import { Response } from 'express';
import { ApiResponse } from '@reachinbox/shared';

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: ApiResponse<T>['meta']
): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      ...meta,
      requestId: (res.req as { id?: string }).id
    }
  };
  return res.status(statusCode).json(response);
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 400,
  code = 'BAD_REQUEST',
  details?: unknown
): Response {
  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      details
    },
    meta: {
      requestId: (res.req as { id?: string }).id
    }
  };
  return res.status(statusCode).json(response);
}
