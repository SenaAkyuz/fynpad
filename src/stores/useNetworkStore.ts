import { create } from 'zustand';

/**
 * Ağ durumu (Part 13.5). UI (offline banner, quick-add hint, auth disable) bunu okur.
 * React Query'nin kendi `onlineManager`'ı ayrıca networkStatus.ts'te NetInfo'ya bağlanır —
 * bu store sadece görsel katman içindir, mutation resume mantığı onlineManager'a aittir.
 */
type NetworkState = {
  /** cihaz internete ulaşabiliyor mu */
  isOnline: boolean;
  /** ilk NetInfo.fetch tamamlandı mı (banner'ı erken/yanlış göstermemek için) */
  isInitialized: boolean;
};

export const useNetworkStore = create<NetworkState>(() => ({
  isOnline: true, // optimistic default — ilk fetch'e kadar banner gösterme
  isInitialized: false,
}));
