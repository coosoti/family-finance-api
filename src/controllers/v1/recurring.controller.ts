import { Response } from 'express';
import { z } from 'zod';
import { RecurringService } from '../../services/recurring.service';
import {
  sendSuccess,
  sendError,
  sendBadRequest,
} from '../../utils/response.utils';
import { AuthenticatedRequest } from '../../types';

const recurringService = new RecurringService();

// Helper function to calculate next due date
function calculateNextDueDate(billingCycle: string, billingDay: number): string {
  const now = new Date();
  let next: Date;
  
  switch (billingCycle) {
    case 'weekly':
      next = new Date(now.getTime() + 7 * 86400000);
      break;
    case 'quarterly':
      next = new Date(now.getFullYear(), now.getMonth() + 3, billingDay);
      break;
    case 'annually':
      next = new Date(now.getFullYear() + 1, now.getMonth(), billingDay);
      break;
    default: // monthly
      next = new Date(now.getFullYear(), now.getMonth() + 1, billingDay);
  }
  
  return next.toISOString().split('T')[0];
}

// Validation schemas
const createRecurringSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  provider: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  type: z.enum(['bill', 'subscription']),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().optional().default('KES'),
  billing_cycle: z.enum(['weekly', 'monthly', 'quarterly', 'annually']),
  billing_day: z.number().min(1).max(31),
  next_due_date: z.string().optional(),
  is_active: z.boolean().optional().default(true),
  auto_categorize: z.boolean().optional().default(true),
  auto_create_tx: z.boolean().optional().default(false),
  notes: z.string().optional(),
});

const updateRecurringSchema = z.object({
  name: z.string().min(1).optional(),
  provider: z.string().optional(),
  category: z.string().optional(),
  amount: z.number().positive().optional(),
  billing_cycle: z.enum(['weekly', 'monthly', 'quarterly', 'annually']).optional(),
  billing_day: z.number().min(1).max(31).optional(),
  next_due_date: z.string().optional(),
  is_active: z.boolean().optional(),
  auto_categorize: z.boolean().optional(),
  auto_create_tx: z.boolean().optional(),
  notes: z.string().optional(),
});

const markPaidSchema = z.object({
  paid_date: z.string().optional(),
  amount: z.number().positive().optional(),
  create_transaction: z.boolean().optional(),
  notes: z.string().optional(),
});

// ── CRUD ──────────────────────────────────────────────────────────────────────

export const getRecurringItems = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Access userId from JWTPayload
    const userId = req.user!.userId;
    const type = req.query.type as 'bill' | 'subscription' | undefined;
    const is_active = req.query.is_active !== undefined
      ? req.query.is_active === 'true'
      : undefined;

    const data = await recurringService.getAll(userId, type, is_active);
    sendSuccess(res, data);
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

export const getRecurringItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string;
    const data = await recurringService.getById(userId, id);
    sendSuccess(res, data);
  } catch (error) {
    sendError(res, (error as Error).message, 404);
  }
};

export const createRecurringItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    
    // Validate request body
    const validated = createRecurringSchema.parse(req.body);
    
    // Calculate next_due_date if not provided
    const next_due_date = validated.next_due_date || 
      calculateNextDueDate(validated.billing_cycle, validated.billing_day);
    
    // Prepare data for service - ensure all required fields
    const serviceData = {
      ...validated,
      next_due_date, // Now definitely a string
    };
    
    const data = await recurringService.create(userId, serviceData);
    sendSuccess(res, data, 'Recurring item created');
  } catch (error) {
    if (error instanceof z.ZodError) {
      sendBadRequest(res, error.issues[0]?.message || 'Validation error');
    } else {
      sendError(res, (error as Error).message);
    }
  }
};

export const updateRecurringItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string;
    const validated = updateRecurringSchema.parse(req.body);
    
    const data = await recurringService.update(userId, id, validated);
    sendSuccess(res, data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      sendBadRequest(res, error.issues[0]?.message || 'Validation error');
    } else {
      sendError(res, (error as Error).message);
    }
  }
};

export const deleteRecurringItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string;
    await recurringService.delete(userId, id);
    sendSuccess(res, { message: 'Deleted successfully' });
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// ── Actions ───────────────────────────────────────────────────────────────────

export const markRecurringAsPaid = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string;
    const validated = markPaidSchema.parse(req.body);
    
    const data = await recurringService.markPaid(userId, id, validated);
    sendSuccess(res, data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      sendBadRequest(res, error.issues[0]?.message || 'Validation error');
    } else {
      sendError(res, (error as Error).message);
    }
  }
};

export const autoGenerateTransactions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const created = await recurringService.autoGenerate(userId);
    sendSuccess(res, {
      message: `Auto-generated ${created.length} transactions`,
      created,
    });
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// ── Analytics ─────────────────────────────────────────────────────────────────

export const getUpcomingBills = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const days = parseInt(req.query.days as string) || 30;
    const data = await recurringService.getUpcoming(userId, days);
    sendSuccess(res, data);
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

export const getUnusedSubscriptions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const data = await recurringService.getUnused(userId);
    sendSuccess(res, data);
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

export const getRecurringSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const data = await recurringService.getSummary(userId);
    sendSuccess(res, data);
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};