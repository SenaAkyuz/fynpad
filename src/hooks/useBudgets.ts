import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { deleteBudget, listBudgets, upsertBudget } from '@/lib/budgets';
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
  return useMutation({
    mutationKey: ['upsertBudget'],
    mutationFn: upsertBudget,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: budgetsKey });
    },
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['deleteBudget'],
    mutationFn: deleteBudget,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: budgetsKey });
    },
  });
}
