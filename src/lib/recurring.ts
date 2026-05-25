import { supabase } from '@/lib/supabase';
import { toISODate } from '@/lib/format';
import type { CategoryKind, Currency, RecurringFrequency, RecurringRule } from '@/types';

/** DB satırı (snake_case) → app tipi (camelCase). */
type RecurringRuleRow = {
  id: string;
  user_id: string;
  category_id: string;
  amount: number | string;
  currency: Currency;
  kind: CategoryKind;
  note: string | null;
  frequency: RecurringFrequency;
  day_of_week: number | null;
  day_of_month: number | null;
  month_of_year: number | null;
  start_date: string;
  end_date: string | null;
  last_generated_date: string | null;
  active: boolean;
  is_subscription: boolean;
  service_name: string | null;
  plan_name: string | null;
  icon_key: string | null;
  created_at: string;
  updated_at: string;
};

function rowToRule(r: RecurringRuleRow): RecurringRule {
  return {
    id: r.id,
    userId: r.user_id,
    categoryId: r.category_id,
    amount: Number(r.amount),
    currency: r.currency,
    kind: r.kind,
    note: r.note,
    frequency: r.frequency,
    dayOfWeek: r.day_of_week,
    dayOfMonth: r.day_of_month,
    monthOfYear: r.month_of_year,
    startDate: r.start_date,
    endDate: r.end_date,
    lastGeneratedDate: r.last_generated_date,
    active: r.active,
    isSubscription: r.is_subscription,
    serviceName: r.service_name,
    planName: r.plan_name,
    iconKey: r.icon_key,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export { rowToRule, type RecurringRuleRow };

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) {
    throw new Error('Not authenticated');
  }
  return userId;
}

export type RecurringRuleInput = {
  categoryId: string;
  amount: number;
  currency: Currency;
  kind: CategoryKind;
  note?: string | null;
  frequency: RecurringFrequency;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  monthOfYear?: number | null;
  startDate: string;
  endDate?: string | null;
};

/**
 * RPC: oturum kullanıcısının kurallarını p_target_date'e kadar işler (auth.uid() implicit).
 * Idempotent — aynı (rule, date) için ikinci kez transaction üretmez. Üretilen sayıyı döner.
 */
export async function processRecurringRules(targetDate?: string): Promise<number> {
  const { data, error } = await supabase.rpc('process_my_recurring_rules', {
    p_target_date: targetDate ?? toISODate(new Date()),
  });
  if (error) {
    throw error;
  }
  return (data as number) ?? 0;
}

/** RLS: yalnızca kullanıcının kendi kuralları. created_at desc. */
export async function listRecurringRules(): Promise<RecurringRule[]> {
  const { data, error } = await supabase
    .from('recurring_rules')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    throw error;
  }
  return (data as RecurringRuleRow[]).map(rowToRule);
}

/**
 * Kural oluşturur, ardından bugüne kadar eksik (geçmiş) işlemleri tek seferde üretir
 * (backfill — start_date <= today ise). RPC çağrısı idempotent olduğundan güvenli.
 */
export async function createRecurringRule(input: RecurringRuleInput): Promise<RecurringRule> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('recurring_rules')
    .insert({
      user_id: userId,
      category_id: input.categoryId,
      amount: input.amount,
      currency: input.currency,
      kind: input.kind,
      note: input.note ?? null,
      frequency: input.frequency,
      day_of_week: input.dayOfWeek ?? null,
      day_of_month: input.dayOfMonth ?? null,
      month_of_year: input.monthOfYear ?? null,
      start_date: input.startDate,
      end_date: input.endDate ?? null,
    })
    .select('*')
    .single();
  if (error) {
    throw error;
  }
  // Backfill: start_date geçmişteyse eksik işlemleri üret.
  await processRecurringRules();
  return rowToRule(data as RecurringRuleRow);
}

export type RecurringRulePatch = Partial<{
  categoryId: string;
  amount: number;
  currency: Currency;
  kind: CategoryKind;
  note: string | null;
  frequency: RecurringFrequency;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  monthOfYear: number | null;
  startDate: string;
  endDate: string | null;
  active: boolean;
}>;

/**
 * Brief 4.3 KRİTİK: "düzenleme yalnızca ileri tarihli kayıtları etkiler, geçmiş kayıtlar
 * olduğu gibi kalır." → Sadece kuralın KENDİSİ güncellenir; geçmiş transaction'lara ASLA
 * dokunulmaz. Update sonrası processRecurringRules() çağrılır: last_generated_date sayesinde
 * geçmişe yeniden üretim yapılmaz, yalnızca bugünden sonraki günler yeni amount/category ile üretilir.
 */
export async function updateRecurringRule(
  id: string,
  patch: RecurringRulePatch
): Promise<RecurringRule> {
  const dbPatch: Record<string, unknown> = {};
  if (patch.categoryId !== undefined) dbPatch.category_id = patch.categoryId;
  if (patch.amount !== undefined) dbPatch.amount = patch.amount;
  if (patch.currency !== undefined) dbPatch.currency = patch.currency;
  if (patch.kind !== undefined) dbPatch.kind = patch.kind;
  if (patch.note !== undefined) dbPatch.note = patch.note;
  if (patch.frequency !== undefined) dbPatch.frequency = patch.frequency;
  if (patch.dayOfWeek !== undefined) dbPatch.day_of_week = patch.dayOfWeek;
  if (patch.dayOfMonth !== undefined) dbPatch.day_of_month = patch.dayOfMonth;
  if (patch.monthOfYear !== undefined) dbPatch.month_of_year = patch.monthOfYear;
  if (patch.startDate !== undefined) dbPatch.start_date = patch.startDate;
  if (patch.endDate !== undefined) dbPatch.end_date = patch.endDate;
  if (patch.active !== undefined) dbPatch.active = patch.active;

  const { data, error } = await supabase
    .from('recurring_rules')
    .update(dbPatch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) {
    throw error;
  }
  // Yalnızca ileriye dönük üretim; geçmiş işlemler değişmez (last_generated_date koruması).
  await processRecurringRules();
  return rowToRule(data as RecurringRuleRow);
}

/**
 * Brief 4.3: "Kullanıcı tekrarlayan bir kaydı silebilir; geçmiş kayıtlar olduğu gibi kalır."
 * → DB FK ON DELETE SET NULL: kuraldan üretilmiş transaction'lar SİLİNMEZ, sadece
 *   recurring_rule_id NULL'a düşer (repeat ikonu kaybolur, veri durur). Burada EXTRA silme YOK.
 */
export async function deleteRecurringRule(id: string): Promise<void> {
  const { error } = await supabase.from('recurring_rules').delete().eq('id', id);
  if (error) {
    throw error;
  }
}
