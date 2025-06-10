/**
 * Animation support utilities
 * Provides calculations and measurements needed for smooth UI animations
 */
import { findPlayerById } from './playerUtils';

/**
 * Creates an animation calculator with methods for position and distance calculations
 * @param {boolean} isPairsMode - Whether the game is in pairs formation mode
 * @param {boolean} isIndividual6Mode - Whether the game is in 6-player individual mode
 * @param {boolean} isIndividual7Mode - Whether the game is in 7-player individual mode
 * @param {string} nextPhysicalPairToSubOut - Next pair to substitute out (pairs mode)
 * @param {string} nextPlayerIdToSubOut - Next player ID to substitute out
 * @param {Object} periodFormation - Current period formation data
 * @param {Array} allPlayers - Array of all players
 * @returns {Object} Animation calculator with calculation methods
 */
export const createAnimationCalculator = (
  isPairsMode,
  isIndividual6Mode,
  isIndividual7Mode,
  nextPhysicalPairToSubOut,
  nextPlayerIdToSubOut,
  periodFormation,
  allPlayers
) => {
  // Updated measurements for compact design - let's be more generous to account for all spacing
  const MEASUREMENTS = {
    padding: 16, // p-2 = 8px top + 8px bottom = 16px total
    border: 4,   // border-2 = 2px top + 2px bottom = 4px total
    gap: 0,      // space-y-2 = 8px between elements
    contentHeight: {
      // Being more generous with content heights to account for line heights, margins, etc.
      pairs: 84,      // Was 76, increased to account for all text spacing
      individual: 76  // Was 68, increased to account for all text spacing
    }
  };

  const getBoxHeight = (mode) => {
    const contentHeight = mode === 'pairs' ? MEASUREMENTS.contentHeight.pairs : MEASUREMENTS.contentHeight.individual;
    // Total height = padding + border + content + gap to next element
    return MEASUREMENTS.padding + MEASUREMENTS.border + contentHeight + MEASUREMENTS.gap;
  };

  const getPositionIndex = (position, mode) => {
    const positionArrays = {
      pairs: ['leftPair', 'rightPair', 'subPair'],
      individual6: ['leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker', 'substitute'],
      individual7: ['leftDefender7', 'rightDefender7', 'leftAttacker7', 'rightAttacker7', 'substitute7_1', 'substitute7_2']
    };
    
    const positions = positionArrays[mode] || [];
    return positions.indexOf(position);
  };

  const calculateDistance = (fromIndex, toIndex, mode) => {
    // Special case: if either index is -1, it means we have an invalid position
    // EXCEPT for goalie animations where -1 represents the goalie position
    if ((fromIndex === -1 && toIndex === -1) || (fromIndex < -1 || toIndex < -1)) return 0;
    
    const boxHeight = getBoxHeight(mode);
    const distance = Math.abs(toIndex - fromIndex) * boxHeight;
    const result = toIndex > fromIndex ? distance : -distance;
    
    console.log('🎬 Distance calculation - fromIndex:', fromIndex, 'toIndex:', toIndex, 'boxHeight:', boxHeight, 'result:', result);
    
    return result;
  };

  return {
    // Expose helper methods
    getPositionIndex,
    calculateDistance,
    getBoxHeight,

    // Calculate substitution animation distances
    calculateSubstitutionDistances: () => {
      let nextOffIndex = -1;
      let subIndex = -1;
      let mode = 'individual';
      
      if (isPairsMode) {
        mode = 'pairs';
        nextOffIndex = getPositionIndex(nextPhysicalPairToSubOut, 'pairs');
        subIndex = getPositionIndex('subPair', 'pairs');
      } else if (isIndividual6Mode) {
        mode = 'individual';
        const positions = ['leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker', 'substitute'];
        nextOffIndex = positions.findIndex(pos => periodFormation[pos] === nextPlayerIdToSubOut);
        subIndex = getPositionIndex('substitute', 'individual6');
      } else if (isIndividual7Mode) {
        mode = 'individual';
        const positions = ['leftDefender7', 'rightDefender7', 'leftAttacker7', 'rightAttacker7', 'substitute7_1', 'substitute7_2'];
        nextOffIndex = positions.findIndex(pos => periodFormation[pos] === nextPlayerIdToSubOut);
        subIndex = getPositionIndex('substitute7_1', 'individual7');
      }
      
      return {
        nextOffToSub: calculateDistance(nextOffIndex, subIndex, mode),
        subToNextOff: calculateDistance(subIndex, nextOffIndex, mode)
      };
    },

    // Calculate position switch animation distances
    calculatePositionSwitchDistances: (player1Id, player2Id) => {
      const player1 = findPlayerById(allPlayers, player1Id);
      const player2 = findPlayerById(allPlayers, player2Id);
      
      if (!player1 || !player2) return { player1Distance: 0, player2Distance: 0 };
      
      const player1Position = player1.stats.currentPairKey;
      const player2Position = player2.stats.currentPairKey;
      
      let mode = 'individual';
      let modeKey = 'individual6';
      
      if (isPairsMode) {
        mode = 'pairs';
        modeKey = 'pairs';
      } else if (isIndividual7Mode) {
        modeKey = 'individual7';
      }
      
      const player1Index = getPositionIndex(player1Position, modeKey);
      const player2Index = getPositionIndex(player2Position, modeKey);
      
      return {
        player1Distance: calculateDistance(player1Index, player2Index, mode),
        player2Distance: calculateDistance(player2Index, player1Index, mode)
      };
    },

    // Calculate 7-player individual mode specific distances
    calculate7PlayerDistances: () => {
      const positions = ['leftDefender7', 'rightDefender7', 'leftAttacker7', 'rightAttacker7', 'substitute7_1', 'substitute7_2'];
      const fieldPlayerIndex = positions.findIndex(pos => periodFormation[pos] === nextPlayerIdToSubOut);
      const sub1Index = getPositionIndex('substitute7_1', 'individual7');
      const sub2Index = getPositionIndex('substitute7_2', 'individual7');
      
      if (fieldPlayerIndex === -1) {
        return { fieldToSub2: 0, sub1ToField: 0, sub2ToSub1: 0, nextOffToSub: 0, subToNextOff: 0 };
      }
      
      const fieldToSub2 = calculateDistance(fieldPlayerIndex, sub2Index, 'individual');
      const sub1ToField = calculateDistance(sub1Index, fieldPlayerIndex, 'individual');
      const sub2ToSub1 = calculateDistance(sub2Index, sub1Index, 'individual');
      
      return {
        fieldToSub2,
        sub1ToField,
        sub2ToSub1,
        nextOffToSub: fieldToSub2,
        subToNextOff: sub1ToField
      };
    },

    // Calculate goalie replacement animation distances
    calculateGoalieReplacementDistances: (newGoalieId) => {
      console.log('🎬 Animation calculator - newGoalieId:', newGoalieId);
      const newGoalie = findPlayerById(allPlayers, newGoalieId);
      if (!newGoalie) {
        console.log('🎬 Animation calculator - newGoalie not found');
        return { goalieToField: 0, fieldToGoalie: 0 };
      }
      
      const newGoaliePosition = newGoalie.stats.currentPairKey;
      console.log('🎬 Animation calculator - newGoaliePosition:', newGoaliePosition);
      
      // Goalie is always at position -1 (above all other positions)
      const goalieIndex = -1;
      
      let mode = 'individual';
      let modeKey = 'individual6';
      
      if (isPairsMode) {
        mode = 'pairs';
        modeKey = 'pairs';
      } else if (isIndividual7Mode) {
        modeKey = 'individual7';
      }
      
      console.log('🎬 Animation calculator - mode:', mode, 'modeKey:', modeKey);
      
      const fieldPlayerIndex = getPositionIndex(newGoaliePosition, modeKey);
      console.log('🎬 Animation calculator - fieldPlayerIndex:', fieldPlayerIndex, 'goalieIndex:', goalieIndex);
      
      // Calculate distances - goalie moves down to field, field player moves up to goalie
      const goalieToField = calculateDistance(goalieIndex, fieldPlayerIndex, mode);
      const fieldToGoalie = calculateDistance(fieldPlayerIndex, goalieIndex, mode);
      
      console.log('🎬 Animation calculator - goalieToField:', goalieToField, 'fieldToGoalie:', fieldToGoalie);
      
      return {
        goalieToField: goalieToField,
        fieldToGoalie: fieldToGoalie,
        newGoalieId: newGoalieId,
        newGoaliePosition: newGoaliePosition
      };
    }
  };
};