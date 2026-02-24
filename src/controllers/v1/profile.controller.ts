import { Response } from 'express';
import { authController } from './auth.controller';
import { AuthenticatedRequest } from '../../types';

export const profileController = {
  get: authController.me,
  update: authController.updateProfile,
};