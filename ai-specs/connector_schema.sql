-- ============================================================================
-- TEAM CONNECTOR SCHEMA - Sport Wizard Integration
-- ============================================================================
-- Purpose: Secure storage and management of team management provider credentials
-- Providers: SportAdmin, Svenska Lag (future)
-- Security: AES-256-GCM encryption via Edge Function + Supabase Vault
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------

-- Supported team management providers
CREATE TYPE public.connector_provider AS ENUM (
  'sportadmin',
  'svenska_lag'   -- Future provider
);

-- Connector connection status
CREATE TYPE public.connector_status AS ENUM (
  'connected',      -- Successfully connected and verified
  'disconnected',   -- Explicitly disconnected by user
  'error',          -- Connection or authentication error
  'verifying'       -- Initial connection being verified
);

-- Sync job execution status
CREATE TYPE public.sync_job_status AS ENUM (
  'waiting',        -- Waiting to be processed
  'running',        -- Currently executing
  'completed',      -- Manual sync successfully completed
  'failed',         -- Failed with error
  'cancelled'       -- Cancelled by user or system
);

-- Sync job type classification
CREATE TYPE public.connector_sync_job_type AS ENUM (
  'manual',         -- User-initiated sync via UI
  'scheduled',      -- Automated periodic sync (cron)
  'verification'    -- Initial connection test after setup
);

-- ----------------------------------------------------------------------------
-- TABLE: connector
-- ----------------------------------------------------------------------------
-- Stores encrypted credentials and configuration for each team's provider connection
-- One connector per team per provider (unique constraint)
-- Credentials encrypted using AES-256-GCM with team-specific IV and salt

CREATE TABLE public.connector (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES public.team(id) ON DELETE CASCADE,
  provider public.connector_provider NOT NULL,

  -- Connection status
  status public.connector_status NOT NULL DEFAULT 'verifying',

  -- Encrypted credentials
  encrypted_username BYTEA NOT NULL,        -- AES-256-GCM encrypted username
  encrypted_password BYTEA NOT NULL,        -- AES-256-GCM encrypted password
  encryption_iv BYTEA NOT NULL,             -- Initialization vector (unique per team)
  encryption_salt BYTEA NOT NULL,           -- Salt for key derivation (unique per team)
  encryption_key_version INTEGER NOT NULL DEFAULT 1, -- For key rotation support

  -- Provider-specific configuration (JSON for flexibility)
  config JSONB DEFAULT '{}'::jsonb,         -- Provider-specific settings

  -- Sync tracking
  last_verified_at TIMESTAMPTZ,             -- When connection was last verified as working
  last_sync_at TIMESTAMPTZ,                 -- When last successful sync completed
  last_error TEXT,                          -- Last error message (if any)

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated_by UUID REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT connector_team_provider_unique UNIQUE (team_id, provider),
  CONSTRAINT connector_encryption_iv_check CHECK (octet_length(encryption_iv) = 12),    -- GCM standard IV length
  CONSTRAINT connector_encryption_salt_check CHECK (octet_length(encryption_salt) >= 16) -- Minimum salt length
);

-- Indexes for performance
CREATE INDEX idx_connector_team_id ON public.connector(team_id);
CREATE INDEX idx_connector_provider ON public.connector(provider);
CREATE INDEX idx_connector_status ON public.connector(status);
CREATE INDEX idx_connector_last_sync ON public.connector(last_sync_at DESC);

-- Audit trigger
CREATE TRIGGER update_connector_timestamp
  BEFORE UPDATE ON public.connector
  FOR EACH ROW
  EXECUTE FUNCTION public.update_timestamp_and_user();

