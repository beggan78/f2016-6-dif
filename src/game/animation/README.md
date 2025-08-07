# Animation System Documentation

## Overview

The DIF Coach app features a sophisticated, unified animation system that provides smooth visual transitions for all player position changes. The system combines CSS keyframe animations, React state management, and precise timing coordination to create visually appealing player movement effects with post-animation glow highlighting.

## Architecture Principles

### 🎯 **Unified Abstraction**
All player movements use the same `animateStateChange()` function, ensuring consistency across different operation types (substitutions, position switches, goalie changes, etc.).

### 🔄 **Pure Function Design**
Game logic is separated from visual effects. Pure functions calculate state changes, while the animation system handles visual transitions.

### 📍 **Position-Based Calculations**
Animations are calculated by comparing "before" and "after" player positions, making the system automatically work with any formation changes.

### ⚡ **Hardware Acceleration**
Uses CSS transforms and hardware-accelerated animations for smooth 60fps performance.

## Core Components

```
/src/game/animation/
├── animationSupport.js     # Main animation orchestration
├── README.md              # This documentation
└── QUICK_REFERENCE.md     # Quick usage guide

/src/game/ui/
├── playerAnimation.js     # Player-specific animation utilities  
└── playerStyling.js       # Glow effects and styling

/src/App.css              # CSS keyframe definitions
```

## How It Works

### 1. Animation Lifecycle

The animation system follows a precise 5-phase lifecycle:

```
User Action → Position Capture → Logic Calculation → CSS Animation → State Update → Glow Effect → Cleanup
     0ms            0ms              0ms           1000ms        1000ms      1900ms
```

#### **Phase 1: Position Capture (0ms)**
```javascript
const beforePositions = captureAllPlayerPositions(
  gameState.formation, 
  gameState.allPlayers, 
  gameState.teamConfig
);
```

#### **Phase 2: Logic Calculation (0ms)**
```javascript
const newGameState = pureLogicFunction(gameState);
const afterPositions = captureAllPlayerPositions(
  newGameState.formation, 
  newGameState.allPlayers, 
  newGameState.teamConfig
);
```

#### **Phase 3: Animation Start (0ms)**
```javascript
const animations = calculateAllPlayerAnimations(beforePositions, afterPositions, teamConfig);
setAnimationState({ type: 'generic', phase: 'switching', data: { animations } });
```

#### **Phase 4: State Update (1000ms)**
```javascript
setTimeout(() => {
  applyStateFunction(newGameState);
  // Trigger glow effects
  setRecentlySubstitutedPlayers(new Set(newGameState.playersToHighlight));
}, ANIMATION_DURATION);
```

#### **Phase 5: Cleanup (1900ms)**
```javascript
setTimeout(() => {
  setAnimationState({ type: 'none', phase: 'idle', data: {} });
  setRecentlySubstitutedPlayers(new Set());
}, ANIMATION_DURATION + GLOW_DURATION);
```

### 2. Position Index System

The system maps player positions to visual indices for distance calculations:

| Team Configuration | Position Order |
|---------------------|----------------|
| **Individual 6-Player** | goalie(0) → leftDefender(1) → rightDefender(2) → leftAttacker(3) → rightAttacker(4) → substitute(5) |
| **Individual 7-Player** | goalie(0) → leftDefender(1) → rightDefender(2) → leftAttacker(3) → rightAttacker(4) → substitute_1(5) → substitute_2(6) |
| **Pairs Configuration** | goalie(0) → leftPair(1) → rightPair(2) → subPair(3) |

**Distance Calculation:**
```javascript
const distance = Math.abs(toIndex - fromIndex) * boxHeight;
// boxHeight includes padding, border, content, and gap measurements
```

### 3. CSS Animation Classes

**Generated Classes:**
- `animate-dynamic-up` - Upward movement 
- `animate-dynamic-down` - Downward movement
- `z-10` / `z-20` - Z-index management for proper layering

**CSS Variables:**
- `--move-distance: ${pixels}px` - Dynamic distance for each animation

**Keyframes (App.css):**
```css
@keyframes dynamic-up {
  0% { transform: translateY(0); }
  100% { transform: translateY(var(--move-distance, -120px)); }
}

@keyframes dynamic-down {
  0% { transform: translateY(0); }
  100% { transform: translateY(var(--move-distance, 120px)); }
}
```

## Usage Guide

### Basic Usage Pattern

**All game operations follow this pattern:**

```javascript
import { animateStateChange } from '../animation/animationSupport';
import { calculateYourOperation } from '../logic/gameStateLogic';

const handleYourOperation = () => {
  animateStateChange(
    gameStateFactory(),           // Current game state
    calculateYourOperation,       // Pure logic function
    (newGameState) => {          // State update function
      setFormation(newGameState.formation);
      setAllPlayers(newGameState.allPlayers);
      // Apply other state updates as needed
    },
    setAnimationState,           // Animation state management
    setHideNextOffIndicator,     // UI indicator control
    setRecentlySubstitutedPlayers // Glow effect management
  );
};
```

### Adding a New Movement Type

