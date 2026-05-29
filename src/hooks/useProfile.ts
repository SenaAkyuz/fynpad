import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Currency } from '@/types';
import type { Locale } from '@/stores/useAppStore';

export type Profile = {
  id: string;
  email: string;
  fullName: string | null;
  defaultCurrency: Currency;
  locale: Locale;
  /** Opsiyonel aylık birikim hedefi (migration 0009). Belirlenmemişse null. */
  monthlySavingsTarget: number | null;
  monthlySavingsTargetCurrency: Currency | null;
};

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  default_currency: Currency;
  locale: Locale;
  monthly_savings_target: number | string | null;
  monthly_savings_target_currency: Currency | null;
};

function rowToProfile(r: ProfileRow): Profile {
  return {
    id: r.id,
    email: r.email,
    fullName: r.full_name,
    defaultCurrency: r.default_currency,
    locale: r.locale,
    // numeric PostgREST'te string gelebilir → Number; null korunur.
    monthlySavingsTarget: r.monthly_savings_target == null ? null : Number(r.monthly_savings_target),
    monthlySavingsTargetCurrency: r.monthly_savings_target_currency,
  };
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, email, full_name, default_currency, locale, monthly_savings_target, monthly_savings_target_currency'
    )
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data ? rowToProfile(data as ProfileRow) : null;
}

export function useProfile() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: () => fetchProfile(userId as string),
    enabled: !!userId,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationKey: ['updateProfile'],
    mutationFn: async (
      patch: Partial<{
        fullName: string;
        defaultCurrency: Currency;
        locale: Locale;
        monthlySavingsTarget: number | null;
        monthlySavingsTargetCurrency: Currency | null;
      }>
    ) => {
      const dbPatch: Record<string, unknown> = {};
      if (patch.fullName !== undefined) dbPatch.full_name = patch.fullName;
      if (patch.defaultCurrency !== undefined) dbPatch.default_currency = patch.defaultCurrency;
      if (patch.locale !== undefined) dbPatch.locale = patch.locale;
      // null → hedefi kaldır (kolon nullable). İkisi birlikte set/clear edilir.
      if (patch.monthlySavingsTarget !== undefined)
        dbPatch.monthly_savings_target = patch.monthlySavingsTarget;
      if (patch.monthlySavingsTargetCurrency !== undefined)
        dbPatch.monthly_savings_target_currency = patch.monthlySavingsTargetCurrency;
      const { error } = await supabase.from('profiles').update(dbPatch).eq('id', userId as string);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });
}
