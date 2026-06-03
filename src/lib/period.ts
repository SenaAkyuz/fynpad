import { formatAbsoluteDate, formatMonthYear, fromISODate, toISODate } from '@/lib/format';
import type { Locale } from '@/types';
import type { PeriodFilter, PeriodRange, PeriodType } from '@/types/period';

const intlLocale = (locale: Locale): string => (locale === 'tr' ? 'tr-TR' : 'en-US');

const MS_DAY = 86_400_000;

/** 'YYYY-MM-DD' iki tarih arası kapsayıcı gün sayısı (from..to dahil). */
function inclusiveDayCount(from: string, to: string): number {
  return Math.round((fromISODate(to).getTime() - fromISODate(from).getTime()) / MS_DAY) + 1;
}

function shiftDays(iso: string, days: number): string {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/**
 * Seçili dönemin kapsayıcı tarih aralığı ('YYYY-MM-DD'). Takvim sınırlarına oturur:
 *   day   → tek gün
 *   month → ayın ilk–son günü
 *   year  → 1 Ocak – 31 Aralık
 *   custom→ normalize edilmiş start–end
 */
export function getPeriodRange(filter: PeriodFilter): PeriodRange {
  switch (filter.type) {
    case 'day':
      return { from: filter.anchorDate, to: filter.anchorDate };
    case 'month': {
      const d = fromISODate(filter.anchorDate);
      return {
        from: toISODate(new Date(d.getFullYear(), d.getMonth(), 1)),
        to: toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
      };
    }
    case 'year': {
      const d = fromISODate(filter.anchorDate);
      return {
        from: toISODate(new Date(d.getFullYear(), 0, 1)),
        to: toISODate(new Date(d.getFullYear(), 11, 31)),
      };
    }
    case 'custom':
      return filter.start <= filter.end
        ? { from: filter.start, to: filter.end }
        : { from: filter.end, to: filter.start };
  }
}

/** Avg daily spend gibi metrikler için dönemdeki gün sayısı (en az 1). */
export function periodDayCount(filter: PeriodFilter): number {
  const { from, to } = getPeriodRange(filter);
  return Math.max(1, inclusiveDayCount(from, to));
}

export function getPreviousPeriod(filter: PeriodFilter): PeriodFilter {
  switch (filter.type) {
    case 'day':
      return { type: 'day', anchorDate: shiftDays(filter.anchorDate, -1) };
    case 'month': {
      const d = fromISODate(filter.anchorDate);
      return { type: 'month', anchorDate: toISODate(new Date(d.getFullYear(), d.getMonth() - 1, 1)) };
    }
    case 'year': {
      const d = fromISODate(filter.anchorDate);
      return { type: 'year', anchorDate: toISODate(new Date(d.getFullYear() - 1, 0, 1)) };
    }
    case 'custom': {
      const { from, to } = getPeriodRange(filter);
      const len = inclusiveDayCount(from, to);
      return { type: 'custom', start: shiftDays(from, -len), end: shiftDays(to, -len) };
    }
  }
}

export function getNextPeriod(filter: PeriodFilter): PeriodFilter {
  switch (filter.type) {
    case 'day':
      return { type: 'day', anchorDate: shiftDays(filter.anchorDate, 1) };
    case 'month': {
      const d = fromISODate(filter.anchorDate);
      return { type: 'month', anchorDate: toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 1)) };
    }
    case 'year': {
      const d = fromISODate(filter.anchorDate);
      return { type: 'year', anchorDate: toISODate(new Date(d.getFullYear() + 1, 0, 1)) };
    }
    case 'custom': {
      const { from, to } = getPeriodRange(filter);
      const len = inclusiveDayCount(from, to);
      return { type: 'custom', start: shiftDays(from, len), end: shiftDays(to, len) };
    }
  }
}

/** Filtre içinde bulunulan takvim dönemini mi gösteriyor? (custom her zaman false.) */
export function isCurrentPeriod(filter: PeriodFilter, today: Date = new Date()): boolean {
  switch (filter.type) {
    case 'day':
      return filter.anchorDate === toISODate(today);
    case 'month': {
      const d = fromISODate(filter.anchorDate);
      return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
    }
    case 'year':
      return fromISODate(filter.anchorDate).getFullYear() === today.getFullYear();
    case 'custom':
      return false;
  }
}

function formatRangeLabel(from: string, to: string, locale: Locale): string {
  const start = fromISODate(from);
  const end = fromISODate(to);
  const sameYear = start.getFullYear() === end.getFullYear();
  const startFmt = new Intl.DateTimeFormat(intlLocale(locale), {
    day: 'numeric',
    month: 'long',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  const endFmt = new Intl.DateTimeFormat(intlLocale(locale), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return `${startFmt.format(start)} – ${endFmt.format(end)}`;
}

/** Dönem etiketi: "3 Haziran 2026" · "Haziran 2026" · "2026" · "15 Mayıs – 10 Haziran 2026". */
export function formatPeriodLabel(filter: PeriodFilter, locale: Locale): string {
  switch (filter.type) {
    case 'day':
      return formatAbsoluteDate(filter.anchorDate, locale);
    case 'month':
      return formatMonthYear(filter.anchorDate, locale);
    case 'year':
      return String(fromISODate(filter.anchorDate).getFullYear());
    case 'custom': {
      const { from, to } = getPeriodRange(filter);
      return formatRangeLabel(from, to, locale);
    }
  }
}

/** İçinde bulunulan takvim dönemi (day/month/year anchor'ları başa normalize edilir). */
export function getTodayPeriod(
  type: Exclude<PeriodType, 'custom'>,
  today: Date = new Date()
): PeriodFilter {
  switch (type) {
    case 'day':
      return { type: 'day', anchorDate: toISODate(today) };
    case 'month':
      return { type: 'month', anchorDate: toISODate(new Date(today.getFullYear(), today.getMonth(), 1)) };
    case 'year':
      return { type: 'year', anchorDate: toISODate(new Date(today.getFullYear(), 0, 1)) };
  }
}

/** Custom aralık üret; ters seçimde start/end otomatik takas edilir. */
export function makeCustomPeriod(start: string, end: string): PeriodFilter {
  return start <= end
    ? { type: 'custom', start, end }
    : { type: 'custom', start: end, end: start };
}