**Step 1: Create Pure Logic Function**
```javascript
// In /src/game/logic/gameStateLogic.js
export const calculateYourNewOperation = (gameState, ...params) => {
  // Validate inputs
  if (/* invalid conditions */) {
    console.warn('Validation message');
    return gameState; // Return unchanged state
  }
  
  // Calculate new formation and players
  const newFormation = { ...gameState.formation };
  const newPlayers = gameState.allPlayers.map(player => {
    // Apply your logic here
    return updatedPlayer;
  });
  
  // Determine which players should glow
  const playersToHighlight = [/* player IDs that moved */];
  
  return {
    ...gameState,
    formation: newFormation,
    allPlayers: newPlayers,
    playersToHighlight: playersToHighlight
  };
};
```

**Step 2: Create Handler Function**
```javascript
// In your handler file
const handleYourNewOperation = () => {
  animateStateChange(
    createGameState(),
    calculateYourNewOperation,
    (newGameState) => {
      // Apply all necessary state updates
      setFormation(newGameState.formation);
      setAllPlayers(newGameState.allPlayers);
    },
    setAnimationState,
    setHideNextOffIndicator,
    setRecentlySubstitutedPlayers
  );
};
```

**Step 3: Wire to UI**
```javascript
// In your component
<button onClick={handleYourNewOperation}>
  Your Action
</button>
```

### Glow Effect Customization

**Current Glow Effect:**
```javascript
// In /src/components/game/formations/constants.js
glowEffects: {
  recentlySubstituted: 'animate-pulse shadow-lg shadow-amber-400/50 border-amber-400'
}
```

**To Add New Glow Types:**
```javascript
glowEffects: {
  recentlySubstituted: 'animate-pulse shadow-lg shadow-amber-400/50 border-amber-400',
  goalieChange: 'animate-pulse shadow-lg shadow-blue-400/50 border-blue-400',
  positionSwap: 'animate-pulse shadow-lg shadow-green-400/50 border-green-400'
}
```

## Component Integration

### Formation Components

**Individual Formation Integration:**
```javascript
import { getPlayerAnimation } from '../../game/ui/playerAnimation';

// In render function
const { animationClass, zIndexClass, styleProps } = getPlayerAnimation(playerId, animationState);

return (
  <div 
    className={`${baseClasses} ${animationClass} ${zIndexClass}`}
    style={styleProps}
  >
    {/* Player content */}
  </div>
);
```

**Pairs Formation Integration:**
```javascript
import { getPairAnimation } from '../../game/ui/playerAnimation';

// In render function  
const { animationClass, zIndexClass, styleProps } = getPairAnimation(
  pairData.defender, 
  pairData.attacker, 
  animationState
);

return (
  <div 
    className={`${baseClasses} ${animationClass} ${zIndexClass}`}
    style={styleProps}
  >
    {/* Pair content */}
  </div>
);
```

## Performance Considerations

### ✅ **Optimizations Built-In**

- **Hardware Acceleration**: Uses CSS transforms for GPU acceleration
- **Minimal DOM Updates**: Position calculations done once at start
- **Efficient State Management**: Set-based player tracking for O(1) lookups
- **Memory Management**: Automatic cleanup prevents memory leaks

### ⚡ **Performance Tips**

- **Batch State Updates**: Use the provided state update function to batch all changes
- **Avoid Rapid Animations**: System prevents overlapping animations automatically
- **CSS-Only Movements**: Animations use only CSS transforms, no JavaScript polling

### 📊 **Timing Constants**

```javascript
export const ANIMATION_DURATION = 1000; // 1 second - smooth but not sluggish
export const GLOW_DURATION = 900;       // 0.9 seconds - slightly shorter than animation
```

These values are user-tested for optimal feel and can be adjusted if needed.

## Troubleshooting

### Common Issues

**❌ Animation Not Working**
- ✅ Check if `playersToHighlight` is set in your logic function
- ✅ Verify position changes actually occurred between before/after states
- ✅ Ensure `animateStateChange` is called with correct parameters

**❌ Glow Effect Not Showing**
- ✅ Verify `playersToHighlight` contains the correct player IDs
- ✅ Check that styling logic includes your player IDs
- ✅ Ensure glow CSS classes are properly defined

**❌ Animation Stuttering**
- ✅ Check for rapid successive calls to `animateStateChange`
- ✅ Verify CSS animation duration matches JavaScript timing
- ✅ Ensure proper z-index classes are applied

**❌ Wrong Animation Direction**
- ✅ Verify position index calculations for your team configuration
- ✅ Check that formation position order matches visual layout
- ✅ Ensure before/after positions are captured correctly

### Debug Techniques

**Enable Debug Logging:**
```javascript
// Temporarily add to your logic function
console.log('Animation data:', {
  beforePositions,
  afterPositions,
  animations,
  playersToHighlight: newGameState.playersToHighlight
});
```

**CSS Animation Debug:**
```css
/* Temporarily slow down animations to debug */
.animate-dynamic-up, .animate-dynamic-down {
  animation-duration: 3s !important;
}
```

## Testing

### Test Patterns

