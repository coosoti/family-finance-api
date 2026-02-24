import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.utils';
import { env } from '../config/env';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Unhandled error:', error);

  const message = env.isDevelopment
    ? error.message
    : 'Internal server error';

  sendError(res, message, 500, 'Server Error');
}

export function notFoundHandler(
  req: Request,
  res: Response
): void {
  sendError(
    res,
    `Route ${req.method} ${req.path} not found`,
    404,
    'Not Found'
  );
}