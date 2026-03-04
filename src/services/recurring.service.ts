import { supabase } from '../config/database';
import {
  RecurringItem,
  RecurringPayment,
  CreateRecurringItemDto,
  UpdateRecurringItemDto,
  MarkPaidDto,
  UpcomingBill,
  UnusedSubscription,
  RecurringSummary,
  RecurringType,
} from '../types/index';

// ── Helpers ──────────────────────────────────────────────────────────────────

const daysBetween = (a: string, b: string): number =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);

const normalizeToMonthly = (amount: number, cycle: string): number => {
  switch (cycle) {
    case 'weekly':    return amount * 4.33;
    case 'quarterly': return amount / 3;
    case 'annually':  return amount / 12;
    default:          return amount; // monthly
  }
};

const computeNextDueDate = (billingCycle: string, billingDay: number): string => {
  const now = new Date();
  let next: Date;
  switch (billingCycle) {
    case 'weekly':
      next = new Date(now.getTime() + 7 * 86_400_000);
      break;
    case 'quarterly':
      next = new Date(now.getFullYear(), now.getMonth() + 3, billingDay);
      break;
    case 'annually':
      next = new Date(now.getFullYear() + 1, now.getMonth(), billingDay);
      break;
    default: // monthly
      next = new Date(now.getFullYear(), now.getMonth() + 1, billingDay);
  }
  return next.toISOString().slice(0, 10);
};

const autoDetectCategory = (name: string, provider?: string): string => {
  const text = `${name} ${provider ?? ''}`.toLowerCase();
  if (/netflix|spotify|youtube|showmax|dstv|apple tv|music|video|stream/i.test(text)) return 'Entertainment';
  if (/icloud|google one|dropbox|onedrive|storage/i.test(text))                         return 'Cloud Storage';
  if (/microsoft|adobe|figma|github|software|saas|chatgpt/i.test(text))                return 'Software';
  if (/safaricom|zuku|faiba|internet|wifi|broadband/i.test(text))                       return 'Internet';
  if (/gym|fitness|yoga|sport/i.test(text))                                              return 'Health & Fitness';
  if (/rent|lease|mortgage/i.test(text))                                                 return 'Housing';
  if (/kplc|electric|water|gas|utility|utilities/i.test(text))                          return 'Utilities';
  if (/insurance/i.test(text))                                                            return 'Insurance';
  return 'Other';
};

// ── Service ───────────────────────────────────────────────────────────────────

export class RecurringService {

  // ── CRUD ──────────────────────────────────────────────────