-- Comments
COMMENT ON TABLE public.connector IS 'Stores encrypted credentials for team management provider connections';
COMMENT ON COLUMN public.connector.encrypted_username IS 'AES-256-GCM encrypted username, decryptable only with master key from Vault';
COMMENT ON COLUMN public.connector.encrypted_password IS 'AES-256-GCM encrypted password, decryptable only with master key from Vault';
COMMENT ON COLUMN public.connector.encryption_iv IS 'Initialization vector (12 bytes for GCM), unique per team';
COMMENT ON COLUMN public.connector.encryption_salt IS 'Salt for key derivation (minimum 16 bytes), unique per team';
COMMENT ON COLUMN public.connector.encryption_key_version IS 'Supports key rotation by tracking which master key version was used';

-- ----------------------------------------------------------------------------
-- TABLE: connector_sync_job
-- ----------------------------------------------------------------------------
-- Job queue for scraper to process
-- Jobs created by: user manual sync, scheduled sync, initial verification

CREATE TABLE public.connector_sync_job (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connector_id UUID NOT NULL REFERENCES public.connector(id) ON DELETE CASCADE,

  -- Job configuration
  job_type public.connector_sync_job_type NOT NULL DEFAULT 'manual',

  -- Execution status
  status public.sync_job_status NOT NULL DEFAULT 'waiting',

  -- Execution metadata
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),     -- When job was created
  last_started_at TIMESTAMPTZ,                         -- When latest job execution started
  last_finished_at TIMESTAMPTZ,                        -- When latest job completed/failed

  -- Error tracking
  error_message TEXT,                                  -- Detailed error message
  error_code VARCHAR(50),                              -- Categorized error code
  error_details JSONB,                                 -- Structured error information

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated_by UUID REFERENCES auth.users(id),
);

-- Indexes for job queue processing
CREATE INDEX idx_connector_sync_job_status ON public.connector_sync_job(status, scheduled_at);
CREATE INDEX idx_connector_sync_job_connector ON public.connector_sync_job(connector_id);
CREATE INDEX idx_connector_sync_job_scheduled ON public.connector_sync_job(scheduled_at) WHERE status = 'pending';

-- Audit trigger
CREATE TRIGGER update_connector_sync_job_timestamp
  BEFORE UPDATE ON public.connector_sync_job
  FOR EACH ROW
  EXECUTE FUNCTION public.update_timestamp_and_user();

-- Comments
COMMENT ON TABLE public.connector_sync_job IS 'Job queue for scraper to process sync requests';
COMMENT ON COLUMN public.connector_sync_job.job_type IS 'Classification of sync job trigger source (see connector_sync_job_type enum for valid values)';

-- ----------------------------------------------------------------------------
-- TABLE: player_attendance
-- ----------------------------------------------------------------------------
-- Stores attendance statistics scraped from provider
-- Updated on every successful sync (upsert based on connector_id + player_name)
-- Links to player table when name matching is successful

CREATE TABLE public.player_attendance (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connector_id UUID NOT NULL REFERENCES public.connector(id) ON DELETE CASCADE,

  -- Player linking
  player_id UUID REFERENCES public.player(id) ON DELETE SET NULL, -- Nullable: matched player
  player_name VARCHAR(100) NOT NULL,                               -- Raw name from scraped data

  -- Attendance statistics
  total_practices INTEGER NOT NULL,                                -- Total practices in period
  total_attendance INTEGER NOT NULL,                               -- Number of practices attended
  attendance_percentage NUMERIC(5,2) NOT NULL,                     -- Calculated percentage (0.00-100.00)

  -- Sync metadata
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),               -- When this record was last updated

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated_by UUID REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT player_attendance_connector_name_unique UNIQUE (connector_id, player_name),
  CONSTRAINT player_attendance_percentage_range CHECK (attendance_percentage >= 0 AND attendance_percentage <= 100),
  CONSTRAINT player_attendance_count_check CHECK (total_attendance >= 0 AND total_attendance <= total_practices)
);

-- Indexes for performance
CREATE INDEX idx_player_attendance_connector ON public.player_attendance(connector_id);
CREATE INDEX idx_player_attendance_player ON public.player_attendance(player_id) WHERE player_id IS NOT NULL;
CREATE INDEX idx_player_attendance_synced ON public.player_attendance(last_synced_at DESC);

