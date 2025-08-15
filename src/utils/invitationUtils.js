/**
 * Utility functions for handling team invitations via URL parameters
 */

/**
 * Detect invitation parameters in the current URL
 * Handles both custom invitation parameters and Supabase auth tokens
 * @returns {Object} Object containing invitation detection results
 */
export const detectInvitationParams = () => {
  if (typeof window === 'undefined') return { hasInvitation: false };

  // Check query parameters (our custom invitation format)
  const urlParams = new URLSearchParams(window.location.search);
  const invitation = urlParams.get('invitation');
  const teamId = urlParams.get('team');
  const role = urlParams.get('role');
  const invitationId = urlParams.get('invitation_id');

  // Check URL fragment for Supabase auth tokens (invitation links)
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const accessToken = hashParams.get('access_token');
  const tokenType = hashParams.get('token_type');
  const expiresIn = hashParams.get('expires_in');
  const refreshToken = hashParams.get('refresh_token');

  // Determine invitation type - explicitly return boolean values
  const hasCustomInvitation = !!(invitation === 'true' && teamId && role);
  const hasSupabaseInvitation = !!(accessToken && tokenType === 'bearer');
  const hasInvitation = hasCustomInvitation || hasSupabaseInvitation;

  return {
    hasInvitation,
    teamId,
    role,
    invitationId,
    // Supabase auth tokens (for account completion)
    accessToken,
    tokenType,
    expiresIn,
    refreshToken,
    // Type flags
    isSupabaseInvitation: hasSupabaseInvitation,
    isCustomInvitation: hasCustomInvitation,
    params: {
      invitation,
      teamId,
      role,
      invitationId,
      accessToken,
      tokenType,
      expiresIn,
      refreshToken
    }
  };
};

/**
 * Clear invitation parameters from the URL
 * This helps clean up the URL after processing the invitation
 */
export const clearInvitationParamsFromUrl = () => {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location);
  const params = url.searchParams;
  
  // Remove invitation-related query parameters
  params.delete('invitation');
  params.delete('team');
  params.delete('role');
  params.delete('invitation_id');
  
  // Clear URL fragment (auth tokens)
  const newUrl = params.toString() ? `${url.pathname}?${params.toString()}` : url.pathname;
  window.history.replaceState({}, '', newUrl);
};

/**
 * Check if the current user is in an invitation acceptance flow
 * @param {Object} user - Current authenticated user
 * @param {Object} invitationParams - Invitation parameters from URL
 * @returns {boolean} True if user should be guided through invitation acceptance
 */
export const shouldProcessInvitation = (user, invitationParams) => {
  // Must have valid invitation parameters
  if (!invitationParams.hasInvitation) {
    return false;
  }
  
  // For Supabase invitations, user should be automatically authenticated after clicking email
  // For custom invitations, user must be authenticated
  if (!user && invitationParams.isCustomInvitation) {
    return false;
  }
  
  // We should process the invitation if we have team context
  return !!(invitationParams.teamId && invitationParams.role && invitationParams.invitationId);
};

/**
 * Check if user needs to complete account setup for Supabase invitation
 * @param {Object} invitationParams - Invitation parameters from URL
 * @param {Object} user - Current authenticated user (optional)
 * @returns {boolean} True if user needs to set password/complete signup
 */
export const needsAccountCompletion = (invitationParams, user = null) => {
  if (!invitationParams.isSupabaseInvitation || !invitationParams.accessToken) {
    return false;
  }
  
  // If no user is provided, assume account completion is needed
  if (!user) {
    return true;
  }
  
  // Check if this is a fresh invitation user who hasn't set a password yet
  // Users invited via email have invited_at timestamp but no confirmed_at initially
  // After clicking the email link, they get confirmed_at but still need password
  const invitedAt = user.invited_at;
  const confirmedAt = user.confirmed_at;
  const lastSignInAt = user.last_sign_in_at;
  
  // If user was invited and this is their first sign-in, they likely need password setup
  if (invitedAt && confirmedAt && lastSignInAt) {
    const confirmedTime = new Date(confirmedAt).getTime();
    const signInTime = new Date(lastSignInAt).getTime();
    
    // If confirmed and last sign-in times are very close (within 1 minute), 
    // this is likely a fresh invitation user who just clicked the email link
    const timeDiff = Math.abs(signInTime - confirmedTime);
    return timeDiff < 60000; // Less than 1 minute difference
  }
  
  return false;
};

/**
 * Get user-friendly invitation status for display
 * @param {Object} user - Current authenticated user
 * @param {Object} invitationParams - Invitation parameters from URL
 * @returns {Object} Status information for UI
 */
export const getInvitationStatus = (user, invitationParams) => {
  if (!invitationParams.hasInvitation) {
    return { type: 'none' };
  }

  // Check if user needs account completion (including authenticated users who need password)
  if (needsAccountCompletion(invitationParams, user)) {
    return { 
      type: 'account_setup',
      message: 'Complete your account setup to join the team'
    };
  }

  if (invitationParams.isCustomInvitation && !user) {
    return {
      type: 'sign_in_required', 
      message: 'Sign in to accept your team invitation'
    };
  }

  if (user && shouldProcessInvitation(user, invitationParams)) {
    return {
      type: 'ready_to_process',
      message: 'Processing your team invitation...'
    };
  }

  return { type: 'unknown' };
};

/**
 * Get invitation context for display purposes
 * @param {Object} invitationParams - Invitation parameters from URL
 * @returns {Object} Formatted invitation context
 */
export const getInvitationContext = (invitationParams) => {
  if (!invitationParams.hasInvitation) {
    return null;
  }
  
  return {
    teamId: invitationParams.teamId,
    role: invitationParams.role,
    invitationId: invitationParams.invitationId,
    displayRole: formatRoleForDisplay(invitationParams.role)
  };
};

/**
 * Format role string for display
 * @param {string} role - Raw role string
 * @returns {string} Formatted role string
 */
const formatRoleForDisplay = (role) => {
  switch (role?.toLowerCase()) {
    case 'admin':
      return 'Administrator';
    case 'coach':
      return 'Coach';
    case 'parent':
      return 'Parent';
    case 'player':
      return 'Player';
    default:
      return role || 'Member';
  }
};

/**
 * Store pending invitation details for processing after sign-in
 * @param {Object} invitationDetails - Invitation details to store
 */
export const storePendingInvitation = (invitationDetails) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('pendingInvitation', JSON.stringify(invitationDetails));
    console.log('Stored pending invitation:', invitationDetails);
  } catch (error) {
    console.error('Failed to store pending invitation:', error);
  }
};

/**
 * Retrieve and clear pending invitation details
 * @returns {Object|null} Stored invitation details or null
 */
export const retrievePendingInvitation = () => {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem('pendingInvitation');
    if (stored) {
      const invitation = JSON.parse(stored);
      localStorage.removeItem('pendingInvitation'); // Clear after retrieval
      console.log('Retrieved pending invitation:', invitation);
      return invitation;
    }
  } catch (error) {
    console.error('Failed to retrieve pending invitation:', error);
    // Clear corrupted data
    localStorage.removeItem('pendingInvitation');
  }
  
  return null;
};

/**
 * Check if there's a pending invitation waiting to be processed
 * @returns {boolean} True if pending invitation exists
 */
export const hasPendingInvitation = () => {
  if (typeof window === 'undefined') return false;
  
  try {
    return !!localStorage.getItem('pendingInvitation');
  } catch (error) {
    return false;
  }
};