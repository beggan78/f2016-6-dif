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
        │
        │ 1:N
        ▼
┌─────────────┐        1:N        ┌────────────────────┐
│  Connector  │──────────────────▶│ Connector Sync Job │
└────┬───┬────┘                   └────────────────────┘
     │   │ 1:N
     │   ▼
     │ ┌───────────────┐
     │ │ Upcoming Match│
     │ └──────┬────────┘
     │        │ 1:N
     │        ▼
     │  ┌──────────────────────┐
     │  │ Upcoming Match Player│
     │  └──────────────────────┘
     │
     │ 1:N
     ▼
┌──────────────────┐
│ Player Attendance│
└──────────────────┘
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

### connector_provider
- `sportadmin` - SportAdmin team management platform
- `svenska_lag` - Svenska Lag integration (planned)

### connector_status
- `connected` - Credentials verified and ready to sync
- `disconnected` - Connection disabled by the team
- `error` - Last sync failed and needs attention
- `verifying` - Awaiting first successful verification (default)

### connector_sync_job_type
- `manual` - Triggered directly by a team admin
- `scheduled` - Triggered by the automated scheduler
- `verification` - Triggered during credential verification flow

### sync_job_status
- `waiting` - Job queued and ready to be picked up
- `running` - Job is currently executing
- `completed` - Job finished successfully
- `failed` - Job ended with an error
- `cancelled` - Job was cancelled before completion

### upcoming_match_player_availability
- `unknown` - Availability has not been set
- `available` - Player is available
- `unavailable` - Player is unavailable

### upcoming_match_player_invite_status
- `not_invited` - Player has not been invited/selected yet
- `invited` - Player has been invited/selected

### upcoming_match_player_response
- `no_response` - No response recorded
- `accepted` - Player accepted the invite
- `declined` - Player declined the invite

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
- `finished` - Match finished and finalized
- `pending` - Match pending/scheduled

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

### connector

Encrypted credentials for linking a team to an external provider.

**Columns:**
- `id` (uuid, PK) - Unique identifier (default `uuid_generate_v4()`)
- `team_id` (uuid, NOT NULL) - References `team(id)`; cascade on team delete
- `provider` (connector_provider, NOT NULL) - External provider identifier
- `status` (connector_status, NOT NULL) - Connection lifecycle status (default: 'verifying')
- `encrypted_username` (bytea, NOT NULL) - AES-256-GCM encrypted username
- `encrypted_password` (bytea, NOT NULL) - AES-256-GCM encrypted password
- `encryption_iv` (bytea, NOT NULL) - 12-byte initialization vector
- `encryption_salt` (bytea, NOT NULL) - Salt for key derivation (minimum 16 bytes)
- `encryption_key_version` (integer, NOT NULL) - Master key version used (default: 1)
- `config` (jsonb, NOT NULL) - Provider-specific configuration (default: `{}`)
- `last_verified_at` (timestamptz, nullable) - Timestamp of last credential verification
- `last_sync_at` (timestamptz, nullable) - Timestamp of last successful sync
- `last_error` (text, nullable) - Latest sync error message
- `created_at` (timestamptz, NOT NULL) - Creation timestamp (default: now())
- `created_by` (uuid, nullable) - References `auth.users(id)`; set NULL on delete
- `updated_at` (timestamptz, NOT NULL) - Last update timestamp (default: now())
- `last_updated_by` (uuid, nullable) - References `auth.users(id)`; set NULL on delete

**Constraints:**
- Primary key on `id`
- Unique constraint on `(team_id, provider)` ensures one connector per provider per team
- Foreign key to `team(id)` with ON DELETE CASCADE
- Foreign keys to `auth.users(id)` for audit columns
- Check: `octet_length(encryption_iv) = 12`
- Check: `octet_length(encryption_salt) >= 16`

**Indexes:**
- `idx_connector_team_id` on `team_id`
- `idx_connector_provider` on `provider`
- `idx_connector_status` on `status`
- `idx_connector_last_sync` on `last_sync_at DESC`

