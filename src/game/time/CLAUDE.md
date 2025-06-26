# Time Management Module - Claude Code Memory

## Purpose
Handles player stint tracking and time allocation to stats counters. Manages the lifecycle of player time stints from start to completion, with support for pause/resume functionality and role-based time allocation.

## Key Files

### `timeCalculator.js` - Pure Time Calculations
**Purpose**: Pure time calculation functions with no side effects
**Core Functions**:
- `calculateDurationSeconds()`: Calculate duration between epoch timestamps
- `shouldSkipTimeCalculation()`: Determine if time calculation should be skipped
- `isValidTimeRange()`: Validate time range parameters
- `calculateCurrentStintDuration()`: Calculate time elapsed in current stint
- `calculateUndoTimerTarget()`: Calculate target timer value for undo functionality

**Key Characteristics**:
- Pure functions with zero dependencies
- Mathematical operations only
- No game state knowledge
- Reusable across different timing contexts

### `stintManager.js` - Game State Integration
**Purpose**: Game state integration for player stint tracking and time allocation
**Core Functions**:
- `updatePlayerTimeStats()`: Apply stint duration to appropriate time counters
- `startNewStint()`: Initialize new stint timing for a player
- `completeCurrentStint()`: Finalize stint and update player stats
- `handlePauseResumeTime()`: Handle pause/resume time calculations
- `applyStintTimeToCounters()`: Allocate time based on player status and role

**Integration Points**:
- Uses timeCalculator for pure time calculations
- Understands player status (on_field, substitute, goalie) and roles
- Manages stint lifecycle (start, update, complete)
- Respects timer pause state

## Stint-Based Time Tracking System

### Core Concept
Players accumulate time in "stints" for each role/status:
- **Current stint**: Tracked via `lastStintStartTimeEpoch` for real-time calculations
- **Key fields**: `timeOnFieldSeconds`, `timeAsAttackerSeconds`, `timeAsDefenderSeconds`, `timeAsGoalieSeconds`
- **Role changes**: Use `handleRoleChange()` and `startNewStint()` utilities

### Time Allocation Rules
Time is allocated based on player's current period status:

```javascript
switch (stats.currentPeriodStatus) {
  case PLAYER_STATUS.ON_FIELD:
    updatedStats.timeOnFieldSeconds += stintDurationSeconds;
    
    // Also track role-specific time for outfield players
    if (stats.currentPeriodRole === PLAYER_ROLES.DEFENDER) {
      updatedStats.timeAsDefenderSeconds += stintDurationSeconds;
    } else if (stats.currentPeriodRole === PLAYER_ROLES.ATTACKER) {
      updatedStats.timeAsAttackerSeconds += stintDurationSeconds;
    }
    break;
    
  case PLAYER_STATUS.SUBSTITUTE:
    updatedStats.timeAsSubSeconds += stintDurationSeconds;
    break;
    
  case PLAYER_STATUS.GOALIE:
    updatedStats.timeAsGoalieSeconds += stintDurationSeconds;
    break;
}
```

## Time Calculation Pattern

### Standard Flow
1. **Start stint**: Set `lastStintStartTimeEpoch = currentTime`
2. **Update time**: Calculate `stintDuration = currentTime - lastStintStartTimeEpoch`
3. **Apply time**: Add duration to appropriate counters based on status/role
4. **Reset stint**: Update `lastStintStartTimeEpoch = currentTime`

### Pause/Resume Handling
- **When pausing**: Calculate and accumulate time without resetting stint timer
- **When resuming**: Reset stint start time for active players
- **Skip calculation**: When `isSubTimerPaused = true` or invalid stint times

## Usage Patterns

### Role Changes
```javascript
import { handleRoleChange, startNewStint } from './stintManager';

// When player changes role (e.g., goalie to field player)
const newStats = handleRoleChange(
  player,
  newRole,
  currentTimeEpoch,
  isSubTimerPaused
);

// Start fresh stint with new role
const playerWithNewStint = startNewStint(
  { ...player, stats: newStats },
  currentTimeEpoch
);
```

### Time Updates
```javascript
import { updatePlayerTimeStats } from './stintManager';

// Update player's accumulated time
const updatedStats = updatePlayerTimeStats(
  player,
  currentTimeEpoch,
  isSubTimerPaused
);
```

### Stint Completion
```javascript
import { completeCurrentStint } from './stintManager';

// Complete current stint and update stats
const playerWithCompletedStint = completeCurrentStint(
  player,
  currentTimeEpoch,
  isSubTimerPaused
);
```

## Defensive Patterns

### Time Field Initialization
Always ensure time fields are properly initialized:
```javascript
const initializedStats = {
  ...updatedStats,
  timeOnFieldSeconds: updatedStats.timeOnFieldSeconds || 0,
  timeAsAttackerSeconds: updatedStats.timeAsAttackerSeconds || 0,
  timeAsDefenderSeconds: updatedStats.timeAsDefenderSeconds || 0,
  timeAsSubSeconds: updatedStats.timeAsSubSeconds || 0
};
```

### Skip Conditions
```javascript
// Skip time calculation if timer is paused or stint hasn't started
if (shouldSkipTimeCalculation(isSubTimerPaused, stats.lastStintStartTimeEpoch)) {
  return { ...stats }; // Return unchanged
}
```

## Debugging Tips

### Time Issues
- Check `lastStintStartTimeEpoch` and time field initialization
- Verify stint start times are set when players change roles
- Ensure pause state is properly handled
- Trace through stint manager flow for time calculations

### Common Problems
- **NaN times**: Usually caused by undefined time fields
- **Incorrect accumulation**: Check role assignment and status transitions
- **Pause/resume bugs**: Verify stint timer handling during pause/resume cycles

## Integration with Game Logic

### During Substitutions
```javascript
// In gameStateLogic.js
const updatedStats = updatePlayerTimeStats(player, currentTimeEpoch, isSubTimerPaused);

// Handle role change from goalie to field player
const newStats = handleRoleChange(
  { ...player, stats: updatedStats },
  newRole,
  currentTimeEpoch,
  isSubTimerPaused
);
```

### During Pause/Resume
```javascript
// Apply to all active players
const newAllPlayers = allPlayers.map(player => 
  handlePauseResumeTime(player, currentTimeEpoch, isPausing)
);
```

## When to Modify
- Adding new player statuses or roles
- Changing time allocation rules
- Modifying stint state management
- Adding new time-based features
- Implementing new pause/resume behaviors