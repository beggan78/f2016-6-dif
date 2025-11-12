import { PLAYER_ROLES } from '../../constants/playerConstants';
import { getModeDefinition, isIndividualMode } from '../../constants/gameModes';
import { createRotationQueue } from '../queue/rotationQueue';
import { findPlayerById, createPlayerLookupFunction } from '../../utils/playerUtils';
import { getPositionRole } from './positionUtils';
import { updatePlayerTimeStats, startNewStint, resetPlayerStintTimer } from '../time/stintManager';
import { handleError, createError, ERROR_SEVERITY } from '../../utils/errorHandler';

const LEFT = 'left';
const RIGHT = 'right';

/**
 * Clone formation object
 *
 * @param {Object} formation - Formation object to clone
 * @returns {Object} Cloned formation
 */
function cloneFormation(formation) {
  return { ...formation };
}

const getSideFromPosition = (position) => {
  if (!position || typeof position !== 'string') {
    return null;
  }
  const lower = position.toLowerCase();
  if (lower.includes(LEFT)) {
    return LEFT;
  }
  if (lower.includes(RIGHT)) {
    return RIGHT;
  }
  return null;
};

/**
 * Manages substitution logic for different team modes
 */
export class SubstitutionManager {
  constructor(teamConfig, selectedFormation = null) {
    this.teamConfig = teamConfig;
    this.selectedFormation = selectedFormation;
  }

  /**
   * Gets mode definition for this team configuration object
   */
  getModeConfig() {
    const modeDefinition = getModeDefinition(this.teamConfig);
    return modeDefinition;
  }



  /**
   * Gets role from position key (delegates to shared utility)
   */
  getPositionRole(position) {
    return getPositionRole(position);
  }


