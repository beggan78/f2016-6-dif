/**
 * Preferences Context
 * 
 * Manages user preferences including audio alert settings with localStorage persistence.
 * Follows the same pattern as AuthContext for consistency.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DEFAULT_PREFERENCES, PREFERENCE_STORAGE_KEY } from '../constants/audioAlerts';

const PreferencesContext = createContext({
  // All preferences state
  preferences: DEFAULT_PREFERENCES,
  
  // Audio preferences state (for backward compatibility)
  audioPreferences: DEFAULT_PREFERENCES.audio,
  
  // Preference management functions
  updatePreferences: async () => {},
  updateAudioPreferences: async () => {},
  updateLanguagePreference: async () => {},
  updateThemePreference: async () => {},
  resetPreferences: () => {},
  resetAudioPreferences: () => {},
  
  // Loading state
  preferencesLoading: true,
});

/**
 * Custom hook to access preferences context
 * Throws error if used outside of PreferencesProvider
 */
export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};

/**
 * Simple debug logging for development
 */
const debugLog = (message, data = null, isError = false) => {
  if (process.env.NODE_ENV === 'development') {
    const timestamp = new Date().toISOString();
    const prefix = isError ? '❌' : '✅';
    console.log(`${prefix} [PreferencesContext ${timestamp}] ${message}`, data || '');
  }
};

/**
 * Load preferences from localStorage with backward compatibility
 */
const loadPreferencesFromStorage = () => {
  try {
    // Try to load new format first
    const newStoredPrefs = localStorage.getItem(PREFERENCE_STORAGE_KEY);
    if (newStoredPrefs) {
      const parsed = JSON.parse(newStoredPrefs);
      if (typeof parsed === 'object' && parsed !== null && parsed.audio) {
        // New format found - merge with defaults to ensure completeness
        const preferences = {
          audio: { ...DEFAULT_PREFERENCES.audio, ...parsed.audio },
          language: parsed.language || DEFAULT_PREFERENCES.language,
          theme: parsed.theme || DEFAULT_PREFERENCES.theme
        };
        debugLog('New format preferences loaded from localStorage', preferences);
        return preferences;
      }
    }

    // Try to load old format for backward compatibility
    const oldKey = 'sport-wizard-audio-preferences';
    const oldStoredPrefs = localStorage.getItem(oldKey);
    if (oldStoredPrefs) {
      const parsed = JSON.parse(oldStoredPrefs);
      if (typeof parsed === 'object' && parsed !== null) {
        // Old format found - migrate to new structure
        const migratedPreferences = {
          audio: { ...DEFAULT_PREFERENCES.audio, ...parsed },
          language: DEFAULT_PREFERENCES.language,
          theme: DEFAULT_PREFERENCES.theme
        };
        debugLog('Migrated old format preferences to new structure', migratedPreferences);
        
        // Save in new format and remove old key
        localStorage.setItem(PREFERENCE_STORAGE_KEY, JSON.stringify(migratedPreferences));
        localStorage.removeItem(oldKey);
        
        return migratedPreferences;
      }
    }

    debugLog('No stored preferences found, using defaults');
    return DEFAULT_PREFERENCES;
  } catch (error) {
    debugLog('Failed to load preferences from localStorage', error.message, true);
    return DEFAULT_PREFERENCES;
  }
};

/**
 * Save preferences to localStorage with error handling
 */
const savePreferencesToStorage = (preferences) => {
  try {
    localStorage.setItem(PREFERENCE_STORAGE_KEY, JSON.stringify(preferences));
    debugLog('Preferences saved to localStorage', preferences);
    return true;
  } catch (error) {
    debugLog('Failed to save preferences to localStorage', error.message, true);
    return false;
  }
};

/**
 * PreferencesProvider component
 * Manages all preferences state and provides context to child components
 */
