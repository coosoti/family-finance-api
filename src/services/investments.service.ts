import { supabase } from '../config/database';
import { Investment, CreateInvestmentDTO, UpdateInvestmentDTO } from '../types';

function mapInvestment(inv: any): Investment {
  return {
    id: inv.id,
    userId: inv.user_id,
    name: inv.name,
    type: inv.type,
    units: Number(inv.units),
    purchasePrice: Number(inv.purchase_price),
    currentPrice: Number(inv.current_price),
    purchaseDate: new Date(inv.purchase_date),
    lastUpdated: new Date(inv.last_updated),
    notes: inv.notes,
    createdAt: new Date(inv.created_at),
  };
}

export const investmentsService = {
  async getAll(userId: string): Promise<Investment[]> {
    const { data, error } = await supabase
      .from('investments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []).map(mapInvestment);
  },

  async getById(
    userId: string,
    investmentId: string
  ): Promise<Investment | null> {
    const { data, error } = await supabase
      .from('investments')
      .select('*')
      .eq('id', investmentId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? mapInvestment(data) : null;
  },

  async create(
    userId: string,
    dto: CreateInvestmentDTO
  ): Promise<Investment> {
    const { data, error } = await supabase
      .from('investments')
      .insert({
        user_id: userId,
        name: dto.name,
        type: dto.type,
        units: dto.units,
        purchase_price: dto.purchasePrice,
        current_price: dto.currentPrice,
        purchase_date: dto.purchaseDate,
        notes: dto.notes || null,
        last_updated: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapInvestment(data);
  },

  async update(
    userId: string,
    investmentId: string,
    dto: UpdateInvestmentDTO
  ): Promise<Investment> {
    const { data, error } = await supabase
      .from('investments')
      .update({
        ...(dto.name && { name: dto.name }),
        ...(dto.type && { type: dto.type }),
        ...(dto.units !== undefined && { units: dto.units }),
        ...(dto.purchasePrice !== undefined && {
          purchase_price: dto.purchasePrice,
        }),
        ...(dto.currentPrice !== undefined && {
          current_price: dto.currentPrice,
        }),
        ...(dto.purchaseDate && { purchase_date: dto.purchaseDate }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        last_updated: new Date().toISOString(),
      })
      .eq('id', investmentId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapInvestment(data);
  },

  async delete(userId: string, investmentId: string): Promise<void> {
    const { error } = await supabase
      .from('investments')
      .delete()
      .eq('id', investmentId)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
  },

  async getDividends(
    userId: string,
    investmentId?: string
  ): Promise<any[]> {
    let query = supabase
      .from('dividend_payments')
      .select('*, investments(name, type)')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (investmentId) query = query.eq('investment_id', investmentId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  },

  async addDividend(
    userId: string,
    investmentId: string,
    amount: number,
    date: string,
    type: 'dividend' | 'interest',
    notes?: string
  ): Promise<any> {
    const { data, error } = await supabase
      .from('dividend_payments')
      .insert({
        user_id: userId,
        investment_id: investmentId,
        amount,
        date,
        type,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async getPortfolioSummary(userId: string): Promise<{
    investments: Investment[];
    totalInvested: number;
    totalCurrentValue: number;
    totalGainLoss: number;
    totalGainLossPercent: number;
  }> {
    const investments = await this.getAll(userId);

    const totalInvested = investments.reduce(
      (sum, inv) => sum + inv.purchasePrice * inv.units,
      0
    );
    const totalCurrentValue = investments.reduce(
      (sum, inv) => sum + inv.currentPrice * inv.units,
      0
    );
    const totalGainLoss = totalCurrentValue - totalInvested;
    const totalGainLossPercent =
      totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

    return {
      investments,
      totalInvested,
      totalCurrentValue,
      totalGainLoss,
      totalGainLossPercent,
    };
  },
};