/**
 * Audio Alert Service
 * 
 * Manages audio playback for substitution alerts with preloading and error handling.
 * Provides methods for playing, stopping, and managing audio alert sounds.
 */

import { AUDIO_ALERT_OPTIONS } from '../constants/audioAlerts';

/**
 * Service class for handling audio alert playback with lazy loading optimization
 */
class AudioAlertService {
  constructor() {
    this.audioElements = new Map();
    this.loadingPromises = new Map();
    this.selectedSound = null;
    this.hasTriggeredFullPreload = false;
    
    // Initialize with minimal preloading
    this.initializeWithLazyLoading();
  }

  /**
   * Initialize service with lazy loading - only preload essential sounds
   * Called automatically during service initialization
   */
  initializeWithLazyLoading() {
    // Get user's currently selected sound from preferences (if available)
    const defaultSound = AUDIO_ALERT_OPTIONS.find(option => option.isDefault)?.value || 'bells-echo';
    
    try {
      // Try to get user's selected sound from localStorage
      const stored = localStorage.getItem('dif-coach-preferences');
      if (stored) {
        const preferences = JSON.parse(stored);
        this.selectedSound = preferences.audio?.selectedSound || defaultSound;
      } else {
        this.selectedSound = defaultSound;
      }
    } catch (error) {
      // Fallback to default if preferences can't be read
      this.selectedSound = defaultSound;
    }
    
    // Preload only the selected sound and default (if different)
    this.preloadEssentialSounds();
  }

  /**
   * Preload only the selected sound and default sound for instant playback
   */
  preloadEssentialSounds() {
    const defaultSound = AUDIO_ALERT_OPTIONS.find(option => option.isDefault)?.value || 'bells-echo';
    const soundsToPreload = [this.selectedSound];
    
    // Also preload default if it's different from selected
    if (defaultSound !== this.selectedSound) {
      soundsToPreload.push(defaultSound);
    }
    
    soundsToPreload.forEach(soundValue => {
      this.loadSound(soundValue, true); // true = immediate preload
    });
  }

  /**
   * Preload all remaining audio files for instant playback
   * Called when preferences modal opens or when full preload is needed
   */
  preloadAllSounds() {
    if (this.hasTriggeredFullPreload) {
      return; // Already triggered, don't do it again
    }
    
    this.hasTriggeredFullPreload = true;
    
    AUDIO_ALERT_OPTIONS.forEach(option => {
      if (!this.audioElements.has(option.value)) {
        // Load sound in background without blocking
        this.loadSound(option.value, false);
      }
    });
  }

  /**
   * Load a specific sound file on demand
   * @param {string} soundValue - The sound identifier
   * @param {boolean} isImmediate - Whether this is an immediate preload (affects priority)
   * @returns {Promise<void>} Promise that resolves when sound is loaded
   */
  loadSound(soundValue, isImmediate = false) {
    // Return existing audio element if already loaded
    if (this.audioElements.has(soundValue)) {
      return Promise.resolve();
    }
    
    // Return existing loading promise if already loading
    if (this.loadingPromises.has(soundValue)) {
      return this.loadingPromises.get(soundValue);
    }
    
    const option = AUDIO_ALERT_OPTIONS.find(opt => opt.value === soundValue);
    if (!option) {
      return Promise.reject(new Error(`Sound not found: ${soundValue}`));
    }
    
    const loadingPromise = new Promise((resolve, reject) => {
      try {
        const audio = new Audio();
        audio.preload = isImmediate ? 'auto' : 'metadata';
        
        // Use the webpack-processed fileUrl from ES6 imports
        audio.src = option.fileUrl;
        
        // Add error handling for individual audio files
        audio.addEventListener('error', (e) => {
          this.loadingPromises.delete(soundValue);
          reject(new Error(`Failed to load audio: ${soundValue}`));
        });
        
        // Audio file loaded successfully
        audio.addEventListener('canplaythrough', () => {
          this.audioElements.set(soundValue, audio);
          this.loadingPromises.delete(soundValue);
          resolve();
        });
        
        // Handle test environment where audio events may not fire
        if (process.env.NODE_ENV === 'test') {
          setTimeout(() => {
            if (!this.audioElements.has(soundValue)) {
              this.audioElements.set(soundValue, audio);
              this.loadingPromises.delete(soundValue);
              resolve();
            }
          }, 10);
        }
        
        // Start loading
        if (isImmediate) {
          // Check if load method exists and won't throw (not available in test environment)
          try {
            if (typeof audio.load === 'function') {
              audio.load();
            }
          } catch (loadError) {
            // Silently handle load errors in test environment
          }
        }
        
      } catch (error) {
        this.loadingPromises.delete(soundValue);
        reject(error);
      }
    });
    
    this.loadingPromises.set(soundValue, loadingPromise);
    return loadingPromise;
  }

