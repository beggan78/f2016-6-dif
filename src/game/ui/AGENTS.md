# AGENTS.md: src/game/ui

This directory contains UI utility functions for the game screen. These utilities provide dynamic styling, animation properties, and position-specific rendering logic without modifying game state.

## Key Utility Modules

### `playerAnimation.js`
Animation property utilities that integrate with `src/game/animation/animationSupport.js`:

- **`getPlayerAnimation(playerId, animationState)`**: Returns animation class, z-index class, and style props for individual players
- **`getPairAnimation(defenderPlayerId, attackerPlayerId, animationState)`**: Returns animation props for pairs formations, checking both players for movement

**Returns**: `{ animationClass, zIndexClass, styleProps }`

### `playerStyling.js`
Dynamic styling calculator based on player status and role:

- **`getPlayerStyling({ isFieldPosition, isInactive, isNextOff, isNextOn, isRecentlySubstituted, hideNextOffIndicator, supportsInactiveUsers, role, isGoalie })`**: Calculates background color, text color, border color, and glow effects

**Key Features**:
- Role-based field colors: defenders (sky-900), midfielders (sky-800), attackers (sky-700)
- Goalie-specific styling (emerald-700)
- Inactive player dimming for supported formations
- Substitution indicators (next off: rose-500, next on: emerald-500)
- Recently substituted glow effect (amber-400 pulse)

**Returns**: `{ bgColor, textColor, borderColor, glowClass }`

### `positionUtils.js`
Position rendering and indicator logic:

- **`getPositionIcon(position, substitutePositions)`**: Returns Lucide React icon component based on role (Shield, Sword, ArrowDownUp, Hand, RotateCcw)
- **`getPositionDisplayName(position, player, teamConfig, substitutePositions)`**: Returns display name with inactive status handling
- **`getIndicatorProps(player, position, teamConfig, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut, substitutePositions, substitutionCount, rotationQueue)`**: Calculates next-off and next-on indicators based on rotation queue
- **`getSubstituteTargetPositions(rotationQueue, formation, fieldPositions, substitutePositions, substitutionCount)`**: Maps substitute positions to their target field positions
- **`getPositionEvents(quickTapHandlers, position)`**: Extracts long-press event handlers for positions

**Critical**: Next-next indicators removed (always false); only next-off and next-on are active

## Integration Points

### Constants Dependencies
All modules reference `src/components/game/formations/constants.js`:
- `FORMATION_STYLES`: Background colors, text colors, border colors, glow effects
- `ICON_STYLES`: Icon sizes and indicator colors
- `POSITION_DISPLAY_NAMES`: Display name mappings for all positions

### Game Constants
- `PLAYER_ROLES`: Role constants (DEFENDER, MIDFIELDER, ATTACKER, GOALIE, SUBSTITUTE)
- `supportsInactiveUsers(teamConfig)`: Function from `src/constants/gameModes.js` to check if formation supports inactive players

### Animation Integration
`playerAnimation.js` delegates to `getPlayerAnimationProps()` from `src/game/animation/animationSupport.js` for actual animation calculations

## Architecture Principles

**Separation of Concerns**: UI utilities are pure presentation logic - they interpret game state but never modify it

**Defensive Coding**: All functions include null/undefined checks and return safe defaults

**Reusability**: Functions designed for use across multiple formation components (IndividualFormation, PairsFormation)

## Barrel Exports
All utilities exported via `index.js` for clean imports:
```javascript
export * from './positionUtils';
export * from './playerStyling';
export * from './playerAnimation';
```