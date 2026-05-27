import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { GoalList } from '@/components/goals/GoalList';
import { GlassCard } from '@/components/ui/GlassCard';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useGoals } from '@/hooks/useGoals';
import { computeGoalProgress } from '@/lib/goals';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { Goal } from '@/types';

/**
 * Finansal Hedefler (Part 14, brief v1.2 #13). Özet kart (ortalama ilerleme) + hedef listesi.
 * Hedef ekleme header'daki "+" veya liste sonundaki CTA ile → goal-edit modal.
 */
export default function GoalsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();

  const { data: goals = [] } = useGoals();

  const summary = useMemo(() => {
    if (goals.length === 0) return null;
    const progresses = goals.map((g) => computeGoalProgress(g));
    const completed = progresses.filter((p) => p.isCompleted).length;
    // Ortalama ilerleme — para birimi karışımından kaçınmak için yüzdelerin ortalaması (toplam tutar değil).
    const avgPercent = progresses.reduce((sum, p) => sum + p.percent, 0) / progresses.length;
    return { total: goals.length, completed, avgPercent };
  }, [goals]);

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

        {summary ? (
          <GlassCard>
            <Text variant="labelSm" color="onSurfaceVariant" style={styles.summaryLabel}>
              {t('goals.totalProgress')}
            </Text>
            <View style={styles.summaryRow}>
              <Text variant="headlineLg">{Math.round(summary.avgPercent)}%</Text>
              <Text variant="labelMd" color="onSurfaceVariant">
                {t('goals.completedCount', { completed: summary.completed, total: summary.total })}
              </Text>
            </View>
            <View style={[styles.track, { backgroundColor: colors.surfaceContainerHighest }]}>
              <View
                style={[
                  styles.fill,
                  { width: `${Math.min(summary.avgPercent, 100)}%`, backgroundColor: colors.primary },
                ]}
              />
            </View>
          </GlassCard>
        ) : null}

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
  summaryLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  track: {
    height: 8,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.full,
  },
});
