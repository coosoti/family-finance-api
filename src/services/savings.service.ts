import { supabase } from '../config/database';
import {
  SavingsGoal,
  CreateSavingsGoalDTO,
  UpdateSavingsGoalDTO,
} from '../types';

function mapGoal(goal: any): SavingsGoal {
  return {
    id: goal.id,
    userId: goal.user_id,
    name: goal.name,
    targetAmount: Number(goal.target_amount),
    currentAmount: Number(goal.current_amount),
    monthlyContribution: Number(goal.monthly_contribution),
    createdAt: new Date(goal.created_at),
    updatedAt: new Date(goal.updated_at),
  };
}

export const savingsService = {
  async getAll(userId: string): Promise<SavingsGoal[]> {
    const { data, error } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []).map(mapGoal);
  },

  async getById(
    userId: string,
    goalId: string
  ): Promise<SavingsGoal | null> {
    const { data, error } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('id', goalId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? mapGoal(data) : null;
  },

  async create(
    userId: string,
    dto: CreateSavingsGoalDTO
  ): Promise<SavingsGoal> {
    const { data, error } = await supabase
      .from('savings_goals')
      .insert({
        user_id: userId,
        name: dto.name,
        target_amount: dto.targetAmount,
        current_amount: dto.currentAmount ?? 0,
        monthly_contribution: dto.monthlyContribution ?? 0,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapGoal(data);
  },

  async update(
    userId: string,
    goalId: string,
    dto: UpdateSavingsGoalDTO
  ): Promise<SavingsGoal> {
    const { data, error } = await supabase
      .from('savings_goals')
      .update({
        ...(dto.name && { name: dto.name }),
        ...(dto.targetAmount !== undefined && {
          target_amount: dto.targetAmount,
        }),
        ...(dto.currentAmount !== undefined && {
          current_amount: dto.currentAmount,
        }),
        ...(dto.monthlyContribution !== undefined && {
          monthly_contribution: dto.monthlyContribution,
        }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', goalId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapGoal(data);
  },

  async delete(userId: string, goalId: string): Promise<void> {
    const { error } = await supabase
      .from('savings_goals')
      .delete()
      .eq('id', goalId)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
  },

  async getContributions(
    userId: string,
    startMonth?: string,
    endMonth?: string
  ): Promise<{
    contributions: any[];
    total: number;
    count: number;
  }> {
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'saving')
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

    return {
      contributions,
      total,
      count: contributions.length,
    };
  },
};