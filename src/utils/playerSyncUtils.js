/**
 * Player Synchronization Utilities
 *
 * Manages synchronization between team roster data (from Supabase) and
 * game state player data (stored in localStorage). Ensures that players
 * added/updated in Team Management are immediately available in game configuration.
 */

import { createGamePersistenceManager } from './persistenceManager';
import { STORAGE_KEYS } from '../constants/storageKeys';

const persistenceManager = createGamePersistenceManager(STORAGE_KEYS.GAME_STATE);

/**
 * Convert a team roster player (from Supabase) to game state player format
 * @param {Object} teamPlayer - Player object from team roster
 * @returns {Object} Player in game state format
 */
export const convertTeamPlayerToGamePlayer = (teamPlayer) => {
  return {
    id: teamPlayer.id,
    displayName: teamPlayer.display_name,
    firstName: teamPlayer.first_name,
    lastName: teamPlayer.last_name,
    jerseyNumber: teamPlayer.jersey_number || null,
    stats: {
        currentPosition: null,
        currentRole: null,
        currentStatus: "substitute",
        isCaptain: false,
        isInactive: false,
        lastStintStartTimeEpoch: null,
        startedMatchAs: null,
        timeAsAttackerSeconds: 0,
        timeAsDefenderSeconds: 0,
        timeAsGoalieSeconds: 0,
        timeAsMidfielderSeconds: 0,
        timeOnFieldSeconds: 0
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
  const restOfExistingPlayer = existingGamePlayer ? { ...existingGamePlayer } : {};
  if (restOfExistingPlayer && 'name' in restOfExistingPlayer) {
    delete restOfExistingPlayer.name;
  }

  return {
    ...restOfExistingPlayer,
    // Update basic info from team roster
    displayName: teamPlayer.display_name,
    firstName: teamPlayer.first_name,
    lastName: teamPlayer.last_name,
    jerseyNumber: teamPlayer.jersey_number || restOfExistingPlayer.jerseyNumber,
    // stats object is already preserved by ...existingGamePlayer spread
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
  // Handle null/undefined inputs
  teamPlayers = teamPlayers || [];
  existingAllPlayers = existingAllPlayers || [];
  
  if (!Array.isArray(teamPlayers) || teamPlayers.length === 0) {
    // No team players to sync, return existing players
    return existingAllPlayers;
  }

  // Create lookup for existing players by ID
  const existingPlayersById = {};
  existingAllPlayers.forEach(player => {
    if (player && player.id) {
      existingPlayersById[player.id] = player;
    }
  });

  // Create lookup for team players by ID  
  const teamPlayersById = {};
  teamPlayers.forEach(player => {
    if (player && player.id) {
      teamPlayersById[player.id] = player;
    }
  });

  // Process all players
  const syncedPlayers = [];

  // 1. Add/update players from team roster (only valid players with IDs)
  teamPlayers.forEach(teamPlayer => {
    if (!teamPlayer || !teamPlayer.id) {
      return; // Skip players without valid IDs
    }
    
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
export const syncPlayersToLocalStorage = (updatedAllPlayers, manager = persistenceManager) => {
  try {
    // Load current state
    const currentState = manager.loadState();
    
    // Update with new players
    const updatedState = {
      ...currentState,
      allPlayers: updatedAllPlayers
    };
    
    // Save to localStorage
    manager.saveState(updatedState);
    
    return true;
  } catch (error) {
    console.error('Failed to sync players to localStorage:', error);
    return false;
  }
};

/**
 * Complete sync operation: roster → game state → localStorage
 * @param {Array} teamPlayers - Players from team roster
 * @param {Array} currentAllPlayers - Current game state players  
 * @returns {Object} Result with success status and updated players
 */
export const syncTeamRosterToGameState = (teamPlayers, currentAllPlayers, manager = persistenceManager) => {
  try {
    // Sync roster data into game state format
    const syncedPlayers = syncTeamPlayersToGameState(teamPlayers, currentAllPlayers);
    
    // Save to localStorage
    const saveSuccess = syncPlayersToLocalStorage(syncedPlayers, manager);
    
    if (saveSuccess) {
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
    console.error('Team roster sync failed:', error);
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
  // Handle null/undefined inputs
  teamPlayers = teamPlayers || [];
  allPlayers = allPlayers || [];
  
  const teamPlayerIds = new Set(teamPlayers.map(p => p && p.id).filter(Boolean));
  const gamePlayerIds = new Set(allPlayers.map(p => p && p.id).filter(Boolean));
  
  const missingFromGame = teamPlayers.filter(tp => tp && tp.id && !gamePlayerIds.has(tp.id));
  const extraInGame = allPlayers.filter(gp => gp && gp.id && !teamPlayerIds.has(gp.id));
  
  return {
    needsSync: missingFromGame.length > 0,
    missingFromGame,
    extraInGame,
    summary: `Team: ${teamPlayers.length}, Game: ${allPlayers.length}, Missing: ${missingFromGame.length}`
  };
};
