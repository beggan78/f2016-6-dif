/**
 * Preferences Modal Component
 * 
 * Provides UI for managing user preferences including audio alert settings.
 * Features sound selection, volume control, and preview functionality.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Settings, Volume2, Play, Globe, Palette, Loader } from 'lucide-react';
import { usePreferences } from '../../contexts/PreferencesContext';
import { AUDIO_ALERT_OPTIONS, LANGUAGE_OPTIONS, THEME_OPTIONS } from '../../constants/audioAlerts';
import { audioAlertService } from '../../services/audioAlertService';
import { Button, Select, Slider } from './UI';

export function PreferencesModal({ isOpen, onClose }) {
  const { preferences, updateAudioPreferences, updateLanguagePreference, updateThemePreference, preferencesLoading } = usePreferences();
  const [tempPreferences, setTempPreferences] = useState(preferences);
  const [isTestingSound, setIsTestingSound] = useState(false);
  const [testError, setTestError] = useState(null);
  const [soundLoadingStates, setSoundLoadingStates] = useState({});

  // Sync temp preferences when modal opens or preferences change
  useEffect(() => {
    if (isOpen && !preferencesLoading) {
      setTempPreferences(preferences);
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
  }, [preferences, isOpen, preferencesLoading]);

  /**
   * Handle saving preferences and closing modal
   */
  const handleSave = useCallback(() => {
    updateAudioPreferences(tempPreferences.audio);
    updateLanguagePreference(tempPreferences.language);
    updateThemePreference(tempPreferences.theme);
    onClose();
  }, [tempPreferences, updateAudioPreferences, updateLanguagePreference, updateThemePreference, onClose]);

  /**
   * Handle canceling changes and closing modal
   */
  const handleCancel = useCallback(() => {
    setTempPreferences(preferences);
    setTestError(null);
    onClose();
  }, [preferences, onClose]);

  /**
   * Handle testing sound preview with loading state management
   */
  const handleTestSound = useCallback(async () => {
    if (isTestingSound || !tempPreferences.audio.enabled) return;
    
    const selectedSound = tempPreferences.audio.selectedSound;
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
      await audioAlertService.play(selectedSound, tempPreferences.audio.volume);
      
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
  }, [tempPreferences.audio, isTestingSound]);

  /**
   * Handle updating temp audio preferences with sound change optimization
   */
  const updateTempAudioPreferences = useCallback((updates) => {
    setTempPreferences(prev => ({ 
      ...prev, 
      audio: { ...prev.audio, ...updates }
    }));
    
    // If selected sound changed, update loading states and preload new sound
    if (updates.selectedSound && updates.selectedSound !== tempPreferences.audio.selectedSound) {
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
  }, [tempPreferences.audio]);

  /**
   * Handle updating temp language preference
   */
  const updateTempLanguagePreference = useCallback((language) => {
    setTempPreferences(prev => ({ ...prev, language }));
  }, []);

  /**
   * Handle updating temp theme preference
   */
  const updateTempThemePreference = useCallback((theme) => {
    setTempPreferences(prev => ({ ...prev, theme }));
  }, []);

  // Don't render if modal is closed
  if (!isOpen) return null;

  // Show loading state
  if (preferencesLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4">
          <div className="flex items-center justify-center space-x-3">
            <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-slate-100">Loading preferences...</span>
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
        <div className="flex items-center space-x-3 mb-6">
          <Settings className="h-6 w-6 text-sky-400" />
          <h2 id="preferences-title" className="text-xl font-semibold text-sky-300">Preferences</h2>
        </div>

        <div className="space-y-8">
          {/* Substitution Alerts Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3 border-b border-slate-600 pb-2">
              <Volume2 className="h-5 w-5 text-sky-400" />
              <h3 className="text-lg font-medium text-sky-200">Substitution Alerts</h3>
            </div>
            
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-slate-100">Enable Audio Alerts</label>
                <p className="text-xs text-slate-400 mt-1">Play sound when substitution timer reaches alert time</p>
              </div>
              <button
                onClick={() => updateTempAudioPreferences({ enabled: !tempPreferences.audio.enabled })}
                className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-800 ${
                  tempPreferences.audio.enabled ? 'bg-sky-600' : 'bg-slate-600'
                }`}
                aria-label={tempPreferences.audio.enabled ? 'Disable audio alerts' : 'Enable audio alerts'}
              >
                <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                  tempPreferences.audio.enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Sound Selection and Preview */}
            <div className={`space-y-3 transition-opacity ${!tempPreferences.audio.enabled ? 'opacity-50' : ''}`}>
              <div>
                <label className="block text-sm font-medium text-slate-100 mb-2">Alert Sound</label>
                <div className="flex space-x-2">
                  <div className="flex-1">
                    <Select 
                      value={tempPreferences.audio.selectedSound}
                      onChange={(value) => updateTempAudioPreferences({ selectedSound: value })}
                      options={soundOptions}
                      disabled={!tempPreferences.audio.enabled}
                    />
                  </div>
                  <Button
                    onClick={handleTestSound}
                    disabled={isTestingSound || !tempPreferences.audio.enabled}
                    variant="secondary"
                    size="md"
                    className="px-3"
                    title={soundLoadingStates[tempPreferences.audio.selectedSound]?.loading ? 
                           "Loading sound..." : "Preview selected sound"}
                  >
                    {soundLoadingStates[tempPreferences.audio.selectedSound]?.loading && !isTestingSound ? (
                      <Loader className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                {/* Test Error Message */}
                {testError && (
                  <p className="text-xs text-rose-400 mt-1">
                    Unable to preview sound: {testError}
                  </p>
                )}
                
                {/* Testing State */}
                {isTestingSound && !testError && (
                  <p className="text-xs text-emerald-400 mt-1">
                    Playing preview...
                  </p>
                )}
              </div>

              {/* Volume Control */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Volume2 className="h-4 w-4 text-slate-400" />
                    <label className="text-sm font-medium text-slate-100">Volume</label>
                  </div>
                  <span className="text-sm text-slate-400 font-mono">
                    {Math.round(tempPreferences.audio.volume * 100)}%
                  </span>
                </div>
                <Slider
                  value={tempPreferences.audio.volume}
                  onChange={(value) => updateTempAudioPreferences({ volume: value })}
                  min={0}
                  max={1}
                  step={0.05}
                  disabled={!tempPreferences.audio.enabled}
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
                <strong>Note:</strong> Audio alerts work alongside vibration alerts. 
                If your browser blocks audio playback, only vibration will be used.
                The alert timing is configured in the game setup screen.
              </p>
            </div>
          </div>

          {/* Language Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3 border-b border-slate-600 pb-2">
              <Globe className="h-5 w-5 text-sky-400" />
              <h3 className="text-lg font-medium text-sky-200">Language</h3>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-100 mb-2">Application Language</label>
              <Select 
                value={tempPreferences.language}
                onChange={updateTempLanguagePreference}
                options={languageOptions}
              />
              <p className="text-xs text-slate-400 mt-2">More languages coming soon!</p>
            </div>
          </div>

          {/* Theme Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3 border-b border-slate-600 pb-2">
              <Palette className="h-5 w-5 text-sky-400" />
              <h3 className="text-lg font-medium text-sky-200">UI Theme</h3>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-100 mb-2">Color Theme</label>
              <Select 
                value={tempPreferences.theme}
                onChange={updateTempThemePreference}
                options={themeOptions}
              />
              <p className="text-xs text-slate-400 mt-2">More themes coming soon!</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 mt-8 pt-4 border-t border-slate-600">
          <Button variant="secondary" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}