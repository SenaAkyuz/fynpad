import { supabase } from '@/lib/supabase';
import { fromISODate, toISODate } from '@/lib/format';
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
  clientRequestId: string;
  /**
   * Bugüne (seçilen işlem tarihine) YAZILACAK ilk ödemenin tarihi, veya `null`.
   *
   * null → RPC bugüne HİÇBİR kayıt yazmaz; tüm occurrence'lar yalnızca catch-up/scheduler
   * tarafından kuralın gerçek tetiklenme günlerinde üretilir. Geçmiş başlangıçta (6 Mayıs)
   * bu null olmalı — aksi halde kuralın occurrence'ı olmayan yanlış bir "bugün" işlemi
   * oluşuyordu. Yalnızca "bugün ödedim + bugünden başlat" senaryosunda tarih taşınır.
   */
  initialTransactionDate: string | null;
  /**
   * Part 7 / brief 4.4: tekrarlayan kural aynı anda abonelik olarak işaretlenebilir.
   * is_subscription=true ise DB constraint gereği serviceName dolu + kind 'expense' +
   * frequency 'monthly'|'yearly' olmalı (çağıran taraf doğrular).
   */
  isSubscription?: boolean;
  serviceName?: string | null;
  planName?: string | null;
  iconKey?: string | null;
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
  const { data, error } = await supabase.rpc('create_recurring_rule_with_initial_transaction', {
    p_client_request_id: input.clientRequestId,
    p_category_id: input.categoryId,
    p_amount: input.amount,
    p_currency: input.currency,
    p_kind: input.kind,
    p_note: input.note ?? null,
    p_frequency: input.frequency,
    p_day_of_week: input.dayOfWeek ?? null,
    p_day_of_month: input.dayOfMonth ?? null,
    p_month_of_year: input.monthOfYear ?? null,
    p_start_date: input.startDate,
    p_end_date: input.endDate ?? null,
    p_initial_transaction_date: input.initialTransactionDate,
  });
  if (error) {
    throw error;
  }
  // Backfill: start_date geçmişteyse eksik işlemleri üret.
  return rowToRule(data as RecurringRuleRow);
}

/**
 * Kuralın `from`'dan SONRAKİ ilk tetiklenme tarihi ('YYYY-MM-DD'), yoksa null.
 *
 * DB'deki `recurring_rule_fires_on` ile AYNI semantiği uygular (0003):
 *   daily   → her gün
 *   weekly  → haftanın günü (0=Pazar, JS getDay() ile aynı)
 *   monthly → min(dayOfMonth, ayın son günü)  ← 31 seçilip 30 çeken ay
 *   yearly  → monthOfYear + aynı gün sığdırma
 * Aksi halde ekranda gösterilen "sonraki tekrar" tarihi scheduler'ın gerçekte üreteceği
 * tarihten sapardı. `from` DAHİL DEĞİLDİR — ertesi günden başlar.
 */
export function nextOccurrenceDate(
  rule: {
    frequency: RecurringFrequency;
    dayOfWeek?: number | null;
    dayOfMonth?: number | null;
    monthOfYear?: number | null;
    startDate: string;
    endDate?: string | null;
  },
  from: Date = new Date()
): string | null {
  const firesOn = (d: Date): boolean => {
    switch (rule.frequency) {
      case 'daily':
        return true;
      case 'weekly':
        return d.getDay() === (rule.dayOfWeek ?? 0);
      case 'monthly': {
        const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        return d.getDate() === Math.min(rule.dayOfMonth ?? 1, lastDay);
      }
      case 'yearly': {
        const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        return (
          d.getMonth() + 1 === (rule.monthOfYear ?? 1) &&
          d.getDate() === Math.min(rule.dayOfMonth ?? 1, lastDay)
        );
      }
      default:
        return false;
    }
  };

  const start = fromISODate(rule.startDate);
  // Aramaya from'un ERTESİ gününden başla; start_date daha ileriyse oradan.
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1);
  if (cursor < start) {
    cursor.setTime(start.getTime());
  }

  // Yearly'de en kötü ihtimalle ~366+31 gün taranır; üst sınır güvenli.
  for (let i = 0; i < 800; i += 1) {
    const iso = toISODate(cursor);
    if (rule.endDate && iso > rule.endDate) {
      return null;
    }
    if (firesOn(cursor)) {
      return iso;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return null;
}

/** DB'deki catch-up penceresi (0011/0012 `max_catchup_days`) ile aynı üst sınır. */
export const MAX_CATCHUP_DAYS = 400;

/**
 * `start`'tan `to` tarihine (dahil) kadar kuralın kaç kez tetiklendiğini sayar — yani
 * kaydetme anında catch-up'ın üreteceği geçmiş+bugünkü işlem sayısı.
 *
 * DB ile AYNI iki sınırı uygular: (1) `nextOccurrenceDate` = `recurring_rule_fires_on`
 * semantiği, (2) `MAX_CATCHUP_DAYS` penceresi (`to - 400` günden eski occurrence'lar
 * scheduler tarafından da üretilmez). Böylece bilgi satırındaki sayı gerçekte oluşacak
 * işlem sayısıyla birebir tutar.
 */
export function countOccurrencesUpTo(
  rule: Parameters<typeof nextOccurrenceDate>[0],
  to: Date = new Date()
): number {
  const toISO = toISODate(to);
  const earliest = new Date(to.getFullYear(), to.getMonth(), to.getDate() - MAX_CATCHUP_DAYS);
  const earliestISO = toISODate(earliest);

  // Aramaya penceresinin (start_date veya earliest, hangisi büyükse) bir gün öncesinden
  // başla — nextOccurrenceDate `from`'u dahil etmez. Pencereden eski occurrence'lar zaten
  // sayılmayacağı için onları taramaya gerek yok (çok eski başlangıçta döngü sınırına
  // takılmadan doğru sonuç verir).
  const searchStartISO = rule.startDate > earliestISO ? rule.startDate : earliestISO;
  const cursor = fromISODate(searchStartISO);
  cursor.setDate(cursor.getDate() - 1);

  let count = 0;
  // Pencere en çok MAX_CATCHUP_DAYS gün → daily'de en fazla ~401 occurrence.
  for (let i = 0; i <= MAX_CATCHUP_DAYS + 1; i += 1) {
    const next = nextOccurrenceDate(rule, cursor);
    if (!next || next > toISO) break;
    count += 1;
    cursor.setTime(fromISODate(next).getTime());
  }
  return count;
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
  /** Part 7: mevcut kuralı abonelik yap / aboneliği geri al (brief 4.4 "mark as subscription"). */
  isSubscription: boolean;
  serviceName: string | null;
  planName: string | null;
  iconKey: string | null;
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
  if (patch.serviceName !== undefined) dbPatch.service_name = patch.serviceName;
  if (patch.planName !== undefined) dbPatch.plan_name = patch.planName;
  if (patch.iconKey !== undefined) dbPatch.icon_key = patch.iconKey;
  if (patch.isSubscription !== undefined) {
    dbPatch.is_subscription = patch.isSubscription;
    // Aboneliği geri alınca metadata temizlenir (constraint + temiz state).
    if (!patch.isSubscription) {
      dbPatch.service_name = null;
      dbPatch.plan_name = null;
      dbPatch.icon_key = null;
    }
  }

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
