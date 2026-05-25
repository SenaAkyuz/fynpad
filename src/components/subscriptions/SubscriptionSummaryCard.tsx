import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { Text, type TextColor } from '@/components/ui/Text';
import { formatCurrency, formatRelativeFuture } from '@/lib/format';
import { spacing } from '@/theme/tokens';
import type { Currency, Locale, Subscription } from '@/types';

export type SubscriptionSummaryCardProps = {
  totalMonthly: number;
  momPct: number | null;
  count: number;
  nextDue: { subscription: Subscription; date: string } | null;
  currency: Currency;
  locale: Locale;
};

/**
 * Üst özet kart (design subscription_manager: 4 bilgi). Üst satır: aylık toplam + trend chip;
 * alt satır: aktif abonelik sayısı + sıradaki yenilenme. (Part 7 clarification: design kazandı.)
 */
export function SubscriptionSummaryCard({
  totalMonthly,
  momPct,
  count,
  nextDue,
  currency,
  locale,
}: SubscriptionSummaryCardProps) {
  const { t } = useTranslation();

  const fmtPct = (v: number) => {
    const s = Math.abs(v).toFixed(1);
    return locale === 'tr' ? s.replace('.', ',') : s;
  };

  let trendText: string;
  let trendColor: TextColor;
  if (momPct == null) {
    trendText = t('subscriptions.trend.new');
    trendColor = 'onSurfaceVariant';
  } else if (Math.abs(momPct) < 0.05) {
    trendText = t('subscriptions.trend.flat');
    trendColor = 'onSurfaceVariant';
  } else if (momPct > 0) {
    trendText = t('subscriptions.trend.up', { pct: fmtPct(momPct), vs: t('subscriptions.trend.vsLastMonth') });
    trendColor = 'secondary';
  } else {
    trendText = t('subscriptions.trend.down', { pct: fmtPct(momPct), vs: t('subscriptions.trend.vsLastMonth') });
    trendColor = 'tertiary';
  }

  const nextDueValue = nextDue
    ? t('subscriptions.nextDueValue', {
        name: nextDue.subscription.serviceName,
        relative: formatRelativeFuture(nextDue.date, locale),
      })
    : t('subscriptions.noUpcoming');

  return (
    <GlassCard glow>
      <Text variant="labelMd" color="onSurfaceVariant" style={styles.label}>
        {t('subscriptions.totalMonthly')}
      </Text>

      <View style={styles.amountRow}>
        <Text variant="headlineXlMobile" color="primary">
          {formatCurrency(totalMonthly, currency, locale)}
        </Text>
        <Text variant="labelMd" color={trendColor} style={styles.trend}>
          {trendText}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text variant="labelSm" color="onSurfaceVariant">
            {t('subscriptions.activeSubs')}
          </Text>
          <Text variant="headlineSm">{count}</Text>
        </View>
        <View style={styles.stat}>
          <Text variant="labelSm" color="onSurfaceVariant">
            {t('subscriptions.nextDueLabel')}
          </Text>
          <Text variant="labelMd" numberOfLines={1}>
            {nextDueValue}
          </Text>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  label: {
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: spacing.base,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: spacing.base,
  },
  trend: {
    flexShrink: 1,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: spacing.stackMd,
    gap: spacing.stackMd,
  },
  stat: {
    flex: 1,
    gap: spacing.xs,
  },
});
