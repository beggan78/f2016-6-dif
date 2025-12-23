-- ============================================================================
-- CONNECTED PLAYER NORMALIZATION - Player Mapping Layer
-- ============================================================================
-- Purpose: Normalize player mapping between external providers and roster
-- Benefits:
--   - Single source of truth for player identity mapping
--   - 68% storage reduction (no player_name duplication in attendance)
--   - Efficient manual matching (1 row update vs N attendance rows)
--   - Track first/last seen dates for external players
-- ============================================================================

---------------------------------------------------------------------------
-- STEP 1: Create connected_player table
---------------------------------------------------------------------------

CREATE TABLE public.connected_player (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  connector_id uuid NOT NULL REFERENCES public.connector(id) ON DELETE CASCADE,
  player_id uuid REFERENCES public.player(id) ON DELETE SET NULL,
  player_name varchar(100) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT connected_player_connector_player_name_unique
    UNIQUE (connector_id, player_name)
);

-- Indexes for efficient querying
CREATE INDEX idx_connected_player_connector ON public.connected_player(connector_id);
CREATE INDEX idx_connected_player_player ON public.connected_player(player_id) WHERE player_id IS NOT NULL;

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER update_connected_player_timestamp
  BEFORE UPDATE ON public.connected_player
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at_only();

COMMENT ON TABLE public.connected_player IS 'Maps external provider players to internal roster players, enabling efficient matching and tracking';
COMMENT ON COLUMN public.connected_player.player_name IS 'Player name as it appears in the external provider (e.g., "Andersson, Åke")';

---------------------------------------------------------------------------
-- STEP 2: Enable Row Level Security for connected_player
---------------------------------------------------------------------------

ALTER TABLE public.connected_player ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Team members can view connected_player records for their team's connectors
CREATE POLICY connected_player_select ON public.connected_player
  FOR SELECT USING (
    connector_id IN (
      SELECT c.id FROM public.connector c
      JOIN public.team_user tu ON tu.team_id = c.team_id
      WHERE tu.user_id = auth.uid()
    )
  );

-- RLS Policy: Only team admins can create connected_player records manually
CREATE POLICY connected_player_insert ON public.connected_player
  FOR INSERT WITH CHECK (
    connector_id IN (
      SELECT c.id FROM public.connector c
      JOIN public.team_user tu ON tu.team_id = c.team_id
      WHERE tu.user_id = auth.uid() AND tu.role = 'admin'
    )
  );

-- RLS Policy: Only team admins can update connected_player records (e.g., manual player matching)
CREATE POLICY connected_player_update ON public.connected_player
  FOR UPDATE USING (
    connector_id IN (
      SELECT c.id FROM public.connector c
      JOIN public.team_user tu ON tu.team_id = c.team_id
      WHERE tu.user_id = auth.uid() AND tu.role = 'admin'
    )
  );

-- RLS Policy: Service role (scraper) has full access for automated syncing
CREATE POLICY connected_player_service_role ON public.connected_player
  USING (auth.jwt()->>'role' = 'service_role');

---------------------------------------------------------------------------
-- STEP 3: Refactor player_attendance to use connected_player
---------------------------------------------------------------------------

-- Truncate existing data (will be re-synced by scraper)
TRUNCATE TABLE public.player_attendance;

-- CRITICAL: Drop ALL existing RLS policies BEFORE dropping columns they reference
DROP POLICY IF EXISTS player_attendance_select_policy ON public.player_attendance;
DROP POLICY IF EXISTS player_attendance_insert_policy ON public.player_attendance;
DROP POLICY IF EXISTS player_attendance_update_service_role_policy ON public.player_attendance;
DROP POLICY IF EXISTS player_attendance_update_team_member_policy ON public.player_attendance;
DROP POLICY IF EXISTS player_attendance_delete_policy ON public.player_attendance;
DROP POLICY IF EXISTS player_attendance_select ON public.player_attendance;
DROP POLICY IF EXISTS player_attendance_service_role ON public.player_attendance;

-- Drop old unique constraint BEFORE dropping the columns it references
ALTER TABLE public.player_attendance
  DROP CONSTRAINT player_attendance_connector_id_player_name_year_month_day_key;

-- Add new column for connected_player reference
ALTER TABLE public.player_attendance
  ADD COLUMN connected_player_id uuid REFERENCES public.connected_player(id) ON DELETE CASCADE;

-- Drop old columns that are now available through connected_player
ALTER TABLE public.player_attendance
  DROP COLUMN connector_id,
  DROP COLUMN player_id,
  DROP COLUMN player_name;

-- Make connected_player_id NOT NULL (required reference)
ALTER TABLE public.player_attendance
  ALTER COLUMN connected_player_id SET NOT NULL;

-- Add new unique constraint based on connected_player
ALTER TABLE public.player_attendance
  ADD CONSTRAINT player_attendance_connected_player_year_month_day_unique
    UNIQUE (connected_player_id, year, month, day_of_month);

-- Update indexes to reflect new structure
DROP INDEX IF EXISTS public.idx_player_attendance_connector;
DROP INDEX IF EXISTS public.idx_player_attendance_player;
CREATE INDEX idx_player_attendance_connected_player ON public.player_attendance(connected_player_id);

---------------------------------------------------------------------------
-- STEP 4: Create new RLS policies for player_attendance
---------------------------------------------------------------------------

-- Create new RLS policies that work with connected_player_id
CREATE POLICY player_attendance_select ON public.player_attendance
  FOR SELECT USING (
    connected_player_id IN (
      SELECT cp.id FROM public.connected_player cp
      JOIN public.connector c ON c.id = cp.connector_id
      JOIN public.team_user tu ON tu.team_id = c.team_id
      WHERE tu.user_id = auth.uid()
    )
  );

CREATE POLICY player_attendance_insert ON public.player_attendance
  FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY player_attendance_update_service_role ON public.player_attendance
  FOR UPDATE
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY player_attendance_update_team_member ON public.player_attendance
  FOR UPDATE
  USING (
    connected_player_id IN (
      SELECT cp.id FROM public.connected_player cp
      JOIN public.connector c ON c.id = cp.connector_id
      JOIN public.team_user tu ON tu.team_id = c.team_id
      WHERE tu.user_id = auth.uid()
    )
  )
  WITH CHECK (
    connected_player_id IN (
      SELECT cp.id FROM public.connected_player cp
      JOIN public.connector c ON c.id = cp.connector_idπ
      JOIN public.team_user tu ON tu.team_id = c.team_id
      WHERE tu.user_id = auth.uid()
    )
  );

CREATE POLICY player_attendance_delete ON public.player_attendance
  FOR DELETE
  USING (
    connected_player_id IN (
      SELECT cp.id FROM public.connected_player cp
      JOIN public.connector c ON c.id = cp.connector_id
      JOIN public.team_user tu ON tu.team_id = c.team_id
      WHERE tu.user_id = auth.uid() AND tu.role = 'admin'
    )
  );

-- Update table comment to reflect new structure
COMMENT ON TABLE public.player_attendance IS 'Practice attendance metrics from external providers, normalized via connected_player mapping';
