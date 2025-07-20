-- Initial database schema for DIF F16-6 Coach application
-- This migration creates the foundational tables for managing soccer teams, players, and matches

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

---------------------------------------------------------------------------
-- SECTION 1: CUSTOM TYPES (ENUMS)
---------------------------------------------------------------------------

CREATE TYPE public.user_role AS ENUM (
  'parent',
  'player',
  'coach',
  'admin'
);

CREATE TYPE public.match_type AS ENUM (
  'friendly',
  'internal',
  'league',
  'tournament',
  'cup'
);

CREATE TYPE public.match_format AS ENUM (
  '3v3',
  '5v5',
  '7v7',
  '9v9',
  '11v11'
);

CREATE TYPE public.match_state AS ENUM (
  'running',
  'finished',
  'pending',
  'confirmed'
);

CREATE TYPE public.match_outcome AS ENUM (
    'win',
    'loss',
    'draw'
);

CREATE TYPE public.match_event_type AS ENUM (
    'goal_scored',
    'goal_conceded',
    'substitution_in',
    'substitution_out',
    'match_started',
    'match_ended',
    'period_started',
    'period_ended',
    'goalie_enters',
    'goalie_exits',
    'position_switch',
    'sub_order_changed',
    'player_inactivated',
    'player_reactivated'
);

CREATE TYPE public.player_role AS ENUM (
  'goalie',
  'defender',
  'midfielder',
  'attacker',
  'substitute'
);

---------------------------------------------------------------------------
-- SECTION 2: UTILITY FUNCTIONS
---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

---------------------------------------------------------------------------
-- SECTION 3: CORE TABLES
---------------------------------------------------------------------------

-- Clubs table - represents soccer clubs/organizations
CREATE TABLE public.club (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  updated_at timestamptz NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  name text NOT NULL,
  short_name text NULL,
  long_name text NULL,
  CONSTRAINT club_pkey PRIMARY KEY (id)
);

CREATE TRIGGER on_club_updated
  BEFORE UPDATE ON public.club
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Teams table - represents individual teams within clubs
CREATE TABLE public.team (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  updated_at timestamptz NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  club_id uuid REFERENCES public.club(id),
  name text NOT NULL,
  configuration jsonb NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  CONSTRAINT team_pkey PRIMARY KEY (id)
);

CREATE TRIGGER on_team_updated
  BEFORE UPDATE ON public.team
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Players table - represents individual players
CREATE TABLE public.player (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  updated_at timestamptz NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  name text NOT NULL,
  team_id uuid NOT NULL REFERENCES public.team(id),
  jersey_number text NULL,
  on_roster boolean NOT NULL DEFAULT true,
  CONSTRAINT player_pkey PRIMARY KEY (id)
);

CREATE TRIGGER on_player_updated
  BEFORE UPDATE ON public.player
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Matches table - represents individual games/matches
CREATE TABLE public.match (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  updated_at timestamptz NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  team_id uuid NOT NULL REFERENCES public.team(id),
  format match_format NOT NULL DEFAULT '5v5',
  formation text NOT NULL DEFAULT 'INDIVIDUAL_6',
  periods smallint NOT NULL DEFAULT 3,
  period_duration_minutes smallint NOT NULL DEFAULT 15,
  match_duration_seconds integer NOT NULL DEFAULT 2700, -- 45 minutes total
  finished_at timestamptz NULL,
  type match_type NOT NULL DEFAULT 'friendly',
  opponent text NULL,
  captain uuid REFERENCES public.player(id),
  fair_play_award uuid REFERENCES public.player(id),
  goals_scored smallint NULL DEFAULT 0,
  goals_conceded smallint NULL DEFAULT 0,
  outcome match_outcome NULL,
  state match_state NOT NULL DEFAULT 'pending',
  CONSTRAINT match_pkey PRIMARY KEY (id),
  CONSTRAINT valid_periods CHECK (periods BETWEEN 1 AND 3),
  CONSTRAINT valid_duration CHECK (period_duration_minutes BETWEEN 5 AND 60)
);

CREATE TRIGGER on_match_updated
  BEFORE UPDATE ON public.match
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Match log events table - audit trail for all match activities
CREATE TABLE public.match_log_event (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  match_id uuid NOT NULL REFERENCES public.match(id) ON DELETE CASCADE,
  player_id uuid NULL REFERENCES public.player(id) ON DELETE SET NULL,
  event_type match_event_type NOT NULL,
  data jsonb NULL,
  correlation_id uuid NULL,
  occurred_at_seconds integer NOT NULL,
  period smallint NOT NULL
);

-- Settings table - application and team-specific settings
CREATE TABLE public.settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  updated_at timestamptz NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  team_id uuid REFERENCES public.team(id) ON DELETE CASCADE,
  key text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  is_global boolean NOT NULL DEFAULT false,
  CONSTRAINT app_settings_pkey PRIMARY KEY (id)
);

CREATE TRIGGER on_settings_updated
  BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

---------------------------------------------------------------------------
-- SECTION 4: USER MANAGEMENT TABLES
---------------------------------------------------------------------------

