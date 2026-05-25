import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { InsightCard } from '@/components/insights/InsightCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { useInsights } from '@/hooks/useInsights';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/**
 * Strategic Insights bölümü (Part 9). Tasarım advanced_analytics: başlık + insight kartları.
 * Boşken küçük empty state. Insight'lar useInsights ile on-demand compute (auto-dismiss).
 */
export function InsightsList() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { insights } = useInsights();

  return (
    <View style={styles.section}>
      <Text variant="headlineSm">{t('insights.strategicInsights')}</Text>

      {insights.length === 0 ? (
        <GlassCard>
          <View style={styles.empty}>
            <Icon name="check" size={22} color={colors.secondary} strokeWidth={2} />
            <Text variant="bodyMd" color="onSurfaceVariant">
              {t('insights.empty')}
            </Text>
          </View>
        </GlassCard>
      ) : (
        <View style={styles.list}>
          {insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.stackSm,
  },
  list: {
    gap: spacing.md,
  },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
});
