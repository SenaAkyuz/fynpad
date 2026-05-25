import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { formatCurrency } from '@/lib/format';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { BudgetStatus, Category, Locale } from '@/types';

export type BudgetItemProps = {
  status: BudgetStatus;
  category?: Category;
  locale: Locale;
  onPress: () => void;
};

/**
 * Bütçe satırı (brief 4.5). Tasarım advanced_analytics: ikon + ad, spent/total, ilerleme çubuğu
 * (aşılınca tertiary/Coral), aşılınca "Over by $X" rozeti. Tap → düzenleme.
 */
export function BudgetItem({ status, category, locale, onPress }: BudgetItemProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { budget, spent, remaining, percent, isOver, overAmount } = status;

  const name = category ? t(category.name) : t('dashboard.categories.other');
  const fillColor = isOver ? colors.tertiary : colors.primary;

  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <GlassCard>
        <View style={styles.top}>
          <View style={styles.left}>
            <View style={[styles.iconBox, { backgroundColor: colors.surfaceContainerHigh }]}>
              <Icon
                name={(category?.icon as IconName) ?? 'more-horizontal'}
                size={18}
                color={category?.color ?? colors.onSurfaceVariant}
                strokeWidth={2}
              />
            </View>
            <Text variant="labelMd" numberOfLines={1} style={styles.name}>
              {name}
            </Text>
          </View>
          <Text variant="labelMd" color="onSurfaceVariant">
            {t('analytics.budgetItem.spentOf', {
              spent: formatCurrency(spent, budget.currency, locale),
              total: formatCurrency(budget.amount, budget.currency, locale),
            })}
          </Text>
        </View>

        <View style={[styles.track, { backgroundColor: colors.surfaceContainerHighest }]}>
          <View
            style={[styles.fill, { width: `${Math.min(percent, 100)}%`, backgroundColor: fillColor }]}
          />
        </View>

        <View style={styles.footer}>
          {isOver ? (
            <View style={[styles.badge, { backgroundColor: colors.tertiaryContainer }]}>
              <Text variant="labelSm" style={{ color: colors.onTertiaryContainer }}>
                {t('analytics.budgetItem.overBy', {
                  amount: formatCurrency(overAmount, budget.currency, locale),
                })}
              </Text>
            </View>
          ) : (
            <Text variant="labelSm" color="secondary">
              {t('analytics.budgetItem.remaining', {
                amount: formatCurrency(remaining, budget.currency, locale),
              })}
            </Text>
          )}
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    flexShrink: 1,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
});
