import { supabase } from '../config/database';

export async function calculateNetWorth(userId: string): Promise<number> {
  try {
    const { data: assets } = await supabase
      .from('assets')
      .select('amount, type')
      .eq('user_id', userId);

    if (!assets) return 0;

    const totalAssets = assets
      .filter((a) => a.type === 'asset')
      .reduce((sum, a) => sum + Number(a.amount), 0);

    const totalLiabilities = assets
      .filter((a) => a.type === 'liability')
      .reduce((sum, a) => sum + Number(a.amount), 0);

    const { data: ippAccount } = await supabase
      .from('ipp_accounts')
      .select('current_balance')
      .eq('user_id', userId)
      .maybeSingle();

    const ippBalance = ippAccount ? Number(ippAccount.current_balance) : 0;

    return totalAssets + ippBalance - totalLiabilities;
  } catch (error) {
    console.error('Error calculating net worth:', error);
    return 0;
  }
}

export async function calculateMonthlyTotals(
  userId: string,
  month: string
): Promise<{
  income: number;
  totalExpenses: number;
  totalSavings: number;
  ippContributions: number;
}> {
  try {
    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, type')
      .eq('user_id', userId)
      .eq('month', month);

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('monthly_income')
      .eq('id', userId)
      .single();

    const { data: additionalIncome } = await supabase
      .from('additional_income')
      .select('amount')
      .eq('user_id', userId)
      .eq('month', month)
      .eq('deleted', false);

    const baseIncome = profile ? Number(profile.monthly_income) : 0;
    const extraIncome = additionalIncome
      ? additionalIncome.reduce((sum, inc) => sum + Number(inc.amount), 0)
      : 0;

    const txs = transactions || [];

    return {
      income: baseIncome + extraIncome,
      totalExpenses: txs
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0),
      totalSavings: txs
        .filter((t) => t.type === 'saving')
        .reduce((sum, t) => sum + Number(t.amount), 0),
      ippContributions: txs
        .filter((t) => t.type === 'ipp')
        .reduce((sum, t) => sum + Number(t.amount), 0),
    };
  } catch (error) {
    console.error('Error calculating monthly totals:', error);
    return {
      income: 0,
      totalExpenses: 0,
      totalSavings: 0,
      ippContributions: 0,
    };
  }
}