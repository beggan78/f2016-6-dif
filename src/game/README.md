# Game Logic Architecture

This folder contains all game-specific logic, state management, and systems for the GameScreen functionality. The code is organized into focused, modular units that handle different aspects of game state and behavior.

## Folder Structure Overview

```
src/
├── constants/                   # Domain constants and configuration options
│   ├── playerConstants.js      # PLAYER_ROLES
│   ├── gameConfig.js           # PERIOD_OPTIONS, DURATION_OPTIONS, ALERT_OPTIONS
│   └── defaultData.js          # initialRoster and other default data
├── utils/                      # Utilities used across multiple screens
│   ├── rolePointUtils.js      # calculateRolePoints() for stats calculations
│   └── playerUtils.js         # Player operations, now includes initializePlayers()
├── hooks/                      # React hooks for UI integration
│   ├── useQuickTapWithScrollDetection.js # Universal quick tap with scroll detection
│   └── useFieldPositionHandlers.js        # Hook for field position event handlers
└── game/                       # Game screen specific logic and systems
    ├── README.md               # This file - game screen architecture documentation
    ├── index.js                # Main barrel exports for the game module
    ├── logic/                  # Core game state calculation and business logic
    │   ├── index.js           # Logic module barrel exports
    │   ├── gameStateLogic.js  # Pure functions for state transitions
    │   ├── substitutionManager.js # Substitution business logic
    │   └── positionUtils.js   # Position and formation utilities
    ├── time/                   # Time management and stint tracking
    │   ├── index.js           # Time module barrel exports
    │   ├── timeCalculator.js  # Pure time calculation functions
    │   └── stintManager.js    # Player stint state management
    ├── animation/              # Animation system for visual transitions
    │   ├── index.js           # Animation module barrel exports
    │   └── animationSupport.js # Unified animation calculation and orchestration
    ├── queue/                  # Player rotation queue management
    │   ├── index.js           # Queue module barrel exports
    │   └── rotationQueue.js   # Player rotation and activation state management
    ├── handlers/               # Event handler factories with domain-based organization
    │   ├── fieldPositionHandlers.js # Field position quick tap logic
    │   ├── goalieHandlers.js       # Goalie replacement logic
    │   ├── substitutionHandlers.js # Player substitution operations
    │   ├── scoreHandlers.js        # Score tracking and editing
    │   └── timerHandlers.js        # Timer pause/resume functionality
    └── ui/                     # UI-specific utilities for game screen rendering
        ├── index.js           # UI module barrel exports
        ├── positionUtils.js   # Position icons, names, indicators, and event extraction
        ├── playerStyling.js   # Player styling calculations (colors, borders, glow)
        └── playerAnimation.js # Player animation property extraction
```

## Design Principles

### 1. Pure Functions
All state transition logic is implemented as pure functions that:
- Take current state as input
- Return new state as output
- Have no side effects
- Are predictable and testable
- Enable features like undo, preview, and animation calculation

### 2. Separation of Concerns
- **Logic**: Pure business rules and state calculations
- **Handlers**: Event handling and UI integration with domain-based organization
- **UI Utilities**: Rendering support functions separated from business logic
- **Animation**: Visual transition management and timing
- **Queue**: Player rotation and ordering algorithms
- **State Management**: React state updates and UI integration (handled in components)

### 3. Animation-Logic Separation
The animation system works by:
1. Capturing "before" state positions
2. Calculating "after" state using pure logic functions
3. Computing visual differences and animation requirements
4. Orchestrating timing and applying state changes

This separation allows logic changes without breaking animations and vice versa.

### 4. Domain-Based Organization
- **Handler factories** organized by game domain (field positions, goalie, substitutions, etc.)
- **Consistent naming** reflecting actual responsibilities rather than technical implementation
- **Dependency injection** for testability and flexibility
- **Single responsibility** principle applied to each module

