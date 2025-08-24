/**
 * Player Synchronization Utilities
 * 
 * Manages synchronization between team roster data (from Supabase) and 
 * game state player data (stored in localStorage). Ensures that players
 * added/updated in Team Management are immediately available in game configuration.
 */

import { createGamePersistenceManager } from './persistenceManager';

const persistenceManager = createGamePersistenceManager('dif-coach-game-state');

/**
 * Convert a team roster player (from Supabase) to game state player format
 * @param {Object} teamPlayer - Player object from team roster
 * @returns {Object} Player in game state format
 */
export const convertTeamPlayerToGamePlayer = (teamPlayer) => {
  return {
    id: teamPlayer.id || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: teamPlayer.name,
    jerseyNumber: teamPlayer.jersey_number || null,
    role: 'defender', // Default role
    status: 'inactive', // Default status - not in current game
    positionName: 'bench', // Default position
    pairId: null,
    lastSubTime: null,
    lastStintStartTimeEpoch: null,
    stats: {
      timeOnFieldSeconds: 0,
      timeAsAttackerSeconds: 0,
      timeAsDefenderSeconds: 0,
      timeAsGoalieSeconds: 0,
      timeAsMidfielderSeconds: 0,
      substitutionsOut: 0,
      substitutionsIn: 0,
      totalGameTime: 0,
      isCaptain: false,
      isActive: teamPlayer.on_roster !== false // Default to active if not specified
    }
  };
};

/**
 * Merge team roster data into existing game player, preserving game stats
 * @param {Object} teamPlayer - Player from team roster
 * @param {Object} existingGamePlayer - Player from game state
 * @returns {Object} Merged player with updated roster info but preserved stats
 */
export const mergePlayerData = (teamPlayer, existingGamePlayer) => {
  return {
    ...existingGamePlayer,
    // Update basic info from team roster
    name: teamPlayer.name,
    jerseyNumber: teamPlayer.jersey_number || existingGamePlayer.jerseyNumber,
    stats: {
      ...existingGamePlayer.stats,
      // Update roster status from team data
      isActive: teamPlayer.on_roster !== false
    }
  };
};

/**
 * Synchronize team roster players into game state format
 * Adds new players, updates existing ones, preserves game stats
 * @param {Array} teamPlayers - Array of players from team roster
 * @param {Array} existingAllPlayers - Current game state players
 * @returns {Array} Updated allPlayers array
 */
export const syncTeamPlayersToGameState = (teamPlayers = [], existingAllPlayers = []) => {
  if (!Array.isArray(teamPlayers) || teamPlayers.length === 0) {
    // No team players to sync, return existing players
    return existingAllPlayers;
  }

  // Create lookup for existing players by ID
  const existingPlayersById = {};
  existingAllPlayers.forEach(player => {
    if (player.id) {
      existingPlayersById[player.id] = player;
    }
  });

  // Create lookup for team players by ID  
  const teamPlayersById = {};
  teamPlayers.forEach(player => {
    if (player.id) {
      teamPlayersById[player.id] = player;
    }
  });

  // Process all players
  const syncedPlayers = [];

  // 1. Add/update players from team roster
  teamPlayers.forEach(teamPlayer => {
    const existingPlayer = existingPlayersById[teamPlayer.id];
    
    if (existingPlayer) {
      // Player exists in game state - merge data
      syncedPlayers.push(mergePlayerData(teamPlayer, existingPlayer));
    } else {
      // New player from team roster - convert to game format
      syncedPlayers.push(convertTeamPlayerToGamePlayer(teamPlayer));
    }
  });

  // 2. Keep existing players that are not in team roster (temporary/local players)
  existingAllPlayers.forEach(existingPlayer => {
    if (!teamPlayersById[existingPlayer.id]) {
      // This player is not in team roster (might be temporary/local)
      syncedPlayers.push(existingPlayer);
    }
  });

  return syncedPlayers;
};

/**
 * Sync players to localStorage game state
 * @param {Array} updatedAllPlayers - Updated players array
 * @returns {boolean} Success status
 */
export const syncPlayersToLocalStorage = (updatedAllPlayers) => {
  try {
    // Load current state
    const currentState = persistenceManager.loadState();
    
    // Update with new players
    const updatedState = {
      ...currentState,
      allPlayers: updatedAllPlayers
    };
    
    // Save to localStorage
    persistenceManager.saveState(updatedState);
    
    console.log('✅ Players synced to localStorage:', updatedAllPlayers.length, 'players');
    return true;
  } catch (error) {
    console.error('❌ Failed to sync players to localStorage:', error);
    return false;
  }
};

/**
 * Complete sync operation: roster → game state → localStorage
 * @param {Array} teamPlayers - Players from team roster
 * @param {Array} currentAllPlayers - Current game state players  
 * @returns {Object} Result with success status and updated players
 */
export const syncTeamRosterToGameState = (teamPlayers, currentAllPlayers) => {
  try {
    // Sync roster data into game state format
    const syncedPlayers = syncTeamPlayersToGameState(teamPlayers, currentAllPlayers);
    
    // Save to localStorage
    const saveSuccess = syncPlayersToLocalStorage(syncedPlayers);
    
    if (saveSuccess) {
      console.log('✅ Team roster successfully synced to game state');
      return {
        success: true,
        players: syncedPlayers,
        message: `Synced ${teamPlayers.length} roster players to game state`
      };
    } else {
      return {
        success: false,
        players: currentAllPlayers,
        error: 'Failed to save to localStorage'
      };
    }
  } catch (error) {
    console.error('❌ Team roster sync failed:', error);
    return {
      success: false,
      players: currentAllPlayers,
      error: error.message
    };
  }
};

/**
 * Check if game state players are missing any team roster players
 * @param {Array} teamPlayers - Players from team roster
 * @param {Array} allPlayers - Current game state players
 * @returns {Object} Analysis of missing players
 */
export const analyzePlayerSync = (teamPlayers = [], allPlayers = []) => {
  const teamPlayerIds = new Set(teamPlayers.map(p => p.id).filter(Boolean));
  const gamePlayerIds = new Set(allPlayers.map(p => p.id).filter(Boolean));
  
  const missingFromGame = teamPlayers.filter(tp => tp.id && !gamePlayerIds.has(tp.id));
  const extraInGame = allPlayers.filter(gp => gp.id && !teamPlayerIds.has(gp.id));
  
  return {
    needsSync: missingFromGame.length > 0,
    missingFromGame,
    extraInGame,
    summary: `Team: ${teamPlayers.length}, Game: ${allPlayers.length}, Missing: ${missingFromGame.length}`
  };
};