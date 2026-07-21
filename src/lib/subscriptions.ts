import { fromISODate, toISODate } from '@/lib/format';
import { processRecurringRules, rowToRule, type RecurringRuleRow } from '@/lib/recurring';
import { supabase } from '@/lib/supabase';
import { isSubscription } from '@/types';
import type { Currency, RecurringFrequency, Subscription } from '@/types';

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) {
    throw new Error('Not authenticated');
  }
  return userId;
}

/** Kullanıcının varsayılan "Abonelikler" kategorisinin id'si (seed'de gelir, silinemez). */
async function getSubscriptionsCategoryId(): Promise<string> {
  const { data, error } = await supabase
    .from('categories')
    .select('id')
    .eq('name', 'dashboard.categories.subscriptions')
    .eq('kind', 'expense')
    .limit(1)
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!data) {
    throw new Error('Subscriptions category not found');
  }
  return (data as { id: string }).id;
}

/** RLS: kullanıcının is_subscription=true & active kuralları. service_name asc. */
export async function listSubscriptions(): Promise<Subscription[]> {
  const { data, error } = await supabase
    .from('recurring_rules')
    .select('*')
    .eq('is_subscription', true)
    .eq('active', true)
    .order('service_name', { ascending: true });
  if (error) {
    throw error;
  }
  return (data as RecurringRuleRow[]).map(rowToRule).filter(isSubscription);
}

export type SubscriptionFrequency = Extract<RecurringFrequency, 'monthly' | 'yearly'>;

export type SubscriptionInput = {
  serviceName: string;
  planName?: string | null;
  iconKey: string;
  amount: number;
  currency: Currency;
  frequency: SubscriptionFrequency;
  dayOfMonth: number;
  monthOfYear?: number | null;
  startDate: string;
  endDate?: string | null;
  note?: string | null;
};

export async function createSubscription(input: SubscriptionInput): Promise<Subscription> {
  const userId = await requireUserId();
  const categoryId = await getSubscriptionsCategoryId();

  const { data, error } = await supabase
    .from('recurring_rules')
    .insert({
      user_id: userId,
      category_id: categoryId,
      amount: input.amount,
      currency: input.currency,
      kind: 'expense',
      note: input.note ?? null,
      frequency: input.frequency,
      day_of_week: null,
      day_of_month: input.dayOfMonth,
      month_of_year: input.frequency === 'yearly' ? (input.monthOfYear ?? null) : null,
      start_date: input.startDate,
      end_date: input.endDate ?? null,
      is_subscription: true,
      service_name: input.serviceName,
      plan_name: input.planName ?? null,
      icon_key: input.iconKey,
    })
    .select('*')
    .single();
  if (error) {
    throw error;
  }
  // Backfill: start_date geçmişteyse eksik işlemleri üret (Part 6 ile aynı; RPC idempotent).
  await processRecurringRules();
  const sub = rowToRule(data as RecurringRuleRow);
  if (!isSubscription(sub)) {
    throw new Error('Created rule is not a subscription');
  }
  return sub;
}

export type SubscriptionPatch = Partial<{
  serviceName: string;
  planName: string | null;
  iconKey: string;
  amount: number;
  currency: Currency;
  frequency: SubscriptionFrequency;
  dayOfMonth: number;
  monthOfYear: number | null;
  startDate: string;
  endDate: string | null;
  note: string | null;
}>;

/**
 * Brief 4.3: düzenleme yalnızca ileri tarihli kayıtları etkiler — geçmiş transaction'lara
 * dokunulmaz (recurring rule edit ile aynı davranış). last_generated_date koruması sağlar.
 */
export async function updateSubscription(id: string, patch: SubscriptionPatch): Promise<Subscription> {
  const dbPatch: Record<string, unknown> = {};
  if (patch.serviceName !== undefined) dbPatch.service_name = patch.serviceName;
  if (patch.planName !== undefined) dbPatch.plan_name = patch.planName;
  if (patch.iconKey !== undefined) dbPatch.icon_key = patch.iconKey;
  if (patch.amount !== undefined) dbPatch.amount = patch.amount;
  if (patch.currency !== undefined) dbPatch.currency = patch.currency;
  if (patch.frequency !== undefined) dbPatch.frequency = patch.frequency;
  if (patch.dayOfMonth !== undefined) dbPatch.day_of_month = patch.dayOfMonth;
  if (patch.monthOfYear !== undefined) dbPatch.month_of_year = patch.monthOfYear;
  if (patch.startDate !== undefined) dbPatch.start_date = patch.startDate;
  if (patch.endDate !== undefined) dbPatch.end_date = patch.endDate;
  if (patch.note !== undefined) dbPatch.note = patch.note;

  const { data, error } = await supabase
    .from('recurring_rules')
    .update(dbPatch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) {
    throw error;
  }
  await processRecurringRules();
  const sub = rowToRule(data as RecurringRuleRow);
  if (!isSubscription(sub)) {
    throw new Error('Updated rule is not a subscription');
  }
  return sub;
}

/**
 * Brief 4.4/4.3: silince FK ON DELETE SET NULL ile geçmiş transaction'lar korunur
 * (recurring_rule_id NULL'a düşer). Bildirim iptali hook katmanında rescheduleAll ile yapılır.
 */
export async function deleteSubscription(id: string): Promise<void> {
  const { error } = await supabase.from('recurring_rules').delete().eq('id', id);
  if (error) {
    throw error;
  }
}

