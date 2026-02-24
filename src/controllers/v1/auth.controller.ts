import { Request, Response } from 'express';
import { z } from 'zod';
import { authService } from '../../services/auth.service';
import {
  sendSuccess,
  sendCreated,
  sendError,
  sendBadRequest,
} from '../../utils/response.utils';
import { AuthenticatedRequest } from '../../types';

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  monthlyIncome: z.number().min(0).optional(),
  dependents: z.number().min(0).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

const googleSchema = z.object({
  idToken: z.string().min(1, 'Google ID token is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  monthlyIncome: z.number().min(0).optional(),
  dependents: z.number().min(0).optional(),
});

export const authController = {
  // POST /api/v1/auth/register
  async register(req: Request, res: Response): Promise<void> {
    try {
      const validated = registerSchema.parse(req.body);
      const { user, tokens } = await authService.register(
        validated.email,
        validated.password,
        validated.name,
        validated.monthlyIncome,
        validated.dependents
      );

      sendCreated(res, { user, tokens }, 'Account created successfully');
    } catch (error: any) {
      if (error.name === 'ZodError') {
        sendBadRequest(res, error.errors[0].message);
      } else {
        sendError(res, error.message, 400, 'Registration failed');
      }
    }
  },

  // POST /api/v1/auth/login
  async login(req: Request, res: Response): Promise<void> {
    try {
      const validated = loginSchema.parse(req.body);
      const { user, tokens } = await authService.login(
        validated.email,
        validated.password
      );

      sendSuccess(res, { user, tokens }, 'Login successful');
    } catch (error: any) {
      if (error.name === 'ZodError') {
        sendBadRequest(res, error.errors[0].message);
      } else {
        sendError(res, error.message, 401, 'Login failed');
      }
    }
  },

  // POST /api/v1/auth/google
  async google(req: Request, res: Response): Promise<void> {
    try {
      const validated = googleSchema.parse(req.body);
      const { user, tokens, isNew } = await authService.googleAuth(
        validated.idToken
      );

      const message = isNew
        ? 'Google account created successfully'
        : 'Google login successful';

      sendSuccess(res, { user, tokens, isNew }, message);
    } catch (error: any) {
      sendError(res, error.message, 401, 'Google authentication failed');
    }
  },

  // POST /api/v1/auth/refresh
  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const validated = refreshSchema.parse(req.body);
      const tokens = await authService.refreshTokens(validated.refreshToken);

      sendSuccess(res, { tokens }, 'Tokens refreshed');
    } catch (error: any) {
      sendError(res, error.message, 401, 'Token refresh failed');
    }
  },

  // POST /api/v1/auth/forgot-password
  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const validated = resetPasswordSchema.parse(req.body);
      await authService.resetPassword(validated.email);

      sendSuccess(res, null, 'Password reset email sent');
    } catch (error: any) {
      // Don't reveal if email exists
      sendSuccess(res, null, 'If your email exists, you will receive a reset link');
    }
  },

  // GET /api/v1/auth/me
  async me(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = await authService.getUserById(req.user!.userId);

      if (!user) {
        sendError(res, 'User not found', 404, 'Not Found');
        return;
      }

      sendSuccess(res, { user }, 'User retrieved');
    } catch (error: any) {
      sendError(res, error.message, 500, 'Failed to get user');
    }
  },

  // PUT /api/v1/profile
  async updateProfile(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const validated = updateProfileSchema.parse(req.body);
      const user = await authService.updateProfile(
        req.user!.userId,
        validated
      );

      sendSuccess(res, { user }, 'Profile updated');
    } catch (error: any) {
      sendError(res, error.message, 400, 'Failed to update profile');
    }
  },
};