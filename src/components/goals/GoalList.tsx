import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { GoalCard } from '@/components/goals/GoalCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { Text } from '@/components/ui/Text';
import { useGoals } from '@/hooks/useGoals';
import { computeGoalProgress } from '@/lib/goals';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { Goal } from '@/types';
import { useAppStore } from '@/stores/useAppStore';

export type GoalListProps = {
  onItemPress: (goal: Goal) => void;
  onAddPress: () => void;
};

/** useGoals → kartlar. Boşken design empty state; doluyken kartlar + sonda "Yeni Hedef" CTA. */
export function GoalList({ onItemPress, onAddPress }: GoalListProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const locale = useAppStore((s) => s.locale);

  const { data: goals = [], isLoading } = useGoals();
  const today = useMemo(() => new Date(), []);

  if (isLoading && goals.length === 0) {
    return (
      <View style={styles.loading}>
        <Spinner />
      </View>
    );
  }

  if (goals.length === 0) {
    return (
      <Pressable accessibilityRole="button" onPress={onAddPress}>
        <GlassCard style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceContainerHigh }]}>
            <Icon name="target" size={28} color={colors.primary} strokeWidth={2} />
          </View>
          <Text variant="headlineSm" style={styles.center}>
            {t('goals.empty')}
          </Text>
          <Text variant="bodyMd" color="onSurfaceVariant" style={styles.center}>
            {t('goals.emptyHint')}
          </Text>
        </GlassCard>
      </Pressable>
    );
  }

  return (
    <View style={styles.list}>
      {goals.map((goal) => (
        <GoalCard
          key={goal.id}
          progress={computeGoalProgress(goal, today)}
          locale={locale}
          onPress={() => onItemPress(goal)}
        />
      ))}

      {/* Design: dashed "New Goal" kartı (özet grid'inde). Mobilde liste sonunda CTA. */}
      <Pressable accessibilityRole="button" onPress={onAddPress}>
        <View style={[styles.addCard, { borderColor: colors.outlineVariant }]}>
          <Icon name="plus" size={20} color={colors.primary} strokeWidth={2.5} />
          <Text variant="labelMd" color="primary">
            {t('goals.addGoal')}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    paddingVertical: spacing.stackLg,
    alignItems: 'center',
  },
  list: {
    gap: spacing.md,
  },
  center: {
    textAlign: 'center',
  },
  empty: {
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    borderRadius: radii.xl,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
});