  /**
   * Play a specific alert sound with lazy loading support
   * @param {string} soundValue - The sound identifier from AUDIO_ALERT_OPTIONS
   * @param {number} volume - Volume level (0.0 to 1.0), defaults to 0.7
   * @returns {Promise<void>} Resolves when audio starts playing
   * @throws {Error} If sound not found or playback fails
   */
  async play(soundValue, volume = 0.7) {
    // Check if audio is already loaded
    let audio = this.audioElements.get(soundValue);
    
    if (!audio) {
      // Audio not loaded, load it on-demand
      try {
        await this.loadSound(soundValue, true); // Load immediately
        audio = this.audioElements.get(soundValue);
        
        if (!audio) {
          throw new Error(`Failed to load sound: ${soundValue}`);
        }
      } catch (error) {
        throw new Error(`Sound not found: ${soundValue}`);
      }
    }

    // Clamp volume to valid range
    audio.volume = Math.max(0, Math.min(1, volume));
    
    try {
      // Reset audio to beginning for repeated plays
      audio.currentTime = 0;
      
      // Play the audio - this returns a Promise in modern browsers
      await audio.play();
    } catch (error) {
      // Handle various audio playback errors
      if (error.name === 'NotAllowedError') {
        throw new Error('Audio playback blocked by browser. User interaction may be required.');
      } else if (error.name === 'NotSupportedError') {
        throw new Error('Audio format not supported by browser');
      } else {
        throw new Error(`Failed to play audio: ${error.message}`);
      }
    }
  }

  /**
   * Stop a specific alert sound
   * @param {string} soundValue - The sound identifier to stop
   */
  stop(soundValue) {
    const audio = this.audioElements.get(soundValue);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }

  /**
   * Stop all currently playing alert sounds
   */
  stopAll() {
    this.audioElements.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
  }

  /**
   * Check if a sound is available and loaded
   * @param {string} soundValue - The sound identifier to check
   * @returns {boolean} True if the sound is available for playback
   */
  isAvailable(soundValue) {
    const audio = this.audioElements.get(soundValue);
    return audio && audio.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA;
  }

  /**
   * Check if a sound is currently loading
   * @param {string} soundValue - The sound identifier to check
   * @returns {boolean} True if the sound is currently being loaded
   */
  isLoading(soundValue) {
    return this.loadingPromises.has(soundValue);
  }

  /**
   * Check if a sound is loaded (cached) in memory
   * @param {string} soundValue - The sound identifier to check
   * @returns {boolean} True if the sound is loaded and cached
   */
  isLoaded(soundValue) {
    return this.audioElements.has(soundValue);
  }

  /**
   * Get all available sound options
   * @returns {Array} Array of available sound options from constants
   */
  getAvailableSounds() {
    return AUDIO_ALERT_OPTIONS;
  }

  /**
   * Update the selected sound (called when user changes preferences)
   * This helps optimize future preloading decisions
   * @param {string} soundValue - The newly selected sound
   */
  updateSelectedSound(soundValue) {
    this.selectedSound = soundValue;
    // Ensure the newly selected sound is loaded
    if (!this.audioElements.has(soundValue)) {
      this.loadSound(soundValue, true);
    }
  }

  /**
   * Trigger background preloading of all sounds (called when preferences modal opens)
   */
  triggerFullPreload() {
    // Use setTimeout to avoid blocking the UI
    setTimeout(() => {
      this.preloadAllSounds();
    }, 100);
  }

  /**
   * Get loading status for all sounds (useful for UI state)
   * @returns {Object} Object with loading status for each sound
   */
  getLoadingStatus() {
    const status = {};
    AUDIO_ALERT_OPTIONS.forEach(option => {
      status[option.value] = {
        loaded: this.isLoaded(option.value),
        loading: this.isLoading(option.value),
        available: this.isAvailable(option.value)
      };
    });
    return status;
  }

  /**
   * Cleanup resources (useful for testing or component unmounting)
   */
  cleanup() {
    this.stopAll();
    this.audioElements.clear();
    this.loadingPromises.clear();
    this.hasTriggeredFullPreload = false;
  }
}

/**
 * Singleton instance of the audio alert service
 * Use this throughout the application for consistent audio management
 */
export const audioAlertService = new AudioAlertService();