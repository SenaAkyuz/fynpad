import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { ownedById, useOwnedMutation } from '@/hooks/useOwnedMutation';
import { transactionsKey } from '@/hooks/useTransactions';
import { rescheduleAll } from '@/lib/notifications';
import {
  createSubscriptionOwned,
  deleteSubscriptionOwned,
  updateSubscriptionOwned,
  type CreateSubscriptionVars,
  type UpdateSubscriptionVars,
} from '@/lib/ownedMutations';
import {
  createSubscription,
  listSubscriptions,
  monthlySpendHistory,
  monthOverMonthPct,
  nextDueAcrossAll,
  totalMonthlySpend,
  type SubscriptionPatch,
} from '@/lib/subscriptions';
import { recurringRulesKey, subscriptionsKey } from '@/hooks/queryKeys';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Subscription } from '@/types';

export { subscriptionsKey };

export function useSubscriptions() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    // subscriptionsKey ÖNEK olarak kalır (invalidation'lar onu kullanır); key userId taşır.
    queryKey: [...subscriptionsKey, userId],
    queryFn: listSubscriptions,
    enabled: !!userId,
  });
}

/** Mutation sonrası: cache invalidate + bildirimleri yeniden schedule et (idempotent). */
async function refreshAndReschedule(): Promise<void> {
  const subs = await listSubscriptions();
  await rescheduleAll(subs);
}

export function useCreateSubscription() {
  const qc = useQueryClient();
  return useOwnedMutation(
    (input: Parameters<typeof createSubscription>[0], ownerUserId): CreateSubscriptionVars => ({
      ...input,
      ownerUserId,
    }),
    {
      mutationKey: ['createSubscription'],
      mutationFn: createSubscriptionOwned,
      onSuccess: async () => {
        void qc.invalidateQueries({ queryKey: subscriptionsKey });
        void qc.invalidateQueries({ queryKey: recurringRulesKey });
        void qc.invalidateQueries({ queryKey: transactionsKey });
        await refreshAndReschedule();
      },
    }
  );
}

export function useUpdateSubscription() {
  const qc = useQueryClient();
  return useOwnedMutation(
    (
      args: { id: string; patch: SubscriptionPatch },
      ownerUserId
    ): UpdateSubscriptionVars => ({ ...args, ownerUserId }),
    {
      mutationKey: ['updateSubscription'],
      mutationFn: updateSubscriptionOwned,
      onSuccess: async () => {
        void qc.invalidateQueries({ queryKey: subscriptionsKey });
        void qc.invalidateQueries({ queryKey: recurringRulesKey });
        void qc.invalidateQueries({ queryKey: transactionsKey });
        await refreshAndReschedule();
      },
    }
  );
}

export function useDeleteSubscription() {
  const qc = useQueryClient();
  return useOwnedMutation(ownedById, {
    mutationKey: ['deleteSubscription'],
    mutationFn: deleteSubscriptionOwned,
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
