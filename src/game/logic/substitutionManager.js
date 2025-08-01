import { PLAYER_ROLES, TEAM_MODES } from '../../constants/playerConstants';
import { getModeDefinition, isIndividualMode } from '../../constants/gameModes';
import { createRotationQueue } from '../queue/rotationQueue';
import { createPlayerLookup, findPlayerById } from '../../utils/playerUtils';
import { getPositionRole } from './positionUtils';
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
  constructor(teamMode, selectedFormation = null) {
    this.teamMode = teamMode;
    this.selectedFormation = selectedFormation;
  }

  /**
   * Gets mode definition for this team mode, handling both legacy strings and team config objects
   */
  getModeConfig() {
    console.log('⚙️ [SubstitutionManager] Getting mode config:', {
      teamMode: this.teamMode,
      selectedFormation: this.selectedFormation,
      teamModeType: typeof this.teamMode,
      isLegacyString: typeof this.teamMode === 'string',
      timestamp: new Date().toISOString()
    });

    if (typeof this.teamMode === 'string') {
      // Convert legacy team mode strings to team config objects
      const legacyMappings = {
        [TEAM_MODES.PAIRS_7]: { format: '5v5', squadSize: 7, formation: '2-2', substitutionType: 'pairs' },
        [TEAM_MODES.INDIVIDUAL_5]: { format: '5v5', squadSize: 5, formation: '2-2', substitutionType: 'individual' },
        [TEAM_MODES.INDIVIDUAL_6]: { format: '5v5', squadSize: 6, formation: '2-2', substitutionType: 'individual' },
        [TEAM_MODES.INDIVIDUAL_7]: { format: '5v5', squadSize: 7, formation: '2-2', substitutionType: 'individual' },
        [TEAM_MODES.INDIVIDUAL_8]: { format: '5v5', squadSize: 8, formation: '2-2', substitutionType: 'individual' },
        [TEAM_MODES.INDIVIDUAL_9]: { format: '5v5', squadSize: 9, formation: '2-2', substitutionType: 'individual' },
        [TEAM_MODES.INDIVIDUAL_10]: { format: '5v5', squadSize: 10, formation: '2-2', substitutionType: 'individual' }
      };
      
      const teamConfig = legacyMappings[this.teamMode];
      if (!teamConfig) {
        console.error('❌ [SubstitutionManager] Unknown legacy team mode:', this.teamMode);
        throw new Error(`Unknown legacy team mode: ${this.teamMode}`);
      }
      
      // Override formation if selectedFormation is provided
      const formationAwareConfig = this.selectedFormation 
        ? { ...teamConfig, formation: this.selectedFormation }
        : teamConfig;
      
      console.log('🔄 [SubstitutionManager] Legacy mapping applied:', {
        originalTeamMode: this.teamMode,
        mappedConfig: teamConfig,
        formationAwareConfig,
        formationOverridden: !!this.selectedFormation
      });
      
      const modeDefinition = getModeDefinition(formationAwareConfig);
      
      console.log('📋 [SubstitutionManager] Final mode definition:', {
        fieldPositions: modeDefinition.fieldPositions,
        substitutePositions: modeDefinition.substitutePositions,
        formation: modeDefinition.formation,
        substitutionType: modeDefinition.substitutionType,
        supportsInactiveUsers: modeDefinition.supportsInactiveUsers,
        substituteRotationPattern: modeDefinition.substituteRotationPattern
      });
      
      return modeDefinition;
    }
    
    const modeDefinition = getModeDefinition(this.teamMode);
    console.log('📋 [SubstitutionManager] Mode definition (direct):', modeDefinition);
    return modeDefinition;
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

    // Validate rotation queue integrity
    console.log('🔍 [SubstitutionManager] Queue validation - checking integrity');
    if (!rotationQueue || rotationQueue.length === 0) {
      console.error('❌ [SubstitutionManager] CRITICAL: Rotation queue is empty or null!', {
        rotationQueue,
        nextPlayerIdToSubOut,
        teamMode: this.teamMode,
        selectedFormation: this.selectedFormation
      });
      throw new Error('Rotation queue cannot be empty during substitution');
    }
    
    if (!nextPlayerIdToSubOut) {
      console.error('❌ [SubstitutionManager] CRITICAL: nextPlayerIdToSubOut is null or undefined!', {
        nextPlayerIdToSubOut,
        rotationQueue: rotationQueue.slice()
      });
      throw new Error('nextPlayerIdToSubOut cannot be null during substitution');
    }

    const modeConfig = this.getModeConfig();
    const { substitutePositions, supportsInactiveUsers, substituteRotationPattern } = modeConfig;
    
    // Validate that nextPlayerIdToSubOut is actually in a field position
    const fieldPositions = modeConfig.fieldPositions;
    const nextPlayerPosition = fieldPositions.find(pos => formation[pos] === nextPlayerIdToSubOut);
    
    if (!nextPlayerPosition) {
      console.error('❌ [SubstitutionManager] CRITICAL: Next player to sub out is not in a field position!', {
        nextPlayerIdToSubOut,
        fieldPositions,
        currentFormation: Object.keys(formation).reduce((acc, key) => {
          if (fieldPositions.includes(key)) {
            acc[key] = formation[key];
          }
          return acc;
        }, {}),
        substitutePositions: substitutePositions.reduce((acc, key) => {
          acc[key] = formation[key];
          return acc;
        }, {})
      });
      throw new Error('Player to substitute out must be in a field position, not a substitute position');
    }
    
    console.log('✅ [SubstitutionManager] Queue validation passed:', {
      queueLength: rotationQueue.length,
      nextPlayerIdToSubOut,
      nextPlayerPosition,
      isFieldPlayer: true
    });

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
    
    console.log('🔄 [SubstitutionManager] Queue rotation - Before:', {
      playerGoingOffId,
      originalQueue: rotationQueue.slice(),
      nextPlayerIdToSubOut: nextPlayerIdToSubOut,
      queueLength: rotationQueue.length,
      queueManagerState: {
        activeQueue: rotationQueueManager.getActiveQueue?.() || 'method not available',
        inactiveQueue: rotationQueueManager.getInactiveQueue?.() || 'method not available'
      },
      timestamp: new Date().toISOString()
    });
    
    // Move the substituted player to the end of the queue
    rotationQueueManager.rotatePlayer(playerGoingOffId);
    const newRotationQueue = rotationQueueManager.toArray();
    const nextPlayerToSubOutId = newRotationQueue[0];
    
    console.log('🔄 [SubstitutionManager] Queue rotation - After rotatePlayer():', {
      newQueue: newRotationQueue.slice(),
      nextPlayerToSubOutId,
      playerMovedFromIndex: rotationQueue.indexOf(playerGoingOffId),
      playerMovedToIndex: newRotationQueue.indexOf(playerGoingOffId),
      queueLengthBefore: rotationQueue.length,
      queueLengthAfter: newRotationQueue.length,
      rotationSuccessful: newRotationQueue.indexOf(playerGoingOffId) !== rotationQueue.indexOf(playerGoingOffId)
    });
    
    // Use formation-aware field positions (already declared in validation section above)
    const nextPlayerPositionInNewFormation = fieldPositions.find(pos => 
      newFormation[pos] === nextPlayerToSubOutId
    );

    console.log('🎯 [SubstitutionManager] Formation-aware position detection:', {
      teamMode: this.teamMode,
      selectedFormation: this.selectedFormation,
      modeConfig: {
        fieldPositions: modeConfig.fieldPositions,
        substitutePositions: modeConfig.substitutePositions,
        formation: modeConfig.formation
      },
      nextPlayerToSubOutId,
      nextPlayerPositionInNewFormation,
      newFormation: Object.keys(newFormation).reduce((acc, key) => {
        if (fieldPositions.includes(key)) {
          acc[key] = newFormation[key];
        }
        return acc;
      }, {}),
      positionSearchResults: fieldPositions.map(pos => ({
        position: pos,
        playerId: newFormation[pos],
        isMatch: newFormation[pos] === nextPlayerToSubOutId
      })),
      timestamp: new Date().toISOString()
    });

    // Build return object with mode-specific fields
    const result = {
      newFormation,
      updatedPlayers,
      newRotationQueue: newRotationQueue,
      newNextPlayerIdToSubOut: nextPlayerToSubOutId,
      newNextPlayerToSubOut: nextPlayerPositionInNewFormation || 'leftDefender',
      playersComingOnIds: [playerComingOnId],
      playersGoingOffIds: [playerGoingOffId]
    };

    // Add next-next tracking for modes that support it
    if (substituteRotationPattern === 'carousel' || substituteRotationPattern === 'advanced_carousel') {
      result.newNextNextPlayerIdToSubOut = newRotationQueue[1] || null;
    }

    console.log('✅ [SubstitutionManager] Final result ready:', {
      newNextPlayerIdToSubOut: result.newNextPlayerIdToSubOut,
      newNextPlayerToSubOut: result.newNextPlayerToSubOut,
      newNextNextPlayerIdToSubOut: result.newNextNextPlayerIdToSubOut,
      playersComingOnIds: result.playersComingOnIds,
      playersGoingOffIds: result.playersGoingOffIds,
      newRotationQueue: result.newRotationQueue?.slice(),
      resultComplete: !!(result.newFormation && result.updatedPlayers && result.newRotationQueue),
      timestamp: new Date().toISOString()
    });

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
export function createSubstitutionManager(teamMode, selectedFormation = null) {
  return new SubstitutionManager(teamMode, selectedFormation);
}