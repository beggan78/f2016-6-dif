import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePreferences } from './PreferencesContext';

/**
 * I18nSync Component
 *
 * Synchronizes the user's language preference from PreferencesContext with i18next.
 * This ensures that when the user changes their language preference in the app settings,
 * the i18n system automatically switches to the selected language.
 *
 * Usage:
 * - Place this component inside PreferencesProvider in App.js
 * - It will automatically listen for language preference changes
 * - No props required - uses context values
 */
export function I18nSync() {
  const { preferences } = usePreferences();
  const { i18n } = useTranslation();

  useEffect(() => {
    // Sync i18n language with user preference
    if (preferences.language && i18n.language !== preferences.language) {
      i18n.changeLanguage(preferences.language);
    }
  }, [preferences.language, i18n]);

  // This component doesn't render anything - it just handles synchronization
  return null;
}
