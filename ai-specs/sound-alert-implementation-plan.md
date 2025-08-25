# Sound Alert Feature Implementation Plan

## Overview
Extend the existing vibration-based substitution alert system to include configurable audio alerts. Users will be able to choose from 9 different sound effects and toggle audio alerts on/off through a new Preferences section in the hamburger menu.

## Current State Analysis

### Existing Vibration System
- **Location**: `src/hooks/useGameState.js:292-303` (startAlertTimer function)
- **Trigger**: Called in `handleSubstitution` at line 736
- **Configuration**: `alertMinutes` state managed in ConfigurationScreen
- **Pattern**: `navigator.vibrate([1000, 200, 1000])` when alert threshold is reached
- **Visual Feedback**: Timer turns red when `subTimerSeconds >= alertMinutes * 60`

### Available Audio Assets
All 9 sound files are already present in `src/assets/audio/`:
- `mixkit-alert-bells-echo-765.wav` (Default - Bells Echo)
- `mixkit-alert-quick-chime-766.wav` (Quick Chime)
- `mixkit-uplifting-flute-notification-2317.wav` (Flute)
- `mixkit-arabian-mystery-harp-notification-2489.wav` (Arabian Harp)
- `mixkit-clear-announce-tones-2861.wav` (Announcement Tones)
- `mixkit-happy-bells-notification-937.wav` (Happy Bells)
- `mixkit-magic-marimba-2820.wav` (Magic Marimba)
- `mixkit-magic-notification-ring-2344.wav` (Magic Ring)
- `mixkit-positive-notification-951.wav` (Positive Note)

## Implementation Strategy

### ✅ Phase 1: Constants and Audio Configuration - COMPLETED

#### ✅ 1.1 Create Audio Constants File
**File**: `src/constants/audioAlerts.js` - **IMPLEMENTED**
- All 9 audio options with proper metadata ✅
- Default preferences configuration ✅  
- localStorage key constant ✅
- File verified with all audio files present (217KB-778KB each) ✅

#### ✅ 1.2 Create Audio Service
**File**: `src/services/audioAlertService.js` - **IMPLEMENTED**
- AudioAlertService class with preloading capability ✅
- Play/stop methods with volume control and error handling ✅
- Singleton service instance exported ✅
- Browser compatibility and graceful error handling ✅

### ✅ Phase 2: Preferences Management System - COMPLETED

#### ✅ 2.1 Create Preferences Context
**File**: `src/contexts/PreferencesContext.js` - **IMPLEMENTED**
- React Context with localStorage persistence following AuthContext patterns ✅
- Error handling, validation, and debug logging ✅
- State management for audio preferences ✅

#### ✅ 2.2 Create Preferences Modal Component  
**File**: `src/components/shared/PreferencesModal.js` - **IMPLEMENTED**
- Full-featured modal with expandable preference sections ✅
- Audio alerts section with enable/disable toggle ✅
- Sound selection dropdown with test button ✅
- Volume slider with visual feedback ✅
- Loading states and proper error handling ✅

#### ✅ 2.3 Enhanced UI Components
**File**: `src/components/shared/UI.js` - **ENHANCED**
- Added Slider component with custom styling ✅
- Cross-browser thumb styling and focus states ✅
- Accessibility and theme consistency ✅

#### ✅ 2.4 App Integration
**File**: `src/App.js` - **INTEGRATED**
- PreferencesProvider added to provider chain ✅
- PreferencesModal added to render tree with state management ✅
- Browser back button support for modal navigation ✅

### 🔄 Phase 3: Enhanced UI Integration & Future-Proofing

#### 3.1 Expand Preferences Modal Structure
**File**: `src/components/shared/PreferencesModal.js` - **TO BE ENHANCED**
**Changes needed**:
- Restructure modal with expandable/collapsible sections for scalability
- **"Substitution Alerts" section** (existing functionality maintained)
  - Enable/disable audio alerts toggle
  - Sound selection dropdown with test button
  - Volume control slider