-- User profiles table - extends Supabase auth.users
CREATE TABLE public.user_profile (
  id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  updated_at timestamptz NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  name text NULL,
  CONSTRAINT user_profile_pkey PRIMARY KEY (id)
);

CREATE TRIGGER on_user_profile_updated
  BEFORE UPDATE ON public.user_profile
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Team user relationships - manages access control
CREATE TABLE public.team_user (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  updated_at timestamptz NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  team_id uuid NOT NULL REFERENCES public.team(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.user_profile(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'parent',
  CONSTRAINT team_user_pkey PRIMARY KEY (id),
  CONSTRAINT unique_team_user UNIQUE (team_id, user_id)
);

CREATE TRIGGER on_team_user_updated
  BEFORE UPDATE ON public.team_user
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

---------------------------------------------------------------------------
-- SECTION 5: SEASON STATISTICS AGGREGATION
---------------------------------------------------------------------------

-- Season-level statistics aggregation
-- Pre-calculated statistics for fast dashboard queries
CREATE TABLE public.season_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  player_id uuid NOT NULL REFERENCES public.player(id) ON DELETE CASCADE,
  season_year integer NOT NULL,
  matches_played integer DEFAULT 0,
  goals_scored integer DEFAULT 0,
  captain_count integer DEFAULT 0,
  fair_play_awards integer DEFAULT 0,
  total_field_time_seconds integer DEFAULT 0,
  total_goalie_time_seconds integer DEFAULT 0,
  total_defender_time_seconds integer DEFAULT 0,
  total_midfielder_time_seconds integer DEFAULT 0,
  total_attacker_time_seconds integer DEFAULT 0,
  total_substitute_time_seconds integer DEFAULT 0,
  starts_as_field_player integer DEFAULT 0,
  starts_as_goalie integer DEFAULT 0,
  starts_as_substitute integer DEFAULT 0,
  UNIQUE(player_id, season_year),
  CONSTRAINT valid_season_year CHECK (season_year BETWEEN 2020 AND 2050),
  CONSTRAINT non_negative_stats CHECK (
    matches_played >= 0 AND
    goals_scored >= 0 AND
    captain_count >= 0 AND
    fair_play_awards >= 0 AND
    total_field_time_seconds >= 0 AND
    total_goalie_time_seconds >= 0 AND
    total_defender_time_seconds >= 0 AND
    total_midfielder_time_seconds >= 0 AND
    total_attacker_time_seconds >= 0 AND
    total_substitute_time_seconds >= 0 AND
    starts_as_field_player >= 0 AND
    starts_as_substitute >= 0 AND
    starts_as_goalie >= 0
  )
);

CREATE TRIGGER on_season_stats_updated
  BEFORE UPDATE ON public.season_stats
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

---------------------------------------------------------------------------
-- SECTION 6: PLAYER MATCH STATISTICS
---------------------------------------------------------------------------

-- Player match statistics table - individual player stats per match
-- Provides comprehensive per-match statistics for analytics and reporting
CREATE TABLE public.player_match_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  player_id uuid NOT NULL REFERENCES public.player(id) ON DELETE CASCADE,
  match_id uuid NOT NULL REFERENCES public.match(id) ON DELETE CASCADE,
  
  -- Performance metrics
  goals_scored smallint DEFAULT 0,
  substitutions_in smallint DEFAULT 0,
  substitutions_out smallint DEFAULT 0,
  
  -- Time tracking for all possible roles (includes midfielder for 1-2-1 formation)
  goalie_time_seconds integer DEFAULT 0,
  defender_time_seconds integer DEFAULT 0,
  midfielder_time_seconds integer DEFAULT 0,
  attacker_time_seconds integer DEFAULT 0,
  substitute_time_seconds integer DEFAULT 0,
  
  -- Calculated total field time (excluding substitute time)
  total_field_time_seconds integer GENERATED ALWAYS AS (
    goalie_time_seconds + defender_time_seconds + midfielder_time_seconds + attacker_time_seconds
  ) STORED,
  
  -- Match participation details
  started_as player_role NOT NULL,
  was_captain boolean DEFAULT false,
  got_fair_play_award boolean DEFAULT false,
  team_mode text NOT NULL,
  
  -- Constraints
  UNIQUE(player_id, match_id),
  CONSTRAINT valid_time_values CHECK (
    goalie_time_seconds >= 0 AND
    defender_time_seconds >= 0 AND
    midfielder_time_seconds >= 0 AND
    attacker_time_seconds >= 0 AND
    substitute_time_seconds >= 0
  ),
  CONSTRAINT valid_goals CHECK (goals_scored >= 0),
  CONSTRAINT valid_substitutions CHECK (
    substitutions_in >= 0 AND substitutions_out >= 0
  )
);

CREATE TRIGGER on_player_match_stats_updated
  BEFORE UPDATE ON public.player_match_stats
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

---------------------------------------------------------------------------
-- SECTION 7: BASIC RLS SETUP (PLACEHOLDER)
---------------------------------------------------------------------------

-- Enable RLS on all tables (policies to be configured manually in Supabase UI)
ALTER TABLE public.club ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_log_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_match_stats ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies should be configured manually in Supabase UI
-- based on your specific security requirements