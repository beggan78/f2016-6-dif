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
- **Prevention**: `matchCreated` flag prevents duplicate database inserts
- **ID Persistence**: `currentMatchId` stored in localStorage and passed through game state
- **Critical**: `clearStoredState()` MUST reset both `currentMatchId` and `matchCreated` for new matches

```javascript
// Match creation triggered in useGameState.js
if (currentPeriodNumber === 1 && !matchCreated && currentTeam?.id) {
  setMatchCreated(true); // Prevent duplicates
  const selectedPlayers = allPlayers.filter(player => selectedSquadIds.includes(player.id));
  const result = await createMatch(matchData, selectedPlayers, selectedSquadIds);
  setCurrentMatchId(result.matchId);
}
```

#### 2. Player Role vs Position Mapping
**Critical Distinction**: The system separates formation positions from database player roles.

- **Formation Positions**: UI-specific (e.g., `leftDefender`, `rightAttacker`, `left`, `right`)
- **Database Roles**: Standardized enums (`goalie`, `defender`, `midfielder`, `attacker`, `substitute`, `unknown`)

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
- `timeOnFieldSeconds` - Total time on field as an outfielder (goalie time excluded)
- `timeAsGoalieSeconds` - Time spent as goalie
- `timeAsDefenderSeconds` - Time spent as defender
- `timeAsMidfielderSeconds` - Time spent as midfielder (1-2-1 formation)
- `timeAsAttackerSeconds` - Time spent as attacker
- `timeAsSubSeconds` - Time spent as substitute

**Calculated Field**:
- `total_field_time_seconds` mirrors `timeOnFieldSeconds` (both represent outfield time only)

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
- `createMatch(matchData, allPlayers, selectedSquadIds)` - Creates initial match record and seeds stats for the active squad
- `updateMatchToFinished(matchId, finalStats)` - Transitions to 'finished' state with match results
- `updateMatchToConfirmed(matchId)` - Final transition to 'confirmed' state (user saves to history)

#### Data Formatting Functions
- `formatMatchDataFromGameState(gameState, teamId)` - Converts game state to database format
- `formatFinalStatsFromGameState(gameState, matchDurationSeconds)` - Calculates final match statistics
- `formatPlayerMatchStats(player, matchId, goalScorers, matchEvents)` - Individual player stats for database

#### Player Statistics Functions
- `insertInitialPlayerMatchStats(matchId, allPlayers, captainId, selectedSquadIds)` - Insert initial player stats when match starts
- `updatePlayerMatchStatsOnFinish(matchId, allPlayers, goalScorers, matchEvents)` - Update player performance stats when match finishes
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
    await updatePlayerMatchStatsOnFinish(currentMatchId, allPlayers, goalScorers, matchEvents);
  }
};
```

#### Game State Integration
The service integrates with game state management through:

- **Match ID Storage**: `currentMatchId` in localStorage and game state
- **Creation Flag**: `matchCreated` prevents duplicate attempts
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
await updatePlayerMatchStatsOnFinish(currentMatchId, allPlayers, goalScorers, matchEvents);
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

Current substitution logic targets the individual rotation system for both 5v5 and 7v7 formats:
- **Individual Mode**: Direct position-to-role mapping for single-player positions
- **Formation Support**: Handles 2-2, 1-2-1, and future formation types

### Performance Considerations

- **Bulk Operations**: Player stats inserted in single database call
- **State Validation**: Only processes players who participated (`startedMatchAs !== null`)
- **Logging**: Environment-gated success logs prevent production performance impact
- **Error Recovery**: Graceful degradation when match ID missing or database unavailable

## Resume Pending Match Configuration (`pendingMatchService.js` & `matchConfigurationService.js`)

The resume pending match system allows users to save incomplete match configurations and resume them later. This is particularly useful when users are interrupted during configuration setup or need to prepare matches in advance.

### Core Concepts for AI Understanding

#### 1. Match State Lifecycle Extension
The resume system extends the existing match lifecycle with a `pending` state:

1. **`pending`** - Configuration saved but match not yet started
2. **`running`** - Match is actively being played
3. **`finished`** - Match completed but not yet saved to history
4. **`confirmed`** - Match saved to history by user

#### 2. Configuration Data Structure
The `initial_config` JSON field stores the complete configuration needed to resume:

```javascript
{
  teamConfig: {
    formation: '2-2',
    squadSize: 7
  },
  matchConfig: {
    periods: 3,
    periodDurationMinutes: 15,
    opponentTeam: 'Rival FC',
    matchType: 'league',
    captainId: 'player-uuid'
  },
  squadSelection: ['player1-id', 'player2-id', ...],
  formation: { /* formation data */ },
  periodGoalies: { 1: 'goalie1-id', 2: 'goalie2-id', 3: 'goalie3-id' }
}
```

#### 3. Session Detection Integration
The system integrates with `sessionDetectionService.js` to determine when to show resume modals:

- **NEW_SIGN_IN**: Show pending match modal if available
- **PAGE_REFRESH**: Skip pending match modal (user likely continuing current work)

### Key Functions

#### Pending Match Detection (`pendingMatchService.js`)
- `checkForPendingMatches(teamId)` - Returns all pending matches for multi-match selection
- `checkForPendingMatch(teamId)` - Returns single pending match for resume workflow
- Both functions validate that `initial_config` exists and is not empty

#### Configuration Management (`matchConfigurationService.js`)
- `savePendingMatchConfiguration(teamId, configData)` - Save configuration as pending match
- `updatePendingMatch(matchId, configData)` - Update existing pending configuration
- `createMatchFromConfiguration(teamId, configData)` - Create running match from configuration
- `handleExistingMatch(matchId, action)` - Handle existing match conflicts

#### Data Transformation
- `validatePendingMatchConfig(initialConfig)` - Comprehensive validation of configuration completeness
- `createResumeDataForConfiguration(initialConfig)` - Transform database config for ConfigurationScreen
- `matchesCurrentConfiguration(currentConfig, pendingMatch)` - Prevent duplicate pending matches

### Critical Patterns and Gotchas

#### 1. Boolean Return Values - CRITICAL BUG FIX
**Problem**: Functions were returning `undefined` instead of `false` for negative cases.

```javascript
// ❌ Incorrect: Returns undefined when conditions fail
const shouldShow = result.match &&
                  result.match.initial_config &&
                  Object.keys(result.match.initial_config).length > 0;

