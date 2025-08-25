-- Update match table defaults and prepare player match stats storage
-- This ensures explicit values are required when creating matches and fixes player stats RLS

-- Remove defaults from columns that should be explicitly set
ALTER TABLE public.match 
  ALTER COLUMN format DROP DEFAULT,
  ALTER COLUMN formation DROP DEFAULT,
ALTER COLUMN periods DROP DEFAULT,
  ALTER COLUMN period_duration_minutes DROP DEFAULT,
  ALTER COLUMN match_duration_seconds DROP DEFAULT,
  ALTER COLUMN type DROP DEFAULT;

-- Change state default from 'pending' to 'running' since matches start running
ALTER TABLE public.match 
  ALTER COLUMN state SET DEFAULT 'running'::public.match_state;

-- Add comment explaining the change
-- Make match_duration_seconds nullable since it's only known when match ends
ALTER TABLE public.match 
  ALTER COLUMN match_duration_seconds DROP NOT NULL;

COMMENT ON COLUMN public.match.state IS 'Match state: running (active), finished (completed), confirmed (saved to history), pending (unused). Defaults to running when match is created.';
COMMENT ON COLUMN public.match.format IS 'Match format (3v3, 5v5, 7v7, 9v9, 11v11) - must be explicitly set, no default';
COMMENT ON COLUMN public.match.formation IS 'Formation configuration used - must be explicitly set, no default';
COMMENT ON COLUMN public.match.periods IS 'Number of periods in match - must be explicitly set, no default';
COMMENT ON COLUMN public.match.period_duration_minutes IS 'Duration of each period in minutes - must be explicitly set, no default';
COMMENT ON COLUMN public.match.type IS 'Type of match (friendly, internal, league, tournament, cup) - must be explicitly set, no default';
COMMENT ON COLUMN public.match.match_duration_seconds IS 'Total match duration in seconds - calculated when match ends, NULL during active match';

---------------------------------------------------------------------------
-- SECTION 2: PLAYER MATCH STATS TABLE UPDATES
---------------------------------------------------------------------------

-- Drop columns that are no longer needed
ALTER TABLE public.player_match_stats 
  DROP COLUMN IF EXISTS substitutions_in,
  DROP COLUMN IF EXISTS substitutions_out,
  DROP COLUMN IF EXISTS team_mode;

-- Convert total_field_time_seconds from generated column to regular column
-- This will store outfield time only (excludes goalie time)
ALTER TABLE public.player_match_stats 
  DROP COLUMN IF EXISTS total_field_time_seconds;

ALTER TABLE public.player_match_stats 
  ADD COLUMN total_field_time_seconds integer DEFAULT 0 
  CONSTRAINT valid_total_field_time CHECK (total_field_time_seconds >= 0);

COMMENT ON COLUMN public.player_match_stats.total_field_time_seconds IS 'Total time on outfield (excluding goalie time) - calculated as timeOnFieldSeconds - timeAsGoalieSeconds';

---------------------------------------------------------------------------
-- SECTION 3: SECURE RLS POLICIES FOR PLAYER MATCH STATS
---------------------------------------------------------------------------

-- Drop existing inadequate policy that doesn't validate team consistency
DROP POLICY IF EXISTS "Team coaches can manage player match stats" ON public.player_match_stats;

-- Create secure INSERT policy with proper team consistency validation
CREATE POLICY "Team managers can create player match stats"
ON public.player_match_stats
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  -- Validate user manages both player and match teams AND they belong to same team
  EXISTS (
    SELECT 1 FROM public.player p, public.match m
    WHERE p.id = player_match_stats.player_id
      AND m.id = player_match_stats.match_id
      AND p.team_id = m.team_id  -- Ensure player and match belong to same team
      AND public.is_team_manager(p.team_id, auth.uid())
  )
);

-- Create secure UPDATE policy
CREATE POLICY "Team managers can update player match stats"
ON public.player_match_stats
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.player p, public.match m
    WHERE p.id = player_match_stats.player_id
      AND m.id = player_match_stats.match_id
      AND p.team_id = m.team_id
      AND public.is_team_manager(p.team_id, auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.player p, public.match m
    WHERE p.id = player_match_stats.player_id
      AND m.id = player_match_stats.match_id
      AND p.team_id = m.team_id
      AND public.is_team_manager(p.team_id, auth.uid())
  )
);

-- Create secure DELETE policy  
CREATE POLICY "Team managers can delete player match stats"
ON public.player_match_stats
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.player p
    WHERE p.id = player_match_stats.player_id
      AND public.is_team_manager(p.team_id, auth.uid())
  )
);