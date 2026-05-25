import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AvgDailySpendCard } from '@/components/analytics/AvgDailySpendCard';
import { BudgetList } from '@/components/analytics/BudgetList';
import { CashFlowChart } from '@/components/analytics/CashFlowChart';
import { NetSavingsCard } from '@/components/analytics/NetSavingsCard';
import { TopCategoriesList } from '@/components/analytics/TopCategoriesList';
import { InsightsList } from '@/components/insights/InsightsList';
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
import { getTotals } from '@/lib/transactions';
import { useAppStore } from '@/stores/useAppStore';
import { spacing } from '@/theme/tokens';
import type { BudgetStatus, Currency, Period } from '@/types';

/**
 * Detaylı Analitik (Part 8, brief 4.5). Period selector (G/H/A/Y) tüm metrikleri günceller:
 * cash flow grafiği + net birikim + ortalama günlük harcama + en çok harcanan kategoriler +
 * kategori bütçeleri ("Over by $X" uyarılı). Tasarım: advanced_analytics_*.html.
 */
export default function AnalyticsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const locale = useAppStore((s) => s.locale);

  const [period, setPeriod] = useState<Period>('month');
  const [expenseType, setExpenseType] = useState<ExpenseType>('all');

  const { data: transactions = [], isLoading } = useTransactions({ period });
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
    () => cashFlowSeries(transactions, period, locale, expenseType),
    [transactions, period, locale, expenseType]
  );
  const avgDaily = useMemo(
    () => avgDailySpend(transactions, period, expenseType),
    [transactions, period, expenseType]
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

  const periodOptions: SegmentOption[] = [
    { value: 'day', label: t('dashboard.period.day') },
    { value: 'week', label: t('dashboard.period.week') },
    { value: 'month', label: t('dashboard.period.month') },
    { value: 'year', label: t('dashboard.period.year') },
  ];

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
          <SegmentedControl
            options={periodOptions}
            value={period}
            onChange={(v) => setPeriod(v as Period)}
          />
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
              periodLabel={t(`dashboard.trend.${period}`)}
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
    paddingBottom: 120,
    gap: spacing.stackMd,
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
