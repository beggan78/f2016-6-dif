/**
 * Utility functions for handling password reset tokens and URL parameters
 */

/**
 * Detects if the current URL contains password reset tokens or codes
 * @returns {Object} Object with detection results and token/code data
 */
export function detectResetTokens() {
  const urlParams = new URLSearchParams(window.location.search);
  
  // Check for password reset tokens (from direct Supabase auth redirect)
  const accessToken = urlParams.get('access_token');
  const refreshToken = urlParams.get('refresh_token');
  const type = urlParams.get('type');
  const hasTokens = !!(accessToken && refreshToken && type === 'recovery');
  
  // Check for magic link code (from email reset links)
  const code = urlParams.get('code');
  const hasCode = !!code;
  
  return {
    hasTokens: hasTokens || hasCode,
    format: hasTokens ? 'tokens' : (hasCode ? 'code' : null),
    tokens: {
      accessToken,
      refreshToken,
      type
    },
    code: code
  };
}

/**
 * Clears password reset parameters from the URL without triggering a page reload
 */
export function clearResetTokensFromUrl() {
  if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
    const url = new URL(window.location);
    url.searchParams.delete('access_token');
    url.searchParams.delete('refresh_token');
    url.searchParams.delete('type');
    url.searchParams.delete('code');
    
    window.history.replaceState({}, document.title, url.toString());
  }
}

/**
 * Checks if the user is currently authenticated via a password reset session
 * This helps distinguish between normal authenticated users and users who just clicked a reset link
 * @param {Object} user - The current user object from Supabase
 * @returns {boolean} True if this appears to be a password reset session
 */
export function isPasswordResetSession(user) {
  // Check if we have reset tokens or code in URL
  const { hasTokens } = detectResetTokens();
  
  // Return true if:
  // 1. User is authenticated AND
  // 2. We have reset tokens/codes OR the URL was just cleaned up but user is newly authenticated
  return hasTokens && !!user;
}

/**
 * Checks if we should automatically show the password reset modal
 * @param {Object} user - Current user object  
 * @returns {boolean} True if password reset modal should be shown
 */
export function shouldShowPasswordResetModal(user) {
  const { hasTokens } = detectResetTokens();
  
  // Show modal if we have reset tokens/codes
  if (hasTokens) return true;
  
  // Also check if user just became authenticated and this might be from a magic link
  // (URL might have been cleaned up already)
  if (user && typeof window !== 'undefined') {
    // Check if we recently had a code parameter (could indicate magic link auth)
    const urlHasResetPath = window.location.pathname.includes('reset') || 
                           window.location.search.includes('password');
    return urlHasResetPath;
  }
  
  return false;
}