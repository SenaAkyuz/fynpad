import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createTransaction,
  deleteTransaction,
  listTransactions,
  updateTransaction,
} from '@/lib/transactions';
import type { Period, Transaction } from '@/types';

type ListParams = { period?: Period; from?: string; to?: string };

export const transactionsKey = ['transactions'] as const;

export function useTransactions(params?: ListParams) {
  return useQuery({
    queryKey: [...transactionsKey, params ?? {}],
    queryFn: () => listTransactions(params),
  });
}

type CreateInput = Parameters<typeof createTransaction>[0];

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['createTransaction'],
    mutationFn: createTransaction,
    // Optimistic: modal anında kapanır, dashboard'da işlem hemen görünür.
    onMutate: async (input: CreateInput) => {
      await qc.cancelQueries({ queryKey: transactionsKey });
      const previous = qc.getQueriesData<Transaction[]>({ queryKey: transactionsKey });

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

      qc.setQueriesData<Transaction[]>({ queryKey: transactionsKey }, (old) =>
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
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['updateTransaction'],
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateTransaction>[1] }) =>
      updateTransaction(id, patch),
    // Optimistic (create ile paralel): liste anında güncellenir, offline'da bile.
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: transactionsKey });
      const previous = qc.getQueriesData<Transaction[]>({ queryKey: transactionsKey });
      qc.setQueriesData<Transaction[]>({ queryKey: transactionsKey }, (old) =>
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
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['deleteTransaction'],
    mutationFn: deleteTransaction,
    // Optimistic: silinen işlem listeden anında kalkar; hata olursa geri yüklenir.
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: transactionsKey });
      const previous = qc.getQueriesData<Transaction[]>({ queryKey: transactionsKey });
      qc.setQueriesData<Transaction[]>({ queryKey: transactionsKey }, (old) =>
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
