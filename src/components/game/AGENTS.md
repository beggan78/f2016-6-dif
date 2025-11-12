# AGENTS.md - Game UI Components

This directory contains React components for rendering the live game screen during match periods. These are strictly UI/presentation components that consume state and handlers from hooks and game logic modules.

## Directory Structure

### Main Components
- **`GameScreen.js`**: Main orchestrator component for live game view. Manages timers, score display, substitution controls, modals, and delegates formation rendering to FormationRenderer.
- **`SubstitutionCountControls.js`**: Stepper UI component for selecting how many players to substitute (1-4 players). Includes compact variant for inline display.

### Formation Renderers (`formations/`)
- **`FormationRenderer.js`**: Router component that renders `IndividualFormation` for supported team configurations.
- **`IndividualFormation.js`**: Renders individual player formations (6-7 players, supports 2-2 and 1-2-1 formations).
- **`components/PlayerStatsDisplay.js`**: Displays player time stats (total outfield time, attacker/defender difference).
- **`constants.js`**: Shared styling constants, icon styles, position display names, help messages.

## Architecture Patterns

### 1. UI-Logic Separation
**Components consume, never contain game logic**:
- Game logic lives in `/src/game/` (pure functions)
- State management in hooks: `useGameState`, `useGameUIState`, `useGameModals`
- Handlers in `/src/game/handlers/` (substitutionHandlers, fieldPositionHandlers, etc.)
- Components only render and trigger callbacks

### 2. Handler Factory Pattern
GameScreen creates handler objects using factory functions:
- `createSubstitutionHandlers()` - substitution operations
- `createFieldPositionHandlers()` - position tap callbacks
- `createTimerHandlers()` - timer pause/resume
- `createScoreHandlers()` - goal scoring/editing
- `createGoalieHandlers()` - goalie replacement

All handlers receive `createGameState()` function to get current state snapshot.

### 3. Modal Management
`useGameModals` hook provides modal state for:
- `fieldPlayer` - field player options (sub now, set next, change position)
- `substitute` - substitute options (inactivate/activate, set as next)
- `goalie` - goalie replacement selection
- `scoreEdit` - score manager
- `goalScorer` - goal scorer selection
- `undoConfirm` - undo substitution confirmation
- `substituteSelection` - select substitute for immediate sub

Modals integrate with browser back navigation via `pushNavigationState`.

### 4. Animation System
**Two-phase animation**:
1. **State Update**: Handlers call `setAnimationState()` with player movements
2. **Render**: Formation components use `getPlayerAnimation()` utilities to apply CSS animations

Animation state tracked in `useGameUIState`:
- `animationState` - active player movements
- `recentlySubstitutedPlayers` - players with glow effects
- `hideNextOffIndicator` - temporarily hide next-off indicators

### 5. Visual Styling System
**`getPlayerStyling()` utility** (`src/game/ui/playerStyling.js`):
- Returns: `{ bgColor, textColor, borderColor, glowClass }`
- Based on: player status, role (defender/midfielder/attacker), next indicators, inactive state
- Role-specific backgrounds: defenders (dark blue), midfielders (medium blue), attackers (light blue), goalie (green)

All colors/styles defined in `formations/constants.js`.

### 6. Split Rendering
Formation components support `renderSection` prop:
- `'field'` - render goalie + field players only
- `'substitutes'` - render substitute players only
- `'all'` - render everything (default)

GameScreen renders FormationRenderer twice (field section, then SUB NOW button, then substitutes section).

## Key Props & Data Flow

### GameScreen Props
**From Parent (App.js via useGameState)**:
- `formation` - current position assignments `{goalie: id, leftDefender: id, ...}`
- `allPlayers` - player array with stats
- `matchTimerSeconds`, `subTimerSeconds`, `isSubTimerPaused` - timer state
- `nextPlayerIdToSubOut`, `nextNextPlayerIdToSubOut` - rotation queue
- `teamConfig` - configuration `{format, squadSize, formation}`
- `ownScore`, `opponentScore` - current score
- Score/goal handlers, setters, match events

**Internal State**:
- `substitutionCount` - number of players to sub (persisted to localStorage)
- `isStartAnimating` - start match animation state

### Formation Component Props
**Required**:
- `teamConfig` - determines formation type and capabilities
- `formation` - position-to-player-id mapping
- `allPlayers` - player objects with stats
- `quickTapHandlers` - position callback object from `useFieldPositionHandlers`
- `goalieHandlers` - goalie tap handlers
- `getPlayerNameById` - name lookup function
- `getPlayerTimeStats` - time stats calculation function

**Animation/Visual**:
- `animationState` - active animations
- `recentlySubstitutedPlayers` - Set of recently subbed player IDs
- `hideNextOffIndicator` - hide next-off indicators
- `nextPlayerIdToSubOut`, `nextNextPlayerIdToSubOut` - for indicators
- `substitutionCount`, `rotationQueue` - for multi-sub indicators

## User Interaction Flow

1. **Player Card Tap** → `useQuickTapWithScrollDetection` (detects quick tap <150ms)
2. **Position Mapping** → `useFieldPositionHandlers` maps to position-specific callback
3. **Modal Open** → Callback from `createFieldPositionHandlers` opens modal via `useGameModals`
4. **User Confirms** → Modal button triggers handler (e.g., `handleSubstituteNow`)
5. **State Update** → Handler calls pure logic function, updates state via setters
6. **Animation** → Handler sets animation state, formation components apply CSS animations
7. **Timer/Queue Updates** → Related state updates (reset sub timer, update queue, etc.)

## Formation-Specific Behavior

### IndividualFormation
- Supports 2-2 formation (leftDefender, rightDefender, leftAttacker, rightAttacker)
- Supports 1-2-1 formation (defender, left, right, attacker) with midfielder role
- Displays incoming position labels for substitutes (shows target position + player name)
- Inactive player support (7+ player modes)
- Multi-sub indicators (shows next and next-next players to sub)

## Helper Utilities

**Position Utilities** (`src/game/ui/positionUtils.js`):
- `getIndicatorProps()` - determines next-off/next-on indicators
- `getPositionDisplayName()` - formatted position names
- `getPositionIcon()` - position icon components
- `getPositionEvents()` - maps quick tap handlers to positions
- `getSubstituteTargetPositions()` - maps substitutes to target field positions

**Time Calculations** (`GameScreen.getPlayerTimeStats`):
- Calculates total outfield time (includes current stint if on field)
- Calculates attacker-defender difference (midfielders excluded)
- Respects timer pause state (frozen when `isSubTimerPaused`)

## Important Notes

- **Never mutate props** - all state updates go through setter functions
- **Use PersistenceManager** for localStorage (substitutionCount uses this pattern)
- **Browser back integration** - GameScreen registers back handlers for pending/running matches
- **Start match animation** - 2-second fade-out overlay on match start
- **Score abbreviation** - `useTeamNameAbbreviation` shortens team names when score display is tight
- **Memoization** - Both formation components use `React.memo()` for performance
- **Formation awareness** - Components use `selectedFormation` to override `teamConfig.formation` when needed
