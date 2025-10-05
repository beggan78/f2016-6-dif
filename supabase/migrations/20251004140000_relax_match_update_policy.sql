-- Relax match update policy so managers can modify soft-deleted rows

DROP POLICY IF EXISTS "Team coaches can update active matches" ON public.match;

CREATE POLICY "Team coaches can update matches" ON public.match
  FOR UPDATE TO authenticated
  USING (
    public.is_team_manager(team_id, auth.uid())
  )
  WITH CHECK (
    public.is_team_manager(team_id, auth.uid())
  );

DROP POLICY IF EXISTS "Team coaches can view all matches" ON public.match;

CREATE POLICY "Team coaches can view all matches" ON public.match
  FOR SELECT TO authenticated
  USING (
    public.is_team_manager(team_id, auth.uid())
  );
