import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import enCommon from './en/common.json';
import enConfiguration from './en/configuration.json';
import enAuth from './en/auth.json';
import enProfile from './en/profile.json';
import enGame from './en/game.json';
import enStatistics from './en/statistics.json';
import enTeam from './en/team.json';
import enShared from './en/shared.json';
import enModals from './en/modals.json';
import enReports from './en/reports.json';
import enConnectors from './en/connectors.json';
import enTactical from './en/tactical.json';
import enLive from './en/live.json';
import svCommon from './sv/common.json';
import svConfiguration from './sv/configuration.json';
import svAuth from './sv/auth.json';
import svProfile from './sv/profile.json';
import svGame from './sv/game.json';
import svStatistics from './sv/statistics.json';
import svTeam from './sv/team.json';
import svShared from './sv/shared.json';
import svModals from './sv/modals.json';
import svReports from './sv/reports.json';
import svConnectors from './sv/connectors.json';
import svTactical from './sv/tactical.json';
import svLive from './sv/live.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        configuration: enConfiguration,
        auth: enAuth,
        profile: enProfile,
        game: enGame,
        statistics: enStatistics,
        team: enTeam,
        shared: enShared,
        modals: enModals,
        reports: enReports,
        connectors: enConnectors,
        tactical: enTactical,
        live: enLive
      },
      sv: {
        common: svCommon,
        configuration: svConfiguration,
        auth: svAuth,
        profile: svProfile,
        game: svGame,
        statistics: svStatistics,
        team: svTeam,
        shared: svShared,
        modals: svModals,
        reports: svReports,
        connectors: svConnectors,
        tactical: svTactical,
        live: svLive
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
