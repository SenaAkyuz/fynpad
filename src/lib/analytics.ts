import { toISODate } from '@/lib/format';
import { computeGoalProgress } from '@/lib/goals';
import type { Currency, Goal, Locale, Period, Transaction } from '@/types';

const intlLocale = (locale: Locale): string => (locale === 'tr' ? 'tr-TR' : 'en-US');

/** Period başına gün sayısı (avg daily spend için). day=1 (0'a bölme olmasın). */
const PERIOD_DAYS: Record<Period, number> = { day: 1, week: 7, month: 30, year: 365 };

/**
 * Gider tipi filtresi (brief 4.3): sabit = recurringRuleId dolu (kira/abonelik/taksit),
 * değişken = recurringRuleId null (market/restoran). Gelir bu ayrımdan etkilenmez.
 */
export type ExpenseType = 'all' | 'fixed' | 'variable';

/** Filtreyi yalnızca gider'lere uygular; gelir her zaman dahil kalır. */
export function filterByExpenseType(
  transactions: Transaction[],
  expenseType: ExpenseType
): Transaction[] {
  if (expenseType === 'all') {
    return transactions;
  }
  return transactions.filter((tx) => {
    if (tx.kind === 'income') {
      return true;
    }
    return expenseType === 'fixed'
      ? tx.recurringRuleId !== null
      : tx.recurringRuleId === null;
  });
}

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
  locale: Locale = 'tr',
  expenseType: ExpenseType = 'all'
): { buckets: CashFlowBucket[] } {
  transactions = filterByExpenseType(transactions, expenseType);
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
export function netSavings(
  transactions: Transaction[],
  expenseType: ExpenseType = 'all'
): number {
  transactions = filterByExpenseType(transactions, expenseType);
  let income = 0;
  let expense = 0;
  for (const tx of transactions) {
    if (tx.kind === 'income') income += tx.amount;
    else expense += tx.amount;
  }
  return income - expense;
}

/** Ortalama günlük harcama: toplam gider / period gün sayısı. */
export function avgDailySpend(
  transactions: Transaction[],
  period: Period,
  expenseType: ExpenseType = 'all'
): number {
  transactions = filterByExpenseType(transactions, expenseType);
  let expense = 0;
  for (const tx of transactions) {
    if (tx.kind === 'expense') expense += tx.amount;
  }
  return expense / PERIOD_DAYS[period];
}

/**
 * Otomatik aylık birikim hedefi (Part 14, tasarım revizyonu). Kullanıcı manuel hedef SET ETMEZ:
 * gereken aylık birikim, son tarihi olan tamamlanmamış hedeflerin `monthlyNeeded` toplamından
 * (para birimi başına grup) türetilir. Kur dönüşümü YOK — her para birimi ayrı tutulur.
 */
export type MonthlySavingsRequired = {
  /** Para birimi → o ay gereken toplam birikim. */
  byCurrency: Map<Currency, number>;
  /** Son tarihi olan, tamamlanmamış en az bir hedef var mı (kart/insight görünürlüğü). */
  hasAnyDeadline: boolean;
};

export function computeMonthlySavingsRequired(
  goals: Goal[],
  today: Date = new Date()
): MonthlySavingsRequired {
  const byCurrency = new Map<Currency, number>();
  let hasAnyDeadline = false;

  for (const g of goals) {
    if (!g.targetDate || g.completedAt) continue;
    hasAnyDeadline = true;

    const progress = computeGoalProgress(g, today);
    if (progress.monthlyNeeded === null || progress.monthlyNeeded <= 0) continue;

    byCurrency.set(g.currency, (byCurrency.get(g.currency) ?? 0) + progress.monthlyNeeded);
  }

  return { byCurrency, hasAnyDeadline };
}

/** Bu ayın gerçek net birikimi (gelir − gider), para birimi başına. Kur dönüşümü yok. */
export type MonthlyNetSavings = {
  byCurrency: Map<Currency, number>;
};

export function computeMonthlyNetSavings(
  transactions: Transaction[],
  today: Date = new Date()
): MonthlyNetSavings {
  const startOfMonthISO = toISODate(new Date(today.getFullYear(), today.getMonth(), 1));
  const byCurrency = new Map<Currency, number>();

  for (const tx of transactions) {
    if (tx.date < startOfMonthISO) continue;
    const signed = tx.kind === 'income' ? tx.amount : -tx.amount;
    byCurrency.set(tx.currency, (byCurrency.get(tx.currency) ?? 0) + signed);
  }
  return { byCurrency };
}

/** Gereken vs gerçek karşılaştırma (UI/insight için), yalnızca gereken birikimi olan para birimleri. */
export type MonthlySavingsComparison = {
  currency: Currency;
  required: number;
  actual: number;
  /** (actual / required) * 100 */
  percent: number;
  status: 'over' | 'on-track' | 'behind';
};

export function compareMonthlySavings(
  required: MonthlySavingsRequired,
  actual: MonthlyNetSavings
): MonthlySavingsComparison[] {
  const results: MonthlySavingsComparison[] = [];

  for (const [currency, requiredAmount] of required.byCurrency) {
    if (requiredAmount <= 0) continue;
    const actualAmount = actual.byCurrency.get(currency) ?? 0;
    const percent = (actualAmount / requiredAmount) * 100;

    let status: MonthlySavingsComparison['status'];
    if (percent >= 100) status = 'over';
    else if (percent >= 90) status = 'on-track';
    else status = 'behind';

    results.push({ currency, required: requiredAmount, actual: actualAmount, percent, status });
  }
  return results;
}

export type TopCategory = {
  categoryId: string;
  total: number;
  percent: number; // toplam gidere oranı
};

/** En çok harcanan expense kategoriler (top N), toplam + yüzde. */
export function topCategories(
  transactions: Transaction[],
  limit: number = 5,
  expenseType: ExpenseType = 'all'
): TopCategory[] {
  transactions = filterByExpenseType(transactions, expenseType);
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
