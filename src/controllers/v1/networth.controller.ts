import { Response } from 'express';
import { z } from 'zod';
import { networthService } from '../../services/networth.service';
import {
  sendSuccess,
  sendCreated,
  sendError,
  sendNotFound,
  sendBadRequest,
} from '../../utils/response.utils';
import { AuthenticatedRequest } from '../../types';
import { isValidDateRange } from '../../utils/date.utils';

const createAssetSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  amount: z.number().min(0, 'Amount must be non-negative'),
  type: z.enum(['asset', 'liability']),
  category: z.string().min(1, 'Category is required'),
});

const updateAssetSchema = z.object({
  name: z.string().min(1).optional(),
  amount: z.number().min(0).optional(),
  type: z.enum(['asset', 'liability']).optional(),
  category: z.string().min(1).optional(),
});

export const networthController = {
  async getCurrent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = await networthService.getCurrent(req.user!.userId);
      sendSuccess(res, data, 'Net worth retrieved');
    } catch (error: any) {
      sendError(res, error.message, 500, 'Failed to get net worth');
    }
  },

  async getHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { startMonth, endMonth } = req.query as {
        startMonth?: string;
        endMonth?: string;
      };

      if (startMonth && endMonth && !isValidDateRange(startMonth, endMonth)) {
        sendBadRequest(res, 'Invalid date range');
        return;
      }

      const history = await networthService.getHistory(
        req.user!.userId,
        startMonth,
        endMonth
      );
      sendSuccess(res, { history }, 'Net worth history retrieved');
    } catch (error: any) {
      sendError(res, error.message, 500, 'Failed to get net worth history');
    }
  },

  async getAllAssets(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const assets = await networthService.getAllAssets(req.user!.userId);
      sendSuccess(res, { assets }, 'Assets retrieved');
    } catch (error: any) {
      sendError(res, error.message, 500, 'Failed to get assets');
    }
  },

  async createAsset(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validated = createAssetSchema.parse(req.body);
      const asset = await networthService.createAsset(
        req.user!.userId,
        validated
      );
      sendCreated(res, { asset }, 'Asset created');
    } catch (error: any) {
      if (error.name === 'ZodError') {
        sendBadRequest(res, error.errors[0].message);
      } else {
        sendError(res, error.message, 400, 'Failed to create asset');
      }
    }
  },

  async updateAsset(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validated = updateAssetSchema.parse(req.body);
      const asset = await networthService.updateAsset(
        req.user!.userId,
        req.params.id as string,
        validated
      );
      sendSuccess(res, { asset }, 'Asset updated');
    } catch (error: any) {
      if (error.name === 'ZodError') {
        sendBadRequest(res, error.errors[0].message);
      } else {
        sendError(res, error.message, 400, 'Failed to update asset');
      }
    }
  },

  async deleteAsset(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const asset = await networthService.getAssetById(
        req.user!.userId,
        req.params.id as string
      );
      if (!asset) {
        sendNotFound(res, 'Asset');
        return;
      }
      await networthService.deleteAsset(req.user!.userId, req.params.id as string);
      sendSuccess(res, null, 'Asset deleted');
    } catch (error: any) {
      sendError(res, error.message, 500, 'Failed to delete asset');
    }
  },
};