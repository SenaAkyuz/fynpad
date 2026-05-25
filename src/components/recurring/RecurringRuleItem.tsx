import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { formatCurrency } from '@/lib/format';
import { describeRecurrence } from '@/lib/recurringFormat';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { Category, Locale, RecurringRule } from '@/types';

export type RecurringRuleItemProps = {
  rule: RecurringRule;
  category?: Category;
  locale: Locale;
  onPress: () => void;
};

/** Tekrarlayan kural satırı: kategori ikonu + ad + sıklık özeti + tutar + chevron. */
export function RecurringRuleItem({ rule, category, locale, onPress }: RecurringRuleItemProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const income = rule.kind === 'income';
  const sign = income ? '+' : '-';
  const amountText = `${sign}${formatCurrency(rule.amount, rule.currency, locale)}`;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.glassBorder }]}
    >
      <View style={[styles.iconBox, { backgroundColor: colors.surfaceContainerHigh }]}>
        <Icon
          name={(category?.icon as IconName) ?? 'repeat'}
          size={20}
          color={category?.color ?? colors.onSurfaceVariant}
          strokeWidth={2}
        />
      </View>
      <View style={styles.texts}>
        <Text variant="labelMd" numberOfLines={1}>
          {category ? t(category.name) : t('dashboard.categories.other')}
        </Text>
        <Text variant="labelSm" color="onSurfaceVariant" numberOfLines={1}>
          {describeRecurrence(rule, t)}
        </Text>
      </View>
      <View style={styles.right}>
        <Text variant="labelMd" color={income ? 'secondary' : 'tertiary'}>
          {amountText}
        </Text>
        <Icon name="chevron-right" size={18} color={colors.onSurfaceVariant} strokeWidth={2} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.lg,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
