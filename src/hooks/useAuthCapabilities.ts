import { useQuery } from '@tanstack/react-query';

import { getPasswordStatus } from '@/lib/authCapabilities';
import { useAuthStore } from '@/stores/useAuthStore';

export const authCapabilitiesKey = ['auth-capabilities'] as const;

export function usePasswordStatus() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: [...authCapabilitiesKey, userId],
    queryFn: getPasswordStatus,
    enabled: !!userId,
  });
}