**Relationships:**
- Many-to-one with `team`
- One-to-many with `connector_sync_job`
- One-to-many with `player_attendance`
- One-to-many with `upcoming_match`

**Row Level Security:**
- Enabled. Team members may select connectors; inserts, updates, and deletes require the user to be a team admin.

---

### connector_sync_job

Queue of sync requests for pulling data from external providers.

**Columns:**
- `id` (uuid, PK) - Unique identifier (default `uuid_generate_v4()`)
- `connector_id` (uuid, NOT NULL) - References `connector(id)`; cascade on delete
- `job_type` (connector_sync_job_type, NOT NULL) - Sync trigger type (default: 'manual')
- `status` (sync_job_status, NOT NULL) - Job execution state (default: 'waiting')
- `scheduled_at` (timestamptz, NOT NULL) - When the job should run (default: now())
- `last_started_at` (timestamptz, nullable) - When the job last started
- `last_finished_at` (timestamptz, nullable) - When the job last finished
- `error_message` (text, nullable) - Human-readable error
- `error_code` (varchar(50), nullable) - Provider/service error code
- `error_details` (jsonb, nullable) - Structured error payload
- `created_at` (timestamptz, NOT NULL) - Creation timestamp (default: now())
- `created_by` (uuid, nullable) - References `auth.users(id)`; set NULL on delete
- `updated_at` (timestamptz, NOT NULL) - Last update timestamp (default: now())
- `last_updated_by` (uuid, nullable) - References `auth.users(id)`; set NULL on delete

**Constraints:**
- Primary key on `id`
- Foreign key to `connector(id)` with ON DELETE CASCADE
- Foreign keys to `auth.users(id)` for audit columns

**Indexes:**
- `idx_connector_sync_job_status` on `(status, scheduled_at)`
- `idx_connector_sync_job_connector` on `connector_id`
- `idx_connector_sync_job_scheduled` partial index on `scheduled_at` where status = 'waiting'

**Relationships:**
- Many-to-one with `connector`

**Row Level Security:**
- Enabled. Team members can select queued jobs; inserts require team admin role; updates are restricted to the service role which processes jobs.

---

### player_attendance

Historical practice attendance imported from external providers and matched to roster players when possible. Each row now represents a single practice date for a player (daily granularity).

**Columns:**
- `id` (uuid, PK) - Unique identifier (default `uuid_generate_v4()`)
- `connector_id` (uuid, NOT NULL) - References `connector(id)`; cascade on delete
- `player_id` (uuid, nullable) - References `player(id)`; set NULL if player record is removed
- `player_name` (varchar(100), NOT NULL) - Raw player name received from the provider
- `year` (integer, NOT NULL) - Year of the practice date
- `month` (integer, NOT NULL) - Month of the practice date (1-12)
- `day_of_month` (integer, NOT NULL) - Day of month for the practice date (1-31)
- `total_practices` (integer, NOT NULL) - Total practices tracked for that date (usually 1)
- `total_attendance` (integer, NOT NULL) - Number of attended practices for that date
- `last_synced_at` (timestamptz, NOT NULL) - Timestamp of the most recent sync (default: now())
- `created_at` (timestamptz, NOT NULL) - Creation timestamp (default: now())
- `created_by` (uuid, nullable) - References `auth.users(id)`; set NULL on delete
- `updated_at` (timestamptz, NOT NULL) - Last update timestamp (default: now())
- `last_updated_by` (uuid, nullable) - References `auth.users(id)`; set NULL on delete

**Constraints:**
- Primary key on `id`
- Unique constraint on `(connector_id, player_name, year, month, day_of_month)` prevents duplicate daily stats per provider
- Foreign key to `connector(id)` with ON DELETE CASCADE
- Foreign key to `player(id)` with ON DELETE SET NULL
- Foreign keys to `auth.users(id)` for audit columns
- Check: `month` between 1 and 12
- Check: `day_of_month` between 1 and 31
- Check: `total_attendance` between 0 and `total_practices`
- Check: `year` between 2020 and 2099

**Indexes:**
- `idx_player_attendance_connector` on `connector_id`
- `idx_player_attendance_player` on `player_id` (filtered on non-null)
- `idx_player_attendance_synced` on `last_synced_at DESC`
- `idx_player_attendance_year` on `year DESC`

