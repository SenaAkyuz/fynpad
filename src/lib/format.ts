import type { Currency, Locale } from '@/types';

const intlLocale = (locale: Locale): string => (locale === 'tr' ? 'tr-TR' : 'en-US');

/**
 * Locale-aware para formatı.
 *   TRY + tr → "₺12.347,50"
 *   USD + en → "$12,347.50"
 *   EUR + tr → "12.347,50 €"
 * Intl.NumberFormat Hermes (Expo SDK 54) ile çalışır.
 */
export function formatCurrency(amount: number, currency: Currency, locale: Locale = 'tr'): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Para birimi sembolü (compact gösterim + amount input prefix için). */
export function currencySymbol(currency: Currency): string {
  switch (currency) {
    case 'TRY':
      return '₺';
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
  }
}

/**
 * Büyük sayılar için kısaltılmış para ("₺12,8B" / "$1,2M").
 * tr: B = bin, M = milyon · en: K = thousand, M = million.
 */
export function formatCompactCurrency(
  amount: number,
  currency: Currency,
  locale: Locale = 'tr'
): string {
  const sym = currencySymbol(currency);
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  const sep = locale === 'tr' ? ',' : '.';

  const withUnit = (value: number, unit: string): string => {
    // tek ondalık, gereksiz ",0" kırp
    const fixed = value.toFixed(1).replace('.', sep);
    const clean = fixed.endsWith(`${sep}0`) ? fixed.slice(0, -2) : fixed;
    return `${sign}${sym}${clean}${unit}`;
  };

  if (abs >= 1_000_000) {
    return withUnit(abs / 1_000_000, locale === 'tr' ? 'M' : 'M');
  }
  if (abs >= 1_000) {
    return withUnit(abs / 1_000, locale === 'tr' ? 'B' : 'K');
  }
  return `${sign}${sym}${abs.toFixed(0)}`;
}

const MS_HOUR = 3_600_000;
const MS_DAY = 86_400_000;

/**
 * Yakın geçmiş için relative ("2 saat önce", "Dün"), eski için absolute ("12 Eki").
 */
export function formatRelativeDate(date: string, locale: Locale = 'tr'): string {
  const then = new Date(date).getTime();
  const diff = Date.now() - then;

  if (diff < MS_HOUR) {
    const mins = Math.max(1, Math.floor(diff / 60_000));
    return locale === 'tr' ? `${mins} dk önce` : `${mins} min ago`;
  }
  if (diff < MS_DAY) {
    const hours = Math.floor(diff / MS_HOUR);
    return locale === 'tr' ? `${hours} saat önce` : `${hours}h ago`;
  }
  if (diff < 2 * MS_DAY) {
    return locale === 'tr' ? 'Dün' : 'Yesterday';
  }
  if (diff < 7 * MS_DAY) {
    const days = Math.floor(diff / MS_DAY);
    return locale === 'tr' ? `${days} gün önce` : `${days} days ago`;
  }
  // 7 günden eski → kısa absolute ("12 Eki" / "Oct 12")
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: 'numeric',
    month: 'short',
  }).format(then);
}

/**
 * Gelecek tarih için relative ("Bugün", "Yarın", "3 gün sonra"), 7 günden uzaksa
 * kısa absolute ("28 Eki" / "Oct 28"). Abonelik yenilenme tarihi için.
 */
export function formatRelativeFuture(date: string, locale: Locale = 'tr'): string {
  const target = fromISODate(date).getTime();
  const today = fromISODate(toISODate(new Date())).getTime();
  const days = Math.round((target - today) / MS_DAY);

  if (days <= 0) {
    return locale === 'tr' ? 'Bugün' : 'Today';
  }
  if (days === 1) {
    return locale === 'tr' ? 'Yarın' : 'Tomorrow';
  }
  if (days < 7) {
    return locale === 'tr' ? `${days} gün sonra` : `in ${days} days`;
  }
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: 'numeric',
    month: 'short',
  }).format(target);
}

/**
 * İşlem tarihi (date-only 'YYYY-MM-DD') için gösterim. `formatRelativeDate`'ten farkı:
 * created_at zaman damgası değil, kullanıcının seçtiği tarih baz alınır — bu yüzden
 * gün bazında karşılaştırılır ("2 saat önce" gibi saat bazlı yanıltıcı çıktı olmaz).
 *   Bugün → "Bugün" · Dün → "Dün" · 2-6 gün → "3 gün önce" · 7+ gün/gelecek → "12 Eki" / "12 Eki 2025"
 */
export function formatTransactionDate(date: string, locale: Locale = 'tr'): string {
  const target = fromISODate(date);
  const today = fromISODate(toISODate(new Date()));
  const days = Math.round((today.getTime() - target.getTime()) / MS_DAY);

  if (days === 0) {
    return locale === 'tr' ? 'Bugün' : 'Today';
  }
  if (days === 1) {
    return locale === 'tr' ? 'Dün' : 'Yesterday';
  }
  if (days >= 2 && days < 7) {
    return locale === 'tr' ? `${days} gün önce` : `${days} days ago`;
  }
  // 7+ gün önce veya gelecek tarih → kısa absolute (aynı yılsa yıl gizli)
  const sameYear = target.getFullYear() === today.getFullYear();
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(target);
}

/** Ay başlığı "Mayıs 2026" / "May 2026" (Tüm İşlemler ekranı ay gruplaması). */
export function formatMonthYear(monthKey: string, locale: Locale = 'tr'): string {
  // monthKey 'YYYY-MM' veya 'YYYY-MM-DD' — fromISODate eksik günü 1 sayar.
  return new Intl.DateTimeFormat(intlLocale(locale), {
    month: 'long',
    year: 'numeric',
  }).format(fromISODate(monthKey));
}

/** Tam tarih "12 Ekim 2025" / "October 12, 2025". */
export function formatAbsoluteDate(date: string, locale: Locale = 'tr'): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

/** JS Date → 'YYYY-MM-DD' (yerel saat). DB `date` kolonu için. */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 'YYYY-MM-DD' → Date (yerel gece yarısı). DateTimePicker için. */
export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}
