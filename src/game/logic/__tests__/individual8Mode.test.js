/**
 * Tests for 8-player individual mode implementation
 */

import { TEAM_MODES } from '../../../constants/playerConstants';
import { getModeDefinition } from '../../../constants/gameModes';
import { SUBSTITUTION_TYPES } from '../../../constants/teamConfiguration';
import { getCarouselMapping, CAROUSEL_PATTERNS } from '../carouselPatterns';
import { createSubstitutionManager } from '../substitutionManager';
import { calculateGeneralSubstituteSwap } from '../gameStateLogic';

describe('8-Player Individual Mode', () => {
  describe('Mode Configuration', () => {
    it('should have correct INDIVIDUAL_8 mode definition', () => {
      const teamConfig = {
        format: '5v5',
        squadSize: 8,
        formation: '2-2',
        substitutionType: SUBSTITUTION_TYPES.INDIVIDUAL
      };
      const mode = getModeDefinition(teamConfig);
      
      expect(mode).toBeDefined();
      expect(mode.fieldPositions).toEqual(['leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker']);
      expect(mode.substitutePositions).toEqual(['substitute_1', 'substitute_2', 'substitute_3']);
      expect(mode.expectedCounts).toEqual({ outfield: 7, onField: 4 });
      expect(mode.supportsInactiveUsers).toBe(true);
      expect(mode.supportsNextNextIndicators).toBe(true);
      expect(mode.substituteRotationPattern).toBe('advanced_carousel');
    });
  });

  describe('Advanced Carousel Pattern', () => {
    it('should implement correct 8-player carousel pattern', () => {
      const formation = {
        leftDefender: 'player1',
        substitute_1: 'player2',
        substitute_2: 'player3',
        substitute_3: 'player4'
      };

      const mapping = getCarouselMapping(
        'advanced_carousel',
        'player1', // outgoing field player
        ['substitute_1', 'substitute_2', 'substitute_3'],
        formation
      );

      expect(mapping).toEqual({
        'player1': 'substitute_3',  // field → substitute_3
        // 'player2' (substitute_1) → field is handled by calling code
        'player3': 'substitute_1',  // substitute_2 → substitute_1
        'player4': 'substitute_2'   // substitute_3 → substitute_2
      });
    });

    it('should be available in CAROUSEL_PATTERNS', () => {
      expect(CAROUSEL_PATTERNS.advanced_carousel).toBeDefined();
      expect(typeof CAROUSEL_PATTERNS.advanced_carousel.getSubstitutionMapping).toBe('function');
    });
  });

  describe('Substitution Manager Integration', () => {
    it('should handle INDIVIDUAL_8 mode in substitution manager', () => {
      const manager = createSubstitutionManager(TEAM_MODES.INDIVIDUAL_8);
      expect(manager.teamMode).toBe(TEAM_MODES.INDIVIDUAL_8);
    });

    it('should execute substitution for 8-player mode', () => {
      const mockPlayers = [
        { id: 'p1', stats: { isInactive: false } },
        { id: 'p2', stats: { isInactive: false } },
        { id: 'p3', stats: { isInactive: false } },
        { id: 'p4', stats: { isInactive: false } }
      ];

      const context = {
        formation: {
          leftDefender: 'p1',
          substitute_1: 'p2',
          substitute_2: 'p3',
          substitute_3: 'p4'
        },
        nextPlayerIdToSubOut: 'p1',
        allPlayers: mockPlayers,
        rotationQueue: ['p1', 'p3', 'p4'],
        currentTimeEpoch: Date.now(),
        isSubTimerPaused: false
      };

      const manager = createSubstitutionManager(TEAM_MODES.INDIVIDUAL_8);
      
      expect(() => manager.executeSubstitution(context)).not.toThrow();
    });
  });

  describe('Enhanced Next-to-Go-In Functionality', () => {
    it('should support swapping substitute_2 with substitute_1', () => {
      const gameState = {
        formation: {
          substitute_1: 'player1',
          substitute_2: 'player2',
          substitute_3: 'player3'
        },
        allPlayers: [
          { id: 'player1', stats: {} },
          { id: 'player2', stats: {} },
          { id: 'player3', stats: {} }
        ],
        teamMode: TEAM_MODES.INDIVIDUAL_8
      };

      const result = calculateGeneralSubstituteSwap(gameState, 'substitute_2', 'substitute_1');

      expect(result.formation.substitute_1).toBe('player2');
      expect(result.formation.substitute_2).toBe('player1');
      expect(result.formation.substitute_3).toBe('player3'); // unchanged
    });

    it('should support swapping substitute_3 with substitute_1', () => {
      const gameState = {
        formation: {
          substitute_1: 'player1',
          substitute_2: 'player2',
          substitute_3: 'player3'
        },
        allPlayers: [
          { id: 'player1', stats: {} },
          { id: 'player2', stats: {} },
          { id: 'player3', stats: {} }
        ],
        teamMode: TEAM_MODES.INDIVIDUAL_8
      };

      const result = calculateGeneralSubstituteSwap(gameState, 'substitute_3', 'substitute_1');

      expect(result.formation.substitute_1).toBe('player3');
      expect(result.formation.substitute_2).toBe('player2'); // unchanged
      expect(result.formation.substitute_3).toBe('player1');
    });
  });

  describe('None Carousel Pattern (5-player mode)', () => {
    it('should return empty object for none pattern', () => {
      const formation = {
        leftDefender: 'player1',
        rightDefender: 'player2',
        leftAttacker: 'player3',
        rightAttacker: 'player4',
        goalie: 'player5'
      };

      const mapping = getCarouselMapping(
        'none',
        'player1', // outgoing field player
        [], // no substitute positions for 5-player mode
        formation
      );

      expect(mapping).toEqual({});
    });

    it('should be available in CAROUSEL_PATTERNS', () => {
      expect(CAROUSEL_PATTERNS.none).toBeDefined();
      expect(typeof CAROUSEL_PATTERNS.none.getSubstitutionMapping).toBe('function');
    });

    it('should handle 5-player mode configuration', () => {
      const teamConfig5 = {
        format: '5v5',
        squadSize: 5,
        formation: '2-2',
        substitutionType: SUBSTITUTION_TYPES.INDIVIDUAL
      };
      const mode5 = getModeDefinition(teamConfig5);
      expect(mode5.substituteRotationPattern).toBe('none');
      expect(mode5.substitutePositions).toEqual([]);
      expect(mode5.expectedCounts).toEqual({ outfield: 4, onField: 4 });
    });
  });

  describe('Backwards Compatibility', () => {
    it('should not break existing 6-player mode', () => {
      const teamConfig6 = {
        format: '5v5',
        squadSize: 6,
        formation: '2-2',
        substitutionType: SUBSTITUTION_TYPES.INDIVIDUAL
      };
      const mode6 = getModeDefinition(teamConfig6);
      expect(mode6.substituteRotationPattern).toBe('simple');
      expect(mode6.substitutePositions).toEqual(['substitute_1']);
    });

    it('should not break existing 7-player mode', () => {
      const teamConfig7 = {
        format: '5v5',
        squadSize: 7,
        formation: '2-2',
        substitutionType: SUBSTITUTION_TYPES.INDIVIDUAL
      };
      const mode7 = getModeDefinition(teamConfig7);
      expect(mode7.substituteRotationPattern).toBe('carousel');
      expect(mode7.substitutePositions).toEqual(['substitute_1', 'substitute_2']);
    });
  });
});