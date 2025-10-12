import { supabase } from '../lib/supabase';
import { createGamePersistenceManager } from '../utils/persistenceManager';
import { STORAGE_KEYS } from '../constants/storageKeys';

/**
 * Service for detecting and managing recoverable matches on login
 *
 * Helps users recover finished matches that weren't saved to history
 * by detecting them from localStorage and offering recovery options.
 */

// Initialize persistence manager for accessing localStorage
const persistenceManager = createGamePersistenceManager(STORAGE_KEYS.GAME_STATE);

/**
 * Check if there's a recoverable match for the current user
 * 
 * A match is recoverable if:
 * - currentMatchId exists in localStorage
 * - Match exists in database with state 'finished'
 * - Match was created by the current user
 * 
 * @returns {Promise<{success: boolean, match?: Object, error?: string}>}
 */
export async function checkForRecoverableMatch() {
  try {
    // Load state from localStorage
    const gameState = persistenceManager.loadState();
    const currentMatchId = gameState.currentMatchId;

    if (!currentMatchId) {
        return { success: true, match: null };
    }


    // Query database for the match
    const { data: match, error } = await supabase
      .from('match')
      .select('*')
      .eq('id', currentMatchId)
      .is('deleted_at', null)
      .eq('state', 'finished') // Only finished matches can be recovered
      .single();

    if (error) {
      // If match not found or not accessible, it's not recoverable
      if (error.code === 'PGRST116') {
        return { success: true, match: null };
      }
      
      console.error('❌ Error checking for recoverable match:', error);
      return {
        success: false,
        error: `Database error: ${error.message}`
      };
    }


    return {
      success: true,
      match: match
    };

  } catch (error) {
    console.error('❌ Exception while checking for recoverable match:', error);
    return {
      success: false,
      error: `Unexpected error: ${error.message}`
    };
  }
}

/**
 * Delete an abandoned match from the database
 * 
 * @param {string} matchId - The ID of the match to delete
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteAbandonedMatch(matchId) {
  try {
    if (!matchId) {
      return {
        success: false,
        error: 'Match ID is required'
      };
    }


    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from('match')
      .update({
        deleted_at: nowIso
      })
      .eq('id', matchId)
      .eq('state', 'finished')
      .is('deleted_at', null);

    if (error) {
      console.error('❌ Failed to delete abandoned match:', error);
      return {
        success: false,
        error: `Database error: ${error.message}`
      };
    }


    return { success: true };

  } catch (error) {
    console.error('❌ Exception while deleting abandoned match:', error);
    return {
      success: false,
      error: `Unexpected error: ${error.message}`
    };
  }
}

/**
 * Get match statistics from localStorage for recovery
 * 
 * @deprecated This function is no longer needed as player_match_stats are stored in database when match is created
 * @returns {Object|null} Match statistics or null if not available
 */
export function getRecoveryMatchData() {
  try {
    const gameState = persistenceManager.loadState();
    
    // Return relevant data needed for match recovery
    return {
      allPlayers: gameState.allPlayers || [],
      goalScorers: gameState.goalScorers || {},
      matchEvents: gameState.matchEvents || [],
      currentMatchId: gameState.currentMatchId,
      ownScore: gameState.ownScore || 0,
      opponentScore: gameState.opponentScore || 0,
      opponentTeam: gameState.opponentTeam || '',
      captainId: gameState.captainId || null
    };
  } catch (error) {
    console.error('❌ Error getting recovery match data:', error);
    return null;
  }
}

/**
 * Validate that localStorage data matches the database match
 * 
 * @deprecated This function is no longer needed as player_match_stats are stored in database when match is created
 * @param {Object} match - Match from database
 * @param {Object} localData - Data from localStorage
 * @returns {boolean} True if data appears consistent
 */
export function validateRecoveryData(match, localData) {
  if (!match || !localData) {
    return false;
  }

  // Basic validation checks
  const checks = [
    // Match ID should match
    match.id === localData.currentMatchId,
    
    // Should have some players data
    localData.allPlayers && Array.isArray(localData.allPlayers) && localData.allPlayers.length > 0,
    
    // Scores should be reasonable (not negative)
    typeof localData.ownScore === 'number' && localData.ownScore >= 0,
    typeof localData.opponentScore === 'number' && localData.opponentScore >= 0
  ];

  const isValid = checks.every(check => check === true);
  

  return isValid;
}
