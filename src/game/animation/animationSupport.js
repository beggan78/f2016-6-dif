/**
 * New generic animation support utilities
 * Provides a unified approach for calculating and managing player position animations
 */
// No longer using findPlayerById in this file
import { FORMATION_TYPES } from '../../constants/playerConstants';
import { POSITION_KEYS, FORMATION_POSITIONS_WITH_GOALIE } from '../../constants/positionConstants';

// Animation timing constants
export const ANIMATION_DURATION = 1000; // 1 second for position transitions
export const GLOW_DURATION = 900; // 0.9 seconds for post-animation glow effect

// Layout measurements for animation distance calculations
const MEASUREMENTS = {
  padding: 16, // p-2 = 8px top + 8px bottom = 16px total
  border: 4,   // border-2 = 2px top + 2px bottom = 4px total
  gap: 8,      // space-y-2 = 8px between elements
  contentHeight: {
    pairs: 84,      // Content height for pair components
    individual: 76  // Content height for individual components
  }
};

/**
 * Get the total height of a position box including padding, border, and gap
 */
const getBoxHeight = (mode) => {
  const contentHeight = mode === 'pairs' ? MEASUREMENTS.contentHeight.pairs : MEASUREMENTS.contentHeight.individual;
  return MEASUREMENTS.padding + MEASUREMENTS.border + contentHeight + MEASUREMENTS.gap;
};

/**
 * Get the visual order index of a position in the UI layout
 */
const getPositionIndex = (position, formationType) => {
  const positions = FORMATION_POSITIONS_WITH_GOALIE[formationType] || [];
  return positions.indexOf(position);
};

/**
 * Calculate pixel distance between two position indices
 */
const calculateDistance = (fromIndex, toIndex, formationType) => {
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return 0;
  
  const mode = formationType === FORMATION_TYPES.PAIRS_7 ? 'pairs' : 'individual';
  const boxHeight = getBoxHeight(mode);
  const distance = Math.abs(toIndex - fromIndex) * boxHeight;
  return toIndex > fromIndex ? distance : -distance;
};

/**
 * Capture current positions of all players including goalie
 */
export const captureAllPlayerPositions = (periodFormation, allPlayers, formationType) => {
  const positions = {};
  
  // Add goalie
  if (periodFormation.goalie) {
    positions[periodFormation.goalie] = {
      playerId: periodFormation.goalie,
      position: POSITION_KEYS.GOALIE,
      positionIndex: getPositionIndex(POSITION_KEYS.GOALIE, formationType)
    };
  }
  
  // Add field and substitute players based on formation type
  if (formationType === FORMATION_TYPES.PAIRS_7) {
    // Pairs mode
    [POSITION_KEYS.LEFT_PAIR, POSITION_KEYS.RIGHT_PAIR, POSITION_KEYS.SUB_PAIR].forEach(pairKey => {
      const pair = periodFormation[pairKey];
      if (pair) {
        if (pair.defender) {
          positions[pair.defender] = {
            playerId: pair.defender,
            position: pairKey,
            positionIndex: getPositionIndex(pairKey, formationType),
            role: 'defender'
          };
        }
        if (pair.attacker) {
          positions[pair.attacker] = {
            playerId: pair.attacker,
            position: pairKey,
            positionIndex: getPositionIndex(pairKey, formationType),
            role: 'attacker'
          };
        }
      }
    });
  } else if (formationType === FORMATION_TYPES.INDIVIDUAL_6) {
    // 6-player individual mode
    [POSITION_KEYS.LEFT_DEFENDER, POSITION_KEYS.RIGHT_DEFENDER, POSITION_KEYS.LEFT_ATTACKER, POSITION_KEYS.RIGHT_ATTACKER, POSITION_KEYS.SUBSTITUTE].forEach(pos => {
      const playerId = periodFormation[pos];
      if (playerId) {
        positions[playerId] = {
          playerId: playerId,
          position: pos,
          positionIndex: getPositionIndex(pos, formationType)
        };
      }
    });
  } else if (formationType === FORMATION_TYPES.INDIVIDUAL_7) {
    // 7-player individual mode
    [POSITION_KEYS.LEFT_DEFENDER_7, POSITION_KEYS.RIGHT_DEFENDER_7, POSITION_KEYS.LEFT_ATTACKER_7, POSITION_KEYS.RIGHT_ATTACKER_7, POSITION_KEYS.SUBSTITUTE_7_1, POSITION_KEYS.SUBSTITUTE_7_2].forEach(pos => {
      const playerId = periodFormation[pos];
      if (playerId) {
        positions[playerId] = {
          playerId: playerId,
          position: pos,
          positionIndex: getPositionIndex(pos, formationType)
        };
      }
    });
  }
  
  return positions;
};

/**
 * Calculate animations needed to move players from before to after positions
 */
