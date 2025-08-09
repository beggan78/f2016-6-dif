# Game Handlers Module - Claude Code Memory

## Purpose
Coordinates UI event handling with game logic and animation systems. Provides clean separation between user interactions and core game state calculations while ensuring all state changes are properly applied to React components.

## Key Files

### `goalieHandlers.js` - Goalie Management
**Main Functions**:
- `handleGoalieQuickTap()`: Opens goalie replacement modal with available players
- `handleSelectNewGoalie()`: Executes goalie switch with animation and state updates
- `handleCancelGoalieModal()`: Closes modal and cleans up state

**Key Features**:
- Animation integration via `animateStateChange()`
- Complete state application: formation, players, and rotation queue
- Modal management with stack support
- Proper cleanup and error handling

### `substitutionHandlers.js` - Player Substitutions
**Responsibilities**:
- Regular player substitutions across all team configurations
- Timer integration and pause/resume logic (preserves pause state during substitutions)
- Animation coordination
- Queue rotation management
- Undo functionality with timer restoration

### `fieldPositionHandlers.js` - Position Management
**Responsibilities**:
- Player position switches and swaps
- Field position validation
- Animation for position changes
- Role transition management

## Handler Architecture Pattern

All handlers follow this consistent pattern:

```javascript
export const createHandlerType = (
  gameStateFactory,      // Function that returns current game state
  stateUpdaters,         // Object with React state setters
  animationHooks,        // Animation state management
  modalHandlers,         // Modal stack management
  ...additionalParams    // Handler-specific dependencies
) => {
  // Extract required state updaters
  const {
    setFormation,
    setAllPlayers,
    setRotationQueue,
    // ... other updaters as needed
  } = stateUpdaters;

  // Extract animation hooks
  const {
    setAnimationState,
    setHideNextOffIndicator,
    setRecentlySubstitutedPlayers
  } = animationHooks;

  const handleOperation = (params) => {
    animateStateChange(
      gameStateFactory(),
      (gameState) => calculateOperation(gameState, params),
      (newGameState) => {
        // CRITICAL: Apply ALL relevant state changes
        setFormation(newGameState.formation);
        setAllPlayers(newGameState.allPlayers);
        setRotationQueue(newGameState.rotationQueue);
        // Apply other state updates as needed
      },
      setAnimationState,
      setHideNextOffIndicator,
      setRecentlySubstitutedPlayers
    );
  };

  return { handleOperation };
};
```

## State Updater Requirements

### Critical State Updaters
Every handler must include these core updaters:
- `setFormation`: Updates player positions and formation
- `setAllPlayers`: Updates player stats, roles, and status
- `setRotationQueue`: Updates rotation order (CRITICAL for queue operations)

### Conditional State Updaters
Include based on handler functionality:
- `setNextPlayerIdToSubOut`: For substitution tracking
- `setNextNextPlayerIdToSubOut`: For 7-player individual configuration rotation
- `setNextPhysicalPairToSubOut`: For pairs configuration substitution
- `resetSubTimer`: For timer-related operations
- `setScore`: For score-related handlers

### Animation State Updaters
Required for all animated operations:
- `setAnimationState`: Controls animation timing and state
- `setHideNextOffIndicator`: Hides indicators during transitions
- `setRecentlySubstitutedPlayers`: Manages glow effects

## Integration Points

### Game State Factory
```javascript
const gameStateFactory = () => ({
  formation,
  allPlayers,
  teamConfig,
  rotationQueue,
  // ... all current state
});
```

### Animation System
All state changes use `animateStateChange()`:
1. Captures current positions
2. Calculates new state via pure functions
3. Determines animation requirements
4. Applies animations and state updates

### Modal Management
```javascript
const modalHandlers = {
  openModal: (data) => pushModalState(modalType, data),
  closeModal: () => removeModalFromStack(),
  removeModalFromStack
};
```

## Error Handling Strategy

