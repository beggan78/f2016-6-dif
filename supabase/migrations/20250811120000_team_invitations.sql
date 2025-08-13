-- Team Invitations Migration
-- This migration creates the complete team invitation system including table, functions, and policies

-- ========================================
-- Team Invitations Table
-- ========================================

CREATE TABLE team_invitation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Team and user references
  team_id UUID REFERENCES team(id) ON DELETE CASCADE NOT NULL,
  invited_by_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invited_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Set when invitation is accepted
  
  -- Invitation details
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'coach', 'parent', 'player')),
  message TEXT DEFAULT '',
  
  -- Invitation status and tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days') NOT NULL
);

-- ========================================
-- Indexes for Performance
-- ========================================

CREATE INDEX idx_team_invitation_team_id ON team_invitation(team_id);
CREATE INDEX idx_team_invitation_email ON team_invitation(email);
CREATE INDEX idx_team_invitation_invited_by ON team_invitation(invited_by_user_id);
CREATE INDEX idx_team_invitation_status ON team_invitation(status);
CREATE INDEX idx_team_invitation_expires_at ON team_invitation(expires_at);

-- Unique constraint to prevent duplicate pending invitations
CREATE UNIQUE INDEX idx_team_invitation_unique_pending 
ON team_invitation(team_id, email, status) 
WHERE status = 'pending';

-- ========================================
-- Row Level Security (RLS) Policies
-- ========================================

ALTER TABLE team_invitation ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view invitations for teams they admin/coach
CREATE POLICY "Users can view team invitations they sent" ON team_invitation
  FOR SELECT USING (
    invited_by_user_id = auth.uid()
  );

-- Policy: Users can view invitations for teams they manage
CREATE POLICY "Team managers can view team invitations" ON team_invitation
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_user tu
      WHERE tu.team_id = team_invitation.team_id 
      AND tu.user_id = auth.uid()
      AND tu.role IN ('admin', 'coach')
    )
  );

-- Policy: Only team admins/coaches can insert invitations
CREATE POLICY "Team managers can send invitations" ON team_invitation
  FOR INSERT WITH CHECK (
    invited_by_user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM team_user tu
      WHERE tu.team_id = team_invitation.team_id 
      AND tu.user_id = auth.uid()
      AND tu.role IN ('admin', 'coach')
    )
  );

-- Policy: Users can update invitations they sent
CREATE POLICY "Users can update invitations they sent" ON team_invitation
  FOR UPDATE USING (
    invited_by_user_id = auth.uid()
  );

-- ========================================
-- Helper Functions and Triggers
-- ========================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_team_invitation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_team_invitation_updated_at
  BEFORE UPDATE ON team_invitation
  FOR EACH ROW
  EXECUTE FUNCTION update_team_invitation_updated_at();

-- Function to automatically expire old invitations
CREATE OR REPLACE FUNCTION expire_old_team_invitations()
RETURNS void AS $$
BEGIN
  UPDATE team_invitation
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending' 
  AND expires_at < NOW();
END;
$$ language 'plpgsql';

-- ========================================
-- Main Functions
-- ========================================

-- Function: invite_user_to_team
-- This function handles inviting users to join teams via email using Supabase's built-in inviteUserByEmail
-- Updated to handle invitation refresh when email links expire but team invitations are still valid
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
  
  -- **NEW LOGIC**: Check for existing pending invitation and handle refresh
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
    SET expires_at = NOW() + INTERVAL '7 days',  -- Extend for another 7 days
        updated_at = NOW(),
        message = COALESCE(p_message, message),  -- Update message if provided
        invited_by_user_id = v_inviting_user_id,  -- Update who sent the latest invitation
        role = p_role  -- Update role in case it changed
    WHERE id = v_existing_invitation_id
    RETURNING * INTO v_invitation_record;
    
    v_invitation_id := v_existing_invitation_id;
    
    RAISE NOTICE 'Refreshed existing invitation % for % to team %', v_invitation_id, p_email, v_team_name;
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

