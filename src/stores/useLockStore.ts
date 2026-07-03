import { create } from 'zustand';

import { storage } from '@/lib/storage';

/**
 * Cihaz kilidi durumu. Kalıcı alanlar (lockEnabled, biometricEnabled) SecureStore'da;
 * runtime alanları (isLocked, initialized) yalnızca bellekte tutulur.
 *
 * KİLİT KULLANICIYA ÖZELDİR: key'ler oturumdaki user id ile ayrılır → bir hesabın kilidi
 * başka bir hesaba UYGULANMAZ. SecureStore key'leri (`storage` wrapper'ı `fynpad.` ekler):
 *   fynpad.lock.enabled.<userId>, fynpad.lock.biometricEnabled.<userId>
 */

const enabledKey = (userId: string) => `lock.enabled.${userId}`;
const biometricKey = (userId: string) => `lock.biometricEnabled.${userId}`;

export type LockState = {
  /** kilit açık mı (SecureStore'dan restore) */
  lockEnabled: boolean;
  /** biyometrik etkin mi (SecureStore'dan restore) */
  biometricEnabled: boolean;
  /** runtime: true = lock screen görünüyor */
  isLocked: boolean;
  /** ilk SecureStore okuması tamamlandı mı */
  initialized: boolean;
  /** ayarların ait olduğu kullanıcı (setter'lar bu id ile yazar) */
  userId: string | null;

  setLockEnabled: (v: boolean) => void;
  setBiometricEnabled: (v: boolean) => void;
  lock: () => void;
  unlock: () => void;
  /** userId ile hydrate: null (çıkış) ise kilit sıfırlanır, aksi halde o kullanıcının ayarları okunur. */
  hydrate: (userId: string | null) => Promise<void>;
};

export const useLockStore = create<LockState>((set, get) => ({
  lockEnabled: false,
  biometricEnabled: false,
  isLocked: false,
  initialized: false,
  userId: null,

  setLockEnabled: (v) => {
    const { userId } = get();
    set({ lockEnabled: v });
    if (userId) void storage.setItem(enabledKey(userId), v ? '1' : '0');
  },
  setBiometricEnabled: (v) => {
    const { userId } = get();
    set({ biometricEnabled: v });
    if (userId) void storage.setItem(biometricKey(userId), v ? '1' : '0');
  },
  lock: () => set({ isLocked: true }),
  unlock: () => set({ isLocked: false }),

  hydrate: async (userId) => {
    // Oturum yoksa (çıkış yapılmış) kilit uygulanmaz — durumu sıfırla.
    if (!userId) {
      set({
        userId: null,
        lockEnabled: false,
        biometricEnabled: false,
        isLocked: false,
        initialized: true,
      });
      return;
    }
    const [enabled, biometric] = await Promise.all([
      storage.getItem(enabledKey(userId)),
      storage.getItem(biometricKey(userId)),
    ]);
    const lockEnabled = enabled === '1';
    // Soğuk açılışta kilit açıksa direkt kilitli başla (force-close → tekrar aç senaryosu).
    set({
      userId,
      lockEnabled,
      biometricEnabled: biometric === '1',
      isLocked: lockEnabled,
      initialized: true,
    });
  },
}));
