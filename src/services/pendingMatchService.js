/**
 * Pending Match Service
 * 
 * Handles loading, reconstructing, and managing pending matches that users
 * created but haven't started yet. Provides functionality to resume matches
 * with complete configuration restoration from database.
 */

import { supabase } from '../lib/supabase';
import { MATCH_DEFAULTS, ERROR_MESSAGES } from '../constants/matchDefaults';
import { validateMatchData, validatePlayerStats } from '../utils/validationHelpers';
import { formatDatabaseError, createServiceError } from '../utils/errorFormatting';

/**
 * Load complete pending match data from database
 * 
 * @param {string} matchId - Match ID to load
 * @returns {Promise<{success: boolean, matchData?, playerStats?, error?: string}>}
 */
export async function loadPendingMatchData(matchId) {
  try {
    if (!matchId) {
      return createServiceError(ERROR_MESSAGES.MATCH_ID_REQUIRED);
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('📥 Loading pending match data:', matchId);
    }

    // Load match record
    const { data: matchData, error: matchError } = await supabase
      .from('match')
      .select('*')
      .eq('id', matchId)
      .eq('state', 'pending')
      .single();

    if (matchError) {
      return createServiceError(
        formatDatabaseError(matchError),
        matchError,
        'loading match data'
      );
    }

    // Validate match data structure
    const matchValidation = validateMatchData(matchData);
    if (!matchValidation.isValid) {
      return createServiceError(
        `Invalid match data: ${matchValidation.issues.join(', ')}`
      );
    }

    // Load associated player match stats
    const { data: playerStats, error: statsError } = await supabase
      .from('player_match_stats')
      .select('*')
      .eq('match_id', matchId)
      .order('player_id');

    if (statsError) {
      return createServiceError(
        formatDatabaseError(statsError),
        statsError,
        'loading player statistics'
      );
    }

    // Validate player stats
    const statsValidation = validatePlayerStats(playerStats);
    if (!statsValidation.isValid) {
      return createServiceError(
        statsValidation.issues.join(', ')
      );
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Pending match data loaded:', {
        matchId,
        opponent: matchData.opponent,
        formation: matchData.formation,
        playerCount: playerStats?.length || 0
      });
    }

    return {
      success: true,
      matchData,
      playerStats: playerStats || []
    };

  } catch (error) {
    return createServiceError(
      ERROR_MESSAGES.UNEXPECTED_ERROR,
      error,
      'loading pending match data'
    );
  }
}


/**
 * Transform pairs formation format to individual position format for UI display
 * Converts {leftPair: {defender: 'id', attacker: 'id'}} to {leftDefender: 'id', leftAttacker: 'id'}
 * 
 * @param {object} formation - Formation data from database (pairs format)
 * @param {object} teamConfig - Team configuration to determine if transformation is needed
 * @returns {object} Formation data in individual position format for UI
 */
function transformPairsFormationToIndividualPositions(formation, teamConfig) {
  if (!formation || !teamConfig) {
    return formation || {};
  }

  // Only transform if this is pairs mode and has pair data
  if (teamConfig.substitutionType === 'pairs' && formation.leftPair) {
    const transformedFormation = {
      ...formation,
      // Convert pair data to individual positions
      leftDefender: formation.leftPair?.defender || null,
      leftAttacker: formation.leftPair?.attacker || null,
      rightDefender: formation.rightPair?.defender || null,
      rightAttacker: formation.rightPair?.attacker || null
    };

    // Handle substitute assignments from subPair if present
    if (formation.subPair) {
      transformedFormation.substitute_1 = formation.subPair.defender || null;
      transformedFormation.substitute_2 = formation.subPair.attacker || null;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 FORMATION TRANSFORM: Converted pairs to individual positions:', {
        original: formation,
        transformed: transformedFormation
      });
    }

    return transformedFormation;
  }

  // Return as-is for individual mode or if no transformation needed
  return formation;
}

/**
 * Load complete game state directly from initial_config JSON
 * 
 * @param {object} matchData - Match record from database with initial_config
 * @param {Array<object>} playerStats - Player match stats from database (for validation)
 * @returns {{teamConfig: object, selectedFormation: string, selectedSquadIds: Array<string>, opponentTeam: string, periods: number, periodDurationMinutes: number, matchType: string, captainId: string|null, currentMatchId: string, formation: object, periodGoalieIds: object}} Complete game state configuration
 * @throws {Error} When matchData is invalid or initial_config is missing
 */
