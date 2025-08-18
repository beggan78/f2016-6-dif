-- Team Invitation Expiry Update Migration
-- Updates team invitation expiry from 7 days to 24 hours to match email link expiration
-- This migration is production-safe and will only affect future invitations

-- ========================================
-- Update Table Default for New Invitations
-- ========================================

-- Update the default expires_at to be 24 hours instead of 7 days
ALTER TABLE team_invitation 
ALTER COLUMN expires_at SET DEFAULT (NOW() + INTERVAL '1 day');

-- ========================================
-- Update invite_user_to_team Function
-- ========================================

-- Replace the existing function to use 24 hours for refreshes
CREATE OR REPLACE FUNCTION invite_user_to_team(
  p_team_id UUID,
  p_email TEXT,
  p_role TEXT,
  p_message TEXT DEFAULT '',
  p_redirect_url TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inviting_user_id UUID;
  v_inviting_user_role TEXT;
  v_team_name TEXT;
  v_club_name TEXT;
  v_invitation_id UUID;
  v_invitation_record RECORD;
  v_existing_invitation_id UUID;
  v_existing_expires_at TIMESTAMPTZ;
  v_is_refresh BOOLEAN := false;
  v_result JSON;
BEGIN
  -- Get the current user ID
  v_inviting_user_id := auth.uid();
  
  -- Validate that user is authenticated
  IF v_inviting_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Authentication required'
    );
  END IF;
  
  -- Validate input parameters
  IF p_team_id IS NULL OR p_email IS NULL OR p_role IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Team ID, email, and role are required'
    );
  END IF;
  
  -- Validate role
  IF p_role NOT IN ('admin', 'coach', 'parent', 'player') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid role specified'
    );
  END IF;
  
  -- Validate email format (basic validation)
  IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid email address format'
    );
  END IF;
  
  -- Check if the inviting user has permission to invite to this team
  SELECT tu.role INTO v_inviting_user_role
  FROM team_user tu
  WHERE tu.team_id = p_team_id 
  AND tu.user_id = v_inviting_user_id;
  
  -- Verify user is admin or coach of the team
  IF v_inviting_user_role IS NULL OR v_inviting_user_role NOT IN ('admin', 'coach') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'You do not have permission to invite users to this team'
    );
  END IF;
  
  -- Validate role restrictions (coaches can't invite admins)
  IF v_inviting_user_role = 'coach' AND p_role = 'admin' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Coaches cannot invite users as administrators'
    );
  END IF;
  
  -- Get team and club information for email context
  SELECT t.name, c.long_name
  INTO v_team_name, v_club_name
  FROM team t
  LEFT JOIN club c ON t.club_id = c.id
  WHERE t.id = p_team_id;
  
  IF v_team_name IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Team not found'
    );
  END IF;
  
  -- Check if user is already a team member
  IF EXISTS (
    SELECT 1 FROM team_user tu 
    JOIN auth.users u ON tu.user_id = u.id
    WHERE tu.team_id = p_team_id 
    AND u.email = LOWER(p_email)
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User is already a member of this team'
    );
  END IF;
  
  -- **UPDATED LOGIC**: Check for existing pending invitation and handle refresh
  SELECT id, expires_at 
  INTO v_existing_invitation_id, v_existing_expires_at
  FROM team_invitation 
  WHERE team_id = p_team_id 
  AND LOWER(email) = LOWER(p_email)
  AND status = 'pending';
  
  IF v_existing_invitation_id IS NOT NULL THEN
    -- An existing pending invitation exists - refresh it with new expiry date
    v_is_refresh := true;
    
    UPDATE team_invitation 
    SET expires_at = NOW() + INTERVAL '1 day',  -- **CHANGED**: Extend for 24 hours instead of 7 days
        updated_at = NOW(),
        message = COALESCE(p_message, message),  -- Update message if provided
        invited_by_user_id = v_inviting_user_id,  -- Update who sent the latest invitation
        role = p_role  -- Update role in case it changed
    WHERE id = v_existing_invitation_id
    RETURNING * INTO v_invitation_record;
    
    v_invitation_id := v_existing_invitation_id;
    
    RAISE NOTICE 'Refreshed existing invitation % for % to team %', v_invitation_id, p_email, v_team_name;
  ELSE
    -- No existing invitation - create a new one (will use new 24-hour default)
    INSERT INTO team_invitation (
      team_id,
      invited_by_user_id,
      email,
      role,
      message,
      status
    ) VALUES (
      p_team_id,
      v_inviting_user_id,
      LOWER(p_email),
      p_role,
      COALESCE(p_message, ''),
      'pending'
    ) RETURNING * INTO v_invitation_record;
    
    v_invitation_id := v_invitation_record.id;
    
    RAISE NOTICE 'Created new invitation % for % to team %', v_invitation_id, p_email, v_team_name;
  END IF;
  
  -- Construct the redirect URL with invitation context
  DECLARE
    v_final_redirect_url TEXT;
    v_team_display_name TEXT;
    v_success_message TEXT;
  BEGIN
    -- Create team display name
    v_team_display_name := CASE 
      WHEN v_club_name IS NOT NULL AND v_club_name != '' THEN 
        v_club_name || ' ' || v_team_name
      ELSE 
        v_team_name
    END;
    
    -- Build redirect URL
    IF p_redirect_url IS NOT NULL THEN
      v_final_redirect_url := p_redirect_url || '&invitation_id=' || v_invitation_id::text;
    ELSE
      v_final_redirect_url := 'https://your-app-domain.com/?invitation=true&team=' || p_team_id::text || '&role=' || p_role || '&invitation_id=' || v_invitation_id::text;
    END IF;
    
    -- Create appropriate success message
    IF v_is_refresh THEN
      v_success_message := 'Invitation refreshed and sent successfully';
    ELSE
      v_success_message := 'Invitation sent successfully';
    END IF;
    
    -- Build response with refresh indicator
    v_result := json_build_object(
      'success', true,
      'invitation_id', v_invitation_id,
      'email', p_email,
      'team_name', v_team_display_name,
      'role', p_role,
      'message', v_success_message,
      'redirect_url', v_final_redirect_url,
      'is_refresh', v_is_refresh
    );
    
    -- Log the invitation for debugging
    RAISE NOTICE 'Team invitation sent: % to % for team % as %', v_invitation_id, p_email, v_team_display_name, p_role;
    
    RETURN v_result;
    
  EXCEPTION WHEN OTHERS THEN
    -- If email sending fails, mark invitation as failed
    UPDATE team_invitation 
    SET status = 'cancelled', updated_at = NOW()
    WHERE id = v_invitation_id;
    
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to send invitation email: ' || SQLERRM
    );
  END;

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', 'Unexpected error: ' || SQLERRM
  );
END;
$$;

-- ========================================
-- Optional: Update Existing Pending Invitations
-- ========================================

-- **OPTIONAL**: Uncomment the following to update existing pending invitations
-- to the new 24-hour expiry period. This is optional and can be skipped if you
-- want to preserve existing longer invitation periods.

-- UPDATE team_invitation 
-- SET expires_at = NOW() + INTERVAL '1 day',
--     updated_at = NOW()
-- WHERE status = 'pending' 
-- AND expires_at > NOW() + INTERVAL '1 day';

-- ========================================
-- Comments and Completion
-- ========================================

COMMENT ON COLUMN team_invitation.expires_at IS 'Invitation expires after 24 hours to match email link expiration';
COMMENT ON FUNCTION invite_user_to_team IS 'Invites a user to join a team via email. Invitations expire in 24 hours. Refreshes existing pending invitations if they exist.';

-- Migration completed successfully
-- - Table default changed from 7 days to 24 hours
-- - Function updated to use 24 hours for refreshes
-- - All future invitations will expire in 24 hours