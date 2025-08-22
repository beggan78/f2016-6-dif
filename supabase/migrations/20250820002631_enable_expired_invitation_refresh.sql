-- Complete Team Invitation Expiry Management Migration
-- Combines automatic expiry system with expired invitation refresh capabilities
-- This migration sets up comprehensive invitation lifecycle management

-- ========================================
-- Enhanced Expiry Function with Logging
-- ========================================

-- Drop existing function first to allow return type change
DROP FUNCTION IF EXISTS expire_old_team_invitations();

-- Create enhanced version with logging and return values
CREATE FUNCTION expire_old_team_invitations()
RETURNS TABLE(expired_count INTEGER, cleaned_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expired_count INTEGER := 0;
  v_cleaned_count INTEGER := 0;
BEGIN
  -- Mark expired invitations as 'expired'
  UPDATE team_invitation
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending' 
  AND expires_at < NOW();
  
  GET DIAGNOSTICS v_expired_count = ROW_COUNT;
  
  -- Clean up very old expired/cancelled invitations (older than 30 days)
  -- This helps keep the table size manageable
  DELETE FROM team_invitation
  WHERE status IN ('expired', 'cancelled')
  AND updated_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS v_cleaned_count = ROW_COUNT;
  
  -- Log the operation
  RAISE NOTICE 'Invitation expiry job completed: % marked as expired, % cleaned up', v_expired_count, v_cleaned_count;
  
  RETURN QUERY SELECT v_expired_count, v_cleaned_count;
END;
$$;

-- ========================================
-- Set up Automatic Expiry Job
-- ========================================

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the expiry job to run every hour
-- This ensures invitations are marked as expired within 1 hour of expiry
SELECT cron.schedule(
  'expire-team-invitations',           -- job name
  '0 * * * *',                        -- cron expression: every hour at minute 0
  'SELECT expire_old_team_invitations();'  -- SQL command
);

-- ========================================
-- Helper Function for Manual Expiry Check
-- ========================================

-- Function to check expiry status without changing anything
CREATE OR REPLACE FUNCTION check_invitation_expiry_status()
RETURNS TABLE(
  total_invitations INTEGER,
  pending_valid INTEGER,
  pending_expired INTEGER,
  expired_marked INTEGER,
  accepted INTEGER,
  cancelled INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total INTEGER := 0;
  v_pending_valid INTEGER := 0;
  v_pending_expired INTEGER := 0;
  v_expired_marked INTEGER := 0;
  v_accepted INTEGER := 0;
  v_cancelled INTEGER := 0;
BEGIN
  -- Count total invitations
  SELECT COUNT(*) INTO v_total FROM team_invitation;
  
  -- Count pending valid invitations
  SELECT COUNT(*) INTO v_pending_valid 
  FROM team_invitation 
  WHERE status = 'pending' AND expires_at > NOW();
  
  -- Count pending but expired invitations (these should be cleaned up)
  SELECT COUNT(*) INTO v_pending_expired 
  FROM team_invitation 
  WHERE status = 'pending' AND expires_at <= NOW();
  
  -- Count properly marked expired invitations
  SELECT COUNT(*) INTO v_expired_marked 
  FROM team_invitation 
  WHERE status = 'expired';
  
  -- Count accepted invitations
  SELECT COUNT(*) INTO v_accepted 
  FROM team_invitation 
  WHERE status = 'accepted';
  
  -- Count cancelled invitations
  SELECT COUNT(*) INTO v_cancelled 
  FROM team_invitation 
  WHERE status = 'cancelled';
  
  RETURN QUERY SELECT v_total, v_pending_valid, v_pending_expired, v_expired_marked, v_accepted, v_cancelled;
END;
$$;

-- ========================================
-- Enhanced invite_user_to_team Function
-- ========================================

-- Replace the function to handle both pending and expired invitations
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
  v_existing_status TEXT;
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
  
  -- **ENHANCED LOGIC**: Check for existing pending OR expired invitation
  SELECT id, expires_at, status 
  INTO v_existing_invitation_id, v_existing_expires_at, v_existing_status
  FROM team_invitation 
  WHERE team_id = p_team_id 
  AND LOWER(email) = LOWER(p_email)
  AND status IN ('pending', 'expired');  -- **CHANGED**: Now includes expired invitations
  
  IF v_existing_invitation_id IS NOT NULL THEN
    -- An existing pending or expired invitation exists - refresh it
    v_is_refresh := true;
    
    UPDATE team_invitation 
    SET expires_at = NOW() + INTERVAL '1 day',  -- Reset to 24 hours from now
        updated_at = NOW(),
        status = 'pending',  -- **NEW**: Reset expired invitations back to pending
        message = COALESCE(p_message, message),  -- Update message if provided
        invited_by_user_id = v_inviting_user_id,  -- Update who sent the latest invitation
        role = CASE 
          WHEN role != p_role THEN p_role  -- Only update if different
          ELSE role  -- Preserve existing role
        END  -- Prevents unintended role changes during refresh
    WHERE id = v_existing_invitation_id
    RETURNING * INTO v_invitation_record;
    
    v_invitation_id := v_existing_invitation_id;
    
    -- Log with status information
    IF v_existing_status = 'expired' THEN
      RAISE NOTICE 'Refreshed expired invitation % for % to team %', v_invitation_id, p_email, v_team_name;
    ELSE
      RAISE NOTICE 'Refreshed pending invitation % for % to team %', v_invitation_id, p_email, v_team_name;
    END IF;
  ELSE
    -- No existing invitation - create a new one
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
      v_final_redirect_url := p_redirect_url || '&invitation_id=' || regexp_replace(v_invitation_id::text, '[^a-zA-Z0-9\-]', '', 'g');
    ELSE
      -- Use proper URL encoding for parameters to prevent URL breaking
      v_final_redirect_url := 'https://your-app-domain.com/?invitation=true&team=' || 
        regexp_replace(p_team_id::text, '[^a-zA-Z0-9\-]', '', 'g') || 
        '&role=' || regexp_replace(p_role, '[^a-zA-Z0-9\-]', '', 'g') || 
        '&invitation_id=' || regexp_replace(v_invitation_id::text, '[^a-zA-Z0-9\-]', '', 'g');
    END IF;
    
    -- Create appropriate success message based on what happened
    IF v_is_refresh THEN
      IF v_existing_status = 'expired' THEN
        v_success_message := 'Expired invitation refreshed and sent successfully';
      ELSE
        v_success_message := 'Invitation refreshed and sent successfully';
      END IF;
    ELSE
      v_success_message := 'Invitation sent successfully';
    END IF;
    
    -- Build response with refresh indicator and original status
    v_result := json_build_object(
      'success', true,
      'invitation_id', v_invitation_id,
      'email', p_email,
      'team_name', v_team_display_name,
      'role', p_role,
      'message', v_success_message,
      'redirect_url', v_final_redirect_url,
      'is_refresh', v_is_refresh,
      'was_expired', COALESCE(v_existing_status = 'expired', false)
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
-- New Function: Delete Team Invitation
-- ========================================

-- Function to permanently delete invitations (for cleanup)
CREATE OR REPLACE FUNCTION delete_team_invitation(
  p_invitation_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_invitation_record RECORD;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- Validate that user is authenticated
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Authentication required'
    );
  END IF;
  
  -- Get invitation details and verify permissions
  SELECT ti.*, tu.role as user_role
  INTO v_invitation_record
  FROM team_invitation ti
  JOIN team_user tu ON ti.team_id = tu.team_id
  WHERE ti.id = p_invitation_id
  AND tu.user_id = v_user_id
  AND tu.role IN ('admin', 'coach');
  
  -- Check if invitation exists and user has permission
  IF v_invitation_record.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invitation not found or insufficient permissions'
    );
  END IF;
  
  -- Only allow deletion of expired, cancelled, or pending invitations
  IF v_invitation_record.status NOT IN ('expired', 'cancelled', 'pending') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot delete accepted invitations'
    );
  END IF;
  
  -- Delete the invitation
  DELETE FROM team_invitation
  WHERE id = p_invitation_id;
  
  RAISE NOTICE 'Deleted invitation % for % from team %', p_invitation_id, v_invitation_record.email, v_invitation_record.team_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Invitation deleted successfully'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', 'Failed to delete invitation: ' || SQLERRM
  );
