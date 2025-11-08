# Pair Mode Removal Plan

## Executive Summary

This document outlines the comprehensive plan to remove the old Pair Substitution mode from the Sport Wizard codebase. The Pair Substitution mode was a specialized feature that:

- Only worked with 5v5 format + 2-2 formation + exactly 7 players
- Displayed 2 players (1 defender + 1 attacker) on the same card
- Used `substitutionType: 'pairs'`
- Had nested formation structure: `{ leftPair: { defender: id, attacker: id }, rightPair: {...}, subPair: {...} }`

**Important**: This is NOT the new multimode substitution feature (where N players can substitute at once in individual mode). That functionality should be preserved.

## Context & Rationale

### Why Remove Pair Mode?

1. **Complexity**: Adds significant code complexity with conditional branching throughout the codebase
2. **Technical Debt**: Difficult to maintain alongside individual mode
3. **Limited Use**: Only available in one very specific configuration (5v5, 2-2, 7 players)
4. **Confusing**: Users and developers often confuse it with multimode substitution
5. **No Historical Data**: No existing matches or saved configurations use pairs mode (confirmed by user)

### What We're Removing

**Old Pair Substitution Mode**: Where players are grouped into pairs at the formation level
- Formation structure has nested objects: `leftPair: { defender, attacker }`
- UI displays both players on same card
- Both players substitute together as a unit
- Specific to 7-player, 2-2 formation

**What We're Keeping**: Multimode substitution in individual mode
- Formation structure is flat: `leftDefender: playerId, rightDefender: playerId`
- UI displays individual player cards
- N players can substitute together (configurable)
- Works with any squad size and formation

## Approach

- **Single comprehensive PR**: Remove all pair mode code at once
- **No backwards compatibility**: Assume no saved configurations or historical matches
- **Testing strategy**: Unit tests + integration tests + regression tests for multimode substitution

---

## Current Progress

### Phase 1: Delete Core Pair Files ✅ COMPLETED

**Files Deleted** (4 files):
1. `/src/components/game/formations/PairsFormation.js` - Pair-based formation UI component
2. `/src/components/shared/PairRoleRotationHelpModal.js` - Help modal for pair strategies
3. `/src/game/utils/pairedRotationUtils.js` - Core pair rotation utilities
4. `/src/game/logic/__tests__/gameStateLogic.pairedRotation.test.js` - Pair rotation tests

### Phase 2: Update Core Logic Files ✅ COMPLETED

**File: `/src/game/logic/substitutionManager.js`**
- ✅ Removed `handlePairsSubstitution()` method (lines 79-191)
- ✅ Removed imports: `analyzeOutgoingPair`, `PAIRED_ROLE_STRATEGY_TYPES`, `canUsePairedRoleStrategy`
- ✅ Simplified `cloneFormation()` - no longer needs to handle nested pair objects
- ✅ Removed paired rotation logic from `handleIndividualModeSubstitution()` (lines 133-163)
- ✅ Simplified `executeSubstitution()` - removed pairs branch

**File: `/src/constants/teamConfiguration.js`**
- ✅ Removed `PAIRED_ROLE_STRATEGY_TYPES` constant (lines 195-198)
- ✅ Removed `PAIRED_ROLE_STRATEGY_DEFINITIONS` constant (lines 201-212)
- ✅ Removed `PAIRED_ROLE_STRATEGY_SUPPORTED_SQUAD_SIZES` constant (lines 214-217)
- ✅ Removed `canUsePairedRoleStrategy()` function (lines 224-243)
- ✅ Removed `SUBSTITUTION_TYPES.PAIRS` from enum
- ✅ Removed pairs from `FORMAT_5V5.allowedSubstitutionTypes`
- ✅ Removed `pairedRoleStrategy` parameter from `createTeamConfig()`
- ✅ Removed pairs validation from `validateTeamConfig()`
- ✅ Removed pairs auto-correction from `validateAndCorrectTeamConfig()`
- ✅ Removed `pairedRoleStrategy` logic from `createDefaultTeamConfig()`

