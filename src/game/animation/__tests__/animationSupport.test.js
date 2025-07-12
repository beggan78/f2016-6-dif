/**
 * Unit tests for animation calculation functions
 * Tests position mapping and movement calculations (non-DOM aspects)
 */

import {
  captureAllPlayerPositions,
  calculateAllPlayerAnimations
} from '../animationSupport';

import { TEAM_MODES } from '../../../constants/playerConstants';
import { POSITION_KEYS } from '../../../constants/positionConstants';
import {
  createMockGameState,
  createMockFormation,
  createMockPlayers
} from '../../testUtils';

describe('animationSupport', () => {
  describe('captureAllPlayerPositions', () => {
    test('should capture positions for INDIVIDUAL_6 team mode', () => {
      const formation = createMockFormation(TEAM_MODES.INDIVIDUAL_6);
      const players = createMockPlayers(6, TEAM_MODES.INDIVIDUAL_6);
      
      const positions = captureAllPlayerPositions(formation, players, TEAM_MODES.INDIVIDUAL_6);
      
      expect(positions).toBeDefined();
      expect(typeof positions).toBe('object');
      
      // Should have position mappings for all players
      expect(positions['1']).toBeDefined(); // leftDefender
      expect(positions['2']).toBeDefined(); // rightDefender
      expect(positions['3']).toBeDefined(); // leftAttacker
      expect(positions['4']).toBeDefined(); // rightAttacker
      expect(positions['5']).toBeDefined(); // substitute_1
      expect(positions['6']).toBeDefined(); // goalie
    });

    test('should capture positions for INDIVIDUAL_7 team mode', () => {
      const formation = createMockFormation(TEAM_MODES.INDIVIDUAL_7);
      const players = createMockPlayers(7, TEAM_MODES.INDIVIDUAL_7);
      
      const positions = captureAllPlayerPositions(formation, players, TEAM_MODES.INDIVIDUAL_7);
      
      expect(positions).toBeDefined();
      
      // Should have position mappings for all players
      expect(positions['1']).toBeDefined(); // leftDefender
      expect(positions['2']).toBeDefined(); // rightDefender
      expect(positions['3']).toBeDefined(); // leftAttacker
      expect(positions['4']).toBeDefined(); // rightAttacker
      expect(positions['5']).toBeDefined(); // substitute_1
      expect(positions['6']).toBeDefined(); // substitute_2
      expect(positions['7']).toBeDefined(); // goalie
    });

    test('should capture positions for PAIRS_7 team mode', () => {
      const formation = createMockFormation(TEAM_MODES.PAIRS_7);
      const players = createMockPlayers(7, TEAM_MODES.PAIRS_7);
      
      const positions = captureAllPlayerPositions(formation, players, TEAM_MODES.PAIRS_7);
      
      expect(positions).toBeDefined();
      
      // Should have position mappings for all players
      expect(positions['1']).toBeDefined(); // leftPair.defender
      expect(positions['2']).toBeDefined(); // leftPair.attacker
      expect(positions['3']).toBeDefined(); // rightPair.defender
      expect(positions['4']).toBeDefined(); // rightPair.attacker
      expect(positions['5']).toBeDefined(); // subPair.defender
      expect(positions['6']).toBeDefined(); // subPair.attacker
      expect(positions['7']).toBeDefined(); // goalie
    });

    test('should map players to correct position indices for INDIVIDUAL_6', () => {
      const formation = createMockFormation(TEAM_MODES.INDIVIDUAL_6);
      const players = createMockPlayers(6, TEAM_MODES.INDIVIDUAL_6);
      
      const positions = captureAllPlayerPositions(formation, players, TEAM_MODES.INDIVIDUAL_6);
      
      // Check position indices match expected layout (goalie first in positionOrder)
      expect(positions['1'].positionIndex).toBe(1); // leftDefender
      expect(positions['2'].positionIndex).toBe(2); // rightDefender
      expect(positions['3'].positionIndex).toBe(3); // leftAttacker
      expect(positions['4'].positionIndex).toBe(4); // rightAttacker
      expect(positions['5'].positionIndex).toBe(5); // substitute_1
      expect(positions['6'].positionIndex).toBe(0); // goalie
    });

    test('should map players to correct position indices for INDIVIDUAL_7', () => {
      const formation = createMockFormation(TEAM_MODES.INDIVIDUAL_7);
      const players = createMockPlayers(7, TEAM_MODES.INDIVIDUAL_7);
      
      const positions = captureAllPlayerPositions(formation, players, TEAM_MODES.INDIVIDUAL_7);
      
      // Check position indices match expected layout (goalie first in positionOrder)
      expect(positions['1'].positionIndex).toBe(1); // leftDefender
      expect(positions['2'].positionIndex).toBe(2); // rightDefender
      expect(positions['3'].positionIndex).toBe(3); // leftAttacker
      expect(positions['4'].positionIndex).toBe(4); // rightAttacker
      expect(positions['5'].positionIndex).toBe(5); // substitute_1
      expect(positions['6'].positionIndex).toBe(6); // substitute_2
      expect(positions['7'].positionIndex).toBe(0); // goalie
    });

    test('should map players to correct position indices for PAIRS_7', () => {
      const formation = createMockFormation(TEAM_MODES.PAIRS_7);
      const players = createMockPlayers(7, TEAM_MODES.PAIRS_7);
      
      const positions = captureAllPlayerPositions(formation, players, TEAM_MODES.PAIRS_7);
      
      // Check position indices match expected layout (goalie first in positionOrder)
      expect(positions['1'].positionIndex).toBe(1); // leftPair.defender
      expect(positions['2'].positionIndex).toBe(1); // leftPair.attacker (same pair)
      expect(positions['3'].positionIndex).toBe(2); // rightPair.defender
      expect(positions['4'].positionIndex).toBe(2); // rightPair.attacker (same pair)
      expect(positions['5'].positionIndex).toBe(3); // subPair.defender
      expect(positions['6'].positionIndex).toBe(3); // subPair.attacker (same pair)
      expect(positions['7'].positionIndex).toBe(0); // goalie
    });

    test('should include role information in position data for pairs mode', () => {
      const formation = createMockFormation(TEAM_MODES.PAIRS_7);
      const players = createMockPlayers(7, TEAM_MODES.PAIRS_7);
      
      const positions = captureAllPlayerPositions(formation, players, TEAM_MODES.PAIRS_7);
      
      // Check that role information is captured for pairs mode
      expect(positions['1'].role).toBeDefined(); // leftPair defender
      expect(positions['2'].role).toBeDefined(); // leftPair attacker
      expect(positions['1'].role).toBe('defender');
      expect(positions['2'].role).toBe('attacker');
      // Goalie does not have role information in position data
    });

    test('should handle missing players gracefully', () => {
      const formation = createMockFormation(TEAM_MODES.INDIVIDUAL_6);
      const players = []; // Empty players array
      
      const positions = captureAllPlayerPositions(formation, players, TEAM_MODES.INDIVIDUAL_6);
      
      expect(positions).toBeDefined();
      expect(typeof positions).toBe('object');
      // Should still return position mapping structure even with missing players
    });

    test('should handle unknown team mode gracefully', () => {
      const formation = createMockFormation(TEAM_MODES.INDIVIDUAL_6);
      const players = createMockPlayers(6, TEAM_MODES.INDIVIDUAL_6);
      
      const positions = captureAllPlayerPositions(formation, players, 'UNKNOWN_TEAM_MODE');
      
      expect(positions).toBeDefined();
      expect(typeof positions).toBe('object');
    });
  });

  describe('calculateAllPlayerAnimations', () => {
    test('should detect no movement when positions unchanged', () => {
      const formation = createMockFormation(TEAM_MODES.INDIVIDUAL_6);
      const players = createMockPlayers(6, TEAM_MODES.INDIVIDUAL_6);
      
      const beforePositions = captureAllPlayerPositions(formation, players, TEAM_MODES.INDIVIDUAL_6);
      const afterPositions = captureAllPlayerPositions(formation, players, TEAM_MODES.INDIVIDUAL_6);
      
      const animations = calculateAllPlayerAnimations(beforePositions, afterPositions, TEAM_MODES.INDIVIDUAL_6);
      
      expect(animations).toBeDefined();
      expect(typeof animations).toBe('object');
      
      // No players should be animating if positions are the same
      expect(Object.keys(animations)).toHaveLength(0);
    });

    test('should detect movement when positions change', () => {
      const beforeFormation = createMockFormation(TEAM_MODES.INDIVIDUAL_6);
      const afterFormation = { ...beforeFormation };
      
      // Swap two players
      afterFormation.leftDefender = beforeFormation.rightDefender;
      afterFormation.rightDefender = beforeFormation.leftDefender;
      
      const players = createMockPlayers(6, TEAM_MODES.INDIVIDUAL_6);
      
      const beforePositions = captureAllPlayerPositions(beforeFormation, players, TEAM_MODES.INDIVIDUAL_6);
      const afterPositions = captureAllPlayerPositions(afterFormation, players, TEAM_MODES.INDIVIDUAL_6);
      
      const animations = calculateAllPlayerAnimations(beforePositions, afterPositions, TEAM_MODES.INDIVIDUAL_6);
      
      // The two swapped players should be moving
      const animationEntries = Object.entries(animations);
      expect(animationEntries.length).toBe(2);
      
      // Check that the moving players have the right animation data
      animationEntries.forEach(([playerId, animation]) => {
        expect(Math.abs(animation.distance)).toBeGreaterThan(0);
        expect(['up', 'down']).toContain(animation.direction);
        expect(typeof animation.fromPosition).toBe('string');
        expect(typeof animation.toPosition).toBe('string');
      });
    });

    test('should calculate correct movement direction (up vs down)', () => {
      const beforeFormation = createMockFormation(TEAM_MODES.INDIVIDUAL_6);
      const afterFormation = { ...beforeFormation };
      
      // Move player from leftDefender (index 1) to leftAttacker (index 3) - should be "down"
      const playerMovingDown = beforeFormation.leftDefender;
      afterFormation.leftDefender = beforeFormation.leftAttacker;
      afterFormation.leftAttacker = playerMovingDown;
      
      const players = createMockPlayers(6, TEAM_MODES.INDIVIDUAL_6);
      
      const beforePositions = captureAllPlayerPositions(beforeFormation, players, TEAM_MODES.INDIVIDUAL_6);
      const afterPositions = captureAllPlayerPositions(afterFormation, players, TEAM_MODES.INDIVIDUAL_6);
      
      const animations = calculateAllPlayerAnimations(beforePositions, afterPositions, TEAM_MODES.INDIVIDUAL_6);
      
      // Player moving from leftDefender (index 1) to leftAttacker (index 3) should move "down"
      const playerMovingDownAnim = animations[playerMovingDown];
      expect(playerMovingDownAnim).toBeDefined();
      expect(playerMovingDownAnim.direction).toBe('down');
      expect(playerMovingDownAnim.fromPosition).toBe('leftDefender');
      expect(playerMovingDownAnim.toPosition).toBe('leftAttacker');
      
      // Player moving from leftAttacker (index 3) to leftDefender (index 1) should move "up"
      const playerMovingUp = beforeFormation.leftAttacker;
      const playerMovingUpAnim = animations[playerMovingUp];
      expect(playerMovingUpAnim).toBeDefined();
      expect(playerMovingUpAnim.direction).toBe('up');
      expect(playerMovingUpAnim.fromPosition).toBe('leftAttacker');
      expect(playerMovingUpAnim.toPosition).toBe('leftDefender');
    });

    test('should calculate movement distances based on position indices', () => {
      const beforeFormation = createMockFormation(TEAM_MODES.INDIVIDUAL_7);
      const afterFormation = { ...beforeFormation };
      
      // Move player from first position to last field position (larger distance)
      afterFormation.leftDefender = beforeFormation.rightAttacker;
      afterFormation.rightAttacker = beforeFormation.leftDefender;
      
      const players = createMockPlayers(7, TEAM_MODES.INDIVIDUAL_7);
      
      const beforePositions = captureAllPlayerPositions(beforeFormation, players, TEAM_MODES.INDIVIDUAL_7);
      const afterPositions = captureAllPlayerPositions(afterFormation, players, TEAM_MODES.INDIVIDUAL_7);
      
      const animations = calculateAllPlayerAnimations(beforePositions, afterPositions, TEAM_MODES.INDIVIDUAL_7);
      
      // Both players should be moving with non-zero distances
      const animationEntries = Object.entries(animations);
      expect(animationEntries.length).toBe(2);
      
      animationEntries.forEach(([playerId, animation]) => {
        expect(Math.abs(animation.distance)).toBeGreaterThan(0);
        expect(typeof animation.distance).toBe('number');
      });
    });

    test('should handle pairs team mode movement correctly', () => {
      const beforeFormation = createMockFormation(TEAM_MODES.PAIRS_7);
      const afterFormation = { ...beforeFormation };
      
      // Swap left and right pairs
      afterFormation.leftPair = beforeFormation.rightPair;
      afterFormation.rightPair = beforeFormation.leftPair;
      
      const players = createMockPlayers(7, TEAM_MODES.PAIRS_7);
      
      const beforePositions = captureAllPlayerPositions(beforeFormation, players, TEAM_MODES.PAIRS_7);
      const afterPositions = captureAllPlayerPositions(afterFormation, players, TEAM_MODES.PAIRS_7);
      
      const animations = calculateAllPlayerAnimations(beforePositions, afterPositions, TEAM_MODES.PAIRS_7);
      
      // All four players in the swapped pairs should be moving
      const animationEntries = Object.entries(animations);
      expect(animationEntries.length).toBe(4);
      
      // Check that pair players move together (same direction and distance)
      const leftPairDefender = beforeFormation.leftPair.defender;
      const leftPairAttacker = beforeFormation.leftPair.attacker;
      
      expect(animations[leftPairDefender]).toBeDefined();
      expect(animations[leftPairAttacker]).toBeDefined();
      expect(animations[leftPairDefender].direction).toBe(animations[leftPairAttacker].direction);
      expect(animations[leftPairDefender].distance).toBe(animations[leftPairAttacker].distance);
    });

    test('should handle missing position data gracefully', () => {
      const beforePositions = {};
      const afterPositions = {};
      
      const animations = calculateAllPlayerAnimations(beforePositions, afterPositions, TEAM_MODES.INDIVIDUAL_6);
      
      expect(animations).toBeDefined();
      expect(typeof animations).toBe('object');
    });

    test('should handle null/undefined position data', () => {
      // Test with null inputs
      const animations1 = calculateAllPlayerAnimations(null, null, TEAM_MODES.INDIVIDUAL_6);
      expect(animations1).toBeDefined();
      expect(typeof animations1).toBe('object');
      
      // Test with undefined inputs
      const animations2 = calculateAllPlayerAnimations(undefined, undefined, TEAM_MODES.INDIVIDUAL_6);
      expect(animations2).toBeDefined();
      expect(typeof animations2).toBe('object');
      
      // Test with mixed null/valid inputs
      const validPositions = {};
      const animations3 = calculateAllPlayerAnimations(null, validPositions, TEAM_MODES.INDIVIDUAL_6);
      expect(animations3).toBeDefined();
      expect(typeof animations3).toBe('object');
    });
  });

  describe('position index mapping consistency', () => {
    test('should have consistent position indices across team modes', () => {
      const teamModeConfigs = [
        { type: TEAM_MODES.INDIVIDUAL_6, playerCount: 6 },
        { type: TEAM_MODES.INDIVIDUAL_7, playerCount: 7 },
        { type: TEAM_MODES.PAIRS_7, playerCount: 7 }
      ];
      
      teamModeConfigs.forEach(({ type, playerCount }) => {
        const formation = createMockFormation(type);
        const players = createMockPlayers(playerCount, type);
        
        const positions = captureAllPlayerPositions(formation, players, type);
        
        // All position indices should be non-negative integers
        Object.values(positions).forEach(position => {
          expect(typeof position.positionIndex).toBe('number');
          expect(position.positionIndex).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(position.positionIndex)).toBe(true);
        });
        
        // Should have unique position indices for each distinct position
        const positionIndices = Object.values(positions).map(p => p.positionIndex);
        if (type === TEAM_MODES.PAIRS_7) {
          // In pairs mode, some players share position indices (same pair)
          const uniqueIndices = [...new Set(positionIndices)];
          expect(uniqueIndices.length).toBe(4); // leftPair, rightPair, subPair, goalie
        } else {
          // In individual modes, all players should have unique position indices
          const uniqueIndices = [...new Set(positionIndices)];
          expect(uniqueIndices.length).toBe(playerCount);
        }
      });
    });

    test('should maintain position index order within team modes', () => {
      // Individual 6 team mode: goalie(0), leftDef(1), rightDef(2), leftAtt(3), rightAtt(4), sub(5)
      const formation6 = createMockFormation(TEAM_MODES.INDIVIDUAL_6);
      const players6 = createMockPlayers(6, TEAM_MODES.INDIVIDUAL_6);
      const positions6 = captureAllPlayerPositions(formation6, players6, TEAM_MODES.INDIVIDUAL_6);
      
      expect(positions6[formation6.goalie].positionIndex).toBe(0);
      expect(positions6[formation6.leftDefender].positionIndex).toBe(1);
      expect(positions6[formation6.rightDefender].positionIndex).toBe(2);
      expect(positions6[formation6.leftAttacker].positionIndex).toBe(3);
      expect(positions6[formation6.rightAttacker].positionIndex).toBe(4);
      expect(positions6[formation6.substitute_1].positionIndex).toBe(5);
      
      // Individual 7 team mode: goalie(0), leftDef7(1), rightDef7(2), leftAtt7(3), rightAtt7(4), sub7_1(5), sub7_2(6)
      const formation7 = createMockFormation(TEAM_MODES.INDIVIDUAL_7);
      const players7 = createMockPlayers(7, TEAM_MODES.INDIVIDUAL_7);
      const positions7 = captureAllPlayerPositions(formation7, players7, TEAM_MODES.INDIVIDUAL_7);
      
      expect(positions7[formation7.goalie].positionIndex).toBe(0);
      expect(positions7[formation7.leftDefender].positionIndex).toBe(1);
      expect(positions7[formation7.rightDefender].positionIndex).toBe(2);
      expect(positions7[formation7.leftAttacker].positionIndex).toBe(3);
      expect(positions7[formation7.rightAttacker].positionIndex).toBe(4);
      expect(positions7[formation7.substitute_1].positionIndex).toBe(5);
      expect(positions7[formation7.substitute_2].positionIndex).toBe(6);
    });
  });
});