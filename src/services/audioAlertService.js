/**
 * Audio Alert Service
 * 
 * Manages audio playback for substitution alerts with preloading and error handling.
 * Provides methods for playing, stopping, and managing audio alert sounds.
 */

import { AUDIO_ALERT_OPTIONS } from '../constants/audioAlerts';

/**
 * Service class for handling audio alert playback
 */
class AudioAlertService {
  constructor() {
    this.audioElements = new Map();
    this.preloadAudio();
  }

  /**
   * Preload all audio files for instant playback
   * Called automatically during service initialization
   */
  preloadAudio() {
    AUDIO_ALERT_OPTIONS.forEach(option => {
      try {
        const audio = new Audio();
        audio.preload = 'auto';
        
        // Use the webpack-processed fileUrl from ES6 imports
        audio.src = option.fileUrl;
        
        // Add error handling for individual audio files
        audio.addEventListener('error', (e) => {
          // Audio file failed to load - silently handle
        });
        
        // Audio file loaded successfully
        audio.addEventListener('canplaythrough', () => {
          // Audio file ready for playback
        });
        
        this.audioElements.set(option.value, audio);
      } catch (error) {
        // Failed to preload audio - silently handle
      }
    });
  }

  /**
   * Play a specific alert sound
   * @param {string} soundValue - The sound identifier from AUDIO_ALERT_OPTIONS
   * @param {number} volume - Volume level (0.0 to 1.0), defaults to 0.7
   * @returns {Promise<void>} Resolves when audio starts playing
   * @throws {Error} If sound not found or playback fails
   */
  async play(soundValue, volume = 0.7) {
    const audio = this.audioElements.get(soundValue);
    if (!audio) {
      throw new Error(`Sound not found: ${soundValue}`);
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
   * Get all available sound options
   * @returns {Array} Array of available sound options from constants
   */
  getAvailableSounds() {
    return AUDIO_ALERT_OPTIONS;
  }

  /**
   * Cleanup resources (useful for testing or component unmounting)
   */
  cleanup() {
    this.stopAll();
    this.audioElements.clear();
  }
}

/**
 * Singleton instance of the audio alert service
 * Use this throughout the application for consistent audio management
 */
export const audioAlertService = new AudioAlertService();