END;
$$;

-- ========================================
-- Grant Permissions
-- ========================================

-- Grant execute permission to authenticated users for all functions
GRANT EXECUTE ON FUNCTION check_invitation_expiry_status TO authenticated;
GRANT EXECUTE ON FUNCTION expire_old_team_invitations TO authenticated;
GRANT EXECUTE ON FUNCTION delete_team_invitation TO authenticated;

-- ========================================
-- Comments and Documentation
-- ========================================

COMMENT ON FUNCTION expire_old_team_invitations IS 'Automatically marks expired invitations as expired and cleans up old records. Returns count of processed invitations.';
COMMENT ON FUNCTION check_invitation_expiry_status IS 'Returns statistics about invitation expiry status for monitoring purposes.';
COMMENT ON FUNCTION invite_user_to_team IS 'Invites a user to join a team via email. Can refresh both pending and expired invitations. Invitations expire in 24 hours.';
COMMENT ON FUNCTION delete_team_invitation IS 'Permanently deletes team invitations. Only allows deletion of non-accepted invitations by team admins/coaches.';

-- ========================================
-- Initial Cleanup and Final Setup
-- ========================================

-- Run the expiry function once immediately to clean up any existing expired invitations
SELECT expire_old_team_invitations();

-- Final completion messages
DO $$
BEGIN
  RAISE NOTICE 'Complete invitation expiry management system setup completed successfully';
  RAISE NOTICE 'Features enabled:';
  RAISE NOTICE '  - Automatic expiry job running every hour';
  RAISE NOTICE '  - Expired invitation refresh capability';
  RAISE NOTICE '  - Invitation deletion for cleanup';
  RAISE NOTICE '  - Enhanced logging and monitoring';
  RAISE NOTICE '  - Old invitation cleanup after 30 days';
END;
$$;