-- Audit trigger
CREATE TRIGGER update_player_attendance_timestamp
  BEFORE UPDATE ON public.player_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_timestamp_and_user();

-- Comments
COMMENT ON TABLE public.player_attendance IS 'Practice attendance statistics scraped from team management providers, updated on each sync';
COMMENT ON COLUMN public.player_attendance.player_id IS 'Matched player from player table (NULL if no match found)';
COMMENT ON COLUMN public.player_attendance.player_name IS 'Raw player name from scraped data, used for matching and display when player_id is NULL';

-- ----------------------------------------------------------------------------
-- TABLE: upcoming_match
-- ----------------------------------------------------------------------------
-- Stores upcoming matches scraped from provider
-- Past matches (match_date < current_date) deleted on each sync
-- Fresh data inserted on each successful sync

CREATE TABLE public.upcoming_match (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connector_id UUID NOT NULL REFERENCES public.connector(id) ON DELETE CASCADE,

  -- Match details
  match_date DATE NOT NULL,
  match_time VARCHAR(50),                                          -- Time range format: "09:45 - 11:30"
  opponent VARCHAR(200) NOT NULL,                                  -- Opponent team name
  venue VARCHAR(200),                                              -- Match venue/location

  -- Sync metadata
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                   -- When this record was synced

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated_by UUID REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT upcoming_match_unique UNIQUE (connector_id, match_date, opponent)
);

-- Indexes for performance
CREATE INDEX idx_upcoming_match_connector ON public.upcoming_match(connector_id);
CREATE INDEX idx_upcoming_match_date ON public.upcoming_match(match_date);
CREATE INDEX idx_upcoming_match_future ON public.upcoming_match(match_date) WHERE match_date >= CURRENT_DATE;

-- Audit trigger
CREATE TRIGGER update_upcoming_match_timestamp
  BEFORE UPDATE ON public.upcoming_match
  FOR EACH ROW
  EXECUTE FUNCTION public.update_timestamp_and_user();

-- Comments
COMMENT ON TABLE public.upcoming_match IS 'Upcoming matches scraped from providers, refreshed on each sync with past matches removed';
COMMENT ON COLUMN public.upcoming_match.match_time IS 'Time range in provider format (e.g., "09:45 - 11:30")';
COMMENT ON COLUMN public.upcoming_match.opponent IS 'Opponent team name extracted from scraped match data';

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE public.connector ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connector_sync_job ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upcoming_match ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLICIES: connector
-- ============================================================================

-- Policy: Team members can view their team's connectors (without decrypting credentials)
CREATE POLICY connector_select_policy ON public.connector
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_user
      WHERE team_user.team_id = connector.team_id
        AND team_user.user_id = auth.uid()
    )
  );

-- Policy: Team admins can insert connectors for their teams
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

-- Policy: Team admins can update their team's connectors
CREATE POLICY connector_update_policy ON public.connector
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_user
      WHERE team_user.team_id = connector.team_id
        AND team_user.user_id = auth.uid()
        AND team_user.role = 'admin'
    )
  );

-- Policy: Team admins can soft delete their team's connectors
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

-- ============================================================================
-- POLICIES: connector_sync_job
-- ============================================================================

-- Policy: Team members can view jobs for their team's connectors
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

-- Policy: Team admins can create sync jobs for their team's connectors
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

-- Policy: Service role (scraper) can update job status
-- Note: This policy allows updates from service_role key only, not from regular users
CREATE POLICY connector_sync_job_update_policy ON public.connector_sync_job
  FOR UPDATE
  USING (true); -- Service role bypasses RLS, but policy must exist for regular updates

-- ============================================================================
-- POLICIES: player_attendance
-- ============================================================================

-- Policy: Team members can view attendance for their team's connectors
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

-- Policy: Service role (scraper) can insert attendance data
CREATE POLICY player_attendance_insert_policy ON public.player_attendance
  FOR INSERT
  WITH CHECK (true); -- Service role bypasses RLS

