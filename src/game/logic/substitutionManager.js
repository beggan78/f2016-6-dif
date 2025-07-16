import { PLAYER_ROLES, TEAM_MODES } from '../../constants/playerConstants';
import { MODE_DEFINITIONS, isIndividualMode } from '../../constants/gameModes';
import { createRotationQueue } from '../queue/rotationQueue';
import { createPlayerLookup, findPlayerById } from '../../utils/playerUtils';
import { getPositionRole, getFieldPositions } from './positionUtils';
import { updatePlayerTimeStats, startNewStint, resetPlayerStintTimer } from '../time/stintManager';
import { getCarouselMapping } from './carouselPatterns';

/**
 * Creates a cascade mapping for active substitutes when inactive players are present
 * @param {Array} activeSubstitutes - Array of active substitute positions
 * @param {Object} formation - Current formation
 * @param {string} outgoingPlayer - Player coming off the field
 * @param {string} bottomActivePosition - Bottom-most active substitute position
 * @returns {Object} Mapping of player moves
 */
const createActiveSubstituteCascade = (activeSubstitutes, formation, outgoingPlayer, bottomActivePosition) => {
  const cascade = {};
  
  // Outgoing player goes to bottom-most active substitute position
  cascade[outgoingPlayer] = bottomActivePosition;
  
  // All active substitutes move up one position
  for (let i = activeSubstitutes.length - 1; i > 0; i--) {
    const currentPosition = activeSubstitutes[i];
    const nextPosition = activeSubstitutes[i - 1];
    const playerId = formation[currentPosition];
    if (playerId) {
      cascade[playerId] = nextPosition;
    }
  }
  
  return cascade;
};

/**
 * Applies the active cascade mapping to the formation
 * @param {Object} formation - Formation object to modify
 * @param {Object} cascade - Cascade mapping from createActiveSubstituteCascade
 */
const applyActiveCascade = (formation, cascade) => {
  Object.entries(cascade).forEach(([playerId, newPosition]) => {
    formation[newPosition] = playerId;
  });
};

/**
 * Manages substitution logic for different team modes
 */
export class SubstitutionManager {
  constructor(teamMode) {
    this.teamMode = teamMode;
  }



  /**
   * Gets role from position key (delegates to shared utility)
   */
  getPositionRole(position) {
    return getPositionRole(position);
  }

  /**
   * Handles pairs substitution (7-player pairs mode)
   * 
   * Uses conditional time tracking based on timer pause state:
   * - Normal substitution (timer not paused): Accumulates time using updatePlayerTimeStats()
   * - Pause substitution (timer paused): Preserves time using resetPlayerStintTimer()
   * 
   * @param {Object} context - Substitution context
   * @param {Object} context.formation - Current formation
   * @param {string} context.nextPhysicalPairToSubOut - Pair to substitute out
   * @param {Array} context.allPlayers - All player objects
   * @param {number} context.currentTimeEpoch - Current time
   * @param {boolean} context.isSubTimerPaused - Whether timer is paused
   * @returns {Object} Substitution result with updated formation and players
   */
  handlePairsSubstitution(context) {
    const { 
      formation,
      nextPhysicalPairToSubOut, 
      allPlayers, 
      currentTimeEpoch,
      isSubTimerPaused
    } = context;

    const pairToSubOutKey = nextPhysicalPairToSubOut;
    const pairToSubInKey = 'subPair';

    const pairGettingSubbed = formation[pairToSubOutKey];
    const pairComingIn = formation[pairToSubInKey];

    const playersGoingOffIds = [pairGettingSubbed.defender, pairGettingSubbed.attacker].filter(Boolean);
    const playersComingOnIds = [pairComingIn.defender, pairComingIn.attacker].filter(Boolean);

    // Calculate new formation
    const newFormation = JSON.parse(JSON.stringify(formation));
    newFormation[pairToSubOutKey].defender = pairComingIn.defender;
    newFormation[pairToSubOutKey].attacker = pairComingIn.attacker;
    newFormation[pairToSubInKey].defender = pairGettingSubbed.defender;
    newFormation[pairToSubInKey].attacker = pairGettingSubbed.attacker;

    // Calculate updated players
    const updatedPlayers = allPlayers.map(p => {
      if (playersGoingOffIds.includes(p.id)) {
        // Use conditional time tracking based on timer pause state
        const timeResult = isSubTimerPaused 
          ? resetPlayerStintTimer(p, currentTimeEpoch)  // During pause: don't add time
          : { ...p, stats: updatePlayerTimeStats(p, currentTimeEpoch, false) }; // Normal: add time
        
        return {
          ...p,
          stats: {
            ...timeResult.stats,
            currentStatus: 'substitute',
            currentPairKey: pairToSubInKey
          }
        };
      }
      if (playersComingOnIds.includes(p.id)) {
        // Use conditional time tracking based on timer pause state
        const timeResult = isSubTimerPaused 
          ? resetPlayerStintTimer(p, currentTimeEpoch)  // During pause: don't add time
          : { ...p, stats: updatePlayerTimeStats(p, currentTimeEpoch, false) }; // Normal: add time
        
        return {
          ...p,
          stats: {
            ...timeResult.stats,
            currentStatus: 'on_field',
            currentPairKey: pairToSubOutKey
          }
        };
      }
      return p;
    });

    const newNextPair = pairToSubOutKey === 'leftPair' ? 'rightPair' : 'leftPair';

    return {
      newFormation,
      updatedPlayers,
      newNextPhysicalPairToSubOut: newNextPair,
      playersComingOnIds: playersComingOnIds,
      playersGoingOffIds: playersGoingOffIds
    };
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
      isSubTimerPaused
    } = context;

