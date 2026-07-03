import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createRecurringRule,
  deleteRecurringRule,
  listRecurringRules,
  processRecurringRules,
  updateRecurringRule,
  type RecurringRulePatch,
} from '@/lib/recurring';
import { recurringRulesKey, subscriptionsKey } from '@/hooks/queryKeys';
import { transactionsKey } from '@/hooks/useTransactions';

export { recurringRulesKey };

export function useRecurringRules() {
  return useQuery({
    queryKey: recurringRulesKey,
    queryFn: listRecurringRules,
  });
}

/** Kural oluşturma + backfill sonrası hem kural hem işlem listesini tazele. */
export function useCreateRecurringRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['createRecurringRule'],
    mutationFn: createRecurringRule,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: recurringRulesKey });
      void qc.invalidateQueries({ queryKey: transactionsKey });
      // Kural abonelik olabilir → subscription listesi/grafik + bildirim reschedule tetiklensin.
      void qc.invalidateQueries({ queryKey: subscriptionsKey });
    },
  });
}

export function useUpdateRecurringRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['updateRecurringRule'],
    mutationFn: ({ id, patch }: { id: string; patch: RecurringRulePatch }) =>
      updateRecurringRule(id, patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: recurringRulesKey });
      void qc.invalidateQueries({ queryKey: transactionsKey });
      // Abonelik dönüşümü (recurring↔subscription) listeyi + bildirimleri etkiler.
      void qc.invalidateQueries({ queryKey: subscriptionsKey });
    },
  });
}

export function useDeleteRecurringRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['deleteRecurringRule'],
    mutationFn: deleteRecurringRule,
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
