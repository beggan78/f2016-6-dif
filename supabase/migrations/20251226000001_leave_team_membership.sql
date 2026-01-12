-- Function: leave_team
-- Removes the current user's team membership while preventing orphaned teams.
CREATE OR REPLACE FUNCTION public.leave_team(p_team_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_membership_id uuid;
  v_is_admin boolean;
  v_member_count integer;
  v_admin_count integer;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Authentication required'
    );
  END IF;

  IF p_team_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Team ID is required'
    );
  END IF;

  SELECT id, role = 'admin'::public.user_role
  INTO v_membership_id, v_is_admin
  FROM public.team_user
  WHERE team_id = p_team_id
    AND user_id = v_user_id;

  IF v_membership_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Membership not found'
    );
  END IF;

  SELECT COUNT(*)
  INTO v_member_count
  FROM public.team_user
  WHERE team_id = p_team_id;

  IF v_member_count <= 1 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'last_team_member',
      'message', 'You are the last member of this team. Add another member before leaving.'
    );
  END IF;

  IF v_is_admin THEN
    SELECT COUNT(*)
    INTO v_admin_count
    FROM public.team_user
    WHERE team_id = p_team_id
      AND role = 'admin'::public.user_role;

    IF v_admin_count <= 1 THEN
      RETURN json_build_object(
        'success', false,
        'error', 'last_team_admin',
        'message', 'You are the last admin of this team. Assign another admin before leaving.'
      );
    END IF;
  END IF;

  DELETE FROM public.team_user
  WHERE id = v_membership_id;

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

GRANT EXECUTE ON FUNCTION public.leave_team(uuid) TO authenticated;
