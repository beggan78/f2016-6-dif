# Pending Match Resume Feature - Implementation Plan

## Overview
Allow users to configure matches hours before they start by saving them in 'pending' state. Users can resume these matches later with the ability to make last-minute changes before starting the match.

## Key Design Decisions

### Database Schema Changes

#### 1. Add `initial_config` Column to Match Table
```sql
-- Migration: Add initial_config column to match table
ALTER TABLE public.match 
ADD COLUMN initial_config jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.match.initial_config IS 'Stores complete initial match configuration for resuming pending matches';
```

The `initial_config` JSONB column will store the complete configuration needed to resume a match:

```json
{
  "formation": {
    "goalie": "player_id",
    "subPair": {
      "attacker": "player_id",
      "defender": "player_id"  
    },
    "leftPair": {
      "attacker": "player_id",
      "defender": "player_id"
    },
    "rightPair": {
      "attacker": "player_id", 
      "defender": "player_id"
    }
  },
  "teamConfig": {
    "formation": "2-2",
    "squadSize": 7,
    "substitutionConfig": {
      "substitutionType": "pairs",
      "pairRoleRotation": "keep_throughout_period"
    }
  },
  "matchConfig": {
    "format": "5v5",
    "matchType": "league",
    "opponentTeam": "Wildcats",
    "periods": 3,
    "periodDurationMinutes": 15,
    "captainId": "player_id"
  },
  "periodGoalies": {
    "1": "player_id",
    "2": "player_id", 
    "3": "player_id"
  },
  "squadSelection": ["player_id_1", "player_id_2", ...]
}
```

### Architecture Changes

#### 2. Match State Management Updates

**File**: `src/services/matchStateManager.js`

Add functions to handle pending match configuration:

```javascript
/**
 * Save initial match configuration when user clicks "Enter Game"
 * @param {string} matchId - Match ID
 * @param {Object} initialConfig - Complete initial configuration
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function saveInitialMatchConfig(matchId, initialConfig) {
  // Implementation
}

/**
 * Get pending match with initial configuration for a team
 * @param {string} teamId - Team ID
 * @returns {Promise<{success: boolean, match?: Object, error?: string}>}
 */
export async function getPendingMatchForTeam(teamId) {
  // Implementation
}

/**
 * Delete pending match and clear local state
 * @param {string} matchId - Match ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function discardPendingMatch(matchId) {
  // Implementation
}
```

#### 3. Session Detection Integration

**File**: `src/services/sessionDetectionService.js` (No changes needed)

The existing session detection system will be leveraged to trigger the pending match modal on NEW_SIGN_IN detection.

### User Experience Flow

#### 4. Pending Match Detection Service

**New File**: `src/services/pendingMatchService.js`

```javascript
/**
 * Check if user has pending match and should show resume modal
 * @param {string} teamId - Current team ID
 * @returns {Promise<{shouldShow: boolean, pendingMatch?: Object}>}
 */
export async function checkForPendingMatch(teamId) {
  // Implementation
}
```

#### 5. Pending Match Resume Modal

**New File**: `src/components/match/PendingMatchResumeModal.js`

Modal component with three actions:
- **Resume Match**: Navigate to ConfigurationScreen with pre-populated data
- **Discard Match**: Delete pending match and clear local state  
- **Cancel**: Close modal and stay on current screen

#### 6. ConfigurationScreen Integration

**File**: `src/components/setup/ConfigurationScreen.js`

Add prop and effect to handle resume data:

```javascript
// New prop
resumePendingMatchData, // Object with saved configuration or null

// Effect to populate configuration when resuming
useEffect(() => {
  if (resumePendingMatchData) {
    // Pre-populate all configuration from saved data
    setSelectedSquadIds(resumePendingMatchData.squadSelection);
    setNumPeriods(resumePendingMatchData.matchConfig.periods);
    setPeriodDurationMinutes(resumePendingMatchData.matchConfig.periodDurationMinutes);
    setOpponentTeam(resumePendingMatchData.matchConfig.opponentTeam);
    setMatchType(resumePendingMatchData.matchConfig.matchType);
    setCaptain(resumePendingMatchData.matchConfig.captainId);
    // Update team config including substitution configuration
    updateTeamConfig(resumePendingMatchData.teamConfig);
    updateFormationSelection(resumePendingMatchData.teamConfig.formation);
    setPeriodGoalieIds(resumePendingMatchData.periodGoalies);
    
    // Clear the resume data after population
    clearResumeData();
  }
}, [resumePendingMatchData]);
```

#### 7. PeriodSetupScreen Integration  

**File**: `src/components/setup/PeriodSetupScreen.js`

Add prop and effect to pre-populate formation positions:

```javascript
// New prop
resumeFormationData, // Formation object from saved config or null

// Effect to populate formation when resuming
useEffect(() => {
  if (resumeFormationData) {
    setFormation(resumeFormationData);
  }
}, [resumeFormationData]);
```

### Integration Points

#### 8. App.js Updates

**File**: `src/App.js`

Add state and logic for pending match handling:

```javascript
// New state
const [pendingMatchData, setPendingMatchData] = useState(null);
const [showPendingMatchModal, setShowPendingMatchModal] = useState(false);

// Session detection effect enhancement
useEffect(() => {
  if (detectionResult?.type === DETECTION_TYPES.NEW_SIGN_IN && currentTeam?.id) {
    checkForPendingMatch(currentTeam.id).then(result => {
      if (result.shouldShow) {
        setPendingMatchData(result.pendingMatch);
        setShowPendingMatchModal(true);
      }
    });
  }
}, [detectionResult, currentTeam?.id]);

// Modal handlers
const handleResumePendingMatch = () => {
  setShowPendingMatchModal(false);
  // Navigate to ConfigurationScreen with resume data
  setViewWithData(VIEWS.CONFIGURATION, { 
    resumePendingMatchData: pendingMatchData?.initial_config 
  });
};

const handleDiscardPendingMatch = async () => {
  if (pendingMatchData?.id) {
    await discardPendingMatch(pendingMatchData.id);
  }
  setShowPendingMatchModal(false);
  setPendingMatchData(null);
  // Clear any stored match state
  clearStoredState();
};
```

