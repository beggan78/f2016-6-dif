/**
 * Animation Support Module - Unified Player Movement System
 * 
 * This module provides a comprehensive animation system for smooth player position transitions
 * across all team modes and formation types. It handles:
 * 
 * - Position-based movement calculations
 * - CSS animation orchestration with precise timing
 * - Glow effect coordination for visual feedback
 * - Hardware-accelerated smooth transitions
 * 
 * ============================================================================
 * SYSTEM ARCHITECTURE DIAGRAM
 * ============================================================================
 * 
 * User Interaction Flow:
 * ┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
 * │ User Action     │ -> │ Handler Function │ -> │ animateStateChange  │
 * │ (Click, Touch)  │    │ (handleSub, etc) │    │ (Main Orchestrator) │
 * └─────────────────┘    └──────────────────┘    └─────────────────────┘
 *                                                          │
 *                                ┌─────────────────────────┴─────────────────────────┐
 *                                │                                                   │
 *                                ▼                                                   ▼
 * ┌─────────────────────────────────────────────────────────────┐    ┌─────────────────────────┐
 * │ PHASE 1: Position Capture & Calculation (0ms)              │    │ PHASE 2: Animation      │
 * │                                                             │    │ Decision Logic          │
 * │ 1. captureAllPlayerPositions(BEFORE)                       │    │                         │
 * │ 2. pureLogicFunction(gameState) -> newGameState             │    │ calculateAnimations()   │
 * │ 3. captureAllPlayerPositions(AFTER)                        │    │ ↓                       │
 * │ 4. calculateAllPlayerAnimations(before, after)             │    │ Has movements?          │
 * └─────────────────────────────────────────────────────────────┘    └─────────────────────────┘
 *                                │                                                   │
 *                                ▼                                                   ▼
 * ┌─────────────────────────────────────────────────────────────┐    ┌─────────────────────────┐
 * │ PHASE 3: CSS Animation Start (0ms - 1000ms)                │    │ PHASE 4: Direct Apply  │
 * │                                                             │    │ (No animations needed)  │
 * │ setAnimationState({ type: 'generic', phase: 'switching' }) │    │                         │
 * │ setHideNextOffIndicator(true)                              │    │ applyStateFunction()    │
 * │ Apply CSS classes: animate-dynamic-up/down                  │    │ Apply glow effects      │
 * │ Set CSS variables: --move-distance                          │    │ Auto-cleanup after     │
 * │ Players move visually to new positions                      │    │ GLOW_DURATION           │
 * └─────────────────────────────────────────────────────────────┘    └─────────────────────────┘
 *                                │
 *                                ▼ (After ANIMATION_DURATION)
 * ┌─────────────────────────────────────────────────────────────┐
 * │ PHASE 5: State Update & Glow (1000ms - 1900ms)             │
 * │                                                             │
 * │ applyStateFunction(newGameState)                           │
 * │ setRecentlySubstitutedPlayers(playersToHighlight)         │
 * │ setAnimationState({ phase: 'completing' })                 │
 * │ Apply glow effect CSS classes                               │
 * └─────────────────────────────────────────────────────────────┘
 *                                │
 *                                ▼ (After GLOW_DURATION)
 * ┌─────────────────────────────────────────────────────────────┐
 * │ PHASE 6: Cleanup (1900ms)                                  │
 * │                                                             │
 * │ setAnimationState({ type: 'none', phase: 'idle' })        │
 * │ setRecentlySubstitutedPlayers(new Set())                  │
 * │ setHideNextOffIndicator(false)                            │
 * │ Animation cycle complete                                    │
 * └─────────────────────────────────────────────────────────────┘
 * 
 * ============================================================================
 * COMPONENT INTEGRATION ARCHITECTURE
 * ============================================================================
 * 
 * React Component Tree:
 * ┌──────────────────────┐
 * │ GameScreen           │ <- Main component with animation state
 * │ (Has animation hooks)│
 * └──────────┬───────────┘
 *            │
 *            ▼
 * ┌──────────────────────┐    ┌─────────────────────┐
 * │ Formation Components │ -> │ Animation Utilities │
 * │ - IndividualFormation│    │ - getPlayerAnimation│
 * │ - PairsFormation     │    │ - getPairAnimation  │
 * └──────────┬───────────┘    └─────────────────────┘
 *            │
 *            ▼
 * ┌──────────────────────┐    ┌─────────────────────┐
 * │ Player Components    │ -> │ CSS Classes Applied │
 * │ - PlayerBox          │    │ - animate-dynamic-* │
 * │ - PairBox            │    │ - z-index classes   │
 * └──────────────────────┘    │ - glow effect CSS   │
 *                             └─────────────────────┘
 * 
 * ============================================================================
 * POSITION INDEX MAPPING SYSTEM
 * ============================================================================
 * 
 * Individual 6-Player Mode Visual Layout:
 * ┌─────────────────┐ Index 0
 * │ Goalie          │
 * ├─────────────────┤ Index 1  
 * │ Left Defender   │
 * ├─────────────────┤ Index 2
 * │ Right Defender  │
 * ├─────────────────┤ Index 3
 * │ Left Attacker   │
 * ├─────────────────┤ Index 4
 * │ Right Attacker  │ 
 * ├─────────────────┤ Index 5
 * │ Substitute      │
 * └─────────────────┘
 * 
 * Distance Calculation Example:
 * Player moving from leftDefender(1) to substitute(5):
 * - Index difference: 5 - 1 = 4 positions
 * - Distance: 4 × 104px = 416px downward
 * - CSS: transform: translateY(416px)
 * 
 * ============================================================================
 * CSS ANIMATION COORDINATION
 * ============================================================================
 * 
 * Timing Synchronization:
 * ┌─────────────────────────────────────────────────────────────┐
 * │ JavaScript                                                  │
 * │ ┌─────┐         ┌──────────────┐         ┌──────────────┐  │
 * │ │ 0ms │ -----> │ 1000ms       │ -----> │ 1900ms       │  │
 * │ │Start│         │State Update  │         │Cleanup       │  │
 * │ └─────┘         └──────────────┘         └──────────────┘  │
 * └─────────────────────────────────────────────────────────────┘
 * ┌─────────────────────────────────────────────────────────────┐
 * │ CSS Animations                                              │
 * │ ┌─────────────────────────────────┐   ┌───────────────────┐ │
 * │ │ Position Animation (1000ms)     │   │ Glow Effect       │ │
 * │ │ - animate-dynamic-up/down       │   │ - animate-pulse   │ │
 * │ │ - translateY(distance)          │   │ - shadow effects  │ │
 * │ │ - z-index management            │   │ (900ms)           │ │
 * │ └─────────────────────────────────┘   └───────────────────┘ │
 * └─────────────────────────────────────────────────────────────┘
 * 
 * ARCHITECTURE:
 * The system follows a pure function approach where game logic is separated from visual effects.
 * All movements use the same `animateStateChange()` entry point for consistency.
 * 
 * USAGE PATTERN:
 * ```javascript
 * animateStateChange(
 *   gameState,                    // Current state
 *   calculateOperation,           // Pure logic function
 *   applyStateChanges,           // State update function
 *   setAnimationState,           // Animation management
 *   setHideNextOffIndicator,     // UI control
 *   setRecentlySubstitutedPlayers // Glow effects
 * );
 * ```
 * 
 * @see README.md for complete documentation
 * @see QUICK_REFERENCE.md for common usage patterns
 */
