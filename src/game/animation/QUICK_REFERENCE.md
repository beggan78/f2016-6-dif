# Animation System Quick Reference

## 🚀 Quick Start

### Basic Animation Pattern
```javascript
import { animateStateChange } from './animationSupport';
import { calculateYourOperation } from '../logic/gameStateLogic';

const handleOperation = () => {
  animateStateChange(
    gameState,
    calculateYourOperation,
    (newState) => {
      setPeriodFormation(newState.periodFormation);
      setAllPlayers(newState.allPlayers);
    },
    setAnimationState,
    setHideNextOffIndicator,
    setRecentlySubstitutedPlayers
  );
};
```

## 🔧 Common Code Snippets

### Creating a New Logic Function
```javascript
// In /src/game/logic/gameStateLogic.js
export const calculateNewOperation = (gameState, param1, param2) => {
  // Validation
  if (!param1 || !param2) {
    console.warn('Invalid parameters');
    return gameState;
  }
  
  // Calculate changes
  const newFormation = { ...gameState.periodFormation };
  // ... apply your logic
  
  const newPlayers = gameState.allPlayers.map(player => {
    // ... update players as needed
    return player;
  });
  
  return {
    ...gameState,
    periodFormation: newFormation,
    allPlayers: newPlayers,
    playersToHighlight: [playerId1, playerId2] // For glow effect
  };
};
```

### Component Integration
```javascript
// Individual player animation
import { getPlayerAnimation } from '../../game/ui/playerAnimation';

const { animationClass, zIndexClass, styleProps } = getPlayerAnimation(playerId, animationState);

<div className={`${baseClass} ${animationClass} ${zIndexClass}`} style={styleProps}>
  {/* Player content */}
</div>

// Pair animation  
import { getPairAnimation } from '../../game/ui/playerAnimation';

const { animationClass, zIndexClass, styleProps } = getPairAnimation(
  defenderId, attackerId, animationState
);

<div className={`${baseClass} ${animationClass} ${zIndexClass}`} style={styleProps}>
  {/* Pair content */}
</div>
```

### Handler Creation
```javascript
// In handler files
const createHandlers = (gameStateFactory, stateUpdaters, animationHooks, ...) => {
  const handleNewOperation = (param1, param2) => {
    animateStateChange(
      gameStateFactory(),
      (state) => calculateNewOperation(state, param1, param2),
      (newState) => {
        // Apply ALL necessary state updates
        setPeriodFormation(newState.periodFormation);
        setAllPlayers(newState.allPlayers);
        // ... other updates
      },
      setAnimationState,
      setHideNextOffIndicator,
      setRecentlySubstitutedPlayers
    );
  };
  
  return { handleNewOperation };
};
```

## 📋 API Quick Reference

### Core Functions

| Function | Purpose | Returns |
|----------|---------|---------|
| `animateStateChange()` | Main animation orchestrator | `void` |
| `captureAllPlayerPositions()` | Capture position snapshot | `{[playerId]: PositionData}` |
| `calculateAllPlayerAnimations()` | Calculate movements | `{[playerId]: AnimationData}` |
| `getPlayerAnimation()` | Get animation props for player | `{animationClass, zIndexClass, styleProps}` |
| `getPairAnimation()` | Get animation props for pair | `{animationClass, zIndexClass, styleProps}` |

### Constants

```javascript
ANIMATION_DURATION = 1000;  // 1 second CSS animation
GLOW_DURATION = 900;        // 0.9 second glow effect
```

### CSS Classes

| Class | Purpose |
|-------|---------|
| `animate-dynamic-up` | Upward movement animation |
| `animate-dynamic-down` | Downward movement animation |
| `z-10` | Z-index for downward moving players |
| `z-20` | Z-index for upward moving players |
| `animate-pulse shadow-lg shadow-amber-400/50 border-amber-400` | Glow effect |

## 🎯 Position Indices

### Individual 6-Player Mode
```
goalie(0) → leftDefender(1) → rightDefender(2) → leftAttacker(3) → rightAttacker(4) → substitute(5)
```

### Individual 7-Player Mode  
```
goalie(0) → leftDefender7(1) → rightDefender7(2) → leftAttacker7(3) → rightAttacker7(4) → substitute7_1(5) → substitute7_2(6)
```

### Pairs Mode
```
goalie(0) → leftPair(1) → rightPair(2) → subPair(3)
```

## ⚡ Common Patterns