export function PreferencesProvider({ children }) {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [preferencesLoading, setPreferencesLoading] = useState(true);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const loadPreferences = () => {
      try {
        const storedPreferences = loadPreferencesFromStorage();
        setPreferences(storedPreferences);
      } catch (error) {
        debugLog('Error during preferences loading', error.message, true);
        // Keep default preferences on error
      } finally {
        setPreferencesLoading(false);
      }
    };

    loadPreferences();
  }, []);

  // Save preferences to localStorage whenever they change (after initial load)
  useEffect(() => {
    if (!preferencesLoading) {
      const saveSuccess = savePreferencesToStorage(preferences);
      if (!saveSuccess) {
        debugLog('Failed to persist preferences changes', null, true);
      }
    }
  }, [preferences, preferencesLoading]);

  /**
   * Update all preferences with partial updates
   * @param {Object} updates - Partial preferences object to merge
   */
  const updatePreferences = useCallback((updates) => {
    if (typeof updates !== 'object' || updates === null) {
      debugLog('Invalid preferences update format', updates, true);
      return;
    }

    setPreferences(prev => {
      const newPreferences = { ...prev, ...updates };
      debugLog('Preferences updated', newPreferences);
      return newPreferences;
    });
  }, []);

  /**
   * Update audio preferences with partial updates (backward compatibility)
   * @param {Object} updates - Partial audio preferences object to merge
   */
  const updateAudioPreferences = useCallback((updates) => {
    if (typeof updates !== 'object' || updates === null) {
      debugLog('Invalid audio preferences update format', updates, true);
      return;
    }

    setPreferences(prev => {
      const newAudioPrefs = { ...prev.audio, ...updates };
      
      // Validate specific preference values
      if (typeof newAudioPrefs.enabled !== 'boolean') {
        debugLog('Invalid enabled value, keeping previous', newAudioPrefs.enabled, true);
        newAudioPrefs.enabled = prev.audio.enabled;
      }
      
      if (typeof newAudioPrefs.volume !== 'number' || 
          newAudioPrefs.volume < 0 || 
          newAudioPrefs.volume > 1) {
        debugLog('Invalid volume value, keeping previous', newAudioPrefs.volume, true);
        newAudioPrefs.volume = prev.audio.volume;
      }
      
      if (typeof newAudioPrefs.selectedSound !== 'string' || 
          !newAudioPrefs.selectedSound.trim()) {
        debugLog('Invalid selectedSound value, keeping previous', newAudioPrefs.selectedSound, true);
        newAudioPrefs.selectedSound = prev.audio.selectedSound;
      }
      
      const newPreferences = { ...prev, audio: newAudioPrefs };
      debugLog('Audio preferences updated', newAudioPrefs);
      return newPreferences;
    });
  }, []);

  /**
   * Update language preference
   * @param {string} language - Language code
   */
  const updateLanguagePreference = useCallback((language) => {
    if (typeof language !== 'string') {
      debugLog('Invalid language value', language, true);
      return;
    }
    
    setPreferences(prev => ({
      ...prev,
      language
    }));
    debugLog('Language preference updated', language);
  }, []);

  /**
   * Update theme preference
   * @param {string} theme - Theme identifier
   */
  const updateThemePreference = useCallback((theme) => {
    if (typeof theme !== 'string') {
      debugLog('Invalid theme value', theme, true);
      return;
    }
    
    setPreferences(prev => ({
      ...prev,
      theme
    }));
    debugLog('Theme preference updated', theme);
  }, []);

  /**
   * Reset all preferences to defaults
   */
  const resetPreferences = useCallback(() => {
    debugLog('Resetting all preferences to defaults');
    setPreferences(DEFAULT_PREFERENCES);
  }, []);

  /**
   * Reset audio preferences to defaults (backward compatibility)
   */
  const resetAudioPreferences = useCallback(() => {
    debugLog('Resetting audio preferences to defaults');
    setPreferences(prev => ({
      ...prev,
      audio: DEFAULT_PREFERENCES.audio
    }));
  }, []);

  const contextValue = {
    // State
    preferences,
    audioPreferences: preferences.audio, // For backward compatibility
    preferencesLoading,
    
    // Actions
    updatePreferences,
    updateAudioPreferences,
    updateLanguagePreference,
    updateThemePreference,
    resetPreferences,
    resetAudioPreferences,
  };

  return (
    <PreferencesContext.Provider value={contextValue}>
      {children}
    </PreferencesContext.Provider>
  );
}