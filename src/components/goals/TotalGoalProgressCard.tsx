import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { useGoals } from '@/hooks/useGoals';
import { formatCurrency } from '@/lib/format';
import { computeTotalGoalProgress, type CurrencyTotal } from '@/lib/goals';
import { useAppStore } from '@/stores/useAppStore';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/**
 * Toplam Hedef İlerleme kartı (Part 14 ek). Tek para birimi → büyük hedef tutarı + biriken + bar.
 * Çoklu para birimi → her biri ayrı satır (kur dönüşümü yok, toplama yapılmaz).
 */
export function TotalGoalProgressCard() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const locale = useAppStore((s) => s.locale);
  const { data: goals = [] } = useGoals();

  const progress = computeTotalGoalProgress(goals);

  if (progress.totalGoals === 0) {
    return (
      <GlassCard style={styles.card}>
        <Text variant="labelSm" color="onSurfaceVariant" style={styles.label}>
          {t('goals.totalProgress.label')}
        </Text>
        <Text variant="bodyMd" color="onSurfaceVariant">
          {t('goals.empty')}
        </Text>
      </GlassCard>
    );
  }

  const renderBar = (percent: number, height: number) => (
    <View style={[styles.track, { height, backgroundColor: colors.surfaceContainerHighest }]}>
      <View
        style={[
          styles.fill,
          { width: `${Math.min(percent, 100)}%`, backgroundColor: colors.primary },
        ]}
      />
    </View>
  );

  if (progress.isSingleCurrency) {
    const c = progress.byCurrency[0];
    return (
      <GlassCard style={styles.card}>
        <Text variant="labelSm" color="onSurfaceVariant" style={styles.label}>
          {t('goals.totalProgress.label')}
        </Text>
        <Text variant="headlineMd">{formatCurrency(c.targetAmount, c.currency, locale)}</Text>
        <Text variant="labelSm" color="onSurfaceVariant">
          {t('goals.totalProgress.savedOf', {
            current: formatCurrency(c.currentAmount, c.currency, locale),
          })}
        </Text>
        {renderBar(c.percent, 8)}
        <Text variant="labelMd" color="primary">
          {Math.round(c.percent)}%
        </Text>
      </GlassCard>
    );
  }

  return (
    <GlassCard style={styles.card}>
      <Text variant="labelSm" color="onSurfaceVariant" style={styles.label}>
        {t('goals.totalProgress.label')}
      </Text>
      {progress.byCurrency.map((c: CurrencyTotal) => (
        <View key={c.currency} style={styles.currencyRow}>
          <View style={styles.currencyHead}>
            <Text variant="labelMd">{c.currency}</Text>
            <Text variant="labelSm" color="primary">
              {Math.round(c.percent)}%
            </Text>
          </View>
          <Text variant="labelSm" color="onSurfaceVariant">
            {formatCurrency(c.currentAmount, c.currency, locale)} /{' '}
            {formatCurrency(c.targetAmount, c.currency, locale)}
          </Text>
          {renderBar(c.percent, 4)}
        </View>
      ))}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    gap: spacing.xs,
  },
  label: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  track: {
    borderRadius: radii.full,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  fill: {
    height: '100%',
    borderRadius: radii.full,
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