### 5. Universal Interaction Patterns
- **Scroll detection** integrated into all quick tap interactions to prevent accidental triggers
- **Consistent event handling** through universal `useQuickTapWithScrollDetection` hook
- **React hooks compliance** with proper separation of callback creation and hook usage
- **DRY principle** applied to eliminate duplicated interaction logic

---

# File Responsibilities

## Root Level Files

### `index.js`
**Purpose**: Main barrel exports for the entire game module  
**Responsibilities**:
- Re-exports all public APIs from logic, animation, and queue modules
- Provides single import point for game functionality
- Maintains clean separation between internal structure and external API

**When to modify**: When adding new modules or changing public API structure

---

## Constants (`/constants/`) - Cross-Screen Domain Constants

### `constants/playerConstants.js`
**Purpose**: Core player and formation constants used across all screens  
**Responsibilities**:
- `PLAYER_ROLES`: Defines valid player roles (Goalie, Defender, Attacker, Substitute, On Field)

### `constants/gameConfig.js`
**Purpose**: Game configuration options for setup screens  
**Responsibilities**:
- `PERIOD_OPTIONS`: Available period counts [1, 2, 3]
- `DURATION_OPTIONS`: Available period durations [10, 15, 20, 25, 30]
- `ALERT_OPTIONS`: Substitution alert timing options

### `constants/defaultData.js`
**Purpose**: Default data for initializing new games  
**Responsibilities**:
- `initialRoster`: Default player names for new games

## Utils (`/utils/`) - Cross-Screen Utilities

### `utils/rolePointUtils.js`
**Purpose**: Role point calculations for statistics screen  
**Responsibilities**:
- `calculateRolePoints()`: Points system calculation based on time spent in roles

### `utils/playerUtils.js` (Updated)
**Purpose**: Player-related utilities used across multiple screens  
**Responsibilities**:
- `initializePlayers()`: Creates initial player objects with proper stats structure
- Other existing player utility functions

**When to modify constants/utils**: 
- Adding new team modes (update `playerConstants.js`)
- Changing point calculation rules (update `rolePointUtils.js`)
- Adding new player roles or statuses (update `playerConstants.js`)
- Modifying game configuration options (update `gameConfig.js`)

## Logic Module (`/game/logic/`) - Game Screen Specific Logic

### `logic/gameStateLogic.js`
**Purpose**: Pure functions for all game state transitions and calculations  
**Responsibilities**:
- `calculateSubstitution()`: Computes state after a substitution operation
- `calculatePositionSwitch()`: Handles swapping two players' positions
- `calculateGoalieSwitch()`: Manages goalie changes and role transitions
- `calculateUndo()`: Reverses the most recent substitution with time adjustments
- `calculatePlayerToggleInactive()`: Activates/deactivates players (7-player mode only)
- `calculateSubstituteSwap()`: Swaps substitute_1 and substitute_2 positions
- `calculateNextSubstitutionTarget()`: Updates next player to substitute

**Key characteristics**:
- All functions are pure (input → output, no side effects)
- Functions can be used for previews, undo calculations, and animations
- Error handling returns unchanged state rather than throwing
- Time calculations respect pause state
- Each function returns complete new game state

**When to add functions**:
- New game operations (e.g., captain assignment, penalty management)
- Formation-specific rules (e.g., role rotation logic)
- Time-based calculations (e.g., fatigue tracking)

### `logic/substitutionManager.js`
**Purpose**: Specialized substitution business logic and time calculation
**Responsibilities**:
- `SubstitutionManager` class: Handles formation-specific substitution logic
- `handleRoleChange()`: Manages role transitions within periods
- Formation-specific handlers:
  - `handleIndividualSubstitution()`: 6-player individual mode logic
  - `handleIndividual7Substitution()`: 7-player individual mode with inactive support

**Integration points**:
- Uses rotation queue for player ordering
- Updates player stats and role tracking
- Manages formation structure changes
- Handles inactive player edge cases (7-player mode)

