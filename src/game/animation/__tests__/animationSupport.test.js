/**
 * Unit tests for animation calculation functions
 * Tests position mapping and movement calculations (non-DOM aspects)
 */

import {
  captureAllPlayerPositions,
  calculateAllPlayerAnimations
} from '../animationSupport';

import { FORMATION_TYPES } from '../../../constants/playerConstants';
import { POSITION_KEYS } from '../../../constants/positionConstants';
import {
  createMockGameState,
  createMockFormation,
  createMockPlayers
} from '../../testUtils';

describe.skip('animationSupport', () => {
  describe('captureAllPlayerPositions', () => {
    test('should capture positions for INDIVIDUAL_6 formation', () => {
      const formation = createMockFormation(FORMATION_TYPES.INDIVIDUAL_6);
      const players = createMockPlayers(6, FORMATION_TYPES.INDIVIDUAL_6);
      
      const positions = captureAllPlayerPositions(formation, players, FORMATION_TYPES.INDIVIDUAL_6);
      
      expect(positions).toBeDefined();
      expect(typeof positions).toBe('object');
      
      // Should have position mappings for all players
      expect(positions['1']).toBeDefined(); // leftDefender
      expect(positions['2']).toBeDefined(); // rightDefender
      expect(positions['3']).toBeDefined(); // leftAttacker
      expect(positions['4']).toBeDefined(); // rightAttacker
      expect(positions['5']).toBeDefined(); // substitute
      expect(positions['6']).toBeDefined(); // goalie
    });

    test('should capture positions for INDIVIDUAL_7 formation', () => {
      const formation = createMockFormation(FORMATION_TYPES.INDIVIDUAL_7);
      const players = createMockPlayers(7, FORMATION_TYPES.INDIVIDUAL_7);
      
      const positions = captureAllPlayerPositions(formation, players, FORMATION_TYPES.INDIVIDUAL_7);
      
      expect(positions).toBeDefined();
      
      // Should have position mappings for all players
      expect(positions['1']).toBeDefined(); // leftDefender7
      expect(positions['2']).toBeDefined(); // rightDefender7
      expect(positions['3']).toBeDefined(); // leftAttacker7
      expect(positions['4']).toBeDefined(); // rightAttacker7
      expect(positions['5']).toBeDefined(); // substitute7_1
      expect(positions['6']).toBeDefined(); // substitute7_2
      expect(positions['7']).toBeDefined(); // goalie
    });

    test('should capture positions for PAIRS_7 formation', () => {
      const formation = createMockFormation(FORMATION_TYPES.PAIRS_7);
      const players = createMockPlayers(7, FORMATION_TYPES.PAIRS_7);
      
      const positions = captureAllPlayerPositions(formation, players, FORMATION_TYPES.PAIRS_7);
      
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
      const formation = createMockFormation(FORMATION_TYPES.INDIVIDUAL_6);
      const players = createMockPlayers(6, FORMATION_TYPES.INDIVIDUAL_6);
      
      const positions = captureAllPlayerPositions(formation, players, FORMATION_TYPES.INDIVIDUAL_6);
      
      // Check position indices match expected layout
      expect(positions['1'].positionIndex).toBe(0); // leftDefender
      expect(positions['2'].positionIndex).toBe(1); // rightDefender
      expect(positions['3'].positionIndex).toBe(2); // leftAttacker
      expect(positions['4'].positionIndex).toBe(3); // rightAttacker
      expect(positions['5'].positionIndex).toBe(4); // substitute
      expect(positions['6'].positionIndex).toBe(5); // goalie
    });

    test('should map players to correct position indices for INDIVIDUAL_7', () => {
      const formation = createMockFormation(FORMATION_TYPES.INDIVIDUAL_7);
      const players = createMockPlayers(7, FORMATION_TYPES.INDIVIDUAL_7);
      
      const positions = captureAllPlayerPositions(formation, players, FORMATION_TYPES.INDIVIDUAL_7);
      
      // Check position indices match expected layout
      expect(positions['1'].positionIndex).toBe(0); // leftDefender7
      expect(positions['2'].positionIndex).toBe(1); // rightDefender7
      expect(positions['3'].positionIndex).toBe(2); // leftAttacker7
      expect(positions['4'].positionIndex).toBe(3); // rightAttacker7
      expect(positions['5'].positionIndex).toBe(4); // substitute7_1
      expect(positions['6'].positionIndex).toBe(5); // substitute7_2
      expect(positions['7'].positionIndex).toBe(6); // goalie
    });

    test('should map players to correct position indices for PAIRS_7', () => {
      const formation = createMockFormation(FORMATION_TYPES.PAIRS_7);
      const players = createMockPlayers(7, FORMATION_TYPES.PAIRS_7);
      
      const positions = captureAllPlayerPositions(formation, players, FORMATION_TYPES.PAIRS_7);
      
      // Check position indices match expected layout
      expect(positions['1'].positionIndex).toBe(0); // leftPair.defender
      expect(positions['2'].positionIndex).toBe(0); // leftPair.attacker (same pair)
      expect(positions['3'].positionIndex).toBe(1); // rightPair.defender
      expect(positions['4'].positionIndex).toBe(1); // rightPair.attacker (same pair)
      expect(positions['5'].positionIndex).toBe(2); // subPair.defender
      expect(positions['6'].positionIndex).toBe(2); // subPair.attacker (same pair)
      expect(positions['7'].positionIndex).toBe(3); // goalie
    });

    test('should include role information in position data', () => {
      const formation = createMockFormation(FORMATION_TYPES.INDIVIDUAL_6);
      const players = createMockPlayers(6, FORMATION_TYPES.INDIVIDUAL_6);
      
      const positions = captureAllPlayerPositions(formation, players, FORMATION_TYPES.INDIVIDUAL_6);
      
      // Check that role information is captured
      expect(positions['1'].role).toBeDefined();
      expect(positions['2'].role).toBeDefined();
      expect(positions['6'].role).toBeDefined(); // goalie
    });

    test('should handle missing players gracefully', () => {
      const formation = createMockFormation(FORMATION_TYPES.INDIVIDUAL_6);
      const players = []; // Empty players array
      
      const positions = captureAllPlayerPositions(formation, players, FORMATION_TYPES.INDIVIDUAL_6);
      
      expect(positions).toBeDefined();
      expect(typeof positions).toBe('object');
      // Should still return position mapping structure even with missing players
    });

    test('should handle unknown formation type gracefully', () => {
      const formation = createMockFormation(FORMATION_TYPES.INDIVIDUAL_6);
      const players = createMockPlayers(6, FORMATION_TYPES.INDIVIDUAL_6);
      
      const positions = captureAllPlayerPositions(formation, players, 'UNKNOWN_FORMATION');
      
      expect(positions).toBeDefined();
      expect(typeof positions).toBe('object');
    });
  });

  describe('calculateAllPlayerAnimations', () => {
    test('should detect no movement when positions unchanged', () => {
      const formation = createMockFormation(FORMATION_TYPES.INDIVIDUAL_6);
      const players = createMockPlayers(6, FORMATION_TYPES.INDIVIDUAL_6);
      
      const beforePositions = captureAllPlayerPositions(formation, players, FORMATION_TYPES.INDIVIDUAL_6);
      const afterPositions = captureAllPlayerPositions(formation, players, FORMATION_TYPES.INDIVIDUAL_6);
      
      const animations = calculateAllPlayerAnimations(beforePositions, afterPositions, FORMATION_TYPES.INDIVIDUAL_6);
      
      expect(animations).toBeDefined();
      expect(typeof animations).toBe('object');
      
      // No players should be animating if positions are the same
      Object.values(animations).forEach(animation => {
        expect(animation.isMoving).toBe(false);
      });
    });

    test('should detect movement when positions change', () => {
      const beforeFormation = createMockFormation(FORMATION_TYPES.INDIVIDUAL_6);
      const afterFormation = { ...beforeFormation };
      
      // Swap two players
      afterFormation.leftDefender = beforeFormation.rightDefender;
      afterFormation.rightDefender = beforeFormation.leftDefender;
      
      const players = createMockPlayers(6, FORMATION_TYPES.INDIVIDUAL_6);
      
      const beforePositions = captureAllPlayerPositions(beforeFormation, players, FORMATION_TYPES.INDIVIDUAL_6);
      const afterPositions = captureAllPlayerPositions(afterFormation, players, FORMATION_TYPES.INDIVIDUAL_6);
      
      const animations = calculateAllPlayerAnimations(beforePositions, afterPositions, FORMATION_TYPES.INDIVIDUAL_6);
      
      // The two swapped players should be moving
      const movingPlayers = Object.entries(animations).filter(([_, anim]) => anim.isMoving);
      expect(movingPlayers.length).toBe(2);
      
      // Check that the moving players have the right animation data
      movingPlayers.forEach(([playerId, animation]) => {
        expect(animation.distance).toBeGreaterThan(0);
        expect(['up', 'down']).toContain(animation.direction);
        expect(typeof animation.fromIndex).toBe('number');
        expect(typeof animation.toIndex).toBe('number');
      });
    });

    test('should calculate correct movement direction (up vs down)', () => {
      const beforeFormation = createMockFormation(FORMATION_TYPES.INDIVIDUAL_6);
      const afterFormation = { ...beforeFormation };
      
      // Move player from position 0 to position 2 (should be "down")
      const playerMovingDown = beforeFormation.leftDefender;
      afterFormation.leftDefender = beforeFormation.leftAttacker;
      afterFormation.leftAttacker = playerMovingDown;
      
      const players = createMockPlayers(6, FORMATION_TYPES.INDIVIDUAL_6);
      
      const beforePositions = captureAllPlayerPositions(beforeFormation, players, FORMATION_TYPES.INDIVIDUAL_6);
      const afterPositions = captureAllPlayerPositions(afterFormation, players, FORMATION_TYPES.INDIVIDUAL_6);
      
      const animations = calculateAllPlayerAnimations(beforePositions, afterPositions, FORMATION_TYPES.INDIVIDUAL_6);
      
      // Player moving from index 0 to 2 should move "down"
      const playerMovingDownAnim = animations[playerMovingDown];
      expect(playerMovingDownAnim.isMoving).toBe(true);
      expect(playerMovingDownAnim.direction).toBe('down');
      expect(playerMovingDownAnim.fromIndex).toBe(0);
      expect(playerMovingDownAnim.toIndex).toBe(2);
      
      // Player moving from index 2 to 0 should move "up"
      const playerMovingUp = beforeFormation.leftAttacker;
      const playerMovingUpAnim = animations[playerMovingUp];
      expect(playerMovingUpAnim.isMoving).toBe(true);
      expect(playerMovingUpAnim.direction).toBe('up');
      expect(playerMovingUpAnim.fromIndex).toBe(2);
      expect(playerMovingUpAnim.toIndex).toBe(0);
    });

    test('should calculate movement distances based on position indices', () => {
      const beforeFormation = createMockFormation(FORMATION_TYPES.INDIVIDUAL_7);
      const afterFormation = { ...beforeFormation };
      
      // Move player from first position to last field position (larger distance)
      afterFormation.leftDefender7 = beforeFormation.rightAttacker7;
      afterFormation.rightAttacker7 = beforeFormation.leftDefender7;
      
      const players = createMockPlayers(7, FORMATION_TYPES.INDIVIDUAL_7);
      
      const beforePositions = captureAllPlayerPositions(beforeFormation, players, FORMATION_TYPES.INDIVIDUAL_7);
      const afterPositions = captureAllPlayerPositions(afterFormation, players, FORMATION_TYPES.INDIVIDUAL_7);
      
      const animations = calculateAllPlayerAnimations(beforePositions, afterPositions, FORMATION_TYPES.INDIVIDUAL_7);
      
      // Both players should be moving with positive distances
      const movingPlayers = Object.entries(animations).filter(([_, anim]) => anim.isMoving);
      expect(movingPlayers.length).toBe(2);
      
      movingPlayers.forEach(([playerId, animation]) => {
        expect(animation.distance).toBeGreaterThan(0);
        expect(typeof animation.distance).toBe('number');
      });
    });

    test('should handle pairs formation movement correctly', () => {
      const beforeFormation = createMockFormation(FORMATION_TYPES.PAIRS_7);
      const afterFormation = { ...beforeFormation };
      
      // Swap left and right pairs
      afterFormation.leftPair = beforeFormation.rightPair;
      afterFormation.rightPair = beforeFormation.leftPair;
      
      const players = createMockPlayers(7, FORMATION_TYPES.PAIRS_7);
      
      const beforePositions = captureAllPlayerPositions(beforeFormation, players, FORMATION_TYPES.PAIRS_7);
      const afterPositions = captureAllPlayerPositions(afterFormation, players, FORMATION_TYPES.PAIRS_7);
      
      const animations = calculateAllPlayerAnimations(beforePositions, afterPositions, FORMATION_TYPES.PAIRS_7);
      
      // All four players in the swapped pairs should be moving
      const movingPlayers = Object.entries(animations).filter(([_, anim]) => anim.isMoving);
      expect(movingPlayers.length).toBe(4);
      
      // Check that pair players move together (same direction)
      const leftPairDefender = beforeFormation.leftPair.defender;
      const leftPairAttacker = beforeFormation.leftPair.attacker;
      
      expect(animations[leftPairDefender].direction).toBe(animations[leftPairAttacker].direction);
      expect(animations[leftPairDefender].distance).toBe(animations[leftPairAttacker].distance);
    });

    test('should handle missing position data gracefully', () => {
      const beforePositions = {};
      const afterPositions = {};
      
      const animations = calculateAllPlayerAnimations(beforePositions, afterPositions, FORMATION_TYPES.INDIVIDUAL_6);
      
      expect(animations).toBeDefined();
      expect(typeof animations).toBe('object');
    });

    test('should handle null/undefined position data', () => {
      const animations = calculateAllPlayerAnimations(null, null, FORMATION_TYPES.INDIVIDUAL_6);
      
      expect(animations).toBeDefined();
      expect(typeof animations).toBe('object');
    });
  });

  describe('position index mapping consistency', () => {
    test('should have consistent position indices across formation types', () => {
      const formations = [
        { type: FORMATION_TYPES.INDIVIDUAL_6, playerCount: 6 },
        { type: FORMATION_TYPES.INDIVIDUAL_7, playerCount: 7 },
        { type: FORMATION_TYPES.PAIRS_7, playerCount: 7 }
      ];
      
      formations.forEach(({ type, playerCount }) => {
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
        if (type === FORMATION_TYPES.PAIRS_7) {
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

    test('should maintain position index order within formation types', () => {
      // Individual 6: leftDef(0), rightDef(1), leftAtt(2), rightAtt(3), sub(4), goalie(5)
      const formation6 = createMockFormation(FORMATION_TYPES.INDIVIDUAL_6);
      const players6 = createMockPlayers(6, FORMATION_TYPES.INDIVIDUAL_6);
      const positions6 = captureAllPlayerPositions(formation6, players6, FORMATION_TYPES.INDIVIDUAL_6);
      
      expect(positions6[formation6.leftDefender].positionIndex).toBe(0);
      expect(positions6[formation6.rightDefender].positionIndex).toBe(1);
      expect(positions6[formation6.leftAttacker].positionIndex).toBe(2);
      expect(positions6[formation6.rightAttacker].positionIndex).toBe(3);
      expect(positions6[formation6.substitute].positionIndex).toBe(4);
      expect(positions6[formation6.goalie].positionIndex).toBe(5);
      
      // Individual 7: similar pattern with 7 positions
      const formation7 = createMockFormation(FORMATION_TYPES.INDIVIDUAL_7);
      const players7 = createMockPlayers(7, FORMATION_TYPES.INDIVIDUAL_7);
      const positions7 = captureAllPlayerPositions(formation7, players7, FORMATION_TYPES.INDIVIDUAL_7);
      
      expect(positions7[formation7.leftDefender7].positionIndex).toBe(0);
      expect(positions7[formation7.rightDefender7].positionIndex).toBe(1);
      expect(positions7[formation7.leftAttacker7].positionIndex).toBe(2);
      expect(positions7[formation7.rightAttacker7].positionIndex).toBe(3);
      expect(positions7[formation7.substitute7_1].positionIndex).toBe(4);
      expect(positions7[formation7.substitute7_2].positionIndex).toBe(5);
      expect(positions7[formation7.goalie].positionIndex).toBe(6);
    });
  });
});