# Game Module - AI Agent Memory

## Purpose
Contains all game-specific logic, state management, and systems for GameScreen. Provides pure functions for state transitions, animation orchestration, time tracking, and player rotation management.

## Key Architecture Principles

### Pure Functions
All state transition logic is pure:
- Input → output with no side effects
- Predictable and testable
- Enable undo, preview, and animation calculation

### Module Organization
- **`/logic/`**: Pure game state calculations (substitutions, position changes, role transitions)
- **`/animation/`**: Visual transition orchestration and timing
- **`/queue/`**: Player rotation order management with inactive player support
- **`/time/`**: Stint-based time tracking and allocation
- **`/handlers/`**: UI event coordination with dependency injection
- **`/ui/`**: Position display utilities, styling, and animation props

### Animation-Logic Separation
1. Capture "before" positions → 2. Calculate new state → 3. Calculate animations → 4. Apply state changes

## Team Configuration System

### Configuration Components
- **Format**: `5v5` (future: `7v7`)
- **Squad Size**: 5-15 players
- **Formation**: `2-2` or `1-2-1` (fully implemented)
- **Substitution Type**: `individual`

### Formations
**2-2**: `leftDefender`, `rightDefender`, `leftAttacker`, `rightAttacker`, `goalie` (Defender/Attacker roles)
**1-2-1**: `defender`, `left`, `right`, `attacker`, `goalie` (Defender/Midfielder/Attacker roles)

### Substitution Types
**Individual**: 6+ players, individual positions, `substitute` or `substitute_1`/`substitute_2`, inactive player support (7+)

## Game State Structure
Core fields in `gameState`:
- `formation`: Player position assignments
- `allPlayers`: Player data with stats (time tracking, roles, status)
- `rotationQueue`: Substitution order (array of player IDs)
- `teamConfig`: Configuration object
- `nextPlayerIdToSubOut`, `nextNextPlayerIdToSubOut`: Rotation tracking
- `playersToHighlight`: For glow effects

## Module Structure
```
/game/
├── logic/          # gameStateLogic.js, substitutionManager.js, positionUtils.js
├── time/           # timeCalculator.js (pure), stintManager.js (game state integration)
├── animation/      # animationSupport.js (main orchestrator)
├── queue/          # rotationQueue.js (RotationQueue class with inactive support)
├── handlers/       # Event handler factories (field, goalie, substitution, score, timer)
└── ui/             # positionUtils.js, playerStyling.js, playerAnimation.js
```

## Critical Usage Pattern

### Standard Animated Operation
```javascript
import { animateStateChange } from './animation/animationSupport';
import { calculateOperation } from './logic/gameStateLogic';

animateStateChange(
  createGameState(),
  (state) => calculateOperation(state, ...params),
  (newState) => {
    setFormation(newState.formation);
    setAllPlayers(newState.allPlayers);
    setRotationQueue(newState.rotationQueue); // CRITICAL: Don't forget queue updates
  },
  setAnimationState,
  setHideNextOffIndicator,
  setRecentlySubstitutedPlayers
);
```

## Time Tracking (Stint-Based)
- **Stint**: Time period in a single role/status
- **Current stint**: Tracked via `lastStintStartTimeEpoch`
- **Time fields**: `timeOnFieldSeconds`, `timeAsDefenderSeconds`, `timeAsAttackerSeconds`, `timeAsMidfielderSeconds`, `timeAsGoalieSeconds`, `timeAsSubSeconds`
- **Pause handling**: Skip calculations when `isSubTimerPaused = true`
- **Role changes**: Use `handleRoleChange()` from `logic/substitutionManager.js`

## Queue Management
- **RotationQueue class**: Manages active/inactive player separation
- **Initialize**: Call `queueManager.initialize()` after creation to separate active/inactive
- **Key operations**: `rotatePlayer()`, `deactivatePlayer()`, `reactivatePlayer()`, `toArray()`
- **Queue updates**: Always apply via `setRotationQueue(queueManager.toArray())`

## Handler Pattern
Handlers use dependency injection:
```javascript
export const createHandlers = (gameStateFactory, stateUpdaters, animationHooks, modalHandlers) => {
  const handleOperation = () => {
    animateStateChange(
      gameStateFactory(),
      calculateOperation,
      (newState) => { /* Apply state updates */ },
      setAnimationState, setHideNextOffIndicator, setRecentlySubstitutedPlayers
    );
  };
  return { handleOperation };
};
```

## Common Issues

### Missing State Updates
**Problem**: Queue changes not applied
**Solution**: Always call `setRotationQueue(newState.rotationQueue)` in handlers

### Time Calculation Errors
**Problem**: Incorrect time accumulation
**Solution**: Verify `isSubTimerPaused` passed correctly, check stint initialization

### Queue Desync
**Problem**: Active/inactive players mixed
**Solution**: Call `queueManager.initialize()` after creating queue

### Animation Glitches
**Problem**: Wrong movement or z-index
**Solution**: Ensure position indices match formation type, check `selectedFormation` parameter

## Key Functions Reference

### Logic (`/logic/`)
- `calculateSubstitution()`, `calculatePositionSwitch()`, `calculateGoalieSwitch()`, `calculateUndo()`, `calculatePlayerToggleInactive()`, `calculatePairPositionSwap()`

### Animation (`/animation/`)
- `animateStateChange()` (main entry), `captureAllPlayerPositions()`, `calculateAllPlayerAnimations()`, `getPlayerAnimationProps()`

### Time (`/time/`)
- `updatePlayerTimeStats()`, `startNewStint()`, `completeCurrentStint()`, `handlePauseResumeTime()`

### Queue (`/queue/`)
- `createRotationQueue()`, `RotationQueue.initialize()`, `rotatePlayer()`, `deactivatePlayer()`, `reactivatePlayer()`

## Additional Documentation
- `README.md`: Comprehensive technical architecture
- Each subdirectory has `CLAUDE.md` or `AGENTS.md` for module details
- Handler tests demonstrate integration patterns
