import { useQuery, useQueryClient } from '@tanstack/react-query';

import { ownedById, useOwnedMutation } from '@/hooks/useOwnedMutation';
import { createGoal, listGoals, type GoalPatch } from '@/lib/goals';
import {
  addToGoalOwned,
  createGoalOwned,
  deleteGoalOwned,
  subtractFromGoalOwned,
  updateGoalOwned,
  type CreateGoalVars,
  type GoalAmountVars,
  type UpdateGoalVars,
} from '@/lib/ownedMutations';
import { useAuthStore } from '@/stores/useAuthStore';

/** ÖNEK key — invalidation'lar bunu kullanır; gerçek key userId taşır (bkz. useTransactions). */
export const goalsKey = ['goals'] as const;

export function useGoals() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: [...goalsKey, userId],
    queryFn: listGoals,
    enabled: !!userId,
  });
}

type AmountArgs = { id: string; amount: number };

export function useCreateGoal() {
  const qc = useQueryClient();
  return useOwnedMutation(
    (input: Parameters<typeof createGoal>[0], ownerUserId): CreateGoalVars => ({
      ...input,
      ownerUserId,
    }),
    {
      mutationKey: ['createGoal'],
      mutationFn: createGoalOwned,
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: goalsKey });
      },
    }
  );
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useOwnedMutation(
    (input: { id: string } & GoalPatch, ownerUserId): UpdateGoalVars => ({
      ...input,
      ownerUserId,
    }),
    {
      mutationKey: ['updateGoal'],
      mutationFn: updateGoalOwned,
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: goalsKey });
      },
    }
  );
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useOwnedMutation(ownedById, {
    mutationKey: ['deleteGoal'],
    mutationFn: deleteGoalOwned,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: goalsKey });
    },
  });
}

export function useAddToGoal() {
  const qc = useQueryClient();
  return useOwnedMutation(
    (args: AmountArgs, ownerUserId): GoalAmountVars => ({ ...args, ownerUserId }),
    {
      mutationKey: ['addToGoal'],
      mutationFn: addToGoalOwned,
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: goalsKey });
      },
    }
  );
}

export function useSubtractFromGoal() {
  const qc = useQueryClient();
  return useOwnedMutation(
    (args: AmountArgs, ownerUserId): GoalAmountVars => ({ ...args, ownerUserId }),
    {
      mutationKey: ['subtractFromGoal'],
      mutationFn: subtractFromGoalOwned,
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: goalsKey });
      },
    }
  );
}
