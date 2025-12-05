-- Fix match_log_event RLS policy by adding WITH CHECK clause for INSERT operations
-- This resolves "new row violates row-level security policy" errors

-- Drop the existing policy
DROP POLICY IF EXISTS "Team coaches can manage match events" ON public.match_log_event;

-- Recreate with both USING and WITH CHECK clauses
CREATE POLICY "Team coaches can manage match events" ON public.match_log_event
  FOR ALL TO authenticated
  USING (
    match_id IN (
      SELECT m.id FROM public.match m
      WHERE public.is_team_manager(m.team_id, auth.uid())
    )
  )
  WITH CHECK (
    match_id IN (
      SELECT m.id FROM public.match m
      WHERE public.is_team_manager(m.team_id, auth.uid())
    )
  );

COMMENT ON POLICY "Team coaches can manage match events" ON public.match_log_event IS
  'Allows team coaches and admins to manage match events. USING clause validates SELECT/UPDATE/DELETE, WITH CHECK clause validates INSERT/UPDATE.';
