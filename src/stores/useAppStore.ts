import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import i18n from '@/locales/i18n';
import { storage } from '@/lib/storage';

export type ThemeMode = 'light' | 'dark';
export type Locale = 'tr' | 'en';

export type AppState = {
  themeMode: ThemeMode;
  locale: Locale;
  /** persist rehydrate tamamlandı mı (splash'i tutmak için) */
  hydrated: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  setLocale: (locale: Locale) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      themeMode: 'light',
      locale: (i18n.language as Locale) ?? 'en',
      hydrated: false,
      setThemeMode: (themeMode) => set({ themeMode }),
      setLocale: (locale) => {
        set({ locale });
        void i18n.changeLanguage(locale);
      },
    }),
    {
      name: 'app', // SecureStore key → fynpad.app
      storage: createJSONStorage(() => storage),
      partialize: (state) => ({ themeMode: state.themeMode, locale: state.locale }),
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
