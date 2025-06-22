# Game Logic Architecture

This folder contains all game-specific logic, state management, and systems for the GameScreen functionality. The code is organized into focused, modular units that handle different aspects of game state and behavior.

## Folder Structure Overview

```
src/
├── constants/                   # Domain constants and configuration options
│   ├── playerConstants.js      # PLAYER_ROLES, FORMATION_TYPES
│   ├── gameConfig.js           # PERIOD_OPTIONS, DURATION_OPTIONS, ALERT_OPTIONS
│   └── defaultData.js          # initialRoster and other default data
├── utils/                      # Utilities used across multiple screens
│   ├── rolePointUtils.js      # calculateRolePoints() for stats calculations
│   └── playerUtils.js         # Player operations, now includes initializePlayers()
└── game/                       # Game screen specific logic and systems
    ├── README.md               # This file - game screen architecture documentation
    ├── index.js                # Main barrel exports for the game module
    ├── logic/                  # Core game state calculation and business logic
    │   ├── index.js           # Logic module barrel exports
    │   ├── gameStateLogic.js  # Pure functions for state transitions
    │   ├── substitutionManager.js # Substitution business logic
    │   └── positionUtils.js   # Position and formation utilities
    ├── animation/              # Animation system for visual transitions
    │   ├── index.js           # Animation module barrel exports
    │   └── animationSupport.js # Unified animation calculation and orchestration
    └── queue/                  # Player rotation queue management
        ├── index.js           # Queue module barrel exports
        └── rotationQueue.js   # Player rotation and activation state management
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
- `FORMATION_TYPES`: Supported formation modes (PAIRS_7, INDIVIDUAL_6, INDIVIDUAL_7)

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
- Adding new formation types (update `playerConstants.js`)
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
- `calculateSubstituteSwap()`: Swaps substitute7_1 and substitute7_2 positions
- `calculateNextSubstitutionTarget()`: Updates next player/pair to substitute

**Key characteristics**:
- All functions are pure (input → output, no side effects)
- Functions can be used for previews, undo calculations, and animations
- Error handling returns unchanged state rather than throwing
- Time calculations respect pause state
- Each function returns complete new game state

**When to add functions**:
- New game operations (e.g., captain assignment, penalty management)
- Formation-specific rules (e.g., pair-breaking logic)
- Time-based calculations (e.g., fatigue tracking)

### `logic/substitutionManager.js`
**Purpose**: Specialized substitution business logic and time calculation  
**Responsibilities**:
- `SubstitutionManager` class: Handles formation-specific substitution logic
- `calculatePlayerTimeStats()`: Updates player time tracking based on current stint
- `handleRoleChange()`: Manages role transitions within periods
- Formation-specific handlers:
  - `handlePairsSubstitution()`: Pairs mode substitution logic
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
- Adding support for new formation types

### `logic/positionUtils.js`
**Purpose**: Position and formation utilities for game logic  
**Responsibilities**:
- `getPositionRole(position)`: Maps position strings to player roles
- `getOutfieldPositions(formationType)`: Gets outfield position lists by formation
- `getFieldPositions(formationType)`: Gets field positions (excludes substitutes)
- `getSubstitutePositions(formationType)`: Gets substitute position lists
- `isFieldPosition(position, formationType)`: Checks if position is field position
- `isSubstitutePosition(position, formationType)`: Checks if position is substitute
- `getExpectedOutfieldPlayerCount(formationType)`: Gets expected player counts

**Key characteristics**:
- Pure functions with no side effects
- Formation-aware utilities
- Single source of truth for position-to-role mapping
- Used throughout game logic for position validation and role determination

**When to modify**:
- Adding new formation types (update all position list functions)
- Changing position naming conventions
- Adding new position validation rules
- Modifying role assignment logic

---

## Animation Module (`/animation/`)

### `animation/animationSupport.js`
**Purpose**: Complete animation calculation and orchestration system  
**Responsibilities**:
- Position capture and mapping for all formation types
- Distance calculation between UI positions
- Animation timing and orchestration
- Integration with pure logic functions
- CSS animation class and style generation

#### Core Functions

**`captureAllPlayerPositions(periodFormation, allPlayers, formationType)`**
- Captures current positions of all players including goalie
- Maps each player to their UI position index and role
- Returns position snapshot for before/after comparison
- Supports all formation types (PAIRS_7, INDIVIDUAL_6, INDIVIDUAL_7)

**`calculateAllPlayerAnimations(beforePositions, afterPositions, formationType)`**
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
  contentHeight: {
    pairs: 84,     // Height of pair component content
    individual: 76 // Height of individual component content
  }
};
```