  async getAll(userId: string, type?: RecurringType, is_active?: boolean): Promise<RecurringItem[]> {
    let query = supabase
      .from('recurring_items')
      .select('*')
      .eq('user_id', userId)
      .order('next_due_date', { ascending: true });

    if (type)             query = query.eq('type', type);
    if (is_active !== undefined) query = query.eq('is_active', is_active);

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  async getById(userId: string, id: string): Promise<RecurringItem & { payments: RecurringPayment[] }> {
    const { data, error } = await supabase
      .from('recurring_items')
      .select('*, payments:recurring_payments(*)')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  async create(userId: string, dto: CreateRecurringItemDto): Promise<RecurringItem> {
    // Auto-detect category if not supplied
    if (dto.auto_categorize !== false && !dto.category) {
      dto.category = autoDetectCategory(dto.name, dto.provider);
    }

    const { data: item, error } = await supabase
      .from('recurring_items')
      .insert({ 
        ...dto, 
        user_id: userId, 
        currency: dto.currency ?? 'KES' 
      })
      .select()
      .single();

    if (error) throw error;

    // Create first pending payment record
    await supabase.from('recurring_payments').insert({
      recurring_item_id: item.id,
      user_id: userId,
      due_date: item.next_due_date,
      amount: item.amount,
      status: 'pending',
    });

    return item;
  }

  async update(userId: string, id: string, dto: UpdateRecurringItemDto): Promise<RecurringItem> {
    const { data, error } = await supabase
      .from('recurring_items')
      .update(dto)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async delete(userId: string, id: string): Promise<void> {
    const { error } = await supabase
      .from('recurring_items')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
  }

  // ── Mark as paid ──────────────────────────────────────────

  async markPaid(userId: string, id: string, dto: MarkPaidDto): Promise<RecurringItem> {
    console.log('🔍 markPaid called:', { userId, id, dto });

    const { data: item, error: fetchErr } = await supabase
      .from('recurring_items')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchErr || !item) {
      console.error('❌ Recurring item not found:', fetchErr);
      throw new Error('Recurring item not found');
    }

    console.log('✅ Found item:', item);

    const today      = new Date().toISOString().slice(0, 10);
    const paidDate   = dto.paid_date ?? today;
    const paidAmount = dto.amount    ?? item.amount;
    const nextDue    = computeNextDueDate(item.billing_cycle, item.billing_day);

    // Update the current pending payment to paid
    const { error: paymentUpdateErr } = await supabase
      .from('recurring_payments')
      .update({ status: 'paid', paid_date: paidDate, amount: paidAmount })
      .eq('recurring_item_id', id)
      .eq('status', 'pending');

    if (paymentUpdateErr) {
      console.error('❌ Failed to update payment:', paymentUpdateErr);
      throw paymentUpdateErr;
    }

    // Advance item to next due date
    const { data: updated, error: updateErr } = await supabase
      .from('recurring_items')
      .update({ last_paid_date: paidDate, next_due_date: nextDue })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      console.error('❌ Failed to update recurring item:', updateErr);
      throw updateErr;
    }

    // Insert next pending payment
    const { error: paymentInsertErr } = await supabase
      .from('recurring_payments')
      .insert({
        recurring_item_id: id,
        user_id: userId,
        due_date: nextDue,
        amount: item.amount,
        status: 'pending',
      });

    if (paymentInsertErr) {
      console.error('❌ Failed to create next payment:', paymentInsertErr);
      // Non-critical, continue
    }

    // Optionally create a transaction
    if (dto.create_transaction || item.auto_create_tx) {
      try {
        console.log('💰 Creating transaction for payment');

        // Get current month in YYYY-MM format
        const now = new Date(paidDate);
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // Find the budget category ID for this recurring item's category
        const { data: category, error: catError } = await supabase
          .from('budget_categories')
          .select('id')
          .eq('user_id', userId)
          .eq('name', item.category)
          .maybeSingle();

        if (catError) {
          console.error('❌ Error finding category:', catError);
        }

        console.log('📊 Transaction data:', {
          user_id: userId,
          amount: -paidAmount,
          description: `${item.name} - Auto-generated from recurring`,
          category_id: category?.id || null,
          date: paidDate,
          type: 'expense',
          month,
          notes: dto.notes || `Recurring payment for ${item.name}`,
        });

        const { data: transaction, error: txErr } = await supabase
          .from('transactions')
          .insert({
            user_id: userId,
            amount: -paidAmount,
            description: `${item.name} - Auto-generated from recurring`,
            category_id: category?.id || null,
            date: paidDate,
            type: 'expense',
            month,
            notes: dto.notes || `Recurring payment for ${item.name}`,
          })
          .select()
          .single();

        if (txErr) {
          console.error('❌ Failed to create transaction:', txErr);
          console.error('Transaction error details:', txErr);
        } else {
          console.log('✅ Transaction created:', transaction.id);

          // Link transaction to payment
          await supabase
            .from('recurring_payments')
            .update({ transaction_id: transaction.id })
            .eq('recurring_item_id', id)
            .eq('status', 'paid')
            .eq('paid_date', paidDate);
        }
      } catch (txError) {
        console.error('❌ Exception creating transaction:', txError);
        // Don't throw - payment succeeded even if transaction creation failed
      }
    }

    return updated;
  }

  // ── Analytics ─────────────────────────────────────────────

  async getUpcoming(userId: string, days: number): Promise<UpcomingBill[]> {
    const today  = new Date().toISOString().slice(0, 10);
    const future = new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from('recurring_items')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .gte('next_due_date', today)
      .lte('next_due_date', future)
      .order('next_due_date', { ascending: true });

    if (error) throw error;

    return (data ?? []).map((item: RecurringItem) => ({
      recurring_item: item,
      due_date: item.next_due_date,
      days_until_due: daysBetween(today, item.next_due_date),
      status: daysBetween(today, item.next_due_date) < 0 ? 'overdue' : 'pending',
    }));
  }

  async getUnused(userId: string): Promise<UnusedSubscription[]> {
    const { data, error } = await supabase
      .from('recurring_items')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'subscription')
      .eq('is_active', true);

    if (error) throw error;

    const today = new Date().toISOString().slice(0, 10);
    const THRESHOLD = 45;

    return (data ?? [])
      .filter((item: RecurringItem) => {
        if (item.usage_count_30d === 0) return true;
        if (!item.last_used_date)       return true;
        return daysBetween(item.last_used_date, today) > THRESHOLD;
      })
      .map((item: RecurringItem): UnusedSubscription => ({
        recurring_item: item,
        days_since_last_used: item.last_used_date
          ? daysBetween(item.last_used_date, today)
          : null,
        months_paid_without_use: item.last_paid_date
          ? Math.ceil(daysBetween(item.last_paid_date, today) / 30)
          : 0,
        potential_annual_saving: normalizeToMonthly(item.amount, item.billing_cycle) * 12,
      }));
  }