    const modeConfig = MODE_DEFINITIONS[this.teamMode];
    const { substitutePositions, supportsInactiveUsers, substituteRotationPattern } = modeConfig;

    const playerGoingOffId = nextPlayerIdToSubOut;
    const firstSubstitutePosition = substitutePositions[0]; // Get first substitute position dynamically
    const playerComingOnId = formation[firstSubstitutePosition];

    // Create rotation queue helper
    const queueManager = createRotationQueue(rotationQueue, createPlayerLookup(allPlayers));
    queueManager.initialize(); // Separate active and inactive players

    // Safety check for inactive substitute (7-player mode only)
    if (supportsInactiveUsers) {
      const substitute_1Player = findPlayerById(allPlayers, playerComingOnId);
      if (substitute_1Player?.stats.isInactive) {
        throw new Error('substitute_1 is inactive but was selected for substitution');
      }
    }

    // Find position of outgoing player - use substitutePositions for filtering
    const playerToSubOutKey = Object.keys(formation).find(key =>
      formation[key] === playerGoingOffId && 
      !substitutePositions.includes(key) && 
      key !== 'goalie'
    );

    const newRole = this.getPositionRole(playerToSubOutKey);

    // Calculate new formation
    const newFormation = JSON.parse(JSON.stringify(formation));
    newFormation[playerToSubOutKey] = playerComingOnId;

    // Handle substitute rotation based on pattern using generalized carousel system
    if (substituteRotationPattern === 'simple') {
      // 6-player: Simple swap
      newFormation[firstSubstitutePosition] = playerGoingOffId;
    } else {
      // All carousel patterns (7-player, 8-player, future modes)
      // Check for inactive players that would break the carousel
      const hasInactiveInCarousel = substitutePositions.some(position => {
        const player = findPlayerById(allPlayers, formation[position]);
        return player?.stats.isInactive === true;
      });
      
      if (hasInactiveInCarousel) {
        // NEW: Active cascade logic - field player goes to bottom-most active substitute position
        const activeSubstitutes = substitutePositions.filter(position => {
          const player = findPlayerById(allPlayers, formation[position]);
          return player && !player.stats.isInactive;
        });
        
        if (activeSubstitutes.length > 0) {
          const bottomActivePosition = activeSubstitutes[activeSubstitutes.length - 1];
          
          // Create cascade mapping for active substitutes
          const activeSubstituteCascade = createActiveSubstituteCascade(
            activeSubstitutes,
            formation,
            playerGoingOffId,
            bottomActivePosition
          );
          
          // Apply cascade to formation
          applyActiveCascade(newFormation, activeSubstituteCascade);
        } else {
          // Fallback: if no active substitutes, use simple logic
          newFormation[firstSubstitutePosition] = playerGoingOffId;
        }
      } else {
        // Apply generalized carousel pattern
        const carouselMapping = getCarouselMapping(
          substituteRotationPattern,
          playerGoingOffId,
          substitutePositions,
          formation
        );
        
        // Apply the mapping to formation
        Object.entries(carouselMapping).forEach(([playerId, newPosition]) => {
          if (substitutePositions.includes(newPosition)) {
            newFormation[newPosition] = playerId;
          } else {
            // Player going to field position (outgoing player's position)
            newFormation[playerToSubOutKey] = playerId;
          }
        });
      }
    }

