import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import {
  SPARKLINE_EXPENSE,
  SPARKLINE_INCOME,
  Sparkline,
} from '@/components/dashboard/Sparkline';
import { GlassCard } from '@/components/ui/GlassCard';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { formatCurrency } from '@/lib/format';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { TextColor } from '@/components/ui/Text';
import type { Currency, Locale } from '@/types';

type Money = { label: string; amount: number; color: TextColor; icon: IconName; iconColor: string; path: string };

export type IncomeExpenseCardsProps = {
  income: number;
  expense: number;
  currency: Currency;
  locale: Locale;
};

/**
 * Gelir + Gider kartları (design: mobilde dikey istif, sparkline'lı).
 * Income: arrow-down + secondary (yeşil) · Expense: arrow-up + tertiary (kırmızı).
 */
export function IncomeExpenseCards({ income, expense, currency, locale }: IncomeExpenseCardsProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const cards: Money[] = [
    {
      label: t('dashboard.income'),
      amount: income,
      color: 'secondary',
      icon: 'arrow-down',
      iconColor: colors.secondary,
      path: SPARKLINE_INCOME,
    },
    {
      label: t('dashboard.expense'),
      amount: expense,
      color: 'tertiary',
      icon: 'arrow-up',
      iconColor: colors.tertiary,
      path: SPARKLINE_EXPENSE,
    },
  ];

  return (
    <View style={styles.stack}>
      {cards.map((c) => (
        <GlassCard key={c.label} style={styles.card}>
          <View style={styles.header}>
            <Text variant="labelMd" color="onSurfaceVariant">
              {c.label}
            </Text>
            <Icon name={c.icon} size={22} color={c.iconColor} strokeWidth={2} />
          </View>
          <Text variant="headlineMd" color={c.color} style={styles.amount}>
            {formatCurrency(c.amount, currency, locale)}
          </Text>
          <View style={styles.spark}>
            <Sparkline d={c.path} color={c.iconColor} />
          </View>
        </GlassCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.stackSm,
  },
  card: {
    minHeight: 150,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  amount: {
    marginTop: spacing.xs,
  },
  spark: {
    marginTop: spacing.lg,
  },
});
