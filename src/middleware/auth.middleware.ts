import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { verifyAccessToken, extractTokenFromHeader } from '../utils/jwt.utils';
import { sendUnauthorized } from '../utils/response.utils';

export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      sendUnauthorized(res, 'No token provided');
      return;
    }

    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      sendUnauthorized(res, 'Token expired');
    } else if (error.name === 'JsonWebTokenError') {
      sendUnauthorized(res, 'Invalid token');
    } else {
      sendUnauthorized(res, 'Authentication failed');
    }
  }
}