**When to modify**:
- Changing substitution rules for specific formations
- Adding time calculation logic
- Modifying rotation queue integration
- Adding support for new team configurations

### `logic/positionUtils.js`
**Purpose**: Position and formation utilities for game logic  
**Responsibilities**:
- `getPositionRole(position)`: Maps position strings to player roles
- `getOutfieldPositions(teamConfig)`: Gets outfield position lists by team configuration
- `getFieldPositions(teamConfig)`: Gets field positions (excludes substitutes)
- `getSubstitutePositions(teamConfig)`: Gets substitute position lists
- `isFieldPosition(position, teamConfig)`: Checks if position is field position
- `isSubstitutePosition(position, teamConfig)`: Checks if position is substitute
- `getExpectedOutfieldPlayerCount(teamConfig)`: Gets expected player counts

**Key characteristics**:
- Pure functions with no side effects
- Formation-aware utilities
- Single source of truth for position-to-role mapping
- Used throughout game logic for position validation and role determination

**When to modify**:
- Adding new team configurations (update all position list functions)
- Changing position naming conventions
- Adding new position validation rules
- Modifying role assignment logic

---

## Time Module (`/time/`)

### `time/timeCalculator.js`
**Purpose**: Pure time calculation functions with no side effects  
**Responsibilities**:
- `calculateDurationSeconds()`: Calculate duration between epoch timestamps
- `shouldSkipTimeCalculation()`: Determine if time calculation should be skipped
- `isValidTimeRange()`: Validate time range parameters
- `calculateCurrentStintDuration()`: Calculate time elapsed in current stint

**Key characteristics**:
- Pure functions with zero dependencies
- Mathematical operations only
- No game state knowledge
- Reusable across different timing contexts

### `time/stintManager.js`
**Purpose**: Game state integration for player stint tracking and time allocation  
**Responsibilities**:
- `updatePlayerTimeStats()`: Apply stint duration to appropriate time counters
- `startNewStint()`: Initialize new stint timing for a player
- `completeCurrentStint()`: Finalize stint and update player stats
- `applyStintTimeToCounters()`: Allocate time based on player status and role

**Integration points**:
- Uses timeCalculator for pure time calculations
- Understands player status (on_field, substitute, goalie) and roles
- Manages stint lifecycle (start, update, complete)
- Respects timer pause state

**When to modify**:
- Adding new player statuses or roles
- Changing time allocation rules
- Modifying stint state management
- Adding new time-based features

---

## Animation Module (`/animation/`)

### `animation/animationSupport.js`
**Purpose**: Complete animation calculation and orchestration system  
**Responsibilities**:
- Position capture and mapping for all team modes
- Distance calculation between UI positions
- Animation timing and orchestration
- Integration with pure logic functions
- CSS animation class and style generation

#### Core Functions

**`captureAllPlayerPositions(formation, allPlayers, teamConfig)`**
- Captures current positions of all players including goalie
- Maps each player to their UI position index and role
- Returns position snapshot for before/after comparison
- Supports all team configurations (individual 6-player, individual 7-player, 7v7 formats)

**`calculateAllPlayerAnimations(beforePositions, afterPositions, teamConfig)`**
- Compares before/after position snapshots
- Calculates pixel distance each player needs to move
- Determines animation direction (up/down)
- Returns animation data for all moving players

**`animateStateChange(gameState, pureLogicFunction, applyStateFunction, ...)`**
- **Main animation entry point** - use this for all state changes that need animation
- Captures before positions, applies logic, captures after positions
- Calculates and triggers animations for position changes
- Orchestrates timing: animations → state updates → glow effects → cleanup
- Integrates with React state management hooks

**`getPlayerAnimationProps(playerId, animationState)`**
- Helper for components to get animation CSS classes and styles
- Returns animation class, z-index, and CSS custom properties
- Used during rendering to apply animations to specific players

