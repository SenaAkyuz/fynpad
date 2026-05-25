import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { transactionsKey } from '@/hooks/useTransactions';
import { rescheduleAll } from '@/lib/notifications';
import {
  createSubscription,
  deleteSubscription,
  listSubscriptions,
  monthlySpendHistory,
  monthOverMonthPct,
  nextDueAcrossAll,
  totalMonthlySpend,
  updateSubscription,
  type SubscriptionPatch,
} from '@/lib/subscriptions';
import { recurringRulesKey } from '@/hooks/useRecurringRules';
import type { Subscription } from '@/types';

export const subscriptionsKey = ['subscriptions'] as const;

export function useSubscriptions() {
  return useQuery({
    queryKey: subscriptionsKey,
    queryFn: listSubscriptions,
  });
}

/** Mutation sonrası: cache invalidate + bildirimleri yeniden schedule et (idempotent). */
async function refreshAndReschedule(): Promise<void> {
  const subs = await listSubscriptions();
  await rescheduleAll(subs);
}

export function useCreateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createSubscription,
    onSuccess: async () => {
      void qc.invalidateQueries({ queryKey: subscriptionsKey });
      void qc.invalidateQueries({ queryKey: recurringRulesKey });
      void qc.invalidateQueries({ queryKey: transactionsKey });
      await refreshAndReschedule();
    },
  });
}

export function useUpdateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: SubscriptionPatch }) =>
      updateSubscription(id, patch),
    onSuccess: async () => {
      void qc.invalidateQueries({ queryKey: subscriptionsKey });
      void qc.invalidateQueries({ queryKey: recurringRulesKey });
      void qc.invalidateQueries({ queryKey: transactionsKey });
      await refreshAndReschedule();
    },
  });
}

export function useDeleteSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteSubscription,
    onSuccess: async () => {
      void qc.invalidateQueries({ queryKey: subscriptionsKey });
      void qc.invalidateQueries({ queryKey: recurringRulesKey });
      void qc.invalidateQueries({ queryKey: transactionsKey });
      // rescheduleAll önce hepsini iptal ettiği için silinen aboneliğin hatırlatmaları da temizlenir.
      await refreshAndReschedule();
    },
  });
}

/** Özet kart + grafik için türetilmiş değerler. */
export function useSubscriptionTotals(subs: Subscription[]) {
  return useMemo(
    () => ({
      monthly: totalMonthlySpend(subs),
      momPct: monthOverMonthPct(subs),
      growthHistory: monthlySpendHistory(subs, 7),
      nextDue: nextDueAcrossAll(subs),
      count: subs.length,
    }),
    [subs]
  );
}