// No longer using findPlayerById in this file
import { POSITION_KEYS } from '../../constants/positionConstants';
import { getFormationPositionsWithGoalie, getModeDefinition, isIndividualMode } from '../../constants/gameModes';

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
 * 
 * This calculation is critical for accurate animation distances. It must match
 * the actual rendered heights of player/pair components in the UI.
 * 
 * @param {string} mode - 'pairs' or 'individual' based on team mode
 * @returns {number} Total height in pixels including all spacing
 * 
 * @example
 * const height = getBoxHeight('individual'); // Returns 104px total
 * // Breakdown: 16px padding + 4px border + 76px content + 8px gap = 104px
 */
const getBoxHeight = (mode) => {
  const contentHeight = mode === 'pairs' ? MEASUREMENTS.contentHeight.pairs : MEASUREMENTS.contentHeight.individual;
  return MEASUREMENTS.padding + MEASUREMENTS.border + contentHeight + MEASUREMENTS.gap;
};

/**
 * Get the visual order index of a position in the UI layout
 * 
 * Maps logical position keys to their visual rendering order. This determines
 * animation distances by calculating index differences.
 * 
 * @param {string} position - Position key (e.g., 'leftDefender', 'defender', 'goalie', 'leftPair')
 * @param {Object} teamConfig - Team configuration object
 * @param {string} selectedFormation - Formation type ('2-2', '1-2-1', etc.) for formation-aware positioning
 * @returns {number} Zero-based index representing visual order (-1 if not found)
 * 
 * @example
 * // Individual 6-player mode position order in 1-2-1 formation:
 * // goalie(0) → defender(1) → left(2) → right(3) → attacker(4) → substitute(5)
 * getPositionIndex('defender', teamConfig, '1-2-1'); // Returns 1
 * getPositionIndex('substitute', teamConfig, '1-2-1');   // Returns 5
 */
