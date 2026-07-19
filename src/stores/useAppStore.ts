import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import i18n from '@/locales/i18n';
import { storage } from '@/lib/storage';

export type ThemeMode = 'light' | 'dark';
export type Locale = 'tr' | 'en';

/**
 * Günlük harcama hatırlatma tercihi KULLANICIYA ÖZELDİR (useLockStore'daki `lock.*.<userId>`
 * deseninin aynısı): SecureStore key'i `fynpad.reminders.daily.<userId>`. Global `app` persist
 * blob'unda tutulduğunda A hesabında kapatmak B hesabında da kapalı gösteriyordu.
 */
const dailyRemindersKey = (userId: string) => `reminders.daily.${userId}`;

export type AppState = {
  themeMode: ThemeMode;
  locale: Locale;
  dailyExpenseRemindersEnabled: boolean;
  /** tercihin ait olduğu kullanıcı (null = oturum yok / henüz hydrate edilmedi) */
  remindersUserId: string | null;
  /** persist rehydrate tamamlandı mı (splash'i tutmak için) */
  hydrated: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  setLocale: (locale: Locale) => void;
  /** Aktif kullanıcının anahtarına yazar. Oturum yoksa yalnızca bellekte kalır. */
  setDailyExpenseRemindersEnabled: (enabled: boolean) => Promise<void>;
  /** userId ile hydrate: null (çıkış) ise varsayılana döner. */
  hydrateDailyReminders: (userId: string | null) => Promise<void>;
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      themeMode: 'light',
      locale: (i18n.language as Locale) ?? 'en',
      dailyExpenseRemindersEnabled: false,
      remindersUserId: null,
      hydrated: false,
      setThemeMode: (themeMode) => set({ themeMode }),
      setLocale: (locale) => {
        set({ locale });
        void i18n.changeLanguage(locale);
      },
      setDailyExpenseRemindersEnabled: async (dailyExpenseRemindersEnabled) => {
        set({ dailyExpenseRemindersEnabled });
        const { remindersUserId } = get();
        if (remindersUserId) {
          await storage.setItem(dailyRemindersKey(remindersUserId), dailyExpenseRemindersEnabled ? '1' : '0');
        }
      },
      hydrateDailyReminders: async (userId) => {
        if (!userId) {
          set({ remindersUserId: null, dailyExpenseRemindersEnabled: false });
          return;
        }
        const value = await storage.getItem(dailyRemindersKey(userId));
        set({ remindersUserId: userId, dailyExpenseRemindersEnabled: value === '1' });
      },
    }),
    {
      name: 'app', // SecureStore key → fynpad.app
      storage: createJSONStorage(() => storage),
      // dailyExpenseRemindersEnabled BURADA YOK: kullanıcıya özel (yukarıdaki
      // `reminders.daily.<userId>` anahtarı). Global blob'da tutulursa hesaplar arası sızar.
      partialize: (state) => ({
        themeMode: state.themeMode,
        locale: state.locale,
      }),
      onRehydrateStorage: () => (state) => {
        // restore edilen dili i18n'e uygula, sonra hydrated işaretle
        if (state?.locale) {
          void i18n.changeLanguage(state.locale);
        }
        // geriye dönük uyumluluk: eski 'system' kaydını Light'a normalize et + geri yaz
        if ((state?.themeMode as string) === 'system') {
          useAppStore.setState({ themeMode: 'light', hydrated: true });
          return;
        }
        useAppStore.setState({ hydrated: true });
      },
    }
  )
);