// ✅ Correct: Always returns boolean
const shouldShow = !!(result.match &&
                     result.match.initial_config &&
                     Object.keys(result.match.initial_config).length > 0);
```

#### 2. Configuration Validation Requirements
All pending configurations must include:
- **teamConfig**: `formation`, `squadSize`
- **matchConfig**: `format`, `periods`, `periodDurationMinutes`
- **squadSelection**: Non-empty array of player IDs

#### 3. Database State vs UI State
- **Always use database as authoritative source** for pending match detection
- UI state and localStorage are unreliable for detecting pending matches
- Query database directly rather than relying on cached state

#### 4. Data Structure Flattening
The database stores configuration in flat structure, but ConfigurationScreen expects nested:

```javascript
// Database format (flat)
{
  teamConfig: { formation: '2-2', squadSize: 7 },
  formation: '2-2',  // Duplicate for compatibility
  formationData: { /* detailed formation data */ }
}

// ConfigurationScreen expects both flat and nested access
```

### Integration Patterns

#### 1. Saving Pending Configuration
```javascript
// From ConfigurationScreen - save current configuration
const configData = {
  teamConfig: { formation, squadSize },
  matchConfig: { periods, periodDurationMinutes, opponentTeam, matchType, captainId },
  squadSelection: selectedPlayers,
  formation: formationData,
  periodGoalies: goalieAssignments
};

const result = await savePendingMatchConfiguration(currentTeam.id, configData);
```

#### 2. Resume Workflow
```javascript
// Check for pending matches on app start
const { shouldShow, pendingMatch } = await checkForPendingMatch(teamId);

if (shouldShow) {
  // Show resume modal
  const resumeData = createResumeDataForConfiguration(pendingMatch.initial_config);
  // Apply resumeData to ConfigurationScreen state
}
```

#### 3. Multi-Match Selection
```javascript
// When multiple pending matches exist
const { shouldShow, pendingMatches } = await checkForPendingMatches(teamId);

if (shouldShow && pendingMatches.length > 1) {
  // Show selection modal with match list
  // User selects which match to resume
}
```

### Error Handling Patterns

#### Graceful Degradation
```javascript
// All functions return standardized responses
{ success: true, data: {...} }     // Success
{ success: false, error: string }  // Failure

// Always provide fallback behavior
const { shouldShow, pendingMatch } = await checkForPendingMatch(teamId) ||
                                           { shouldShow: false, pendingMatch: null };
```

#### Validation Failures
```javascript
if (!validatePendingMatchConfig(initialConfig)) {
  console.warn('⚠️ Invalid pending match config, cannot create resume data');
  return null; // Graceful failure
}
```

### Testing Considerations

#### Mock Strategy
- **Supabase**: Mock all database operations with realistic responses
- **Dependencies**: Mock `getPendingMatchForTeam` and `getInitialFormationTemplate`
- **Edge Cases**: Test empty configs, missing fields, database errors

#### Critical Test Cases
- Boolean return validation (prevents `undefined` returns)
- Configuration validation with missing required fields
- Resume data transformation accuracy
- Error handling when database unavailable
- Multi-match vs single-match detection logic

### Development vs Production Behavior

#### Logging
- **Development**: Detailed logs for debugging configuration saving/loading
- **Production**: Only errors and warnings to prevent performance impact
- **Always logged**: Database errors and validation warnings

#### Performance
- **Database Queries**: Optimized to fetch only required fields
- **Validation**: Front-loaded to prevent unnecessary processing
- **Caching**: No caching implemented - always query fresh data for accuracy

### Future Enhancement Considerations

#### Potential Improvements
- **TTL for Pending Matches**: Automatic cleanup of old pending configurations
- **Configuration Versioning**: Handle configuration format changes gracefully
- **Partial Resume**: Resume only parts of configuration (e.g., just squad selection)
- **Conflict Resolution**: Better handling when multiple devices create pending matches

#### Architecture Decisions
- **Single Source of Truth**: Database is authoritative, not localStorage
- **Validation First**: Always validate before processing configuration data
- **Explicit Boolean Logic**: Use `!!()` to ensure boolean returns
- **Error Isolation**: Service failures don't break user workflow
