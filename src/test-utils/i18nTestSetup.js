import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enConfiguration from '../locales/en/configuration.json';
import enCommon from '../locales/en/common.json';
import enGame from '../locales/en/game.json';
import enAuth from '../locales/en/auth.json';
import enProfile from '../locales/en/profile.json';
import enStatistics from '../locales/en/statistics.json';
import enTeam from '../locales/en/team.json';
import enShared from '../locales/en/shared.json';
import enModals from '../locales/en/modals.json';
import enReports from '../locales/en/reports.json';
import enConnectors from '../locales/en/connectors.json';
import enTactical from '../locales/en/tactical.json';
import enLive from '../locales/en/live.json';
import enNavigation from '../locales/en/navigation.json';
import svConfiguration from '../locales/sv/configuration.json';
import svCommon from '../locales/sv/common.json';
import svGame from '../locales/sv/game.json';
import svAuth from '../locales/sv/auth.json';
import svProfile from '../locales/sv/profile.json';
import svStatistics from '../locales/sv/statistics.json';
import svTeam from '../locales/sv/team.json';
import svShared from '../locales/sv/shared.json';
import svModals from '../locales/sv/modals.json';
import svReports from '../locales/sv/reports.json';
import svConnectors from '../locales/sv/connectors.json';
import svTactical from '../locales/sv/tactical.json';
import svLive from '../locales/sv/live.json';
import svNavigation from '../locales/sv/navigation.json';

/**
 * Creates a test instance of i18next for use in unit tests
 *
 * This creates a fresh i18n instance with all translations loaded,
 * preventing test pollution and ensuring consistent test behavior.
 *
 * Usage in tests:
 * ```javascript
 * import { I18nextProvider } from 'react-i18next';
 * import { createTestI18n } from '../../../test-utils/i18nTestSetup';
 *
 * const testI18n = createTestI18n();
 *
 * render(
 *   <I18nextProvider i18n={testI18n}>
 *     <YourComponent />
 *   </I18nextProvider>
 * );
 * ```
 *
 * @returns {Object} Configured i18next instance for testing
 */
export function createTestI18n() {
  const testI18n = i18n.createInstance();

  testI18n
    .use(initReactI18next)
    .init({
      lng: 'en',
      fallbackLng: 'en',
      defaultNS: 'common',
      resources: {
        en: {
          configuration: enConfiguration,
          common: enCommon,
          game: enGame,
          auth: enAuth,
          profile: enProfile,
          statistics: enStatistics,
          team: enTeam,
          shared: enShared,
          modals: enModals,
          reports: enReports,
          connectors: enConnectors,
          tactical: enTactical,
          live: enLive,
          navigation: enNavigation
        },
        sv: {
          configuration: svConfiguration,
          common: svCommon,
          game: svGame,
          auth: svAuth,
          profile: svProfile,
          statistics: svStatistics,
          team: svTeam,
          shared: svShared,
          modals: svModals,
          reports: svReports,
          connectors: svConnectors,
          tactical: svTactical,
          live: svLive,
          navigation: svNavigation
        }
      },
      interpolation: { escapeValue: false },
      react: { useSuspense: false }
    });

  return testI18n;
}
