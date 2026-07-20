import type { QueryClient } from '@tanstack/react-query';

import { budgetsKey } from '@/hooks/useBudgets';
import { categoriesKey } from '@/hooks/useCategories';
import { goalsKey } from '@/hooks/useGoals';
import { recurringRulesKey, subscriptionsKey } from '@/hooks/queryKeys';
import { transactionsKey } from '@/hooks/useTransactions';
import { OWNER_MISMATCH } from '@/lib/mutationOwner';
import {
  addToGoalOwned,
  createCategoryOwned,
  createGoalOwned,
  createRecurringRuleOwned,
  createSubscriptionOwned,
  createTransactionOwned,
  deleteBudgetOwned,
  deleteCategoryOwned,
  deleteGoalOwned,
  deleteRecurringRuleOwned,
  deleteSubscriptionOwned,
  deleteTransactionOwned,
  subtractFromGoalOwned,
  updateCategoryOwned,
  updateGoalOwned,
  updateRecurringRuleOwned,
  updateSubscriptionOwned,
  updateTransactionOwned,
  upsertBudgetOwned,
} from '@/lib/ownedMutations';
import { updateProfile, type UpdateProfileInput } from '@/lib/profile';

/**
 * Part 13.5: Offline mutation default'ları.
 *
 * Çevrimdışıyken paused olan mutation'lar AsyncStorage'a yazılır. Uygulama yeniden
 * başlatıldığında bu mutation'lar cache'ten restore edilir AMA `mutationFn` serialize
 * edilemediği için kaybolur → resume edilemez. setMutationDefaults her mutationKey için
 * fn'i (ve resume sonrası invalidation'ı) yeniden kaydeder, böylece restart sonrası da
 * otomatik sync çalışır. (In-session resume zaten hook'un kendi fn'i ile olur.)
 *
 * SAHİPLİK: buradaki tüm fn'ler `lib/ownedMutations.ts`'ten gelir — çalışmadan önce
 * payload'daki `ownerUserId` aktif oturumla karşılaştırılır. Restore edilen bir mutation
 * BAŞKA bir hesabın oturumunda asla DB'ye yazmaz.
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

  /**
   * Sahiplik uyuşmazlığı KALICI bir durumdur (yanlış hesap oturumda) — yeniden denemek
   * anlamsız. Diğer hatalarda React Query'nin varsayılan retry davranışı korunur.
   */
  const retry = (failureCount: number, error: Error) => {
    if (error?.message === OWNER_MISMATCH) return false;
    return failureCount < 3;
  };

  // — Transactions —
  qc.setMutationDefaults(['createTransaction'], {
    mutationFn: createTransactionOwned,
    retry,
    onSuccess: () => invalidate(transactionsKey),
  });
  qc.setMutationDefaults(['updateTransaction'], {
    mutationFn: updateTransactionOwned,
    retry,
    onSuccess: () => invalidate(transactionsKey),
  });
  qc.setMutationDefaults(['deleteTransaction'], {
    mutationFn: deleteTransactionOwned,
    retry,
    onSuccess: () => invalidate(transactionsKey),
  });

  // — Categories —
  qc.setMutationDefaults(['createCategory'], {
    mutationFn: createCategoryOwned,
    retry,
    onSuccess: () => invalidate(categoriesKey),
  });
  qc.setMutationDefaults(['updateCategory'], {
    mutationFn: updateCategoryOwned,
    retry,
    onSuccess: () => invalidate(categoriesKey),
  });
  qc.setMutationDefaults(['deleteCategory'], {
    mutationFn: deleteCategoryOwned,
    retry,
    onSuccess: () => invalidate(categoriesKey, transactionsKey),
  });

  // — Recurring rules — (kural abonelik olabilir → subscriptionsKey de tazelenir)
  qc.setMutationDefaults(['createRecurringRule'], {
    mutationFn: createRecurringRuleOwned,
    retry,
    onSuccess: () => invalidate(recurringRulesKey, transactionsKey, subscriptionsKey),
  });
  qc.setMutationDefaults(['updateRecurringRule'], {
    mutationFn: updateRecurringRuleOwned,
    retry,
    onSuccess: () => invalidate(recurringRulesKey, transactionsKey, subscriptionsKey),
  });
  qc.setMutationDefaults(['deleteRecurringRule'], {
    mutationFn: deleteRecurringRuleOwned,
    retry,
    onSuccess: () => invalidate(recurringRulesKey, transactionsKey, subscriptionsKey),
  });

  // — Subscriptions — (invalidate yeterli: NotificationsBootstrap subs değişince reschedule eder)
  qc.setMutationDefaults(['createSubscription'], {
    mutationFn: createSubscriptionOwned,
    retry,
    onSuccess: () => invalidate(subscriptionsKey, recurringRulesKey, transactionsKey),
  });
  qc.setMutationDefaults(['updateSubscription'], {
    mutationFn: updateSubscriptionOwned,
    retry,
    onSuccess: () => invalidate(subscriptionsKey, recurringRulesKey, transactionsKey),
  });
  qc.setMutationDefaults(['deleteSubscription'], {
    mutationFn: deleteSubscriptionOwned,
    retry,
    onSuccess: () => invalidate(subscriptionsKey, recurringRulesKey, transactionsKey),
  });

  // — Goals — (Part 14)
  qc.setMutationDefaults(['createGoal'], {
    mutationFn: createGoalOwned,
    retry,
    onSuccess: () => invalidate(goalsKey),
  });
  qc.setMutationDefaults(['updateGoal'], {
    mutationFn: updateGoalOwned,
    retry,
    onSuccess: () => invalidate(goalsKey),
  });
  qc.setMutationDefaults(['deleteGoal'], {
    mutationFn: deleteGoalOwned,
    retry,
    onSuccess: () => invalidate(goalsKey),
  });
  qc.setMutationDefaults(['addToGoal'], {
    mutationFn: addToGoalOwned,
    retry,
    onSuccess: () => invalidate(goalsKey),
  });
  qc.setMutationDefaults(['subtractFromGoal'], {
    mutationFn: subtractFromGoalOwned,
    retry,
    onSuccess: () => invalidate(goalsKey),
  });

  // — Profile —
  // Bu kayıt EKSİKTİ: çevrimdışı yapılan profil değişikliği uygulama yeniden başlatılınca
  // mutationFn'siz restore ediliyor ve resume edilemiyordu. Invalidation yalnızca
  // mutation'ın SAHİBİ olan kullanıcının profil query'sini hedefler.
  qc.setMutationDefaults(['updateProfile'], {
    mutationFn: (input: UpdateProfileInput) => updateProfile(input),
    retry,
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['profile', (variables as UpdateProfileInput).ownerUserId] });
    },
  });

  // — Budgets —
  qc.setMutationDefaults(['upsertBudget'], {
    mutationFn: upsertBudgetOwned,
    retry,
    onSuccess: () => invalidate(budgetsKey),
  });
  qc.setMutationDefaults(['deleteBudget'], {
    mutationFn: deleteBudgetOwned,
    retry,
    onSuccess: () => invalidate(budgetsKey),
  });
}