- **"Language" section** (future-proofing)
  - Dropdown with "English" as only option
  - Subtitle text: "More languages coming soon!"
  - Prepare state structure for future language additions
- **"UI Theme" section** (future-proofing) 
  - Dropdown with "Dark Ocean" as only option (current theme)
  - Subtitle text: "More themes coming soon!"
  - Prepare state structure for future theme system
- **Visual improvements**:
  - Better section spacing and hierarchy
  - Icons for each section (Volume2 for alerts, Globe for language, Palette for themes)
  - Consistent section styling and expand/collapse behavior

#### 3.2 Update PreferencesContext for Future Preferences
**File**: `src/contexts/PreferencesContext.js` - **TO BE ENHANCED**
**Changes needed**:
- Extend DEFAULT_PREFERENCES to include all preference categories:
  ```javascript
  export const DEFAULT_PREFERENCES = {
    audio: {
      enabled: true,
      selectedSound: 'bells-echo',
      volume: 0.7
    },
    language: 'en',
    theme: 'dark-ocean'
  };
  ```
- Add language and theme preference state management
- Maintain backward compatibility with existing audioPreferences
- Update localStorage structure to support nested preferences

#### 3.3 Update Hamburger Menu Integration
**File**: `src/components/shared/HamburgerMenu.js` - **TO BE UPDATED**
**Changes needed**:
- Add "Preferences" menu item with Settings icon
- Add `onOpenPreferencesModal` prop to component signature
- Add `handlePreferences` click handler
- Position after "Profile" but before "Team Management"
- Import Settings icon from lucide-react

#### 3.4 Final App Integration
**File**: `src/App.js` - **TO BE COMPLETED**
**Changes needed**:
- Connect `handleOpenPreferencesModal` to HamburgerMenu component
- Add `onOpenPreferencesModal={handleOpenPreferencesModal}` prop to HamburgerMenu
- Test complete preferences flow from hamburger menu to modal
- Verify browser back button integration

### Phase 4: Core Audio Alert Integration

#### 4.1 Extend useGameState Hook
**File**: `src/hooks/useGameState.js`
**Changes needed**:
- Import audio service and preferences context
- Modify `startAlertTimer` function (lines 292-303) to include audio playback
- Add audio alert alongside existing vibration
- Handle audio playback errors gracefully

#### 4.2 Audio Integration Logic
```javascript
const playAudioAlert = useCallback(async () => {
  if (audioPreferences.enabled) {
    try {
      await audioAlertService.play(audioPreferences.selectedSound, audioPreferences.volume);
    } catch (error) {
      console.warn('Audio alert failed:', error);
      // Fallback to vibration only
    }
  }
}, [audioPreferences]);

const startAlertTimer = useCallback(() => {
  if (alertMinutes > 0) {
    clearAlertTimer();
    const timeoutMs = alertMinutes * 60 * 1000;
    const newTimer = setTimeout(() => {
      // Existing vibration code
      if ('vibrate' in navigator) {
        navigator.vibrate([1000, 200, 1000]);
      }
      // NEW: Audio alert
      playAudioAlert();
    }, timeoutMs);
    setAlertTimer(newTimer);
  }
}, [alertMinutes, clearAlertTimer, playAudioAlert]);
```

### Phase 5: Testing and Polish

#### 5.1 Component Testing
**Files to create**:
- `src/components/shared/__tests__/PreferencesModal.test.js`
- `src/services/__tests__/audioAlertService.test.js`
- `src/contexts/__tests__/PreferencesContext.test.js`

#### 5.2 Integration Testing
- Test audio playback in different browsers
- Test fallback behavior when audio fails
- Test preferences persistence across sessions
- Test sound preview functionality

## Detailed File Implementation Guide