### Substitution Pattern
```javascript
const handleSubstitution = () => {
  animateStateChange(
    gameState,
    calculateSubstitution,
    (newState) => {
      setPeriodFormation(newState.periodFormation);
      setAllPlayers(newState.allPlayers);
      setRotationQueue(newState.rotationQueue);
      setNextPlayerIdToSubOut(newState.nextPlayerIdToSubOut);
    },
    setAnimationState,
    setHideNextOffIndicator,
    setRecentlySubstitutedPlayers
  );
};
```

### Position Switch Pattern
```javascript
const handlePositionSwitch = (player1Id, player2Id) => {
  animateStateChange(
    gameState,
    (state) => calculatePositionSwitch(state, player1Id, player2Id),
    (newState) => {
      setPeriodFormation(newState.periodFormation);
      setAllPlayers(newState.allPlayers);
    },
    setAnimationState,
    setHideNextOffIndicator,
    setRecentlySubstitutedPlayers
  );
};
```

### Goalie Switch Pattern
```javascript
const handleGoalieSwitch = (newGoalieId) => {
  animateStateChange(
    gameState,
    (state) => calculateGoalieSwitch(state, newGoalieId),
    (newState) => {
      setPeriodFormation(newState.periodFormation);
      setAllPlayers(newState.allPlayers);
      setRotationQueue(newState.rotationQueue);
    },
    setAnimationState,
    setHideNextOffIndicator,
    setRecentlySubstitutedPlayers
  );
};
```

## 🐛 Quick Debugging

### Check Animation Calculation
```javascript
// Add temporarily to your logic function
const beforePositions = captureAllPlayerPositions(gameState.periodFormation, gameState.allPlayers, gameState.teamMode);
const newState = calculateYourOperation(gameState);
const afterPositions = captureAllPlayerPositions(newState.periodFormation, newState.allPlayers, newState.teamMode);
const animations = calculateAllPlayerAnimations(beforePositions, afterPositions, gameState.teamMode);

console.log('Debug animation:', {
  beforePositions,
  afterPositions, 
  animations,
  playersToHighlight: newState.playersToHighlight
});
```

### Check Component Integration
```javascript
// In your component
console.log('Animation state:', animationState);
console.log('Recently substituted:', recentlySubstitutedPlayers);
```

### Slow Down Animations (Debug)
```css
/* Add temporarily to App.css */
.animate-dynamic-up, .animate-dynamic-down {
  animation-duration: 3s !important;
}
```

## ✅ Checklist for New Features

### Logic Function
- [ ] Returns new game state (doesn't modify input)
- [ ] Includes `playersToHighlight` array with affected player IDs
- [ ] Handles validation and returns unchanged state on errors
- [ ] Uses console.warn for debugging info

### Handler Function  
- [ ] Uses `animateStateChange` pattern
- [ ] Applies ALL necessary state updates in the apply function
- [ ] Passes correct parameters to animation system
- [ ] Follows existing handler naming conventions

### Component Integration
- [ ] Uses `getPlayerAnimation` or `getPairAnimation` utilities
- [ ] Applies returned classes and styles correctly
- [ ] Handles animation state properly
- [ ] Maintains proper element structure

### Testing
- [ ] Unit tests for logic function
- [ ] Integration tests for handler
- [ ] Component tests for animation rendering
- [ ] Visual testing for proper animations

## 🚨 Common Gotchas

### ❌ Don't Do This
```javascript
// Direct state updates without animation
setPeriodFormation(newFormation);
setAllPlayers(newPlayers);

// Manual animation timing
setPlayerClass('moving');
setTimeout(() => setPlayerClass(''), 1000);

// Modifying input state
gameState.periodFormation.leftDefender = newPlayerId; // Mutates input!
```

### ✅ Do This Instead
```javascript
// Use the animation system
animateStateChange(
  gameState,
  calculateOperation,
  (newState) => {
    setPeriodFormation(newState.periodFormation);
    setAllPlayers(newState.allPlayers);
  },
  setAnimationState,
  setHideNextOffIndicator,
  setRecentlySubstitutedPlayers
);

// Pure functions
const newFormation = { ...gameState.periodFormation };
newFormation.leftDefender = newPlayerId;
```

## 📖 Links

- **Full Documentation**: [README.md](./README.md)
- **Core Logic**: [/src/game/logic/gameStateLogic.js](../logic/gameStateLogic.js)
- **Animation Core**: [animationSupport.js](./animationSupport.js)
- **CSS Animations**: [/src/App.css](../../App.css)

---

**💡 Remember**: The animation system is already a unified abstraction - use it for ALL player movements to maintain consistency and quality!