const getPositionIndex = (position, teamConfig, selectedFormation = null) => {
  try {
    const positions = getFormationPositionsWithGoalie(teamConfig);
    const index = positions.indexOf(position);
    
    return index;
  } catch (error) {
    console.warn(`Error getting position index for ${position} in ${teamConfig}:`, error);
    return -1;
  }
};

/**
 * Calculate pixel distance between two position indices
 * 
 * Determines the exact pixel distance for CSS transform animations based on
 * visual position differences. Positive values = downward movement,
 * negative values = upward movement.
 * 
 * @param {number} fromIndex - Starting position index
 * @param {number} toIndex - Ending position index  
 * @param {Object} teamConfig - Team configuration object for height calculations
 * @returns {number} Signed pixel distance (+ = down, - = up, 0 = no movement)
 * 
 * @example
 * // Player moving from leftDefender(1) to substitute(5) in Individual 6-player
 * calculateDistance(1, 5, teamConfig); // Returns +416px (4 positions down)
 * 
 * // Player moving from substitute(5) to leftDefender(1) 
 * calculateDistance(5, 1, teamConfig); // Returns -416px (4 positions up)
 */
const calculateDistance = (fromIndex, toIndex, teamConfig) => {
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return 0;
  
  const mode = teamConfig?.substitutionType === 'pairs' ? 'pairs' : 'individual';
  const boxHeight = getBoxHeight(mode);
  const distance = Math.abs(toIndex - fromIndex) * boxHeight * 0.9025;
  return toIndex > fromIndex ? distance : -distance;
};

/**
 * Capture current positions of all players including goalie
 * 
 * Creates a snapshot of where all players are currently positioned in the formation.
 * This is used to calculate animation requirements by comparing before/after states.
 * 
 * @param {Object} formation - Current formation with player assignments
 * @param {Array} allPlayers - Complete player data array
 * @param {Object} teamConfig - Team configuration object
 * @param {string} selectedFormation - Formation type ('2-2', '1-2-1', etc.) - REQUIRED for formation-aware animations
 * @returns {Object} Position snapshot: { [playerId]: PositionData }
 * 
 * PositionData structure:
 * - playerId: string - Player's unique identifier
 * - position: string - Position key (e.g., 'leftDefender', 'defender', 'goalie')  
 * - positionIndex: number - Visual order index for animation calculations
 * - role?: string - Player role for pairs mode ('defender' or 'attacker')
 * 
 * @example
 * const positions = captureAllPlayerPositions(formation, players, teamConfig, '1-2-1');
 * // Returns: {
 * //   "player1": { playerId: "player1", position: "goalie", positionIndex: 0 },
 * //   "player2": { playerId: "player2", position: "defender", positionIndex: 1 },  // 1-2-1 formation
 * //   ...
 * // }
 */
export const captureAllPlayerPositions = (formation, allPlayers, teamConfig, selectedFormation = null) => {
  const positions = {};
  
  // Add goalie
  if (formation.goalie) {
    positions[formation.goalie] = {
      playerId: formation.goalie,
      position: POSITION_KEYS.GOALIE,
      positionIndex: getPositionIndex(POSITION_KEYS.GOALIE, teamConfig, selectedFormation)
    };
  }
  
  // Add field and substitute players based on team mode
  if (teamConfig?.substitutionType === 'pairs') {
    // Pairs mode
    [POSITION_KEYS.LEFT_PAIR, POSITION_KEYS.RIGHT_PAIR, POSITION_KEYS.SUB_PAIR].forEach(pairKey => {
      const pair = formation[pairKey];
      if (pair) {
        if (pair.defender) {
          positions[pair.defender] = {
            playerId: pair.defender,
            position: pairKey,
            positionIndex: getPositionIndex(pairKey, teamConfig, selectedFormation),
            role: 'defender'
          };
        }
        if (pair.attacker) {
          positions[pair.attacker] = {
            playerId: pair.attacker,
            position: pairKey,
            positionIndex: getPositionIndex(pairKey, teamConfig, selectedFormation),
            role: 'attacker'
          };
        }
      }
    });
  } else if (isIndividualMode(teamConfig)) {
    // Unified individual mode handling using dynamic definitions
    const modeDefinition = getModeDefinition(teamConfig);
    
    if (modeDefinition) {
      const allPositions = [...modeDefinition.fieldPositions, ...modeDefinition.substitutePositions];

      allPositions.forEach(pos => {
        const playerId = formation[pos];
        if (playerId) {
          const positionIndex = getPositionIndex(pos, teamConfig, selectedFormation);
          positions[playerId] = {
            playerId: playerId,
            position: pos,
            positionIndex: positionIndex
          };
        }
      });
      
    }
  }
  
  return positions;
};

