# Timer Component Isolation Implementation Plan

## Overview

This plan outlines the architectural refactoring to isolate timer components into self-contained, reusable units. The goal is to improve code organization, enhance separation of concerns, and create a more maintainable timer system.

## Current Architecture

### Timer Data Flow
```
useTimers Hook → forceUpdateCounter → useMemo calculations → GameScreen props → Child Components
```

### Components Involved
- **Main Timers**: Match timer, substitution timer
- **Player Timers**: Individual player stats (totalOutfieldTime, attackDefenderDiff)
- **Display Components**: Timer UI elements throughout FormationRenderer

## Proposed Architecture

### New Component Structure
```
LiveTimer Components → Self-contained state → Direct UI updates
```

### Benefits
- **Separation of Concerns**: Timer logic isolated from game logic
- **Component Reusability**: Timer components can be used across different screens
- **Code Organization**: Clear boundaries between timing and game state
- **Maintainability**: Easier to modify timer behavior without affecting other systems
- **Testability**: Timer components can be tested in isolation

## Implementation Phases

### Phase 1: Main Timer Components

#### 1.1 Create LiveMatchTimer Component
```jsx
// src/components/shared/timers/LiveMatchTimer.jsx
export function LiveMatchTimer({ 
  startTime, 
  durationMinutes, 
  className = '',
  showNegative = true 
}) {
  const [displayTime, setDisplayTime] = useState('');
  const [isOvertime, setIsOvertime] = useState(false);
  
  useEffect(() => {
    if (!startTime) return;
    
    const updateTimer = () => {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - startTime) / 1000);
      const remainingSeconds = (durationMinutes * 60) - elapsedSeconds;
      
      setIsOvertime(remainingSeconds < 0);
      const displaySeconds = Math.abs(remainingSeconds);
      setDisplayTime(formatTime(displaySeconds));
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startTime, durationMinutes]);
  
  return (
    <span className={className}>
      {isOvertime && showNegative && '+'}
      {displayTime}
    </span>
  );
}
```

#### 1.2 Create LiveSubTimer Component
```jsx
// src/components/shared/timers/LiveSubTimer.jsx
export function LiveSubTimer({ 
  lastSubstitutionTime, 
  totalPausedDuration = 0,
  pauseStartTime = null,
  className = '' 
}) {
  const [displayTime, setDisplayTime] = useState('00:00');
  
  useEffect(() => {
    if (!lastSubstitutionTime) {
      setDisplayTime('00:00');
      return;
    }
    
    const updateTimer = () => {
      const now = Date.now();
      const effectiveNow = pauseStartTime || now;
      const elapsedSeconds = Math.floor(
        (effectiveNow - lastSubstitutionTime - totalPausedDuration) / 1000
      );
      setDisplayTime(formatTime(Math.max(0, elapsedSeconds)));
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [lastSubstitutionTime, totalPausedDuration, pauseStartTime]);
  
  return <span className={className}>{displayTime}</span>;
}
```

#### 1.3 Update GameScreen Timer Display
Replace current timer JSX with new components:
```jsx
// In GameScreen.js - Timer section
<div className="grid grid-cols-2 gap-4 text-center">
  <div className="p-2 bg-slate-700 rounded-lg">
    <p className="text-xs text-sky-200 mb-0.5">Match Clock</p>
    <LiveMatchTimer
      startTime={periodStartTime}
      durationMinutes={periodDurationMinutes}
      className="text-2xl font-mono text-sky-400"
    />
  </div>
  <div className="p-2 bg-slate-700 rounded-lg relative">
    <p className="text-xs text-sky-200 mb-0.5">Substitution Timer</p>
    <LiveSubTimer
      lastSubstitutionTime={lastSubstitutionTime}
      totalPausedDuration={totalPausedDuration}
      pauseStartTime={pauseStartTime}
      className="text-2xl font-mono text-emerald-400"
    />
  </div>
</div>
```

### Phase 2: Player Timer Components

