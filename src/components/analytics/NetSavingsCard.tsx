import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { formatCurrency } from '@/lib/format';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { Currency, Locale } from '@/types';

export type NetSavingsCardProps = {
  value: number;
  currency: Currency;
  locale: Locale;
  /** birikim oranı (net/gelir, 0..1); pozitif birikimde tasarımdaki ilerleme çubuğu için */
  savingsRate?: number | null;
};

/**
 * Net birikim kartı (brief 4.5). Tasarım advanced_analytics: glass kart, büyük değer + altında
 * ince ilerleme çubuğu. Pozitif → secondary (Emerald), negatif → tertiary (Coral).
 */
export function NetSavingsCard({ value, currency, locale, savingsRate }: NetSavingsCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const positive = value >= 0;
  const barPct = savingsRate != null ? Math.min(Math.max(savingsRate * 100, 0), 100) : null;

  return (
    <GlassCard>
      <Text variant="labelMd" color="onSurfaceVariant" style={styles.label}>
        {t('analytics.netSavings')}
      </Text>
      <Text variant="headlineLg" style={{ color: positive ? colors.secondary : colors.tertiary }}>
        {formatCurrency(value, currency, locale)}
      </Text>
      {barPct != null ? (
        <View style={[styles.track, { backgroundColor: colors.surfaceContainerHighest }]}>
          <View style={[styles.fill, { width: `${barPct}%`, backgroundColor: colors.secondary }]} />
        </View>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  label: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  track: {
    height: 8,
    borderRadius: radii.full,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  fill: {
    height: '100%',
    borderRadius: radii.full,
  },
});
