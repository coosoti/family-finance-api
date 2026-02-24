import { Router } from 'express';
import { authController } from '../../controllers/v1/auth.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authLimiter } from '../../middleware/rateLimit.middleware';

const router = Router();

// Public routes (with rate limiting)
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/google', authLimiter, authController.google);
router.post('/refresh', authLimiter, authController.refresh);
router.post('/forgot-password', authLimiter, authController.forgotPassword);

// Protected routes
router.get('/me', authenticate, authController.me);

export default router;