### File 1: `src/constants/audioAlerts.js`
```javascript
export const AUDIO_ALERT_OPTIONS = [
  { 
    value: 'bells-echo', 
    label: 'Bells Echo',
    fileName: 'mixkit-alert-bells-echo-765.wav',
    isDefault: true
  },
  { 
    value: 'quick-chime', 
    label: 'Quick Chime',
    fileName: 'mixkit-alert-quick-chime-766.wav',
    isDefault: false
  },
  { 
    value: 'flute', 
    label: 'Flute',
    fileName: 'mixkit-uplifting-flute-notification-2317.wav',
    isDefault: false
  },
  { 
    value: 'arabian-harp', 
    label: 'Arabian Harp',
    fileName: 'mixkit-arabian-mystery-harp-notification-2489.wav',
    isDefault: false
  },
  { 
    value: 'announcement-tones', 
    label: 'Announcement Tones',
    fileName: 'mixkit-clear-announce-tones-2861.wav',
    isDefault: false
  },
  { 
    value: 'happy-bells', 
    label: 'Happy Bells',
    fileName: 'mixkit-happy-bells-notification-937.wav',
    isDefault: false
  },
  { 
    value: 'magic-marimba', 
    label: 'Magic Marimba',
    fileName: 'mixkit-magic-marimba-2820.wav',
    isDefault: false
  },
  { 
    value: 'magic-ring', 
    label: 'Magic Ring',
    fileName: 'mixkit-magic-notification-ring-2344.wav',
    isDefault: false
  },
  { 
    value: 'positive-note', 
    label: 'Positive Note',
    fileName: 'mixkit-positive-notification-951.wav',
    isDefault: false
  }
];

export const DEFAULT_AUDIO_PREFERENCES = {
  enabled: true,
  selectedSound: 'bells-echo',
  volume: 0.7
};

export const PREFERENCE_STORAGE_KEY = 'sport-wizard-audio-preferences';
```

### File 2: `src/services/audioAlertService.js`
```javascript
import { AUDIO_ALERT_OPTIONS } from '../constants/audioAlerts';

class AudioAlertService {
  constructor() {
    this.audioElements = new Map();
    this.preloadAudio();
  }

  preloadAudio() {
    AUDIO_ALERT_OPTIONS.forEach(option => {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = `/assets/audio/${option.fileName}`;
      this.audioElements.set(option.value, audio);
    });
  }

  async play(soundValue, volume = 0.7) {
    const audio = this.audioElements.get(soundValue);
    if (!audio) {
      throw new Error(`Sound not found: ${soundValue}`);
    }

    audio.volume = Math.max(0, Math.min(1, volume));
    
    try {
      // Reset audio to beginning
      audio.currentTime = 0;
      await audio.play();
    } catch (error) {
      throw new Error(`Failed to play audio: ${error.message}`);
    }
  }

  stop(soundValue) {
    const audio = this.audioElements.get(soundValue);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }

  stopAll() {
    this.audioElements.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
  }
}

export const audioAlertService = new AudioAlertService();
```

### File 3: `src/contexts/PreferencesContext.js`
```javascript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { DEFAULT_AUDIO_PREFERENCES, PREFERENCE_STORAGE_KEY } from '../constants/audioAlerts';

const PreferencesContext = createContext();

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};

export const PreferencesProvider = ({ children }) => {
  const [audioPreferences, setAudioPreferences] = useState(DEFAULT_AUDIO_PREFERENCES);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PREFERENCE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setAudioPreferences({ ...DEFAULT_AUDIO_PREFERENCES, ...parsed });
      }
    } catch (error) {
      console.warn('Failed to load audio preferences:', error);
    }
  }, []);

  // Save preferences to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem(PREFERENCE_STORAGE_KEY, JSON.stringify(audioPreferences));
    } catch (error) {
      console.warn('Failed to save audio preferences:', error);
    }
  }, [audioPreferences]);

  const updateAudioPreferences = (updates) => {
    setAudioPreferences(prev => ({ ...prev, ...updates }));
  };

  const resetAudioPreferences = () => {
    setAudioPreferences(DEFAULT_AUDIO_PREFERENCES);
  };

  return (
    <PreferencesContext.Provider value={{
      audioPreferences,
      updateAudioPreferences,
      resetAudioPreferences
    }}>
      {children}
    </PreferencesContext.Provider>
  );
};
```

