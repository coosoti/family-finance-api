import { supabase } from '../config/database';
import { calculateNetWorth } from '../utils/calculations.utils';

export const analyticsService = {
  async getOverview(
    userId: string,
    startMonth?: string,
    endMonth?: string
  ): Promise<any> {
    let query = supabase
      .from('monthly_snapshots')
      .select('*')
      .eq('user_id', userId)
      .order('month', { ascending: true });

    if (startMonth) query = query.gte('month', startMonth);
    if (endMonth) query = query.lte('month', endMonth);

    const { data: snapshots } = await query;
    const netWorth = await calculateNetWorth(userId);

    const snapshotList = snapshots || [];
    const avgIncome =
      snapshotList.length > 0
        ? snapshotList.reduce(
            (sum: number, s: any) => sum + Number(s.income),
            0
          ) / snapshotList.length
        : 0;
    const avgExpenses =
      snapshotList.length > 0
        ? snapshotList.reduce(
            (sum: number, s: any) => sum + Number(s.total_expenses),
            0
          ) / snapshotList.length
        : 0;
    const avgSavings =
      snapshotList.length > 0
        ? snapshotList.reduce(
            (sum: number, s: any) => sum + Number(s.total_savings),
            0
          ) / snapshotList.length
        : 0;

    return {
      netWorth,
      snapshots: snapshotList.map((s: any) => ({
        month: s.month,
        income: Number(s.income),
        totalExpenses: Number(s.total_expenses),
        totalSavings: Number(s.total_savings),
        ippContributions: Number(s.ipp_contributions),
        netWorth: Number(s.net_worth),
      })),
      averages: { avgIncome, avgExpenses, avgSavings },
    };
  },

  async getSpendingTrends(
    userId: string,
    startMonth?: string,
    endMonth?: string
  ): Promise<any> {
    let query = supabase
      .from('transactions')
      .select('amount, type, month, category_id')
      .eq('user_id', userId)
      .eq('type', 'expense');

    if (startMonth) query = query.gte('month', startMonth);
    if (endMonth) query = query.lte('month', endMonth);

    const { data: transactions } = await query;
    const txs = transactions || [];

    // Group by month
    const byMonth = new Map<string, number>();
    txs.forEach((tx: any) => {
      const current = byMonth.get(tx.month) || 0;
      byMonth.set(tx.month, current + Number(tx.amount));
    });

    return {
      trends: Array.from(byMonth.entries()).map(([month, total]) => ({
        month,
        total,
      })),
    };
  },

  async getCategoryBreakdown(
    userId: string,
    month: string
  ): Promise<any> {
    const [{ data: transactions }, { data: categories }] = await Promise.all([
      supabase
        .from('transactions')
        .select('amount, category_id, type')
        .eq('user_id', userId)
        .eq('month', month)
        .eq('type', 'expense'),
      supabase
        .from('budget_categories')
        .select('id, name, type, budgeted_amount')
        .eq('user_id', userId),
    ]);

    const txs = transactions || [];
    const cats = categories || [];

    const breakdown = cats.map((cat: any) => {
      const spent = txs
        .filter((tx: any) => tx.category_id === cat.id)
        .reduce((sum: number, tx: any) => sum + Number(tx.amount), 0);

      return {
        categoryId: cat.id,
        name: cat.name,
        type: cat.type,
        budgeted: Number(cat.budgeted_amount),
        spent,
        remaining: Number(cat.budgeted_amount) - spent,
        percentage:
          Number(cat.budgeted_amount) > 0
            ? (spent / Number(cat.budgeted_amount)) * 100
            : 0,
      };
    });

    return { breakdown, month };
  },
};