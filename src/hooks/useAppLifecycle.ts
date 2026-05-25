import { useEffect } from 'react';
import { AppState } from 'react-native';

import { queryClient } from '@/lib/queryClient';
import { processRecurringRules } from '@/lib/recurring';
import { transactionsKey } from '@/hooks/useTransactions';
import { useAuthStore } from '@/stores/useAuthStore';
import { useLockStore } from '@/stores/useLockStore';

/**
 * Foreground recurring-RPC için in-flight koruması: aynı anda birden fazla
 * `active` event'i (örn. native date picker / modal dönüşü) çift RPC tetiklemesin.
 * DB tarafındaki partial unique index + ON CONFLICT zaten yapısal garanti; bu sadece
 * gereksiz eşzamanlı çağrıyı önler.
 */
let isProcessingRecurring = false;

/**
 * Uygulama yaşam döngüsü:
 *  - background/inactive: kilit açık + oturum varsa hemen kilitler (finansal app standardı).
 *  - active (foreground): oturum varsa tekrarlayan işlemleri tetikler (pg_cron'a ek olarak
 *    offline-tolerant catch-up — RPC idempotent olduğundan çift üretim olmaz). Sessiz başarısızlık.
 */
export function useAppLifecycle(): void {
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        const { lockEnabled, lock } = useLockStore.getState();
        const session = useAuthStore.getState().session;
        if (lockEnabled && session) {
          lock();
        }
        return;
      }

      if (state === 'active') {
        const { session, initialized } = useAuthStore.getState();
        if (session && initialized && !isProcessingRecurring) {
          isProcessingRecurring = true;
          processRecurringRules()
            .then((created) => {
              if (created > 0) {
                void queryClient.invalidateQueries({ queryKey: transactionsKey });
              }
            })
            .catch(() => {
              /* sessiz — bir sonraki foreground / cron tekrar dener */
            })
            .finally(() => {
              isProcessingRecurring = false;
            });
        }
      }
    });
    return () => sub.remove();
  }, []);
}