**Relationships:**
- Many-to-one with `connector`
- Optional many-to-one with `player`

**Row Level Security:**
- Enabled. Team members can read attendance data; inserts and updates are performed by the service role; deletes require a team admin.

---

### upcoming_match

Upcoming fixtures synchronized from external providers.

**Columns:**
- `id` (uuid, PK) - Unique identifier (default `uuid_generate_v4()`)
- `connector_id` (uuid, NOT NULL) - References `connector(id)`; cascade on delete
- `planned_match_id` (uuid, nullable) - References `match(id)`; set NULL on match delete
- `match_date` (date, NOT NULL) - Match date from provider schedule
- `match_time` (varchar(50), nullable) - Provider-formatted time window (e.g., "09:45 - 11:30")
- `opponent` (varchar(200), NOT NULL) - Opponent team name
- `venue` (varchar(200), nullable) - Venue name/location
- `synced_at` (timestamptz, NOT NULL) - Timestamp of the sync that produced this record (default: now())
- `created_at` (timestamptz, NOT NULL) - Creation timestamp (default: now())
- `updated_at` (timestamptz, NOT NULL) - Last update timestamp (default: now())

**Constraints:**
- Primary key on `id`
- Unique constraint on `(connector_id, match_date, opponent)` deduplicates fixtures
- Foreign key to `connector(id)` with ON DELETE CASCADE
- Foreign key to `match(id)` with ON DELETE SET NULL (planned match link)

**Indexes:**
- `idx_upcoming_match_connector` on `connector_id`
- `idx_upcoming_match_date` on `match_date`
- `idx_upcoming_match_planned_match_id` on `planned_match_id`
- `idx_upcoming_match_unplanned` on `(connector_id, match_date)` where `planned_match_id` is NULL

**Relationships:**
- Many-to-one with `connector`
- Optional many-to-one with `match` (planned match link)
- One-to-many with `upcoming_match_player`

**Row Level Security:**
- Enabled. Team members can view upcoming matches; inserts, updates, and deletes are limited to the service role that performs syncs.

---

### upcoming_match_player

Per-player availability, invite status, and response tracking for upcoming fixtures.

**Columns:**
- `id` (uuid, PK) - Unique identifier (default `uuid_generate_v4()`)
- `upcoming_match_id` (uuid, NOT NULL) - References `upcoming_match(id)`; cascade on delete
- `connected_player_id` (uuid, NOT NULL) - References `connected_player(id)`; cascade on delete
- `availability` (upcoming_match_player_availability, NOT NULL) - Default: `unknown`
- `invite_status` (upcoming_match_player_invite_status, NOT NULL) - Default: `not_invited`
- `response` (upcoming_match_player_response, NOT NULL) - Default: `no_response`
- `created_at` (timestamptz, NOT NULL) - Creation timestamp (default: now())
- `updated_at` (timestamptz, NOT NULL) - Last update timestamp (default: now())

**Constraints:**
- Primary key on `id`
- Unique constraint on `(upcoming_match_id, connected_player_id)`
- Foreign key to `upcoming_match(id)` with ON DELETE CASCADE
- Foreign key to `connected_player(id)` with ON DELETE CASCADE

**Indexes:**
- `idx_upcoming_match_player_match` on `upcoming_match_id`
- `idx_upcoming_match_player_connected_player` on `connected_player_id`

**Relationships:**
- Many-to-one with `upcoming_match`
- Many-to-one with `connected_player`

**Row Level Security:**
- Enabled. Team members can view records via their team; inserts, updates, and deletes are restricted to the service role.

---

### player

Player entity belonging to a team.

