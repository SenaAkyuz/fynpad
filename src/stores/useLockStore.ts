import { create } from 'zustand';

import { storage } from '@/lib/storage';

/**
 * Cihaz kilidi durumu. Kalıcı alanlar (lockEnabled, biometricEnabled) SecureStore'da;
 * runtime alanları (isLocked, initialized) yalnızca bellekte tutulur.
 *
 * SecureStore key'leri (`storage` wrapper'ı `fynpad.` ekler):
 *   fynpad.lock.enabled, fynpad.lock.biometricEnabled
 */

const KEY_ENABLED = 'lock.enabled';
const KEY_BIOMETRIC = 'lock.biometricEnabled';

export type LockState = {
  /** kilit açık mı (SecureStore'dan restore) */
  lockEnabled: boolean;
  /** biyometrik etkin mi (SecureStore'dan restore) */
  biometricEnabled: boolean;
  /** runtime: true = lock screen görünüyor */
  isLocked: boolean;
  /** ilk SecureStore okuması tamamlandı mı */
  initialized: boolean;

  setLockEnabled: (v: boolean) => void;
  setBiometricEnabled: (v: boolean) => void;
  lock: () => void;
  unlock: () => void;
  hydrate: () => Promise<void>;
};

export const useLockStore = create<LockState>((set) => ({
  lockEnabled: false,
  biometricEnabled: false,
  isLocked: false,
  initialized: false,

  setLockEnabled: (v) => {
    set({ lockEnabled: v });
    void storage.setItem(KEY_ENABLED, v ? '1' : '0');
  },
  setBiometricEnabled: (v) => {
    set({ biometricEnabled: v });
    void storage.setItem(KEY_BIOMETRIC, v ? '1' : '0');
  },
  lock: () => set({ isLocked: true }),
  unlock: () => set({ isLocked: false }),

  hydrate: async () => {
    const [enabled, biometric] = await Promise.all([
      storage.getItem(KEY_ENABLED),
      storage.getItem(KEY_BIOMETRIC),
    ]);
    const lockEnabled = enabled === '1';
    // Soğuk açılışta kilit açıksa direkt kilitli başla (force-close → tekrar aç senaryosu).
    set({
      lockEnabled,
      biometricEnabled: biometric === '1',
      isLocked: lockEnabled,
      initialized: true,
    });
  },
}));
