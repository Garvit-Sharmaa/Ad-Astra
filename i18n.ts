import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { resources } from './translations';
import { LANGUAGES } from './constants';

i18n
  // detect user language
  .use(LanguageDetector)
  // pass the i18n instance to react-i18next.
  .use(initReactI18next)
  // init i18next
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: LANGUAGES.map(l => l.code),
    debug: false,
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'healthAppLang', // Use existing localStorage key
    },
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;