// ──────────────────────────────────────────────
// Tarih / toplam helper'ları
// ──────────────────────────────────────────────

/** Verilen yıl/ay/gün için tarih; gün ayın gün sayısını aşarsa son güne sığdırır (31 = son gün). */
function clampedDate(year: number, monthIndex: number, day: number): Date {
  const normalized = new Date(year, monthIndex, 1);
  const y = normalized.getFullYear();
  const m = normalized.getMonth();
  const lastDay = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(day, lastDay));
}

/** Aboneliğin bugünden (veya from'dan) sonraki ilk yenilenme tarihi ('YYYY-MM-DD'); end_date geçtiyse null. */
export function nextRenewalDate(sub: Subscription, from: Date = new Date()): string | null {
  const start = fromISODate(sub.startDate);
  const fromMs = Math.max(from.getTime(), start.getTime());
  const base = new Date(fromMs);
  const baseDay = new Date(base.getFullYear(), base.getMonth(), base.getDate());

  const dom = sub.dayOfMonth ?? 1;
  let candidate: Date;

  if (sub.frequency === 'monthly') {
    candidate = clampedDate(baseDay.getFullYear(), baseDay.getMonth(), dom);
    if (candidate < baseDay) {
      candidate = clampedDate(baseDay.getFullYear(), baseDay.getMonth() + 1, dom);
    }
  } else {
    const moy = (sub.monthOfYear ?? 1) - 1;
    candidate = clampedDate(baseDay.getFullYear(), moy, dom);
    if (candidate < baseDay) {
      candidate = clampedDate(baseDay.getFullYear() + 1, moy, dom);
    }
  }

  const iso = toISODate(candidate);
  if (sub.endDate && iso > sub.endDate) {
    return null;
  }
  return iso;
}

/**
 * Para birimi güvenliği (bkz. lib/currencyScope.ts): farklı para birimlerindeki abonelikler
 * ASLA tek toplama karışmaz. Toplam/geçmiş/değişim hesaplayan tüm fonksiyonlar aktif raporlama
 * para birimine filtreler; `currency` parametresi ZORUNLUDUR (opsiyonel olsaydı unutulan bir
 * çağrı sessizce eski yanlış davranışa — 500 TRY + 10 USD = "510" — düşerdi).
 * Abonelik LİSTESİ dokunulmadan tüm para birimlerini göstermeye devam eder.
 */

/** Aylık eşdeğer toplam (yalnızca `currency`): monthly→amount, yearly→amount/12. */
export function totalMonthlySpend(subs: Subscription[], currency: Currency): number {
  return subs
    .filter((s) => s.currency === currency)
    .reduce((sum, s) => sum + (s.frequency === 'monthly' ? s.amount : s.amount / 12), 0);
}

/** Belirli bir ayda aktif olan (ve `currency` eşleşen) aboneliklerin aylık eşdeğer toplamı. */
function monthTotalAt(
  subs: Subscription[],
  year: number,
  monthIndex: number,
  currency: Currency
): number {
  const monthStart = new Date(year, monthIndex, 1);
  const monthEnd = new Date(year, monthIndex + 1, 0);
  let total = 0;
  for (const s of subs) {
    if (s.currency !== currency) {
      continue;
    }
    const start = fromISODate(s.startDate);
    const end = s.endDate ? fromISODate(s.endDate) : null;
    const activeInMonth = start <= monthEnd && (!end || end >= monthStart);
    if (activeInMonth) {
      total += s.frequency === 'monthly' ? s.amount : s.amount / 12;
    }
  }
  return total;
}

/** Son N ay (kronolojik, sonuncusu = bu ay) için `currency` cinsinden aylık abonelik harcaması. */
export function monthlySpendHistory(
  subs: Subscription[],
  currency: Currency,
  months: number = 7
): { month: string; total: number }[] {
  const now = new Date();
  const out: { month: string; total: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      total: monthTotalAt(subs, d.getFullYear(), d.getMonth(), currency),
    });
  }
  return out;
}

export function thisMonthTotal(
  subs: Subscription[],
  currency: Currency,
  asOf: Date = new Date()
): number {
  return monthTotalAt(subs, asOf.getFullYear(), asOf.getMonth(), currency);
}

export function lastMonthTotal(
  subs: Subscription[],
  currency: Currency,
  asOf: Date = new Date()
): number {
  const d = new Date(asOf.getFullYear(), asOf.getMonth() - 1, 1);
  return monthTotalAt(subs, d.getFullYear(), d.getMonth(), currency);
}

/** `currency` cinsinden aylık değişim yüzdesi; geçen ay 0 ise null (yeni başlangıç). */
export function monthOverMonthPct(subs: Subscription[], currency: Currency): number | null {
  const last = lastMonthTotal(subs, currency);
  if (last === 0) {
    return null;
  }
  return ((thisMonthTotal(subs, currency) - last) / last) * 100;
}

/** Tüm abonelikler arasında en yakın yenilenme. */
export function nextDueAcrossAll(
  subs: Subscription[]
): { subscription: Subscription; date: string } | null {
  let best: { subscription: Subscription; date: string } | null = null;
  for (const s of subs) {
    const date = nextRenewalDate(s);
    if (date && (!best || date < best.date)) {
      best = { subscription: s, date };
    }
  }
  return best;
}
