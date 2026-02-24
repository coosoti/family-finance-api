import { Response } from 'express';
import { z } from 'zod';
import { transactionsService } from '../../services/transactions.service';
import {
  sendSuccess,
  sendCreated,
  sendError,
  sendNotFound,
  sendBadRequest,
} from '../../utils/response.utils';
import { AuthenticatedRequest } from '../../types';
import { isValidMonth, isValidDateRange } from '../../utils/date.utils';
import { emitTransactionEvent } from '../../sockets/transactions.socket';

const createSchema = z.object({
  categoryId: z.string().uuid().optional(),
  date: z.string().datetime(),
  amount: z.number().positive('Amount must be positive'),
  type: z.enum(['expense', 'saving', 'ipp', 'asset', 'liability']),
  notes: z.string().optional(),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Invalid month format'),
});

const updateSchema = z.object({
  categoryId: z.string().uuid().optional(),
  date: z.string().datetime().optional(),
  amount: z.number().positive().optional(),
  type: z.enum(['expense', 'saving', 'ipp', 'asset', 'liability']).optional(),
  notes: z.string().optional(),
});

export const transactionsController = {
  // GET /api/v1/transactions
  async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const transactions = await transactionsService.getAll(
        req.user!.userId
      );
      sendSuccess(res, { transactions }, 'Transactions retrieved');
    } catch (error: any) {
      sendError(res, error.message, 500, 'Failed to get transactions');
    }
  },

  // GET /api/v1/transactions/month/:month
  async getByMonth(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const month = req.params.month as string;

      if (!isValidMonth(month)) {
        sendBadRequest(res, 'Invalid month format. Use YYYY-MM');
        return;
      }

      const transactions = await transactionsService.getByMonth(
        req.user!.userId,
        month
      );
      sendSuccess(res, { transactions, month }, 'Transactions retrieved');
    } catch (error: any) {
      sendError(res, error.message, 500, 'Failed to get transactions');
    }
  },

  // GET /api/v1/transactions/range?startMonth=2026-01&endMonth=2026-03
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

      const transactions = await transactionsService.getByDateRange(
        req.user!.userId,
        startMonth,
        endMonth
      );

      sendSuccess(
        res,
        { transactions, startMonth, endMonth },
        'Transactions retrieved'
      );
    } catch (error: any) {
      sendError(res, error.message, 500, 'Failed to get transactions');
    }
  },

  // GET /api/v1/transactions/:id
  async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const transactionId = req.params.id as string;
      
      const transaction = await transactionsService.getById(
        req.user!.userId,
        transactionId
      );

      if (!transaction) {
        sendNotFound(res, 'Transaction');
        return;
      }

      sendSuccess(res, { transaction }, 'Transaction retrieved');
    } catch (error: any) {
      sendError(res, error.message, 500, 'Failed to get transaction');
    }
  },

  // POST /api/v1/transactions
  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validated = createSchema.parse(req.body);
      const transaction = await transactionsService.create(
        req.user!.userId,
        validated
      );

      // Emit real-time event
      emitTransactionEvent('transaction:created', transaction, req.user!.userId);

      sendCreated(res, { transaction }, 'Transaction created');
    } catch (error: any) {
      if (error.name === 'ZodError') {
        sendBadRequest(res, error.errors[0].message);
      } else {
        sendError(res, error.message, 400, 'Failed to create transaction');
      }
    }
  },

  // PUT /api/v1/transactions/:id
  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const transactionId = req.params.id as string;
      const validated = updateSchema.parse(req.body);
      
      const transaction = await transactionsService.update(
        req.user!.userId,
        transactionId,
        validated
      );

      // Emit real-time event
      emitTransactionEvent('transaction:updated', transaction, req.user!.userId);

      sendSuccess(res, { transaction }, 'Transaction updated');
    } catch (error: any) {
      if (error.name === 'ZodError') {
        sendBadRequest(res, error.errors[0].message);
      } else {
        sendError(res, error.message, 400, 'Failed to update transaction');
      }
    }
  },

  // DELETE /api/v1/transactions/:id
  async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const transactionId = req.params.id as string;
      
      const transaction = await transactionsService.getById(
        req.user!.userId,
        transactionId
      );

      if (!transaction) {
        sendNotFound(res, 'Transaction');
        return;
      }

      await transactionsService.delete(req.user!.userId, transactionId);

      // Emit real-time event
      emitTransactionEvent('transaction:deleted', transaction, req.user!.userId);

      sendSuccess(res, null, 'Transaction deleted');
    } catch (error: any) {
      sendError(res, error.message, 500, 'Failed to delete transaction');
    }
  },
};