export const calculateAllPlayerAnimations = (beforePositions, afterPositions, formationType) => {
  const animations = {};
  
  // Find all players that need to move
  const allPlayerIds = new Set([
    ...Object.keys(beforePositions),
    ...Object.keys(afterPositions)
  ]);
  
  allPlayerIds.forEach(playerId => {
    const before = beforePositions[playerId];
    const after = afterPositions[playerId];
    
    // Skip if player didn't exist in both states or didn't move
    if (!before || !after || before.positionIndex === after.positionIndex) {
      return;
    }
    
    const distance = calculateDistance(before.positionIndex, after.positionIndex, formationType);
    
    if (distance !== 0) {
      animations[playerId] = {
        playerId: playerId,
        distance: distance,
        direction: distance > 0 ? 'down' : 'up',
        fromPosition: before.position,
        toPosition: after.position
      };
    }
  });
  
  return animations;
};

/**
 * Create a preview of what the state would look like after applying a logic function
 * This allows us to calculate animations before actually changing the state
 */
export const previewStateChange = (currentState, logicFunction) => {
  // Create a deep copy of the current state
  const stateCopy = JSON.parse(JSON.stringify(currentState));
  
  // Apply the logic function to the copy
  // Note: This assumes the logic function can accept a state object and return the modified state
  // For the actual implementation, we might need to adapt existing logic functions
  return logicFunction(stateCopy);
};

/**
 * Main animation orchestrator - handles the complete animation flow
 * This is the new unified approach that calculates before/after positions and animates the differences
 */
export const animateStateChange = (
  gameState,
  pureLogicFunction,
  applyStateFunction,
  setAnimationState,
  setHideNextOffIndicator,
  setRecentlySubstitutedPlayers
) => {
  // 1. Capture current positions
  const beforePositions = captureAllPlayerPositions(
    gameState.periodFormation, 
    gameState.allPlayers, 
    gameState.formationType
  );
  
  // 2. Calculate what the new state would be
  const newGameState = pureLogicFunction(gameState);
  
  // 3. Capture after positions
  const afterPositions = captureAllPlayerPositions(
    newGameState.periodFormation, 
    newGameState.allPlayers, 
    newGameState.formationType
  );
  
  // 4. Calculate animations needed
  const animations = calculateAllPlayerAnimations(beforePositions, afterPositions, gameState.formationType);
  
  // 5. Start animations if there are any
  if (Object.keys(animations).length > 0) {
    setAnimationState({
      type: 'generic',
      phase: 'switching',
      data: { animations }
    });
    
    if (setHideNextOffIndicator) {
      setHideNextOffIndicator(true);
    }
    
    // 6. Apply actual state changes after animation delay
    setTimeout(() => {
      applyStateFunction(newGameState);
      
      // Set glow effect for affected players
      if (setRecentlySubstitutedPlayers && newGameState.playersToHighlight?.length > 0) {
        setRecentlySubstitutedPlayers(new Set(newGameState.playersToHighlight));
      }
      
      // End animation
      setAnimationState(prev => ({
        ...prev,
        phase: 'completing'
      }));
      
      // After glow effect completes, reset everything
      setTimeout(() => {
        setAnimationState({
          type: 'none',
          phase: 'idle',
          data: {}
        });
        if (setHideNextOffIndicator) {
          setHideNextOffIndicator(false);
        }
        if (setRecentlySubstitutedPlayers) {
          setRecentlySubstitutedPlayers(new Set());
        }
      }, GLOW_DURATION);
    }, ANIMATION_DURATION);
  } else {
    // No animations needed, apply state changes immediately
    applyStateFunction(newGameState);
    
    // Still apply glow effect even without animations
    if (setRecentlySubstitutedPlayers && newGameState.playersToHighlight?.length > 0) {
      setRecentlySubstitutedPlayers(new Set(newGameState.playersToHighlight));
      
      // Clear glow after delay
      setTimeout(() => {
        setRecentlySubstitutedPlayers(new Set());
      }, GLOW_DURATION);
    }
  }
};

/**
 * Helper function to get animation properties for a specific player during rendering
 */
export const getPlayerAnimationProps = (playerId, animationState) => {
  if (animationState.type !== 'generic' || animationState.phase !== 'switching') {
    return null;
  }
  
  const playerAnimation = animationState.data.animations?.[playerId];
  if (!playerAnimation) {
    return null;
  }
  
  return {
    animationClass: playerAnimation.direction === 'down' ? 'animate-dynamic-down' : 'animate-dynamic-up',
    zIndexClass: playerAnimation.direction === 'down' ? 'z-10' : 'z-20',
    styleProps: {
      '--move-distance': `${playerAnimation.distance}px`
    }
  };
};

// Export the helper functions for backward compatibility during transition
export { getPositionIndex, calculateDistance, getBoxHeight };