#### 9. Game State Hook Updates

**File**: `src/hooks/useGameState.js`

Update match creation flow to save initial configuration:

```javascript
// In handleStartPeriodSetup function
const matchData = formatMatchDataFromGameState(gameState, currentTeam.id);

// Create match in pending state
const createResult = await createMatch(matchData, allPlayers);
if (createResult.success) {
  setCurrentMatchId(createResult.matchId);
  
  // Save complete initial configuration
  const initialConfig = {
    formation: formation,
    teamConfig: teamConfig,
    matchConfig: {
      format: matchData.format,
      matchType: matchType,
      opponentTeam: opponentTeam,
      periods: numPeriods,
      periodDurationMinutes: periodDurationMinutes,
      captainId: captainId
    },
    periodGoalies: periodGoalieIds,
    squadSelection: selectedSquadIds
  };
  
  await saveInitialMatchConfig(createResult.matchId, initialConfig);
  
  // Navigate to PeriodSetupScreen
  setView(VIEWS.PERIOD_SETUP);
}
```

### Data Flow

#### 10. Match Configuration Persistence Flow

1. **Configuration Phase**: User configures match in ConfigurationScreen
2. **Save Pending**: On "Enter Game" click → Create match with `state: 'pending'` + Save `initial_config`
3. **Period Setup**: Navigate to PeriodSetupScreen for final formation setup
4. **Start Match**: On "Start Match" click → Update `state: 'pending' → 'running'`

#### 11. Resume Flow

1. **Sign In Detection**: Session detection triggers on NEW_SIGN_IN
2. **Check Pending**: Query for pending matches for current team
3. **Show Modal**: Display resume/discard options if pending match found
4. **Resume Action**: Load saved config → Navigate to ConfigurationScreen with pre-populated data
5. **Review/Modify**: User can modify configuration before proceeding to PeriodSetupScreen
6. **Continue**: Normal flow continues from PeriodSetupScreen

### Implementation Tasks

#### Phase 1: Database & Core Services
1. **Create database migration** for `initial_config` column
2. **Update matchStateManager.js** with pending match functions:
   - `saveInitialMatchConfig()`
   - `getPendingMatchForTeam()`
   - `discardPendingMatch()`
3. **Create pendingMatchService.js** for detection logic
4. **Add tests** for new match state manager functions

#### Phase 2: UI Components  
1. **Create PendingMatchResumeModal.js** component with three action buttons
2. **Update ConfigurationScreen.js** to handle resume data prop
3. **Update PeriodSetupScreen.js** to handle resume formation data
4. **Add tests** for new components and updated screens

#### Phase 3: Integration
1. **Update App.js** for pending match detection and modal display
2. **Update useGameState.js** to save initial config on "Enter Game"
3. **Update match creation flow** to persist complete configuration
4. **Add integration tests** for full pending match flow

#### Phase 4: Polish & Testing
1. **Error handling** for failed saves/loads
2. **Loading states** during configuration population  
3. **Edge case testing** (network errors, partial data, etc.)
4. **User acceptance testing** for full flow

### Technical Considerations

#### Data Validation
- **Client-side validation**: Ensure saved configuration is valid before resuming
- **Server-side safeguards**: Validate configuration structure in database queries
- **Graceful degradation**: Fall back to empty configuration if saved data is corrupted

#### Performance  
- **Lazy loading**: Only check for pending matches on NEW_SIGN_IN detection
- **Single query**: Efficient pending match detection with minimal database calls
- **Memory management**: Clear resume data after population to prevent memory leaks

#### Security
- **RLS policies**: Ensure users can only access their own team's pending matches  
- **Input sanitization**: Validate all configuration data before saving/loading
- **Data isolation**: Team-scoped queries prevent cross-team data access

### Error Handling

#### Failure Scenarios
1. **Configuration save fails**: Show error, allow user to continue without persistence
2. **Resume data corrupted**: Fall back to empty configuration, log error
3. **Network error during resume**: Show retry option with fallback to manual setup
4. **Missing team context**: Prevent pending match modal, redirect to team selection

#### Recovery Strategies
- **Graceful degradation**: Always allow manual configuration as backup
- **User feedback**: Clear error messages explaining what went wrong
- **Data recovery**: Attempt to reconstruct configuration from available data
- **Support debugging**: Log errors with sufficient detail for troubleshooting

### Testing Strategy

#### Unit Tests
- **matchStateManager.js**: Test all new pending match functions
- **pendingMatchService.js**: Test detection logic and edge cases
- **Configuration screens**: Test resume data population and clearing

#### Integration Tests  
- **Full resume flow**: Sign in → Detect pending → Resume → Configure → Start
- **Discard flow**: Sign in → Detect pending → Discard → Verify cleanup
- **Configuration persistence**: Save → Sign out → Sign in → Resume → Verify data

#### User Acceptance Tests
- **Happy path**: Create match config → Sign out → Sign in → Resume successfully  
- **Modification path**: Resume → Modify settings → Complete match start
- **Discard path**: Resume modal → Discard → Verify no pending match remains

This implementation plan provides a comprehensive approach to adding pending match resume functionality while maintaining the existing architecture and user experience patterns.