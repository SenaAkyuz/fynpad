import type { TFunction } from 'i18next';

import type { RecurringRule } from '@/types';

const LAST_DAY = 31;

/**
 * Kuralın insan-okur özetini döner ("Her ayın 1'i" / "Day 1 every month").
 * 31 (= ayın son günü) için ayrı i18n metni kullanılır.
 */
export function describeRecurrence(
  rule: Pick<RecurringRule, 'frequency' | 'dayOfWeek' | 'dayOfMonth' | 'monthOfYear'>,
  t: TFunction
): string {
  switch (rule.frequency) {
    case 'daily':
      return t('recurring.summaryDaily');
    case 'weekly':
      return t('recurring.summaryWeekly', {
        weekday: t(`recurring.weekdays.${rule.dayOfWeek ?? 0}`),
      });
    case 'monthly':
      return rule.dayOfMonth === LAST_DAY
        ? t('recurring.summaryMonthlyLast')
        : t('recurring.summaryMonthly', { day: rule.dayOfMonth });
    case 'yearly':
      return t('recurring.summaryYearly', {
        day: rule.dayOfMonth === LAST_DAY ? t('recurring.lastDayOfMonth') : rule.dayOfMonth,
        month: t(`recurring.months.${rule.monthOfYear ?? 1}`),
      });
    default:
      return '';
  }
}
