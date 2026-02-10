/**
 * Preferences Modal Component
 *
 * Provides UI for managing user preferences including audio alert settings.
 * Features sound selection, volume control, and preview functionality.
 * All changes are auto-saved immediately to the preferences context.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Volume2, Play, Globe, Palette, Loader, X } from 'lucide-react';
import { usePreferences } from '../../contexts/PreferencesContext';
import { AUDIO_ALERT_OPTIONS, LANGUAGE_OPTIONS, THEME_OPTIONS } from '../../constants/audioAlerts';
import { audioAlertService } from '../../services/audioAlertService';
import { Select, Slider } from './UI';

export function PreferencesModal({ isOpen, onClose }) {
  const { t } = useTranslation('modals');
  const { preferences, updateAudioPreferences, updateLanguagePreference, updateThemePreference, preferencesLoading } = usePreferences();
  const [isTestingSound, setIsTestingSound] = useState(false);
  const [testError, setTestError] = useState(null);
  const [soundLoadingStates, setSoundLoadingStates] = useState({});

  // Initialize state when modal opens
  useEffect(() => {
    if (isOpen && !preferencesLoading) {
      setTestError(null);

      // Trigger background preloading of all sounds when modal opens
      audioAlertService.triggerFullPreload();

      // Initialize loading states
      const initialStates = {};
      AUDIO_ALERT_OPTIONS.forEach(option => {
        initialStates[option.value] = {
          loaded: audioAlertService.isLoaded(option.value),
          loading: audioAlertService.isLoading(option.value)
        };
      });
      setSoundLoadingStates(initialStates);
    }
  }, [isOpen, preferencesLoading]);

  /**
   * Handle testing sound preview with loading state management
   */
  const handleTestSound = useCallback(async () => {
    if (isTestingSound || !preferences.audio.enabled) return;

    const selectedSound = preferences.audio.selectedSound;
    setIsTestingSound(true);
    setTestError(null);

    // Update loading state for this specific sound
    setSoundLoadingStates(prev => ({
      ...prev,
      [selectedSound]: {
        ...prev[selectedSound],
        loading: !audioAlertService.isLoaded(selectedSound)
      }
    }));

    try {
      await audioAlertService.play(selectedSound, preferences.audio.volume);

      // Update state to reflect sound is now loaded
      setSoundLoadingStates(prev => ({
        ...prev,
        [selectedSound]: {
          loaded: true,
          loading: false
        }
      }));
    } catch (error) {
      console.error('Failed to test sound:', error);
      setTestError(error.message);

      // Update loading state on error
      setSoundLoadingStates(prev => ({
        ...prev,
        [selectedSound]: {
          loaded: false,
          loading: false
        }
      }));
    } finally {
      // Keep the testing state for a brief moment to provide visual feedback
      setTimeout(() => setIsTestingSound(false), 1000);
    }
  }, [preferences.audio, isTestingSound]);

  /**
   * Handle audio preference changes with immediate save and sound preloading
   */
  const handleAudioChange = useCallback((updates) => {
    updateAudioPreferences(updates);

    // If selected sound changed, update loading states and preload new sound
    if (updates.selectedSound && updates.selectedSound !== preferences.audio.selectedSound) {
      const newSound = updates.selectedSound;

      // Update loading state
      setSoundLoadingStates(prev => ({
        ...prev,
        [newSound]: {
          loaded: audioAlertService.isLoaded(newSound),
          loading: !audioAlertService.isLoaded(newSound)
        }
      }));

      // Preload the new sound if not already loaded
      if (!audioAlertService.isLoaded(newSound)) {
        const loadPromise = audioAlertService.loadSound(newSound, true);
        // Ensure loadSound returns a promise in all cases
        if (loadPromise && typeof loadPromise.then === 'function') {
          loadPromise.then(() => {
            setSoundLoadingStates(prev => ({
              ...prev,
              [newSound]: {
                loaded: true,
                loading: false
              }
            }));
          }).catch(() => {
            setSoundLoadingStates(prev => ({
              ...prev,
              [newSound]: {
                loaded: false,
                loading: false
              }
            }));
          });
        }
      }
    }
  }, [preferences.audio, updateAudioPreferences]);

  // Don't render if modal is closed
  if (!isOpen) return null;

  // Show loading state
  if (preferencesLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4">
          <div className="flex items-center justify-center space-x-3">
            <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-slate-100">{t('preferences.loadingPreferences')}</span>
          </div>
        </div>
      </div>
    );
  }

  // Prepare options for Select components
  const soundOptions = AUDIO_ALERT_OPTIONS.map(option => ({
    value: option.value,
    label: option.label
  }));

  const languageOptions = LANGUAGE_OPTIONS.map(option => ({
    value: option.value,
    label: option.label
  }));

  const themeOptions = THEME_OPTIONS.map(option => ({
    value: option.value,
    label: option.label
  }));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div role="dialog" aria-labelledby="preferences-title" className="bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto border border-slate-600">
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Settings className="h-6 w-6 text-sky-400" />
            <h2 id="preferences-title" className="text-xl font-semibold text-sky-300">{t('preferences.title')}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-800 rounded"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-8">
          {/* Substitution Alerts Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3 border-b border-slate-600 pb-2">
              <Volume2 className="h-5 w-5 text-sky-400" />
              <h3 className="text-lg font-medium text-sky-200">{t('preferences.substitutionAlerts')}</h3>
            </div>

            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-slate-100">{t('preferences.enableAudioAlerts')}</label>
                <p className="text-xs text-slate-400 mt-1">{t('preferences.enableAudioDescription')}</p>
              </div>
              <button
                onClick={() => handleAudioChange({ enabled: !preferences.audio.enabled })}
                className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-800 ${
                  preferences.audio.enabled ? 'bg-sky-600' : 'bg-slate-600'
                }`}
                aria-label={preferences.audio.enabled ? t('preferences.disableAudioLabel') : t('preferences.enableAudioLabel')}
              >
                <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                  preferences.audio.enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Sound Selection and Preview */}
            <div className={`space-y-3 transition-opacity ${!preferences.audio.enabled ? 'opacity-50' : ''}`}>
              <div>
                <label className="block text-sm font-medium text-slate-100 mb-2">{t('preferences.alertSound')}</label>
                <div className="flex space-x-2">
                  <div className="flex-1">
                    <Select
                      value={preferences.audio.selectedSound}
                      onChange={(value) => handleAudioChange({ selectedSound: value })}
                      options={soundOptions}
                      disabled={!preferences.audio.enabled}
                    />
                  </div>
                  <button
                    onClick={handleTestSound}
                    disabled={isTestingSound || !preferences.audio.enabled}
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-800"
                    title={soundLoadingStates[preferences.audio.selectedSound]?.loading ?
                           t('preferences.loadingSound') : t('preferences.previewSound')}
                  >
                    {soundLoadingStates[preferences.audio.selectedSound]?.loading && !isTestingSound ? (
                      <Loader className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Test Error Message */}
                {testError && (
                  <p className="text-xs text-rose-400 mt-1">
                    {t('preferences.unableToPreview', { error: testError })}
                  </p>
                )}

                {/* Testing State */}
                {isTestingSound && !testError && (
                  <p className="text-xs text-emerald-400 mt-1">
                    {t('preferences.playingPreview')}
                  </p>
                )}
              </div>

              {/* Volume Control */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Volume2 className="h-4 w-4 text-slate-400" />
                    <label className="text-sm font-medium text-slate-100">{t('preferences.volume')}</label>
                  </div>
                  <span className="text-sm text-slate-400 font-mono">
                    {Math.round(preferences.audio.volume * 100)}%
                  </span>
                </div>
                <Slider
                  value={preferences.audio.volume}
                  onChange={(value) => handleAudioChange({ volume: value })}
                  min={0}
                  max={1}
                  step={0.05}
                  disabled={!preferences.audio.enabled}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="bg-slate-700 rounded-lg p-3">
              <p className="text-xs text-slate-300 leading-relaxed">
                <strong>{t('preferences.noteLabel')}</strong> {t('preferences.audioNote')}
              </p>
            </div>
          </div>

          {/* Language Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3 border-b border-slate-600 pb-2">
              <Globe className="h-5 w-5 text-sky-400" />
              <h3 className="text-lg font-medium text-sky-200">{t('preferences.language')}</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-100 mb-2">{t('preferences.applicationLanguage')}</label>
              <Select
                value={preferences.language}
                onChange={updateLanguagePreference}
                options={languageOptions}
              />
              <p className="text-xs text-slate-400 mt-2">{t('preferences.moreLanguages')}</p>
            </div>
          </div>

          {/* Theme Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3 border-b border-slate-600 pb-2">
              <Palette className="h-5 w-5 text-sky-400" />
              <h3 className="text-lg font-medium text-sky-200">{t('preferences.uiTheme')}</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-100 mb-2">{t('preferences.colorTheme')}</label>
              <Select
                value={preferences.theme}
                onChange={updateThemePreference}
                options={themeOptions}
              />
              <p className="text-xs text-slate-400 mt-2">{t('preferences.moreThemes')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