#### 2.1 Create LivePlayerStats Component
```jsx
// src/components/shared/timers/LivePlayerStats.jsx
export function LivePlayerStats({ 
  playerId, 
  playerData, 
  isSubTimerPaused = false,
  className = '' 
}) {
  const [stats, setStats] = useState({ totalOutfieldTime: 0, attackDefenderDiff: 0 });
  
  useEffect(() => {
    if (!playerData || !playerId) return;
    
    const updateStats = () => {
      const player = playerData.stats;
      
      // When paused, use stored stats only
      if (isSubTimerPaused) {
        setStats({
          totalOutfieldTime: player.timeOnFieldSeconds || 0,
          attackDefenderDiff: (player.timeAsAttackerSeconds || 0) - (player.timeAsDefenderSeconds || 0)
        });
        return;
      }
      
      // Calculate live stats for active players
      let currentStintTime = 0;
      if (player.currentStatus === 'on_field' && player.lastStintStartTimeEpoch) {
        const now = Date.now();
        currentStintTime = Math.floor((now - player.lastStintStartTimeEpoch) / 1000);
      }
      
      const totalOutfieldTime = (player.timeOnFieldSeconds || 0) + currentStintTime;
      
      let attackerTime = player.timeAsAttackerSeconds || 0;
      let defenderTime = player.timeAsDefenderSeconds || 0;
      
      if (player.currentStatus === 'on_field' && player.currentRole) {
        if (player.currentRole === 'attacker') {
          attackerTime += currentStintTime;
        } else if (player.currentRole === 'defender') {
          defenderTime += currentStintTime;
        }
      }
      
      setStats({
        totalOutfieldTime,
        attackDefenderDiff: attackerTime - defenderTime
      });
    };
    
    updateStats();
    const interval = setInterval(updateStats, 1000);
    return () => clearInterval(interval);
  }, [playerId, playerData, isSubTimerPaused]);
  
  return (
    <div className={`text-right text-xs ${className}`}>
      <span>
        <Clock className="h-3 w-3 inline" /> 
        <span className="font-mono">{formatTime(stats.totalOutfieldTime)}</span>
      </span>
      <span className="ml-3">
        <Sword className="h-3 w-3 inline" /> 
        <span className="font-mono">{formatTimeDifference(stats.attackDefenderDiff)}</span>
      </span>
    </div>
  );
}
```

#### 2.2 Replace PlayerStatsDisplay Usage
Update FormationRenderer components to use new LivePlayerStats:
```jsx
// In IndividualFormation.js and PairsFormation.js
<LivePlayerStats 
  playerId={playerId} 
  playerData={playerData} 
  isSubTimerPaused={isSubTimerPaused}
  className="ml-4" 
/>
```

### Phase 3: Clean Up Legacy Timer System

#### 3.1 Remove forceUpdateCounter from useTimers
```jsx
// In useTimers.js - Remove these lines:
const [forceUpdateCounter, setForceUpdateCounter] = useState(0);

// Remove the useEffect that sets up setInterval for forceUpdateCounter

// Simplify timer calculations to return static values when needed
const matchTimerSeconds = useMemo(() => {
  return calculateMatchTimer(periodStartTime, periodDurationMinutes);
}, [periodStartTime, periodDurationMinutes]); // Remove forceUpdateCounter dependency
```

#### 3.2 Update GameScreen Props
Remove timer values from GameScreen props since they're now handled by isolated components:
```jsx
// Remove from GameScreen props:
// matchTimerSeconds, subTimerSeconds

// Add raw timer state instead:
// periodStartTime, periodDurationMinutes, lastSubstitutionTime, etc.
```

#### 3.3 Update App.js Timer Integration
Pass raw timer state to GameScreen instead of calculated values:
```jsx
// In App.js
<GameScreen 
  periodStartTime={timers.periodStartTime}
  periodDurationMinutes={gameState.periodDurationMinutes}
  lastSubstitutionTime={timers.lastSubstitutionTime}
  totalPausedDuration={timers.totalPausedDuration}
  pauseStartTime={timers.pauseStartTime}
  // ... other props
/>
```

### Phase 4: Enhanced Timer Features

#### 4.1 Timer Configuration Options
```jsx
// src/components/shared/timers/TimerConfig.js
export const TIMER_CONFIG = {
  UPDATE_INTERVAL: 1000, // ms
  PRECISION: 'seconds', // 'seconds' | 'deciseconds'
  OVERTIME_WARNING_THRESHOLD: 300, // seconds
  PAUSE_DETECTION_DELAY: 100 // ms
};
```

