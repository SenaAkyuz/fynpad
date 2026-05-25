import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { formatCurrency } from '@/lib/format';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { Currency, Locale } from '@/types';

export type AvgDailySpendCardProps = {
  value: number;
  currency: Currency;
  locale: Locale;
  /** dönem bilgisi alt etiketi (örn. "bu ay") */
  periodLabel: string;
};

/** Ortalama günlük harcama kartı (brief 4.5). Tasarım advanced_analytics: glass kart, değer + dönem. */
export function AvgDailySpendCard({ value, currency, locale, periodLabel }: AvgDailySpendCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <GlassCard>
      <Text variant="labelMd" color="onSurfaceVariant" style={styles.label}>
        {t('analytics.avgDailySpend')}
      </Text>
      <Text variant="headlineLg">{formatCurrency(value, currency, locale)}</Text>
      <View style={styles.sub}>
        <Icon name="trending-down" size={18} color={colors.primary} strokeWidth={2} />
        <Text variant="labelSm" color="onSurfaceVariant">
          {periodLabel}
        </Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  label: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  sub: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
});