**File: `/src/constants/gameModes.js`**
- ✅ Removed `buildPairsModeDefinition()` function (lines 215-244)
- ✅ Simplified `getModeDefinition()` - removed pairs branch
- ✅ Removed pairs handling from `initializePlayerRoleAndStatus()` (lines 471-507)
- ✅ Simplified default currentPairKey to 'substitute_1'

**File: `/src/game/logic/gameStateLogic.js`**
- ✅ Removed imports: `canUsePairedRoleStrategy`, `PAIRED_ROLE_STRATEGY_TYPES`, `FIELD_PAIR_POSITIONS`, `getPairKeyForFieldPosition`, `analyzeOutgoingPair`
- ✅ Removed `ROLE_GROUP_POSITIONS` constant
- ✅ Removed `getRoleGroupForPosition()` helper function
- ✅ Removed `getPairedPlayerIdsFromFormation()` helper function
- ✅ Removed `calculatePairPositionSwap()` function (lines 300-371)
- ✅ Removed `nextPhysicalPairToSubOut` from `calculateSubstitution()`
- ✅ Removed pairs formation handling from `calculatePositionSwitch()` (lines 129-169)
- ✅ Simplified role assignment in `calculatePositionSwitch()` - individual mode only
- ✅ **Session 2**: Removed pairs logic from `calculateRemovePlayerFromNextToGoOff()` (lines 865-900)
- ✅ **Session 2**: Removed pairs logic from `calculateSetPlayerAsNextToGoOff()` (lines 937-970)

### Phase 3: Update State Management Files ✅ COMPLETED

**File: `/src/hooks/useGameState.js`** ✅
- ✅ **Session 2**: Removed all pairs-related logic (~15 references)
- ✅ Removed `hasPlayerAssignments` pairs object checking
- ✅ Simplified `findPlayerPairKey` to remove isPairsMode parameter
- ✅ Removed entire pairs formation generation in `preparePeriodWithGameLog`
- ✅ Removed pairs validation from `handleStartGame`
- ✅ Removed pairs handling from `switchPlayerPositions` and `switchGoalie`
- ✅ Removed pairs validation from `saveMatchConfiguration`

**File: `/src/hooks/useTeamConfig.js`** ✅
- ✅ **Session 2**: Removed `canUsePairedRoleStrategy` import
- ✅ **Session 2**: Removed `PAIRED_ROLE_STRATEGY_TYPES` import
- ✅ **Session 2**: Removed pairs logic from `createTeamConfigFromSquadSize()`

### Phase 4: Update Components ✅ COMPLETED

**File: `/src/components/game/formations/FormationRenderer.js`** ✅
- ✅ **Session 2**: Removed `PairsFormation` import
- ✅ **Session 2**: Removed pairs conditional rendering
- ✅ **Session 2**: Simplified to only render IndividualFormation

**File: `/src/components/game/formations/index.js`** ✅
- ✅ **Session 2**: Removed `PairsFormation` export

**File: `/src/components/setup/ConfigurationScreen.js`** ✅
- ✅ **Session 2**: Removed `PairRoleRotationHelpModal` import
- ✅ **Session 2**: Removed imports: `PAIRED_ROLE_STRATEGY_DEFINITIONS`, `PAIRED_ROLE_STRATEGY_TYPES`, `canUsePairedRoleStrategy`
- ✅ **Session 2**: Removed `isPairRoleHelpModalOpen` state
- ✅ **Session 2**: Removed entire paired role strategy UI section (lines 1370-1406)
- ✅ **Session 2**: Removed modal component usage

### Phase 5: Update Utilities & Handlers ✅ PARTIALLY COMPLETED

