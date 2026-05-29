import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { useProfile } from '@/hooks/useProfile';
import { useTransactions } from '@/hooks/useTransactions';
import { computeMonthlySavingsProgress, type MonthlySavingsProgress } from '@/lib/analytics';
import { formatCurrency } from '@/lib/format';
import { useAppStore } from '@/stores/useAppStore';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/**
 * Aylık Birikim Hedefi kartı (Part 14 ek). Hedef yoksa kurulum CTA'sı; varsa hedef tutar + bu ayki
 * gerçek net birikim + durum. Hedef ile harcama farklı para birimindeyse kıyas yapılmaz, uyarı gösterilir.
 */
export function MonthlySavingsGoalCard() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const locale = useAppStore((s) => s.locale);
  const { data: profile } = useProfile();
  const { data: transactions = [] } = useTransactions();

  if (!profile) return null;

  const progress = computeMonthlySavingsProgress(transactions, profile);
  const open = () => router.push('/monthly-savings-target');

  const label = (
    <Text variant="labelSm" color="primary" style={styles.label}>
      {t('goals.monthlySavings.label')}
    </Text>
  );

  // Hedef yok → kurulum CTA
  if (!progress.hasTarget) {
    return (
      <Pressable style={styles.flex} accessibilityRole="button" onPress={open}>
        <GlassCard style={styles.card}>
          {label}
          <View style={styles.ctaRow}>
            <Icon name="plus" size={18} color={colors.primary} strokeWidth={2.5} />
            <Text variant="labelMd" color="primary" style={styles.flex}>
              {t('goals.monthlySavings.notSetCta')}
            </Text>
          </View>
        </GlassCard>
      </Pressable>
    );
  }

  const statusColor: Record<MonthlySavingsProgress['status'], string> = {
    over: colors.secondary,
    'on-track': colors.secondary,
    close: colors.primary,
    behind: colors.tertiary,
    mismatch: colors.onSurfaceVariant,
    'no-target': colors.onSurfaceVariant,
  };

  return (
    <Pressable style={styles.flex} accessibilityRole="button" onPress={open}>
      <GlassCard style={styles.card}>
        {label}
        <Text variant="headlineMd" color="primary">
          {formatCurrency(progress.target!, progress.targetCurrency!, locale)}
        </Text>

        {progress.comparable ? (
          <>
            <Text variant="labelSm" color="onSurfaceVariant">
              {t('goals.monthlySavings.thisMonth', {
                actual: formatCurrency(progress.actual, progress.actualCurrency, locale),
              })}
            </Text>
            <Text variant="labelMd" style={{ color: statusColor[progress.status] }}>
              {t(`goals.monthlySavings.status.${progress.status}`)} ({Math.round(progress.percent!)}%)
            </Text>
          </>
        ) : (
          <View style={styles.warningRow}>
            <Icon name="alert-triangle" size={14} color={colors.onSurfaceVariant} strokeWidth={2} />
            <Text variant="labelSm" color="onSurfaceVariant" style={styles.flex}>
              {t('goals.monthlySavings.currencyMismatch')}
            </Text>
          </View>
        )}
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: {
    flex: 1,
    gap: spacing.xs,
  },
  label: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
});