### Graceful Degradation
- Handlers return unchanged state on errors
- Animation system handles failed state transitions
- Modal stack provides consistent cleanup

### Debug Support
- Comprehensive logging for state transitions
- Queue position tracking for debugging
- Animation state inspection

## Common Patterns

### Simple State Update
```javascript
const handleSimpleUpdate = (params) => {
  const newState = calculateSimpleUpdate(gameStateFactory(), params);
  setFormation(newState.formation);
  setAllPlayers(newState.allPlayers);
  // No animation needed
};
```

### Animated State Change
```javascript
const handleAnimatedChange = (params) => {
  animateStateChange(
    gameStateFactory(),
    (state) => calculateAnimatedChange(state, params),
    (newState) => {
      setFormation(newState.formation);
      setAllPlayers(newState.allPlayers);
      setRotationQueue(newState.rotationQueue);
    },
    setAnimationState,
    setHideNextOffIndicator,
    setRecentlySubstitutedPlayers
  );
};
```

### Modal-Triggered Operations
```javascript
const handleModalAction = (selectionData) => {
  // Perform operation
  animateStateChange(/* ... */);
  
  // Close modal
  closeModal();
  
  // Clean up modal stack if needed
  if (removeModalFromStack) {
    removeModalFromStack();
  }
};
```

## Testing Patterns

### Handler Unit Tests
```javascript
const mockStateUpdaters = {
  setFormation: jest.fn(),
  setAllPlayers: jest.fn(),
  setRotationQueue: jest.fn()
};

const handlers = createHandlers(
  () => mockGameState,
  mockStateUpdaters,
  mockAnimationHooks,
  mockModalHandlers
);

handlers.handleOperation(params);

expect(mockStateUpdaters.setRotationQueue).toHaveBeenCalledWith(expectedQueue);
```

### Integration Testing
- Verify complete flow from user action to state application
- Test animation coordination and timing
- Validate modal stack management

## Common Issues and Solutions

### Missing State Updates
**Problem**: Logic calculates correct state but UI doesn't update
**Solution**: Ensure all relevant state updaters are called in handler
**Example**: Missing `setRotationQueue()` call caused queue changes to be ignored

### Animation Desync
**Problem**: Animation timing doesn't match state updates
**Solution**: Use `animateStateChange()` for all animated operations
**Prevention**: Never manually manage animation timing

### Modal Stack Corruption
**Problem**: Modals don't close properly or stack incorrectly
**Solution**: Always call appropriate modal cleanup functions
**Prevention**: Use consistent modal handling patterns

## Handler Dependencies

### Required Parameters
- `gameStateFactory`: Current state accessor
- `stateUpdaters`: React state setter functions
- `animationHooks`: Animation state management
- `modalHandlers`: Modal stack operations

### Optional Parameters
- Handler-specific dependencies (player lists, team config, etc.)
- External service integrations
- Validation functions

## Performance Considerations

### State Update Batching
- React automatically batches state updates in event handlers
- Animation system coordinates timing to prevent UI thrashing
- State updaters should be called in logical order

### Pure Function Benefits
- Logic functions can be tested in isolation
- State transitions are predictable and debuggable
- Animation calculations work with any state combination

## When to Create New Handlers

### New User Interactions
- Add new handler functions to existing handler modules
- Follow established patterns for consistency
- Ensure all state changes are properly applied

### New Game Features
- Create new handler modules for major feature areas
- Maintain separation of concerns
- Integrate with existing animation and modal systems

### Handler Modifications
- Always preserve existing API contracts
- Add new parameters to end of parameter lists
- Maintain backward compatibility with existing usage

## Future Enhancements

### Middleware Support
- Consider adding middleware for logging, analytics, etc.
- Maintain handler simplicity and performance
- Preserve pure function architecture

### Advanced Animation
- Extend animation system for complex transitions
- Add support for concurrent animations
- Maintain consistent timing and state coordination