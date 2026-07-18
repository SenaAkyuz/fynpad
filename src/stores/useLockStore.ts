import { create } from 'zustand';

import { secureStorage, storage } from '@/lib/storage';

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

  /**
   * ASYNC ve await edilebilir: state YALNIZCA SecureStore yazması doğrulandıktan sonra
   * güncellenir. Eskiden senkrondu ve yazma fire-and-forget idi — `lockEnabled` bellekte
   * true olup diske hiç yazılmayabiliyor, uygulama yeniden başlayınca kilit kayboluyordu.
   * Başarısızlıkta FIRLATIR; çağıran taraf kullanıcıya hata gösterip toggle'ı geri almalı.
   */
  setLockEnabled: (v: boolean) => Promise<void>;
  setBiometricEnabled: (v: boolean) => Promise<void>;
  lock: () => void;
  unlock: () => void;
  /**
   * Bellek içi kilit durumunu sıfırlar (diske YAZMAZ). Oturum kapanırken kullanılır:
   * setter'lar artık aktif userId gerektirdiği için çıkış sonrası çağrılamaz.
   */
  resetLockState: () => void;
  /** userId ile hydrate: null (çıkış) ise kilit sıfırlanır, aksi halde o kullanıcının ayarları okunur. */
  hydrate: (userId: string | null) => Promise<void>;
};

export const useLockStore = create<LockState>((set, get) => ({
  lockEnabled: false,
  biometricEnabled: false,
  isLocked: false,
  initialized: false,
  userId: null,

  setLockEnabled: async (v) => {
    const { userId } = get();
    if (!userId) {
      throw new Error('NO_ACTIVE_USER');
    }
    // Önce kalıcılaştır (yazma geri okunarak doğrulanır), sonra state'i güncelle.
    await secureStorage.setItem(enabledKey(userId), v ? '1' : '0');
    set({ lockEnabled: v });
  },
  setBiometricEnabled: async (v) => {
    const { userId } = get();
    if (!userId) {
      throw new Error('NO_ACTIVE_USER');
    }
    await secureStorage.setItem(biometricKey(userId), v ? '1' : '0');
    set({ biometricEnabled: v });
  },
  lock: () => set({ isLocked: true }),
  unlock: () => set({ isLocked: false }),
  resetLockState: () =>
    set({ userId: null, lockEnabled: false, biometricEnabled: false, isLocked: false }),

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
