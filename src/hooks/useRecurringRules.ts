import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createRecurringRule,
  deleteRecurringRule,
  listRecurringRules,
  processRecurringRules,
  updateRecurringRule,
  type RecurringRulePatch,
} from '@/lib/recurring';
import { transactionsKey } from '@/hooks/useTransactions';

export const recurringRulesKey = ['recurring-rules'] as const;

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
    mutationFn: createRecurringRule,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: recurringRulesKey });
      void qc.invalidateQueries({ queryKey: transactionsKey });
    },
  });
}

export function useUpdateRecurringRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: RecurringRulePatch }) =>
      updateRecurringRule(id, patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: recurringRulesKey });
      void qc.invalidateQueries({ queryKey: transactionsKey });
    },
  });
}

export function useDeleteRecurringRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteRecurringRule,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: recurringRulesKey });
      // FK SET NULL ile transaction'lardaki recurring_rule_id değişir → repeat ikonu kaybolsun.
      void qc.invalidateQueries({ queryKey: transactionsKey });
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