**When to modify**:
- Adding new formation types (update position mappings)
- Changing UI layout (update measurement constants)
- Adding new animation types (extend animation calculation)
- Modifying timing behavior (adjust duration constants)

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
- `periodFormation`: Current player positions and formation structure
- `allPlayers`: Complete player data with stats and status
- `rotationQueue`: Order of players for substitutions
- `formationType`: PAIRS_7, INDIVIDUAL_6, or INDIVIDUAL_7
- `nextPlayerIdToSubOut`, `nextNextPlayerIdToSubOut`: Rotation tracking
- `playersToHighlight`: Players to show glow effects
- Various timing and metadata fields

## Formation Types
Three supported formation types:
- **PAIRS_7**: 7-player pairs mode (2 field pairs + 1 substitute pair + goalie)
- **INDIVIDUAL_6**: 6-player individual mode (4 field players + 1 substitute + goalie)  
- **INDIVIDUAL_7**: 7-player individual mode (4 field players + 2 substitutes + goalie)

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
  const newFormation = { ...gameState.periodFormation };
  const newPlayers = gameState.allPlayers.map(player => {
    // Player-specific updates
    return updatedPlayer;
  });
  
  // Return new complete state
  return {
    ...gameState,
    periodFormation: newFormation,
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

2. **Use unified animation system** in GameScreen component:
   ```javascript
   animateStateChange(
     createGameState(),
     calculateNewOperation,
     applyStateChanges,
     setAnimationState,
     setHideNextOffIndicator,
     setRecentlySubstitutedPlayers
   );
   ```

## Extending Formation Types
- Add new formation constants to `constants/playerConstants.js`
- Update position utilities in `utils/positionUtils.js` 
- Extend animation position mappings in `animationSupport.js`
- Add formation-specific logic to substitution manager

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
      setPeriodFormation(newState.periodFormation);
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

# Formation Support Details

## PAIRS_7 (Pairs Mode)
- Field positions: `leftPair`, `rightPair` (each with defender/attacker roles)
- Substitute position: `subPair` (defender/attacker pair)
- Goalie: `goalie` (single position)
- Substitutions swap entire pairs
- Role swapping within pairs supported
- Queue contains individual player IDs, not pair objects
- Next pair determined by which pair contains queue[0]

## INDIVIDUAL_6 (6-Player Mode)
- Field positions: `leftDefender`, `rightDefender`, `leftAttacker`, `rightAttacker`
- Substitute position: `substitute` (single player)
- Goalie: `goalie` (single position)
- Individual player substitutions
- Position-based role assignment
- Simple rotation: substituted player moves to end
- Next player is always queue[0]

## INDIVIDUAL_7 (7-Player Mode)
- Field positions: `leftDefender7`, `rightDefender7`, `leftAttacker7`, `rightAttacker7`
- Substitute positions: `substitute7_1`, `substitute7_2` (two separate substitutes)
- Goalie: `goalie` (single position)
- Individual player substitutions with rotation
- Inactive player support (players can be temporarily removed from rotation)
- Complex rotation with inactive player support
- Next/next-next tracking for substitute management
- Reactivation puts player at end of queue (lowest priority)

---

# Integration Points

## Components
- `components/game/GameScreen.js`: Main consumer, orchestrates UI and game state
- `components/setup/`: Initialize game state and player data (uses constants and utils)
- `components/stats/`: Read game state for reporting (uses rolePointUtils)

## Constants & Utilities (Cross-Screen)
- `constants/playerConstants.js`: Core domain constants (PLAYER_ROLES, FORMATION_TYPES)
- `constants/gameConfig.js`: Configuration options for setup screens
- `constants/defaultData.js`: Default data for initialization
- `utils/playerUtils.js`: Player data operations and queries (now includes initializePlayers)
- `utils/rolePointUtils.js`: Role point calculations for statistics
- `utils/positionUtils.js`: Formation-specific position calculations
- `utils/persistenceManager.js`: State saving and loading

## Hooks
- `hooks/useGameState.js`: React state management for game data
- `hooks/useTimers.js`: Time tracking integration

---

# Debugging and Testing

## Testing Pure Functions
All logic functions can be tested in isolation:
```javascript
const testState = {
  periodFormation: { /* test formation */ },
  allPlayers: [ /* test players */ ],
  formationType: 'INDIVIDUAL_6'
};

const result = calculateSubstitution(testState);
expect(result.periodFormation).toBe(/* expected formation */);
```

## Animation Debugging
```javascript
// Enable debug logging
const animations = calculateAllPlayerAnimations(before, after, formationType);
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