### File 4: `src/components/shared/PreferencesModal.js`
```javascript
import React, { useState, useCallback } from 'react';
import { Settings, Volume2, Play } from 'lucide-react';
import { usePreferences } from '../../contexts/PreferencesContext';
import { AUDIO_ALERT_OPTIONS } from '../../constants/audioAlerts';
import { audioAlertService } from '../../services/audioAlertService';
import { Button, Select, Slider } from './UI';

export function PreferencesModal({ isOpen, onClose }) {
  const { audioPreferences, updateAudioPreferences } = usePreferences();
  const [tempPreferences, setTempPreferences] = useState(audioPreferences);
  const [isTestingSound, setIsTestingSound] = useState(false);

  React.useEffect(() => {
    setTempPreferences(audioPreferences);
  }, [audioPreferences, isOpen]);

  const handleSave = useCallback(() => {
    updateAudioPreferences(tempPreferences);
    onClose();
  }, [tempPreferences, updateAudioPreferences, onClose]);

  const handleCancel = useCallback(() => {
    setTempPreferences(audioPreferences);
    onClose();
  }, [audioPreferences, onClose]);

  const handleTestSound = useCallback(async () => {
    if (isTestingSound) return;
    
    setIsTestingSound(true);
    try {
      await audioAlertService.play(tempPreferences.selectedSound, tempPreferences.volume);
    } catch (error) {
      console.error('Failed to test sound:', error);
    } finally {
      setTimeout(() => setIsTestingSound(false), 1000);
    }
  }, [tempPreferences, isTestingSound]);

  if (!isOpen) return null;

  const soundOptions = AUDIO_ALERT_OPTIONS.map(option => ({
    value: option.value,
    label: option.label
  }));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center space-x-3 mb-6">
          <Settings className="h-6 w-6 text-sky-400" />
          <h2 className="text-xl font-semibold text-sky-300">Preferences</h2>
        </div>

        <div className="space-y-6">
          {/* Audio Alerts Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-sky-200">Substitution Alerts</h3>
            
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between">
              <label className="text-sm text-slate-100">Enable Audio Alerts</label>
              <button
                onClick={() => setTempPreferences(prev => ({ ...prev, enabled: !prev.enabled }))}
                className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${
                  tempPreferences.enabled ? 'bg-sky-600' : 'bg-slate-600'
                }`}
              >
                <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                  tempPreferences.enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Sound Selection */}
            <div className={`space-y-2 ${!tempPreferences.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
              <label className="block text-sm text-slate-100">Alert Sound</label>
              <div className="flex space-x-2">
                <div className="flex-1">
                  <Select 
                    value={tempPreferences.selectedSound}
                    onChange={(value) => setTempPreferences(prev => ({ ...prev, selectedSound: value }))}
                    options={soundOptions}
                  />
                </div>
                <button
                  onClick={handleTestSound}
                  disabled={isTestingSound}
                  className={`px-3 py-2 rounded-md transition-colors ${
                    isTestingSound 
                      ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                      : 'bg-sky-600 hover:bg-sky-500 text-white'
                  }`}
                  title="Test sound"
                >
                  <Play className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Volume Control */}
            <div className={`space-y-2 ${!tempPreferences.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="flex items-center space-x-2">
                <Volume2 className="h-4 w-4 text-slate-400" />
                <label className="text-sm text-slate-100">Volume</label>
                <span className="text-sm text-slate-400">
                  {Math.round(tempPreferences.volume * 100)}%
                </span>
              </div>
              <Slider
                value={tempPreferences.volume}
                onChange={(value) => setTempPreferences(prev => ({ ...prev, volume: value }))}
                min={0}
                max={1}
                step={0.1}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 mt-8">
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
```

## Integration Points

### Update HamburgerMenu.js
Add preferences menu item after the Profile button (around line 180):
```javascript
{/* Preferences Button */}
<button
  onClick={handlePreferences}
  className="block w-full text-left px-4 py-2 text-sm text-slate-100 hover:bg-slate-600 hover:text-sky-400 transition-colors duration-200"
>
  <div className="flex items-center space-x-2">
    <Settings className="w-4 h-4" />
    <span>Preferences</span>
  </div>
</button>
```

### Update App.js
- Wrap with PreferencesProvider
- Add PreferencesModal state and handlers
- Import necessary components

### Update useGameState.js
Modify the startAlertTimer function to include audio:
```javascript
// Add import
import { audioAlertService } from '../services/audioAlertService';
import { usePreferences } from '../contexts/PreferencesContext';

// In the hook
const { audioPreferences } = usePreferences();

const startAlertTimer = useCallback(() => {
  if (alertMinutes > 0) {
    clearAlertTimer();
    const timeoutMs = alertMinutes * 60 * 1000;
    const newTimer = setTimeout(async () => {
      // Existing vibration
      if ('vibrate' in navigator) {
        navigator.vibrate([1000, 200, 1000]);
      }
      
      // NEW: Audio alert
      if (audioPreferences.enabled) {
        try {
          await audioAlertService.play(audioPreferences.selectedSound, audioPreferences.volume);
        } catch (error) {
          console.warn('Audio alert failed:', error);
        }
      }
    }, timeoutMs);
    setAlertTimer(newTimer);
  }
}, [alertMinutes, clearAlertTimer, audioPreferences]);
```

## Error Handling and Edge Cases

1. **Audio Playback Failures**: Gracefully fallback to vibration-only
2. **Browser Compatibility**: Test on Safari, Chrome, Firefox, mobile browsers
3. **Audio Permissions**: Handle cases where audio playback is blocked
4. **File Loading Errors**: Handle missing or corrupted audio files
5. **Volume Edge Cases**: Ensure volume slider works correctly with 0-100% range
6. **Preferences Persistence**: Handle localStorage failures gracefully

## Testing Strategy

1. **Unit Tests**: Test each service and component individually
2. **Integration Tests**: Test the full alert flow from timer to sound playback
3. **Browser Tests**: Test on different browsers and devices
4. **Error Scenario Tests**: Test what happens when audio fails
5. **Accessibility Tests**: Ensure the preferences modal is accessible
6. **Performance Tests**: Ensure audio preloading doesn't impact app performance

## Performance Considerations

1. **Audio Preloading**: Load all sounds at app startup for instant playback
2. **Memory Management**: Clean up audio objects when not needed
3. **Lazy Loading**: Consider loading audio files only when preferences modal is first opened
4. **File Size**: Audio files should be optimized for web (already done - they're short clips)

## Success Criteria

1. ✅ Users can access Preferences from hamburger menu
2. ✅ Users can toggle audio alerts on/off
3. ✅ Users can select from 9 different alert sounds
4. ✅ Users can adjust alert volume
5. ✅ Users can preview sounds before saving
6. ✅ Audio alerts play alongside existing vibration alerts
7. ✅ Preferences persist across browser sessions
8. ✅ System degrades gracefully when audio fails
9. ✅ All existing vibration functionality remains intact
10. ✅ UI follows existing design patterns and styling

## Implementation Order

1. **Constants and Service**: Create audioAlerts.js and audioAlertService.js
2. **Context**: Create PreferencesContext.js
3. **Modal Component**: Create PreferencesModal.js
4. **UI Integration**: Update HamburgerMenu.js and App.js
5. **Core Integration**: Update useGameState.js to use audio service
6. **Testing**: Create comprehensive test suite
7. **Polish**: Add error handling, accessibility, and edge cases

This plan provides a complete roadmap for implementing the sound alert feature while maintaining backward compatibility and following the existing architecture patterns.