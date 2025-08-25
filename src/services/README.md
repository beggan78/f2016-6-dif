# Services Documentation

This directory contains service modules that handle data persistence and external API interactions.

## Match State Manager (`matchStateManager.js`)

The Match State Manager is responsible for the complete lifecycle of match records and player statistics in the database. It provides a comprehensive system for tracking matches from creation through completion and historical storage.

### Match Lifecycle Overview

The system implements a three-state lifecycle for matches:

1. **`running`** - Match is actively being played
2. **`finished`** - Match completed but not yet saved to history  
3. **`confirmed`** - Match saved to history by user

### Core Concepts for AI Understanding

#### 1. Match Creation and ID Management
- **When**: Match record created automatically when first period starts (`currentPeriodNumber === 1`)
- **Prevention**: `matchCreationAttempted` flag prevents duplicate database inserts
- **ID Persistence**: `currentMatchId` stored in localStorage and passed through game state
- **Critical**: `clearStoredState()` MUST reset both `currentMatchId` and `matchCreationAttempted` for new matches

```javascript
// Match creation triggered in useGameState.js
if (currentPeriodNumber === 1 && !matchCreationAttempted && currentTeam?.id) {
  setMatchCreationAttempted(true); // Prevent duplicates
  const result = await createMatch(matchData);
  setCurrentMatchId(result.matchId);
}
```

#### 2. Player Role vs Position Mapping
**Critical Distinction**: The system separates formation positions from database player roles.

- **Formation Positions**: UI-specific (e.g., `leftDefender`, `rightAttacker`, `left`, `right`)
- **Database Roles**: Standardized enums (`goalie`, `defender`, `midfielder`, `attacker`, `substitute`)

Use `mapFormationPositionToRole(position, currentRole)` for accurate mapping:
```javascript
// ✅ Correct: Maps formation position to database role
const dbRole = mapFormationPositionToRole('leftDefender', player.currentRole);

// ❌ Incorrect: Direct position assignment
player.started_as = 'leftDefender'; // Will cause database errors
```

#### 3. Time Tracking Architecture
Player statistics track time in multiple dimensions:

**Time Fields**:
- `timeOnFieldSeconds` - Total time on field (including all roles)
- `timeAsGoalieSeconds` - Time spent as goalie
- `timeAsDefenderSeconds` - Time spent as defender
- `timeAsMidfielderSeconds` - Time spent as midfielder (1-2-1 formation)
- `timeAsAttackerSeconds` - Time spent as attacker
- `timeAsSubSeconds` - Time spent as substitute

**Calculated Field**:
- `total_field_time_seconds` = `timeOnFieldSeconds` - `timeAsGoalieSeconds` (outfield time only)

#### 4. Goal Tracking Integration
The system integrates with the event logging system for accurate goal attribution:

```javascript
// Goals counted from match events with fallback to goalScorers object
const goalsScored = countPlayerGoals(goalScorers, matchEvents, player.id);
```

**Data Sources** (in priority order):
1. `matchEvents` array - Primary source from game event logger
2. `goalScorers` object - Fallback for backward compatibility

### Key Functions

#### Match Lifecycle Functions
- `createMatch(matchData)` - Creates initial match record in 'running' state
- `updateMatchToFinished(matchId, finalStats)` - Transitions to 'finished' state with match results
- `updateMatchToConfirmed(matchId)` - Final transition to 'confirmed' state (user saves to history)

#### Data Formatting Functions
- `formatMatchDataFromGameState(gameState, teamId)` - Converts game state to database format
- `formatFinalStatsFromGameState(gameState, matchDurationSeconds)` - Calculates final match statistics
- `formatPlayerMatchStats(player, matchId, goalScorers, matchEvents)` - Individual player stats for database

#### Player Statistics Functions
- `insertPlayerMatchStats(matchId, allPlayers, goalScorers, matchEvents)` - Bulk insert player statistics
- `mapFormationPositionToRole(position, currentRole)` - Critical for accurate role mapping
- `countPlayerGoals(goalScorers, matchEvents, playerId)` - Accurate goal counting across data sources

