/**
 * Preferences Context
 * 
 * Manages user preferences including audio alert settings with localStorage persistence.
 * Follows the same pattern as AuthContext for consistency.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DEFAULT_PREFERENCES, PREFERENCE_STORAGE_KEY } from '../constants/audioAlerts';
import { audioAlertService } from '../services/audioAlertService';

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
        
        // Save in new format and remove old key
        localStorage.setItem(PREFERENCE_STORAGE_KEY, JSON.stringify(migratedPreferences));
        localStorage.removeItem(oldKey);
        
        return migratedPreferences;
      }
    }

    return DEFAULT_PREFERENCES;
  } catch (error) {
    return DEFAULT_PREFERENCES;
  }
};

/**
 * Save preferences to localStorage with error handling
 */
const savePreferencesToStorage = (preferences) => {
  try {
    localStorage.setItem(PREFERENCE_STORAGE_KEY, JSON.stringify(preferences));
    return true;
  } catch (error) {
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