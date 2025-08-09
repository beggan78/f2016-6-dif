# Animation Module - Claude Code Memory

## Purpose
Complete animation calculation and orchestration system that provides smooth visual transitions for all game state changes. Captures player positions, calculates movement distances, and orchestrates timing between animations and state updates.

## Key Files

### `animationSupport.js` - Unified Animation System
**Main Entry Point**: `animateStateChange()` - use this for all state changes that need animation

**Core Functions**:

#### Position Management
- `captureAllPlayerPositions(formation, allPlayers, teamConfig)`: Captures current positions of all players including goalie
- `calculateAllPlayerAnimations(beforePositions, afterPositions, teamConfig)`: Compares before/after position snapshots and calculates movements

#### Animation Orchestration
- `animateStateChange(gameState, pureLogicFunction, applyStateFunction, ...)`: Main orchestration function
- `getPlayerAnimationProps(playerId, animationState)`: Helper for components to get animation CSS classes and styles

## Animation Flow
The animation system follows this 5-phase orchestration:

### 1. Initiation Phase
- Capture current state positions using `captureAllPlayerPositions()`
- Apply pure logic function to calculate new state
- Return immediately if no changes detected

### 2. Calculation Phase  
- Capture new state positions
- Compare before/after positions using `calculateAllPlayerAnimations()`
- Compute movement distances and directions for each player

### 3. Animation Phase (1000ms)
- Apply CSS animations to move players visually
- Set z-index for proper layering during movement
- Players move to their new positions without state changes

### 4. State Application Phase
- Update React state after animation completes
- Apply new formation and player data
- Trigger any additional state updates

### 5. Completion Phase (900ms)
- Apply glow effect to players who moved
- Clean up animation state and z-index overrides
- Reset animation tracking

## Layout Calculations

### UI Measurements
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

### Position Mapping
Each team configuration has specific position mappings:
- **Pairs**: leftPair (index 0), rightPair (index 1), subPair (index 2), goalie (index 3)
- **Individual 6-Player**: leftDefender (0), rightDefender (1), leftAttacker (2), rightAttacker (3), substitute (4), goalie (5)
- **Individual 7-Player**: leftDefender (0), rightDefender (1), leftAttacker (2), rightAttacker (3), substitute_1 (4), substitute_2 (5), goalie (6)

## Usage Patterns

### Standard Animation Integration
```javascript
import { animateStateChange } from './animation/animationSupport';
import { calculateOperation } from './logic/gameStateLogic';

const handleOperation = () => {
  animateStateChange(
    createGameState(),
    (state) => calculateOperation(state, ...params),
    (newState) => {
      setFormation(newState.formation);
      setAllPlayers(newState.allPlayers);
      // Apply other state updates
    },
    setAnimationState,
    setHideNextOffIndicator,
    setRecentlySubstitutedPlayers
  );
};
```

### Component Animation Props
```javascript
import { getPlayerAnimationProps } from './animation/animationSupport';

// In component render
const animationProps = getPlayerAnimationProps(playerId, animationState);
return (
  <div 
    className={animationProps.className}
    style={animationProps.style}
  >
    {/* Player content */}
  </div>
);
```

## Animation State Structure
```javascript
const animationState = {
  isAnimating: boolean,           // Whether animation is in progress
  animatingPlayers: {             // Per-player animation data
    [playerId]: {
      isMoving: boolean,          // Whether this player is moving
      direction: 'up' | 'down',   // Movement direction
      distance: number,           // Pixel distance to move
      fromIndex: number,          // Starting UI position index
      toIndex: number             // Ending UI position index
    }
  },
  hideNextOffIndicator: boolean,  // Hide indicators during animation
  recentlySubstitutedPlayers: Set // Players to show glow effect
};
```

## CSS Animation Classes
The system generates these CSS classes for animations:
- `animate-move-up-${distance}`: Move player up by distance pixels
- `animate-move-down-${distance}`: Move player down by distance pixels
- `z-index-moving-up` / `z-index-moving-down`: Proper layering during movement

## Integration Points

### Pure Logic Functions
Works with any pure logic function that returns new game state:
- `calculateSubstitution()`
- `calculatePositionSwitch()`
- `calculateGoalieSwitch()`
- `calculatePlayerToggleInactive()`
- `calculateSubstituteSwap()`

### React State Management
Requires these state setters:
- `setAnimationState`: Manages animation state
- `setHideNextOffIndicator`: Hides indicators during transitions
- `setRecentlySubstitutedPlayers`: Tracks players for glow effects

### Component Integration
Components use `getPlayerAnimationProps()` to apply:
- Animation CSS classes
- Z-index overrides
- CSS custom properties for distances

## Debugging Tips

### Animation Issues
```javascript
// Enable debug logging
const animations = calculateAllPlayerAnimations(before, after, teamConfig);
console.log('Animation data:', animations);
```

### Common Problems
- **No animation**: Check if positions actually changed between before/after
- **Wrong direction**: Verify position index calculations for team configuration
- **Timing issues**: Ensure CSS animation duration matches JavaScript timing
- **Z-index conflicts**: Check moving direction and z-index classes
- **State inconsistency**: Verify pure functions return consistent position mappings

### Animation Timing
- Animation duration: 1000ms (must match CSS)
- Glow effect duration: 900ms
- Total cycle time: ~2000ms for complete animation + cleanup

## When to Modify

### Adding New Team Configurations
- Update position mappings in `captureAllPlayerPositions()`
- Add new position index calculations
- Update measurement constants if UI layout changes

### Changing UI Layout
- Update measurement constants (`MEASUREMENTS` object)
- Recalculate position index mappings
- Test distance calculations for all team configurations

### Adding New Animation Types
- Extend animation calculation logic
- Add new CSS classes for movement patterns
- Update `getPlayerAnimationProps()` for new animation styles

### Modifying Timing Behavior
- Adjust duration constants
- Update CSS animation timings
- Ensure JavaScript timing matches CSS transitions

## Performance Considerations
- Position capture is optimized for minimal DOM queries
- Animation calculations are pure functions (no side effects)
- State updates are batched after animation completion
- Cleanup prevents memory leaks from animation timers