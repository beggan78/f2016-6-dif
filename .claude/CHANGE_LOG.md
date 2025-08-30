# Sport Wizard - Change Log

## Recent Changes (December 2024)

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
- **CRITICAL**: `clearStoredState()` must reset both `currentMatchId` AND `matchCreationAttempted` flags
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