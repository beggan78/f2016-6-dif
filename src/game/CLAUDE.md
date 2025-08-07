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

## Team Configuration System

### Configuration Architecture
Modern composite system with four components:
- **Format**: Field format (`5v5`, future: `7v7`)
- **Squad Size**: Total players (5-15 supported)  
- **Formation**: Tactical formation (`2-2`, `1-2-1`, future formations)
- **Substitution Type**: Substitution style (`individual`, `pairs`)

### Formation Support

#### 2-2 Formation (Fully Implemented)
- **Positions**: `leftDefender`, `rightDefender`, `leftAttacker`, `rightAttacker`, `goalie`
- **Roles**: Defender (left/right), Attacker (left/right), Goalie
- **Supports**: All squad sizes and both substitution types

#### 1-2-1 Formation (Fully Implemented) 
- **Positions**: `defender`, `left`, `right`, `attacker`, `goalie`
- **Roles**: Defender, Midfielder (left/right), Attacker, Goalie
- **Time Tracking**: Includes `timeAsMiddlefieldSeconds` support
- **Supports**: All squad sizes and both substitution types

### Substitution Type Support

#### Individual Mode (`substitutionType: 'individual'`)
- Used with 6+ player squads
- Individual field positions based on active formation
- Substitute positions: `substitute` or `substitute_1`/`substitute_2`
- Simple rotation with inactive player support for 7+ squads

#### Pairs Mode (`substitutionType: 'pairs'`)
- Typically used with 7-player squads
- Field pairs: `leftPair`, `rightPair` (formation-aware positioning)
- Substitute pair: `subPair`
- Substitutions swap entire pairs while maintaining formation roles

## Game State Structure
The central `gameState` object contains:
- `formation`: Current player positions and formation structure
- `allPlayers`: Complete player data with stats and status
- `rotationQueue`: Order of players for substitutions
- `teamConfig`: Team configuration object with format, squadSize, formation, and substitutionType
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
      setFormation(newState.formation);
      setAllPlayers(newState.allPlayers);
      setRotationQueue(newState.rotationQueue);
      // Apply other state updates as needed
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