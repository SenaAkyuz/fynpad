import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdBanner } from '@/components/ads/AdBanner';
import { AvgDailySpendCard } from '@/components/analytics/AvgDailySpendCard';
import { BudgetList } from '@/components/analytics/BudgetList';
import { CashFlowChart } from '@/components/analytics/CashFlowChart';
import { NetSavingsCard } from '@/components/analytics/NetSavingsCard';
import { TopCategoriesList } from '@/components/analytics/TopCategoriesList';
import { InsightsList } from '@/components/insights/InsightsList';
import { PeriodSelector } from '@/components/PeriodSelector';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl, type SegmentOption } from '@/components/ui/SegmentedControl';
import { Spinner } from '@/components/ui/Spinner';
import { Text } from '@/components/ui/Text';
import { useBudgets } from '@/hooks/useBudgets';
import { useCategories } from '@/hooks/useCategories';
import { useProfile } from '@/hooks/useProfile';
import { useTransactions } from '@/hooks/useTransactions';
import {
  avgDailySpend,
  cashFlowSeries,
  filterByExpenseType,
  topCategories,
  type ExpenseType,
} from '@/lib/analytics';
import { computeBudgetStatus, startOfMonthISO } from '@/lib/budgets';
import { getPeriodRange } from '@/lib/period';
import { getTotals } from '@/lib/transactions';
import { useAppStore } from '@/stores/useAppStore';
import { usePeriodStore } from '@/stores/usePeriodStore';
import { spacing } from '@/theme/tokens';
import type { BudgetStatus, Currency } from '@/types';

/**
 * Detaylı Analitik (Part 8, brief 4.5). Takvim-bazlı dönem seçici (Gün/Ay/Yıl/Özel) tüm metrikleri günceller:
 * cash flow grafiği + net birikim + ortalama günlük harcama + en çok harcanan kategoriler +
 * kategori bütçeleri ("Over by $X" uyarılı). Tasarım: advanced_analytics_*.html.
 */
export default function AnalyticsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const locale = useAppStore((s) => s.locale);

  const filter = usePeriodStore((s) => s.filter);
  const [expenseType, setExpenseType] = useState<ExpenseType>('all');

  const range = useMemo(() => getPeriodRange(filter), [filter]);
  const { data: transactions = [], isLoading } = useTransactions(range);
  const { data: categories = [] } = useCategories();
  const { data: profile } = useProfile();
  const { data: budgets = [] } = useBudgets();

  // Bütçeler her zaman içinde bulunulan takvim ayına göre (period selector'dan bağımsız).
  const monthFrom = useMemo(() => startOfMonthISO(), []);
  const { data: monthTransactions = [] } = useTransactions({ from: monthFrom });

  const currency: Currency = profile?.defaultCurrency ?? 'TRY';

  // Gider tipi filtresi gelir'i etkilemez (filterByExpenseType gelirleri korur):
  // net = gelir − filtreli gider, böylece Sabit/Değişken seçiminde net birikim güncellenir.
  const totals = useMemo(
    () => getTotals(filterByExpenseType(transactions, expenseType)),
    [transactions, expenseType]
  );
  const cashFlow = useMemo(
    () => cashFlowSeries(transactions, filter, locale, expenseType),
    [transactions, filter, locale, expenseType]
  );
  const avgDaily = useMemo(
    () => avgDailySpend(transactions, filter, expenseType),
    [transactions, filter, expenseType]
  );
  const topCats = useMemo(
    () => topCategories(transactions, 5, expenseType),
    [transactions, expenseType]
  );
  const budgetStatuses = useMemo(
    () => budgets.map((b) => computeBudgetStatus(b, monthTransactions)),
    [budgets, monthTransactions]
  );

  const savingsRate = totals.income > 0 && totals.net > 0 ? totals.net / totals.income : null;
  const hasTransactions = transactions.length > 0;

  const trendKey = filter.type === 'custom' ? 'custom' : filter.type;

  const expenseTypeOptions: SegmentOption[] = [
    { value: 'all', label: t('analytics.expenseTypeFilter.all') },
    { value: 'fixed', label: t('analytics.expenseTypeFilter.fixed') },
    { value: 'variable', label: t('analytics.expenseTypeFilter.variable') },
  ];

  // Cash Flow başlığı filtreye göre değişir — kullanıcı aktif filtreyi hisseder.
  const cashFlowTitle =
    expenseType === 'fixed'
      ? t('analytics.cashFlowFixed')
      : expenseType === 'variable'
        ? t('analytics.cashFlowVariable')
        : t('analytics.cashFlow');

  const openAddBudget = () => router.push('/budget-edit');
  const openEditBudget = (status: BudgetStatus) =>
    router.push(`/budget-edit?id=${status.budget.id}`);

  return (
    <Screen edges={['top']}>
      <View style={styles.titleBlock}>
        <Text variant="headlineMd" style={styles.title}>
          {t('analytics.title')}
        </Text>
        <Text variant="bodyMd" color="onSurfaceVariant">
          {t('analytics.subtitle')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.selectors}>
          <PeriodSelector />
          <SegmentedControl
            options={expenseTypeOptions}
            value={expenseType}
            onChange={(v) => setExpenseType(v as ExpenseType)}
          />
        </View>

        {isLoading && !hasTransactions ? (
          <View style={styles.loading}>
            <Spinner />
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text variant="headlineSm">{cashFlowTitle}</Text>
              <CashFlowChart data={cashFlow.buckets} height={200} />
            </View>

            <NetSavingsCard
              value={totals.net}
              currency={currency}
              locale={locale}
              savingsRate={savingsRate}
            />
            <AvgDailySpendCard
              value={avgDaily}
              currency={currency}
              locale={locale}
              periodLabel={t(`dashboard.trend.${trendKey}`)}
            />

            <View style={styles.section}>
              <Text variant="headlineSm">{t('analytics.topCategories')}</Text>
              <TopCategoriesList
                items={topCats}
                categories={categories}
                currency={currency}
                locale={locale}
              />
            </View>
          </>
        )}

        <BudgetList
          budgets={budgetStatuses}
          categories={categories}
          locale={locale}
          onAddPress={openAddBudget}
          onItemPress={openEditBudget}
        />

        {/* Strategic Insights — tasarımda analytics'in son section'ı (brief 5/3). */}
        <InsightsList />
      </ScrollView>

      {/* Banner: tab bar'ın üstünde sabit (scroll dışında). */}
      <View style={[styles.adBanner, { bottom: insets.bottom + 80 }]} pointerEvents="box-none">
        <AdBanner />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleBlock: {
    paddingHorizontal: spacing.containerMargin,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  title: {
    fontWeight: '800',
  },
  content: {
    paddingHorizontal: spacing.containerMargin,
    paddingTop: spacing.sm,
    paddingBottom: 190, // banner + floating tab bar için ekstra pay
    gap: spacing.stackMd,
  },
  adBanner: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  selectors: {
    gap: spacing.md,
  },
  section: {
    gap: spacing.stackSm,
  },
  loading: {
    paddingVertical: spacing.stackLg,
    alignItems: 'center',
  },
});
