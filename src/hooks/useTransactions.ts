import { useQuery, useQueryClient } from '@tanstack/react-query';

import { ownedById, useOwnedMutation } from '@/hooks/useOwnedMutation';
import {
  createTransactionOwned,
  deleteTransactionOwned,
  updateTransactionOwned,
  type CreateTransactionVars,
  type DeleteVars,
  type UpdateTransactionVars,
} from '@/lib/ownedMutations';
import { createTransaction, listTransactions, updateTransaction } from '@/lib/transactions';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Transaction } from '@/types';

type ListParams = { from?: string; to?: string };

/**
 * ÖNEK (scope) key — invalidation'lar bunu kullanır. Gerçek query key'i
 * `[...transactionsKey, userId, params]` şeklinde userId taşır; React Query önek eşleşmesi
 * yaptığı için bu önekle yapılan invalidate/cancel çağrıları aktif kullanıcının tüm
 * varyantlarını yine kapsar (bkz. lib/clearAppCache.ts).
 */
export const transactionsKey = ['transactions'] as const;

/** Aktif kullanıcıya kilitli önek — optimistic okuma/yazmalar başka hesabın cache'ine dokunmasın. */
function userScope(userId: string | undefined) {
  return [...transactionsKey, userId] as const;
}

export function useTransactions(params?: ListParams) {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: [...userScope(userId), params ?? {}],
    queryFn: () => listTransactions(params),
    enabled: !!userId,
  });
}

type CreateInput = Parameters<typeof createTransaction>[0];
type UpdateArgs = { id: string; patch: Parameters<typeof updateTransaction>[1] };

export function useCreateTransaction() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const scope = userScope(userId);
  return useOwnedMutation(
    (input: CreateInput, ownerUserId): CreateTransactionVars => ({ ...input, ownerUserId }),
    {
      mutationKey: ['createTransaction'],
      mutationFn: createTransactionOwned,
      // Optimistic: modal anında kapanır, dashboard'da işlem hemen görünür.
      onMutate: async (input: CreateTransactionVars) => {
        await qc.cancelQueries({ queryKey: scope });
        const previous = qc.getQueriesData<Transaction[]>({ queryKey: scope });

        const now = new Date().toISOString();
        const optimistic: Transaction = {
          id: `temp_${Date.now()}`,
          userId: 'optimistic',
          categoryId: input.categoryId,
          amount: input.amount,
          currency: input.currency,
          kind: input.kind,
          date: input.date,
          note: input.note ?? null,
          recurringRuleId: null,
          createdAt: now,
          updatedAt: now,
        };

        qc.setQueriesData<Transaction[]>({ queryKey: scope }, (old) =>
          old ? [optimistic, ...old] : old
        );

        return { previous };
      },
      onError: (_err, _input, ctx) => {
        ctx?.previous?.forEach(([key, data]) => qc.setQueryData(key, data));
      },
      onSettled: () => {
        void qc.invalidateQueries({ queryKey: transactionsKey });
      },
    }
  );
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const scope = userScope(userId);
  return useOwnedMutation(
    (args: UpdateArgs, ownerUserId): UpdateTransactionVars => ({ ...args, ownerUserId }),
    {
      mutationKey: ['updateTransaction'],
      mutationFn: updateTransactionOwned,
      // Optimistic (create ile paralel): liste anında güncellenir, offline'da bile.
      onMutate: async ({ id, patch }: UpdateTransactionVars) => {
        await qc.cancelQueries({ queryKey: scope });
        const previous = qc.getQueriesData<Transaction[]>({ queryKey: scope });
        qc.setQueriesData<Transaction[]>({ queryKey: scope }, (old) =>
          old ? old.map((tx) => (tx.id === id ? { ...tx, ...patch } : tx)) : old
        );
        return { previous };
      },
      onError: (_err, _input, ctx) => {
        ctx?.previous?.forEach(([key, data]) => qc.setQueryData(key, data));
      },
      onSettled: () => {
        void qc.invalidateQueries({ queryKey: transactionsKey });
      },
    }
  );
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const scope = userScope(userId);
  return useOwnedMutation(ownedById, {
    mutationKey: ['deleteTransaction'],
    mutationFn: deleteTransactionOwned,
    // Optimistic: silinen işlem listeden anında kalkar; hata olursa geri yüklenir.
    onMutate: async ({ id }: DeleteVars) => {
      await qc.cancelQueries({ queryKey: scope });
      const previous = qc.getQueriesData<Transaction[]>({ queryKey: scope });
      qc.setQueriesData<Transaction[]>({ queryKey: scope }, (old) =>
        old ? old.filter((tx) => tx.id !== id) : old
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      ctx?.previous?.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: transactionsKey });
    },
  });
}
