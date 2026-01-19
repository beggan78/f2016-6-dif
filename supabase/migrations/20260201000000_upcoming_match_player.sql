-- ==========================================================================
-- UPCOMING MATCH PLAYER STATUS TRACKING
-- ==========================================================================
-- Stores per-player availability, invite status, and responses for upcoming
-- fixtures scraped from external providers.

---------------------------------------------------------------------------
-- STEP 1: Create enums for upcoming match player statuses
---------------------------------------------------------------------------

CREATE TYPE public.upcoming_match_player_availability AS ENUM (
  'unknown',
  'available',
  'unavailable'
);

CREATE TYPE public.upcoming_match_player_invite_status AS ENUM (
  'not_invited',
  'invited'
);

CREATE TYPE public.upcoming_match_player_response AS ENUM (
  'no_response',
  'accepted',
  'declined'
);

---------------------------------------------------------------------------
-- STEP 2: Create upcoming_match_player table
---------------------------------------------------------------------------

CREATE TABLE public.upcoming_match_player (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  upcoming_match_id uuid NOT NULL REFERENCES public.upcoming_match(id) ON DELETE CASCADE,
  connected_player_id uuid NOT NULL REFERENCES public.connected_player(id) ON DELETE CASCADE,

  availability public.upcoming_match_player_availability NOT NULL DEFAULT 'unknown',
  invite_status public.upcoming_match_player_invite_status NOT NULL DEFAULT 'not_invited',
  response public.upcoming_match_player_response NOT NULL DEFAULT 'no_response',

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT upcoming_match_player_unique
    UNIQUE (upcoming_match_id, connected_player_id)
);

CREATE INDEX idx_upcoming_match_player_match
  ON public.upcoming_match_player(upcoming_match_id);

CREATE INDEX idx_upcoming_match_player_connected_player
  ON public.upcoming_match_player(connected_player_id);

CREATE TRIGGER update_upcoming_match_player_timestamp
  BEFORE UPDATE ON public.upcoming_match_player
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at_only();

COMMENT ON TABLE public.upcoming_match_player IS
'Availability, invite status, and responses for connected players on upcoming matches.';
COMMENT ON COLUMN public.upcoming_match_player.availability IS
'Player availability before selection (unknown, available, unavailable).';
COMMENT ON COLUMN public.upcoming_match_player.invite_status IS
'Whether the player has been invited/selected for the match.';
COMMENT ON COLUMN public.upcoming_match_player.response IS
'Response status for invited players (accepted, declined, no_response).';

---------------------------------------------------------------------------
-- STEP 3: Enable Row Level Security
---------------------------------------------------------------------------

ALTER TABLE public.upcoming_match_player ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------------------------
-- STEP 4: Policies for upcoming_match_player
---------------------------------------------------------------------------

CREATE POLICY upcoming_match_player_select_policy ON public.upcoming_match_player
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.upcoming_match um
      JOIN public.connector c ON c.id = um.connector_id
      JOIN public.team_user tu ON tu.team_id = c.team_id
      WHERE um.id = upcoming_match_player.upcoming_match_id
        AND tu.user_id = auth.uid()
    )
  );

CREATE POLICY upcoming_match_player_insert_policy ON public.upcoming_match_player
  FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY upcoming_match_player_update_policy ON public.upcoming_match_player
  FOR UPDATE
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY upcoming_match_player_delete_policy ON public.upcoming_match_player
  FOR DELETE
  USING (auth.jwt()->>'role' = 'service_role');
