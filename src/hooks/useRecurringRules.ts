import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ownedById, useOwnedMutation } from '@/hooks/useOwnedMutation';
import {
  createRecurringRule,
  listRecurringRules,
  processRecurringRules,
  type RecurringRulePatch,
} from '@/lib/recurring';
import {
  createRecurringRuleOwned,
  deleteRecurringRuleOwned,
  updateRecurringRuleOwned,
  type CreateRecurringRuleVars,
  type UpdateRecurringRuleVars,
} from '@/lib/ownedMutations';
import { recurringRulesKey, subscriptionsKey } from '@/hooks/queryKeys';
import { transactionsKey } from '@/hooks/useTransactions';
import { addTransactionToCache } from '@/lib/transactionCache';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Transaction } from '@/types';

export { recurringRulesKey };

export function useRecurringRules() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    // recurringRulesKey ÖNEK olarak kalır (invalidation'lar onu kullanır); key userId taşır.
    queryKey: [...recurringRulesKey, userId],
    queryFn: listRecurringRules,
    enabled: !!userId,
  });
}

type UpdateArgs = { id: string; patch: RecurringRulePatch };

/** Kural oluşturma + backfill sonrası hem kural hem işlem listesini tazele. */
export function useCreateRecurringRule() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const transactionScope = [...transactionsKey, userId] as const;
  return useOwnedMutation(
    (input: Parameters<typeof createRecurringRule>[0], ownerUserId): CreateRecurringRuleVars => ({
      ...input,
      ownerUserId,
    }),
    {
      mutationKey: ['createRecurringRule'],
      mutationFn: createRecurringRuleOwned,
      onMutate: async (input) => {
        await qc.cancelQueries({ queryKey: transactionScope });
        const previousTransactions = qc.getQueryData<Transaction[]>(transactionScope);
        // Optimistic işlem YALNIZCA bugüne bir kayıt yazılacaksa (initialTransactionDate
        // dolu). Geçmiş/gelecek başlangıçta initial null → bugüne kayıt yok; occurrence'lar
        // sunucu catch-up'ından geldiği için burada optimistic eklemek yalan gösterirdi.
        if (input.initialTransactionDate) {
          const now = new Date().toISOString();
          const optimistic: Transaction = {
            id: `temp_recurring_${input.clientRequestId}`,
            userId: input.ownerUserId,
            categoryId: input.categoryId,
            amount: input.amount,
            currency: input.currency,
            kind: input.kind,
            date: input.initialTransactionDate,
            note: input.note ?? null,
            recurringRuleId: `temp_rule_${input.clientRequestId}`,
            createdAt: now,
            updatedAt: now,
          };
          qc.setQueryData<Transaction[]>(transactionScope, (old) =>
            addTransactionToCache(old, optimistic)
          );
        }
        return { previousTransactions };
      },
      onError: (_error, _input, context) => {
        qc.setQueryData(transactionScope, context?.previousTransactions);
      },
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: recurringRulesKey });
        void qc.invalidateQueries({ queryKey: transactionsKey });
        // Kural abonelik olabilir → subscription listesi/grafik + bildirim reschedule tetiklensin.
        void qc.invalidateQueries({ queryKey: subscriptionsKey });
      },
      onSettled: () => {
        void qc.invalidateQueries({ queryKey: transactionsKey });
      },
    }
  );
}

export function useUpdateRecurringRule() {
  const qc = useQueryClient();
  return useOwnedMutation(
    (args: UpdateArgs, ownerUserId): UpdateRecurringRuleVars => ({ ...args, ownerUserId }),
    {
      mutationKey: ['updateRecurringRule'],
      mutationFn: updateRecurringRuleOwned,
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: recurringRulesKey });
        void qc.invalidateQueries({ queryKey: transactionsKey });
        // Abonelik dönüşümü (recurring↔subscription) listeyi + bildirimleri etkiler.
        void qc.invalidateQueries({ queryKey: subscriptionsKey });
      },
    }
  );
}

export function useDeleteRecurringRule() {
  const qc = useQueryClient();
  return useOwnedMutation(ownedById, {
    mutationKey: ['deleteRecurringRule'],
    mutationFn: deleteRecurringRuleOwned,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: recurringRulesKey });
      // FK SET NULL ile transaction'lardaki recurring_rule_id değişir → repeat ikonu kaybolsun.
      void qc.invalidateQueries({ queryKey: transactionsKey });
      // Silinen kural abonelik olabilir → liste + bildirimler güncellensin.
      void qc.invalidateQueries({ queryKey: subscriptionsKey });
    },
  });
}

/** Manuel/arka-plan tetikleyici — RPC çağrısı, üretilen işlem sayısını döner. */
export function useProcessRecurringRules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (targetDate?: string) => processRecurringRules(targetDate),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: transactionsKey });
    },
  });
}