export function loadGameStateFromInitialConfig(matchData, playerStats = []) {
  if (!matchData) {
    throw new Error('Invalid match data provided');
  }

  // Get initial config from database
  const initialConfig = matchData.initial_config || {};

  if (!initialConfig.teamConfig) {
    throw new Error('Missing initial_config.teamConfig in match data');
  }

  // Extract all configuration from initial_config JSON
  const {
    teamConfig,
    matchConfig = {},
    squadSelection = [],
    formation = {},
    periodGoalies = {}
  } = initialConfig;

  // Transform formation data for UI compatibility if needed
  const transformedFormation = transformPairsFormationToIndividualPositions(formation, teamConfig);

  // Build complete game state structure directly from stored config
  const loadedState = {
    // Team configuration (exact as stored)
    teamConfig,
    
    // Formation and squad selection (transformed for UI if needed)
    selectedFormation: teamConfig.formation,
    selectedSquadIds: squadSelection,
    formation: transformedFormation,
    periodGoalieIds: periodGoalies,
    
    // Match configuration (exact as stored)
    opponentTeam: matchConfig.opponentTeam || '',
    periods: matchConfig.periods || MATCH_DEFAULTS.PERIODS,
    periodDurationMinutes: matchConfig.periodDurationMinutes || MATCH_DEFAULTS.PERIOD_DURATION_MINUTES,
    matchType: matchConfig.matchType || MATCH_DEFAULTS.MATCH_TYPE,
    captainId: matchConfig.captainId || null,
    
    // Match state
    currentMatchId: matchData.id
  };

  if (process.env.NODE_ENV === 'development') {
    console.log('📋 Game state loaded directly from initial_config:', {
      matchId: matchData.id,
      teamConfig: loadedState.teamConfig,
      squadSize: squadSelection.length,
      opponent: loadedState.opponentTeam,
      hasFormation: Object.keys(formation).length > 0,
      periodGoalies: Object.keys(periodGoalies).length,
      formationDetails: formation,
      initialConfigRaw: initialConfig
    });
    console.log('🔍 DEBUG: Formation object contents:', JSON.stringify(formation, null, 2));
    console.log('🔍 DEBUG: Initial config structure:', JSON.stringify(initialConfig, null, 2));
  }

  return loadedState;
}

/**
 * Delete pending match and associated player stats
 * 
 * @param {string} matchId - Match ID to delete (must be in pending state)
 * @returns {Promise<{success: boolean, error?: string}>} Operation result with user-friendly error message
 */
export async function deletePendingMatch(matchId) {
  try {
    if (!matchId) {
      return createServiceError(ERROR_MESSAGES.MATCH_ID_REQUIRED);
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('🗑️ Deleting pending match:', matchId);
    }

    // Delete the match (player_match_stats will cascade delete due to foreign key)
    const { error } = await supabase
      .from('match')
      .delete()
      .eq('id', matchId)
      .eq('state', 'pending'); // Safety check: only delete pending matches

    if (error) {
      return createServiceError(
        formatDatabaseError(error),
        error,
        'deleting pending match'
      );
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Successfully deleted pending match');
    }

    return { success: true };

  } catch (error) {
    return createServiceError(
      ERROR_MESSAGES.UNEXPECTED_ERROR,
      error,
      'deleting pending match'
    );
  }
}

/**
 * Validate if current team players match the saved match roster
 * 
 * @param {Array<object>} playerStats - Player stats from saved match with player_id fields
 * @param {Array<object>} currentTeamPlayers - Current team players with id fields
 * @returns {{isValid: boolean, issues: Array<string>, missingPlayerIds: Array<string>, availablePlayerIds: Array<string>, savedPlayerCount: number, currentPlayerCount: number}} Validation result with missing players and issues
 */
export function validatePlayerRoster(playerStats, currentTeamPlayers) {
  if (!Array.isArray(playerStats) || !Array.isArray(currentTeamPlayers)) {
    return {
      isValid: false,
      issues: ['Invalid player data provided'],
      missingPlayers: [],
      availablePlayers: []
    };
  }

  // Get player IDs from saved match
  const savedPlayerIds = new Set(playerStats.map(stat => stat.player_id));
  
  // Get current team player IDs
  const currentPlayerIds = new Set(currentTeamPlayers.map(player => player.id));
  
  // Find missing players (saved in match but not in current team)
  const missingPlayerIds = [...savedPlayerIds].filter(id => !currentPlayerIds.has(id));
  
  // Find available players (still in current team)
  const availablePlayerIds = [...savedPlayerIds].filter(id => currentPlayerIds.has(id));
  
  // Build issues list
  const issues = [];
  if (missingPlayerIds.length > 0) {
    issues.push(`${missingPlayerIds.length} player(s) from the saved match are no longer on the team`);
  }
  
  if (availablePlayerIds.length < 5) {
    issues.push('Not enough available players to resume match (minimum 5 required)');
  }

  const isValid = missingPlayerIds.length === 0 && availablePlayerIds.length >= 5;

  return {
    isValid,
    issues,
    missingPlayerIds,
    availablePlayerIds,
    savedPlayerCount: savedPlayerIds.size,
    currentPlayerCount: currentPlayerIds.size
  };
}

/**
 * Resume pending match by loading and reconstructing game state
 * 
 * @param {string} matchId - Match ID to resume (must be in pending state and accessible to current user)
 * @returns {Promise<{success: boolean, gameState?: object, error?: string}>} Operation result with reconstructed game state or user-friendly error message
 */
export async function resumePendingMatch(matchId) {
  try {
    // Load match data from database
    const loadResult = await loadPendingMatchData(matchId);
    if (!loadResult.success) {
      return {
        success: false,
        error: loadResult.error
      };
    }

    // Load game state directly from initial_config
    const gameState = loadGameStateFromInitialConfig(
      loadResult.matchData, 
      loadResult.playerStats
    );

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Pending match resumed successfully:', matchId);
    }

    return {
      success: true,
      gameState
    };

  } catch (error) {
    console.error('❌ Exception while resuming pending match:', error);
    return {
      success: false,
      error: `Failed to resume match: ${error.message}`
    };
  }
}