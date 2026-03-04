import { Request } from 'express';

// =============================================
// USER TYPES
// =============================================
export interface User {
  id: string;
  email: string;
  name: string;
  monthlyIncome: number;
  dependents: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

// =============================================
// TRANSACTION TYPES
// =============================================
export type TransactionType = 'expense' | 'saving' | 'ipp' | 'asset' | 'liability';

export interface Transaction {
  id: string;
  userId: string;
  categoryId: string | null;
  date: Date;
  amount: number;
  type: TransactionType;
  notes: string | null;
  month: string; // YYYY-MM
  createdAt: Date;
}

export interface CreateTransactionDTO {
  categoryId?: string;
  date: string;
  amount: number;
  type: TransactionType;
  notes?: string;
  month: string;
}

export interface UpdateTransactionDTO {
  categoryId?: string;
  date?: string;
  amount?: number;
  type?: TransactionType;
  notes?: string;
}

// =============================================
// BUDGET TYPES
// =============================================
export type CategoryType = 'needs' | 'wants' | 'savings' | 'growth';

export interface BudgetCategory {
  id: string;
  userId: string;
  name: string;
  budgetedAmount: number;
  type: CategoryType;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCategoryDTO {
  name: string;
  budgetedAmount: number;
  type: CategoryType;
  isDefault?: boolean;
}

export interface UpdateCategoryDTO {
  name?: string;
  budgetedAmount?: number;
  type?: CategoryType;
}

// =============================================
// SAVINGS TYPES
// =============================================
export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSavingsGoalDTO {
  name: string;
  targetAmount: number;
  currentAmount?: number;
  monthlyContribution?: number;
}

export interface UpdateSavingsGoalDTO {
  name?: string;
  targetAmount?: number;
  currentAmount?: number;
  monthlyContribution?: number;
}

// =============================================
// IPP TYPES
// =============================================
export interface IPPAccount {
  id: string;
  userId: string;
  currentBalance: number;
  monthlyContribution: number;
  totalContributions: number;
  taxReliefRate: number;
  realizedValue: number;
  lastUpdated: Date;
  createdAt: Date;
}

export interface UpdateIPPDTO {
  currentBalance?: number;
  monthlyContribution?: number;
  totalContributions?: number;
  taxReliefRate?: number;
  realizedValue?: number;
}

// =============================================
// ASSET TYPES
// =============================================
export type AssetType = 'asset' | 'liability';

export interface Asset {
  id: string;
  userId: string;
  name: string;
  amount: number;
  type: AssetType;
  category: string;
  lastUpdated: Date;
  createdAt: Date;
}

export interface CreateAssetDTO {
  name: string;
  amount: number;
  type: AssetType;
  category: string;
}

export interface UpdateAssetDTO {
  name?: string;
  amount?: number;
  type?: AssetType;
  category?: string;
}

// =============================================
// INVESTMENT TYPES
// =============================================
export type InvestmentType =
  | 'money-market'
  | 'unit-trust'
  | 'government-bond'
  | 'stock'
  | 'sacco'
  | 'reit'
  | 'other';

export interface Investment {
  id: string;
  userId: string;
  name: string;
  type: InvestmentType;
  units: number;
  purchasePrice: number;
  currentPrice: number;
  purchaseDate: Date;
  lastUpdated: Date;
  notes: string | null;
  createdAt: Date;
}

export interface CreateInvestmentDTO {
  name: string;
  type: InvestmentType;
  units: number;
  purchasePrice: number;
  currentPrice: number;
  purchaseDate: string;
  notes?: string;
}

export interface UpdateInvestmentDTO {
  name?: string;
  type?: InvestmentType;
  units?: number;
  purchasePrice?: number;
  currentPrice?: number;
  purchaseDate?: string;
  notes?: string;
}

// =============================================
// INCOME TYPES
// =============================================
export interface AdditionalIncome {
  id: string;
  userId: string;
  date: Date;
  amount: number;
  source: string;
  description: string | null;
  month: string;
  deleted: boolean;
  createdAt: Date;
}

export interface CreateIncomeDTO {
  date: string;
  amount: number;
  source: string;
  description?: string;
  month: string;
}

export interface UpdateIncomeDTO {
  date?: string;
  amount?: number;
  source?: string;
  description?: string;
}

// =============================================
// SNAPSHOT TYPES
// =============================================
export interface MonthlySnapshot {
  id: string;
  userId: string;
  month: string;
  income: number;
  totalExpenses: number;
  totalSavings: number;
  ippContributions: number;
  netWorth: number;
  createdAt: Date;
}

// =============================================
// API RESPONSE TYPES
// =============================================
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: Pagination;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// =============================================
// REQUEST TYPES
// =============================================
export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

export interface DateRangeQuery {
  startMonth?: string;
  endMonth?: string;
  month?: string;
}

// =============================================
// SOCKET TYPES
// =============================================
export interface SocketData {
  userId: string;
  email: string;
}

export type TransactionEvent =
  | 'transaction:created'
  | 'transaction:updated'
  | 'transaction:deleted';

export interface TransactionSocketPayload {
  event: TransactionEvent;
  transaction: Transaction;
  userId: string;
}

// ============================================================
// RECURR
// ============================================================

export type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'annually';
export type RecurringType = 'bill' | 'subscription';
export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'skipped';

export interface RecurringItem {
  id: string;
  user_id: string;
  name: string;
  provider?: string;
  category: string;
  type: RecurringType;
  amount: number;
  currency: string;
  billing_cycle: BillingCycle;
  billing_day: number;
  next_due_date: string;
  last_paid_date?: string;
  is_active: boolean;
  auto_categorize: boolean;
  auto_create_tx: boolean;
  last_used_date?: string;
  usage_count_30d: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface RecurringPayment {
  id: string;
  recurring_item_id: string;
  user_id: string;
  due_date: string;
  paid_date?: string;
  amount: number;
  status: PaymentStatus;
  transaction_id?: string;
  notes?: string;
  created_at: string;
}

export interface CreateRecurringItemDto {
  name: string;
  provider?: string;
  category: string;
  type: RecurringType;
  amount: number;
  currency?: string;
  billing_cycle: BillingCycle;
  billing_day: number;
  next_due_date: string;
  is_active?: boolean;
  auto_categorize?: boolean;
  auto_create_tx?: boolean;
  notes?: string;
}

export interface UpdateRecurringItemDto extends Partial<CreateRecurringItemDto> {}

export interface MarkPaidDto {
  paid_date?: string;
  amount?: number;
  create_transaction?: boolean;
  notes?: string;
}

export interface UpcomingBill {
  recurring_item: RecurringItem;
  due_date: string;
  days_until_due: number;
  status: PaymentStatus;
}

export interface UnusedSubscription {
  recurring_item: RecurringItem;
  days_since_last_used: number | null;
  months_paid_without_use: number;
  potential_annual_saving: number;
}

export interface RecurringSummary {
  total_monthly_bills: number;
  total_monthly_subscriptions: number;
  upcoming_7_days: number;
  overdue_count: number;
  unused_subscriptions: number;
}