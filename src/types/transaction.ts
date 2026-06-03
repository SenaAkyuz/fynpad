export type CategoryKind = 'income' | 'expense';

export type Currency = 'TRY' | 'USD' | 'EUR';

/**
 * Kategori — Part 5'te DB-driven. `name`:
 *   - default kategoriler için i18n anahtarı (örn. 'dashboard.categories.salary')
 *   - kullanıcı oluşturduğu kategoriler için direkt string
 * Render'da `t(name)` kullanılır; custom isimler key bulunamayınca aynen döner.
 */
export type Category = {
  id: string; // uuid
  userId: string;
  name: string;
  /** Icon komponentindeki isim (örn. 'shopping-bag') */
  icon: string;
  /** kategori rengi (hex, theme-agnostic) */
  color: string;
  kind: CategoryKind;
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type Transaction = {
  id: string;
  userId: string;
  categoryId: string;
  /** pozitif sayı; yön kind ile belirlenir */
  amount: number;
  currency: Currency;
  kind: CategoryKind;
  /** ISO date 'YYYY-MM-DD' */
  date: string;
  note: string | null;
  /** Part 6'da kullanılacak */
  recurringRuleId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

/**
 * Tekrarlayan işlem kuralı (Part 6). Sistem bu kuraldan otomatik transaction üretir.
 * `dayOfMonth === 31` "ayın son günü" anlamına gelir — DB tarafı kısa aylarda son güne sığdırır.
 */
export type RecurringRule = {
  id: string;
  userId: string;
  categoryId: string;
  amount: number;
  currency: Currency;
  kind: CategoryKind;
  note: string | null;
  frequency: RecurringFrequency;
  /** 0-6 (0=Pazar), weekly için */
  dayOfWeek: number | null;
  /** 1-31, monthly + yearly için (31 = son gün) */
  dayOfMonth: number | null;
  /** 1-12, yearly için */
  monthOfYear: number | null;
  /** ISO 'YYYY-MM-DD' */
  startDate: string;
  endDate: string | null;
  lastGeneratedDate: string | null;
  active: boolean;
  /** Part 7: abonelik metadata'sı (is_subscription=true ise dolu). */
  isSubscription: boolean;
  serviceName: string | null;
  planName: string | null;
  /** ServiceIconPicker key'i (örn. 'netflix', 'tv') */
  iconKey: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Abonelik = is_subscription=true olan RecurringRule (Part 7). DB check constraint
 * gereği serviceName dolu, kind='expense', frequency monthly|yearly.
 */
export type Subscription = RecurringRule & {
  isSubscription: true;
  serviceName: string;
  kind: 'expense';
  frequency: 'monthly' | 'yearly';
};

export function isSubscription(rule: RecurringRule): rule is Subscription {
  return rule.isSubscription && rule.serviceName != null;
}