**File: `/src/utils/formationGenerator.js`** ✅
- ✅ **Session 2**: Removed `canUsePairedRoleStrategy` import
- ✅ **Session 2**: Removed `PAIRED_ROLE_STRATEGY_TYPES` import
- ✅ **Session 2**: Removed `buildPairedRotationQueueFromFormation` import
- ✅ **Session 2**: Deleted `generateBalancedFormationForPeriod3()` function (lines 19-265)
- ✅ **Session 2**: Deleted `generateRecommendedFormation()` function
- ✅ **Session 2**: Deleted `generatePairedIndividualFormationRecommendation()` function
- ✅ **Session 2**: Deleted helper functions: `determinePreferredSideForPlayer`, `createSideCandidate`, `assignSideGroup`
- ✅ **Session 2**: Removed pairs check from `generateIndividualFormationRecommendation`
- ✅ **Session 2**: Removed unused `SIDE_LEFT` and `SIDE_RIGHT` constants

**File: `/src/game/handlers/substitutionHandlers.js`** ✅
- ✅ **Session 2**: Removed `calculatePairPositionSwap` import
- ✅ **Session 2**: Removed entire `swap-pair-positions` action handler (lines 819-860)

**File: `/src/game/logic/substitutionManager.js`** ✅
- ✅ **Session 2**: Removed unused `getPreferredSideForPlayer` helper function

---

## Remaining Work

### Phase 6: Clean Up Dead Pairs Code 🚧 NEXT UP

**File: `/src/hooks/useGameState.js`**
Identified references to remove:
- Line 12: Import `buildPairedRotationQueueFromFormation`
- Line 21: Import `canUsePairedRoleStrategy`, `PAIRED_ROLE_STRATEGY_TYPES`
- Line 152: State `nextPhysicalPairToSubOut`
- Line 246: Reference in game state object
- Line 274: Reference in useEffect dependency array
- Line 561-572: Paired rotation eligibility logic
- Line 708: Reference in another state object
- Line 873: `analyzePairsRotationState()` call
- Line 936: Reference in useEffect dependency array
- Line 1555: `pairedRoleStrategy` in team config
- Line 1728: Reference in return/state

**Actions needed**:
- Remove `buildPairedRotationQueueFromFormation` import and usage
- Remove `canUsePairedRoleStrategy` and `PAIRED_ROLE_STRATEGY_TYPES` imports
- Remove `nextPhysicalPairToSubOut` state and all references
- Remove paired rotation eligibility checks
- Remove `pairedRoleStrategy` from team config initialization
- Find and remove `analyzePairsRotationState()` function if it exists

**File: `/src/hooks/usePlayerState.js`**
- Search for `currentPairKey` references
- May need to keep `currentPairKey` for individual mode position tracking
- Verify usage and ensure no pairs-specific logic

**File: `/src/utils/persistenceManager.js`**
- Search for pair-related persistence keys
- Remove pair state from localStorage

**File: `/src/App.js`**
- Search for pair initialization logic
- Remove if found

### Phase 4: Update Components

**File: `/src/components/game/formations/FormationRenderer.js`**
- Remove `PairsFormation` import
- Remove pairs conditional rendering
- Keep only individual mode rendering

**File: `/src/components/setup/ConfigurationScreen.js`**
Identified references:
- Line 18: Import `PairRoleRotationHelpModal`
- Line 74: State `isPairRoleHelpModalOpen`
- Lines 105-111: Paired role strategy selector logic
- UI elements for paired role strategy dropdown

**Actions needed**:
- Remove `PairRoleRotationHelpModal` import
- Remove `isPairRoleHelpModalOpen` state
- Remove paired role strategy selector UI
- Remove `showPairedRoleStrategySelector` logic
- Remove `activePairedRoleStrategy` state

**File: `/src/components/game/GameScreen.js`**
- Search for `nextPhysicalPairToSubOut` references
- Search for pair-specific handlers
- Remove pairs logic, keep individual mode

### Phase 5: Update Utilities & Constants