  /**
   * Unified individual mode substitution handler for both 6-player and 7-player modes
   * 
   * Uses mode configuration to drive behavior differences:
   * - substitutePositions array for filtering positions
   * - supportsInactiveUsers flag for validation
   * - substituteRotationPattern for substitute management
   * 
   * @param {Object} context - Substitution context
   * @param {Object} context.formation - Current formation
   * @param {string} context.nextPlayerIdToSubOut - Player ID to substitute out
   * @param {Array} context.allPlayers - All player objects
   * @param {Array} context.rotationQueue - Current rotation queue
   * @param {number} context.currentTimeEpoch - Current time
   * @param {boolean} context.isSubTimerPaused - Whether timer is paused
   * @returns {Object} Substitution result with updated formation, players, and queue
   */
  handleIndividualModeSubstitution(context) {
    const {
      formation,
      nextPlayerIdToSubOut,
      allPlayers,
      rotationQueue,
      currentTimeEpoch,
      isSubTimerPaused,
      substitutionCount = 1
    } = context;

    // Validate rotation queue integrity
    if (!rotationQueue || rotationQueue.length === 0) {
      const error = createError.gameLogic('Rotation queue cannot be empty during substitution', {
        operation: 'handleIndividualModeSubstitution',
        rotationQueue,
        nextPlayerIdToSubOut,
        teamConfig: this.teamConfig,
        selectedFormation: this.selectedFormation,
        severity: ERROR_SEVERITY.CRITICAL
      });
      handleError(error);
      throw error;
    }

    if (!nextPlayerIdToSubOut) {
      const error = createError.gameLogic('nextPlayerIdToSubOut cannot be null during substitution', {
        operation: 'handleIndividualModeSubstitution',
        nextPlayerIdToSubOut,
        rotationQueue: rotationQueue?.slice(),
        severity: ERROR_SEVERITY.CRITICAL
      });
      handleError(error);
      throw error;
    }

    const modeConfig = this.getModeConfig();
    const { substitutePositions, supportsInactiveUsers, substituteRotationPattern } = modeConfig;

    const playersToSubOutIds = rotationQueue.slice(0, substitutionCount);

    // Get N substitute positions (players to bring on)
    const substitutePositionsToUse = substitutePositions.slice(0, substitutionCount);

    // Validate that all players to sub out are in field positions
    const fieldPositions = modeConfig.fieldPositions;

    // Build substitution pairs: map each field player to their substitute
    const substitutionPairs = [];
    for (let i = 0; i < playersToSubOutIds.length; i++) {
      const playerGoingOffId = playersToSubOutIds[i];
      const substitutePosition = substitutePositionsToUse[i];

      // Find field position of outgoing player
      const fieldPosition = fieldPositions.find(pos => formation[pos] === playerGoingOffId);

      if (!fieldPosition) {
        const error = createError.gameLogic('Player to substitute out must be in a field position, not a substitute position', {
          operation: 'handleIndividualModeSubstitution',
          playerGoingOffId,
          fieldPositions,
          currentFormation: Object.keys(formation).reduce((acc, key) => {
            if (fieldPositions.includes(key)) {
              acc[key] = formation[key];
            }
            return acc;
          }, {}),
          severity: ERROR_SEVERITY.CRITICAL
        });
        handleError(error);
        throw error;
      }

      const playerComingOnId = formation[substitutePosition];

      // Safety check for inactive substitute
      if (supportsInactiveUsers) {
        const substitutePlayer = findPlayerById(allPlayers, playerComingOnId);
        if (substitutePlayer?.stats.isInactive) {
          throw new Error(`Substitute at ${substitutePosition} is inactive but was selected for substitution`);
        }
      }

      const side = getSideFromPosition(fieldPosition);
      const newRole = this.getPositionRole(fieldPosition);

      substitutionPairs.push({
        playerGoingOffId,
        playerComingOnId,
        fieldPosition,
        substitutePosition,
        newRole,
        side
      });
    }

    // Create rotation queue helper
    const queueManager = createRotationQueue(rotationQueue, createPlayerLookupFunction(allPlayers));
    queueManager.initialize(); // Separate active and inactive players

    // Calculate new formation by applying all substitution pairs
    const newFormation = cloneFormation(formation);

    // Step 1: Put all substitutes onto the field in their designated positions
    substitutionPairs.forEach(pair => {
      newFormation[pair.fieldPosition] = pair.playerComingOnId;
    });

    // Step 2: Handle substitute position rotation for players going off
    // For N-player substitution, we need to place N field players into substitute positions
    // The logic depends on the rotation pattern and presence of inactive players

    if (substituteRotationPattern === 'simple') {
      // 6-player: Simple swap - just put field players into substitute positions
      substitutionPairs.forEach((pair, index) => {
        newFormation[pair.substitutePosition] = pair.playerGoingOffId;
      });
    } else {
      // 7+ player carousel patterns
      // Check for inactive players that would break the carousel
      const hasInactiveInCarousel = substitutePositions.some(position => {
        const player = findPlayerById(allPlayers, formation[position]);
        return player?.stats.isInactive === true;
      });

      if (hasInactiveInCarousel) {
        // Active cascade logic for N players with inactive substitutes present
        // Compress remaining active substitutes to the front, then append players going off
        const activeSubstitutePositions = substitutePositions.filter(position => {
          const player = findPlayerById(allPlayers, formation[position]);
          return player && !player.stats.isInactive;
        });

        const playersComingOnIds = substitutionPairs.map(p => p.playerComingOnId);
        const playersGoingOffIds = substitutionPairs.map(p => p.playerGoingOffId);

        // Keep active substitutes who did not enter the field, preserving their relative order
        const remainingActivePlayerIds = activeSubstitutePositions
          .map(position => formation[position])
          .filter(playerId => playerId && !playersComingOnIds.includes(playerId));

        // Build the new ordering for active substitute slots
        const reorderedActiveAssignments = [...remainingActivePlayerIds, ...playersGoingOffIds];

        activeSubstitutePositions.forEach((position, index) => {
          const playerId = reorderedActiveAssignments[index];
          if (playerId !== undefined) {
            newFormation[position] = playerId;
          }
        });
      } else {
        // Standard carousel - for N-player substitution, we rotate N positions
        // The carousel needs to handle multiple players moving at once

        // For simplicity with N-player substitution:
        // - Substitutes that came on have already been placed on field
        // - Field players going off should fill the substitute positions from position 0
        // - Any remaining substitutes should shift down

        // Get all substitute player IDs that didn't come on (they need to shift)
        const playersComingOnIds = substitutionPairs.map(p => p.playerComingOnId);
        const remainingSubstitutes = substitutePositions
          .map(pos => ({ pos, id: formation[pos] }))
          .filter(sub => !playersComingOnIds.includes(sub.id))
          .map(sub => sub.id);

        // Fill substitute positions:
        // First N positions: field players going off
        // Remaining positions: existing substitutes (shifted)
        const playersGoingOffIds = substitutionPairs.map(p => p.playerGoingOffId);

        playersGoingOffIds.forEach((playerId, index) => {
          if (index < substitutePositions.length) {
            newFormation[substitutePositions[substitutePositions.length - substitutionCount + index]] = playerId;
          }
        });

        // Shift remaining substitutes to earlier positions
        remainingSubstitutes.forEach((playerId, index) => {
          if (index < substitutePositions.length - substitutionCount) {
            newFormation[substitutePositions[index]] = playerId;
          }
        });
      }
    }

    // Create maps for fast lookups
    const playersGoingOffIds = substitutionPairs.map(p => p.playerGoingOffId);
    const playersComingOnIds = substitutionPairs.map(p => p.playerComingOnId);

    // Create lookup maps for substitution pairs
    const goingOffMap = new Map();
    const comingOnMap = new Map();

    substitutionPairs.forEach(pair => {
      goingOffMap.set(pair.playerGoingOffId, pair);
      comingOnMap.set(pair.playerComingOnId, pair);
    });

    // Calculate updated players
    const updatedPlayers = allPlayers.map(p => {
      // Check if this player is going off the field
      if (goingOffMap.has(p.id)) {
        const pair = goingOffMap.get(p.id);

        // Use conditional time tracking based on timer pause state
        const timeResult = isSubTimerPaused
          ? resetPlayerStintTimer(p, currentTimeEpoch)  // During pause: don't add time
          : { ...p, stats: updatePlayerTimeStats(p, currentTimeEpoch, false) }; // Normal: add time

        // Find where this player ended up in the new formation
        const newSubstitutePosition = Object.keys(newFormation).find(
          pos => newFormation[pos] === p.id && substitutePositions.includes(pos)
        );

        return {
          ...p,
          stats: {
            ...timeResult.stats,
            currentStatus: 'substitute',
            currentPositionKey: newSubstitutePosition || pair.substitutePosition,
            currentRole: PLAYER_ROLES.SUBSTITUTE,
            ...(pair.side ? { preferredSide: pair.side } : {})
          }
        };
      }

      // Check if this player is coming on the field
      if (comingOnMap.has(p.id)) {
        const pair = comingOnMap.get(p.id);

        // Use conditional time tracking based on timer pause state
        const timeResult = isSubTimerPaused
          ? resetPlayerStintTimer(p, currentTimeEpoch)  // During pause: don't add time
          : { ...p, stats: updatePlayerTimeStats(p, currentTimeEpoch, false) }; // Normal: add time

        return {
          ...p,
          stats: {
            ...timeResult.stats,
            currentStatus: 'on_field',
            currentPositionKey: pair.fieldPosition,
            currentRole: pair.newRole,
            ...(pair.side ? { preferredSide: pair.side } : {})
          }
        };
      }

      // Check if this player's substitute position changed (for carousel/cascade patterns)
      if (substituteRotationPattern !== 'simple') {
        // Find if this player's position changed in the formation
        const oldPosition = Object.keys(formation).find(pos => formation[pos] === p.id);
        const newPosition = Object.keys(newFormation).find(pos => newFormation[pos] === p.id);

        if (oldPosition !== newPosition && substitutePositions.includes(newPosition)) {
          return {
            ...p,
            stats: {
              ...p.stats,
              currentPositionKey: newPosition,
              currentRole: PLAYER_ROLES.SUBSTITUTE
            }
          };
        }
      }

      return p;
    });

    // For individual modes, rotate all N substituted players to the end of the queue
    const rotationQueueManager = createRotationQueue(rotationQueue, createPlayerLookupFunction(allPlayers));
    rotationQueueManager.initialize(); // Separate active and inactive players

    // Rotate all players who went off (in order) to the end of the queue
    playersGoingOffIds.forEach(playerId => {
      rotationQueueManager.rotatePlayer(playerId);
    });

    const newRotationQueue = rotationQueueManager.toArray();
    const nextPlayerToSubOutId = newRotationQueue[0];

    // Use formation-aware field positions (already declared in validation section above)
    const nextPlayerPositionInNewFormation = fieldPositions.find(pos =>
      newFormation[pos] === nextPlayerToSubOutId
    );

    // Build return object with mode-specific fields
    const result = {
      newFormation,
      updatedPlayers,
      newRotationQueue: newRotationQueue,
      newNextPlayerIdToSubOut: nextPlayerToSubOutId,
      newNextPlayerToSubOut: nextPlayerPositionInNewFormation || 'leftDefender',
      playersComingOnIds: playersComingOnIds,
      playersGoingOffIds: playersGoingOffIds
    };

    // Add next-next tracking for modes that support it
    if (substituteRotationPattern === 'carousel' || substituteRotationPattern === 'advanced_carousel') {
      result.newNextNextPlayerIdToSubOut = newRotationQueue[1] || null;
    }

    return result;
  }

