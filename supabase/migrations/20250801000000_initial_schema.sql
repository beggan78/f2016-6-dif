-- CONSOLIDATED SCHEMA FOR Sport Wizard APPLICATION
-- This migration creates the complete database schema including:
-- 1. Core team management tables
-- 2. Club membership system  
-- 3. Team access request system
-- 4. RLS policies with team admin support
-- 5. Atomic creation functions

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

CREATE TYPE public.club_user_role AS ENUM (
  'admin',
  'coach', 
  'member'
);

CREATE TYPE public.club_user_status AS ENUM (
  'active',
  'inactive',
  'pending'
);

CREATE TYPE public.request_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'cancelled'
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
-- SECTION 2: AUDIT TRAIL FUNCTIONS
---------------------------------------------------------------------------

-- Updated trigger function to handle both updated_at and last_updated_by
CREATE OR REPLACE FUNCTION public.handle_updated_at_and_user()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.last_updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Simpler trigger function for user_profile (no last_updated_by column)
CREATE OR REPLACE FUNCTION public.handle_updated_at_only()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Automatically create user profiles when users sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profile (id, name, created_at, updated_at)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'name',
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

---------------------------------------------------------------------------
-- SECTION 3: CORE TABLES
---------------------------------------------------------------------------

-- Club table
CREATE TABLE public.club (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL CHECK (char_length(name) >= 2 AND char_length(name) <= 100),
  short_name text CHECK (char_length(short_name) >= 1 AND char_length(short_name) <= 20),
  long_name text CHECK (char_length(long_name) >= 2 AND char_length(long_name) <= 200),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- User profile table
CREATE TABLE public.user_profile (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name text CHECK (char_length(name) >= 2 AND char_length(name) <= 100),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Club user membership table
CREATE TABLE public.club_user (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  club_id uuid REFERENCES public.club(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.user_profile(id) ON DELETE CASCADE NOT NULL,
  role public.club_user_role DEFAULT 'member'::public.club_user_role NOT NULL,
  status public.club_user_status DEFAULT 'active'::public.club_user_status NOT NULL,
  joined_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  review_notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(club_id, user_id)
);

-- Team table  
CREATE TABLE public.team (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  club_id uuid REFERENCES public.club(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL CHECK (char_length(name) >= 2 AND char_length(name) <= 100),
  active boolean DEFAULT true NOT NULL,
  configuration jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Team user relationship table
CREATE TABLE public.team_user (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id uuid REFERENCES public.team(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.user_profile(id) ON DELETE CASCADE NOT NULL,
  role public.user_role DEFAULT 'parent'::public.user_role NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(team_id, user_id)
);

-- Team access request table
CREATE TABLE public.team_access_request (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id uuid REFERENCES public.team(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.user_profile(id) ON DELETE CASCADE NOT NULL,
  requested_role public.user_role DEFAULT 'parent'::public.user_role NOT NULL,
  message text CHECK (char_length(message) <= 1000),
  status public.request_status DEFAULT 'pending'::public.request_status NOT NULL,
  reviewed_by uuid REFERENCES public.user_profile(id) ON DELETE SET NULL,
  reviewed_at timestamp with time zone,
  review_notes text CHECK (char_length(review_notes) <= 500),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Player table
CREATE TABLE public.player (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id uuid REFERENCES public.team(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL CHECK (char_length(name) >= 2 AND char_length(name) <= 50),
  jersey_number integer CHECK (jersey_number >= 1 AND jersey_number <= 99),
  on_roster boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(team_id, jersey_number)
);

-- Match table - stores individual games/matches
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
  -- Audit columns
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  last_updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  CONSTRAINT match_pkey PRIMARY KEY (id),
  CONSTRAINT valid_periods CHECK (periods BETWEEN 1 AND 3),
  CONSTRAINT valid_duration CHECK (period_duration_minutes BETWEEN 5 AND 60)
);

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
  -- Audit columns
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  last_updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  CONSTRAINT app_settings_pkey PRIMARY KEY (id)
);

-- Season-level statistics aggregation
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
  -- Audit columns
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  last_updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
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

-- Player match statistics table - individual player stats per match
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

  -- Audit columns
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  last_updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),

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

---------------------------------------------------------------------------
-- SECTION 4: TRIGGERS FOR AUDIT TRAILS
---------------------------------------------------------------------------

CREATE TRIGGER on_club_updated
  BEFORE UPDATE ON public.club
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at_and_user();

CREATE TRIGGER on_club_user_updated
  BEFORE UPDATE ON public.club_user  
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at_and_user();

CREATE TRIGGER on_team_updated
  BEFORE UPDATE ON public.team
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at_and_user();

CREATE TRIGGER on_team_user_updated
  BEFORE UPDATE ON public.team_user
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at_and_user();

CREATE TRIGGER on_team_access_request_updated
  BEFORE UPDATE ON public.team_access_request
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at_and_user();

CREATE TRIGGER on_player_updated
  BEFORE UPDATE ON public.player
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at_and_user();

CREATE TRIGGER on_match_updated
  BEFORE UPDATE ON public.match
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at_and_user();

CREATE TRIGGER on_settings_updated
  BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at_and_user();

CREATE TRIGGER on_season_stats_updated
  BEFORE UPDATE ON public.season_stats
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at_and_user();

CREATE TRIGGER on_player_match_stats_updated
  BEFORE UPDATE ON public.player_match_stats
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at_and_user();

CREATE TRIGGER on_user_profile_updated
  BEFORE UPDATE ON public.user_profile
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at_only();

-- Create trigger on auth.users for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

---------------------------------------------------------------------------
-- SECTION 5: INDEXES FOR PERFORMANCE
---------------------------------------------------------------------------

-- Club indexes
CREATE INDEX idx_club_name ON public.club(name);
CREATE INDEX idx_club_created_by ON public.club(created_by);

-- Club user indexes  
CREATE INDEX idx_club_user_club_id ON public.club_user(club_id);
CREATE INDEX idx_club_user_user_id ON public.club_user(user_id);
CREATE INDEX idx_club_user_status ON public.club_user(status);

-- Team indexes
CREATE INDEX idx_team_club_id ON public.team(club_id);
CREATE INDEX idx_team_active ON public.team(active);
CREATE INDEX idx_team_created_by ON public.team(created_by);

-- Team user indexes
CREATE INDEX idx_team_user_team_id ON public.team_user(team_id);
CREATE INDEX idx_team_user_user_id ON public.team_user(user_id);
CREATE INDEX idx_team_user_role ON public.team_user(role);

-- Team access request indexes
CREATE INDEX idx_team_access_request_team_id ON public.team_access_request(team_id);
CREATE INDEX idx_team_access_request_user_id ON public.team_access_request(user_id);
CREATE INDEX idx_team_access_request_status ON public.team_access_request(status);
CREATE INDEX idx_team_access_request_created_at ON public.team_access_request(created_at);

-- Partial unique index to allow only one pending request per user/team combination
-- This allows users to reapply after rejection/approval while preventing multiple pending requests
-- Note: Application code provides user-friendly error messages when constraint is violated
CREATE UNIQUE INDEX unique_pending_request_idx 
ON public.team_access_request (team_id, user_id) 
WHERE status = 'pending';

-- Player indexes
CREATE INDEX idx_player_team_id ON public.player(team_id);
CREATE INDEX idx_player_on_roster ON public.player(on_roster);

-- Match indexes
CREATE INDEX idx_match_team_id ON public.match(team_id);
CREATE INDEX idx_match_state ON public.match(state);
CREATE INDEX idx_match_type ON public.match(type);
CREATE INDEX idx_match_finished_at ON public.match(finished_at);
CREATE INDEX idx_match_created_by ON public.match(created_by);

-- Match log event indexes
CREATE INDEX idx_match_log_event_match_id ON public.match_log_event(match_id);
CREATE INDEX idx_match_log_event_player_id ON public.match_log_event(player_id);
CREATE INDEX idx_match_log_event_type ON public.match_log_event(event_type);
CREATE INDEX idx_match_log_event_occurred_at ON public.match_log_event(occurred_at_seconds);

-- Settings indexes
CREATE INDEX idx_settings_team_id ON public.settings(team_id);
CREATE INDEX idx_settings_key ON public.settings(key);
CREATE INDEX idx_settings_global ON public.settings(is_global);

-- Season stats indexes
CREATE INDEX idx_season_stats_player_id ON public.season_stats(player_id);
CREATE INDEX idx_season_stats_year ON public.season_stats(season_year);

-- Player match stats indexes
CREATE INDEX idx_player_match_stats_player_id ON public.player_match_stats(player_id);
CREATE INDEX idx_player_match_stats_match_id ON public.player_match_stats(match_id);
CREATE INDEX idx_player_match_stats_goals ON public.player_match_stats(goals_scored);

---------------------------------------------------------------------------
-- SECTION 6: RLS HELPER FUNCTIONS
---------------------------------------------------------------------------

-- Helper functions to prevent RLS recursion issues
-- These use SECURITY DEFINER to bypass RLS when checking permissions

-- Check if user is admin of a club
CREATE OR REPLACE FUNCTION public.is_club_admin(club_id_param uuid, user_id_param uuid DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.club_user 
    WHERE club_id = club_id_param 
      AND user_id = user_id_param 
      AND role = 'admin'::public.club_user_role 
      AND status = 'active'::public.club_user_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is member of a team
CREATE OR REPLACE FUNCTION public.is_team_member(team_id_param uuid, user_id_param uuid DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.team_user 
    WHERE team_id = team_id_param 
      AND user_id = user_id_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is admin of a team
CREATE OR REPLACE FUNCTION public.is_team_admin(team_id_param uuid, user_id_param uuid DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.team_user 
    WHERE team_id = team_id_param 
      AND user_id = user_id_param 
      AND role = 'admin'::public.user_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is manager (coach or admin) of a team
CREATE OR REPLACE FUNCTION public.is_team_manager(team_id_param uuid, user_id_param uuid DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.team_user 
    WHERE team_id = team_id_param 
      AND user_id = user_id_param 
      AND role IN ('coach'::public.user_role, 'admin'::public.user_role)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get all team IDs for a user
CREATE OR REPLACE FUNCTION public.get_user_team_ids(user_id_param uuid DEFAULT auth.uid())
RETURNS uuid[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT team_id FROM public.team_user 
    WHERE user_id = user_id_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Add comments explaining the functions
COMMENT ON FUNCTION public.is_club_admin IS 'Helper function to check club admin status without causing RLS recursion. Uses SECURITY DEFINER to bypass RLS when checking admin status.';
COMMENT ON FUNCTION public.is_team_member IS 'Helper function to check team membership without causing RLS recursion. Uses SECURITY DEFINER to bypass RLS when checking membership.';
COMMENT ON FUNCTION public.is_team_admin IS 'Helper function to check team admin status without causing RLS recursion. Uses SECURITY DEFINER to bypass RLS when checking admin status.';
COMMENT ON FUNCTION public.is_team_manager IS 'Helper function to check if user is team manager (coach or admin) without causing RLS recursion. Uses SECURITY DEFINER to bypass RLS.';
COMMENT ON FUNCTION public.get_user_team_ids IS 'Helper function to get all team IDs for a user without causing RLS recursion. Uses SECURITY DEFINER to bypass RLS.';
COMMENT ON FUNCTION public.handle_new_user IS 'Automatically creates user profiles when users sign up in auth.users. Uses SECURITY DEFINER to bypass RLS during profile creation.';

---------------------------------------------------------------------------
-- SECTION 7: ROW LEVEL SECURITY POLICIES
---------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE public.club ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_access_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_log_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_match_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;

-- Club policies
CREATE POLICY "Allow authenticated users to view clubs" ON public.club
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to create clubs" ON public.club
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Club admins can update clubs" ON public.club
  FOR UPDATE TO authenticated
  USING (
    id IN (
      SELECT club_id FROM public.club_user 
      WHERE user_id = auth.uid() AND role = 'admin'::public.club_user_role AND status = 'active'::public.club_user_status
    )
  );

-- Club user policies
CREATE POLICY "Users can view their club memberships" ON public.club_user
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Club admins can view all memberships" ON public.club_user
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR 
    public.is_club_admin(club_id, auth.uid())
  );

CREATE POLICY "Users can join clubs" ON public.club_user
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Club admins can manage memberships" ON public.club_user
  FOR UPDATE TO authenticated
  USING (
    public.is_club_admin(club_id, auth.uid())
  );

-- Team policies
CREATE POLICY "Club members can view teams" ON public.team
  FOR SELECT TO authenticated
  USING (
    club_id IN (
      SELECT club_id FROM public.club_user 
      WHERE user_id = auth.uid() AND status = 'active'::public.club_user_status
    )
  );

CREATE POLICY "Club members can create teams" ON public.team
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    club_id IN (
      SELECT club_id FROM public.club_user 
      WHERE user_id = auth.uid() AND status = 'active'::public.club_user_status
    )
  );

CREATE POLICY "Team admins can update teams" ON public.team
  FOR UPDATE TO authenticated
  USING (
    public.is_team_admin(id, auth.uid())
  );

-- Team user policies
CREATE POLICY "Team members can view team memberships" ON public.team_user
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    public.is_team_member(team_id, auth.uid())
  );

CREATE POLICY "Team user management access" ON public.team_user
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Users can add themselves as coaches (existing functionality)
    user_id = auth.uid()
    OR
    -- Team managers can add approved users to their teams
    public.is_team_manager(team_id, auth.uid())
  );

CREATE POLICY "Team admins can manage memberships" ON public.team_user
  FOR UPDATE TO authenticated
  USING (
    public.is_team_admin(team_id, auth.uid())
  );

CREATE POLICY "Team admins can remove members" ON public.team_user
  FOR DELETE TO authenticated
  USING (
    public.is_team_admin(team_id, auth.uid())
  );

-- Team access request policies
CREATE POLICY "Users can view their team access requests" ON public.team_access_request
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Team managers can view team requests" ON public.team_access_request
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    public.is_team_manager(team_id, auth.uid())
  );

CREATE POLICY "Users can request team access" ON public.team_access_request
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Manage team access requests" ON public.team_access_request
  FOR UPDATE TO authenticated
  USING (
    -- Team managers can manage requests (approve/reject) but not their own requests
    (
      public.is_team_manager(team_id, auth.uid()) 
      AND user_id <> auth.uid()  -- Prevent self-approval
    )
    OR
    -- Users can cancel their own pending requests only
    (
      user_id = auth.uid() 
      AND status = 'pending'::public.request_status
    )
  )
  WITH CHECK (
    -- Team managers can manage requests (approve/reject) but not their own requests
    (
      public.is_team_manager(team_id, auth.uid()) 
      AND user_id <> auth.uid()  -- Prevent self-approval
    )
    OR
    -- Users can cancel their own pending requests only (after update, status can be cancelled)
    (
      user_id = auth.uid() 
      AND status IN ('pending'::public.request_status, 'cancelled'::public.request_status)
    )
  );

-- Player policies  
CREATE POLICY "Team members can view players" ON public.player
  FOR SELECT TO authenticated
  USING (
    public.is_team_member(team_id, auth.uid())
  );

CREATE POLICY "Team coaches can manage players" ON public.player
  FOR ALL TO authenticated
  USING (
    public.is_team_manager(team_id, auth.uid())
  );

-- User profile policies
CREATE POLICY "Team-aware profile access" ON public.user_profile
  FOR SELECT TO authenticated
  USING (
    -- Users can always view their own profile (fast path)
    auth.uid() = id
    OR
    -- Team members can view profiles of other team members (optimized)
    EXISTS (
      SELECT 1
      FROM public.team_user tu1, public.team_user tu2
      WHERE tu1.user_id = auth.uid()
      AND tu2.user_id = user_profile.id
      AND tu1.team_id = tu2.team_id
      LIMIT 1
    )
    OR
    -- Team managers can view profiles of users requesting access to their teams
    EXISTS (
      SELECT 1
      FROM public.team_access_request tar, public.team_user tu
      WHERE tar.user_id = user_profile.id
      AND tu.user_id = auth.uid()
      AND tu.team_id = tar.team_id
      AND tu.role IN ('admin', 'coach')
      LIMIT 1
    )
  );

-- Add comment explaining the optimization
COMMENT ON POLICY "Team-aware profile access" ON public.user_profile IS
'Optimized RLS policy that prioritizes own profile access and uses EXISTS clauses with LIMIT 1 for better performance during page refresh scenarios';

-- Allow profile creation during signup with more permissive INSERT policy
CREATE POLICY "Users can insert own profile during signup" ON public.user_profile
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = id OR
    auth.uid() IS NULL AND id IS NOT NULL OR
    (current_setting('request.jwt.claims', true)::json ->> 'role') = 'service_role'
  );

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.user_profile
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- Users can delete their own profile (optional - for account deletion)
CREATE POLICY "Users can delete own profile" ON public.user_profile
  FOR DELETE TO authenticated
  USING (auth.uid() = id);

-- Match policies
CREATE POLICY "Team members can view matches" ON public.match
  FOR SELECT TO authenticated
  USING (
    public.is_team_member(team_id, auth.uid())
  );

CREATE POLICY "Team coaches can manage matches" ON public.match
  FOR ALL TO authenticated
  USING (
    public.is_team_manager(team_id, auth.uid())
  );

-- Match log event policies
CREATE POLICY "Team members can view match events" ON public.match_log_event
  FOR SELECT TO authenticated
  USING (
    match_id IN (
      SELECT m.id FROM public.match m
      WHERE public.is_team_member(m.team_id, auth.uid())
    )
  );

CREATE POLICY "Team coaches can manage match events" ON public.match_log_event
  FOR ALL TO authenticated
  USING (
    match_id IN (
      SELECT m.id FROM public.match m
      WHERE public.is_team_manager(m.team_id, auth.uid())
    )
  );

-- Settings policies
CREATE POLICY "Team members can view settings" ON public.settings
  FOR SELECT TO authenticated
  USING (
    is_global = true OR
    public.is_team_member(team_id, auth.uid())
  );

CREATE POLICY "Team coaches can manage settings" ON public.settings
  FOR ALL TO authenticated
  USING (
    public.is_team_manager(team_id, auth.uid())
  );

-- Season stats policies
CREATE POLICY "Team members can view season stats" ON public.season_stats
  FOR SELECT TO authenticated
  USING (
    player_id IN (
      SELECT p.id FROM public.player p
      WHERE public.is_team_member(p.team_id, auth.uid())
    )
  );

CREATE POLICY "Team coaches can manage season stats" ON public.season_stats
  FOR ALL TO authenticated
  USING (
    player_id IN (
      SELECT p.id FROM public.player p
      WHERE public.is_team_manager(p.team_id, auth.uid())
    )
  );

-- Player match stats policies
CREATE POLICY "Team members can view player match stats" ON public.player_match_stats
  FOR SELECT TO authenticated
  USING (
    player_id IN (
      SELECT p.id FROM public.player p
      WHERE public.is_team_member(p.team_id, auth.uid())
    )
  );

CREATE POLICY "Team coaches can manage player match stats" ON public.player_match_stats
  FOR ALL TO authenticated
  USING (
    player_id IN (
      SELECT p.id FROM public.player p
      WHERE public.is_team_manager(p.team_id, auth.uid())
    )
  );

---------------------------------------------------------------------------
-- SECTION 7: ATOMIC CREATION FUNCTIONS
---------------------------------------------------------------------------

-- Function to atomically create club with admin membership
CREATE OR REPLACE FUNCTION public.create_club_with_admin(
  club_name text,
  club_short_name text DEFAULT NULL,
  club_long_name text DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_club public.club;
  result json;
BEGIN
  -- Insert club
  INSERT INTO public.club (name, short_name, long_name, created_by)
  VALUES (club_name, club_short_name, club_long_name, auth.uid())
  RETURNING * INTO new_club;
  
  -- Add creator as club admin
  INSERT INTO public.club_user (club_id, user_id, role, status)
  VALUES (new_club.id, auth.uid(), 'admin'::public.club_user_role, 'active'::public.club_user_status);
  
  -- Return success result
  SELECT json_build_object(
    'success', true,
    'club', row_to_json(new_club),
    'message', 'Club created successfully with admin privileges'
  ) INTO result;
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- Return error result
    SELECT json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to create club with admin privileges'
    ) INTO result;
    RETURN result;
END;
$$;

-- Function to atomically create team with admin membership
CREATE OR REPLACE FUNCTION public.create_team_with_admin(
  p_club_id uuid,
  team_name text,
  team_config jsonb DEFAULT '{}'::jsonb
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_team public.team;
  result json;
BEGIN
  -- Insert team
  INSERT INTO public.team (club_id, name, configuration, created_by)
  VALUES (p_club_id, team_name, team_config, auth.uid())
  RETURNING * INTO new_team;
  
  -- Add creator as team admin
  INSERT INTO public.team_user (team_id, user_id, role)
  VALUES (new_team.id, auth.uid(), 'admin'::public.user_role);
  
  -- Return success result
  SELECT json_build_object(
    'success', true,
    'team', row_to_json(new_team),
    'message', 'Team created successfully with admin privileges'
  ) INTO result;
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- Return error result
    SELECT json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to create team with admin privileges'
    ) INTO result;
    RETURN result;
END;
$$;

---------------------------------------------------------------------------
-- SECTION 8: COMMENTS FOR DOCUMENTATION
---------------------------------------------------------------------------

COMMENT ON TABLE public.club IS 'Stores club/organization information';
COMMENT ON TABLE public.club_user IS 'Club membership relationships with roles and status';
COMMENT ON TABLE public.team IS 'Teams belonging to clubs';
COMMENT ON TABLE public.team_user IS 'Team membership relationships with roles';
COMMENT ON TABLE public.team_access_request IS 'Requests for team access with approval workflow';
COMMENT ON TABLE public.player IS 'Players assigned to teams';
COMMENT ON TABLE public.user_profile IS 'Extended user profile information';

COMMENT ON FUNCTION public.create_club_with_admin IS 'Atomically creates a club and assigns creator as admin';

-- Add function to get user email for team managers viewing access requests
-- This function can only be called by team managers and returns email for users who have requested access to their teams

CREATE OR REPLACE FUNCTION public.get_user_email_for_team_request(
  request_user_id uuid,
  team_id uuid
)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.email
  FROM auth.users au
  WHERE au.id = request_user_id
    AND (
      -- User can see their own email
      auth.uid() = request_user_id
      OR
      -- Team managers can see email of users who have requested access to their team
      EXISTS (
        SELECT 1 
        FROM team_access_request tar
        WHERE tar.user_id = request_user_id 
          AND tar.team_id = get_user_email_for_team_request.team_id
          AND public.is_team_manager(get_user_email_for_team_request.team_id, auth.uid())
      )
    );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_email_for_team_request(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.get_user_email_for_team_request IS 'Get user email for team access requests - only accessible by team managers or the user themselves';
COMMENT ON FUNCTION public.create_team_with_admin IS 'Atomically creates a team and assigns creator as admin';