#### Animation Flow
1. **Initiation Phase**: Capture current state and apply logic function
2. **Calculation Phase**: Compare before/after positions and compute movements
3. **Animation Phase (1000ms)**: CSS animations move players visually
4. **State Application Phase**: Update React state after animation completes
5. **Completion Phase (900ms)**: Glow effect and cleanup

#### Layout Calculations
```javascript
const MEASUREMENTS = {
  padding: 16,     // Component padding (8px top + 8px bottom)
  border: 4,       // Border width (2px top + 2px bottom)
  gap: 8,          // Space between components
  contentHeight: 76 // Height of individual component content
};
```

**When to modify**:
- Adding new team configurations (update position mappings)
- Changing UI layout (update measurement constants)
- Adding new animation types (extend animation calculation)
- Modifying timing behavior (adjust duration constants)

---

## Handlers Module (`/handlers/`) - Event Handler Factories

The handlers module contains domain-organized event handler factories that integrate game logic with UI interactions. Each handler file focuses on a specific domain and follows consistent patterns for state management and animation integration.

### `handlers/fieldPositionHandlers.js`
**Purpose**: Field position interaction logic (formerly longPressHandlers.js, now quickTapHandlers)
**Responsibilities**:
- `createFieldPositionHandlers()`: Creates callbacks for field position long press interactions
- `handleFieldPlayerQuickTap()`: Opens field player modal for individual modes
- `handleSubstituteQuickTap()`: Opens substitute modal for 7-player individual mode
- `createPositionCallback()`: Creates position-specific callback functions

**Key characteristics**:
- Domain-based naming (field positions, not technical implementation)
- Returns callback functions for integration with `useQuickTapWithScrollDetection` hook
- Formation-aware logic for different squad sizes
- Modal integration through modalHandlers dependency

**Integration with scroll detection**:
- Callbacks are consumed by `useFieldPositionHandlers` hook
- Universal scroll detection prevents accidental modal triggers during scrolling
- Follows React hooks rules by separating callback creation from hook usage

### `handlers/goalieHandlers.js`
**Purpose**: Goalie replacement and interaction logic  
**Responsibilities**:
- `createGoalieHandlers()`: Creates goalie interaction handlers
- `handleGoalieQuickTap()`: Opens goalie replacement modal
- `handleSelectNewGoalie()`: Performs animated goalie switch using game logic
- `handleCancelGoalieModal()`: Modal cancellation with browser back integration
- `goalieCallback`: Long press callback for integration with scroll detection

**Integration points**:
- Uses `calculateGoalieSwitch` from game logic for state transitions
- Integrates with animation system for smooth goalie changes
- Modal management with browser back button support

### `handlers/substitutionHandlers.js`
**Purpose**: Player substitution operations and game state transitions
**Responsibilities**:
- `createSubstitutionHandlers()`: Creates substitution-related handlers
- `handleSubstitutionWithHighlight()`: Animated substitution with time tracking
- `handleSetNextSubstitution()` / `handleSubstituteNow()`: Next substitution management
- `handleChangePosition()`: Position switching between field players
- `handleUndo()`: Substitution undo with animation and time restoration
- Modal handlers for field player and substitute interactions

**Key features**:
- Formation-aware substitution logic for different squad sizes
- Integration with animation system using `animateStateChange`
- Time tracking and undo functionality
- Complex modal workflows for position changes

### `handlers/scoreHandlers.js`
**Purpose**: Score tracking and editing functionality  
**Responsibilities**:
- `createScoreHandlers()`: Creates score-related handlers
- `handleAddHomeGoal()` / `handleAddAwayGoal()`: Goal increment actions
- `handleScoreEdit()`: Manual score editing
- `handleOpenScoreEdit()`: Score editing modal management

**Integration points**:
- Direct state updates through stateUpdaters
- Modal management for score editing interface

