# Sport Wizard Database Schema

## Overview

This document describes the database schema for the Sport Wizard application, a mobile-first web application for coaching youth soccer teams with Supabase backend. The database manages organizational structures (clubs and teams), player information, match data, and comprehensive statistics tracking.

## Architecture Principles

### User ID References

**CRITICAL**: Understanding the distinction between `auth.users.id` and `public.user_profile.id`:

- **`auth.users.id`**: Supabase Auth user ID
  - Used for RLS (Row Level Security) policies
  - Used in Edge Functions
  - Referenced by audit fields (`created_by`, `last_updated_by`)
  - Referenced by `team_invitation.invited_by_user_id`

- **`public.user_profile.id`**: Application user profile
  - Used for business logic relationships
  - Has FK to `auth.users.id` (1:1 mapping)
  - Referenced by `team_user.user_id`, `club_user.user_id`
  - Referenced by `team_access_request.user_id`, `reviewed_by`

**Rule of Thumb**:
- RLS + `auth.uid()` → reference `auth.users(id)`
- Business relationships → reference `public.user_profile(id)`

## Entity Relationship Overview

```
┌─────────────┐
│   Club      │
└──────┬──────┘
       │
       │ 1:N
       ▼
┌─────────────┐      1:N       ┌──────────────┐
│    Team     │───────────────▶│   Player     │
└──────┬──────┘                └──────┬───────┘
       │                              │
       │ 1:N                          │ 1:N
       ▼                              ▼
┌─────────────┐                ┌──────────────────┐
│   Match     │◀───────────────│ Player Match     │
└──────┬──────┘       N:1      │     Stats        │
       │                       └──────────────────┘
       │ 1:N                           │
       ▼                               │ N:1
┌─────────────┐                        ▼
│ Match Log   │                ┌──────────────────┐
│   Event     │                │  Season Stats    │
└─────────────┘                └──────────────────┘
```

## Enum Types

### club_user_role
- `admin` - Club administrator
- `coach` - Club coach
- `member` - Club member

### club_user_status
- `active` - Active club user
- `inactive` - Inactive club user
- `pending` - Pending approval

### match_event_type
- `goal_scored` - Goal scored by team
- `goal_conceded` - Goal conceded by team
- `substitution_in` - Player substituted in
- `substitution_out` - Player substituted out
- `match_started` - Match started
- `match_ended` - Match ended
- `period_started` - Period started
- `period_ended` - Period ended
- `goalie_enters` - Player enters as goalie
- `goalie_exits` - Player exits goalie position
- `position_switch` - Player switches position
- `sub_order_changed` - Substitution order changed
- `player_inactivated` - Player marked inactive
- `player_reactivated` - Player reactivated

### match_format
- `3v3` - 3 vs 3 format
- `5v5` - 5 vs 5 format
- `7v7` - 7 vs 7 format
- `9v9` - 9 vs 9 format
- `11v11` - 11 vs 11 format

### match_outcome
- `win` - Team won
- `loss` - Team lost
- `draw` - Match tied

### match_state
- `running` - Match in progress
- `finished` - Match finished but not confirmed
- `pending` - Match pending/scheduled
- `confirmed` - Match confirmed and finalized

### match_type
- `friendly` - Friendly match
- `internal` - Internal practice match
- `league` - League match
- `tournament` - Tournament match
- `cup` - Cup match

### match_venue_type
- `home` - Home match
- `away` - Away match
- `neutral` - Neutral venue

### player_role
- `goalie` - Goalkeeper
- `defender` - Defender
- `midfielder` - Midfielder
- `attacker` - Attacker
- `substitute` - Substitute
- `unknown` - Unknown role (fallback)

### request_status
- `pending` - Request pending
- `approved` - Request approved
- `rejected` - Request rejected
- `cancelled` - Request cancelled

### user_role
- `parent` - Parent role
- `player` - Player role
- `coach` - Coach role
- `admin` - Administrator role

## Tables

### user_profile

User profile table linking to Supabase Auth users.

**Columns:**
- `id` (uuid, PK) - User profile ID, references `auth.users(id)`
- `name` (text, nullable) - User display name
- `created_at` (timestamptz, NOT NULL) - Creation timestamp
- `updated_at` (timestamptz, NOT NULL) - Last update timestamp

**Constraints:**
- Primary key on `id`
- Foreign key to `auth.users(id)`
- Check: `name` must be trimmed (length(trim(name)) > 0)

**Relationships:**
- Referenced by `club_user.user_id`
- Referenced by `team_user.user_id`
- Referenced by `team_access_request.user_id`
- Referenced by `team_access_request.reviewed_by`