**File: `/src/utils/formationGenerator.js`**
- Lines 1-5: Remove pairedRotationUtils imports
- Lines 21-100+: Remove `generateBalancedFormationForPeriod3()` pairs logic
- Remove uses of `canUsePairedRoleStrategy`, `PAIRED_ROLE_STRATEGY_TYPES`, `buildPairedRotationQueueFromFormation`

**File: `/src/game/ui/playerAnimation.js`**
- Lines 43-72: Remove `getPairAnimation()` function
- Keep `getPlayerAnimation()` for individual mode

**File: `/src/constants/positionConstants.js`**
- Lines 16-19: Remove `LEFT_PAIR`, `RIGHT_PAIR`, `SUB_PAIR` constants
- Lines 52-56: Remove `getPairPositionKeys()` function
- Lines 97-99: Remove `isPairPosition()` function

**File: `/src/components/game/formations/constants.js`**
- Lines 82-85: Remove POSITION_DISPLAY_NAMES for leftPair, rightPair, subPair

### Phase 6: Update Test Files

**Tests to Delete Entirely**:
None remaining (already deleted gameStateLogic.pairedRotation.test.js)

**Tests to Update** (remove pairs-specific test cases):

1. `/src/game/logic/__tests__/substitutionManager.test.js`
   - Remove tests for `handlePairsSubstitution()`
   - Remove tests for `PAIRED_ROLE_STRATEGY_TYPES.KEEP_THROUGHOUT_PERIOD`
   - Remove tests for `PAIRED_ROLE_STRATEGY_TYPES.SWAP_EVERY_ROTATION`

2. `/src/constants/__tests__/teamConfiguration.test.js`
   - Remove tests for `PAIRED_ROLE_STRATEGY_TYPES`
   - Remove tests for `PAIRED_ROLE_STRATEGY_DEFINITIONS`
   - Remove tests for `canUsePairedRoleStrategy()`
   - Remove pairs validation tests

3. `/src/components/game/formations/__tests__/FormationRenderer.test.js`
   - Remove PairsFormation rendering tests

4. `/src/components/setup/__tests__/ConfigurationScreen.test.js`
   - Remove paired role strategy selector tests
   - Remove pairs mode configuration tests

5. `/src/components/setup/__tests__/PeriodSetupScreen.test.js`
   - Remove pairs-specific period setup tests

6. `/src/components/game/__tests__/GameScreen.test.js`
   - Remove pairs mode game flow tests

7. `/src/utils/__tests__/formationGenerator.test.js`
   - Remove pairs formation generation tests

8. `/src/game/handlers/__tests__/substitutionHandlers.test.js`
   - Remove pairs substitution handler tests

9. `/src/game/handlers/__tests__/fieldPositionHandlers.test.js`
   - Remove pairs position handler tests

10. `/src/components/report/__tests__/GameEventTimeline.test.js`
    - Remove pairs-specific event timeline tests

**Mock/Fixture Files to Update**:
- `/src/game/testUtils.js` - Remove pair mock data
- `/src/__integration__/fixtures/mockGameData.js` - Remove pairs fixtures
- `/src/__integration__/utils/mockComponents.js` - Remove PairsFormation mock
- `/src/components/__tests__/componentTestUtils.js` - Remove pair test helpers

### Phase 7: Update Documentation

**File: `/CLAUDE.md`**
- Remove references to pairs mode in:
  - Team Configuration System section
  - Common Configurations section
  - Formation examples
- Update any code examples that reference pairs

**File: `/README.md`**
- Search for pairs mode mentions
- Remove if found

**File: `.claude/component-architecture.md`** (if exists)
- Remove PairsFormation component references
- Update architecture diagrams

**Other AGENTS.md files**:
- Search all AGENTS.md and CLAUDE.md files in subdirectories
- Remove pairs references

### Phase 8: Final Verification & Testing

