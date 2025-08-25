/**
 * Audio Alert Configuration Constants
 * 
 * Defines the available sound options for substitution alerts and default preferences.
 * Used by the PreferencesModal for sound selection and the audioAlertService for playback.
 */

// Import all audio files as ES6 modules for webpack processing
import bellsEchoAudio from '../assets/audio/mixkit-alert-bells-echo-765.wav';
import quickChimeAudio from '../assets/audio/mixkit-alert-quick-chime-766.wav';
import fluteAudio from '../assets/audio/mixkit-uplifting-flute-notification-2317.wav';
import arabianHarpAudio from '../assets/audio/mixkit-arabian-mystery-harp-notification-2489.wav';
import announcementTonesAudio from '../assets/audio/mixkit-clear-announce-tones-2861.wav';
import happyBellsAudio from '../assets/audio/mixkit-happy-bells-notification-937.wav';
import magicMarimbaAudio from '../assets/audio/mixkit-magic-marimba-2820.wav';
import magicRingAudio from '../assets/audio/mixkit-magic-notification-ring-2344.wav';
import positiveNoteAudio from '../assets/audio/mixkit-positive-notification-951.wav';

export const AUDIO_ALERT_OPTIONS = [
  { 
    value: 'bells-echo', 
    label: 'Bells Echo',
    fileUrl: bellsEchoAudio,
    isDefault: true
  },
  { 
    value: 'quick-chime', 
    label: 'Quick Chime',
    fileUrl: quickChimeAudio,
    isDefault: false
  },
  { 
    value: 'flute', 
    label: 'Flute',
    fileUrl: fluteAudio,
    isDefault: false
  },
  { 
    value: 'arabian-harp', 
    label: 'Arabian Harp',
    fileUrl: arabianHarpAudio,
    isDefault: false
  },
  { 
    value: 'announcement-tones', 
    label: 'Announcement Tones',
    fileUrl: announcementTonesAudio,
    isDefault: false
  },
  { 
    value: 'happy-bells', 
    label: 'Happy Bells',
    fileUrl: happyBellsAudio,
    isDefault: false
  },
  { 
    value: 'magic-marimba', 
    label: 'Magic Marimba',
    fileUrl: magicMarimbaAudio,
    isDefault: false
  },
  { 
    value: 'magic-ring', 
    label: 'Magic Ring',
    fileUrl: magicRingAudio,
    isDefault: false
  },
  { 
    value: 'positive-note', 
    label: 'Positive Note',
    fileUrl: positiveNoteAudio,
    isDefault: false
  }
];

/**
 * Language options for the preferences
 */
export const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' }
];

/**
 * Theme options for the preferences
 */
export const THEME_OPTIONS = [
  { value: 'dark-ocean', label: 'Dark Ocean' }
];

/**
 * Default audio preference settings (maintained for backward compatibility)
 */
export const DEFAULT_AUDIO_PREFERENCES = {
  enabled: true,
  selectedSound: 'bells-echo',
  volume: 0.7
};

/**
 * Complete default preferences structure for all categories
 */
export const DEFAULT_PREFERENCES = {
  audio: {
    enabled: true,
    selectedSound: 'bells-echo',
    volume: 0.7
  },
  language: 'en',
  theme: 'dark-ocean'
};

/**
 * localStorage key for persisting preferences (updated for new structure)
 */
export const PREFERENCE_STORAGE_KEY = 'sport-wizard-preferences';