import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  addToGoal,
  createGoal,
  deleteGoal,
  listGoals,
  subtractFromGoal,
  updateGoal,
} from '@/lib/goals';

export const goalsKey = ['goals'] as const;

export function useGoals() {
  return useQuery({
    queryKey: goalsKey,
    queryFn: listGoals,
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['createGoal'],
    mutationFn: createGoal,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: goalsKey });
    },
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['updateGoal'],
    mutationFn: updateGoal,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: goalsKey });
    },
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['deleteGoal'],
    mutationFn: deleteGoal,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: goalsKey });
    },
  });
}

export function useAddToGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['addToGoal'],
    mutationFn: ({ id, amount }: { id: string; amount: number }) => addToGoal(id, amount),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: goalsKey });
    },
  });
}

export function useSubtractFromGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['subtractFromGoal'],
    mutationFn: ({ id, amount }: { id: string; amount: number }) => subtractFromGoal(id, amount),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: goalsKey });
    },
  });
}
