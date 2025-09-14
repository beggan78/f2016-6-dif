import { useState, useCallback } from 'react';
import { audioAlertService } from '../services/audioAlertService';

/**
 * Hook for managing audio alerts and wake lock functionality
 *
 * Handles:
 * - Wake lock management (prevents screen from sleeping during match)
 * - Audio alert playback with vibration
 * - Integration with audio preferences from context
 *
 * @param {Object} audioPreferences - Audio preferences from PreferencesContext
 * @returns {Object} Audio and wake lock state and handlers
 */
export function useMatchAudio(audioPreferences = {}) {
  // Wake lock state
  const [wakeLock, setWakeLock] = useState(null);

  // Wake lock helper functions
  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator && !wakeLock) {
      try {
        const newWakeLock = await navigator.wakeLock.request('screen');
        setWakeLock(newWakeLock);
      } catch (err) {
        console.warn('Wake lock request failed:', err);
      }
    }
  }, [wakeLock]);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLock) {
      try {
        await wakeLock.release();
        setWakeLock(null);
      } catch (err) {
        console.warn('Wake lock release failed:', err);
      }
    }
  }, [wakeLock]);

  /**
   * Audio alert function - triggers substitution alerts (audio + vibration)
   * Called by visual timer logic in useTimers.js when sub timer reaches alertMinutes threshold
   * Replaces old setTimeout-based timer system for better synchronization
   */
  const playAlertSounds = useCallback(async () => {
    // Vibration alert
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([1000, 200, 1000]);
      } catch (error) {
        // Silently handle vibration errors
      }
    }

    // Audio alert
    if (audioPreferences.enabled) {
      try {
        await audioAlertService.play(
          audioPreferences.selectedSound,
          audioPreferences.volume
        );
      } catch (error) {
        console.error('[AUDIO_ALERT] Audio playback failed:', error.message);
      }
    }
  }, [audioPreferences]);

  return {
    // Wake lock state
    wakeLock,

    // Wake lock actions
    requestWakeLock,
    releaseWakeLock,

    // Audio actions
    playAlertSounds,

    // Computed state
    hasWakeLock: !!wakeLock,
  };
}