import type { QueryClient } from '@tanstack/react-query';

import { budgetsKey } from '@/hooks/useBudgets';
import { categoriesKey } from '@/hooks/useCategories';
import { goalsKey } from '@/hooks/useGoals';
import { recurringRulesKey } from '@/hooks/useRecurringRules';
import { subscriptionsKey } from '@/hooks/useSubscriptions';
import { transactionsKey } from '@/hooks/useTransactions';
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from '@/lib/categories';
import {
  createRecurringRule,
  deleteRecurringRule,
  updateRecurringRule,
  type RecurringRulePatch,
} from '@/lib/recurring';
import { deleteBudget, upsertBudget } from '@/lib/budgets';
import {
  addToGoal,
  createGoal,
  deleteGoal,
  subtractFromGoal,
  updateGoal,
  type GoalPatch,
} from '@/lib/goals';
import {
  createSubscription,
  deleteSubscription,
  updateSubscription,
  type SubscriptionPatch,
} from '@/lib/subscriptions';
import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from '@/lib/transactions';

/**
 * Part 13.5: Offline mutation default'ları.
 *
 * Çevrimdışıyken paused olan mutation'lar AsyncStorage'a yazılır. Uygulama yeniden
 * başlatıldığında bu mutation'lar cache'ten restore edilir AMA `mutationFn` serialize
 * edilemediği için kaybolur → resume edilemez. setMutationDefaults her mutationKey için
 * fn'i (ve resume sonrası invalidation'ı) yeniden kaydeder, böylece restart sonrası da
 * otomatik sync çalışır. (In-session resume zaten hook'un kendi fn'i ile olur.)
 *
 * Not: Bu default'lar yalnızca restore edilmiş, fn'siz mutation'lar için devreye girer;
 * canlı hook'lar kendi onMutate/onSuccess optimistic mantığını kullanmaya devam eder.
 */
export function registerMutationDefaults(qc: QueryClient): void {
  const invalidate = (...keys: readonly (readonly unknown[])[]) => {
    for (const key of keys) {
      void qc.invalidateQueries({ queryKey: key });
    }
  };

  type IdPatch<P> = { id: string; patch: P };

  // — Transactions —
  qc.setMutationDefaults(['createTransaction'], {
    mutationFn: (input: Parameters<typeof createTransaction>[0]) => createTransaction(input),
    onSuccess: () => invalidate(transactionsKey),
  });
  qc.setMutationDefaults(['updateTransaction'], {
    mutationFn: ({ id, patch }: IdPatch<Parameters<typeof updateTransaction>[1]>) =>
      updateTransaction(id, patch),
    onSuccess: () => invalidate(transactionsKey),
  });
  qc.setMutationDefaults(['deleteTransaction'], {
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => invalidate(transactionsKey),
  });

  // — Categories —
  qc.setMutationDefaults(['createCategory'], {
    mutationFn: (input: Parameters<typeof createCategory>[0]) => createCategory(input),
    onSuccess: () => invalidate(categoriesKey),
  });
  qc.setMutationDefaults(['updateCategory'], {
    mutationFn: ({ id, patch }: IdPatch<Parameters<typeof updateCategory>[1]>) =>
      updateCategory(id, patch),
    onSuccess: () => invalidate(categoriesKey),
  });
  qc.setMutationDefaults(['deleteCategory'], {
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => invalidate(categoriesKey, transactionsKey),
  });

  // — Recurring rules — (kural abonelik olabilir → subscriptionsKey de tazelenir)
  qc.setMutationDefaults(['createRecurringRule'], {
    mutationFn: (input: Parameters<typeof createRecurringRule>[0]) => createRecurringRule(input),
    onSuccess: () => invalidate(recurringRulesKey, transactionsKey, subscriptionsKey),
  });
  qc.setMutationDefaults(['updateRecurringRule'], {
    mutationFn: ({ id, patch }: IdPatch<RecurringRulePatch>) => updateRecurringRule(id, patch),
    onSuccess: () => invalidate(recurringRulesKey, transactionsKey, subscriptionsKey),
  });
  qc.setMutationDefaults(['deleteRecurringRule'], {
    mutationFn: (id: string) => deleteRecurringRule(id),
    onSuccess: () => invalidate(recurringRulesKey, transactionsKey, subscriptionsKey),
  });

  // — Subscriptions — (invalidate yeterli: NotificationsBootstrap subs değişince reschedule eder)
  qc.setMutationDefaults(['createSubscription'], {
    mutationFn: (input: Parameters<typeof createSubscription>[0]) => createSubscription(input),
    onSuccess: () => invalidate(subscriptionsKey, recurringRulesKey, transactionsKey),
  });
  qc.setMutationDefaults(['updateSubscription'], {
    mutationFn: ({ id, patch }: IdPatch<SubscriptionPatch>) => updateSubscription(id, patch),
    onSuccess: () => invalidate(subscriptionsKey, recurringRulesKey, transactionsKey),
  });
  qc.setMutationDefaults(['deleteSubscription'], {
    mutationFn: (id: string) => deleteSubscription(id),
    onSuccess: () => invalidate(subscriptionsKey, recurringRulesKey, transactionsKey),
  });

  // — Goals — (Part 14)
  qc.setMutationDefaults(['createGoal'], {
    mutationFn: (input: Parameters<typeof createGoal>[0]) => createGoal(input),
    onSuccess: () => invalidate(goalsKey),
  });
  qc.setMutationDefaults(['updateGoal'], {
    mutationFn: (input: { id: string } & GoalPatch) => updateGoal(input),
    onSuccess: () => invalidate(goalsKey),
  });
  qc.setMutationDefaults(['deleteGoal'], {
    mutationFn: (id: string) => deleteGoal(id),
    onSuccess: () => invalidate(goalsKey),
  });
  qc.setMutationDefaults(['addToGoal'], {
    mutationFn: ({ id, amount }: { id: string; amount: number }) => addToGoal(id, amount),
    onSuccess: () => invalidate(goalsKey),
  });
  qc.setMutationDefaults(['subtractFromGoal'], {
    mutationFn: ({ id, amount }: { id: string; amount: number }) => subtractFromGoal(id, amount),
    onSuccess: () => invalidate(goalsKey),
  });

  // — Budgets —
  qc.setMutationDefaults(['upsertBudget'], {
    mutationFn: (input: Parameters<typeof upsertBudget>[0]) => upsertBudget(input),
    onSuccess: () => invalidate(budgetsKey),
  });
  qc.setMutationDefaults(['deleteBudget'], {
    mutationFn: (id: string) => deleteBudget(id),
    onSuccess: () => invalidate(budgetsKey),
  });
}
