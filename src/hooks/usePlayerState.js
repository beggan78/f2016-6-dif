import { useState, useCallback, useEffect } from 'react';
import { initializePlayers, resetPlayerMatchStartState, findPlayerById } from '../utils/playerUtils';
import { initialRoster } from '../constants/defaultData';
import { syncTeamRosterToGameState, analyzePlayerSync } from '../utils/playerSyncUtils';
import { initializePlayerRoleAndStatus } from '../constants/gameModes';
import { calculatePlayerToggleInactive } from '../game/logic/gameStateLogic';

/**
 * Hook for managing player state and squad management
 *
 * Handles:
 * - All players list and selected squad
 * - Captain assignment and synchronization
 * - Player role and status management
 * - Squad synchronization with team roster
 * - Temporary player addition
 * - Player activation/deactivation
 *
 * @param {Object} initialState - Initial state from persistence
 * @returns {Object} Player state and management functions
 */
export function usePlayerState(initialState = {}) {
  // Initialize players with defaults if needed
  const initializePlayersState = (state) => {
    let players = state.allPlayers;
    if (!players || players.length === 0) {
      players = initializePlayers(initialRoster);
    }

    // Sync captain data between captainId and allPlayers stats
    if (state.captainId && players) {
      players = players.map(player => ({
        ...player,
        stats: {
          ...player.stats,
          isCaptain: player.id === state.captainId
        }
      }));
    }

    return {
      allPlayers: players,
      selectedSquadIds: state.selectedSquadIds || [],
      captainId: state.captainId || null
    };
  };

  const { allPlayers: initialPlayers, selectedSquadIds: initialSquadIds, captainId: initialCaptainId } =
    initializePlayersState(initialState);

  // Player state
  const [allPlayers, setAllPlayers] = useState(initialPlayers);
  const [selectedSquadIds, setSelectedSquadIdsState] = useState(initialSquadIds);
  const [captainId, setCaptainId] = useState(initialCaptainId);

  // Sync captain data in allPlayers whenever captainId changes
  useEffect(() => {
    if (captainId) {
      // Set the new captain and clear any existing captain
      setAllPlayers(prev => prev.map(player => ({
        ...player,
        stats: {
          ...player.stats,
          isCaptain: player.id === captainId
        }
      })));
    } else {
      // Clear all captain designations when captainId is null
      setAllPlayers(prev => prev.map(player => ({
        ...player,
        stats: {
          ...player.stats,
          isCaptain: false
        }
      })));
    }
  }, [captainId]);

  // Custom setter that clears match-start markers when players leave the squad
  const setSelectedSquadIds = useCallback((value) => {
    setSelectedSquadIdsState(prevSquadIds => {
      const nextValue = typeof value === 'function' ? value(prevSquadIds) : value;

      if (!Array.isArray(nextValue)) {
        console.warn('setSelectedSquadIds expects an array of player IDs');
        return prevSquadIds;
      }

      const dedupedNext = Array.from(new Set(nextValue));
      const nextSet = new Set(dedupedNext);
      const removedIds = prevSquadIds.filter(id => !nextSet.has(id));

      if (removedIds.length > 0) {
        setAllPlayers(prevPlayers => prevPlayers.map(player => (
          removedIds.includes(player.id)
            ? resetPlayerMatchStartState(player)
            : player
        )));
      }

      const noChange = prevSquadIds.length === dedupedNext.length &&
        prevSquadIds.every((id, index) => id === dedupedNext[index]);

      return noChange ? prevSquadIds : dedupedNext;
    });
  }, [setAllPlayers]);

  // Update player roles and status based on formation changes
  const updatePlayerRolesFromFormation = useCallback((formation, selectedSquadIds, formationAwareTeamConfig) => {
    if (!formation || !selectedSquadIds.length) return;

    // Skip if formation is empty (all positions null)
    const hasAnyAssignedPositions = Object.values(formation).some(pos => {
      if (typeof pos === 'string') return pos; // Individual mode positions
      if (typeof pos === 'object' && pos) return pos.defender || pos.attacker; // Pair positions
      return false;
    });

    if (!hasAnyAssignedPositions) return;

    // Update player roles based on current formation
    setAllPlayers(prev => {
      const updated = prev.map(player => {
        if (!selectedSquadIds.includes(player.id)) return player;

        const { currentRole, currentStatus, currentPairKey } = initializePlayerRoleAndStatus(player.id, formation, formationAwareTeamConfig);

        // Only update if the role/status actually changed to avoid unnecessary re-renders
        if (player.stats.currentRole !== currentRole ||
            player.stats.currentStatus !== currentStatus ||
            player.stats.currentPairKey !== currentPairKey) {
          return {
            ...player,
            stats: {
              ...player.stats,
              currentRole,
              currentStatus,
              currentPairKey
            }
          };
        }

        return player;
      });

      return updated;
    });
  }, []);

  // Add temporary player to squad
  const addTemporaryPlayer = useCallback((playerName) => {
    const newPlayerId = `temp_${Date.now()}`;
    const newPlayer = {
      id: newPlayerId,
      name: playerName,
      stats: initializePlayers([playerName])[0].stats
    };

    setAllPlayers(prev => [...prev, newPlayer]);
    setSelectedSquadIds(prev => [...prev, newPlayerId]);
  }, []);

  // Captain management
  const setCaptain = useCallback((newCaptainId) => {
    setCaptainId(newCaptainId);
  }, []);

  // Toggle player inactive status (for substitute players)
  const togglePlayerInactive = useCallback((playerId, teamConfig, formation, rotationQueue, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut, nextPlayerToSubOut, nextPhysicalPairToSubOut, animationCallback = null, delayMs = 0) => {
    if (teamConfig.squadSize !== 7 || teamConfig.substitutionType !== 'individual') return null;

    const player = findPlayerById(allPlayers, playerId);
    if (!player) return null;

    const currentlyInactive = player.stats.isInactive;
    const isSubstitute = player.stats.currentPairKey === 'substitute_1' || player.stats.currentPairKey === 'substitute_2';

    // Only allow inactivating/activating substitute players
    if (!isSubstitute) return null;

    // CRITICAL SAFETY CHECK: Prevent having both substitutes inactive
    if (!currentlyInactive) { // Player is about to be inactivated
      const substitute_1Id = formation.substitute_1;
      const substitute_2Id = formation.substitute_2;
      const otherSubstituteId = playerId === substitute_1Id ? substitute_2Id : substitute_1Id;
      const otherSubstitute = findPlayerById(allPlayers, otherSubstituteId);

      if (otherSubstitute?.stats.isInactive) {
        console.warn('Cannot inactivate player: would result in both substitutes being inactive');
        return null; // Prevent both substitutes from being inactive
      }
    }

    // Call animation callback if provided (for UI animations)
    if (animationCallback) {
      animationCallback(!currentlyInactive, player.stats.currentPairKey);
    }

    // Function to perform the actual state changes
    const performStateChanges = () => {
      // Update rotation queue and positions
      if (currentlyInactive) {
        // Player is being reactivated - use logic layer to handle all cascading
        const currentGameState = {
          formation,
          allPlayers,
          teamConfig,
          rotationQueue,
          nextPlayerIdToSubOut,
          nextNextPlayerIdToSubOut,
          nextPlayerToSubOut,
          nextPhysicalPairToSubOut
        };
        const newGameState = calculatePlayerToggleInactive(currentGameState, playerId);

        // Return the new state for the caller to apply
        return newGameState;
      } else {
        // Player is being inactivated - directly update their status
        const updatedPlayers = allPlayers.map(p => {
          if (p.id === playerId) {
            return {
              ...p,
              stats: {
                ...p.stats,
                isInactive: true
              }
            };
          }
          return p;
        });

        return {
          formation,
          allPlayers: updatedPlayers,
          teamConfig,
          rotationQueue,
          nextPlayerIdToSubOut,
          nextNextPlayerIdToSubOut,
          nextPlayerToSubOut,
          nextPhysicalPairToSubOut
        };
      }
    };

    // Apply changes immediately or after delay
    if (delayMs > 0) {
      setTimeout(() => {
        const newGameState = performStateChanges();
        return newGameState;
      }, delayMs);
    } else {
      return performStateChanges();
    }
  }, [allPlayers]);

  // Sync team roster players to game state
  const syncPlayersFromTeamRoster = useCallback((teamPlayers) => {
    try {
      const analysis = analyzePlayerSync(teamPlayers, allPlayers);

      if (analysis.needsSync) {
        const syncResult = syncTeamRosterToGameState(teamPlayers, allPlayers);

        if (syncResult.success) {
          setAllPlayers(syncResult.players);
          return { success: true, message: syncResult.message };
        } else {
          return { success: false, error: syncResult.error };
        }
      } else {
        return { success: true, message: 'No sync needed' };
      }
    } catch (error) {
      console.error('❌ Player sync error:', error);
      return { success: false, error: error.message };
    }
  }, [allPlayers]);

  // Clear captain assignment
  const clearCaptain = useCallback(() => {
    setCaptainId(null);
  }, []);

  return {
    // State
    allPlayers,
    selectedSquadIds,
    captainId,

    // Setters (for external state management)
    setAllPlayers,
    setSelectedSquadIds,
    setCaptainId,

    // Actions
    addTemporaryPlayer,
    setCaptain,
    clearCaptain,
    togglePlayerInactive,
    syncPlayersFromTeamRoster,
    updatePlayerRolesFromFormation,

    // Computed values for persistence
    getPlayerState: () => ({
      allPlayers,
      selectedSquadIds,
      captainId,
    }),
  };
}
