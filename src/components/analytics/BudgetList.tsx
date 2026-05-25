import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { BudgetItem } from '@/components/analytics/BudgetItem';
import { GlassCard } from '@/components/ui/GlassCard';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { BudgetStatus, Category, Locale } from '@/types';

export type BudgetListProps = {
  budgets: BudgetStatus[];
  categories: Category[];
  locale: Locale;
  onAddPress: () => void;
  onItemPress: (status: BudgetStatus) => void;
};

/**
 * Aylık bütçeler bölümü (brief 4.5). Başlık + "+" ekle (header-action, subscriptions ile aynı
 * pattern). Boşken friendly empty state. Her satır BudgetItem.
 */
export function BudgetList({ budgets, categories, locale, onAddPress, onItemPress }: BudgetListProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const byId = new Map(categories.map((c) => [c.id, c]));

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text variant="headlineSm">{t('analytics.budgets')}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('analytics.addBudget')}
          onPress={onAddPress}
          hitSlop={8}
          style={[styles.addAction, { backgroundColor: colors.surfaceContainerHigh }]}
        >
          <Icon name="plus" size={20} color={colors.primary} strokeWidth={2.5} />
        </Pressable>
      </View>

      {budgets.length === 0 ? (
        <Pressable accessibilityRole="button" onPress={onAddPress}>
          <GlassCard style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceContainerHigh }]}>
              <Icon name="award" size={28} color={colors.primary} strokeWidth={2} />
            </View>
            <Text variant="headlineSm" style={styles.center}>
              {t('analytics.empty.noBudgets')}
            </Text>
            <Text variant="bodyMd" color="onSurfaceVariant" style={styles.center}>
              {t('analytics.empty.noBudgetsHint')}
            </Text>
          </GlassCard>
        </Pressable>
      ) : (
        <View style={styles.list}>
          {budgets.map((status) => (
            <BudgetItem
              key={status.budget.id}
              status={status}
              category={byId.get(status.budget.categoryId)}
              locale={locale}
              onPress={() => onItemPress(status)}
            />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addAction: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    gap: spacing.md,
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
  center: {
    textAlign: 'center',
  },
});
