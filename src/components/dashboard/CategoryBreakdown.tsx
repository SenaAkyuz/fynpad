import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { DonutChart } from '@/components/ui/DonutChart';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { formatCompactCurrency, formatCurrency } from '@/lib/format';
import type { BreakdownSegment } from '@/lib/transactions';
import { spacing } from '@/theme/tokens';
import type { Currency, Locale } from '@/types';

export type CategoryBreakdownProps = {
  segments: BreakdownSegment[];
  total: number;
  currency: Currency;
  locale: Locale;
};

const DONUT_SIZE = 184;
const DONUT_STROKE = 18;

/** Harcama dağılımı kartı: donut (expense) + legend (dot + isim + tutar). */
export function CategoryBreakdown({ segments, total, currency, locale }: CategoryBreakdownProps) {
  const { t } = useTranslation();

  return (
    <GlassCard>
      <Text variant="headlineSm" style={styles.title}>
        {t('dashboard.spendingBreakdown')}
      </Text>

      {total > 0 ? (
        <View style={styles.body}>
          <View style={styles.donutWrap}>
            <DonutChart
              segments={segments.map((s) => ({ value: s.total, color: s.color, label: s.name }))}
              size={DONUT_SIZE}
              strokeWidth={DONUT_STROKE}
              centerSubLabel={t('dashboard.total')}
              centerLabel={formatCompactCurrency(total, currency, locale)}
            />
          </View>

          <View style={styles.legend}>
            {segments.map((s) => (
              <View key={s.categoryId} style={styles.legendRow}>
                <View style={styles.legendLeft}>
                  <View style={[styles.dot, { backgroundColor: s.color }]} />
                  <Text variant="bodyMd">{t(s.name)}</Text>
                </View>
                <Text variant="labelMd">{formatCurrency(s.total, currency, locale)}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <Text variant="bodyMd" color="onSurfaceVariant" style={styles.empty}>
          {t('dashboard.emptyChart')}
        </Text>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: spacing.xl,
  },
  body: {
    alignItems: 'center',
    gap: spacing.stackMd,
  },
  donutWrap: {
    alignItems: 'center',
  },
  legend: {
    width: '100%',
    gap: spacing.lg,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
});
