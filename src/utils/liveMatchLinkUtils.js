/**
 * Live Match Link Utilities
 *
 * Shared functions for generating and copying live match URLs.
 * Used by ConfigurationScreen and HamburgerMenu for consistent behavior.
 */

/**
 * Generate live match URL
 * @param {string} matchId - Match ID (UUID)
 * @returns {string} Live match URL
 * @throws {Error} If matchId is not provided
 */
export function generateLiveMatchUrl(matchId) {
  if (!matchId) {
    throw new Error('Match ID is required to generate live match URL');
  }
  return `${window.location.origin}/live/${matchId}`;
}

/**
 * Copy live match URL to clipboard
 *
 * Attempts to copy the URL to clipboard using the Clipboard API.
 * If the Clipboard API is not available or fails, returns the URL
 * for fallback display in a modal.
 *
 * @param {string} matchId - Match ID (UUID)
 * @returns {Promise<{success: boolean, url: string, error?: string}>}
 */
export async function copyLiveMatchUrlToClipboard(matchId) {
  try {
    const url = generateLiveMatchUrl(matchId);

    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
      return { success: true, url };
    } else {
      // Fallback for browsers without Clipboard API
      return {
        success: false,
        url,
        error: 'Clipboard API not available'
      };
    }
  } catch (error) {
    console.error('Failed to copy live match URL:', error);
    const url = generateLiveMatchUrl(matchId);
    return {
      success: false,
      url,
      error: error.message
    };
  }
}