---

### club

Soccer club/organization entity.

**Columns:**
- `id` (uuid, PK) - Unique identifier
- `name` (text, NOT NULL) - Club name
- `short_name` (text, nullable) - Short name/abbreviation
- `long_name` (text, nullable) - Full official name
- `created_at` (timestamptz, NOT NULL) - Creation timestamp
- `updated_at` (timestamptz, NOT NULL) - Last update timestamp
- `created_by` (uuid, nullable) - References `auth.users(id)`
- `last_updated_by` (uuid, nullable) - References `auth.users(id)`

**Constraints:**
- Primary key on `id`
- Foreign keys to `auth.users(id)` for audit fields
- Check: All name fields must be trimmed

**Relationships:**
- One-to-many with `team`
- One-to-many with `club_user`

---

### club_user

Junction table linking users to clubs with roles.

**Columns:**
- `id` (uuid, PK) - Unique identifier
- `club_id` (uuid, NOT NULL) - References `club(id)`
- `user_id` (uuid, NOT NULL) - References `user_profile(id)`
- `role` (club_user_role, NOT NULL) - User role in club (default: 'member')
- `status` (club_user_status, NOT NULL) - User status (default: 'active')
- `joined_at` (timestamptz, nullable) - Join timestamp
- `created_at` (timestamptz, NOT NULL) - Creation timestamp
- `updated_at` (timestamptz, NOT NULL) - Last update timestamp
- `review_notes` (text, nullable) - Review notes
- `created_by` (uuid, nullable) - References `auth.users(id)`
- `last_updated_by` (uuid, nullable) - References `auth.users(id)`

**Constraints:**
- Primary key on `id`
- Unique constraint on `(club_id, user_id)`
- Foreign key to `club(id)`
- Foreign key to `user_profile(id)`
- Foreign keys to `auth.users(id)` for audit fields

---

### team

Team entity belonging to a club.

**Columns:**
- `id` (uuid, PK) - Unique identifier
- `club_id` (uuid, NOT NULL) - References `club(id)`
- `name` (text, NOT NULL) - Team name
- `active` (boolean, NOT NULL) - Active status (default: true)
- `configuration` (jsonb, nullable) - Team configuration (default: '{}')
- `created_at` (timestamptz, NOT NULL) - Creation timestamp
- `updated_at` (timestamptz, NOT NULL) - Last update timestamp
- `created_by` (uuid, nullable) - References `auth.users(id)`
- `last_updated_by` (uuid, nullable) - References `auth.users(id)`

**Constraints:**
- Primary key on `id`
- Unique constraint on `(club_id, name)`
- Foreign key to `club(id)`
- Foreign keys to `auth.users(id)` for audit fields
- Check: `name` must be trimmed

**Relationships:**
- Many-to-one with `club`
- One-to-many with `player`
- One-to-many with `match`
- One-to-many with `team_user`
- One-to-many with `team_access_request`
- One-to-many with `team_invitation`

---

### team_user

Junction table linking users to teams with roles.

**Columns:**
- `id` (uuid, PK) - Unique identifier
- `team_id` (uuid, NOT NULL) - References `team(id)`
- `user_id` (uuid, NOT NULL) - References `user_profile(id)`
- `role` (user_role, NOT NULL) - User role in team (default: 'parent')
- `created_at` (timestamptz, NOT NULL) - Creation timestamp
- `updated_at` (timestamptz, NOT NULL) - Last update timestamp
- `created_by` (uuid, nullable) - References `auth.users(id)`
- `last_updated_by` (uuid, nullable) - References `auth.users(id)`

**Constraints:**
- Primary key on `id`
- Unique constraint on `(team_id, user_id)`
- Foreign key to `team(id)`
- Foreign key to `user_profile(id)`
- Foreign keys to `auth.users(id)` for audit fields

---

### team_access_request

Requests for team access.

**Columns:**
- `id` (uuid, PK) - Unique identifier
- `team_id` (uuid, NOT NULL) - References `team(id)`
- `user_id` (uuid, NOT NULL) - References `user_profile(id)`
- `requested_role` (user_role, NOT NULL) - Requested role (default: 'parent')
- `message` (text, nullable) - Request message
- `status` (request_status, NOT NULL) - Request status (default: 'pending')
- `reviewed_by` (uuid, nullable) - References `user_profile(id)`
- `reviewed_at` (timestamptz, nullable) - Review timestamp
- `review_notes` (text, nullable) - Review notes
- `created_at` (timestamptz, NOT NULL) - Creation timestamp
- `updated_at` (timestamptz, NOT NULL) - Last update timestamp
- `created_by` (uuid, nullable) - References `auth.users(id)`
- `last_updated_by` (uuid, nullable) - References `auth.users(id)`

