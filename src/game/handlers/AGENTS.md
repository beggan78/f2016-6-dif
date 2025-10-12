# Game Handlers Module - AI Agent Memory

## Purpose
Coordinates UI event handling with game logic and animation systems. Handlers bridge user interactions with pure game logic functions, applying calculated state changes to React state setters.

## Handler Files Overview

### `goalieHandlers.js` - Goalie Management
- `handleGoalieQuickTap()`: Opens goalie modal with available outfield players
- `handleSelectNewGoalie()`: Executes goalie switch using `calculateGoalieSwitch()`
- `handleCancelGoalieModal()`: Modal cleanup
- Logs goalie assignment events for match history

### `substitutionHandlers.js` - Player Substitutions
- Regular substitutions via `calculateSubstitution()`
- Position switches via `calculatePositionSwitch()`
- Player inactive/active toggles via `calculatePlayerToggleInactive()`
- Substitute reordering via `calculateSubstituteReorder()`
- Undo via `calculateUndo()` with event removal and timer restoration
- Multi-sub support with rotation queue management
- Immediate substitution with substitute selection modal
- Comprehensive event logging for all operations

### `fieldPositionHandlers.js` - Position Callbacks
- Returns position-specific callbacks (not action handlers)
- `handleFieldPlayerQuickTap()`: Opens modal for field players
- `handleSubstituteQuickTap()`: Opens modal for substitutes (inactive support)
- Differentiates pairs mode vs individual mode
- Multi-sub aware: detects if player is in "next N to sub out"

### `timerHandlers.js` - Timer Control
- `handlePauseTimer()`: Pauses substitution timer and player time tracking
- `handleResumeTimer()`: Resumes timer and updates stint start times
- Delegates to `handlePauseResumeTime()` from stint manager

### `scoreHandlers.js` - Score and Goal Management
- `handleAddGoalScored()`: Opens goal scorer modal for own team goals
- `handleAddGoalConceded()`: Immediately logs opponent goals (no modal)
- `handleSelectGoalScorer()`: Confirms pending goal with scorer attribution
- `handleCorrectGoalScorer()`: Updates existing goal event with new scorer
- `handleDeleteGoal()`: Marks goal as undone and recomputes score history
- Maintains chronological score integrity across deletions

## Handler Architecture Pattern

**Factory Pattern**: All handlers use factory functions that accept dependencies and return handler functions.

**Common Parameters**:
- `gameStateFactory`: Function returning current game state object
- `stateUpdaters`: Object containing React state setter functions
- `animationHooks`: Animation state setters (when animations needed)
- `modalHandlers`: Modal open/close functions and navigation stack
- Additional: teamConfig, allPlayers, formation, etc. (handler-specific)

**Typical Flow**:
1. Handler receives user action
2. Calls `animateStateChange()` (or direct state update for non-animated)
3. Passes `gameStateFactory()` for current state
4. Provides pure calculation function (e.g., `calculateSubstitution`)
5. Applies all calculated changes via state setters in callback
6. Logs events for match history (when applicable)

## State Updater Requirements

**Critical Rule**: Always apply ALL state changes returned by logic functions. Missing state updates cause UI desync.

**Core Updaters** (most handlers need these):
- `setFormation`: Player positions
- `setAllPlayers`: Player stats, roles, time tracking
- `setRotationQueue`: Rotation order (queue-based modes)

**Next-to-sub-out Updaters** (substitution handlers):
- `setNextPlayerIdToSubOut`: Individual mode single-sub
- `setNextNextPlayerIdToSubOut`: Individual mode 7-player
- `setNextPhysicalPairToSubOut`: Pairs mode

**Timer Updaters** (substitution/timer handlers):
- `resetSubTimer`: Reset after substitution
- `handleUndoSubstitutionTimer`: Restore timer on undo

**Animation Updaters** (animated operations):
- `setAnimationState`: Animation timing
- `setHideNextOffIndicator`: Hide indicators during transitions
- `setRecentlySubstitutedPlayers`: Glow effects

**Score Updaters** (score handlers):
- `setScore`: Direct score update
- `addGoalScored`: Increment own score
- `addGoalConceded`: Increment opponent score

## Integration Points

### Animation System
Handlers use `animateStateChange()` from `animation/animationSupport.js`:
- Captures player positions before state change
- Calls pure calculation function
- Compares before/after positions
- Applies smooth transitions with highlight effects
- Executes state setter callback

