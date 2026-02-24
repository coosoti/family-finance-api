import { Response } from 'express';
import { historyService } from '../../services/history.service';
import {
  sendSuccess,
  sendError,
  sendBadRequest,
} from '../../utils/response.utils';
import { AuthenticatedRequest } from '../../types';
import { isValidMonth, isValidDateRange } from '../../utils/date.utils';

export const historyController = {
  async getByMonth(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const month = req.params.month as string;
      if (!isValidMonth(month)) {
        sendBadRequest(res, 'Invalid month format. Use YYYY-MM');
        return;
      }
      const data = await historyService.getMonthHistory(
        req.user!.userId,
        month
      );
      sendSuccess(res, data, 'Month history retrieved');
    } catch (error: any) {
      sendError(res, error.message, 500, 'Failed to get month history');
    }
  },

  async getByRange(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      const data = await historyService.getRangeHistory(
        req.user!.userId,
        startMonth,
        endMonth
      );
      sendSuccess(res, { history: data, startMonth, endMonth }, 'Range history retrieved');
    } catch (error: any) {
      sendError(res, error.message, 500, 'Failed to get range history');
    }
  },
};