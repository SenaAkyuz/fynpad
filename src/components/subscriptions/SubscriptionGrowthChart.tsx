import { StyleSheet, View } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { radii, shadows, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { Locale } from '@/types';

export type SubscriptionGrowthChartProps = {
  data: { month: string; total: number }[];
  locale: Locale;
};

const CHART_HEIGHT = 150;

function monthLabel(monthStr: string, locale: Locale): string {
  const [y, m] = monthStr.split('-').map(Number);
  const d = new Date(y, (m ?? 1) - 1, 1);
  return new Intl.DateTimeFormat(locale === 'tr' ? 'tr-TR' : 'en-US', { month: 'short' }).format(d);
}

/**
 * Abonelik büyüme grafiği (design subscription_manager: bar chart). Son N ay; güncel ay
 * (en sağdaki) primary + glow ile vurgulu, diğerleri düşük opasiteli primary. (Part 7 clarification.)
 */
export function SubscriptionGrowthChart({ data, locale }: SubscriptionGrowthChartProps) {
  const { colors } = useTheme();
  const max = Math.max(...data.map((d) => d.total), 0);

  return (
    <View style={styles.wrap}>
      <GlassCard>
        <View style={styles.bars}>
          {data.map((d, i) => {
            const isCurrent = i === data.length - 1;
            const pct = max > 0 ? d.total / max : 0;
            const height = Math.max(pct * 100, 4);
            return (
              <View key={d.month} style={styles.barSlot}>
                <View
                  style={[
                    styles.bar,
                    { height: `${height}%`, backgroundColor: colors.primary, opacity: isCurrent ? 1 : 0.15 },
                    isCurrent && { ...shadows.primaryGlow, shadowColor: colors.primary },
                  ]}
                />
              </View>
            );
          })}
        </View>
      </GlassCard>

      <View style={styles.labels}>
        {data.map((d, i) => {
          const isCurrent = i === data.length - 1;
          return (
            <View key={d.month} style={styles.labelSlot}>
              <Text variant="labelSm" color={isCurrent ? 'primary' : 'onSurfaceVariant'}>
                {monthLabel(d.month, locale)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.base,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: CHART_HEIGHT,
    gap: spacing.sm,
  },
  barSlot: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '70%',
    borderTopLeftRadius: radii.DEFAULT,
    borderTopRightRadius: radii.DEFAULT,
  },
  labels: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  labelSlot: {
    flex: 1,
    alignItems: 'center',
  },
});
