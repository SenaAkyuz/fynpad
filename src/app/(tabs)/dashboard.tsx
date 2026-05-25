import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CategoryBreakdown } from '@/components/dashboard/CategoryBreakdown';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { IncomeExpenseCards } from '@/components/dashboard/IncomeExpenseCards';
import { RecentTransactionsList } from '@/components/dashboard/RecentTransactionsList';
import { TotalBalanceCard } from '@/components/dashboard/TotalBalanceCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl, type SegmentOption } from '@/components/ui/SegmentedControl';
import { Spinner } from '@/components/ui/Spinner';
import { Text } from '@/components/ui/Text';
import { useCategories } from '@/hooks/useCategories';
import { useProfile } from '@/hooks/useProfile';
import { useTransactions } from '@/hooks/useTransactions';
import { getBreakdown, getTotals } from '@/lib/transactions';
import { useAppStore } from '@/stores/useAppStore';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { Currency, Period } from '@/types';

export default function DashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const locale = useAppStore((s) => s.locale);
  const [period, setPeriod] = useState<Period>('month');

  const { data: categories = [] } = useCategories();
  const { data: transactions = [], isLoading } = useTransactions({ period });
  const { data: profile } = useProfile();

  const currency: Currency = profile?.defaultCurrency ?? 'TRY';

  const totals = useMemo(() => getTotals(transactions), [transactions]);
  const breakdown = useMemo(() => getBreakdown(transactions, categories), [transactions, categories]);
  const recent = useMemo(() => transactions.slice(0, 10), [transactions]);

  const trendPercent = totals.income > 0 ? (totals.net / totals.income) * 100 : 0;
  const hasTransactions = transactions.length > 0;

  const periodOptions: SegmentOption[] = [
    { value: 'day', label: t('dashboard.period.day') },
    { value: 'week', label: t('dashboard.period.week') },
    { value: 'month', label: t('dashboard.period.month') },
    { value: 'year', label: t('dashboard.period.year') },
  ];

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <DashboardHeader />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TotalBalanceCard
          balance={totals.net}
          currency={currency}
          locale={locale}
          trendPercent={trendPercent}
          trendLabel={t(`dashboard.trend.${period}`)}
        />

        <SegmentedControl
          options={periodOptions}
          value={period}
          onChange={(v) => setPeriod(v as Period)}
        />

        <IncomeExpenseCards
          income={totals.income}
          expense={totals.expense}
          currency={currency}
          locale={locale}
        />

        <CategoryBreakdown
          segments={breakdown.segments}
          total={breakdown.total}
          currency={currency}
          locale={locale}
        />

        {isLoading && !hasTransactions ? (
          <View style={styles.loading}>
            <Spinner />
          </View>
        ) : hasTransactions ? (
          <RecentTransactionsList items={recent} categories={categories} locale={locale} />
        ) : (
          <DashboardEmptyState onAdd={() => router.push('/quick-add')} />
        )}
      </ScrollView>
    </Screen>
  );
}

/** İlk açılış / hiç işlem yokken friendly empty state → tap ile Quick Add. */
function DashboardEmptyState({ onAdd }: { onAdd: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onAdd}>
      <GlassCard style={styles.empty}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceContainerHigh }]}>
          <Icon name="coffee" size={28} color={colors.primary} strokeWidth={2} />
        </View>
        <Text variant="headlineSm" style={styles.emptyTitle}>
          {t('dashboard.emptyState.title')}
        </Text>
        <Text variant="bodyMd" color="onSurfaceVariant" style={styles.emptyTitle}>
          {t('dashboard.emptyState.subtitle')}
        </Text>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.containerMargin,
    paddingVertical: spacing.base,
  },
  content: {
    paddingHorizontal: spacing.containerMargin,
    paddingTop: spacing.base,
    paddingBottom: 120,
    gap: spacing.stackMd,
  },
  loading: {
    paddingVertical: spacing.stackLg,
    alignItems: 'center',
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
  emptyTitle: {
    textAlign: 'center',
  },
});
