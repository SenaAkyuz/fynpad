import { toISODate } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Category, CategoryKind, Currency, Period, Transaction } from '@/types';

/** DB satırı (snake_case) → app tipi (camelCase). */
type TransactionRow = {
  id: string;
  user_id: string;
  category_id: string;
  amount: number | string; // numeric PostgREST'te string gelebilir → Number() ile coerce
  currency: Currency;
  kind: CategoryKind;
  date: string;
  note: string | null;
  recurring_rule_id: string | null;
  created_at: string;
  updated_at: string;
};

function rowToTransaction(r: TransactionRow): Transaction {
  return {
    id: r.id,
    userId: r.user_id,
    categoryId: r.category_id,
    amount: Number(r.amount),
    currency: r.currency,
    kind: r.kind,
    date: r.date,
    note: r.note,
    recurringRuleId: r.recurring_rule_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) {
    throw new Error('Not authenticated');
  }
  return userId;
}

const PERIOD_DAYS: Record<Period, number> = { day: 0, week: 7, month: 30, year: 365 };

/** Seçili dönemin başlangıç/bitiş tarihleri ('YYYY-MM-DD', current_date temelli). */
export function periodRange(period: Period): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - PERIOD_DAYS[period]);
  return { from: toISODate(from), to: toISODate(now) };
}

/** user_id RLS ile filtrelenir. order: date desc, created_at desc. */
export async function listTransactions(params?: {
  period?: Period;
  from?: string;
  to?: string;
}): Promise<Transaction[]> {
  let query = supabase.from('transactions').select('*');

  if (params?.from) {
    query = query.gte('date', params.from);
  } else if (params?.period) {
    query = query.gte('date', periodRange(params.period).from);
  }
  if (params?.to) {
    query = query.lte('date', params.to);
  }

  const { data, error } = await query
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) {
    throw error;
  }
  return (data as TransactionRow[]).map(rowToTransaction);
}

export async function createTransaction(input: {
  categoryId: string;
  amount: number;
  currency: Currency;
  kind: CategoryKind;
  date: string;
  note?: string | null;
}): Promise<Transaction> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      category_id: input.categoryId,
      amount: input.amount,
      currency: input.currency,
      kind: input.kind,
      date: input.date,
      note: input.note ?? null,
    })
    .select('*')
    .single();
  if (error) {
    throw error;
  }
  return rowToTransaction(data as TransactionRow);
}

export async function updateTransaction(
  id: string,
  patch: Partial<{
    categoryId: string;
    amount: number;
    currency: Currency;
    kind: CategoryKind;
    date: string;
    note: string | null;
  }>
): Promise<Transaction> {
  const dbPatch: Record<string, unknown> = {};
  if (patch.categoryId !== undefined) dbPatch.category_id = patch.categoryId;
  if (patch.amount !== undefined) dbPatch.amount = patch.amount;
  if (patch.currency !== undefined) dbPatch.currency = patch.currency;
  if (patch.kind !== undefined) dbPatch.kind = patch.kind;
  if (patch.date !== undefined) dbPatch.date = patch.date;
  if (patch.note !== undefined) dbPatch.note = patch.note;

  const { data, error } = await supabase
    .from('transactions')
    .update(dbPatch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) {
    throw error;
  }
  return rowToTransaction(data as TransactionRow);
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) {
    throw error;
  }
}

export type Totals = {
  income: number;
  expense: number;
  net: number;
  byCategory: Record<string, { total: number; categoryId: string }>;
};

/** Dashboard için app-level aggregate (DB view yerine). Sadece expense byCategory'de. */
export function getTotals(transactions: Transaction[]): Totals {
  let income = 0;
  let expense = 0;
  const byCategory: Record<string, { total: number; categoryId: string }> = {};

  for (const tx of transactions) {
    if (tx.kind === 'income') {
      income += tx.amount;
    } else {
      expense += tx.amount;
      const prev = byCategory[tx.categoryId]?.total ?? 0;
      byCategory[tx.categoryId] = { total: prev + tx.amount, categoryId: tx.categoryId };
    }
  }

  return { income, expense, net: income - expense, byCategory };
}

export type BreakdownSegment = {
  categoryId: string;
  name: string;
  color: string;
  total: number;
  percent: number;
};

/**
 * Aggregate "kalanı topla" bucket'ının kendi kimliği. Gerçek `cat_other`/Diğer
 * kategorisi de top 5 dışında kalabildiği için ayrı sentinel id kullanılır —
 * aksi halde donut/legend'de iki element aynı React `key`'ine sahip olur.
 */
export const REST_BUCKET_ID = '__rest__';

/** Donut + legend için: en büyük 5 expense kategorisi + kalan "Diğer" altında. */
export function getBreakdown(
  transactions: Transaction[],
  categories: Category[]
): { segments: BreakdownSegment[]; total: number } {
  const { expense, byCategory } = getTotals(transactions);
  const catById = new Map(categories.map((c) => [c.id, c]));
  const pct = (v: number) => (expense > 0 ? (v / expense) * 100 : 0);

  const sorted = Object.values(byCategory).sort((a, b) => b.total - a.total);

  const top: BreakdownSegment[] = sorted.slice(0, 5).map((c) => {
    const cat = catById.get(c.categoryId);
    return {
      categoryId: c.categoryId,
      name: cat?.name ?? 'dashboard.categories.other',
      color: cat?.color ?? '#494454',
      total: c.total,
      percent: pct(c.total),
    };
  });

  const restTotal = sorted.slice(5).reduce((s, c) => s + c.total, 0);
  if (restTotal > 0) {
    top.push({
      categoryId: REST_BUCKET_ID,
      name: 'dashboard.categories.other',
      color: '#494454',
      total: restTotal,
      percent: pct(restTotal),
    });
  }

  return { segments: top, total: expense };
}
