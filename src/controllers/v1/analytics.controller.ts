import { Response } from 'express';
import { analyticsService } from '../../services/analytics.service';
import {
  sendSuccess,
  sendError,
  sendBadRequest,
} from '../../utils/response.utils';
import { AuthenticatedRequest } from '../../types';
import { isValidMonth, isValidDateRange, getCurrentMonth } from '../../utils/date.utils';

export const analyticsController = {
  async getOverview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { startMonth, endMonth } = req.query as {
        startMonth?: string;
        endMonth?: string;
      };

      if (startMonth && endMonth && !isValidDateRange(startMonth, endMonth)) {
        sendBadRequest(res, 'Invalid date range');
        return;
      }

      const data = await analyticsService.getOverview(
        req.user!.userId,
        startMonth,
        endMonth
      );
      sendSuccess(res, data, 'Analytics overview retrieved');
    } catch (error: any) {
      sendError(res, error.message, 500, 'Failed to get analytics');
    }
  },

  async getSpendingTrends(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { startMonth, endMonth } = req.query as {
        startMonth?: string;
        endMonth?: string;
      };
      const data = await analyticsService.getSpendingTrends(
        req.user!.userId,
        startMonth,
        endMonth
      );
      sendSuccess(res, data, 'Spending trends retrieved');
    } catch (error: any) {
      sendError(res, error.message, 500, 'Failed to get spending trends');
    }
  },

  async getCategoryBreakdown(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const month = (req.query.month as string) || getCurrentMonth();
      if (!isValidMonth(month)) {
        sendBadRequest(res, 'Invalid month format. Use YYYY-MM');
        return;
      }
      const data = await analyticsService.getCategoryBreakdown(
        req.user!.userId,
        month
      );
      sendSuccess(res, data, 'Category breakdown retrieved');
    } catch (error: any) {
      sendError(res, error.message, 500, 'Failed to get category breakdown');
    }
  },
};