import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { sendError } from '../utils/response.utils';

// General rate limiter
export const generalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    sendError(
      res,
      'Too many requests, please try again later',
      429,
      'Rate Limit Exceeded'
    );
  },
});

// Stricter limiter for auth routes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    sendError(
      res,
      'Too many authentication attempts, please try again later',
      429,
      'Rate Limit Exceeded'
    );
  },
});