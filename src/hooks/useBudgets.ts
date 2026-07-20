import { useQuery, useQueryClient } from '@tanstack/react-query';

import { ownedById, useOwnedMutation } from '@/hooks/useOwnedMutation';
import { listBudgets, upsertBudget } from '@/lib/budgets';
import {
  deleteBudgetOwned,
  upsertBudgetOwned,
  type UpsertBudgetVars,
} from '@/lib/ownedMutations';
import { useAuthStore } from '@/stores/useAuthStore';

/** ÖNEK key — invalidation'lar bunu kullanır; gerçek key userId taşır (bkz. useTransactions). */
export const budgetsKey = ['budgets'] as const;

export function useBudgets() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: [...budgetsKey, userId],
    queryFn: listBudgets,
    enabled: !!userId,
  });
}

export function useUpsertBudget() {
  const qc = useQueryClient();
  return useOwnedMutation(
    (
      input: Parameters<typeof upsertBudget>[0],
      ownerUserId
    ): UpsertBudgetVars => ({ ...input, ownerUserId }),
    {
      mutationKey: ['upsertBudget'],
      mutationFn: upsertBudgetOwned,
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: budgetsKey });
      },
    }
  );
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useOwnedMutation(ownedById, {
    mutationKey: ['deleteBudget'],
    mutationFn: deleteBudgetOwned,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: budgetsKey });
    },
  });
}