    // Calculate updated players
    const updatedPlayers = allPlayers.map(p => {
      if (p.id === playerGoingOffId) {
        // Use conditional time tracking based on timer pause state
        const timeResult = isSubTimerPaused 
          ? resetPlayerStintTimer(p, currentTimeEpoch)  // During pause: don't add time
          : { ...p, stats: updatePlayerTimeStats(p, currentTimeEpoch, false) }; // Normal: add time
        
        // Determine new substitute position using carousel or cascade mapping
        let newPairKey = firstSubstitutePosition; // Default fallback
        if (substituteRotationPattern !== 'simple') {
          const hasInactiveInCarousel = substitutePositions.some(position => {
            const player = findPlayerById(allPlayers, formation[position]);
            return player?.stats.isInactive === true;
          });
          
          if (hasInactiveInCarousel) {
            // Use active cascade logic
            const activeSubstitutes = substitutePositions.filter(position => {
              const player = findPlayerById(allPlayers, formation[position]);
              return player && !player.stats.isInactive;
            });
            
            if (activeSubstitutes.length > 0) {
              const bottomActivePosition = activeSubstitutes[activeSubstitutes.length - 1];
              newPairKey = bottomActivePosition;
            }
          } else {
            const carouselMapping = getCarouselMapping(
              substituteRotationPattern,
              playerGoingOffId,
              substitutePositions,
              formation
            );
            // Find where this player is going in the carousel
            newPairKey = carouselMapping[playerGoingOffId] || firstSubstitutePosition;
          }
        }
        
        return {
          ...p,
          stats: {
            ...timeResult.stats,
            currentStatus: 'substitute',
            currentPairKey: newPairKey,
            currentRole: PLAYER_ROLES.SUBSTITUTE
          }
        };
      }
      if (p.id === playerComingOnId) {
        // Use conditional time tracking based on timer pause state
        const timeResult = isSubTimerPaused 
          ? resetPlayerStintTimer(p, currentTimeEpoch)  // During pause: don't add time
          : { ...p, stats: updatePlayerTimeStats(p, currentTimeEpoch, false) }; // Normal: add time
        
        return {
          ...p,
          stats: {
            ...timeResult.stats,
            currentStatus: 'on_field',
            currentPairKey: playerToSubOutKey,
            currentRole: newRole
          }
        };
      }
      // Handle substitute position changes in carousel or cascade patterns
      if (substituteRotationPattern !== 'simple') {
        const hasInactiveInCarousel = substitutePositions.some(position => {
          const player = findPlayerById(allPlayers, formation[position]);
          return player?.stats.isInactive === true;
        });
        
        if (hasInactiveInCarousel) {
          // Use active cascade logic for substitute position changes
          const activeSubstitutes = substitutePositions.filter(position => {
            const player = findPlayerById(allPlayers, formation[position]);
            return player && !player.stats.isInactive;
          });
          
          if (activeSubstitutes.length > 0) {
            const bottomActivePosition = activeSubstitutes[activeSubstitutes.length - 1];
            const activeSubstituteCascade = createActiveSubstituteCascade(
              activeSubstitutes,
              formation,
              playerGoingOffId,
              bottomActivePosition
            );
            
            // Check if this player is being moved in the cascade
            if (activeSubstituteCascade[p.id] && substitutePositions.includes(activeSubstituteCascade[p.id])) {
              return {
                ...p,
                stats: {
                  ...p.stats,
                  currentPairKey: activeSubstituteCascade[p.id],
                  currentRole: PLAYER_ROLES.SUBSTITUTE
                }
              };
            }
          }
        } else {
          const carouselMapping = getCarouselMapping(
            substituteRotationPattern,
            playerGoingOffId,
            substitutePositions,
            formation
          );
          
          // Check if this player is being moved in the carousel
          if (carouselMapping[p.id] && substitutePositions.includes(carouselMapping[p.id])) {
            return {
              ...p,
              stats: {
                ...p.stats,
                currentPairKey: carouselMapping[p.id],
                currentRole: PLAYER_ROLES.SUBSTITUTE
              }
            };
          }
        }
      }
      return p;
    });

    // For individual modes, just rotate the current queue (no rebuilding during gameplay)
    const rotationQueueManager = createRotationQueue(rotationQueue, createPlayerLookup(allPlayers));
    rotationQueueManager.initialize(); // Separate active and inactive players
    
    // Move the substituted player to the end of the queue
    rotationQueueManager.rotatePlayer(playerGoingOffId);
    const newRotationQueue = rotationQueueManager.toArray();
    const nextPlayerToSubOutId = newRotationQueue[0];

    const fieldPositions = getFieldPositions(this.teamMode);
    const nextPlayerPosition = fieldPositions.find(pos => 
      newFormation[pos] === nextPlayerToSubOutId
    );

    // Build return object with mode-specific fields
    const result = {
      newFormation,
      updatedPlayers,
      newRotationQueue: newRotationQueue,
      newNextPlayerIdToSubOut: nextPlayerToSubOutId,
      newNextPlayerToSubOut: nextPlayerPosition || 'leftDefender',
      playersComingOnIds: [playerComingOnId],
      playersGoingOffIds: [playerGoingOffId]
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
    if (this.teamMode === TEAM_MODES.PAIRS_7) {
      return this.handlePairsSubstitution(context);
    } else if (isIndividualMode(this.teamMode)) {
      return this.handleIndividualModeSubstitution(context);
    } else {
      throw new Error(`Unknown team mode: ${this.teamMode}`);
    }
  }
}

/**
 * Handles role changes within a period (like pair swaps)
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
export function createSubstitutionManager(teamMode) {
  return new SubstitutionManager(teamMode);
}