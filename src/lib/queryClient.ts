import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';

/**
 * Part 5: React Query istemcisi — data fetching/cache + optimistic updates.
 * Part 13.5: offline mod. Query'ler 'offlineFirst' → cache anında gösterilir (offline read).
 * Mutation'lar 'online' → offline'da hiç DENENMEZ, direkt paused olur (yanlış "Network request
 * failed" error state'e düşmez). Bağlantı gelince onlineManager event'i ile OTOMATİK resume olur.
 * AsyncStorage persister cache + paused mutation'ları kalıcı yapar (app kapanıp açılsa da kuyruk korunur).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 dakika fresh
      gcTime: 1000 * 60 * 60 * 24 * 7, // 7 gün cache'te tut (offline read için)
      networkMode: 'offlineFirst',
      refetchOnWindowFocus: false,
      retry: 2,
    },
    mutations: {
      // 'offlineFirst' offline'da bir kez dener → network error → error state (resume olmaz).
      // 'online' offline'da denemez bile → paused → online olunca otomatik gönderilir.
      networkMode: 'online',
      retry: 3,
    },
  },
});

/** Query cache + paused mutation'lar AsyncStorage'a yazılır (PersistQueryClientProvider kullanır). */
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'FYNPAD_QUERY_CACHE',
  throttleTime: 1000,
});
