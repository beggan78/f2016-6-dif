-- Allow team managers to link upcoming matches to planned matches via RPC

CREATE OR REPLACE FUNCTION public.link_upcoming_match_to_planned_match(
  p_upcoming_match_id uuid,
  p_planned_match_id uuid
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_team_id uuid;
  v_match_team_id uuid;
  v_existing_link uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'authentication_required',
      'message', 'You must be logged in to link matches.'
    );
  END IF;

  IF p_upcoming_match_id IS NULL OR p_planned_match_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'invalid_input',
      'message', 'Upcoming match ID and planned match ID are required.'
    );
  END IF;

  SELECT tc.team_id
  INTO v_team_id
  FROM public.upcoming_match um
  JOIN public.connector tc ON tc.id = um.connector_id
  WHERE um.id = p_upcoming_match_id;

  IF v_team_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'not_found',
      'message', 'Upcoming match not found.'
    );
  END IF;

  IF NOT public.is_team_manager(v_team_id, v_user_id) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'forbidden',
      'message', 'You do not have permission to plan matches for this team.'
    );
  END IF;

  SELECT team_id
  INTO v_match_team_id
  FROM public.match
  WHERE id = p_planned_match_id;

  IF v_match_team_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'not_found',
      'message', 'Planned match not found.'
    );
  END IF;

  IF v_match_team_id <> v_team_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'mismatch',
      'message', 'Planned match does not belong to this team.'
    );
  END IF;

  SELECT planned_match_id
  INTO v_existing_link
  FROM public.upcoming_match
  WHERE id = p_upcoming_match_id;

  IF v_existing_link IS NOT NULL AND v_existing_link <> p_planned_match_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'already_linked',
      'message', 'Upcoming match is already linked to a planned match.'
    );
  END IF;

  UPDATE public.upcoming_match
  SET planned_match_id = p_planned_match_id
  WHERE id = p_upcoming_match_id;

  RETURN json_build_object(
    'success', true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_upcoming_match_to_planned_match(uuid, uuid) TO authenticated;
