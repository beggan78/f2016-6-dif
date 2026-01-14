-- Function: leave_club
-- Removes the current user's club membership and any team memberships in that club,
-- while preventing orphaned teams.
CREATE OR REPLACE FUNCTION public.leave_club(p_club_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_membership_id uuid;
  v_blocked_teams text[];
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Authentication required'
    );
  END IF;

  IF p_club_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Club ID is required'
    );
  END IF;

  SELECT id INTO v_membership_id
  FROM public.club_user
  WHERE club_id = p_club_id
    AND user_id = v_user_id
    AND status = 'active'::public.club_user_status;

  IF v_membership_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Membership not found'
    );
  END IF;

  WITH user_teams AS (
    SELECT tu.team_id
    FROM public.team_user tu
    JOIN public.team t ON t.id = tu.team_id
    WHERE tu.user_id = v_user_id
      AND t.club_id = p_club_id
  ),
  team_member_counts AS (
    SELECT tu.team_id, COUNT(*) AS member_count
    FROM public.team_user tu
    JOIN user_teams ut ON ut.team_id = tu.team_id
    GROUP BY tu.team_id
  )
  SELECT ARRAY_AGG(t.name ORDER BY t.name)
  INTO v_blocked_teams
  FROM team_member_counts tmc
  JOIN public.team t ON t.id = tmc.team_id
  WHERE tmc.member_count <= 1;

  IF v_blocked_teams IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'last_team_member',
      'message', 'You are the last member of one or more teams. Add another member before leaving this team.',
      'teams', v_blocked_teams
    );
  END IF;

  DELETE FROM public.team_user tu
  USING public.team t
  WHERE tu.team_id = t.id
    AND t.club_id = p_club_id
    AND tu.user_id = v_user_id;

  DELETE FROM public.club_user
  WHERE club_id = p_club_id
    AND user_id = v_user_id;

  RETURN json_build_object(
    'success', true
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.leave_club(uuid) TO authenticated;