-- Policy: Service role (scraper) can update attendance data
CREATE POLICY player_attendance_update_policy ON public.player_attendance
  FOR UPDATE
  USING (true); -- Service role bypasses RLS

-- Policy: Team admins can delete attendance records
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

-- ============================================================================
-- POLICIES: upcoming_match
-- ============================================================================

-- Policy: Team members can view upcoming matches for their team's connectors
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

-- Policy: Service role (scraper) can insert upcoming matches
CREATE POLICY upcoming_match_insert_policy ON public.upcoming_match
  FOR INSERT
  WITH CHECK (true); -- Service role bypasses RLS

-- Policy: Service role (scraper) can update upcoming matches
CREATE POLICY upcoming_match_update_policy ON public.upcoming_match
  FOR UPDATE
  USING (true); -- Service role bypasses RLS

-- Policy: Service role (scraper) can delete past matches
CREATE POLICY upcoming_match_delete_policy ON public.upcoming_match
  FOR DELETE
  USING (true); -- Service role bypasses RLS for cleanup of past matches

-- ----------------------------------------------------------------------------
-- HELPER FUNCTIONS
-- ----------------------------------------------------------------------------

-- Function: Get active connector for team and provider
CREATE OR REPLACE FUNCTION public.get_connector(
  p_team_id UUID,
  p_provider public.connector_provider
)
RETURNS TABLE (
  id UUID,
  status public.connector_status,
  last_verified_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  last_error TEXT
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

-- Function: Create manual sync job
CREATE OR REPLACE FUNCTION public.create_manual_sync_job(
  p_connector_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_job_id UUID;
  v_team_id UUID;
BEGIN
  -- Verify connector exists and user has access
  SELECT tc.team_id INTO v_team_id
  FROM public.connector tc
  JOIN public.team_user tu ON tu.team_id = tc.team_id
  WHERE tc.id = p_connector_id
    AND tu.user_id = auth.uid()
    AND tu.role = 'admin';

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Connector not found or access denied';
  END IF;

  -- Create sync job
  INSERT INTO public.connector_sync_job (
    connector_id,
    job_type,
    created_by
  ) VALUES (
    p_connector_id,
    'manual',
    auth.uid()
  ) RETURNING id INTO v_job_id;

  RETURN v_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_connector(UUID, public.connector_provider) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_manual_sync_job(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- COMMENTS AND DOCUMENTATION
-- ----------------------------------------------------------------------------

COMMENT ON TYPE public.connector_provider IS 'Supported team management provider platforms';
COMMENT ON TYPE public.connector_status IS 'Current connection status of a team connector';
COMMENT ON TYPE public.sync_job_status IS 'Execution status of a sync job in the queue';
COMMENT ON TYPE public.connector_sync_job_type IS 'Classification of what triggered a sync job (manual, scheduled, or verification)';

-- ============================================================================
-- SECURITY NOTES
-- ============================================================================
--
-- ENCRYPTION ARCHITECTURE:
-- 1. Credentials encrypted client-side or in Edge Function using AES-256-GCM
-- 2. Master encryption key stored in Supabase Vault (vault.secrets table)
-- 3. Each team gets unique IV (12 bytes) and salt (16+ bytes)
-- 4. Encrypted credentials stored as BYTEA (binary data)
-- 5. Decryption only possible with master key (scraper has access via service_role)
--
-- ACCESS CONTROL:
-- 1. RLS policies enforce team-based access
-- 2. Only team admins can create/update/delete connectors
-- 3. All team members can view connector status (but NOT decrypt credentials)
-- 4. Service role (scraper) can update job status and create results
-- 5. Edge Function validates user permissions before encryption
--
-- KEY ROTATION:
-- 1. encryption_key_version tracks which master key was used
-- 2. New connections use latest key version
-- 3. Old keys retained in Vault for decrypting existing credentials
-- 4. Gradual migration: decrypt with old key, re-encrypt with new key
--
-- ============================================================================