### `handlers/timerHandlers.js`
**Purpose**: Timer pause/resume functionality with player time tracking  
**Responsibilities**:
- `createTimerHandlers()`: Creates timer control handlers
- `handlePauseTimer()` / `handleResumeTimer()`: Timer state management
- `updatePlayerStatsForPause()`: Player stint time updates during pause/resume

**Integration points**:
- Uses `handlePauseResumeTime` from time module for stint calculations
- Updates player stats when timer state changes
- Integrates with timer controls from parent component

**Handler Architecture Benefits**:
- **Domain Organization**: Each handler focuses on a specific game domain
- **Dependency Injection**: Handlers receive dependencies (state updaters, modal handlers, animation hooks)
- **Pure Logic Integration**: Handlers orchestrate pure game logic functions with UI state
- **Consistent Patterns**: All handlers follow similar factory function patterns
- **Testability**: Handler factories can be tested in isolation with mock dependencies

---

## UI Module (`/ui/`) - Game Screen UI Utilities

The UI module contains focused utilities for game screen rendering, separated from business logic to maintain clean architecture and reusability.

### `ui/positionUtils.js`
**Purpose**: Position-related UI utilities for rendering consistency  
**Responsibilities**:
- `getPositionIcon()`: Returns appropriate icon (Shield/Sword/RotateCcw) for positions
- `getPositionDisplayName()`: Position names with inactive player support
- `getIndicatorProps()`: Next/nextNext indicator logic for different team modes
- `getPositionEvents()`: Extracts long press event handlers from position key
- `supportsInactiveUsers()` / `supportsNextNextIndicators()`: Formation capability checks

**Key features**:
- Formation-aware UI logic (handles differences between team modes)
- Inactive player status integration for 7-player individual mode
- Consistent icon and naming across different formation renderers

### `ui/playerStyling.js`
**Purpose**: Player styling calculations for visual consistency  
**Responsibilities**:
- `getPlayerStyling()`: Calculates background, text, border colors and glow effects
- Handles field vs substitute vs inactive player appearance
- Next/nextNext indicator styling with formation support
- Recently substituted player glow effects

**Styling logic**:
- **Background colors**: Field (sky-500), substitute (slate-600), inactive (slate-700)
- **Border indicators**: Next off (rose), next on (emerald), recently substituted (yellow glow)
- **Configuration support**: Inactive styling only for configurations that support it
- **State priority**: Recently substituted overrides other indicators

### `ui/playerAnimation.js`
**Purpose**: Animation property extraction and management
**Responsibilities**:
- `getPlayerAnimation()`: Individual player animation properties
- Animation class, z-index, and style prop extraction

**Integration points**:
- Uses `getPlayerAnimationProps` from animation module
- Returns consistent animation property structure

**UI Module Benefits**:
- **Separation of Concerns**: UI logic separated from business logic
- **Reusability**: UI utilities can be shared across formation renderers
- **Consistency**: Centralized styling and display logic ensures visual consistency
- **Configuration Awareness**: All utilities handle differences between team configurations
- **Maintainability**: UI changes isolated from game logic changes

---

## Queue Module (`/queue/`)

### `queue/rotationQueue.js`
**Purpose**: Player rotation queue with inactive player support  
**Responsibilities**:
- Manages ordered list of players for substitution rotation
- Handles player activation/deactivation (removes from active queue)
- Provides queue manipulation operations (add, remove, reorder)
- Tracks inactive players separately from active rotation
- Integrates with game logic for substitution decisions

#### Core Classes

**`RotationQueue`** - Main queue management class
- `queue`: Array of active player IDs in rotation order
- `inactivePlayers`: Array of inactive player IDs (removed from rotation)
- `getPlayerById`: Player lookup function for status checking

#### Key Operations

**Queue Management**:
- `toArray()`: Returns current queue as array
- `getActiveQueue()`: Returns active players (same as toArray)
- `size()`: Total queue length
- `activeSize()`: Active players count
- `inactiveSize()`: Inactive players count

