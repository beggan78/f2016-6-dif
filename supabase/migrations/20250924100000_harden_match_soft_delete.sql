-- Harden match soft delete policies and add controlled restore RPC

-- Drop legacy match policies that did not account for deleted_at
DROP POLICY IF EXISTS "Team members can view matches" ON public.match;
DROP POLICY IF EXISTS "Team coaches can manage matches" ON public.match;

-- Ensure only active matches are visible to team members
CREATE POLICY "Team members can view active matches" ON public.match
  FOR SELECT TO authenticated
  USING (
    public.is_team_member(team_id, auth.uid())
    AND deleted_at IS NULL
  );

-- Allow team managers to insert new matches in active state
CREATE POLICY "Team coaches can create matches" ON public.match
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_team_manager(team_id, auth.uid())
    AND deleted_at IS NULL
  );

-- Allow team managers to update active matches (including soft deletion)
CREATE POLICY "Team coaches can update active matches" ON public.match
  FOR UPDATE TO authenticated
  USING (
    public.is_team_manager(team_id, auth.uid())
    AND deleted_at IS NULL
  )
  WITH CHECK (
    public.is_team_manager(team_id, auth.uid())
  );

-- Controlled restore function for soft-deleted matches
CREATE OR REPLACE FUNCTION public.restore_soft_deleted_match(p_match_id uuid)
RETURNS public.match
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match public.match;
  v_user uuid;
BEGIN
  v_user := auth.uid();

  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Restore requires authentication' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_match
  FROM public.match
  WHERE id = p_match_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match % not found', p_match_id USING ERRCODE = 'P0002';
  END IF;

  IF v_match.deleted_at IS NULL THEN
    RAISE EXCEPTION 'Match % is not soft deleted', p_match_id USING ERRCODE = '20000';
  END IF;

  IF NOT public.is_team_manager(v_match.team_id, v_user) THEN
    RAISE EXCEPTION 'Only team managers can restore matches' USING ERRCODE = '42501';
  END IF;

  UPDATE public.match
    SET deleted_at = NULL,
        updated_at = now()
  WHERE id = p_match_id;

  RETURN (
    SELECT m
    FROM public.match AS m
    WHERE m.id = p_match_id
  );
END;
$$;

COMMENT ON FUNCTION public.restore_soft_deleted_match(uuid)
  IS 'Restores a soft-deleted match when invoked by a team manager';

REVOKE ALL ON FUNCTION public.restore_soft_deleted_match(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restore_soft_deleted_match(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_soft_deleted_match(uuid) TO service_role;