### Modal Stack
Handlers open/close modals and manage navigation stack:
- `openFieldPlayerModal()`: Field player actions
- `openSubstituteModal()`: Substitute actions
- `openGoalieModal()`: Goalie replacement
- `openGoalScorerModal()`: Goal scorer attribution
- `openSubstituteSelectionModal()`: Immediate substitution
- `closeModal()` / `removeFromNavigationStack()`: Cleanup

### Event Logging
Handlers log events for match history via `gameEventLogger.js`:
- Substitutions: Before/after formation, players in/out, timestamps
- Position changes: Player positions, role swaps
- Goalie assignments: Current and previous goalie
- Goals: Score state, scorer attribution, period
- Undo operations: Original event removal, undo logging

## Key Handler Patterns

### Animated State Changes
Most user actions use animations. Pattern:
1. Get current state via `gameStateFactory()`
2. Call `animateStateChange()` with pure logic function
3. Apply all state changes in callback
4. Close modals if opened

### Direct State Updates
Simple updates without animation (e.g., modal opening):
1. Call state setters directly
2. No animation coordination needed

### Undo Operations
Undo pattern (substitutions):
1. Store before-state and event ID on action
2. On undo: call `calculateUndo()` with stored data
3. Remove original event from timeline
4. Log undo event
5. Restore timer state

### Pending Actions
Goal scorer modal uses pending pattern:
1. User clicks goal button
2. Store pending goal data (score not incremented)
3. Open modal for scorer selection
4. On confirm: increment score and log event
5. On cancel: discard pending data

## Common Issues and Solutions

### Missing State Updates
**Problem**: Logic calculates correct state but UI doesn't update
**Solution**: Ensure ALL state updaters called for fields returned by logic function
**Prevention**: Check what logic function returns and apply every field

### Modal Not Closing
**Problem**: Modal stays open after action
**Solution**: Call both `closeModal()` AND `removeFromNavigationStack()` if available
**Prevention**: Follow existing modal closure patterns

### Event Logging Failures
**Problem**: Events not appearing in match history
**Solution**: Wrap `logEvent()` in try-catch to prevent operation failure
**Prevention**: Event logging should never block user actions

### Rotation Queue Desync
**Problem**: Next-to-sub indicators wrong after substitution
**Solution**: Always call `setRotationQueue()` when logic returns updated queue
**Prevention**: Queue updates are critical for multi-sub modes

## Handler Composition

### Per-Handler Dependencies
Each handler factory accepts different parameters based on needs:
- **goalieHandlers**: gameStateFactory, stateUpdaters, animationHooks, modalHandlers, allPlayers, selectedSquadPlayers
- **substitutionHandlers**: gameStateFactory, stateUpdaters, animationHooks, modalHandlers, teamConfig, getSubstitutionCount
- **fieldPositionHandlers**: teamConfig, formation, allPlayers, nextPlayerIdToSubOut, modalHandlers, selectedFormation, substitutionCount, rotationQueue
- **timerHandlers**: selectedSquadPlayers, stateUpdaters, timerControls, gameStateFactory
- **scoreHandlers**: stateUpdaters, modalHandlers

### Creating Handler Instances
Handlers are instantiated in parent components (e.g., `TacticalBoard`):
1. Prepare all dependencies
2. Call factory function with deps
3. Destructure returned handler functions
4. Pass to child components or use in callbacks

## When Modifying Handlers

### Adding New Handlers
- Identify which handler module (or create new if needed)
- Follow factory pattern with dependency injection
- Use `animateStateChange()` for visual changes
- Apply all state updates returned by logic
- Add event logging for match history
- Test with all affected team configurations

### Extending Existing Handlers
- Add new parameters at end to maintain compatibility
- Check if logic function needs updates first
- Ensure new state fields are applied
- Update tests to cover new behavior

## Critical Reminders

### State Application
- ALWAYS call state setters for ALL fields returned by logic functions
- Missing updates cause UI desync that's hard to debug
- Check `rotationQueue`, `nextPlayerIdToSubOut`, `nextNextPlayerIdToSubOut`, etc.

### Animation Coordination
- Use `animateStateChange()` for all position changes
- Never manually manage animation state
- Animation callback is where state updates happen

### Modal Stack Management
- Always clean up modal stack on close
- Call both specific close function AND `removeFromNavigationStack()`
- Prevents navigation stack corruption

### Event Logging
- Log events for user actions (substitutions, goals, position changes)
- Use try-catch to prevent logging failures from blocking actions
- Store event IDs for undo operations