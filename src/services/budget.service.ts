import { supabase } from '../config/database';
import { BudgetCategory, CreateCategoryDTO, UpdateCategoryDTO } from '../types';

function mapCategory(cat: any): BudgetCategory {
  return {
    id: cat.id,
    userId: cat.user_id,
    name: cat.name,
    budgetedAmount: Number(cat.budgeted_amount),
    type: cat.type,
    isDefault: cat.is_default,
    createdAt: new Date(cat.created_at),
    updatedAt: new Date(cat.updated_at),
  };
}

export const budgetService = {
  async getAll(userId: string): Promise<BudgetCategory[]> {
    const { data, error } = await supabase
      .from('budget_categories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []).map(mapCategory);
  },

  async getById(
    userId: string,
    categoryId: string
  ): Promise<BudgetCategory | null> {
    const { data, error } = await supabase
      .from('budget_categories')
      .select('*')
      .eq('id', categoryId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? mapCategory(data) : null;
  },

  async create(
    userId: string,
    dto: CreateCategoryDTO
  ): Promise<BudgetCategory> {
    const { data, error } = await supabase
      .from('budget_categories')
      .insert({
        user_id: userId,
        name: dto.name,
        budgeted_amount: dto.budgetedAmount,
        type: dto.type,
        is_default: dto.isDefault ?? false,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapCategory(data);
  },

  async update(
    userId: string,
    categoryId: string,
    dto: UpdateCategoryDTO
  ): Promise<BudgetCategory> {
    const { data, error } = await supabase
      .from('budget_categories')
      .update({
        ...(dto.name && { name: dto.name }),
        ...(dto.budgetedAmount !== undefined && {
          budgeted_amount: dto.budgetedAmount,
        }),
        ...(dto.type && { type: dto.type }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', categoryId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapCategory(data);
  },

  async delete(userId: string, categoryId: string): Promise<void> {
    const { error } = await supabase
      .from('budget_categories')
      .delete()
      .eq('id', categoryId)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
  },

  async getSummary(
    userId: string,
    month: string
  ): Promise<{
    categories: Array<{
      category: BudgetCategory;
      spent: number;
      remaining: number;
      percentage: number;
    }>;
    totalBudgeted: number;
    totalSpent: number;
    totalRemaining: number;
  }> {
    const [categories, transactions] = await Promise.all([
      this.getAll(userId),
      supabase
        .from('transactions')
        .select('category_id, amount, type')
        .eq('user_id', userId)
        .eq('month', month)
        .eq('type', 'expense'),
    ]);

    const txs = transactions.data || [];

    const categorySpending = new Map<string, number>();
    txs.forEach((tx: any) => {
      const current = categorySpending.get(tx.category_id) || 0;
      categorySpending.set(tx.category_id, current + Number(tx.amount));
    });

    const categorySummaries = categories.map((cat) => {
      const spent = categorySpending.get(cat.id) || 0;
      const remaining = cat.budgetedAmount - spent;
      const percentage =
        cat.budgetedAmount > 0 ? (spent / cat.budgetedAmount) * 100 : 0;

      return { category: cat, spent, remaining, percentage };
    });

    const totalBudgeted = categories.reduce(
      (sum, cat) => sum + cat.budgetedAmount,
      0
    );
    const totalSpent = categorySummaries.reduce(
      (sum, cs) => sum + cs.spent,
      0
    );

    return {
      categories: categorySummaries,
      totalBudgeted,
      totalSpent,
      totalRemaining: totalBudgeted - totalSpent,
    };
  },

  async getSummaryByRange(
    userId: string,
    startMonth: string,
    endMonth: string
  ): Promise<{
    totalBudgeted: number;
    totalSpent: number;
    totalRemaining: number;
    months: number;
  }> {
    const categories = await this.getAll(userId);

    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .gte('month', startMonth)
      .lte('month', endMonth);

    const totalSpent = (transactions || []).reduce(
      (sum: number, tx: any) => sum + Number(tx.amount),
      0
    );

    // Calculate number of months in range
    const [startYear, startMonthNum] = startMonth.split('-').map(Number);
    const [endYear, endMonthNum] = endMonth.split('-').map(Number);
    const months =
      (endYear - startYear) * 12 + (endMonthNum - startMonthNum) + 1;

    const totalBudgeted = categories.reduce(
      (sum, cat) => sum + cat.budgetedAmount * months,
      0
    );

    return {
      totalBudgeted,
      totalSpent,
      totalRemaining: totalBudgeted - totalSpent,
      months,
    };
  },
};