**Player Access**:
- `getNextActivePlayer(count = 1)`: Get next N players to be substituted
- `getInactivePlayers()`: Get all inactive players
- `contains(playerId)`: Check if player is in active queue
- `getPosition(playerId)`: Get player's position in queue

**Queue Manipulation**:
- `rotatePlayer(playerId)`: Move player to end of queue (standard substitution)
- `addPlayer(playerId, position)`: Add player at specific position
- `removePlayer(playerId)`: Remove player from queue entirely
- `moveToFront(playerId)`: Make player next to be substituted
- `insertBefore(playerIdToMove, targetPlayerId)`: Insert player before another

**Inactive Player Management**:
- `deactivatePlayer(playerId)`: Remove player from active rotation
- `reactivatePlayer(playerId)`: Return player to active rotation
- `isPlayerInactive(playerId)`: Check if player is inactive

**Advanced Operations**:
- `initialize()`: Separate active/inactive players based on player data
- `reorderByPositions(positionOrder)`: Completely reorder queue
- `reset(players)`: Replace entire queue and clear inactive list
- `clone()`: Create deep copy of queue including inactive players

**When to modify**:
- Adding new queue ordering algorithms
- Implementing complex rotation rules
- Adding queue validation logic
- Extending inactive player behavior

---

# Key Concepts

## Game State
The central `gameState` object contains:
- `formation`: Current player positions and formation structure
- `allPlayers`: Complete player data with stats and status
- `rotationQueue`: Order of players for substitutions
- `teamConfig`: Team configuration object with format, squadSize, and formation
- `nextPlayerIdToSubOut`, `nextNextPlayerIdToSubOut`: Rotation tracking
- `playersToHighlight`: Players to show glow effects
- Various timing and metadata fields

## Team Configuration System
Modern composite team configuration architecture with three components:

### Configuration Components
- **Format**: Field format (`5v5`, `7v7`)
- **Squad Size**: Total players (5-15 players supported)
- **Formation**: Tactical formation (`2-2`, `1-2-1`, `2-2-2`, `2-3-1`)

### Supported Configurations
- **Individual Modes**: 5-15 player squads managed via the round-robin rotation queue
- **Formation Support**: 2-2, 1-2-1, 2-2-2, and 2-3-1 formations fully implemented
- **Role Tracking**: Defender, Attacker, Midfielder (1-2-1, 2-2-2, 2-3-1), and Goalie roles

## Animation Orchestration
The unified animation system:
1. Uses `captureAllPlayerPositions()` to snapshot current layout
2. Applies pure logic functions to calculate new state
3. Uses `calculateAllPlayerAnimations()` to determine movement distances
4. Orchestrates timing with `animateStateChange()` for smooth transitions

---

# Design Patterns

## Pure Function Architecture
All state transitions follow this pattern:
```javascript
export const calculateOperation = (gameState, ...params) => {
  // Validate inputs
  if (/* invalid conditions */) {
    console.warn('Validation message');
    return gameState; // Return unchanged state
  }
  
  // Calculate new state
  const newFormation = { ...gameState.formation };
  const newPlayers = gameState.allPlayers.map(player => {
    // Player-specific updates
    return updatedPlayer;
  });
  
  // Return new complete state
  return {
    ...gameState,
    formation: newFormation,
    allPlayers: newPlayers,
    playersToHighlight: changedPlayerIds
  };
};
```

## Time Calculation Pattern
Player time tracking follows this approach:
1. Calculate time spent in current stint: `currentTime - lastStintStartTime`
2. Add stint time to appropriate counters (field, sub, goalie, role-specific)
3. Update status and reset stint timer: `lastStintStartTimeEpoch = currentTime`
4. Respect pause state: skip calculations when `isSubTimerPaused = true`

## Error Handling Strategy
- Validate inputs and return unchanged state for invalid operations
- Log warnings for debugging without breaking game flow
- Graceful degradation: prefer partial success over complete failure
- No exceptions thrown from pure functions

