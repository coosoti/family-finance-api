import { supabase } from '../config/database';
import { Transaction, CreateTransactionDTO, UpdateTransactionDTO } from '../types';
import { getCurrentMonth } from '../utils/date.utils';

function mapTransaction(tx: any): Transaction {
  return {
    id: tx.id,
    userId: tx.user_id,
    categoryId: tx.category_id,
    date: new Date(tx.date),
    amount: Number(tx.amount),
    type: tx.type,
    notes: tx.notes,
    month: tx.month,
    createdAt: new Date(tx.created_at),
  };
}

export const transactionsService = {
  async getAll(userId: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map(mapTransaction);
  },

  async getByMonth(userId: string, month: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('month', month)
      .order('date', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map(mapTransaction);
  },

  async getByDateRange(
    userId: string,
    startMonth: string,
    endMonth: string
  ): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('month', startMonth)
      .lte('month', endMonth)
      .order('date', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map(mapTransaction);
  },

  async getById(
    userId: string,
    transactionId: string
  ): Promise<Transaction | null> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? mapTransaction(data) : null;
  },

  async create(
    userId: string,
    dto: CreateTransactionDTO
  ): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        category_id: dto.categoryId || null,
        date: dto.date,
        amount: dto.amount,
        type: dto.type,
        notes: dto.notes || null,
        month: dto.month,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapTransaction(data);
  },

  async update(
    userId: string,
    transactionId: string,
    dto: UpdateTransactionDTO
  ): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions')
      .update({
        ...(dto.categoryId !== undefined && {
          category_id: dto.categoryId,
        }),
        ...(dto.date && { date: dto.date }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.type && { type: dto.type }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      })
      .eq('id', transactionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapTransaction(data);
  },

  async delete(userId: string, transactionId: string): Promise<void> {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
  },
};