#### 4.2 Timer Event Hooks
```jsx
// src/hooks/useTimerEvents.js
export function useTimerEvents({ onOvertime, onMilestone, onWarning }) {
  // Hook for timer-based events and notifications
}
```

#### 4.3 Timer Persistence Integration
```jsx
// Enhanced timer components with persistence
export function LiveMatchTimer({ startTime, onStateChange, persistKey }) {
  // Auto-save timer state to localStorage
  // Restore timer state on component mount
}
```

## Testing Strategy

### Unit Tests
```jsx
// src/components/shared/timers/__tests__/LiveMatchTimer.test.js
describe('LiveMatchTimer', () => {
  it('displays correct time format');
  it('handles overtime correctly');
  it('updates every second');
  it('handles pause/resume states');
  it('manages timer persistence');
});
```

### Integration Tests
```jsx
// src/components/game/__tests__/TimerIntegration.test.js
describe('Timer Integration', () => {
  it('syncs timer data between components');
  it('handles game state changes');
  it('maintains timer accuracy during substitutions');
});
```

### Visual Tests
```jsx
// Storybook stories for timer components
export const MatchTimerStories = {
  Default: { startTime: Date.now() - 300000, durationMinutes: 20 },
  Overtime: { startTime: Date.now() - 1500000, durationMinutes: 20 },
  Paused: { startTime: Date.now() - 300000, pauseStartTime: Date.now() - 60000 }
};
```

## Migration Strategy

### Step 1: Parallel Implementation
- Implement new timer components alongside existing system
- Use feature flags to switch between implementations
- Verify functionality parity

### Step 2: Gradual Replacement
- Replace main timers first (lower risk)
- Replace player timers second (higher complexity)
- Remove legacy timer code last

### Step 3: Validation
- Compare timer accuracy between old and new systems
- Verify all timer-dependent features work correctly
- Test across different team configurations

## File Structure

```
src/
├── components/
│   └── shared/
│       └── timers/
│           ├── LiveMatchTimer.jsx
│           ├── LiveSubTimer.jsx
│           ├── LivePlayerStats.jsx
│           ├── TimerConfig.js
│           ├── index.js
│           └── __tests__/
│               ├── LiveMatchTimer.test.js
│               ├── LiveSubTimer.test.js
│               └── LivePlayerStats.test.js
├── hooks/
│   ├── useTimerEvents.js
│   └── useTimerPersistence.js
└── utils/
    └── timerUtils.js
```

## Configuration and Customization

### Theme Integration
```jsx
// Timer components respect theme configuration
const timerTheme = {
  normal: 'text-sky-400',
  warning: 'text-yellow-400', 
  critical: 'text-red-400',
  overtime: 'text-red-500'
};
```

### Accessibility Features
```jsx
// ARIA labels and screen reader support
<LiveMatchTimer 
  ariaLabel="Match time remaining"
  announceOvertime={true}
  announceMinutes={[10, 5, 1]}
/>
```

### Mobile Optimization
```jsx
// Responsive timer displays
const timerSizes = {
  mobile: 'text-lg',
  tablet: 'text-xl', 
  desktop: 'text-2xl'
};
```

## Benefits Achieved

### Code Organization
- Clear separation between timer logic and game logic
- Reusable timer components across different screens
- Centralized timer configuration and theming

### Maintainability  
- Timer behavior modifications isolated to timer components
- Easier to test timer functionality independently
- Simpler debugging of timer-related issues

### Extensibility
- Easy to add new timer types (period timers, penalty timers, etc.)
- Timer components can be enhanced with additional features
- Support for different timer formats and precision levels

### Code Quality
- Reduced complexity in GameScreen component
- Better adherence to single responsibility principle
- Improved component composition patterns

## Future Enhancements

### Advanced Timer Features
- Configurable timer precision (seconds vs deciseconds)
- Timer synchronization across multiple devices
- Advanced timer analytics and statistics

### UI/UX Improvements
- Smooth timer animations and transitions
- Customizable timer themes and colors
- Timer milestone notifications and alerts

### Integration Opportunities  
- Integration with match reporting systems
- Timer data export for post-game analysis
- Real-time timer sharing with spectators or officials