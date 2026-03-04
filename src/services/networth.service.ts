import { supabase } from '../config/database';
import { Asset, CreateAssetDTO, UpdateAssetDTO } from '../types';
import { calculateNetWorth } from '../utils/calculations.utils';

function mapAsset(asset: any): Asset {
  return {
    id: asset.id,
    userId: asset.user_id,
    name: asset.name,
    amount: Number(asset.amount),
    type: asset.type,
    category: asset.category,
    lastUpdated: new Date(asset.last_updated),
    createdAt: new Date(asset.created_at),
  };
}

export const networthService = {
  async getCurrent(userId: string): Promise<{
    netWorth: number;
    totalAssets: number;
    totalLiabilities: number;
    ippBalance: number;
    savingsFromBudget: number;
    investmentValue: number;
    savingsGoalsTotal: number;
    assets: Asset[];
    liabilities: Asset[];
  }> {
    // Get all assets and liabilities
    const { data: assetsData, error: assetsError } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (assetsError) throw new Error(assetsError.message);

    const allItems = (assetsData || []).map(mapAsset);
    const assets = allItems.filter((a) => a.type === 'asset');
    const liabilities = allItems.filter((a) => a.type === 'liability');

    const totalAssets = assets.reduce((sum, a) => sum + a.amount, 0);
    const totalLiabilities = liabilities.reduce((sum, a) => sum + a.amount, 0);

    // Get IPP balance
    const { data: ippData } = await supabase
      .from('ipp_accounts')
      .select('current_balance')
      .eq('user_id', userId)
      .maybeSingle();

    const ippBalance = Number(ippData?.current_balance) || 0;

    // Get savings from budget categories (Emergency Fund, Investments, Retirement)
    const { data: savingsCategories } = await supabase
      .from('budget_categories')
      .select('id, name, type')
      .eq('user_id', userId)
      .in('type', ['savings', 'growth']);

    let savingsFromBudget = 0;

    if (savingsCategories && savingsCategories.length > 0) {
      const categoryIds = savingsCategories.map((cat: any) => cat.id);

      // Get all transactions for savings/growth categories
      const { data: savingsTransactions } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', userId)
        .in('category_id', categoryIds)
        .eq('type', 'expense'); // These are savings allocations

      savingsFromBudget = (savingsTransactions || []).reduce(
        (sum: number, tx: any) => sum + Number(tx.amount),
        0
      );
    }

    // Get investment portfolio value
    const { data: investments } = await supabase
      .from('investments')
      .select('units, current_price')
      .eq('user_id', userId);

    const investmentValue = (investments || []).reduce(
      (sum: number, inv: any) =>
        sum + Number(inv.units) * Number(inv.current_price),
      0
    );

    // Get savings goals current amount
    const { data: savingsGoals } = await supabase
      .from('savings_goals')
      .select('current_amount')
      .eq('user_id', userId);

    const savingsGoalsTotal = (savingsGoals || []).reduce(
      (sum: number, goal: any) => sum + Number(goal.current_amount),
      0
    );

    // Calculate comprehensive net worth
    const netWorth =
      totalAssets +
      ippBalance +
      savingsFromBudget +
      investmentValue +
      savingsGoalsTotal -
      totalLiabilities;

    return {
      netWorth,
      totalAssets,
      totalLiabilities,
      ippBalance,
      savingsFromBudget,
      investmentValue,
      savingsGoalsTotal,
      assets,
      liabilities,
    };
  },

  async getHistory(
    userId: string,
    startMonth?: string,
    endMonth?: string
  ): Promise<any[]> {
    let query = supabase
      .from('monthly_snapshots')
      .select('*')
      .eq('user_id', userId)
      .order('month', { ascending: true });

    if (startMonth) query = query.gte('month', startMonth);
    if (endMonth) query = query.lte('month', endMonth);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return (data || []).map((snap: any) => ({
      id: snap.id,
      month: snap.month,
      netWorth: Number(snap.net_worth),
      income: Number(snap.income),
      totalExpenses: Number(snap.total_expenses),
      totalSavings: Number(snap.total_savings),
      ippContributions: Number(snap.ipp_contributions),
      createdAt: new Date(snap.created_at),
    }));
  },

  async getAllAssets(userId: string): Promise<Asset[]> {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []).map(mapAsset);
  },

  async getAssetById(
    userId: string,
    assetId: string
  ): Promise<Asset | null> {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('id', assetId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? mapAsset(data) : null;
  },

  async createAsset(userId: string, dto: CreateAssetDTO): Promise<Asset> {
    const { data, error } = await supabase
      .from('assets')
      .insert({
        user_id: userId,
        name: dto.name,
        amount: dto.amount,
        type: dto.type,
        category: dto.category,
        last_updated: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapAsset(data);
  },

  async updateAsset(
    userId: string,
    assetId: string,
    dto: UpdateAssetDTO
  ): Promise<Asset> {
    const { data, error } = await supabase
      .from('assets')
      .update({
        ...(dto.name && { name: dto.name }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.type && { type: dto.type }),
        ...(dto.category && { category: dto.category }),
        last_updated: new Date().toISOString(),
      })
      .eq('id', assetId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapAsset(data);
  },

  async deleteAsset(userId: string, assetId: string): Promise<void> {
    const { error } = await supabase
      .from('assets')
      .delete()
      .eq('id', assetId)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
  },
};