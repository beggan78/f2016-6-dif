-- ============================================================================
-- TEAM CONNECTOR SCHEMA - Sport Wizard Integration
-- ============================================================================
-- Purpose: Secure storage and management of external team management providers
-- Providers: SportAdmin (phase 1), Svenska Lag (future)
-- Security: AES-256-GCM encryption via Supabase Edge Function + Vault
-- ============================================================================

---------------------------------------------------------------------------
-- ENUMS
---------------------------------------------------------------------------

CREATE TYPE public.connector_provider AS ENUM (
  'sportadmin',
  'svenska_lag'
);

CREATE TYPE public.connector_status AS ENUM (
  'connected',
  'disconnected',
  'error',
  'verifying'
);

CREATE TYPE public.sync_job_status AS ENUM (
  'waiting',
  'running',
  'completed',
  'failed',
  'cancelled'
);

CREATE TYPE public.connector_sync_job_type AS ENUM (
  'manual',
  'scheduled',
  'verification'
);

---------------------------------------------------------------------------
-- TABLE: connector
---------------------------------------------------------------------------

CREATE TABLE public.connector (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id uuid NOT NULL REFERENCES public.team(id) ON DELETE CASCADE,
  provider public.connector_provider NOT NULL,

  status public.connector_status NOT NULL DEFAULT 'verifying',

  encrypted_username bytea NOT NULL,
  encrypted_password bytea NOT NULL,
  encryption_iv bytea NOT NULL,
  encryption_salt bytea NOT NULL,
  encryption_key_version integer NOT NULL DEFAULT 1,

  config jsonb DEFAULT '{}'::jsonb,

  last_verified_at timestamptz,
  last_sync_at timestamptz,
  last_error text,

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  CONSTRAINT connector_team_provider_unique UNIQUE (team_id, provider),
  CONSTRAINT connector_encryption_iv_check CHECK (octet_length(encryption_iv) = 12),
  CONSTRAINT connector_encryption_salt_check CHECK (octet_length(encryption_salt) >= 16)
);

CREATE INDEX idx_connector_team_id ON public.connector(team_id);
CREATE INDEX idx_connector_provider ON public.connector(provider);
CREATE INDEX idx_connector_status ON public.connector(status);
CREATE INDEX idx_connector_last_sync ON public.connector(last_sync_at DESC);

CREATE TRIGGER update_connector_timestamp
  BEFORE UPDATE ON public.connector
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at_and_user();

COMMENT ON TABLE public.connector IS 'Stores encrypted credentials for team management provider connections';
COMMENT ON COLUMN public.connector.encrypted_username IS 'AES-256-GCM encrypted username, decryptable only with master key from Vault';
COMMENT ON COLUMN public.connector.encrypted_password IS 'AES-256-GCM encrypted password, decryptable only with master key from Vault';
COMMENT ON COLUMN public.connector.encryption_iv IS 'Initialization vector (12 bytes for GCM), unique per team';
COMMENT ON COLUMN public.connector.encryption_salt IS 'Salt for key derivation (minimum 16 bytes), unique per team';
COMMENT ON COLUMN public.connector.encryption_key_version IS 'Supports key rotation by tracking which master key version was used';

---------------------------------------------------------------------------
-- TABLE: connector_sync_job
---------------------------------------------------------------------------