  /**
   * Main substitution handler - delegates to appropriate method based on team mode
   */
  executeSubstitution(context) {
    if (isIndividualMode(this.teamConfig)) {
      return this.handleIndividualModeSubstitution(context);
    } else {
      throw new Error(`Unknown team mode: ${this.teamConfig}`);
    }
  }
}

/**
 * Handles role changes within a period (e.g., manual swaps)
 * This calculates time for the previous role and updates the player's current role
 * 
 * Uses conditional time tracking:
 * - Normal operation (timer not paused): Accumulates time using updatePlayerTimeStats()
 * - Pause operation (timer paused): Preserves time without accumulation
 * 
 * @param {Object} player - Player object with stats
 * @param {string} newRole - New role for the player
 * @param {number} currentTimeEpoch - Current time in milliseconds
 * @param {boolean} isSubTimerPaused - Whether the substitution timer is paused
 * @returns {Object} Updated player object with new role and time tracking
 */
export function handleRoleChange(player, newRole, currentTimeEpoch, isSubTimerPaused = false) {
  // First calculate stats for the time spent in the previous role
  const updatedStats = updatePlayerTimeStats(player, currentTimeEpoch, isSubTimerPaused);
  
  // Create updated player with new role
  const playerWithUpdatedStats = {
    ...player,
    stats: {
      ...updatedStats,
      currentRole: newRole
    }
  };
  
  // Start new stint if timer is not paused
  if (!isSubTimerPaused) {
    const playerWithNewStint = startNewStint(playerWithUpdatedStats, currentTimeEpoch);
    return playerWithNewStint;
  }
  
  return playerWithUpdatedStats;
}

/**
 * Factory function to create substitution manager
 */
export function createSubstitutionManager(teamConfig, selectedFormation = null) {
  return new SubstitutionManager(teamConfig, selectedFormation);
}
