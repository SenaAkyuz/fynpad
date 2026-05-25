import { QueryClient } from '@tanstack/react-query';

/** Part 5: React Query istemcisi — data fetching/cache + optimistic updates. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // 1 dakika
      gcTime: 5 * 60_000, // 5 dakika
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});
