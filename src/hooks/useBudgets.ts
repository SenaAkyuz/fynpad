import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { deleteBudget, listBudgets, upsertBudget } from '@/lib/budgets';

export const budgetsKey = ['budgets'] as const;

export function useBudgets() {
  return useQuery({
    queryKey: budgetsKey,
    queryFn: listBudgets,
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