-- Function: accept_team_invitation
-- This function handles accepting team invitations and adding users to teams
CREATE OR REPLACE FUNCTION accept_team_invitation(
  p_invitation_id UUID,
  p_user_email TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_invitation_record RECORD;
  v_team_name TEXT;
  v_club_name TEXT;
  v_result JSON;
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
  
  -- Validate input parameters
  IF p_invitation_id IS NULL OR p_user_email IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invitation ID and email are required'
    );
  END IF;
  
  -- Get the invitation details
  SELECT * INTO v_invitation_record
  FROM team_invitation
  WHERE id = p_invitation_id;
  
  -- Check if invitation exists
  IF v_invitation_record.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invitation not found'
    );
  END IF;
  
  -- Validate that the email matches the invitation
  IF LOWER(v_invitation_record.email) != LOWER(p_user_email) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Email address does not match invitation'
    );
  END IF;
  
  -- Check if invitation is still valid
  IF v_invitation_record.status != 'pending' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invitation is no longer valid (status: ' || v_invitation_record.status || ')'
    );
  END IF;
  
  -- Check if invitation has expired
  IF v_invitation_record.expires_at < NOW() THEN
    -- Mark as expired
    UPDATE team_invitation
    SET status = 'expired', updated_at = NOW()
    WHERE id = p_invitation_id;
    
    RETURN json_build_object(
      'success', false,
      'error', 'Invitation has expired'
    );
  END IF;
  
  -- Check if user is already a member of this team
  IF EXISTS (
    SELECT 1 FROM team_user tu
    WHERE tu.team_id = v_invitation_record.team_id
    AND tu.user_id = v_user_id
  ) THEN
    -- Mark invitation as accepted since user is already in team
    UPDATE team_invitation
    SET status = 'accepted', 
        invited_user_id = v_user_id,
        accepted_at = NOW(),
        updated_at = NOW()
    WHERE id = p_invitation_id;
    
    RETURN json_build_object(
      'success', true,
      'message', 'You are already a member of this team'
    );
  END IF;
  
  -- Add user to the team
  BEGIN
    INSERT INTO team_user (team_id, user_id, role, created_at)
    VALUES (
      v_invitation_record.team_id,
      v_user_id,
      v_invitation_record.role::user_role,
      NOW()
    );
    
    -- Add user to the club as well (required for RLS permissions)
    INSERT INTO club_user (club_id, user_id, role, status, created_at)
    SELECT 
      t.club_id,
      v_user_id,
      'member'::club_user_role,
      'active'::club_user_status,
      NOW()
    FROM team t
    WHERE t.id = v_invitation_record.team_id
    ON CONFLICT (club_id, user_id) DO NOTHING;  -- Ignore if already a club member
    
    -- Mark invitation as accepted
    UPDATE team_invitation
    SET status = 'accepted',
        invited_user_id = v_user_id,
        accepted_at = NOW(),
        updated_at = NOW()
    WHERE id = p_invitation_id;
    
    -- Get team and club names for response
    SELECT t.name, c.long_name
    INTO v_team_name, v_club_name
    FROM team t
    LEFT JOIN club c ON t.club_id = c.id
    WHERE t.id = v_invitation_record.team_id;
    
    -- Build success response
    v_result := json_build_object(
      'success', true,
      'message', 'Successfully joined ' || COALESCE(v_club_name || ' ', '') || v_team_name || ' as ' || v_invitation_record.role,
      'team_id', v_invitation_record.team_id,
      'team_name', v_team_name,
      'club_name', v_club_name,
      'role', v_invitation_record.role,
      'user_id', v_user_id
    );
    
    -- Log the successful invitation acceptance
    RAISE NOTICE 'User % accepted invitation % for team %', v_user_id, p_invitation_id, v_invitation_record.team_id;
    
    RETURN v_result;
    
  EXCEPTION WHEN unique_violation THEN
    -- User already exists in team (race condition)
    UPDATE team_invitation
    SET status = 'accepted',
        invited_user_id = v_user_id,
        accepted_at = NOW(),
        updated_at = NOW()
    WHERE id = p_invitation_id;
    
    RETURN json_build_object(
      'success', true,
      'message', 'You are already a member of this team'
    );
    
  WHEN OTHERS THEN
    -- Mark invitation as failed and return error
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to add user to team: ' || SQLERRM
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
-- Function Permissions
-- ========================================

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION invite_user_to_team TO authenticated;
GRANT EXECUTE ON FUNCTION accept_team_invitation TO authenticated;

-- ========================================
-- Function Comments
-- ========================================

COMMENT ON FUNCTION invite_user_to_team IS 'Invites a user to join a team via email using Supabase authentication system. Refreshes existing pending invitations if they exist.';
COMMENT ON FUNCTION accept_team_invitation IS 'Accepts a team invitation and adds the user to the specified team';

-- Optional: Create a scheduled job to clean up expired invitations
-- This would run daily to mark expired invitations
-- SELECT cron.schedule('expire-invitations', '0 0 * * *', 'SELECT expire_old_team_invitations();');