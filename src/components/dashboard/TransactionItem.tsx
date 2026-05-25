import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { formatCurrency, formatRelativeDate } from '@/lib/format';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { Category, Locale, Transaction } from '@/types';

export type TransactionItemProps = {
  transaction: Transaction;
  /** çağıran tarafça çözülmüş kategori (Part 5: DB-driven) */
  category?: Category;
  locale: Locale;
};

/**
 * İşlem satırı (design): nötr kare ikon + başlık (note) + altsatır (kategori • tarih) + tutar.
 * Income secondary (+), expense tertiary (-).
 */
export function TransactionItem({ transaction, category, locale }: TransactionItemProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const income = transaction.kind === 'income';
  const title = transaction.note ?? (category ? t(category.name) : '');
  const subtitle = `${category ? t(category.name) : ''} • ${formatRelativeDate(transaction.date, locale)}`;
  const sign = income ? '+' : '-';
  const amountText = `${sign}${formatCurrency(transaction.amount, transaction.currency, locale)}`;

  return (
    <View
      style={[styles.card, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.glassBorder }]}
    >
      <View style={styles.left}>
        <View style={[styles.iconBox, { backgroundColor: colors.surfaceContainerHigh }]}>
          <Icon
            name={(category?.icon as IconName) ?? 'more-horizontal'}
            size={20}
            color={colors.onSurfaceVariant}
            strokeWidth={2}
          />
        </View>
        <View style={styles.texts}>
          <View style={styles.titleRow}>
            <Text variant="labelMd" numberOfLines={1} style={styles.title}>
              {title}
            </Text>
            {/* Tekrarlayan işlem etiketi (brief: sabit/değişken ayırt edilebilsin). */}
            {transaction.recurringRuleId ? (
              <Icon name="repeat" size={14} color={colors.onSurfaceVariant} strokeWidth={2} />
            ) : null}
          </View>
          <Text variant="labelSm" color="onSurfaceVariant" numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </View>
      <Text variant="labelMd" color={income ? 'secondary' : 'tertiary'}>
        {amountText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    flex: 1,
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    flexShrink: 1,
  },
});
