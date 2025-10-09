/**
 * Preferences Context
 *
 * Manages user preferences including audio alert settings with localStorage persistence.
 * Follows the same pattern as AuthContext for consistency.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DEFAULT_PREFERENCES, PREFERENCE_STORAGE_KEY } from '../constants/audioAlerts';
import { audioAlertService } from '../services/audioAlertService';
import { createPersistenceManager } from '../utils/persistenceManager';
import { STORAGE_KEYS } from '../constants/storageKeys';

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


// Create persistence managers
const preferencesPersistence = createPersistenceManager(PREFERENCE_STORAGE_KEY, DEFAULT_PREFERENCES);
const oldPreferencesPersistence = createPersistenceManager(STORAGE_KEYS.AUDIO_PREFERENCES_LEGACY, {});

/**
 * PreferencesProvider component
 * Manages all preferences state and provides context to child components
 */
export function PreferencesProvider({ children }) {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [preferencesLoading, setPreferencesLoading] = useState(true);

  // Load preferences from PersistenceManager on mount with migration support
  useEffect(() => {
    const loadPreferences = () => {
      try {
        // Try to load new format first
        const stored = preferencesPersistence.loadState();
        if (stored && stored.audio) {
          // New format found - merge with defaults to ensure completeness
          const preferences = {
            audio: { ...DEFAULT_PREFERENCES.audio, ...stored.audio },
            language: stored.language || DEFAULT_PREFERENCES.language,
            theme: stored.theme || DEFAULT_PREFERENCES.theme
          };
          setPreferences(preferences);
        } else {
          // Try to load old format for backward compatibility
          const oldStored = oldPreferencesPersistence.loadState();
          if (oldStored && Object.keys(oldStored).length > 0) {
            // Old format found - migrate to new structure
            const migratedPreferences = {
              audio: { ...DEFAULT_PREFERENCES.audio, ...oldStored },
              language: DEFAULT_PREFERENCES.language,
              theme: DEFAULT_PREFERENCES.theme
            };

            // Save in new format and remove old key
            preferencesPersistence.saveState(migratedPreferences);
            oldPreferencesPersistence.clearState();

            setPreferences(migratedPreferences);
          } else {
            // No stored preferences, use defaults
            setPreferences(DEFAULT_PREFERENCES);
          }
        }
      } catch (error) {
        // Keep default preferences on error
      } finally {
        setPreferencesLoading(false);
      }
    };

    loadPreferences();
  }, []);

  // Save preferences to PersistenceManager whenever they change (after initial load)
  useEffect(() => {
    if (!preferencesLoading) {
      const saveSuccess = preferencesPersistence.saveState(preferences);
      if (!saveSuccess) {
        console.warn('⚠️  Failed to save preferences to localStorage. Preferences may not persist between sessions.');
      }
    }
  }, [preferences, preferencesLoading]);

  /**
   * Update all preferences with partial updates
   * @param {Object} updates - Partial preferences object to merge
   */
  const updatePreferences = useCallback((updates) => {
    if (typeof updates !== 'object' || updates === null) {
      return;
    }

    setPreferences(prev => {
      const newPreferences = { ...prev, ...updates };
      return newPreferences;
    });
  }, []);

  /**
   * Update audio preferences with partial updates (backward compatibility)
   * @param {Object} updates - Partial audio preferences object to merge
   */
  const updateAudioPreferences = useCallback((updates) => {
    if (typeof updates !== 'object' || updates === null) {
      return;
    }

    setPreferences(prev => {
      const newAudioPrefs = { ...prev.audio, ...updates };
      
      // Validate specific preference values
      if (typeof newAudioPrefs.enabled !== 'boolean') {
        newAudioPrefs.enabled = prev.audio.enabled;
      }
      
      if (typeof newAudioPrefs.volume !== 'number' || 
          newAudioPrefs.volume < 0 || 
          newAudioPrefs.volume > 1) {
        newAudioPrefs.volume = prev.audio.volume;
      }
      
      if (typeof newAudioPrefs.selectedSound !== 'string' || 
          !newAudioPrefs.selectedSound.trim()) {
        newAudioPrefs.selectedSound = prev.audio.selectedSound;
      }
      
      // Notify audio service if selected sound changed
      if (updates.selectedSound && updates.selectedSound !== prev.audio.selectedSound) {
        audioAlertService.updateSelectedSound(updates.selectedSound);
      }
      
      const newPreferences = { ...prev, audio: newAudioPrefs };
      return newPreferences;
    });
  }, []);

  /**
   * Update language preference
   * @param {string} language - Language code
   */
  const updateLanguagePreference = useCallback((language) => {
    if (typeof language !== 'string') {
      return;
    }
    
    setPreferences(prev => ({
      ...prev,
      language
    }));
  }, []);

  /**
   * Update theme preference
   * @param {string} theme - Theme identifier
   */
  const updateThemePreference = useCallback((theme) => {
    if (typeof theme !== 'string') {
      return;
    }
    
    setPreferences(prev => ({
      ...prev,
      theme
    }));
  }, []);

  /**
   * Reset all preferences to defaults
   */
  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
  }, []);

  /**
   * Reset audio preferences to defaults (backward compatibility)
   */
  const resetAudioPreferences = useCallback(() => {
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