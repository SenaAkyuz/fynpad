import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import i18n from '@/locales/i18n';
import { secureStorage, storage } from '@/lib/storage';
import type { Currency } from '@/types';

export type ThemeMode = 'light' | 'dark';
export type Locale = 'tr' | 'en';

/**
 * Günlük harcama hatırlatma tercihi KULLANICIYA ÖZELDİR (useLockStore'daki `lock.*.<userId>`
 * deseninin aynısı): SecureStore key'i `fynpad.reminders.daily.<userId>`. Global `app` persist
 * blob'unda tutulduğunda A hesabında kapatmak B hesabında da kapalı gösteriyordu.
 */
const dailyRemindersKey = (userId: string) => `reminders.daily.${userId}`;
const reportingCurrencyKey = (userId: string) => `reporting.currency.${userId}`;

export type AppState = {
  themeMode: ThemeMode;
  locale: Locale;
  dailyExpenseRemindersEnabled: boolean;
  /** tercihin ait olduğu kullanıcı (null = oturum yok / henüz hydrate edilmedi) */
  remindersUserId: string | null;
  reportingCurrency: Currency | null;
  reportingCurrencyUserId: string | null;
  /**
   * UMP consent kararı reklam isteğine izin veriyor mu (bkz. lib/adsConsent → getConsentReady).
   * Başlangıç `false`: consent daha bilinmiyorsa HİÇBİR reklam (SDK init, banner, interstitial)
   * başlatılmaz. Persist EDİLMEZ — her açılışta consent akışından yeniden türetilir.
   */
  adsAllowed: boolean;
  /** persist rehydrate tamamlandı mı (splash'i tutmak için) */
  hydrated: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  setLocale: (locale: Locale) => void;
  /**
   * Aktif kullanıcının anahtarına yazar. Oturum yoksa yalnızca bellekte kalır.
   * Diske YAZILAMAZSA bellekteki değeri geri alır ve `false` döner — çağıran taraf
   * kullanıcıya hata göstermeli (bkz. app/reminders.tsx).
   */
  setDailyExpenseRemindersEnabled: (enabled: boolean) => Promise<boolean>;
  /** userId ile hydrate: null (çıkış) ise varsayılana döner. */
  hydrateDailyReminders: (userId: string | null) => Promise<void>;
  setReportingCurrency: (currency: Currency) => Promise<void>;
  hydrateReportingCurrency: (userId: string | null) => Promise<void>;
  setAdsAllowed: (allowed: boolean) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      themeMode: 'light',
      locale: (i18n.language as Locale) ?? 'en',
      dailyExpenseRemindersEnabled: false,
      remindersUserId: null,
      reportingCurrency: null,
      reportingCurrencyUserId: null,
      adsAllowed: false,
      hydrated: false,
      setThemeMode: (themeMode) => set({ themeMode }),
      setAdsAllowed: (adsAllowed) => set({ adsAllowed }),
      setLocale: (locale) => {
        set({ locale });
        void i18n.changeLanguage(locale);
      },
      setDailyExpenseRemindersEnabled: async (dailyExpenseRemindersEnabled) => {
        const previous = get().dailyExpenseRemindersEnabled;
        set({ dailyExpenseRemindersEnabled });
        const { remindersUserId } = get();
        if (!remindersUserId) {
          return true;
        }
        // `storage` yazma hatalarını YUTUYOR: disk yazımı sessizce başarısız olunca UI
        // "açık" gösteriyor, uygulama yeniden açılınca tercih kapalı dönüyordu. Bu tek
        // çağrı için hata bildiren + geri okuyup doğrulayan varyant kullanılır
        // (genel `storage` davranışı değişmeden — bkz. lib/storage.ts).
        try {
          await secureStorage.setItem(
            dailyRemindersKey(remindersUserId),
            dailyExpenseRemindersEnabled ? '1' : '0'
          );
          return true;
        } catch (e) {
          if (__DEV__) console.warn('[FynPad/app] reminder preference write failed:', e);
          // UI gerçeği yansıtsın: diske yazılamadıysa görünen değeri geri al.
          set({ dailyExpenseRemindersEnabled: previous });
          return false;
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
      setReportingCurrency: async (reportingCurrency) => {
        const { reportingCurrencyUserId } = get();
        set({ reportingCurrency });
        if (reportingCurrencyUserId) {
          await secureStorage.setItem(
            reportingCurrencyKey(reportingCurrencyUserId),
            reportingCurrency
          );
        }
      },
      hydrateReportingCurrency: async (userId) => {
        if (!userId) {
          set({ reportingCurrencyUserId: null, reportingCurrency: null });
          return;
        }
        const stored = await storage.getItem(reportingCurrencyKey(userId));
        const reportingCurrency: Currency | null =
          stored === 'TRY' || stored === 'USD' || stored === 'EUR' ? stored : null;
        set({ reportingCurrencyUserId: userId, reportingCurrency });
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
