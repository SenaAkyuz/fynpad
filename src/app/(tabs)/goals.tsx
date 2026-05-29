import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { GoalList } from '@/components/goals/GoalList';
import { MonthlySavingsGoalCard } from '@/components/goals/MonthlySavingsGoalCard';
import { SavingsInsightsSection } from '@/components/goals/SavingsInsightsSection';
import { TotalGoalProgressCard } from '@/components/goals/TotalGoalProgressCard';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { Goal } from '@/types';

/**
 * Finansal Hedefler (Part 14, brief v1.2 #13 + ek). Üstte Toplam İlerleme + Aylık Birikim kartları,
 * altında birikim önerileri ve hedef listesi. Ekleme header'daki "+" veya liste CTA ile → goal-edit.
 */
export default function GoalsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();

  const openCreate = () => router.push('/goal-edit');
  const openEdit = (goal: Goal) => router.push(`/goal-edit?id=${goal.id}`);

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <Text variant="headlineMd">{t('goals.title')}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('goals.addGoal')}
          hitSlop={8}
          onPress={openCreate}
        >
          <Icon name="plus" size={26} color={colors.primary} strokeWidth={2.5} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="bodyMd" color="onSurfaceVariant">
          {t('goals.subtitle')}
        </Text>

        <View style={styles.cardsRow}>
          <TotalGoalProgressCard />
          <MonthlySavingsGoalCard />
        </View>

        <SavingsInsightsSection />

        <GoalList onItemPress={openEdit} onAddPress={openCreate} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.containerMargin,
    paddingVertical: spacing.md,
  },
  content: {
    paddingHorizontal: spacing.containerMargin,
    paddingTop: spacing.sm,
    // Floating bottom nav clearance (dashboard/settings ile tutarlı).
    paddingBottom: 120,
    gap: spacing.stackMd,
  },
  cardsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.md,
  },
});