---

# Usage Guidelines

## Adding New Game Operations
1. **Create pure logic function** in `gameStateLogic.js`:
   ```javascript
   export const calculateNewOperation = (gameState, ...params) => {
     // Return new game state without modifying input
     return { ...gameState, /* changes */ };
   };
   ```

2. **Create or extend handler factory** in appropriate `handlers/` file:
   ```javascript
   export const createNewOperationHandlers = (dependencies) => {
     const handleNewOperation = () => {
       animateStateChange(
         gameStateFactory(),
         calculateNewOperation,
         applyStateChanges,
         setAnimationState,
         setHideNextOffIndicator,
         setRecentlySubstitutedPlayers
       );
     };
     
     return { handleNewOperation };
   };
   ```

3. **Integrate handlers in GameScreen** with dependency injection:
   ```javascript
   const newOperationHandlers = React.useMemo(() =>
     createNewOperationHandlers(dependencies),
     [dependencies]
   );
   ```

## Adding New Long Press Interactions
1. **Add callback to appropriate handler factory** (e.g., `fieldPositionHandlers.js`):
   ```javascript
   const newPositionCallback = () => {
     // Handle new position interaction
   };
   
   return { ...existingCallbacks, newPositionCallback };
   ```

2. **Extend `useFieldPositionHandlers` hook** to include new callback:
   ```javascript
   const newPositionEvents = useQuickTapWithScrollDetection(
     fieldPositionCallbacks.newPositionCallback || (() => {}), 500
   );
   ```

3. **Use in formation renderer**:
   ```javascript
   <div {...quickTapHandlers.newPositionEvents}>
     {/* Position content */}
   </div>
   ```

## Extending Team Configurations
- Update position utilities for new configurations
- Extend animation position mappings in `animationSupport.js`
- Add formation-specific logic to substitution manager
- Test new configurations thoroughly across all game functions

## Queue Integration Example
```javascript
import { createRotationQueue } from './queue/rotationQueue';
import { createPlayerLookup } from '../utils/playerUtils';

// Create queue with player lookup for inactive status checking
const queueManager = createRotationQueue(
  gameState.rotationQueue, 
  createPlayerLookup(gameState.allPlayers)
);

// Initialize to separate active/inactive players
queueManager.initialize();

// Perform operations
queueManager.rotatePlayer(substitutedPlayerId);

// Update game state
const newGameState = {
  ...gameState,
  rotationQueue: queueManager.toArray()
};
```

## Animation Integration Example
```javascript
import { animateStateChange } from './animation/animationSupport';
import { calculatePositionSwitch } from './logic/gameStateLogic';

const handlePositionSwitch = (player1Id, player2Id) => {
  animateStateChange(
    createGameState(),
    (state) => calculatePositionSwitch(state, player1Id, player2Id),
    (newState) => {
      setFormation(newState.formation);
      setAllPlayers(newState.allPlayers);
      // ... update other state
    },
    setAnimationState,
    setHideNextOffIndicator,
    setRecentlySubstitutedPlayers
  );
};
```

---

# Formation and Configuration Support Details

## Formations

### 2-2 Formation (Fully Implemented)
- **Field positions**: `leftDefender`, `rightDefender`, `leftAttacker`, `rightAttacker`
- **Role mapping**: Defenders (left/right), Attackers (left/right)
- **Supports**: All squad sizes (5-15 players) with individual substitution

### 1-2-1 Formation (Fully Implemented)
- **Field positions**: `defender`, `left`, `right`, `attacker`
- **Role mapping**: Defender (1), Midfielders (left/right), Attacker (1)
- **Midfielder support**: Full time tracking for `timeAsMidfielderSeconds`
- **Supports**: All squad sizes with individual substitution

