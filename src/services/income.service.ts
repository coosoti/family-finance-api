import { supabase } from '../config/database';
import { AdditionalIncome, CreateIncomeDTO, UpdateIncomeDTO } from '../types';

function mapIncome(inc: any): AdditionalIncome {
  return {
    id: inc.id,
    userId: inc.user_id,
    date: new Date(inc.date),
    amount: Number(inc.amount),
    source: inc.source,
    description: inc.description,
    month: inc.month,
    deleted: inc.deleted,
    createdAt: new Date(inc.created_at),
  };
}

export const incomeService = {
  async getAll(
    userId: string,
    startMonth?: string,
    endMonth?: string
  ): Promise<AdditionalIncome[]> {
    let query = supabase
      .from('additional_income')
      .select('*')
      .eq('user_id', userId)
      .eq('deleted', false)
      .order('date', { ascending: false });

    if (startMonth) query = query.gte('month', startMonth);
    if (endMonth) query = query.lte('month', endMonth);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []).map(mapIncome);
  },

  async getByMonth(
    userId: string,
    month: string
  ): Promise<AdditionalIncome[]> {
    const { data, error } = await supabase
      .from('additional_income')
      .select('*')
      .eq('user_id', userId)
      .eq('month', month)
      .eq('deleted', false)
      .order('date', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map(mapIncome);
  },

  async getById(
    userId: string,
    incomeId: string
  ): Promise<AdditionalIncome | null> {
    const { data, error } = await supabase
      .from('additional_income')
      .select('*')
      .eq('id', incomeId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? mapIncome(data) : null;
  },

  async create(
    userId: string,
    dto: CreateIncomeDTO
  ): Promise<AdditionalIncome> {
    const { data, error } = await supabase
      .from('additional_income')
      .insert({
        user_id: userId,
        date: dto.date,
        amount: dto.amount,
        source: dto.source,
        description: dto.description || null,
        month: dto.month,
        deleted: false,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapIncome(data);
  },

  async update(
    userId: string,
    incomeId: string,
    dto: UpdateIncomeDTO
  ): Promise<AdditionalIncome> {
    const { data, error } = await supabase
      .from('additional_income')
      .update({
        ...(dto.date && { date: dto.date }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.source && { source: dto.source }),
        ...(dto.description !== undefined && { description: dto.description }),
      })
      .eq('id', incomeId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapIncome(data);
  },

  async delete(userId: string, incomeId: string): Promise<void> {
    const { error } = await supabase
      .from('additional_income')
      .update({ deleted: true })
      .eq('id', incomeId)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
  },
};