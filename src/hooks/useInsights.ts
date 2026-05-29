import { useMemo } from 'react';

import { useBudgets } from '@/hooks/useBudgets';
import { useCategories } from '@/hooks/useCategories';
import { useGoals } from '@/hooks/useGoals';
import { useProfile } from '@/hooks/useProfile';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useTransactions } from '@/hooks/useTransactions';
import { computeBudgetStatus } from '@/lib/budgets';
import { generateGoalInsights, generateInsights } from '@/lib/insights';
import { useAppStore } from '@/stores/useAppStore';
import type { Insight } from '@/types';

/**
 * Akıllı uyarıları on-demand compute eder (DB persistence yok). Tüm input mevcut query'lerden
 * türetilir — ekstra fetch yok. Koşul geçerliliğini yitirince insight kaybolur (auto-dismiss).
 */
export function useInsights(): { insights: Insight[]; isLoading: boolean } {
  const locale = useAppStore((s) => s.locale);
  const { data: transactions = [], isLoading: lt } = useTransactions();
  const { data: categories = [], isLoading: lc } = useCategories();
  const { data: budgets = [], isLoading: lb } = useBudgets();
  const { data: subscriptions = [], isLoading: ls } = useSubscriptions();
  const { data: goals = [], isLoading: lg } = useGoals();
  const { data: profile } = useProfile();

  const budgetStatuses = useMemo(
    () => budgets.map((b) => computeBudgetStatus(b, transactions)),
    [budgets, transactions]
  );

  const insights = useMemo(
    () =>
      generateInsights({
        transactions,
        categories,
        budgets,
        subscriptions,
        goals,
        budgetStatuses,
        profile,
        locale,
        today: new Date(),
      }),
    [transactions, categories, budgets, subscriptions, goals, budgetStatuses, profile, locale]
  );

  return { insights, isLoading: lt || lc || lb || ls || lg };
}

/**
 * Goals ekranı için yalnızca hedef/birikim insight'ları (deadline + gereken aylık birikim + aylık
 * hedef kontrolü). Analytics'in genel 5'lik listesinden bağımsız.
 */
export function useGoalInsights(): { insights: Insight[]; isLoading: boolean } {
  const locale = useAppStore((s) => s.locale);
  const { data: transactions = [], isLoading: lt } = useTransactions();
  const { data: goals = [], isLoading: lg } = useGoals();
  const { data: profile, isLoading: lp } = useProfile();

  const insights = useMemo(
    () => generateGoalInsights({ transactions, goals, profile, locale, today: new Date() }),
    [transactions, goals, profile, locale]
  );

  return { insights, isLoading: lt || lg || lp };
}
