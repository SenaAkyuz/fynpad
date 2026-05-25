import { toISODate } from '@/lib/format';
import type { Locale, Period, Transaction } from '@/types';

const intlLocale = (locale: Locale): string => (locale === 'tr' ? 'tr-TR' : 'en-US');

/** Period başına gün sayısı (avg daily spend için). day=1 (0'a bölme olmasın). */
const PERIOD_DAYS: Record<Period, number> = { day: 1, week: 7, month: 30, year: 365 };

export type CashFlowBucket = {
  /** X ekseni etiketi (locale'e göre: hafta günü / gün no / kısa ay) */
  label: string;
  income: number;
  expense: number;
  /** bucket anahtarı: günlük 'YYYY-MM-DD', aylık 'YYYY-MM' */
  date: string;
};

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Period'a göre gelir/gider zaman serisi. Transaction'lar tarih-bazlı (saat yok), bu yüzden:
 *   day:   tek gün (bugün)
 *   week:  son 7 gün (günlük)
 *   month: son 30 gün (günlük)
 *   year:  son 12 ay (aylık)
 * transactions zaten period'a göre filtrelenmiş gelir; burada bucket'lara dağıtılır.
 */
export function cashFlowSeries(
  transactions: Transaction[],
  period: Period,
  locale: Locale = 'tr'
): { buckets: CashFlowBucket[] } {
  const today = startOfDay(new Date());

  if (period === 'year') {
    const monthFmt = new Intl.DateTimeFormat(intlLocale(locale), { month: 'short' });
    const months: { key: string; label: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: monthFmt.format(d),
      });
    }
    const agg = new Map<string, { income: number; expense: number }>();
    months.forEach((m) => agg.set(m.key, { income: 0, expense: 0 }));
    for (const tx of transactions) {
      const a = agg.get(tx.date.slice(0, 7));
      if (a) {
        if (tx.kind === 'income') a.income += tx.amount;
        else a.expense += tx.amount;
      }
    }
    return {
      buckets: months.map((m) => ({ label: m.label, date: m.key, ...agg.get(m.key)! })),
    };
  }

  // Günlük bucket'lar: day=1, week=7, month=30
  const days = PERIOD_DAYS[period] === 1 ? 1 : period === 'week' ? 7 : 30;
  const weekdayFmt = new Intl.DateTimeFormat(intlLocale(locale), { weekday: 'short' });
  const list: { iso: string; label: string }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    list.push({
      iso: toISODate(d),
      // ay görünümünde gün numarası, aksi halde kısa hafta günü
      label: period === 'month' ? String(d.getDate()) : weekdayFmt.format(d),
    });
  }
  const agg = new Map<string, { income: number; expense: number }>();
  list.forEach((x) => agg.set(x.iso, { income: 0, expense: 0 }));
  for (const tx of transactions) {
    const a = agg.get(tx.date);
    if (a) {
      if (tx.kind === 'income') a.income += tx.amount;
      else a.expense += tx.amount;
    }
  }
  return {
    buckets: list.map((x) => ({ label: x.label, date: x.iso, ...agg.get(x.iso)! })),
  };
}

/** Net birikim: gelir - gider (period'a göre filtrelenmiş transactions üzerinden). */
export function netSavings(transactions: Transaction[]): number {
  let income = 0;
  let expense = 0;
  for (const tx of transactions) {
    if (tx.kind === 'income') income += tx.amount;
    else expense += tx.amount;
  }
  return income - expense;
}

/** Ortalama günlük harcama: toplam gider / period gün sayısı. */
export function avgDailySpend(transactions: Transaction[], period: Period): number {
  let expense = 0;
  for (const tx of transactions) {
    if (tx.kind === 'expense') expense += tx.amount;
  }
  return expense / PERIOD_DAYS[period];
}

export type TopCategory = {
  categoryId: string;
  total: number;
  percent: number; // toplam gidere oranı
};

/** En çok harcanan expense kategoriler (top N), toplam + yüzde. */
export function topCategories(
  transactions: Transaction[],
  limit: number = 5
): TopCategory[] {
  let total = 0;
  const byCategory = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.kind === 'expense') {
      total += tx.amount;
      byCategory.set(tx.categoryId, (byCategory.get(tx.categoryId) ?? 0) + tx.amount);
    }
  }
  return [...byCategory.entries()]
    .map(([categoryId, catTotal]) => ({
      categoryId,
      total: catTotal,
      percent: total > 0 ? (catTotal / total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}
