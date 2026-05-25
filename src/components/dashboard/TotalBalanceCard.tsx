import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { formatCurrency } from '@/lib/format';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { Currency, Locale } from '@/types';

export type TotalBalanceCardProps = {
  balance: number;
  currency: Currency;
  locale: Locale;
  /** dönem net değişim yüzdesi (işaretli) */
  trendPercent: number;
  /** "bu ay" / "this month" gibi dönem etiketi */
  trendLabel: string;
};

/**
 * Total Net Worth kartı (design): label + büyük primary rakam + trend chip.
 * Glow shadow (glow-primary).
 */
export function TotalBalanceCard({
  balance,
  currency,
  locale,
  trendPercent,
  trendLabel,
}: TotalBalanceCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const up = trendPercent >= 0;
  const trendColor = up ? colors.secondary : colors.tertiary;
  const pctText = `${up ? '+' : ''}${trendPercent.toFixed(1)}%`;

  return (
    <GlassCard glow>
      <Text variant="labelMd" color="onSurfaceVariant">
        {t('dashboard.totalBalance')}
      </Text>
      <Text variant="headlineXlMobile" color="primary" style={styles.amount}>
        {formatCurrency(balance, currency, locale)}
      </Text>
      <View style={styles.trend}>
        <Icon name={up ? 'trending-up' : 'arrow-down'} size={16} color={trendColor} strokeWidth={2} />
        <Text variant="labelMd" style={{ color: trendColor }}>
          {`${pctText} ${trendLabel}`}
        </Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  amount: {
    marginTop: spacing.sm,
  },
  trend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});