**Columns:**
- `id` (uuid, PK) - Unique identifier
- `team_id` (uuid, NOT NULL) - References `team(id)`
- `first_name` (text, NOT NULL) - Player first name (2-50 characters)
- `last_name` (text, nullable) - Player last name (1-50 characters when present)
- `display_name` (text, NOT NULL) - Preferred display name (2-50 characters)
- `jersey_number` (integer, nullable) - Jersey number (1-99)
- `on_roster` (boolean, NOT NULL) - Roster status (default: true)
- `match_id` (uuid, nullable) - References `match(id)` when the player is temporary for a specific match
- `created_at` (timestamptz, NOT NULL) - Creation timestamp
- `updated_at` (timestamptz, NOT NULL) - Last update timestamp
- `created_by` (uuid, nullable) - References `auth.users(id)`
- `last_updated_by` (uuid, nullable) - References `auth.users(id)`

**Constraints:**
- Primary key on `id`
- Unique constraint on `(team_id, jersey_number)`
- Foreign key to `team(id)`
- Foreign keys to `auth.users(id)` for audit fields
- Check: `match_id` is NULL or `on_roster = false` (temporary match-scoped players are not on the roster)
- Check: `jersey_number` between 1 and 99 when provided
- Check: `char_length(first_name)` between 2 and 50
- Check: `last_name` NULL or `char_length(last_name)` between 1 and 50
- Check: `char_length(display_name)` between 2 and 50
- Index on `display_name` for quick lookup (`idx_player_display_name`)
- Index on `match_id` for match-scoped players (`idx_player_match_id`)

**Relationships:**
- Many-to-one with `team`
- One-to-many with `player_match_stats`
- One-to-many with `season_stats`
- Referenced by `match.captain`
- Referenced by `match.fair_play_award`
- Optional many-to-one with `match` (temporary players scoped to a single match)

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

**Indexes:**
- `idx_match_log_event_created_at` on `created_at DESC` - Supports efficient cleanup queries

**Relationships:**
- Many-to-one with `match`
- Many-to-one with `player`

**Data Lifecycle:**
- Events older than 3 months are automatically deleted by scheduled job
- Cleanup runs daily at 2 AM UTC via batched `cleanup_old_match_events()` function (10k rows per batch, up to 50 batches per run with a brief pause)
- Rationale: Detailed events are most valuable for live match tracking and recent analysis

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

### player_loan

Tracks player loan appearances for external teams.

**Columns:**
- `id` (uuid, PK) - Unique identifier
- `player_id` (uuid, NOT NULL) - References `player(id)` with CASCADE delete
- `team_id` (uuid, NOT NULL) - References `team(id)` with CASCADE delete
- `receiving_team_name` (varchar(200), NOT NULL) - External team name
- `loan_date` (date, NOT NULL) - Loan match date (YYYY-MM-DD)
- `created_at` (timestamptz, NOT NULL) - Creation timestamp
- `updated_at` (timestamptz, NOT NULL) - Last update timestamp
- `created_by` (uuid, nullable) - References `auth.users(id)` for audit
- `last_updated_by` (uuid, nullable) - References `auth.users(id)` for audit

**Constraints:**
- Primary key on `id`
- Foreign key to `player(id)` with CASCADE delete
- Foreign key to `team(id)` with CASCADE delete
- Foreign keys to `auth.users(id)` with SET NULL for audit fields

**RLS Policies:**
- Team members can SELECT
- Team admins and coaches can INSERT/UPDATE/DELETE

**Indexes:**
- `idx_player_loan_player_id` on `player_id`
- `idx_player_loan_team_id` on `team_id`
- `idx_player_loan_date` on `loan_date` (DESC)

**Relationships:**
- Many-to-one with `player`
- Many-to-one with `team`

---

### team_preference

Team-wide preferences for match configuration and gameplay settings.

**Columns:**
- `id` (uuid, PK) - Unique identifier
- `team_id` (uuid, NOT NULL) - References `team(id)` with CASCADE delete
- `key` (text, NOT NULL) - Preference key (matchFormat, formation, etc.)
- `value` (text, NOT NULL) - Preference value stored as text
- `category` (text, nullable) - Optional grouping (match, time, substitution, features)
- `description` (text, nullable) - Optional user-facing description
- `created_at` (timestamptz, NOT NULL) - Creation timestamp
- `updated_at` (timestamptz, NOT NULL) - Last update timestamp
- `created_by` (uuid, nullable) - References `auth.users(id)` for audit
- `last_updated_by` (uuid, nullable) - References `auth.users(id)` for audit