### 2-2-2 Formation (Fully Implemented)
- **Field positions**: `leftDefender`, `rightDefender`, `leftMidfielder`, `rightMidfielder`, `leftAttacker`, `rightAttacker`
- **Role mapping**: Defenders (left/right), Midfielders (left/right), Attackers (left/right)
- **Format**: 7v7 only
- **Supports**: 9-15 player squads with individual substitution

### 2-3-1 Formation (Fully Implemented)
- **Field positions**: `leftDefender`, `rightDefender`, `leftMidfielder`, `centerMidfielder`, `rightMidfielder`, `attacker`
- **Role mapping**: Defenders (left/right), Midfielders (left/center/right), Attacker (1)
- **Format**: 7v7 only
- **Supports**: 9-15 player squads with individual substitution

## Substitution System

### Individual Mode (rotation queue)
- Used with 5-15 player squads
- Individual field positions based on formation
- Substitute positions vary by squad size: `substitute` (5-6 players), `substitute_1`/`substitute_2` (7-8 players), etc.
- Individual player substitutions and role tracking
- Inactive player support for 7+ player squads
- Next/next-next tracking for substitute management

---

# Integration Points

## Components
- `components/game/GameScreen.js`: Main consumer, orchestrates UI and game state using handler factories
- `components/game/formations/`: Formation renderers using UI utilities for consistent styling
- `components/setup/`: Initialize game state and player data (uses constants and utils)
- `components/stats/`: Read game state for reporting (uses rolePointUtils)

## Constants & Utilities (Cross-Screen)
- `constants/playerConstants.js`: Core domain constants (PLAYER_ROLES)
- `constants/gameConfig.js`: Configuration options for setup screens
- `constants/defaultData.js`: Default data for initialization
- `utils/playerUtils.js`: Player data operations and queries (now includes initializePlayers)
- `utils/rolePointUtils.js`: Role point calculations for statistics
- `utils/positionUtils.js`: Formation-specific position calculations
- `utils/persistenceManager.js`: State saving and loading

## Hooks
- `hooks/useGameState.js`: React state management for game data
- `hooks/useTimers.js`: Time tracking integration
- `hooks/useQuickTapWithScrollDetection.js`: Universal quick tap with scroll detection
- `hooks/useFieldPositionHandlers.js`: Field position event handler integration with React hooks

## Game Modules Integration Flow
1. **GameScreen** creates handler factories (`handlers/`) with dependency injection
2. **Handler factories** return callbacks and action handlers
3. **React hooks** integrate callbacks with `useQuickTapWithScrollDetection` for event handling
4. **Formation renderers** use UI utilities (`ui/`) for consistent styling and behavior
5. **Game logic** (`logic/`) provides pure functions for state transitions
6. **Animation system** (`animation/`) orchestrates visual transitions
7. **Time tracking** (`time/`) manages player stint calculations

---

# Debugging and Testing

## Testing Pure Functions
All logic functions can be tested in isolation:
```javascript
const testState = {
  formation: { /* test formation */ },
  allPlayers: [ /* test players */ ],
  teamConfig: { format: '5v5', squadSize: 6, formation: '2-2' }
};

const result = calculateSubstitution(testState);
expect(result.formation).toBe(/* expected formation */);
```

## Animation Debugging
```javascript
// Enable debug logging
const animations = calculateAllPlayerAnimations(before, after, teamConfig);
console.log('Animation data:', animations);
```

## Queue Debugging
```javascript
console.log('Active queue:', queue.getActiveQueue());
console.log('Inactive players:', queue.getInactivePlayers());
console.log('Next player:', queue.getNextActivePlayer());
```

## Common Issues
- **State inconsistency**: Verify pure functions return consistent results
- **Animation timing**: Ensure duration matches CSS animation timing
- **Queue desync**: Ensure initialize() called after loading state
- **Z-index conflicts**: Check moving direction and z-index classes

This architecture ensures maintainable, testable code with clear separation between business logic, visual presentation, and data management.