**Constraints:**
- Primary key on `id`
- Foreign key to `team(id)`
- Foreign key to `user_profile(id)` for `user_id` and `reviewed_by`
- Foreign keys to `auth.users(id)` for audit fields
- Check: Message and review notes must be trimmed

---

### team_invitation

Team invitations sent to users.

**Columns:**
- `id` (uuid, PK) - Unique identifier
- `team_id` (uuid, NOT NULL) - References `team(id)`
- `invited_by_user_id` (uuid, NOT NULL) - References `auth.users(id)`
- `invited_user_id` (uuid, nullable) - References `auth.users(id)`
- `email` (text, NOT NULL) - Invited user email
- `role` (text, NOT NULL) - Assigned role
- `message` (text, nullable) - Invitation message (default: '')
- `status` (text, NOT NULL) - Invitation status (default: 'pending')
- `created_at` (timestamptz, NOT NULL) - Creation timestamp
- `updated_at` (timestamptz, NOT NULL) - Last update timestamp
- `accepted_at` (timestamptz, nullable) - Acceptance timestamp
- `expires_at` (timestamptz, NOT NULL) - Expiration timestamp (default: now() + 1 day)

**Constraints:**
- Primary key on `id`
- Foreign key to `team(id)`
- Foreign keys to `auth.users(id)` for `invited_by_user_id` and `invited_user_id`
- Check: Role in ('parent', 'coach', 'admin')
- Check: Status in ('pending', 'accepted', 'rejected', 'expired')

---

### player

Player entity belonging to a team.

**Columns:**
- `id` (uuid, PK) - Unique identifier
- `team_id` (uuid, NOT NULL) - References `team(id)`
- `name` (text, NOT NULL) - Player name
- `jersey_number` (integer, nullable) - Jersey number
- `on_roster` (boolean, NOT NULL) - Roster status (default: true)
- `created_at` (timestamptz, NOT NULL) - Creation timestamp
- `updated_at` (timestamptz, NOT NULL) - Last update timestamp
- `created_by` (uuid, nullable) - References `auth.users(id)`
- `last_updated_by` (uuid, nullable) - References `auth.users(id)`

**Columns (continued):**

**Constraints:**
- Primary key on `id`
- Unique constraint on `(team_id, jersey_number)`
- Foreign key to `team(id)`
- Foreign keys to `auth.users(id)` for audit fields
- Check: `jersey_number` >= 0
- Check: `name` must be trimmed
- Check: `length(name)` between 1 and 50

**Relationships:**
- Many-to-one with `team`
- One-to-many with `player_match_stats`
- One-to-many with `season_stats`
- Referenced by `match.captain`
- Referenced by `match.fair_play_award`

---

### match

Match/game entity.

**Columns:**
- `id` (uuid, PK) - Unique identifier
- `created_at` (timestamptz, NOT NULL) - Creation timestamp
- `updated_at` (timestamptz, NOT NULL) - Last update timestamp
- `team_id` (uuid, NOT NULL) - References `team(id)`
- `format` (match_format, NOT NULL) - Match format (e.g., '5v5')
- `formation` (text, NOT NULL) - Formation (e.g., '2-2', '1-2-1')
- `periods` (smallint, NOT NULL) - Number of periods
- `period_duration_minutes` (smallint, NOT NULL) - Period duration in minutes
- `match_duration_seconds` (integer, nullable) - Total match duration in seconds
- `finished_at` (timestamptz, nullable) - Finish timestamp
- `type` (match_type, NOT NULL) - Match type
- `opponent` (text, nullable) - Opponent name
- `captain` (uuid, nullable) - References `player(id)`
- `fair_play_award` (uuid, nullable) - References `player(id)`
- `goals_scored` (smallint, nullable) - Goals scored by team (default: 0)
- `goals_conceded` (smallint, nullable) - Goals conceded by team (default: 0)
- `outcome` (match_outcome, nullable) - Match outcome
- `state` (match_state, NOT NULL) - Match state (default: 'running')
- `created_by` (uuid, nullable) - References `auth.users(id)` (default: auth.uid())
- `last_updated_by` (uuid, nullable) - References `auth.users(id)` (default: auth.uid())
- `initial_config` (jsonb, nullable) - Initial configuration (default: '{}')
- `venue_type` (match_venue_type, NOT NULL) - Venue type (default: 'home')
- `started_at` (timestamptz, nullable) - Start timestamp
- `deleted_at` (timestamptz, nullable) - Soft delete timestamp

