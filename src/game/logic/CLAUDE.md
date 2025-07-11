# Game Logic Module - Claude Code Memory

## Purpose
Contains pure functions for all game state transitions and calculations. Handles core business logic for substitutions, position changes, goalie switches, and formation management without side effects.

## Key Files

### `gameStateLogic.js` - Core State Transitions
**Main Functions**:
- `calculateSubstitution()`: Computes state after a substitution operation
- `calculatePositionSwitch()`: Handles swapping two players' positions
- `calculateGoalieSwitch()`: Manages goalie changes and role transitions
- `calculateUndo()`: Reverses the most recent substitution with time adjustments
- `calculatePlayerToggleInactive()`: Activates/deactivates players (7-player mode only)
- `calculateSubstituteSwap()`: Swaps substitute_1 and substitute_2 positions
- `calculateNextSubstitutionTarget()`: Updates next player/pair to substitute

**Key Characteristics**:
- All functions are pure (input → output, no side effects)
- Error handling returns unchanged state rather than throwing
- Time calculations respect pause state
- Each function returns complete new game state

### `substitutionManager.js` - Substitution Business Logic
**Responsibilities**:
- `SubstitutionManager` class: Handles formation-specific substitution logic
- `handleRoleChange()`: Manages role transitions within periods
- Formation-specific handlers:
  - `handlePairsSubstitution()`: Pairs mode substitution logic
  - `handleIndividualSubstitution()`: 6-player individual mode logic  
  - `handleIndividual7Substitution()`: 7-player individual mode with inactive support

**Integration Points**:
- Uses rotation queue for player ordering
- Updates player stats and role tracking
- Manages formation structure changes
- Handles inactive player edge cases (7-player mode)
- **Handler Requirements**: All game state changes must be applied via state updaters (setPeriodFormation, setAllPlayers, setRotationQueue, etc.)

### `positionUtils.js` - Position and Formation Utilities
**Core Functions**:
- `getPositionRole(position)`: Maps position strings to player roles
- `getOutfieldPositions(teamMode)`: Gets outfield position lists by team mode
- `getFieldPositions(teamMode)`: Gets field positions (excludes substitutes)
- `getSubstitutePositions(teamMode)`: Gets substitute position lists
- `isFieldPosition(position, teamMode)`: Checks if position is field position
- `isSubstitutePosition(position, teamMode)`: Checks if position is substitute
- `getExpectedOutfieldPlayerCount(teamMode)`: Gets expected player counts

## Pure Function Architecture Pattern
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

## Usage Guidelines

### Adding New Game Operations
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

### Extending Team Modes
- Add new formation constants to `constants/playerConstants.js`
- Update position utilities in `positionUtils.js` 
- Add formation-specific logic to substitution manager
- Extend animation position mappings in `animationSupport.js`

## Error Handling Strategy
- Validate inputs and return unchanged state for invalid operations
- Log warnings for debugging without breaking game flow
- Graceful degradation: prefer partial success over complete failure
- No exceptions thrown from pure functions

## Key Patterns

### Time Calculation Pattern
Player time tracking follows this approach:
1. Calculate time spent in current stint: `currentTime - lastStintStartTime`
2. Add stint time to appropriate counters (field, sub, goalie, role-specific)
3. Update status and reset stint timer: `lastStintStartTimeEpoch = currentTime`
4. Respect pause state: skip calculations when `isSubTimerPaused = true`

### Queue Integration
```javascript
const queueManager = createRotationQueue(
  gameState.rotationQueue, 
  createPlayerLookup(gameState.allPlayers)
);
queueManager.initialize();
queueManager.rotatePlayer(substitutedPlayerId);
const newGameState = {
  ...gameState,
  rotationQueue: queueManager.toArray()
};
```

## Testing Pure Functions
All logic functions can be tested in isolation:
```javascript
const testState = {
  periodFormation: { /* test formation */ },
  allPlayers: [ /* test players */ ],
  teamMode: 'INDIVIDUAL_6'
};

const result = calculateSubstitution(testState);
expect(result.periodFormation).toBe(/* expected formation */);
```

## Recent Fixes

### Goalie Queue Fairness Fix (2025-01-04)
**Problem**: Former goalie was always sent to end of rotation queue during switches, creating unfair rotation patterns.

**Root Cause**: Handler layer was not applying `rotationQueue` updates from `calculateGoalieSwitch()`.

**Solution**:
- **Logic Layer**: Enhanced `calculateGoalieSwitch()` to capture new goalie's queue position before removal
- **Handler Layer**: Added `setRotationQueue(newGameState.rotationQueue)` call in `goalieHandlers.js` 
- **Queue Algorithm**: Former goalie takes new goalie's exact position, preserving fairness
- **Debug Support**: Added comprehensive logging for queue position tracking

**Test Coverage**:
- Unit tests: Handler state updater integration
- Logic tests: Pure function queue calculations  
- Integration tests: End-to-end workflow verification across all team modes
- State update tests: Verification that queue changes are actually applied

**Impact**: Ensures fair rotation for all players during goalie switches across all team modes.

### Previous Fixes
- **Time Field Initialization**: Added defensive initialization for former goalies' time fields
- **Role Assignment**: Simplified role assignment to directly use new goalie's current role/status

## When to Modify
- Changing substitution rules for specific formations
- Adding time calculation logic
- Modifying rotation queue integration
- Adding support for new team modes
- Adding new player statuses or roles