CREATE TABLE public.connector_sync_job (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  connector_id uuid NOT NULL REFERENCES public.connector(id) ON DELETE CASCADE,

  job_type public.connector_sync_job_type NOT NULL DEFAULT 'manual',
  status public.sync_job_status NOT NULL DEFAULT 'waiting',

  scheduled_at timestamptz NOT NULL DEFAULT now(),
  last_started_at timestamptz,
  last_finished_at timestamptz,

  error_message text,
  error_code varchar(50),
  error_details jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_connector_sync_job_status ON public.connector_sync_job(status, scheduled_at);
CREATE INDEX idx_connector_sync_job_connector ON public.connector_sync_job(connector_id);
CREATE INDEX idx_connector_sync_job_scheduled ON public.connector_sync_job(scheduled_at) WHERE status = 'waiting';

CREATE TRIGGER update_connector_sync_job_timestamp
  BEFORE UPDATE ON public.connector_sync_job
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at_and_user();

COMMENT ON TABLE public.connector_sync_job IS 'Job queue for scraper to process sync requests';
COMMENT ON COLUMN public.connector_sync_job.job_type IS 'Classification of sync job trigger source (manual, scheduled, verification)';

---------------------------------------------------------------------------
-- TABLE: player_attendance
---------------------------------------------------------------------------

CREATE TABLE public.player_attendance (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  connector_id uuid NOT NULL REFERENCES public.connector(id) ON DELETE CASCADE,

  player_id uuid REFERENCES public.player(id) ON DELETE SET NULL,
  player_name varchar(100) NOT NULL,

  total_practices integer NOT NULL,
  total_attendance integer NOT NULL,
  attendance_percentage numeric(5,2) NOT NULL,

  last_synced_at timestamptz NOT NULL DEFAULT now(),

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  CONSTRAINT player_attendance_connector_name_unique UNIQUE (connector_id, player_name),
  CONSTRAINT player_attendance_percentage_range CHECK (attendance_percentage >= 0 AND attendance_percentage <= 100),
  CONSTRAINT player_attendance_count_check CHECK (total_attendance >= 0 AND total_attendance <= total_practices)
);

CREATE INDEX idx_player_attendance_connector ON public.player_attendance(connector_id);
CREATE INDEX idx_player_attendance_player ON public.player_attendance(player_id) WHERE player_id IS NOT NULL;
CREATE INDEX idx_player_attendance_synced ON public.player_attendance(last_synced_at DESC);

CREATE TRIGGER update_player_attendance_timestamp
  BEFORE UPDATE ON public.player_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at_and_user();

COMMENT ON TABLE public.player_attendance IS 'Practice attendance statistics scraped from team management providers';
COMMENT ON COLUMN public.player_attendance.player_id IS 'Matched player from player table (NULL if no match found)';
COMMENT ON COLUMN public.player_attendance.player_name IS 'Raw player name from scraped data, used for matching and display when player_id is NULL';

---------------------------------------------------------------------------
-- TABLE: upcoming_match
---------------------------------------------------------------------------

CREATE TABLE public.upcoming_match (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  connector_id uuid NOT NULL REFERENCES public.connector(id) ON DELETE CASCADE,

  match_date date NOT NULL,
  match_time varchar(50),
  opponent varchar(200) NOT NULL,
  venue varchar(200),

  synced_at timestamptz NOT NULL DEFAULT now(),

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  CONSTRAINT upcoming_match_unique UNIQUE (connector_id, match_date, opponent)
);

CREATE INDEX idx_upcoming_match_connector ON public.upcoming_match(connector_id);
CREATE INDEX idx_upcoming_match_date ON public.upcoming_match(match_date);

CREATE TRIGGER update_upcoming_match_timestamp
  BEFORE UPDATE ON public.upcoming_match
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at_and_user();

COMMENT ON TABLE public.upcoming_match IS 'Upcoming matches scraped from providers, refreshed on each sync';
COMMENT ON COLUMN public.upcoming_match.match_time IS 'Time range in provider format (e.g., "09:45 - 11:30")';
COMMENT ON COLUMN public.upcoming_match.opponent IS 'Opponent team name extracted from scraped match data';

---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
---------------------------------------------------------------------------

ALTER TABLE public.connector ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connector_sync_job ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upcoming_match ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------------------------
-- POLICIES: connector
---------------------------------------------------------------------------

CREATE POLICY connector_select_policy ON public.connector
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_user
      WHERE team_user.team_id = connector.team_id
        AND team_user.user_id = auth.uid()
    )
  );

CREATE POLICY connector_insert_policy ON public.connector
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_user
      WHERE team_user.team_id = connector.team_id
        AND team_user.user_id = auth.uid()
        AND team_user.role = 'admin'
    )
  );

CREATE POLICY connector_update_policy ON public.connector
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_user
      WHERE team_user.team_id = connector.team_id
        AND team_user.user_id = auth.uid()
        AND team_user.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_user
      WHERE team_user.team_id = connector.team_id
        AND team_user.user_id = auth.uid()
        AND team_user.role = 'admin'
    )
  );

CREATE POLICY connector_delete_policy ON public.connector
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_user
      WHERE team_user.team_id = connector.team_id
        AND team_user.user_id = auth.uid()
        AND team_user.role = 'admin'
    )
  );

