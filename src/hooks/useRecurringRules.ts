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
import { useAuthStore } from '@/stores/useAuthStore';

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
  return useOwnedMutation(
    (input: Parameters<typeof createRecurringRule>[0], ownerUserId): CreateRecurringRuleVars => ({
      ...input,
      ownerUserId,
    }),
    {
      mutationKey: ['createRecurringRule'],
      mutationFn: createRecurringRuleOwned,
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: recurringRulesKey });
        void qc.invalidateQueries({ queryKey: transactionsKey });
        // Kural abonelik olabilir → subscription listesi/grafik + bildirim reschedule tetiklensin.
        void qc.invalidateQueries({ queryKey: subscriptionsKey });
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
