import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';

import { useNetworkStore } from '@/stores/useNetworkStore';

let unsubscribe: (() => void) | null = null;

/**
 * isConnected: bir ağa bağlı mı · isInternetReachable: gerçekten internet var mı (DNS test).
 * isInternetReachable null olabilir (henüz bilinmiyor) — bu durumda offline sayma.
 */
function computeOnline(state: NetInfoState): boolean {
  return state.isConnected === true && state.isInternetReachable !== false;
}

/**
 * App başlangıcında çağrılır. Ağ durumunu hem görsel store'a hem React Query
 * `onlineManager`'ına yazar. onlineManager online'a geçince paused mutation'ları
 * OTOMATİK resume eder + stale query'leri refetch eder (manuel "sync" butonu yok).
 */
export function startNetworkMonitoring(): void {
  if (unsubscribe) {
    return;
  }

  const apply = (state: NetInfoState) => {
    const online = computeOnline(state);
    useNetworkStore.setState({ isOnline: online });
    onlineManager.setOnline(online);
  };

  void NetInfo.fetch().then((state) => {
    apply(state);
    useNetworkStore.setState({ isInitialized: true });
  });

  unsubscribe = NetInfo.addEventListener(apply);
}

export function stopNetworkMonitoring(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}
