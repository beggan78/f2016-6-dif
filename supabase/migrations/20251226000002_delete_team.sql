-- Function: delete_team
-- Attempts to delete a team; falls back to deactivating when references exist.
CREATE OR REPLACE FUNCTION public.delete_team(p_team_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_is_admin boolean;
  v_team public.team;
  v_deleted_count integer;
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

  SELECT role = 'admin'::public.user_role
  INTO v_is_admin
  FROM public.team_user
  WHERE team_id = p_team_id
    AND user_id = v_user_id;

  IF v_is_admin IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Membership not found'
    );
  END IF;

  IF NOT v_is_admin THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Only team admins can delete teams'
    );
  END IF;

  BEGIN
    DELETE FROM public.team
    WHERE id = p_team_id;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    IF v_deleted_count = 0 THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Team not found'
      );
    END IF;

    RETURN json_build_object(
      'success', true,
      'deleted', true
    );
  EXCEPTION
    WHEN foreign_key_violation THEN
      UPDATE public.team
      SET active = false
      WHERE id = p_team_id
      RETURNING * INTO v_team;

      IF v_team.id IS NULL THEN
        RETURN json_build_object(
          'success', false,
          'error', 'Team not found'
        );
      END IF;

      DELETE FROM public.team_user
      WHERE team_id = p_team_id
        AND user_id = v_user_id;

      RETURN json_build_object(
        'success', true,
        'deleted', false,
        'deactivated', true
      );
  END;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_team(uuid) TO authenticated;
