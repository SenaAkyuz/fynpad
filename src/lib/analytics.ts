import { toISODate } from '@/lib/format';
import type { Profile } from '@/hooks/useProfile';
import type { Currency, Locale, Period, Transaction } from '@/types';

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
 * Aylık birikim hedefi ilerlemesi. "Fake bilgi yasak" gereği: actual yalnızca profilin
 * varsayılan para birimindeki bu-ayki işlemlerden hesaplanır (karışık para birimi TOPLANMAZ,
 * kur dönüşümü yok). Hedef farklı para birimindeyse kıyas anlamsız → comparable=false, percent=null.
 */
export type MonthlySavingsProgress = {
  hasTarget: boolean;
  target: number | null;
  targetCurrency: Currency | null;
  /** Bu ay profilin varsayılan para birimindeki net birikim (gelir - gider). */
  actual: number;
  actualCurrency: Currency;
  /** Hedef ve actual aynı para biriminde mi (kıyas anlamlı mı). */
  comparable: boolean;
  /** comparable ise actual/target * 100; değilse null. */
  percent: number | null;
  status: 'no-target' | 'mismatch' | 'over' | 'on-track' | 'close' | 'behind';
};

export function computeMonthlySavingsProgress(
  transactions: Transaction[],
  profile: Profile,
  today: Date = new Date()
): MonthlySavingsProgress {
  const profileCurrency = profile.defaultCurrency;
  const target = profile.monthlySavingsTarget;
  const targetCurrency = profile.monthlySavingsTargetCurrency;

  // Bu ayın başı (yerel) → ISO; date-only karşılaştırma.
  const startOfMonthISO = toISODate(new Date(today.getFullYear(), today.getMonth(), 1));

  // actual: yalnızca profil para birimindeki bu-ayki işlemler (karışık birim toplanmaz).
  let income = 0;
  let expense = 0;
  for (const tx of transactions) {
    if (tx.date < startOfMonthISO || tx.currency !== profileCurrency) continue;
    if (tx.kind === 'income') income += tx.amount;
    else expense += tx.amount;
  }
  const actual = income - expense;

  if (!target || !targetCurrency) {
    return {
      hasTarget: false,
      target: null,
      targetCurrency: null,
      actual,
      actualCurrency: profileCurrency,
      comparable: false,
      percent: null,
      status: 'no-target',
    };
  }

  const comparable = targetCurrency === profileCurrency;
  if (!comparable) {
    return {
      hasTarget: true,
      target,
      targetCurrency,
      actual,
      actualCurrency: profileCurrency,
      comparable: false,
      percent: null,
      status: 'mismatch',
    };
  }

  const percent = (actual / target) * 100;
  let status: MonthlySavingsProgress['status'];
  if (percent >= 100) status = 'over';
  else if (percent >= 90) status = 'on-track';
  else if (percent >= 50) status = 'close';
  else status = 'behind';

  return {
    hasTarget: true,
    target,
    targetCurrency,
    actual,
    actualCurrency: profileCurrency,
    comparable: true,
    percent,
    status,
  };
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
