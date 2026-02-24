import { Response } from 'express';
import { z } from 'zod';
import { savingsService } from '../../services/savings.service';
import {
  sendSuccess,
  sendCreated,
  sendError,
  sendNotFound,
  sendBadRequest,
} from '../../utils/response.utils';
import { AuthenticatedRequest } from '../../types';
import { isValidDateRange } from '../../utils/date.utils';

const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  targetAmount: z.number().positive('Target amount must be positive'),
  currentAmount: z.number().min(0).optional(),
  monthlyContribution: z.number().min(0).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  targetAmount: z.number().positive().optional(),
  currentAmount: z.number().min(0).optional(),
  monthlyContribution: z.number().min(0).optional(),
});

export const savingsController = {
  async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const goals = await savingsService.getAll(req.user!.userId);
      sendSuccess(res, { goals }, 'Savings goals retrieved');
    } catch (error: any) {
      sendError(res, error.message, 500, 'Failed to get savings goals');
    }
  },

  async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const goal = await savingsService.getById(
        req.user!.userId,
        req.params.id as string
      );
      if (!goal) {
        sendNotFound(res, 'Savings goal');
        return;
      }
      sendSuccess(res, { goal }, 'Savings goal retrieved');
    } catch (error: any) {
      sendError(res, error.message, 500, 'Failed to get savings goal');
    }
  },

  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validated = createSchema.parse(req.body);
      const goal = await savingsService.create(req.user!.userId, validated);
      sendCreated(res, { goal }, 'Savings goal created');
    } catch (error: any) {
      if (error.name === 'ZodError') {
        sendBadRequest(res, error.errors[0].message);
      } else {
        sendError(res, error.message, 400, 'Failed to create savings goal');
      }
    }
  },

  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validated = updateSchema.parse(req.body);
      const goal = await savingsService.update(
        req.user!.userId,
        req.params.id as string,
        validated
      );
      sendSuccess(res, { goal }, 'Savings goal updated');
    } catch (error: any) {
      if (error.name === 'ZodError') {
        sendBadRequest(res, error.errors[0].message);
      } else {
        sendError(res, error.message, 400, 'Failed to update savings goal');
      }
    }
  },

  async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const goal = await savingsService.getById(
        req.user!.userId,
        req.params.id as string
      );
      if (!goal) {
        sendNotFound(res, 'Savings goal');
        return;
      }
      await savingsService.delete(req.user!.userId, req.params.id as string);
      sendSuccess(res, null, 'Savings goal deleted');
    } catch (error: any) {
      sendError(res, error.message, 500, 'Failed to delete savings goal');
    }
  },

  async getContributions(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { startMonth, endMonth } = req.query as {
        startMonth?: string;
        endMonth?: string;
      };

      if (startMonth && endMonth && !isValidDateRange(startMonth, endMonth)) {
        sendBadRequest(res, 'Invalid date range');
        return;
      }

      const result = await savingsService.getContributions(
        req.user!.userId,
        startMonth,
        endMonth
      );
      sendSuccess(res, result, 'Contributions retrieved');
    } catch (error: any) {
      sendError(res, error.message, 500, 'Failed to get contributions');
    }
  },
};