  async getSummary(userId: string): Promise<RecurringSummary> {
    const { data, error } = await supabase
      .from('recurring_items')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) throw error;

    const today   = new Date().toISOString().slice(0, 10);
    const in7days = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
    const THRESHOLD = 45;

    const bills = (data ?? []).filter((i: RecurringItem) => i.type === 'bill');
    const subs  = (data ?? []).filter((i: RecurringItem) => i.type === 'subscription');

    return {
      total_monthly_bills: bills.reduce(
        (sum: number, i: RecurringItem) => sum + normalizeToMonthly(i.amount, i.billing_cycle), 0
      ),
      total_monthly_subscriptions: subs.reduce(
        (sum: number, i: RecurringItem) => sum + normalizeToMonthly(i.amount, i.billing_cycle), 0
      ),
      upcoming_7_days: (data ?? []).filter(
        (i: RecurringItem) => i.next_due_date >= today && i.next_due_date <= in7days
      ).length,
      overdue_count: (data ?? []).filter(
        (i: RecurringItem) => i.next_due_date < today
      ).length,
      unused_subscriptions: subs.filter((i: RecurringItem) => {
        if (i.usage_count_30d === 0) return true;
        if (!i.last_used_date)       return true;
        return daysBetween(i.last_used_date, today) > THRESHOLD;
      }).length,
    };
  }

  // ── Auto-generate ─────────────────────────────────────────

  async autoGenerate(userId: string): Promise<string[]> {
    const today = new Date().toISOString().slice(0, 10);
    const month = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    const { data: dueItems, error } = await supabase
      .from('recurring_items')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .eq('auto_create_tx', true)
      .lte('next_due_date', today);

    if (error) throw error;

    const created: string[] = [];

    for (const item of dueItems ?? []) {
      // Find category ID
      const { data: category } = await supabase
        .from('budget_categories')
        .select('id')
        .eq('user_id', userId)
        .eq('name', item.category)
        .maybeSingle();

      const { data: tx, error: txErr } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          amount: -item.amount,
          description: `${item.name} - Auto-generated`,
          category_id: category?.id || null,
          date: today,
          type: 'expense',
          month,
          notes: `Auto-generated from recurring: ${item.name}`,
        })
        .select()
        .single();

      if (!txErr && tx) {
        created.push(item.name);
        const nextDue = computeNextDueDate(item.billing_cycle, item.billing_day);

        await supabase
          .from('recurring_items')
          .update({ last_paid_date: today, next_due_date: nextDue })
          .eq('id', item.id);

        await supabase
          .from('recurring_payments')
          .update({ status: 'paid', paid_date: today, transaction_id: tx.id })
          .eq('recurring_item_id', item.id)
          .eq('status', 'pending');

        await supabase.from('recurring_payments').insert({
          recurring_item_id: item.id,
          user_id: userId,
          due_date: nextDue,
          amount: item.amount,
          status: 'pending',
        });
      } else if (txErr) {
        console.error('❌ Failed to auto-generate transaction:', txErr);
      }
    }

    return created;
  }
}