**Animation Calculation Tests:**
```javascript
test('calculates correct animation distances', () => {
  const animations = calculateAllPlayerAnimations(before, after, teamConfig);
  expect(animations[playerId]).toBeDefined();
  expect(animations[playerId].direction).toBe('down');
  expect(animations[playerId].distance).toBeGreaterThan(0);
});
```

**Component Integration Tests:**
```javascript
test('applies animation classes correctly', () => {
  render(<PlayerComponent animationState={mockAnimationState} />);
  const element = screen.getByTestId('player-element');
  expect(element).toHaveClass('animate-dynamic-up');
  expect(element).toHaveStyle('--move-distance: 208px');
});
```

**Handler Integration Tests:**
```javascript
test('triggers animation on user action', () => {
  const mockSetAnimationState = jest.fn();
  render(<Component setAnimationState={mockSetAnimationState} />);
  
  fireEvent.click(screen.getByText('Substitute'));
  
  expect(mockSetAnimationState).toHaveBeenCalledWith({
    type: 'generic',
    phase: 'switching',
    data: expect.objectContaining({ animations: expect.any(Object) })
  });
});
```

## Advanced Topics

### Multi-Player Animations

The system automatically handles complex scenarios:

- **Chain Substitutions**: Multiple players moving simultaneously
- **Formation Changes**: Team configuration switches with position reorganization  
- **Rotation Updates**: Queue-based player ordering with visual transitions

### Animation State Machine

```javascript
AnimationState = {
  type: 'none' | 'generic',
  phase: 'idle' | 'switching' | 'completing',
  data: { animations: { [playerId]: AnimationData } }
}

// State transitions:
// idle → switching → completing → idle
```

### CSS Custom Properties

The system uses CSS custom properties for dynamic animations:

```css
/* Generated dynamically per animation */
.player-element {
  --move-distance: 208px;
}

/* Used in keyframes */
@keyframes dynamic-up {
  100% { transform: translateY(var(--move-distance)); }
}
```

## Migration Guide

### From Manual Animations

**❌ Old Pattern:**
```javascript
// Manual player position updates
setPlayerPosition(newPosition);
setPlayerClass('moving');
setTimeout(() => setPlayerClass(''), 1000);
```

**✅ New Pattern:**
```javascript
// Unified animation system
animateStateChange(
  gameState,
  calculatePositionChange,
  applyStateChanges,
  setAnimationState,
  setHideNextOffIndicator,
  setRecentlySubstitutedPlayers
);
```

### Benefits of Migration

- **Consistency**: All animations use the same timing and visual style
- **Maintainability**: Single point of animation logic
- **Performance**: Optimized CSS animations and state management
- **Extensibility**: Easy to add new animation types

## API Reference

### Core Functions

#### `animateStateChange(gameState, logicFunction, applyFunction, ...)`

Main orchestration function for all animations.

**Parameters:**
- `gameState: GameState` - Current game state
- `logicFunction: (GameState) => GameState` - Pure function that calculates new state
- `applyFunction: (GameState) => void` - Function to apply state changes
- `setAnimationState: Function` - Animation state setter
- `setHideNextOffIndicator: Function` - UI indicator control
- `setRecentlySubstitutedPlayers: Function` - Glow effect control

#### `captureAllPlayerPositions(formation, players, teamConfig)`

Captures current player positions for animation calculation.

**Returns:** `{ [playerId]: PositionData }`

#### `calculateAllPlayerAnimations(before, after, teamConfig)`

Calculates required animations by comparing position snapshots.

**Returns:** `{ [playerId]: AnimationData }`

### Utility Functions

#### `getPlayerAnimation(playerId, animationState)`

Gets animation properties for individual player rendering.

**Returns:** `{ animationClass, zIndexClass, styleProps }`

#### `getPairAnimation(defenderId, attackerId, animationState)`

Gets animation properties for pair rendering.

**Returns:** `{ animationClass, zIndexClass, styleProps }`

### Constants

```javascript
export const ANIMATION_DURATION = 1000; // CSS animation duration
export const GLOW_DURATION = 900;       // Glow effect duration
```

## Contributing

### Adding New Features

1. **Create Pure Logic Function** in `/src/game/logic/gameStateLogic.js`
2. **Create Handler Function** using `animateStateChange` pattern
3. **Add Tests** for logic function and handler integration
4. **Update Documentation** with new usage examples

### Code Style

- Use pure functions for all game logic
- Include `playersToHighlight` in logic function returns
- Follow existing handler patterns for consistency
- Add JSDoc comments for new public functions

---

## Summary

The animation system provides a powerful, unified abstraction for player movements that:

- ✅ **Works for all team configurations** (pairs, individual 6-player, individual 7-player)
- ✅ **Handles all movement types** (substitutions, swaps, goalie changes)
- ✅ **Provides consistent visual feedback** with glow effects
- ✅ **Performs efficiently** with hardware-accelerated CSS
- ✅ **Integrates seamlessly** with React state management
- ✅ **Scales easily** for new features and enhancements

By following the patterns documented here, you can confidently add new animations and maintain the high-quality user experience of the DIF Coach app.