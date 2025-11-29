-- ============================================================================
-- TEAM PREFERENCE SCHEMA - Sport Wizard
-- ============================================================================
-- Purpose: Team-wide preference storage for match configuration and gameplay
-- Scope: Team-wide only (no per-user preferences)
-- Storage: Text values for simplicity
-- Security: RLS policies enforce team membership for read, admin/coach for write
-- ============================================================================

---------------------------------------------------------------------------
-- DROP OLD SETTINGS TABLE
---------------------------------------------------------------------------

-- Remove unused settings table and all dependencies
DROP TABLE IF EXISTS public.settings CASCADE;

-- Drop indexes (if they weren't dropped by CASCADE)
DROP INDEX IF EXISTS idx_settings_team_id;
DROP INDEX IF EXISTS idx_settings_key;
DROP INDEX IF EXISTS idx_settings_global;

---------------------------------------------------------------------------
-- TABLE: team_preference
---------------------------------------------------------------------------

CREATE TABLE public.team_preference (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id uuid NOT NULL REFERENCES public.team(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text NOT NULL,
  category text,
  description text,

  -- Audit fields
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- One preference per key per team
  CONSTRAINT team_preference_team_key_unique UNIQUE (team_id, key)
);

---------------------------------------------------------------------------
-- INDEXES
---------------------------------------------------------------------------

CREATE INDEX idx_team_preference_team_id ON public.team_preference(team_id);
CREATE INDEX idx_team_preference_key ON public.team_preference(key);
CREATE INDEX idx_team_preference_category ON public.team_preference(category) WHERE category IS NOT NULL;

---------------------------------------------------------------------------
-- TRIGGERS
---------------------------------------------------------------------------

CREATE TRIGGER update_team_preference_timestamp
  BEFORE UPDATE ON public.team_preference
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at_and_user();

---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
---------------------------------------------------------------------------

ALTER TABLE public.team_preference ENABLE ROW LEVEL SECURITY;

-- Team members can view preferences
CREATE POLICY team_preference_select_policy ON public.team_preference
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_user
      WHERE team_user.team_id = team_preference.team_id
        AND team_user.user_id = auth.uid()
    )
  );

-- Team admins/coaches can insert preferences
CREATE POLICY team_preference_insert_policy ON public.team_preference
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_user
      WHERE team_user.team_id = team_preference.team_id
        AND team_user.user_id = auth.uid()
        AND team_user.role IN ('admin', 'coach')
    )
  );

-- Team admins/coaches can update preferences
CREATE POLICY team_preference_update_policy ON public.team_preference
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_user
      WHERE team_user.team_id = team_preference.team_id
        AND team_user.user_id = auth.uid()
        AND team_user.role IN ('admin', 'coach')
    )
  );

-- Team admins/coaches can delete preferences
CREATE POLICY team_preference_delete_policy ON public.team_preference
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_user
      WHERE team_user.team_id = team_preference.team_id
        AND team_user.user_id = auth.uid()
        AND team_user.role IN ('admin', 'coach')
    )
  );

---------------------------------------------------------------------------
-- DOCUMENTATION
---------------------------------------------------------------------------

COMMENT ON TABLE public.team_preference IS 'Stores team-wide preferences for match configuration and gameplay settings';
COMMENT ON COLUMN public.team_preference.key IS 'Unique preference identifier (e.g., matchFormat, formation, periodLength)';
COMMENT ON COLUMN public.team_preference.value IS 'Preference value stored as text (e.g., "5v5", "2-2", "20")';
COMMENT ON COLUMN public.team_preference.category IS 'Optional grouping (e.g., "match", "time", "substitution", "features")';
COMMENT ON COLUMN public.team_preference.description IS 'Optional user-facing description of the preference';
