# AGENTS.md - Custom React Hooks

Custom React hooks for managing game state, UI interactions, timers, and database persistence.

## Core State Management Hooks

### useGameState.js
Primary hook for game state management. Delegates to specialized hooks for separation of concerns.

**Key Responsibilities:**
- Player management (via `usePlayerState`)
- Team configuration (via `useTeamConfig`)
- Match events and scoring (via `useMatchEvents`)
- Database persistence (via `useMatchPersistence`)
- Formation management and rotation queues
- Game actions: substitutions, period transitions, goalie switches

**Critical Patterns:**
- Composition over monolithic state (delegates to 6+ specialized hooks)
- Match lifecycle tracking: `matchState` ('not_started', 'pending', 'running', 'finished', 'confirmed')
- Match ID management: `currentMatchId` and `matchCreated` flags prevent duplicate database records
- Immutable state updates (never mutate, always return new objects/arrays)

**Database Integration:**
- Uses `matchStateManager` service for match CRUD operations
- Tracks match lifecycle with three-state pattern: running → finished → confirmed
- Upserts player stats during substitutions and period transitions

### useTimers.js
Manages match timer and substitution timer with real-time updates.

**Critical Patterns:**
- Timer calculation: `forceUpdateCounter` triggers `useMemo` recalculation for real-time UI updates
- Interval storage: Use `useRef` for interval IDs (never `useState` - prevents infinite loops)
- Timer state persistence to localStorage survives page refreshes
- Audio alerts trigger when `subTimerSeconds >= alertMinutes * 60`

**Key Functions:**
- `startTimers()` - Initialize timers for period start
- `stopTimers()` - Stop timers for period end
- `pauseSubTimer()` / `resumeSubTimer()` - Pause/resume substitution timer
- `resetSubTimer()` - Reset substitution timer after substitution

### useGameUIState.js
Manages UI-specific state separate from game logic.

**Key State:**
- `animationState` - Coordinates substitution/position animations
- `recentlySubstitutedPlayers` - Set of player IDs for visual highlighting
- `lastSubstitution` - Undo functionality data
- `shouldSubstituteNow` - Flag to coordinate immediate substitutions

### useMatchState.js
Centralized match state detection for abandonment warnings and navigation guards.

**Returns:**
- `hasActiveMatch` - True if match is running or finished (not saved)
- `hasUnsavedMatch` - True if match is finished but not confirmed
- `isMatchRunning` - True if match state is 'running'
- `matchState` - Explicit state: 'not_started', 'running', 'finished', 'saved'

## Specialized Hooks

### usePlayerState.js
Extracts player management logic from useGameState.

**Key Functions:**
- `syncPlayersFromTeamRoster()` - Sync with database roster
- `togglePlayerInactive()` - Mark players inactive during match
- `updatePlayerRolesFromFormation()` - Sync player roles with formation
- `addTemporaryPlayer()` - Add temporary player for match

### useTeamConfig.js
Manages team configuration and formation selection.

**Key State:**
- `teamConfig` - Composite config (format, squadSize, formation, substitutionType)
- `selectedFormation` - User-selected formation ('2-2', '1-2-1')
- Formation-aware config resolution for position utilities

### useMatchEvents.js
Manages match events, goals, and event log.

**Key Functions:**
- `addGoalScored()` / `addGoalConceded()` - Record goals
- `syncMatchDataFromEventLogger()` - Sync events from event logger
- `clearAllMatchEvents()` - Clear all match events

### useMatchPersistence.js
Database operations and localStorage persistence.

**Key Functions:**
- `saveMatchConfiguration()` - Save match config to database
- `loadPersistedState()` - Load state from localStorage
- `clearPersistedState()` - Clear localStorage state

### useMatchRecovery.js
Handles recovery of finished matches not saved to history.

**Recovery Flow:**
1. Check for recoverable match on login (1.5s delay)
2. Show recovery modal if found
3. User choice: save to history or delete match
4. Update match state to 'confirmed' or delete from database

## Browser Interaction Hooks

### useBrowserBackIntercept.js
Intercepts browser back button for modal/view navigation.

**Key Functions:**
- `pushNavigationState(callback, handlerName)` - Add handler to stack
- `popNavigationState()` - Remove handler and trigger browser back
- `clearNavigationStack()` - Clear all handlers
- Supports global navigation handler for fallback

**Critical Pattern:**
- Maintains navigation stack in `useRef` (survives re-renders)
- Pushes browser history state with each handler registration
- Executes topmost handler on popstate event

### useQuickTapWithScrollDetection.js
Responsive quick tap detection with scroll cancellation.

**Key Features:**
- Triggers callback only on taps <150ms (configurable)
- Cancels on scroll movement >10px threshold
- Prevents accidental activation during scrolling or long press
- Supports both touch and mouse events

### useFieldPositionHandlers.js
Simplifies integration of `useQuickTapWithScrollDetection` for field positions.

### useGameModals.js
Manages modal state for player selection, substitution, goalie switch, etc.

## Supporting Hooks

### useMatchAudio.js
Audio alert and wake lock management.

**Key Functions:**
- `playAlertSounds()` - Play substitution alert sounds
- `requestWakeLock()` - Keep screen active during match
- `releaseWakeLock()` - Release wake lock after match

### useTeamNameAbbreviation.js
Dynamic team name abbreviation based on screen width.

### useStatsFilters.js
Statistics screen filter state management.

### useStatisticsRouting.js
Statistics tab routing and navigation.

## Critical Rules for AI Agents

1. **Immutability**: Never mutate state - always use spread operators or immutable methods
2. **Hook Dependencies**: Follow exhaustive-deps rule - include ALL values used in useEffect/useMemo/useCallback
3. **Interval Storage**: Use `useRef` for interval IDs (never `useState`)
4. **Timer Pattern**: `forceUpdateCounter` in dependencies triggers real-time updates
5. **Match Lifecycle**: Always update both `currentMatchId` and `matchCreated` together
6. **Database Operations**: Use service layer functions (matchStateManager, matchConfigurationService)
7. **Null Safety**: Guard against undefined data with optional chaining and default values
8. **Separation of Concerns**: Keep game logic in `/src/game/`, hooks manage state and side effects only