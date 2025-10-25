# Player Name Separation Plan

## Current Data Flow
- **Supabase schema**: `public.player` currently stores a single `name` column plus `jersey_number`, roster flags, audit metadata, and a uniqueness constraint on `(team_id, jersey_number)`.
- **Data access**: `TeamContext` is the single point of truth for roster CRUD. `createPlayer`/`addRosterPlayer`/`updateRosterPlayer` insert or update `name` + `jersey_number`, then refresh context state and sync to local game state via `playerSyncUtils`.
- **UI surfaces**: Player creation/editing happens in `components/team/AddRosterPlayerModal.js` and `components/team/EditPlayerModal.js`. Numerous views (team management, setup flows, statistics, reports) read `player.name` directly for rendering and for downstream utilities/services.
- **Local/game state**: `playerSyncUtils` copies roster players into the game-state cache, storing `player.name` as the canonical string. Utilities such as `playerUtils.getPlayerName` and backend services (e.g., `matchStateManager`) expect that property for labeling, captain badges, and report generation.

## Implementation Steps
1. **Schema Migration**
   - Create a Supabase migration that renames `public.player.name` to `first_name` and introduces a nullable `last_name` column and display_name column (length validation consistent with first name).
   - Backfill display_name with name for existing rows.
   - Update any dependent views, triggers, or functions if they reference `name` explicitly (current trigger only touches metadata, so no extra work expected).

2. **Seed Data & Types**
   - Update `supabase/seed.sql` inserts to provide `first_name`/`last_name`/`display_name`.
   - Regenerate Supabase TypeScript definitions (`npm run db:types`) so `src/types/supabase.ts` reflects the new columns.

3. **Team Context & Supabase Queries**
   - Adjust every `supabase.from('player')` select/insert/update in `src/contexts/TeamContext.js` to read/write `first_name`, `last_name` and `display_name`.
   - Update `teamPlayers` state shape and any helper methods (`getTeamPlayers`, `getTeamRoster`, `addRosterPlayer`, `updateRosterPlayer`) to return all name parts.

4. **Form UX Updates**
   - Modify `AddRosterPlayerModal` and `EditPlayerModal` to include separate inputs for first, last and display-name, with validation rules (first name and display name required, last optional but length-capped).
   - When user has entered a value for first name (and leaves the field) id display name is empty, auto-fill it with the first name.
   - Reflect combined name in confirmation/success copy where appropriate.
   - Update form state and callbacks (`onPlayerAdded`/`onPlayerUpdated`) to pass the all name fields.

5. **Propagate Display Names Through the App**
   - In the Team Management Roster tab we DO want to display the players' first AND last names. Not only the display names.
   - In other places across the app, the display name should be used.
   - Replace direct `player.name` usages in components and services with `player.displayName`.
   - Targeted files include team management UI, setup screens, statistics/report components, match configuration services, formatting utilities, and Jest tests that expect concrete names.
   - Do NOT take backward compatibility with local storage or similar into account.

6. **Utility & Service Adjustments**
   - Extend `playerUtils` helpers (`getPlayerName`, etc.) to consume the new structure and favour the display name, falling back to `first_name`.
   - Audit `matchStateManager` and any other services that read `stat.player.name` to ensure they use the new naming helper and still pipe a friendly string to Supabase or reports.

7. **Testing Updates**
   - Update existing tests/mocks across components, utilities, and services.
   - Run the relevant suites (`npm test -- --watchAll=false`) and lint/build checks (`CI=true npm run build`).