**Constraints:**
- Primary key on `id`
- Foreign key to `team(id)` with CASCADE delete
- Foreign keys to `auth.users(id)` with SET NULL for audit fields
- Unique constraint on `(team_id, key)`

**RLS Policies:**
- Team members can SELECT
- Team admins and coaches can INSERT/UPDATE/DELETE

**Indexes:**
- `idx_team_preference_team_id` on `team_id`
- `idx_team_preference_key` on `key`
- `idx_team_preference_category` on `category` (where not null)

**Standard Preferences:**
- `matchFormat`: '5v5', '7v7', '9v9', '11v11'
- `formation`: '2-2', '1-2-1', '1-3', '1-1-2'
- `periodLength`: Minutes per period (5-45)
- `numPeriods`: Number of periods (1-4)
- `substitutionLogic`: 'equal_time', 'same_role'
- `trackGoalScorer`: 'true', 'false'
- `fairPlayAward`: 'true', 'false'
- `teamCaptain`: 'none', 'assign_each_match', or player UUID when a permanent captain is selected
- `loanMatchWeight`: '0.0', '0.5', '1.0'

**Relationships:**
- Many-to-one with `team`

---

## Functions

### public.get_connector(p_team_id uuid, p_provider connector_provider)

Security-definer function that returns connector metadata for a team/provider pair.

**Parameters:**
- `p_team_id` (uuid) - Team owning the connector
- `p_provider` (connector_provider) - External provider identifier

**Returns:**
- Table columns: `id`, `status`, `last_verified_at`, `last_sync_at`, `last_error`

**Notes:**
- Grants `authenticated` callers read-only access to connector status without exposing credentials.
- Returns at most one row; designed for UI queries to fetch current sync state.

### public.create_manual_sync_job(p_connector_id uuid)

Security-definer helper that enqueues a manual sync job for a connector after validating admin access.

**Parameters:**
- `p_connector_id` (uuid) - Connector that should be synced

**Returns:**
- `uuid` - Identifier of the job created in `connector_sync_job`

**Notes:**
- Ensures the caller is a team admin via `team_user.role = 'admin'`.
- Inserts the job with `job_type = 'manual'` and `created_by = auth.uid()`.
- Execution rights are granted to the `authenticated` role.

### public.link_upcoming_match_to_planned_match(p_upcoming_match_id uuid, p_planned_match_id uuid)

Security-definer function that links an upcoming match to a planned match after validating team ownership and manager access.

**Parameters:**
- `p_upcoming_match_id` (uuid) - Upcoming match to link
- `p_planned_match_id` (uuid) - Planned match to associate

**Returns:**
- `json` - `{ success: boolean, error?: text, message?: text }`

**Notes:**
- Validates authentication, match existence, and that the planned match belongs to the same team.
- Requires the caller to be a team manager (`is_team_manager`).
- Prevents overwriting an existing link to a different planned match.
- Execution rights are granted to the `authenticated` role.

### public.delete_team(p_team_id uuid)

Security-definer function that deletes a team when possible, or deactivates it if foreign key constraints prevent deletion.

**Parameters:**
- `p_team_id` (uuid) - Team to delete or deactivate

**Returns:**
- `json` - `{ success: boolean, deleted?: boolean, deactivated?: boolean, error?: text }`

**Notes:**
- Requires the caller to be a team admin.
- Attempts `DELETE FROM team`; on `foreign_key_violation`, falls back to setting `team.active = false`.
- Removes the requesting admin from `team_user` when the team is deactivated.
- Execution rights are granted to the `authenticated` role.

### public.get_vault_secret_by_name(secret_name text)

Security-definer function used by trusted services to retrieve decrypted secrets from Vault.

**Parameters:**
- `secret_name` (text) - Name of the Vault secret

**Returns:**
- `text` - Decrypted secret value

**Notes:**
- Only the `service_role` may execute this function; all other roles are revoked.
- Raises an exception when the secret is not present in `vault.decrypted_secrets`.

