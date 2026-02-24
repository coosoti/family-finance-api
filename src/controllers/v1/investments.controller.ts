import { Response } from 'express';
import { z } from 'zod';
import { investmentsService } from '../../services/investments.service';
import {
  sendSuccess,
  sendCreated,
  sendError,
  sendNotFound,
  sendBadRequest,
} from '../../utils/response.utils';
import { AuthenticatedRequest } from '../../types';

const createSchema = z.object({
  name: z.string().min(1),
  type: z.enum([
    'money-market',
    'unit-trust',
    'government-bond',
    'stock',
    'sacco',
    'reit',
    'other',
  ]),
  units: z.number().positive(),
  purchasePrice: z.number().positive(),
  currentPrice: z.number().positive(),
  purchaseDate: z.string().datetime(),
  notes: z.string().optional(),
});

const updateSchema = createSchema.partial();

const dividendSchema = z.object({
  amount: z.number().positive(),
  date: z.string().datetime(),
  type: z.enum(['dividend', 'interest']),
  notes: z.string().optional(),
});

export const investmentsController = {
  async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const summary = await investmentsService.getPortfolioSummary(
        req.user!.userId
      );
      sendSuccess(res, summary, 'Investments retrieved');
    } catch (error: any) {
      sendError(res, error.message, 500, 'Failed to get investments');
    }
  },

  async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const investment = await investmentsService.getById(
        req.user!.userId,
        req.params.id as string
      );
      if (!investment) {
        sendNotFound(res, 'Investment');
        return;
      }
      sendSuccess(res, { investment }, 'Investment retrieved');
    } catch (error: any) {
      sendError(res, error.message, 500, 'Failed to get investment');
    }
  },

  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validated = createSchema.parse(req.body);
      const investment = await investmentsService.create(
        req.user!.userId,
        validated
      );
      sendCreated(res, { investment }, 'Investment created');
    } catch (error: any) {
      if (error.name === 'ZodError') {
        sendBadRequest(res, error.errors[0].message);
      } else {
        sendError(res, error.message, 400, 'Failed to create investment');
      }
    }
  },

  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validated = updateSchema.parse(req.body);
      const investment = await investmentsService.update(
        req.user!.userId,
        req.params.id as string,
        validated
      );
      sendSuccess(res, { investment }, 'Investment updated');
    } catch (error: any) {
      if (error.name === 'ZodError') {
        sendBadRequest(res, error.errors[0].message);
      } else {
        sendError(res, error.message, 400, 'Failed to update investment');
      }
    }
  },

  async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const investment = await investmentsService.getById(
        req.user!.userId,
        req.params.id as string
      );
      if (!investment) {
        sendNotFound(res, 'Investment');
        return;
      }
      await investmentsService.delete(req.user!.userId, req.params.id as string);
      sendSuccess(res, null, 'Investment deleted');
    } catch (error: any) {
      sendError(res, error.message, 500, 'Failed to delete investment');
    }
  },

  async getDividends(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const dividends = await investmentsService.getDividends(
        req.user!.userId,
        req.query.investmentId as string | undefined
      );
      sendSuccess(res, { dividends }, 'Dividends retrieved');
    } catch (error: any) {
      sendError(res, error.message, 500, 'Failed to get dividends');
    }
  },

  async addDividend(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validated = dividendSchema.parse(req.body);
      const dividend = await investmentsService.addDividend(
        req.user!.userId,
        req.params.id as string,
        validated.amount,
        validated.date,
        validated.type,
        validated.notes
      );
      sendCreated(res, { dividend }, 'Dividend added');
    } catch (error: any) {
      if (error.name === 'ZodError') {
        sendBadRequest(res, error.errors[0].message);
      } else {
        sendError(res, error.message, 400, 'Failed to add dividend');
      }
    }
  },
};