**Constraints:**
- Primary key on `id`
- Foreign key to `team(id)`
- Foreign key to `player(id)` for `captain` and `fair_play_award`
- Foreign keys to `auth.users(id)` for audit fields
- Check: `periods` >= 1
- Check: `period_duration_minutes` > 0

**Relationships:**
- Many-to-one with `team`
- Many-to-one with `player` (for captain and fair_play_award)
- One-to-many with `player_match_stats`
- One-to-many with `match_log_event`

---

### match_log_event

Event log for match activities.

**Columns:**
- `id` (uuid, PK) - Unique identifier
- `created_at` (timestamptz, NOT NULL) - Creation timestamp
- `match_id` (uuid, NOT NULL) - References `match(id)`
- `player_id` (uuid, nullable) - References `player(id)`
- `event_type` (match_event_type, NOT NULL) - Event type
- `data` (jsonb, nullable) - Event data payload
- `correlation_id` (uuid, nullable) - Correlation ID for related events
- `occurred_at_seconds` (integer, NOT NULL) - Time in match when event occurred (seconds)
- `period` (smallint, NOT NULL) - Period number when event occurred

**Constraints:**
- Primary key on `id`
- Foreign key to `match(id)`
- Foreign key to `player(id)`

**Relationships:**
- Many-to-one with `match`
- Many-to-one with `player`

---

### player_match_stats

Per-match statistics for players.

**Columns:**
- `id` (uuid, PK) - Unique identifier
- `created_at` (timestamptz, nullable) - Creation timestamp
- `updated_at` (timestamptz, nullable) - Last update timestamp
- `player_id` (uuid, NOT NULL) - References `player(id)`
- `match_id` (uuid, NOT NULL) - References `match(id)`
- `goals_scored` (smallint, nullable) - Goals scored (default: 0)
- `goalie_time_seconds` (integer, nullable) - Time as goalie (default: 0)
- `defender_time_seconds` (integer, nullable) - Time as defender (default: 0)
- `midfielder_time_seconds` (integer, nullable) - Time as midfielder (default: 0)
- `attacker_time_seconds` (integer, nullable) - Time as attacker (default: 0)
- `substitute_time_seconds` (integer, nullable) - Time as substitute (default: 0)
- `started_as` (player_role, NOT NULL) - Starting position
- `was_captain` (boolean, nullable) - Captain flag (default: false)
- `got_fair_play_award` (boolean, nullable) - Fair play award flag (default: false)
- `created_by` (uuid, nullable) - References `auth.users(id)` (default: auth.uid())
- `last_updated_by` (uuid, nullable) - References `auth.users(id)` (default: auth.uid())
- `total_field_time_seconds` (integer, nullable) - Total time on field (default: 0)

**Constraints:**
- Primary key on `id`
- Unique constraint on `(player_id, match_id)`
- Foreign key to `player(id)`
- Foreign key to `match(id)`
- Foreign keys to `auth.users(id)` for audit fields
- Check: `goals_scored` >= 0
- Check: All time fields >= 0
- Check: `total_field_time_seconds` >= 0

**Relationships:**
- Many-to-one with `player`
- Many-to-one with `match`

---

### season_stats

Aggregated season statistics for players.

**Columns:**
- `id` (uuid, PK) - Unique identifier
- `created_at` (timestamptz, nullable) - Creation timestamp
- `updated_at` (timestamptz, nullable) - Last update timestamp
- `player_id` (uuid, NOT NULL) - References `player(id)`
- `season_year` (integer, NOT NULL) - Season year
- `matches_played` (integer, nullable) - Matches played (default: 0)
- `goals_scored` (integer, nullable) - Total goals scored (default: 0)
- `captain_count` (integer, nullable) - Times as captain (default: 0)
- `fair_play_awards` (integer, nullable) - Fair play awards count (default: 0)
- `total_field_time_seconds` (integer, nullable) - Total field time (default: 0)
- `total_goalie_time_seconds` (integer, nullable) - Total goalie time (default: 0)
- `total_defender_time_seconds` (integer, nullable) - Total defender time (default: 0)
- `total_midfielder_time_seconds` (integer, nullable) - Total midfielder time (default: 0)
- `total_attacker_time_seconds` (integer, nullable) - Total attacker time (default: 0)
- `total_substitute_time_seconds` (integer, nullable) - Total substitute time (default: 0)
- `starts_as_field_player` (integer, nullable) - Starts as field player (default: 0)
- `starts_as_goalie` (integer, nullable) - Starts as goalie (default: 0)
- `starts_as_substitute` (integer, nullable) - Starts as substitute (default: 0)
- `created_by` (uuid, nullable) - References `auth.users(id)` (default: auth.uid())
- `last_updated_by` (uuid, nullable) - References `auth.users(id)` (default: auth.uid())

