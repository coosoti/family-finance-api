import { Response } from 'express';
import { z } from 'zod';
import { incomeService } from '../../services/income.service';
import {
  sendSuccess,
  sendCreated,
  sendError,
  sendNotFound,
  sendBadRequest,
} from '../../utils/response.utils';
import { AuthenticatedRequest } from '../../types';
import { isValidMonth, isValidDateRange } from '../../utils/date.utils';

const createSchema = z.object({
  date: z.string().datetime(),
  amount: z.number().positive(),
  source: z.string().min(1, 'Source is required'),
  description: z.string().optional(),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
});

const updateSchema = z.object({
  date: z.string().datetime().optional(),
  amount: z.number().positive().optional(),
  source: z.string().min(1).optional(),
  description: z.string().optional(),
});

export const incomeController = {
  async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { startMonth, endMonth } = req.query as {
        startMonth?: string;
        endMonth?: string;
      };

      if (startMonth && endMonth && !isValidDateRange(startMonth, endMonth)) {
        sendBadRequest(res, 'Invalid date range');
        return;
      }

      const income = await incomeService.getAll(
        req.user!.userId,
        startMonth,
        endMonth
      );
      sendSuccess(res, { income }, 'Income retrieved');
    } catch (error: any) {
      sendError(res, error.message, 500, 'Failed to get income');
    }
  },

  async getByMonth(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const month = req.params.month as string;
      if (!isValidMonth(month)) {
        sendBadRequest(res, 'Invalid month format. Use YYYY-MM');
        return;
      }
      const income = await incomeService.getByMonth(req.user!.userId, month);
      sendSuccess(res, { income, month }, 'Income retrieved');
    } catch (error: any) {
      sendError(res, error.message, 500, 'Failed to get income');
    }
  },

  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validated = createSchema.parse(req.body);
      const income = await incomeService.create(req.user!.userId, validated);
      sendCreated(res, { income }, 'Income created');
    } catch (error: any) {
      if (error.name === 'ZodError') {
        sendBadRequest(res, error.errors[0].message);
      } else {
        sendError(res, error.message, 400, 'Failed to create income');
      }
    }
  },

  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validated = updateSchema.parse(req.body);
      const income = await incomeService.update(
        req.user!.userId,
        req.params.id as string,
        validated
      );
      sendSuccess(res, { income }, 'Income updated');
    } catch (error: any) {
      if (error.name === 'ZodError') {
        sendBadRequest(res, error.errors[0].message);
      } else {
        sendError(res, error.message, 400, 'Failed to update income');
      }
    }
  },

  async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const income = await incomeService.getById(
        req.user!.userId,
        req.params.id as string
      );
      if (!income) {
        sendNotFound(res, 'Income');
        return;
      }
      await incomeService.delete(req.user!.userId, req.params.id as string);
      sendSuccess(res, null, 'Income deleted');
    } catch (error: any) {
      sendError(res, error.message, 500, 'Failed to delete income');
    }
  },
};