---------------------------------------------------------------------------
-- POLICIES: connector_sync_job
---------------------------------------------------------------------------

CREATE POLICY connector_sync_job_select_policy ON public.connector_sync_job
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.connector tc
      JOIN public.team_user tu ON tu.team_id = tc.team_id
      WHERE tc.id = connector_sync_job.connector_id
        AND tu.user_id = auth.uid()
    )
  );

CREATE POLICY connector_sync_job_insert_policy ON public.connector_sync_job
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.connector tc
      JOIN public.team_user tu ON tu.team_id = tc.team_id
      WHERE tc.id = connector_sync_job.connector_id
        AND tu.user_id = auth.uid()
        AND tu.role = 'admin'
    )
  );

CREATE POLICY connector_sync_job_update_policy ON public.connector_sync_job
  FOR UPDATE
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

---------------------------------------------------------------------------
-- POLICIES: player_attendance
---------------------------------------------------------------------------

CREATE POLICY player_attendance_select_policy ON public.player_attendance
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.connector tc
      JOIN public.team_user tu ON tu.team_id = tc.team_id
      WHERE tc.id = player_attendance.connector_id
        AND tu.user_id = auth.uid()
    )
  );

CREATE POLICY player_attendance_insert_policy ON public.player_attendance
  FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY player_attendance_update_policy ON public.player_attendance
  FOR UPDATE
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY player_attendance_delete_policy ON public.player_attendance
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.connector tc
      JOIN public.team_user tu ON tu.team_id = tc.team_id
      WHERE tc.id = player_attendance.connector_id
        AND tu.user_id = auth.uid()
        AND tu.role = 'admin'
    )
  );

---------------------------------------------------------------------------
-- POLICIES: upcoming_match
---------------------------------------------------------------------------

CREATE POLICY upcoming_match_select_policy ON public.upcoming_match
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.connector tc
      JOIN public.team_user tu ON tu.team_id = tc.team_id
      WHERE tc.id = upcoming_match.connector_id
        AND tu.user_id = auth.uid()
    )
  );

CREATE POLICY upcoming_match_insert_policy ON public.upcoming_match
  FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY upcoming_match_update_policy ON public.upcoming_match
  FOR UPDATE
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY upcoming_match_delete_policy ON public.upcoming_match
  FOR DELETE
  USING (auth.jwt()->>'role' = 'service_role');

---------------------------------------------------------------------------
-- FUNCTIONS
---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_connector(
  p_team_id uuid,
  p_provider public.connector_provider
)
RETURNS TABLE (
  id uuid,
  status public.connector_status,
  last_verified_at timestamptz,
  last_sync_at timestamptz,
  last_error text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tc.id,
    tc.status,
    tc.last_verified_at,
    tc.last_sync_at,
    tc.last_error
  FROM public.connector tc
  WHERE tc.team_id = p_team_id
    AND tc.provider = p_provider
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.create_manual_sync_job(
  p_connector_id uuid
)
RETURNS uuid AS $$
DECLARE
  v_job_id uuid;
  v_team_id uuid;
BEGIN
  SELECT tc.team_id INTO v_team_id
  FROM public.connector tc
  JOIN public.team_user tu ON tu.team_id = tc.team_id
  WHERE tc.id = p_connector_id
    AND tu.user_id = auth.uid()
    AND tu.role = 'admin';

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Connector not found or access denied';
  END IF;

  INSERT INTO public.connector_sync_job (
    connector_id,
    job_type,
    created_by
  ) VALUES (
    p_connector_id,
    'manual',
    auth.uid()
  )
  RETURNING id INTO v_job_id;

  RETURN v_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_connector(uuid, public.connector_provider) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_manual_sync_job(uuid) TO authenticated;

---------------------------------------------------------------------------
-- DOCUMENTATION
---------------------------------------------------------------------------

COMMENT ON TYPE public.connector_provider IS 'Supported team management provider platforms';
COMMENT ON TYPE public.connector_status IS 'Current connection status of a team connector';
COMMENT ON TYPE public.sync_job_status IS 'Execution status of a sync job in the queue';
COMMENT ON TYPE public.connector_sync_job_type IS 'Classification of sync job trigger source (manual, scheduled, verification)';
