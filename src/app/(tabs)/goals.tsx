import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { GoalList } from '@/components/goals/GoalList';
import { MonthlySavingsGoalCard } from '@/components/goals/MonthlySavingsGoalCard';
import { NewGoalCTACard } from '@/components/goals/NewGoalCTACard';
import { SavingsInsightsSection } from '@/components/goals/SavingsInsightsSection';
import { TotalGoalProgressCard } from '@/components/goals/TotalGoalProgressCard';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/theme/tokens';
import type { Goal } from '@/types';

/**
 * Finansal Hedefler (Part 14, brief v1.2 #13 + tasarım revizyonu). Tasarıma göre stacked full-width:
 * Toplam Birikim → Aylık Birikim → "Yeni Hedef" CTA kartı → hedef listesi → birikim önerileri.
 * Ekleme dashed CTA kartı (header "+"/FAB yok) ya da boş liste durumundaki kart ile → goal-edit.
 */
export default function GoalsScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const openCreate = () => router.push('/goal-edit');
  const openEdit = (goal: Goal) => router.push(`/goal-edit?id=${goal.id}`);

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <Text variant="headlineMd">{t('goals.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="bodyMd" color="onSurfaceVariant">
          {t('goals.subtitle')}
        </Text>

        <TotalGoalProgressCard />
        <MonthlySavingsGoalCard />
        <NewGoalCTACard onPress={openCreate} />

        <GoalList onItemPress={openEdit} onAddPress={openCreate} />

        <SavingsInsightsSection />
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
});