/**
 * Calculate animations needed to move players from before to after positions
 * 
 * Compares position snapshots to determine which players need to move and how.
 * Only calculates animations for players whose positions actually changed.
 * 
 * @param {Object} beforePositions - Position snapshot before state change
 * @param {Object} afterPositions - Position snapshot after state change  
 * @param {Object} teamConfig - Team configuration object for distance calculations
 * @returns {Object} Animation data: { [playerId]: AnimationData }
 * 
 * AnimationData structure:
 * - playerId: string - Player's unique identifier
 * - distance: number - Signed pixel distance to move (+ = down, - = up)
 * - direction: string - 'up' or 'down' movement direction
 * - fromPosition: string - Starting position key
 * - toPosition: string - Ending position key
 * 
 * @example
 * const animations = calculateAllPlayerAnimations(before, after, teamConfig);
 * // Returns: {
 * //   "player1": {
 * //     playerId: "player1",
 * //     distance: 208,
 * //     direction: "down", 
 * //     fromPosition: "leftDefender",
 * //     toPosition: "substitute_1"
 * //   }
 * // }
 */
export const calculateAllPlayerAnimations = (beforePositions, afterPositions, teamConfig) => {
  const animations = {};
  
  // Handle null/undefined position data gracefully
  if (!beforePositions || !afterPositions) {
    return animations;
  }
  
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
    
    const distance = calculateDistance(before.positionIndex, after.positionIndex, teamConfig);
    
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
 * Main Animation Orchestrator - Unified Entry Point for All Player Movements
 * 
 * This is the core function that handles the complete animation lifecycle for any
 * player position changes. It provides a consistent interface for all movement types
 * and coordinates timing between visual animations and state updates.
 * 
 * ANIMATION FLOW:
 * 1. Capture current player positions (0ms)
 * 2. Calculate new state using pure logic function (0ms)
 * 3. Calculate required animations by comparing positions (0ms)
 * 4. Start CSS animations if needed (0ms - 1000ms)
 * 5. Apply state changes after animations complete (1000ms)
 * 6. Show glow effects on affected players (1000ms - 1900ms)
 * 7. Clean up animation state (1900ms)
 * 
 * @param {Object} gameState - Current complete game state
 * @param {Function} pureLogicFunction - Pure function that calculates new state
 *   - Must return new state object with `playersToHighlight` array for glow effects
 *   - Should not modify input state (pure function requirement)
 * @param {Function} applyStateFunction - Function to apply calculated state changes
 *   - Called after animations complete to update React state
 *   - Should apply ALL necessary state updates (formation, players, queues, etc.)
 * @param {Function} setAnimationState - Animation state management function
 * @param {Function} setHideNextOffIndicator - Function to hide UI indicators during animation
 * @param {Function} setRecentlySubstitutedPlayers - Function to manage glow effects
 * 
 * @example
 * // Basic substitution
 * animateStateChange(
 *   gameState,
 *   calculateSubstitution,
 *   (newState) => {
 *     setFormation(newState.formation);
 *     setAllPlayers(newState.allPlayers);
 *     setRotationQueue(newState.rotationQueue);
 *   },
 *   setAnimationState,
 *   setHideNextOffIndicator,
 *   setRecentlySubstitutedPlayers
 * );
 * 
 * @example
 * // Position switch with parameters
 * animateStateChange(
 *   gameState,
 *   (state) => calculatePositionSwitch(state, player1Id, player2Id),
 *   (newState) => {
 *     setFormation(newState.formation);
 *     setAllPlayers(newState.allPlayers);
 *   },
 *   setAnimationState,
 *   setHideNextOffIndicator,
 *   setRecentlySubstitutedPlayers
 * );
 * 
 * @see README.md for complete usage guide
 * @see QUICK_REFERENCE.md for common patterns
 */
export const animateStateChange = (
  gameState,
  pureLogicFunction,
  applyStateFunction,
  setAnimationState,
  setHideNextOffIndicator,
  setRecentlySubstitutedPlayers
) => {

  // 1. Capture current positions - NOW FORMATION-AWARE
  const beforePositions = captureAllPlayerPositions(
    gameState.formation,
    gameState.allPlayers, 
    gameState.teamConfig,
    gameState.selectedFormation // Pass selected formation for correct position mapping
  );
  
  // 2. Calculate what the new state would be
  const newGameState = pureLogicFunction(gameState);
  
  // 3. Capture after positions - NOW FORMATION-AWARE
  const afterPositions = captureAllPlayerPositions(
    newGameState.formation,
    newGameState.allPlayers, 
    newGameState.teamConfig,
    newGameState.selectedFormation || gameState.selectedFormation // Use new or fallback to current
  );
  
  // 4. Calculate animations needed
  const animations = calculateAllPlayerAnimations(beforePositions, afterPositions, gameState.teamConfig);

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