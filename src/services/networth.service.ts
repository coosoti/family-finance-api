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
    assets: Asset[];
  }> {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);

    const assets = (data || []).map(mapAsset);
    const totalAssets = assets
      .filter((a) => a.type === 'asset')
      .reduce((sum, a) => sum + a.amount, 0);
    const totalLiabilities = assets
      .filter((a) => a.type === 'liability')
      .reduce((sum, a) => sum + a.amount, 0);

    const netWorth = await calculateNetWorth(userId);

    return { netWorth, totalAssets, totalLiabilities, assets };
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