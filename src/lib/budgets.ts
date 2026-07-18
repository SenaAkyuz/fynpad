import { supabase } from '@/lib/supabase';
import type { BudgetStatus, CategoryBudget, Currency, Transaction } from '@/types';

/** DB satırı (snake_case) → app tipi (camelCase). */
type BudgetRow = {
  id: string;
  user_id: string;
  category_id: string;
  amount: number | string; // numeric PostgREST'te string gelebilir
  currency: Currency;
  period_type: 'monthly';
  created_at: string;
  updated_at: string;
};

function rowToBudget(r: BudgetRow): CategoryBudget {
  return {
    id: r.id,
    userId: r.user_id,
    categoryId: r.category_id,
    amount: Number(r.amount),
    currency: r.currency,
    periodType: r.period_type,
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

/** RLS: sadece kullanıcının kendi bütçeleri. */
export async function listBudgets(): Promise<CategoryBudget[]> {
  const { data, error } = await supabase
    .from('category_budgets')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) {
    throw error;
  }
  return (data as BudgetRow[]).map(rowToBudget);
}

/**
 * UNIQUE (user_id, category_id, period_type) sayesinde upsert: aynı kategori için
 * varsa günceller, yoksa ekler. period_type MVP'de hep 'monthly'.
 */
export async function upsertBudget(input: {
  categoryId: string;
  amount: number;
  currency: Currency;
}): Promise<CategoryBudget> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('category_budgets')
    .upsert(
      {
        user_id: userId,
        category_id: input.categoryId,
        amount: input.amount,
        currency: input.currency,
        period_type: 'monthly',
      },
      { onConflict: 'user_id,category_id,period_type' }
    )
    .select('*')
    .single();
  if (error) {
    throw error;
  }
  return rowToBudget(data as BudgetRow);
}

export async function deleteBudget(id: string): Promise<void> {
  const { error } = await supabase.from('category_budgets').delete().eq('id', id);
  if (error) {
    throw error;
  }
}

/** Bu içinde bulunulan takvim ayının 'YYYY-MM-01' ISO başlangıcı (bütçe sorgusu için). */
export function startOfMonthISO(asOf: Date = new Date()): string {
  return `${asOf.getFullYear()}-${String(asOf.getMonth() + 1).padStart(2, '0')}-01`;
}

/** 'YYYY-MM' — içinde bulunulan ay. */
function currentYearMonth(asOf: Date = new Date()): string {
  return `${asOf.getFullYear()}-${String(asOf.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Bu ayki (takvim ayı) expense transaction'lardan kategoriye göre harcamayı toplayıp
 * bütçe durumunu hesaplar. transactions ay dışı kayıt içerse bile burada filtrelenir.
 *
 * Para birimi: harcama YALNIZCA bütçenin kendi para birimindeki işlemlerden toplanır.
 * Bütçe kendi `currency`'sini taşıdığı için ek parametre gerekmez. Bu şart olmadan
 * 500 TRY'lik bütçeye 50 USD'lik bir gider 50 TRY gibi işleniyordu.
 */
export function computeBudgetStatus(
  budget: CategoryBudget,
  transactions: Transaction[]
): BudgetStatus {
  const ym = currentYearMonth();
  let spent = 0;
  for (const tx of transactions) {
    if (
      tx.kind === 'expense' &&
      tx.categoryId === budget.categoryId &&
      tx.currency === budget.currency &&
      tx.date.slice(0, 7) === ym
    ) {
      spent += tx.amount;
    }
  }
  const remaining = budget.amount - spent;
  const percent = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
  const isOver = spent > budget.amount;
  return {
    budget,
    spent,
    remaining,
    percent,
    isOver,
    overAmount: isOver ? spent - budget.amount : 0,
  };
}
