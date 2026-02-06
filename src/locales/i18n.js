import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import enCommon from './en/common.json';
import enConfiguration from './en/configuration.json';
import svCommon from './sv/common.json';
import svConfiguration from './sv/configuration.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        configuration: enConfiguration
      },
      sv: {
        common: svCommon,
        configuration: svConfiguration
      }
    },
    lng: 'en', // Default language
    fallbackLng: 'en', // Fallback to English if translation missing
    defaultNS: 'common', // Default namespace
    debug: process.env.NODE_ENV === 'development', // Enable debug in development
    interpolation: {
      escapeValue: false // React already escapes values
    },
    react: {
      useSuspense: false // Disable suspense for React 19 compatibility
    }
  });

export default i18n;
