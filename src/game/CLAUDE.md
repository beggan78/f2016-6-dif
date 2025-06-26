# Game Module - Claude Code Memory

## Purpose
The game module contains all game-specific logic, state management, and systems for the GameScreen functionality. It provides pure functions for state transitions, animation orchestration, time tracking, and player rotation management.

## Key Architecture Principles

### Pure Functions
All state transition logic is implemented as pure functions that:
- Take current state as input
- Return new state as output
- Have no side effects
- Are predictable and testable
- Enable features like undo, preview, and animation calculation

### Separation of Concerns
- **Logic**: Pure business rules and state calculations (`/logic/`)
- **Animation**: Visual transition management and timing (`/animation/`)
- **Queue**: Player rotation and ordering algorithms (`/queue/`)
- **Time**: Stint tracking and time allocation (`/time/`)
- **Handlers**: UI event coordination (`/handlers/`)

### Animation-Logic Separation
The animation system works by:
1. Capturing "before" state positions
2. Calculating "after" state using pure logic functions
3. Computing visual differences and animation requirements
4. Orchestrating timing and applying state changes

## Formation Types

### PAIRS_7 (Pairs Mode)
- Field positions: `leftPair`, `rightPair` (each with defender/attacker roles)
- Substitute position: `subPair` (defender/attacker pair)
- Goalie: `goalie` (single position)
- Substitutions swap entire pairs
- Queue contains individual player IDs, not pair objects

### INDIVIDUAL_6 (6-Player Mode)
- Field positions: `leftDefender`, `rightDefender`, `leftAttacker`, `rightAttacker`
- Substitute position: `substitute` (single player)
- Goalie: `goalie` (single position)
- Individual player substitutions
- Simple rotation: substituted player moves to end

### INDIVIDUAL_7 (7-Player Mode)
- Field positions: `leftDefender7`, `rightDefender7`, `leftAttacker7`, `rightAttacker7`
- Substitute positions: `substitute7_1`, `substitute7_2` (two separate substitutes)
- Goalie: `goalie` (single position)
- Inactive player support (players can be temporarily removed from rotation)
- Complex rotation with next/next-next tracking

## Game State Structure
The central `gameState` object contains:
- `periodFormation`: Current player positions and formation structure
- `allPlayers`: Complete player data with stats and status
- `rotationQueue`: Order of players for substitutions
- `formationType`: PAIRS_7, INDIVIDUAL_6, or INDIVIDUAL_7
- `nextPlayerIdToSubOut`, `nextNextPlayerIdToSubOut`: Rotation tracking
- `playersToHighlight`: Players to show glow effects
- Various timing and metadata fields

## Module Structure
```
/game/
├── logic/         # Core game state calculations and business logic
├── time/          # Stint tracking and time management
├── animation/     # Visual transition orchestration
├── queue/         # Player rotation and ordering
└── handlers/      # UI event coordination
```

## Integration Points

### Components
- `GameScreen.js`: Main consumer, orchestrates UI and game state
- Setup screens: Initialize game state and player data
- Stats screens: Read game state for reporting

### Cross-Module Dependencies
- Uses constants from `/constants/` for domain rules
- Uses utilities from `/utils/` for player operations
- Integrates with React hooks for state management

## Usage Pattern
Most game operations follow this pattern:
```javascript
import { animateStateChange } from './animation/animationSupport';
import { calculateOperation } from './logic/gameStateLogic';

const handleOperation = () => {
  animateStateChange(
    createGameState(),
    (state) => calculateOperation(state, ...params),
    (newState) => {
      // Apply state updates
      setPeriodFormation(newState.periodFormation);
      setAllPlayers(newState.allPlayers);
    },
    setAnimationState,
    setHideNextOffIndicator,
    setRecentlySubstitutedPlayers
  );
};
```

## Debugging Tips
- **State inconsistency**: Verify pure functions return consistent results
- **Animation timing**: Ensure duration matches CSS animation timing
- **Queue desync**: Ensure initialize() called after loading state
- **Time issues**: Check `lastStintStartTimeEpoch` and time field initialization

## Key Files
- `index.js`: Main barrel exports for the entire game module
- `README.md`: Comprehensive technical architecture documentation
- Each subdirectory has its own CLAUDE.md for module-specific details