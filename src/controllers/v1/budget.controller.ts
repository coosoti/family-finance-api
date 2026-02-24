import { Response } from 'express';
import { z } from 'zod';
import { budgetService } from '../../services/budget.service';
import {
  sendSuccess,
  sendCreated,
  sendError,
  sendNotFound,
  sendBadRequest,
} from '../../utils/response.utils';
import { AuthenticatedRequest } from '../../types';
import { isValidMonth, isValidDateRange } from '../../utils/date.utils';
import { getCurrentMonth } from '../../utils/date.utils';

const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  budgetedAmount: z.number().min(0, 'Amount must be non-negative'),
  type: z.enum(['needs', 'wants', 'savings', 'growth']),
  isDefault: z.boolean().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  budgetedAmount: z.number().min(0).optional(),
  type: z.enum(['needs', 'wants', 'savings', 'growth']).optional(),
});

export const budgetController = {
  // GET /api/v1/budget/categories
  async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const categories = await budgetService.getAll(req.user!.userId);
      sendSuccess(res, { categories }, 'Categories retrieved');
    } catch (error: any) {
      sendError(res, error.message, 500, 'Failed to get categories');
    }
  },

  // GET /api/v1/budget/categories/:id
  async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const category = await budgetService.getById(
        req.user!.userId,
        req.params.id as string
      );
      if (!category) {
        sendNotFound(res, 'Category');
        return;
      }
      sendSuccess(res, { category }, 'Category retrieved');
    } catch (error: any) {
      sendError(res, error.message, 500, 'Failed to get category');
    }
  },

  // POST /api/v1/budget/categories
  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validated = createSchema.parse(req.body);
      const category = await budgetService.create(
        req.user!.userId,
        validated
      );
      sendCreated(res, { category }, 'Category created');
    } catch (error: any) {
      if (error.name === 'ZodError') {
        sendBadRequest(res, error.errors[0].message);
      } else {
        sendError(res, error.message, 400, 'Failed to create category');
      }
    }
  },

  // PUT /api/v1/budget/categories/:id
  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validated = updateSchema.parse(req.body);
      const category = await budgetService.update(
        req.user!.userId,
        req.params.id as string,
        validated
      );
      sendSuccess(res, { category }, 'Category updated');
    } catch (error: any) {
      if (error.name === 'ZodError') {
        sendBadRequest(res, error.errors[0].message);
      } else {
        sendError(res, error.message, 400, 'Failed to update category');
      }
    }
  },

  // DELETE /api/v1/budget/categories/:id
  async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const category = await budgetService.getById(
        req.user!.userId,
        req.params.id as string
      );
      if (!category) {
        sendNotFound(res, 'Category');
        return;
      }
      await budgetService.delete(req.user!.userId, req.params.id as string);
      sendSuccess(res, null, 'Category deleted');
    } catch (error: any) {
      sendError(res, error.message, 500, 'Failed to delete category');
    }
  },

  // GET /api/v1/budget/summary?month=2026-02
  async getSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const month = (req.query.month as string) || getCurrentMonth();
      if (!isValidMonth(month)) {
        sendBadRequest(res, 'Invalid month format. Use YYYY-MM');
        return;
      }
      const summary = await budgetService.getSummary(req.user!.userId, month);
      sendSuccess(res, { ...summary, month }, 'Budget summary retrieved');
    } catch (error: any) {
      sendError(res, error.message, 500, 'Failed to get budget summary');
    }
  },

  // GET /api/v1/budget/summary/range?startMonth=2026-01&endMonth=2026-03
  async getSummaryByRange(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { startMonth, endMonth } = req.query as {
        startMonth: string;
        endMonth: string;
      };

      if (!startMonth || !endMonth) {
        sendBadRequest(res, 'startMonth and endMonth are required');
        return;
      }

      if (!isValidDateRange(startMonth, endMonth)) {
        sendBadRequest(res, 'Invalid date range');
        return;
      }

      const summary = await budgetService.getSummaryByRange(
        req.user!.userId,
        startMonth,
        endMonth
      );
      sendSuccess(
        res,
        { ...summary, startMonth, endMonth },
        'Budget range summary retrieved'
      );
    } catch (error: any) {
      sendError(res, error.message, 500, 'Failed to get budget range summary');
    }
  },
};