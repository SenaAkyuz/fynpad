import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@/locales/en.json';
import tr from '@/locales/tr.json';

const deviceLanguage = Localization.getLocales()[0]?.languageCode;

// eslint-disable-next-line import/no-named-as-default-member -- i18n.use() default instance API
i18n.use(initReactI18next).init({
  resources: {
    tr: { translation: tr },
    en: { translation: en },
  },
  lng: deviceLanguage === 'tr' ? 'tr' : 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
