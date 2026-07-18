import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdBanner } from '@/components/ads/AdBanner';
import { CategoryBreakdown } from '@/components/dashboard/CategoryBreakdown';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { IncomeExpenseCards } from '@/components/dashboard/IncomeExpenseCards';
import { RecentTransactionsList } from '@/components/dashboard/RecentTransactionsList';
import { TotalBalanceCard } from '@/components/dashboard/TotalBalanceCard';
import { PeriodSelector } from '@/components/PeriodSelector';
import { GlassCard } from '@/components/ui/GlassCard';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Spinner } from '@/components/ui/Spinner';
import { Text } from '@/components/ui/Text';
import { useCategories } from '@/hooks/useCategories';
import { useProfile } from '@/hooks/useProfile';
import { useTransactions } from '@/hooks/useTransactions';
import { getPeriodRange } from '@/lib/period';
import { hasOtherCurrencies } from '@/lib/currencyScope';
import { getBreakdown, getTotals } from '@/lib/transactions';
import { useAppStore } from '@/stores/useAppStore';
import { usePeriodStore } from '@/stores/usePeriodStore';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { Currency } from '@/types';

export default function DashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const locale = useAppStore((s) => s.locale);
  const filter = usePeriodStore((s) => s.filter);

  const range = useMemo(() => getPeriodRange(filter), [filter]);

  const { data: categories = [] } = useCategories();
  const { data: transactions = [], isLoading } = useTransactions(range);
  const { data: profile } = useProfile();

  const currency: Currency = profile?.defaultCurrency ?? 'TRY';

  // Özetler YALNIZCA varsayılan para birimindeki işlemlerden hesaplanır (bkz. lib/currencyScope.ts).
  const totals = useMemo(() => getTotals(transactions, currency), [transactions, currency]);
  const breakdown = useMemo(
    () => getBreakdown(transactions, categories, currency),
    [transactions, categories, currency]
  );
  const hasExcludedCurrencies = useMemo(
    () => hasOtherCurrencies(transactions, currency),
    [transactions, currency]
  );
  const recent = useMemo(() => transactions.slice(0, 10), [transactions]);

  const trendPercent = totals.income > 0 ? (totals.net / totals.income) * 100 : 0;
  const hasTransactions = transactions.length > 0;

  const trendKey = filter.type === 'custom' ? 'custom' : filter.type;

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
          trendLabel={t(`dashboard.trend.${trendKey}`)}
        />

        <PeriodSelector />

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

        {/* Yalnızca gerçekten dışarıda kalan işlem varsa göster (bkz. lib/currencyScope.ts). */}
        {hasExcludedCurrencies ? (
          <Text variant="labelSm" color="onSurfaceVariant" style={styles.currencyNote}>
            {t('dashboard.currencyNote', { currency })}
          </Text>
        ) : null}

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

      {/* Banner: tab bar'ın üstünde sabit (scroll dışında). */}
      <View style={[styles.adBanner, { bottom: insets.bottom + 80 }]} pointerEvents="box-none">
        <AdBanner />
      </View>
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
    paddingBottom: 190, // banner + floating tab bar için ekstra pay
    gap: spacing.stackMd,
  },
  adBanner: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  loading: {
    paddingVertical: spacing.stackLg,
    alignItems: 'center',
  },
  currencyNote: {
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.stackSm,
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
