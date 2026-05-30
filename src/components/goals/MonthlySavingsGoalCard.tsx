import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { useGoals } from '@/hooks/useGoals';
import { useTransactions } from '@/hooks/useTransactions';
import {
  compareMonthlySavings,
  computeMonthlyNetSavings,
  computeMonthlySavingsRequired,
  type MonthlySavingsComparison,
} from '@/lib/analytics';
import { formatCurrency } from '@/lib/format';
import { useAppStore } from '@/stores/useAppStore';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/**
 * Aylık Birikim Hedefi kartı (Part 14, tasarım revizyonu). OTOMATIK hesap — kullanıcı set etmez,
 * tıklanamaz (info-only). Gereken aylık birikim, son tarihli hedeflerin `monthlyNeeded` toplamından
 * gelir; bu ayki gerçek net birikimle kıyaslanır. Son tarihli hedef yoksa kart görünmez.
 * Kur dönüşümü YOK — her para birimi ayrı.
 */
export function MonthlySavingsGoalCard() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const locale = useAppStore((s) => s.locale);
  const { data: goals = [] } = useGoals();
  const { data: transactions = [] } = useTransactions();

  const required = computeMonthlySavingsRequired(goals);
  if (!required.hasAnyDeadline) return null;

  const actual = computeMonthlyNetSavings(transactions);
  const comparisons = compareMonthlySavings(required, actual);
  if (comparisons.length === 0) return null;

  const statusColor = (status: MonthlySavingsComparison['status']) =>
    status === 'behind' ? colors.tertiary : colors.secondary;

  const label = (
    <Text variant="labelSm" color="primary" style={styles.label}>
      {t('goals.monthlySavings.label')}
    </Text>
  );

  // Tek para birimi → tasarımdaki gibi tek büyük değer + durum satırı.
  if (comparisons.length === 1) {
    const c = comparisons[0];
    const sign = c.percent >= 100 ? '+' : '-';
    const diff = Math.abs(c.percent - 100).toFixed(1);

    return (
      <GlassCard style={styles.card}>
        {label}
        <Text variant="headlineMd" color="primary">
          {formatCurrency(c.required, c.currency, locale)}
        </Text>
        <Text variant="labelMd" style={{ color: statusColor(c.status) }}>
          {t(`goals.monthlySavings.status.${c.status}`)} ({sign}
          {diff}%)
        </Text>
      </GlassCard>
    );
  }

  // Çoklu para birimi → her biri ayrı satır (toplama/dönüşüm yok).
  return (
    <GlassCard style={styles.card}>
      {label}
      {comparisons.map((c) => (
        <View key={c.currency} style={styles.currencyRow}>
          <View style={styles.currencyHead}>
            <Text variant="labelMd">{formatCurrency(c.required, c.currency, locale)}</Text>
            <Text variant="labelSm" style={{ color: statusColor(c.status) }}>
              {Math.round(c.percent)}%
            </Text>
          </View>
          <Text variant="labelSm" color="onSurfaceVariant">
            {t('goals.monthlySavings.thisMonth', {
              actual: formatCurrency(c.actual, c.currency, locale),
            })}
          </Text>
        </View>
      ))}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.xs,
  },
  label: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  currencyRow: {
    gap: 2,
    marginTop: spacing.sm,
  },
  currencyHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
});
