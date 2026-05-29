import { fromISODate, toISODate } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Currency, Goal, GoalProgress } from '@/types';

const MS_DAY = 86_400_000;

/** DB satırı (snake_case) → app tipi (camelCase). */
type GoalRow = {
  id: string;
  user_id: string;
  name: string;
  target_amount: number | string; // numeric PostgREST'te string gelebilir
  current_amount: number | string;
  currency: Currency;
  target_date: string | null;
  icon_key: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

function rowToGoal(r: GoalRow): Goal {
  return {
    id: r.id,
    userId: r.user_id,
    name: r.name,
    targetAmount: Number(r.target_amount),
    currentAmount: Number(r.current_amount),
    currency: r.currency,
    targetDate: r.target_date,
    iconKey: r.icon_key,
    completedAt: r.completed_at,
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

async function getGoalRow(id: string): Promise<GoalRow> {
  const { data, error } = await supabase.from('goals').select('*').eq('id', id).single();
  if (error) {
    throw error;
  }
  return data as GoalRow;
}

/**
 * RLS: sadece kullanıcının kendi hedefleri. Sıralama: aktifler (completed_at null) önce,
 * sonra son tarih artan (tarihsizler sona), eşitlikte oluşturma sırası.
 */
export async function listGoals(): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .order('completed_at', { ascending: true, nullsFirst: true })
    .order('target_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });
  if (error) {
    throw error;
  }
  return (data as GoalRow[]).map(rowToGoal);
}

export type GoalInput = {
  name: string;
  targetAmount: number;
  currency: Currency;
  targetDate?: string | null;
  iconKey?: string | null;
  currentAmount?: number;
};

export async function createGoal(input: GoalInput): Promise<Goal> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('goals')
    .insert({
      user_id: userId,
      name: input.name,
      target_amount: input.targetAmount,
      current_amount: input.currentAmount ?? 0,
      currency: input.currency,
      target_date: input.targetDate ?? null,
      icon_key: input.iconKey ?? null,
    })
    .select('*')
    .single();
  if (error) {
    throw error;
  }
  return rowToGoal(data as GoalRow);
}

export type GoalPatch = Partial<{
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: Currency;
  targetDate: string | null;
  iconKey: string | null;
}>;

/** Partial update — completed_at DB trigger ile (current vs target) otomatik yönetilir. */
export async function updateGoal(input: { id: string } & GoalPatch): Promise<Goal> {
  const { id, ...patch } = input;
  const dbPatch: Record<string, unknown> = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.targetAmount !== undefined) dbPatch.target_amount = patch.targetAmount;
  if (patch.currentAmount !== undefined) dbPatch.current_amount = patch.currentAmount;
  if (patch.currency !== undefined) dbPatch.currency = patch.currency;
  if (patch.targetDate !== undefined) dbPatch.target_date = patch.targetDate;
  if (patch.iconKey !== undefined) dbPatch.icon_key = patch.iconKey;

  const { data, error } = await supabase
    .from('goals')
    .update(dbPatch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) {
    throw error;
  }
  return rowToGoal(data as GoalRow);
}

export async function deleteGoal(id: string): Promise<void> {
  const { error } = await supabase.from('goals').delete().eq('id', id);
  if (error) {
    throw error;
  }
}

/** Hedefe birikim ekle: current_amount += amount. Mevcut değer resume anında okunur. */
export async function addToGoal(id: string, amount: number): Promise<Goal> {
  const row = await getGoalRow(id);
  const next = Number(row.current_amount) + amount;
  return updateGoal({ id, currentAmount: next });
}

/** Hedeften düş: current_amount = max(0, current - amount). */
export async function subtractFromGoal(id: string, amount: number): Promise<Goal> {
  const row = await getGoalRow(id);
  const next = Math.max(0, Number(row.current_amount) - amount);
  return updateGoal({ id, currentAmount: next });
}

/** Bir para birimindeki tüm hedeflerin birleşik ilerlemesi. */
export type CurrencyTotal = {
  currency: Currency;
  currentAmount: number;
  targetAmount: number;
  /** 0-100, 100'de clamp */
  percent: number;
  goalCount: number;
};

export type TotalGoalProgress = {
  /** Her para birimi için ayrı satır (conversion YOK — multi-currency güvenli). */
  byCurrency: CurrencyTotal[];
  isSingleCurrency: boolean;
  totalGoals: number;
  completedGoals: number;
};

/**
 * Hedefleri para birimine göre gruplayıp her grubun toplam current/target + yüzdesini döner.
 * Farklı para birimleri TOPLANMAZ (kur dönüşümü yok) — UI her birini ayrı gösterir.
 */
export function computeTotalGoalProgress(goals: Goal[]): TotalGoalProgress {
  const groups = new Map<Currency, { current: number; target: number; count: number }>();

  for (const g of goals) {
    const group = groups.get(g.currency) ?? { current: 0, target: 0, count: 0 };
    group.current += g.currentAmount;
    group.target += g.targetAmount;
    group.count += 1;
    groups.set(g.currency, group);
  }

  const byCurrency: CurrencyTotal[] = Array.from(groups.entries()).map(([currency, g]) => ({
    currency,
    currentAmount: g.current,
    targetAmount: g.target,
    percent: g.target > 0 ? Math.min((g.current / g.target) * 100, 100) : 0,
    goalCount: g.count,
  }));

  return {
    byCurrency,
    isSingleCurrency: byCurrency.length === 1,
    totalGoals: goals.length,
    completedGoals: goals.filter((g) => g.completedAt !== null).length,
  };
}

/** Hedef + türetilmiş ilerleme/durum. today date-only normalize edilir (off-by-one yok). */
export function computeGoalProgress(goal: Goal, today: Date = new Date()): GoalProgress {
  const percent = goal.targetAmount > 0
    ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
    : 0;
  const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);
  const isCompleted = goal.completedAt != null || goal.currentAmount >= goal.targetAmount;

  let daysUntilDeadline: number | null = null;
  if (goal.targetDate) {
    const target = fromISODate(goal.targetDate).getTime();
    const todayMid = fromISODate(toISODate(today)).getTime();
    daysUntilDeadline = Math.round((target - todayMid) / MS_DAY);
  }

  const isUrgent =
    !isCompleted &&
    daysUntilDeadline !== null &&
    daysUntilDeadline > 0 &&
    daysUntilDeadline <= 30 &&
    percent < 50;

  let monthlyNeeded: number | null = null;
  if (!isCompleted && daysUntilDeadline !== null && daysUntilDeadline > 0 && remaining > 0) {
    const months = Math.max(1, Math.ceil(daysUntilDeadline / 30));
    monthlyNeeded = remaining / months;
  }

  return { goal, percent, remaining, isCompleted, daysUntilDeadline, isUrgent, monthlyNeeded };
}
