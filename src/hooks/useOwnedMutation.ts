import {
  useMutation,
  type MutateOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { useCallback } from 'react';

import { useAuthStore } from '@/stores/useAuthStore';

/**
 * Sahiplik taşıyan mutation hook'u.
 *
 * `ownerUserId` mutation DEĞİŞKENLERİNİN içine yazılır (hook'un kapanışına değil): çevrimdışı
 * paused olan mutation diske yazılırken yalnızca değişkenler serialize edilir. Sahip bilgisi
 * değişkenlerde olmazsa restore edilen mutation kimin adına oluşturulduğunu bilemez ve çalışma
 * anındaki oturuma yazar (bkz. lib/mutationOwner.ts).
 *
 * `toOwned` sayesinde ÇAĞRI YERLERİ değişmez: ekranlar mutate'i eskisi gibi çağırır
 * (`deleteGoal.mutate(id)`), sahip alanı burada eklenir. Böylece bir çağrı yerinin
 * güncellenmesi unutulup sessizce sahipsiz payload üretmesi mümkün olmaz.
 *
 * Oturum yoksa mutation HİÇ tetiklenmez — sahipsiz bir kayıt kuyruğa giremez.
 */
export function useOwnedMutation<TArgs, TVars extends { ownerUserId: string }, TData, TCtx>(
  toOwned: (args: TArgs, ownerUserId: string) => TVars,
  options: UseMutationOptions<TData, Error, TVars, TCtx>
) {
  const ownerUserId = useAuthStore((s) => s.user?.id);
  const mutation = useMutation(options);
  const { mutate, mutateAsync } = mutation;

  const ownedMutate = useCallback(
    (args: TArgs, opts?: MutateOptions<TData, Error, TVars, TCtx>) => {
      if (!ownerUserId) return;
      mutate(toOwned(args, ownerUserId), opts);
    },
    [mutate, ownerUserId, toOwned]
  );

  const ownedMutateAsync = useCallback(
    (args: TArgs, opts?: MutateOptions<TData, Error, TVars, TCtx>) => {
      if (!ownerUserId) {
        return Promise.reject(new Error('NO_ACTIVE_SESSION'));
      }
      return mutateAsync(toOwned(args, ownerUserId), opts);
    },
    [mutateAsync, ownerUserId, toOwned]
  );

  return { ...mutation, mutate: ownedMutate, mutateAsync: ownedMutateAsync };
}

/** Yalnızca `id` alan mutation'lar (delete/adjust) için sahiplik sarmalayıcısı. */
export const ownedById = (id: string, ownerUserId: string) => ({ id, ownerUserId });
