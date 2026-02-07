import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enConfiguration from '../locales/en/configuration.json';
import enCommon from '../locales/en/common.json';
import enGame from '../locales/en/game.json';
import svConfiguration from '../locales/sv/configuration.json';
import svCommon from '../locales/sv/common.json';
import svGame from '../locales/sv/game.json';

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
      resources: {
        en: {
          configuration: enConfiguration,
          common: enCommon,
          game: enGame
        },
        sv: {
          configuration: svConfiguration,
          common: svCommon,
          game: svGame
        }
      },
      interpolation: { escapeValue: false },
      react: { useSuspense: false }
    });

  return testI18n;
}
