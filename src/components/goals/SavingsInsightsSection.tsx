import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { InsightCard } from '@/components/insights/InsightCard';
import { Text } from '@/components/ui/Text';
import { useGoalInsights } from '@/hooks/useInsights';
import { spacing } from '@/theme/tokens';

/**
 * Birikim Önerileri bölümü (Part 14 ek). Yalnızca hedef/birikim ilişkili deterministik insight'lar.
 * Hiç insight yoksa bölüm hiç render edilmez (boş başlık gösterilmez).
 */
export function SavingsInsightsSection() {
  const { t } = useTranslation();
  const { insights } = useGoalInsights();

  if (insights.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text variant="headlineSm">{t('goals.savingsInsights.title')}</Text>
      <View style={styles.list}>
        {insights.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </View>
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
});
