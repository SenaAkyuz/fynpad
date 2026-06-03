import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { GoalIcon } from '@/components/goals/GoalIconPicker';
import { GlassCard } from '@/components/ui/GlassCard';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { formatAbsoluteDate, formatCurrency } from '@/lib/format';
import { computeProgressColorTier } from '@/lib/goals';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { GoalProgress, Locale } from '@/types';

export type GoalCardProps = {
  progress: GoalProgress;
  locale: Locale;
  onPress: () => void;
};

/**
 * Hedef kartı (Part 14, design financial_goals_*.html). Sol ikon + tarih, başlık, ilerleme çubuğu
 * (primary; urgent=Coral; tamamlandı=Emerald + tick) ve meta ("30 gün kaldı · Aylık 1.500 ₺ biriktir").
 */
export function GoalCard({ progress, locale, onPress }: GoalCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { goal, percent, isCompleted, isUrgent, daysUntilDeadline, monthlyNeeded } = progress;

  // Pace-based renk: geride (tempo gerisinde) ya da urgent → Coral; tamamlandı → Emerald; aksi → primary.
  const tier = computeProgressColorTier(goal);
  const accent = isCompleted
    ? colors.secondary
    : isUrgent || tier === 'behind'
      ? colors.tertiary
      : tier === 'ahead'
        ? colors.secondary
        : colors.primary;

  // Son tarih meta metni: gelecek → "N gün kaldı", geçmiş → "N gün geçti".
  let deadlineText: string | null = null;
  if (daysUntilDeadline !== null && !isCompleted) {
    deadlineText =
      daysUntilDeadline >= 0
        ? t('goals.daysLeft', { count: daysUntilDeadline })
        : t('goals.daysOverdue', { count: Math.abs(daysUntilDeadline) });
  }

  const monthlyText =
    monthlyNeeded != null
      ? t('goals.monthlyNeeded', { amount: formatCurrency(monthlyNeeded, goal.currency, locale) })
      : null;

  // Manuel birikim UX: hedefe ne kadar kaldığını net göster (mental disconnect'i azaltır).
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <GlassCard glow={isUrgent}>
        <View style={styles.top}>
          <GoalIcon iconKey={goal.iconKey} size={48} />
          {goal.targetDate ? (
            <View style={styles.dateBlock}>
              <Text variant="labelSm" color="onSurfaceVariant">
                {t('goals.targetDateShort')}
              </Text>
              <Text variant="labelMd">{formatAbsoluteDate(goal.targetDate, locale)}</Text>
            </View>
          ) : (
            <Text variant="labelSm" color="onSurfaceVariant">
              {t('goals.noDeadline')}
            </Text>
          )}
        </View>

        <Text variant="headlineSm" numberOfLines={1} style={goal.description ? undefined : styles.name}>
          {goal.name}
        </Text>
        {goal.description ? (
          <Text variant="labelSm" color="onSurfaceVariant" numberOfLines={1} style={styles.description}>
            {goal.description}
          </Text>
        ) : null}

        <View style={styles.amountRow}>
          <Text variant="labelMd" color="onSurfaceVariant" numberOfLines={1} style={styles.flex}>
            {t('goals.savedAmount', {
              amount: formatCurrency(goal.currentAmount, goal.currency, locale),
            })}
          </Text>
          <Text variant="labelMd" style={{ color: accent }}>
            {Math.round(percent)}%
          </Text>
        </View>

        <View style={[styles.track, { backgroundColor: colors.surfaceContainerHighest }]}>
          <View style={[styles.fill, { width: `${Math.min(percent, 100)}%`, backgroundColor: accent }]} />
        </View>

        {!isCompleted && remaining > 0 ? (
          <Text variant="labelSm" color="onSurfaceVariant" style={styles.remaining}>
            {t('goals.remaining', { amount: formatCurrency(remaining, goal.currency, locale) })}
          </Text>
        ) : null}

        <View style={styles.footer}>
          {isCompleted ? (
            <View style={styles.completed}>
              <Icon name="check" size={16} color={colors.secondary} strokeWidth={2.5} />
              <Text variant="labelSm" color="secondary">
                {t('goals.completed')}
              </Text>
            </View>
          ) : (
            <View style={styles.metaRow}>
              {deadlineText ? (
                <View style={styles.metaItem}>
                  <Icon
                    name="calendar"
                    size={14}
                    color={isUrgent ? colors.tertiary : colors.onSurfaceVariant}
                    strokeWidth={2}
                  />
                  <Text variant="labelSm" color={isUrgent ? 'tertiary' : 'onSurfaceVariant'}>
                    {deadlineText}
                  </Text>
                </View>
              ) : null}
              {monthlyText ? (
                <Text variant="labelSm" color="onSurfaceVariant" numberOfLines={1} style={styles.flex}>
                  {monthlyText}
                </Text>
              ) : null}
            </View>
          )}
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  dateBlock: {
    alignItems: 'flex-end',
    gap: 2,
  },
  name: {
    marginBottom: spacing.md,
  },
  description: {
    marginTop: 2,
    marginBottom: spacing.md,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  track: {
    height: 10,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.full,
  },
  remaining: {
    marginTop: spacing.sm,
  },
  footer: {
    marginTop: spacing.md,
  },
  completed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
