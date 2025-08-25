import { supabase } from '../lib/supabase';
import { createGamePersistenceManager } from '../utils/persistenceManager';

/**
 * Service for detecting and managing recoverable matches on login
 * 
 * Helps users recover finished matches that weren't saved to history
 * by detecting them from localStorage and offering recovery options.
 */

// Initialize persistence manager for accessing localStorage
const persistenceManager = createGamePersistenceManager('dif-coach-game-state');

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
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 No currentMatchId in localStorage, no recovery needed');
      }
      return { success: true, match: null };
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Checking for recoverable match:', currentMatchId);
    }

    // Query database for the match
    const { data: match, error } = await supabase
      .from('match')
      .select('*')
      .eq('id', currentMatchId)
      .eq('state', 'finished') // Only finished matches can be recovered
      .single();

    if (error) {
      // If match not found or not accessible, it's not recoverable
      if (error.code === 'PGRST116') {
        if (process.env.NODE_ENV === 'development') {
          console.log('🚫 Match not found or not accessible for recovery');
        }
        return { success: true, match: null };
      }
      
      console.error('❌ Error checking for recoverable match:', error);
      return {
        success: false,
        error: `Database error: ${error.message}`
      };
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Recoverable match found:', {
        matchId: match.id,
        opponent: match.opponent,
        finishedAt: match.finished_at,
        outcome: match.outcome
      });
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

    if (process.env.NODE_ENV === 'development') {
      console.log('🗑️ Deleting abandoned match:', matchId);
    }

    const { error } = await supabase
      .from('match')
      .delete()
      .eq('id', matchId);

    if (error) {
      console.error('❌ Failed to delete abandoned match:', error);
      return {
        success: false,
        error: `Database error: ${error.message}`
      };
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Successfully deleted abandoned match');
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
  
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Recovery data validation:', {
      isValid,
      matchId: match.id,
      localMatchId: localData.currentMatchId,
      playersCount: localData.allPlayers?.length,
      scores: `${localData.ownScore}-${localData.opponentScore}`
    });
  }

  return isValid;
}