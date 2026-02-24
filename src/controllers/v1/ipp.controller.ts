import { Response } from 'express';
import { z } from 'zod';
import { ippService } from '../../services/ipp.service';
import {
  sendSuccess,
  sendError,
  sendBadRequest,
} from '../../utils/response.utils';
import { AuthenticatedRequest } from '../../types';
import { isValidDateRange } from '../../utils/date.utils';

const updateSchema = z.object({
  currentBalance: z.number().min(0).optional(),
  monthlyContribution: z.number().min(0).optional(),
  totalContributions: z.number().min(0).optional(),
  taxReliefRate: z.number().min(0).max(1).optional(),
  realizedValue: z.number().min(0).optional(),
});

export const ippController = {
  async get(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const account = await ippService.get(req.user!.userId);
      sendSuccess(res, { account }, 'IPP account retrieved');
    } catch (error: any) {
      sendError(res, error.message, 500, 'Failed to get IPP account');
    }
  },

  async upsert(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validated = updateSchema.parse(req.body);
      const account = await ippService.upsert(req.user!.userId, validated);
      sendSuccess(res, { account }, 'IPP account updated');
    } catch (error: any) {
      if (error.name === 'ZodError') {
        sendBadRequest(res, error.errors[0].message);
      } else {
        sendError(res, error.message, 400, 'Failed to update IPP account');
      }
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

      const result = await ippService.getContributions(
        req.user!.userId,
        startMonth,
        endMonth
      );
      sendSuccess(res, result, 'IPP contributions retrieved');
    } catch (error: any) {
      sendError(res, error.message, 500, 'Failed to get IPP contributions');
    }
  },
};