**Step 1: Run Linter**
```bash
CI=true npm run build
```
- Fix all compilation errors
- Ensure no import errors
- Ensure no undefined reference errors

**Step 2: Run Full Test Suite**
```bash
npm test
```
- Fix failing tests
- Ensure all tests pass
- Verify test coverage remains >90%

**Step 3: Manual Integration Testing**
Test individual mode with various configurations:
- 6 players, 2-2 formation, individual substitution
- 7 players, 2-2 formation, individual substitution (single player)
- 7 players, 2-2 formation, individual substitution (2 players - multimode)
- 8 players, 2-2 formation, individual substitution
- 9 players, 2-2 formation, individual substitution
- 7 players, 1-2-1 formation, individual substitution

**Step 4: Regression Testing - Multimode Substitution**
Critical: Verify the NEW multimode substitution feature still works:
- Configure individual mode with 2+ player substitution count
- Verify 2 players can substitute together
- Verify rotation queue behavior with multiple subs
- Verify time tracking for multiple simultaneous substitutions
- Test period transitions with multimode substitution
- Test goalie changes with multimode active
- Test manual substitutions with multimode

**Step 5: Search for Remaining References**
```bash
# Search for any remaining 'pair' or 'Pair' references
grep -r "pair\|Pair\|PAIR" src/ --exclude-dir=node_modules --exclude="*.test.js" | grep -v "repair\|impair"

# Search for specific deleted functions
grep -r "buildPairsModeDefinition\|handlePairsSubstitution\|calculatePairPositionSwap\|analyzeOutgoingPair" src/

# Search for deleted constants
grep -r "PAIRED_ROLE_STRATEGY\|FIELD_PAIR_POSITIONS\|LEFT_PAIR\|RIGHT_PAIR\|SUB_PAIR" src/

# Search for deleted state
grep -r "nextPhysicalPairToSubOut\|pairedRoleStrategy" src/
```

**Step 6: Edge Cases Testing**
- Switching between formations (2-2 ↔ 1-2-1)
- Role changes within periods
- Undo substitution functionality
- Player inactive/active toggles (7-player individual mode)
- Substitute swapping
- Manual position switches

---

## Success Criteria

✅ All pair mode files deleted (4 files)
✅ All pair mode code removed from 30+ files
✅ All tests passing
✅ No linter errors
✅ Individual mode with multimode substitution working correctly
✅ No remaining 'pair' references in code (except comments/docs that clarify removal)
✅ Test coverage remains >90%
✅ No breaking changes for individual mode users

---

## Estimated Impact

- **Lines of Code Removed**: ~2,000+ lines
- **Files Deleted**: 4 complete files
- **Files Modified**: 30+ files
- **Test Files Updated**: 15+ files
- **Database Impact**: None (no migrations needed)
- **Breaking Changes**: None for existing individual mode users
- **Historical Data**: Preserved in database, not accessible via UI

---

## Risk Assessment

### HIGH RISK (Requires Careful Testing)
- ❌ **gameStateLogic.js** - Core game logic, many dependencies
- ❌ **gameModes.js** - Central configuration system
- ❌ **teamConfiguration.js** - Validation and config creation
- ❌ **useGameState.js** - Main game state hook

### MEDIUM RISK (Moderate Testing)
- ⚠️ **substitutionManager.js** - Method removal only
- ⚠️ **ConfigurationScreen.js** - UI changes
- ⚠️ **formationGenerator.js** - Formation utilities
- ⚠️ **persistenceManager.js** - State persistence

### LOW RISK (Minimal Testing)
- ✅ **PairsFormation.js** - Delete entirely
- ✅ **PairRoleRotationHelpModal.js** - Delete entirely
- ✅ **pairedRotationUtils.js** - Delete entirely
- ✅ **positionConstants.js** - Simple constant removal

---

## Notes for Future Sessions

1. **Multimode Substitution**: This NEW feature allows N players to substitute at once in individual mode. It should be PRESERVED and tested thoroughly during regression testing.