### Database Schema Understanding

#### Match Table Fields
```sql
id: UUID (Primary key)
team_id: UUID (Foreign key to teams)
state: ENUM('running', 'finished', 'confirmed', 'pending')
format: TEXT (e.g., '5v5')
formation: TEXT (e.g., '2-2', '1-2-1')
periods: INTEGER
period_duration_minutes: INTEGER
type: TEXT (e.g., 'friendly')
opponent: TEXT (nullable)
captain: UUID (nullable, foreign key to players)
finished_at: TIMESTAMP (nullable)
match_duration_seconds: INTEGER (nullable)
goals_scored: INTEGER (nullable)
goals_conceded: INTEGER (nullable)
outcome: ENUM('win', 'loss', 'draw') (nullable)
fair_play_award: UUID (nullable, foreign key to players)
```

#### Player Match Stats Table Fields
```sql
player_id: UUID (Foreign key to players)
match_id: UUID (Foreign key to match)
goals_scored: INTEGER (default 0)
goalie_time_seconds: INTEGER (default 0)
defender_time_seconds: INTEGER (default 0)
midfielder_time_seconds: INTEGER (default 0)
attacker_time_seconds: INTEGER (default 0)
substitute_time_seconds: INTEGER (default 0)
total_field_time_seconds: INTEGER (calculated: timeOnField - goalieTime)
started_as: player_role_enum ('goalie', 'defender', 'midfielder', 'attacker', 'substitute')
was_captain: BOOLEAN (default false)
got_fair_play_award: BOOLEAN (default false)
```

### Integration Points

#### StatsScreen Integration
The StatsScreen component handles the user-facing match saving workflow:

```javascript
// Save workflow in StatsScreen.js
const handleSaveMatchHistory = async () => {
  // 1. Confirm match in database (running -> confirmed)
  const result = await updateMatchToConfirmed(currentMatchId);
  
  // 2. Insert player statistics
  if (result.success) {
    await insertPlayerMatchStats(currentMatchId, allPlayers, goalScorers, matchEvents);
  }
};
```

#### Game State Integration
The service integrates with game state management through:

- **Match ID Storage**: `currentMatchId` in localStorage and game state
- **Creation Flag**: `matchCreationAttempted` prevents duplicate attempts
- **State Reset**: `clearStoredState()` properly cleans match lifecycle state

### Common Integration Patterns

#### 1. Creating a Match
```javascript
// When starting first period
const matchData = formatMatchDataFromGameState(gameState, teamId);
const result = await createMatch(matchData);
if (result.success) {
  setCurrentMatchId(result.matchId);
}
```

#### 2. Finishing a Match
```javascript
// When final period ends
const finalStats = formatFinalStatsFromGameState(gameState, totalMatchDuration);
await updateMatchToFinished(currentMatchId, finalStats);
```

#### 3. Saving to History
```javascript
// When user clicks "Save Match to History"
await updateMatchToConfirmed(currentMatchId);
await insertPlayerMatchStats(currentMatchId, allPlayers, goalScorers, matchEvents);
```

### Error Handling Patterns

All functions return standardized response objects:
```javascript
// Success response
{ success: true, matchId?: string, inserted?: number }

// Error response  
{ success: false, error: string }
```

### Development vs Production Logging

The service uses environment-gated logging:
- **Development**: Detailed success logs for debugging match creation/updates
- **Production**: Only errors and warnings logged for performance
- **Always logged**: `console.error` for failures, `console.warn` for validation issues

### Team Mode Considerations

The system handles both pairs and individual substitution modes:
- **Pairs Mode**: Uses `currentRole` parameter for accurate role mapping from pair positions
- **Individual Mode**: Direct position-to-role mapping for single-player positions
- **Formation Support**: Handles 2-2, 1-2-1, and future formation types

### Performance Considerations

- **Bulk Operations**: Player stats inserted in single database call
- **State Validation**: Only processes players who participated (`startedMatchAs !== null`)
- **Logging**: Environment-gated success logs prevent production performance impact
- **Error Recovery**: Graceful degradation when match ID missing or database unavailable