import { supabase } from '../config/database';
import { IPPAccount, UpdateIPPDTO } from '../types';

function mapIPP(ipp: any): IPPAccount {
  return {
    id: ipp.id,
    userId: ipp.user_id,
    currentBalance: Number(ipp.current_balance),
    monthlyContribution: Number(ipp.monthly_contribution),
    totalContributions: Number(ipp.total_contributions),
    taxReliefRate: Number(ipp.tax_relief_rate),
    realizedValue: Number(ipp.realized_value),
    lastUpdated: new Date(ipp.last_updated),
    createdAt: new Date(ipp.created_at),
  };
}

export const ippService = {
  async get(userId: string): Promise<IPPAccount | null> {
    const { data, error } = await supabase
      .from('ipp_accounts')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? mapIPP(data) : null;
  },

  async upsert(userId: string, dto: UpdateIPPDTO): Promise<IPPAccount> {
    const existing = await this.get(userId);

    if (existing) {
      const { data, error } = await supabase
        .from('ipp_accounts')
        .update({
          ...(dto.currentBalance !== undefined && {
            current_balance: dto.currentBalance,
          }),
          ...(dto.monthlyContribution !== undefined && {
            monthly_contribution: dto.monthlyContribution,
          }),
          ...(dto.totalContributions !== undefined && {
            total_contributions: dto.totalContributions,
          }),
          ...(dto.taxReliefRate !== undefined && {
            tax_relief_rate: dto.taxReliefRate,
          }),
          ...(dto.realizedValue !== undefined && {
            realized_value: dto.realizedValue,
          }),
          last_updated: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return mapIPP(data);
    } else {
      const { data, error } = await supabase
        .from('ipp_accounts')
        .insert({
          user_id: userId,
          current_balance: dto.currentBalance ?? 0,
          monthly_contribution: dto.monthlyContribution ?? 0,
          total_contributions: dto.totalContributions ?? 0,
          tax_relief_rate: dto.taxReliefRate ?? 0.3,
          realized_value: dto.realizedValue ?? 0,
          last_updated: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return mapIPP(data);
    }
  },

  async getContributions(
    userId: string,
    startMonth?: string,
    endMonth?: string
  ): Promise<{ contributions: any[]; total: number; count: number }> {
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'ipp')
      .order('date', { ascending: false });

    if (startMonth) query = query.gte('month', startMonth);
    if (endMonth) query = query.lte('month', endMonth);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const contributions = data || [];
    const total = contributions.reduce(
      (sum: number, tx: any) => sum + Number(tx.amount),
      0
    );

    return { contributions, total, count: contributions.length };
  },
};