2. **currentPairKey Field**: This field is used in individual mode to track player positions (e.g., 'leftDefender', 'substitute_1'). Despite the name "PairKey", it's used for position tracking in individual mode and should be kept (though it could be renamed to `currentPosition` in a future refactor).

3. **Time Tracking**: Ensure time calculations continue to work correctly for all players during multimode substitutions.

4. **Queue Management**: The rotation queue must work correctly with N-player substitutions.

5. **Animation System**: Verify animations work for multiple players moving simultaneously.

6. **Formation Switching**: Test switching formations during a match to ensure no pairs remnants cause issues.

---

## Dependencies Removed

### Deleted Utilities
- `buildPairedRotationQueueFromFormation()` - Built rotation queue for pairs
- `analyzeOutgoingPair()` - Analyzed which pair was being substituted
- `getPairKeyForFieldPosition()` - Mapped position to pair key
- `canUsePairedRoleStrategy()` - Checked if config supports paired strategies
- `normalizePairedRoleStrategy()` - Normalized paired role strategy
- `isPairedRotationActive()` - Checked if paired rotation is active

### Deleted Constants
- `PAIRED_ROLE_STRATEGY_TYPES` - Enum for paired role strategies
- `PAIRED_ROLE_STRATEGY_DEFINITIONS` - Metadata for strategies
- `PAIRED_ROLE_STRATEGY_SUPPORTED_SQUAD_SIZES` - Squad size support map
- `FIELD_PAIR_POSITIONS` - Position mappings for pairs
- `SUBSTITUTION_TYPES.PAIRS` - Pairs substitution type enum value
- `LEFT_PAIR`, `RIGHT_PAIR`, `SUB_PAIR` - Pair position keys

### Deleted Functions
- `handlePairsSubstitution()` - Main pairs substitution handler
- `calculatePairPositionSwap()` - Swapped defender/attacker in pairs
- `buildPairsModeDefinition()` - Built pairs mode configuration
- `getPairAnimation()` - Handled pair card animations
- `getPairPositionKeys()` - Returned pair position key list
- `isPairPosition()` - Checked if position is a pair position

### Deleted Components
- `PairsFormation` - UI component for pair-based formations
- `PairRoleRotationHelpModal` - Help modal for pair strategies

### Deleted State Fields
- `nextPhysicalPairToSubOut` - Tracked which pair to substitute next
- `pairedRoleStrategy` - Strategy for pair role rotation

---

## Implementation Checklist

### Core Logic ✅ COMPLETED
- [x] Delete PairsFormation.js
- [x] Delete PairRoleRotationHelpModal.js
- [x] Delete pairedRotationUtils.js
- [x] Delete gameStateLogic.pairedRotation.test.js
- [x] Update substitutionManager.js
- [x] Update teamConfiguration.js
- [x] Update gameModes.js
- [x] Update gameStateLogic.js

### State Management ✅ COMPLETED
- [x] Update useGameState.js ✅ Session 2
- [x] Update useTeamConfig.js ✅ Session 2
- [ ] Update usePlayerState.js (verify no pairs-specific logic)
- [ ] Update persistenceManager.js (verify no pairs state)
- [ ] Update App.js (verify no pairs initialization)

### Components ✅ COMPLETED
- [x] Update FormationRenderer.js ✅ Session 2
- [x] Update ConfigurationScreen.js ✅ Session 2
- [ ] Update GameScreen.js (dead code removal)
- [ ] Update HamburgerMenu.js (dead code removal)
- [ ] Update PeriodSetupScreen.js (dead code removal)

