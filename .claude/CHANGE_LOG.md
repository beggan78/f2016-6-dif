# Sport Wizard - Change Log

## Recent Changes (September 2025)

### Resume Pending Match Configuration Feature

#### New Services
- **pendingMatchService.js**: Complete service for pending match detection and resume data creation
  - `checkForPendingMatches()` - Multi-match detection for team selection modal
  - `checkForPendingMatch()` - Single match detection for resume workflow
  - `validatePendingMatchConfig()` - Configuration validation for resume eligibility
  - `createResumeDataForConfiguration()` - Format pending data for ConfigurationScreen
  - `matchesCurrentConfiguration()` - Prevent duplicate pending matches
- **matchConfigurationService.js**: Service for match configuration persistence and management
  - `savePendingMatchConfiguration()` - Save configuration to database as 'pending' state
  - `updatePendingMatch()` - Update existing pending match configuration
  - `createMatchFromConfiguration()` - Create running match from valid configuration
  - `handleExistingMatch()` - Process existing match scenarios (running/finished)

#### Enhanced Session Detection
- **sessionDetectionService.js**: Improved session type detection (NEW_SIGN_IN vs PAGE_REFRESH)
  - Enhanced detection logic for determining when to show resume modal
  - Reliable differentiation between fresh sign-ins and page refreshes

#### New UI Components
- **PendingMatchResumeModal.js**: Modal for resuming pending match configurations
  - Single match resume with configuration preview
  - Multi-match selection interface when multiple pending matches exist
  - Loading states and error handling for resume operations

#### ConfigurationScreen Enhancements
- Resume functionality integration with seamless data population
- Support for resuming team config, squad selection, and match settings
- Enhanced validation for resumed configurations

#### Database Schema Extensions
- **match.state** enum extended with 'pending' state for incomplete configurations
- **match.initial_config** JSON field for storing configuration before match start
- Support for match lifecycle: pending → running → finished → confirmed

#### Comprehensive Testing
- **pendingMatchService.test.js**: 31 test cases covering all service functions
- **matchConfigurationService.test.js**: 28 test cases for configuration management
- **PendingMatchResumeModal.test.js**: 66 test cases with 92.1% statement coverage
- Full mocking of Supabase and dependencies with realistic test scenarios

#### Critical Patterns
- **Boolean Logic**: Fixed `shouldShow` return values to use `!!()` for reliable boolean results
- **Configuration Validation**: Comprehensive validation ensures all required fields present
- **Database Integration**: Proper handling of database state vs UI state consistency
- **Error Handling**: Graceful degradation when services unavailable

## Recent Changes (August 2025)

### Major Changes

#### App.js Complexity Reduction
- Extracted team invitation management into `useTeamInvitationManager` hook
- Reduced App.js from 1,398 to 1,199 lines (~200 lines extracted)

#### Match Abandonment Protection
- Added database-backed protection against accidental match data loss
- Different modals for running matches (Abandon/Cancel) vs finished matches (Save/Delete/Cancel)
- Uses database as authoritative source for match state detection

#### Production Console Cleanup
- Wrapped debug logs in development guards (`process.env.NODE_ENV === 'development'`)
- Preserved error logs for production debugging
- Reduced bundle size by 469 bytes

#### Enhanced Success Messages
- Floating overlay design with auto-dismiss and backdrop blur effects

### Critical Gotchas

#### Match State Management
- **CRITICAL**: `clearStoredState()` must reset both `currentMatchId` AND `matchCreated` flags
- Always query database for match state - don't rely on localStorage or React state
- Database schema requires `match.state` enum column

#### Console Logging  
- Never guard `console.error()` statements - keep for production debugging
- All debug logs must be wrapped in development environment checks

#### Team Invitation Hook
- `useTeamInvitationManager` requires `gameState`, `authModal`, and `showSuccessMessage` props
- Hook automatically manages URL parameter cleanup

### Files
- **New**: `src/hooks/useTeamInvitationManager.js`, `.claude/CHANGE_LOG.md`
- **Modified**: `src/App.js`, `src/hooks/useMatchRecovery.js`, `src/components/stats/StatsScreen.js`, `README.md`