**Constraints:**
- Primary key on `id`
- Unique constraint on `(player_id, season_year)`
- Foreign key to `player(id)`
- Foreign keys to `auth.users(id)` for audit fields
- Check: `season_year` >= 2000 and `season_year` <= 2100
- Check: All numeric fields >= 0

**Relationships:**
- Many-to-one with `player`

---

### formation_vote

Formation voting system for user preferences.

**Columns:**
- `id` (uuid, PK) - Unique identifier
- `user_id` (uuid, NOT NULL) - References `auth.users(id)`
- `formation` (text, NOT NULL) - Formation name (e.g., '2-2', '1-2-1')
- `format` (text, NOT NULL) - Match format (e.g., '5v5')
- `created_at` (timestamptz, NOT NULL) - Creation timestamp

**Constraints:**
- Primary key on `id`
- Unique constraint on `(user_id, formation, format)`
- Foreign key to `auth.users(id)`

---

### settings

Application settings (team-level and global).

**Columns:**
- `id` (uuid, PK) - Unique identifier
- `created_at` (timestamptz, NOT NULL) - Creation timestamp
- `updated_at` (timestamptz, NOT NULL) - Last update timestamp
- `team_id` (uuid, nullable) - References `team(id)` (null for global settings)
- `key` (text, NOT NULL) - Setting key
- `enabled` (boolean, NOT NULL) - Enabled flag (default: false)
- `is_global` (boolean, NOT NULL) - Global setting flag (default: false)
- `created_by` (uuid, nullable) - References `auth.users(id)` (default: auth.uid())
- `last_updated_by` (uuid, nullable) - References `auth.users(id)` (default: auth.uid())

**Constraints:**
- Primary key on `id`
- Foreign key to `team(id)`
- Foreign keys to `auth.users(id)` for audit fields

**Relationships:**
- Many-to-one with `team` (nullable for global settings)

---

## Key Patterns

### Audit Fields

Most tables include audit fields:
- `created_at` (timestamptz) - Automatically set on insert
- `updated_at` (timestamptz) - Automatically updated on modification
- `created_by` (uuid) - References `auth.users(id)`, tracks who created the record
- `last_updated_by` (uuid) - References `auth.users(id)`, tracks who last modified

### Role Mapping

**Formation Positions vs Database Roles:**

Formation positions (UI-specific):
- `leftDefender`, `rightDefender`, `left`, `right`, `leftAttacker`, `rightAttacker`, `midfielder`

Database roles (standardized enum `player_role`):
- `goalie`, `defender`, `midfielder`, `attacker`, `substitute`, `unknown`

Always use `mapFormationPositionToRole()` utility function for conversion when persisting to database.

### Match Lifecycle

Matches follow a three-state lifecycle:
1. **`running`** - Match in progress
2. **`finished`** - Match finished, statistics calculated
3. **`confirmed`** - Match confirmed and finalized, stats aggregated to season

Additional state:
- **`pending`** - Match scheduled but not started

### Time Tracking

Player time is tracked in seconds across multiple dimensions:
- Role-specific time: `goalie_time_seconds`, `defender_time_seconds`, `midfielder_time_seconds`, `attacker_time_seconds`
- Status time: `substitute_time_seconds`
- Total: `total_field_time_seconds` (sum of on-field time across all roles)

Time is accumulated through "stints" - periods where a player maintains a specific role/status.

### Soft Deletes

Some tables support soft deletion:
- `match.deleted_at` - When set, match is considered deleted but data is retained

---

## Index Recommendations

While not explicitly defined in this schema dump, consider these indexes for performance:

**High-priority indexes:**
- `match(team_id, state)` - For fetching team matches by state
- `player_match_stats(match_id)` - For loading match statistics
- `player_match_stats(player_id)` - For player history
- `season_stats(player_id, season_year)` - Already covered by unique constraint
- `match_log_event(match_id, occurred_at_seconds)` - For event timeline
- `team_user(user_id)` - For finding user's teams
- `club_user(user_id)` - For finding user's clubs

---

## Notes

1. **UUID Generation**: All primary keys use UUID v4 generation
2. **Timestamps**: All timestamps use `timestamptz` (timezone-aware)
3. **JSONB Fields**: `team.configuration`, `match.initial_config`, `match_log_event.data` store flexible JSON data
4. **Supabase Integration**: This schema is designed for Supabase and uses `auth.users` table from the auth schema
5. **RLS Policies**: Not shown in this document but critical for security - all tables should have appropriate Row Level Security policies