### Utilities ✅ PARTIALLY COMPLETED
- [x] Update formationGenerator.js ✅ Session 2
- [x] Update substitutionHandlers.js ✅ Session 2
- [ ] Update gameModes.js (dead code removal - getValidPositions has pairs branch)
- [ ] Update playerSortingUtils.js (dead code removal)
- [ ] Update formationUtils.js (dead code removal)
- [ ] Update debugUtils.js (dead code removal)
- [ ] Update animationSupport.js (dead code removal)
- [ ] Update fieldPositionHandlers.js (dead code removal)
- [ ] Update useFieldPositionHandlers.js (dead code removal)
- [ ] Update matchReportUtils.js (dead code removal)
- [ ] Update persistenceManager.js (dead code removal)
- [ ] Update positionConstants.js (dead code removal - LEFT_PAIR, RIGHT_PAIR, SUB_PAIR)

### Tests ⏳
- [ ] Update substitutionManager.test.js
- [ ] Update teamConfiguration.test.js
- [ ] Update FormationRenderer.test.js
- [ ] Update ConfigurationScreen.test.js
- [ ] Update PeriodSetupScreen.test.js
- [ ] Update GameScreen.test.js
- [ ] Update formationGenerator.test.js
- [ ] Update substitutionHandlers.test.js
- [ ] Update fieldPositionHandlers.test.js
- [ ] Update GameEventTimeline.test.js
- [ ] Update testUtils.js
- [ ] Update mockGameData.js
- [ ] Update mockComponents.js
- [ ] Update componentTestUtils.js

### Documentation ⏳
- [ ] Update CLAUDE.md
- [ ] Update README.md
- [ ] Update architecture docs
- [ ] Search and update AGENTS.md files

### Verification 🚧 IN PROGRESS
- [x] Run linter ✅ Session 2 - PASSING
- [x] Search for remaining references ✅ Session 2 - Identified dead code locations
- [ ] Run full test suite
- [ ] Manual integration testing
- [ ] Regression testing (multimode substitution)

---

## Current Status: 80% Complete - Core Code Cleanup Done, Linter Passing

**Last Updated**: Session 2 - All core files cleaned, linter passing, remaining dead code identified
**Next Step**: Clean up remaining dead pairs code in utility/handler/component files, then test files and documentation

### Session 2 Summary

**Accomplishments**:
- ✅ Cleaned all critical import errors - linter now passing
- ✅ Removed pairs logic from 9 major files:
  - useGameState.js (~15 pairs references removed)
  - useTeamConfig.js (2 imports + pairs logic in createTeamConfigFromSquadSize)
  - ConfigurationScreen.js (PairRoleRotationHelpModal UI removed)
  - FormationRenderer.js (PairsFormation import removed)
  - formationGenerator.js (3 major functions + helper functions deleted, ~150 lines)
  - gameStateLogic.js (2 functions simplified)
  - substitutionHandlers.js (swap-pair-positions handler removed)
  - substitutionManager.js (unused helper function removed)
  - FormationRenderer index.js (export removed)

**Linter Status**: ✅ PASSING (`CI=true npm run build` succeeds)

**Remaining Dead Code** (19 files identified with pairs references):
- Utility files: gameModes.js, playerSortingUtils.js, formationUtils.js, debugUtils.js, matchReportUtils.js, persistenceManager.js, positionConstants.js
- Handler/Animation files: animationSupport.js, fieldPositionHandlers.js, useFieldPositionHandlers.js
- Component files: GameScreen.js, HamburgerMenu.js, PeriodSetupScreen.js
- Plus test files

**Why Dead Code Doesn't Break Build**:
- These files have pairs conditionals (e.g., `if (substitutionType === 'pairs')`)
- The branches are never executed since `SUBSTITUTION_TYPES.PAIRS` was removed
- No compilation errors because the code paths are unreachable, not syntactically invalid

**Next Phase Strategy**:
1. Clean up dead pairs code in utility files (7 files)
2. Clean up dead pairs code in handler/animation files (3 files)
3. Clean up dead pairs code in component files (3 files)
4. Update test files to remove pairs test cases
5. Update documentation
6. Run full test suite
7. Manual integration and regression testing
