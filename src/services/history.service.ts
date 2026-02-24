import { supabase } from '../config/database';
import { calculateNetWorth, calculateMonthlyTotals } from '../utils/calculations.utils';

export const historyService = {
  async getMonthHistory(userId: string, month: string): Promise<any> {
    const [transactions, categories, additionalIncome, snapshot, profile] =
      await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .eq('month', month)
          .order('date', { ascending: false }),
        supabase
          .from('budget_categories')
          .select('*')
          .eq('user_id', userId),
        supabase
          .from('additional_income')
          .select('*')
          .eq('user_id', userId)
          .eq('month', month)
          .eq('deleted', false),
        supabase
          .from('monthly_snapshots')
          .select('*')
          .eq('user_id', userId)
          .eq('month', month)
          .maybeSingle(),
        supabase
          .from('user_profiles')
          .select('monthly_income')
          .eq('id', userId)
          .single(),
      ]);

    const txs = transactions.data || [];
    const cats = categories.data || [];
    const income = additionalIncome.data || [];
    const snap = snapshot.data;
    const baseIncome = profile.data
      ? Number(profile.data.monthly_income)
      : 0;

    const expenses = txs.filter((t: any) => t.type === 'expense');
    const savings = txs.filter((t: any) => t.type === 'saving');
    const ipp = txs.filter((t: any) => t.type === 'ipp');

    const additionalIncomeTotal = income.reduce(
      (sum: number, inc: any) => sum + Number(inc.amount),
      0
    );
    const totalIncome = baseIncome + additionalIncomeTotal;
    const totalExpenses = expenses.reduce(
      (sum: number, t: any) => sum + Number(t.amount),
      0
    );
    const totalSavings = savings.reduce(
      (sum: number, t: any) => sum + Number(t.amount),
      0
    );
    const totalIPP = ipp.reduce(
      (sum: number, t: any) => sum + Number(t.amount),
      0
    );

    // Build budget vs actual
    const budgetVsActual = cats.map((cat: any) => {
      const categoryExpenses = expenses.filter(
        (t: any) => t.category_id === cat.id
      );
      const spent = categoryExpenses.reduce(
        (sum: number, t: any) => sum + Number(t.amount),
        0
      );
      return {
        category: {
          id: cat.id,
          name: cat.name,
          type: cat.type,
          budgetedAmount: Number(cat.budgeted_amount),
        },
        spent,
        remaining: Number(cat.budgeted_amount) - spent,
        percentage:
          Number(cat.budgeted_amount) > 0
            ? (spent / Number(cat.budgeted_amount)) * 100
            : 0,
        transactions: categoryExpenses.map((t: any) => ({
          id: t.id,
          amount: Number(t.amount),
          date: t.date,
          notes: t.notes,
        })),
      };
    });

    const currentNetWorth = await calculateNetWorth(userId);

    return {
      month,
      summary: {
        baseIncome,
        additionalIncome: additionalIncomeTotal,
        totalIncome,
        totalExpenses,
        totalSavings,
        totalIPP,
        surplus: totalIncome - totalExpenses - totalSavings - totalIPP,
        monthlyNetWorth: snap ? Number(snap.net_worth) : null,
        currentNetWorth,
      },
      budgetVsActual,
      savings: savings.map((t: any) => ({
        id: t.id,
        amount: Number(t.amount),
        date: t.date,
        notes: t.notes,
        categoryId: t.category_id,
      })),
      ippContributions: ipp.map((t: any) => ({
        id: t.id,
        amount: Number(t.amount),
        date: t.date,
        notes: t.notes,
      })),
      additionalIncome: income.map((inc: any) => ({
        id: inc.id,
        amount: Number(inc.amount),
        source: inc.source,
        description: inc.description,
        date: inc.date,
      })),
    };
  },

  async getRangeHistory(
    userId: string,
    startMonth: string,
    endMonth: string
  ): Promise<any[]> {
    const { data: snapshots } = await supabase
      .from('monthly_snapshots')
      .select('*')
      .eq('user_id', userId)
      .gte('month', startMonth)
      .lte('month', endMonth)
      .order('month', { ascending: true });

    return (snapshots || []).map((snap: any) => ({
      month: snap.month,
      income: Number(snap.income),
      totalExpenses: Number(snap.total_expenses),
      totalSavings: Number(snap.total_savings),
      ippContributions: Number(snap.ipp_contributions),
      netWorth: Number(snap.net_worth),
    }));
  },
};