### public.cleanup_old_match_events(p_retention_months integer DEFAULT 3, p_batch_size integer DEFAULT 10000, p_max_batches integer DEFAULT 50, p_pause_ms integer DEFAULT 50)

Automatic cleanup function for removing old match_log_event records.

**Parameters:**
- `p_retention_months` (integer, optional) - Retention period in months (default: 3)
- `p_batch_size` (integer, optional) - Number of rows deleted per batch (default: 10,000)
- `p_max_batches` (integer, optional) - Maximum batches per invocation (default: 50; caps per-run lock time)
- `p_pause_ms` (integer, optional) - Pause between batches in milliseconds (default: 50; use 0 to disable)

**Returns:**
- Table columns: `deleted_count` (integer), `oldest_remaining_date` (timestamptz)

**Notes:**
- Deletes match_log_event records older than the retention period in batches to reduce lock duration on large tables
- Uses `SKIP LOCKED` when selecting batches; raises a notice if the batch limit is reached and more rows remain
- Runs automatically via pg_cron daily at 2 AM UTC (defaults: 3 months retention, 10k rows per batch, up to 50 batches with 50ms pause)
- Can be called manually for immediate cleanup
- Returns count of deleted events and the date of the oldest remaining event
- Execution restricted to `service_role`; execution revoked from `PUBLIC`

### public.check_match_event_stats()

Monitoring function that provides statistics about match_log_event table contents.

**Parameters:**
- None

**Returns:**
- Table columns:
  - `total_events` (bigint) - Total number of match events
  - `events_last_30_days` (bigint) - Events created in last 30 days
  - `events_last_90_days` (bigint) - Events created in last 90 days
  - `events_older_than_90_days` (bigint) - Events older than 90 days (cleanup candidates)
  - `oldest_event_date` (timestamptz) - Date of oldest event
  - `newest_event_date` (timestamptz) - Date of newest event
  - `total_matches_with_events` (bigint) - Count of unique matches with events

**Notes:**
- Used for monitoring and capacity planning
- Execution rights granted to `authenticated` role
- No data modifications - read-only statistics

---

## Scheduled Jobs

The database uses **pg_cron** extension for scheduled maintenance tasks:

### Match Event Cleanup
- **Schedule**: Daily at 2 AM UTC (`0 2 * * *`)
- **Function**: `cleanup_old_match_events()`
- **Purpose**: Removes match_log_event records older than 3 months using batched deletes (defaults: 10k rows/batch, 50 batches max, 50ms pause)
- **Rationale**: Detailed event logs are useful for live matches and recent analysis, but become less valuable over time

### Team Invitation Expiry
- **Schedule**: Hourly at minute 0 (`0 * * * *`)
- **Function**: `expire_old_team_invitations()`
- **Purpose**: Marks expired invitations as 'expired' and removes very old ones (30+ days)
- **Notes**: Execution restricted to `service_role`; manual execution by other roles is revoked

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

Matches follow a two-state lifecycle:
1. **`running`** - Match in progress
2. **`finished`** - Match finished and finalized, statistics calculated

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

**High-priority indexes:**
- `match(team_id, state)` - For fetching team matches by state
- `player_match_stats(match_id)` - For loading match statistics
- `player_match_stats(player_id)` - For player history
- `season_stats(player_id, season_year)` - Already covered by unique constraint
- `match_log_event(match_id, occurred_at_seconds)` - For event timeline
- `match_log_event(created_at)` - ✅ Implemented - For efficient cleanup of old events
- `team_user(user_id)` - For finding user's teams
- `club_user(user_id)` - For finding user's clubs

---

## Notes

1. **UUID Generation**: All primary keys use UUID v4 generation
2. **Timestamps**: All timestamps use `timestamptz` (timezone-aware)
3. **JSONB Fields**: `team.configuration`, `match.initial_config`, `match_log_event.data` store flexible JSON data
4. **Supabase Integration**: This schema is designed for Supabase and uses `auth.users` table from the auth schema
5. **RLS Policies**: Not shown in this document but critical for security - all tables should have appropriate Row Level Security policies
