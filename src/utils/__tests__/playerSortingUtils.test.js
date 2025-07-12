/**
 * Player Sorting Utils Tests
 * Tests relevance-based sorting for goal scorer attribution
 */

import {
  getPlayerCurrentRole,
  getCurrentAttackers,
  getCurrentDefenders,
  sortPlayersByGoalScoringRelevance,
  getPlayerPositionDisplay,
  isPlayerOnField,
  groupPlayersByRole
} from '../playerSortingUtils';
import { TEAM_MODES } from '../../constants/playerConstants';

describe('playerSortingUtils', () => {
  // Test data
  const mockPlayers = [
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' },
    { id: 'p3', name: 'Charlie' },
    { id: 'p4', name: 'Diana' },
    { id: 'p5', name: 'Eve' },
    { id: 'p6', name: 'Frank' },
    { id: 'p7', name: 'Grace' }
  ];

  const mockFormationIndividual6 = {
    leftAttacker: 'p1',
    rightAttacker: 'p2',
    leftDefender: 'p3',
    rightDefender: 'p4',
    goalie: 'p5',
    substitute: 'p6'
  };

  const mockFormationIndividual7 = {
    leftAttacker: 'p1',
    rightAttacker: 'p2',
    leftDefender: 'p3',
    rightDefender: 'p4',
    goalie: 'p5',
    substitute_1: 'p6',
    substitute_2: 'p7'
  };

  const mockFormationPairs7 = {
    leftPair: {
      attacker: 'p1',
      defender: 'p3'
    },
    rightPair: {
      attacker: 'p2',
      defender: 'p4'
    },
    subPair: {
      attacker: 'p6',
      defender: 'p7'
    },
    goalie: 'p5'
  };

  describe('getPlayerCurrentRole', () => {
    test('should identify roles correctly across individual modes', () => {
      // Test unified individual mode behavior - both modes should behave identically for same positions
      const individualModes = [TEAM_MODES.INDIVIDUAL_6, TEAM_MODES.INDIVIDUAL_7];
      const individualFormations = [mockFormationIndividual6, mockFormationIndividual7];
      
      individualModes.forEach((mode, index) => {
        const formation = individualFormations[index];
        
        // Attackers
        expect(getPlayerCurrentRole('p1', formation, mode)).toBe('ATTACKER');
        expect(getPlayerCurrentRole('p2', formation, mode)).toBe('ATTACKER');
        
        // Defenders  
        expect(getPlayerCurrentRole('p3', formation, mode)).toBe('DEFENDER');
        expect(getPlayerCurrentRole('p4', formation, mode)).toBe('DEFENDER');
        
        // Goalie
        expect(getPlayerCurrentRole('p5', formation, mode)).toBe('GOALIE');
        
        // Substitutes
        expect(getPlayerCurrentRole('p6', formation, mode)).toBe('SUBSTITUTE');
        if (mode === TEAM_MODES.INDIVIDUAL_7) {
          expect(getPlayerCurrentRole('p7', formation, mode)).toBe('SUBSTITUTE');
        }
      });
    });

    test('should identify attackers in PAIRS_7 mode', () => {
      expect(getPlayerCurrentRole('p1', mockFormationPairs7, TEAM_MODES.PAIRS_7)).toBe('ATTACKER');
      expect(getPlayerCurrentRole('p2', mockFormationPairs7, TEAM_MODES.PAIRS_7)).toBe('ATTACKER');
    });

    test('should identify defenders in PAIRS_7 mode', () => {
      expect(getPlayerCurrentRole('p3', mockFormationPairs7, TEAM_MODES.PAIRS_7)).toBe('DEFENDER');
      expect(getPlayerCurrentRole('p4', mockFormationPairs7, TEAM_MODES.PAIRS_7)).toBe('DEFENDER');
    });

    test('should identify substitutes in PAIRS_7 mode (including subPair)', () => {
      expect(getPlayerCurrentRole('p6', mockFormationPairs7, TEAM_MODES.PAIRS_7)).toBe('SUBSTITUTE');
      expect(getPlayerCurrentRole('p7', mockFormationPairs7, TEAM_MODES.PAIRS_7)).toBe('SUBSTITUTE');
    });

    test('should handle null/undefined inputs', () => {
      expect(getPlayerCurrentRole(null, mockFormationIndividual6, TEAM_MODES.INDIVIDUAL_6)).toBe('SUBSTITUTE');
      expect(getPlayerCurrentRole('p1', null, TEAM_MODES.INDIVIDUAL_6)).toBe('SUBSTITUTE');
      expect(getPlayerCurrentRole('p1', mockFormationIndividual6, null)).toBe('SUBSTITUTE');
    });

    test('should handle unknown team mode', () => {
      expect(getPlayerCurrentRole('p1', mockFormationIndividual6, 'UNKNOWN_MODE')).toBe('SUBSTITUTE');
    });
  });

  describe('getCurrentAttackers', () => {
    test('should get attackers consistently across individual modes', () => {
      // Test that individual modes have consistent attacker extraction
      const testCases = [
        { mode: TEAM_MODES.INDIVIDUAL_6, formation: mockFormationIndividual6 },
        { mode: TEAM_MODES.INDIVIDUAL_7, formation: mockFormationIndividual7 }
      ];
      
      testCases.forEach(({ mode, formation }) => {
        const attackers = getCurrentAttackers(formation, mode);
        expect(attackers).toEqual(['p1', 'p2']);
      });
    });

    test('should get attackers for PAIRS_7 mode', () => {
      const attackers = getCurrentAttackers(mockFormationPairs7, TEAM_MODES.PAIRS_7);
      expect(attackers).toEqual(['p1', 'p2']);
    });

    test('should handle missing formation', () => {
      expect(getCurrentAttackers(null, TEAM_MODES.INDIVIDUAL_6)).toEqual([]);
    });

    test('should handle partial formation data', () => {
      const partialFormation = { leftAttacker: 'p1' };
      const attackers = getCurrentAttackers(partialFormation, TEAM_MODES.INDIVIDUAL_6);
      expect(attackers).toEqual(['p1']);
    });
  });

  describe('getCurrentDefenders', () => {
    test('should get defenders consistently across individual modes', () => {
      // Test that individual modes have consistent defender extraction
      const testCases = [
        { mode: TEAM_MODES.INDIVIDUAL_6, formation: mockFormationIndividual6 },
        { mode: TEAM_MODES.INDIVIDUAL_7, formation: mockFormationIndividual7 }
      ];
      
      testCases.forEach(({ mode, formation }) => {
        const defenders = getCurrentDefenders(formation, mode);
        expect(defenders).toEqual(['p3', 'p4']);
      });
    });

    test('should get defenders for PAIRS_7 mode', () => {
      const defenders = getCurrentDefenders(mockFormationPairs7, TEAM_MODES.PAIRS_7);
      expect(defenders).toEqual(['p3', 'p4']);
    });

    test('should handle missing formation', () => {
      expect(getCurrentDefenders(null, TEAM_MODES.INDIVIDUAL_6)).toEqual([]);
    });
  });

  describe('sortPlayersByGoalScoringRelevance', () => {
    test('should sort players by relevance consistently across individual modes', () => {
      // Test that individual modes produce consistent sorting logic
      const testCases = [
        {
          mode: TEAM_MODES.INDIVIDUAL_6,
          formation: mockFormationIndividual6,
          players: mockPlayers.slice(0, 6), // p1-p6
          expectedOrder: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'] // Attackers, Defenders, Goalie, Substitutes
        },
        {
          mode: TEAM_MODES.INDIVIDUAL_7,
          formation: mockFormationIndividual7,
          players: mockPlayers,
          expectedOrder: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'] // Attackers, Defenders, Goalie, Substitutes
        }
      ];
      
      testCases.forEach(({ mode, formation, players, expectedOrder }) => {
        const sorted = sortPlayersByGoalScoringRelevance(players, formation, mode);
        const actualOrder = sorted.map(p => p.id);
        expect(actualOrder).toEqual(expectedOrder);
      });
    });

    test('should sort players by relevance for PAIRS_7 mode', () => {
      const sorted = sortPlayersByGoalScoringRelevance(mockPlayers, mockFormationPairs7, TEAM_MODES.PAIRS_7);
      
      // Should be: Attackers (p1, p2), Defenders (p3, p4), Goalie (p5), Substitutes (p6, p7)
      const expectedOrder = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
      const actualOrder = sorted.map(p => p.id);
      
      expect(actualOrder).toEqual(expectedOrder);
    });

    test('should sort alphabetically within same role category', () => {
      // Create players with different names to test alphabetical sorting
      const playersForAlphabetTest = [
        { id: 'p1', name: 'Zoe' },      // Attacker
        { id: 'p2', name: 'Adam' },     // Attacker
        { id: 'p3', name: 'Yvonne' },  // Defender
        { id: 'p4', name: 'Ben' }       // Defender
      ];

      const sorted = sortPlayersByGoalScoringRelevance(
        playersForAlphabetTest, 
        mockFormationIndividual6, 
        TEAM_MODES.INDIVIDUAL_6
      );
      
      // Attackers should be alphabetical: Adam, Zoe
      // Defenders should be alphabetical: Ben, Yvonne
      const expectedOrder = ['p2', 'p1', 'p4', 'p3']; // Adam, Zoe, Ben, Yvonne
      const actualOrder = sorted.map(p => p.id);
      
      expect(actualOrder).toEqual(expectedOrder);
    });

    test('should handle empty player array', () => {
      const sorted = sortPlayersByGoalScoringRelevance([], mockFormationIndividual6, TEAM_MODES.INDIVIDUAL_6);
      expect(sorted).toEqual([]);
    });

    test('should handle null/undefined inputs', () => {
      expect(sortPlayersByGoalScoringRelevance(null, mockFormationIndividual6, TEAM_MODES.INDIVIDUAL_6)).toBeNull();
      expect(sortPlayersByGoalScoringRelevance(undefined, mockFormationIndividual6, TEAM_MODES.INDIVIDUAL_6)).toBeUndefined();
    });

    test('should not mutate original array', () => {
      const originalPlayers = [...mockPlayers];
      const sorted = sortPlayersByGoalScoringRelevance(mockPlayers, mockFormationIndividual6, TEAM_MODES.INDIVIDUAL_6);
      
      expect(mockPlayers).toEqual(originalPlayers);
      expect(sorted).not.toBe(mockPlayers);
    });
  });

  describe('getPlayerPositionDisplay', () => {
    test('should return correct position names for individual modes', () => {
      // Test that individual modes have consistent position display logic
      const testCases = [
        {
          mode: TEAM_MODES.INDIVIDUAL_6,
          formation: mockFormationIndividual6,
          expectedPositions: {
            'p1': 'Left Attacker',
            'p2': 'Right Attacker', 
            'p3': 'Left Defender',
            'p4': 'Right Defender',
            'p5': 'Goalie',
            'p6': 'Substitute'
          }
        },
        {
          mode: TEAM_MODES.INDIVIDUAL_7,
          formation: mockFormationIndividual7,
          expectedPositions: {
            'p1': 'Left Attacker',
            'p2': 'Right Attacker',
            'p3': 'Left Defender', 
            'p4': 'Right Defender',
            'p5': 'Goalie',
            'p6': 'Substitute',
            'p7': 'Substitute'
          }
        }
      ];
      
      testCases.forEach(({ mode, formation, expectedPositions }) => {
        Object.entries(expectedPositions).forEach(([playerId, expectedPosition]) => {
          expect(getPlayerPositionDisplay(playerId, formation, mode)).toBe(expectedPosition);
        });
      });
    });

    test('should return correct position names for PAIRS_7 mode', () => {
      expect(getPlayerPositionDisplay('p1', mockFormationPairs7, TEAM_MODES.PAIRS_7)).toBe('Left Attacker');
      expect(getPlayerPositionDisplay('p2', mockFormationPairs7, TEAM_MODES.PAIRS_7)).toBe('Right Attacker');
      expect(getPlayerPositionDisplay('p3', mockFormationPairs7, TEAM_MODES.PAIRS_7)).toBe('Left Defender');
      expect(getPlayerPositionDisplay('p4', mockFormationPairs7, TEAM_MODES.PAIRS_7)).toBe('Right Defender');
      expect(getPlayerPositionDisplay('p5', mockFormationPairs7, TEAM_MODES.PAIRS_7)).toBe('Goalie');
      expect(getPlayerPositionDisplay('p6', mockFormationPairs7, TEAM_MODES.PAIRS_7)).toBe('Sub Attacker');
      expect(getPlayerPositionDisplay('p7', mockFormationPairs7, TEAM_MODES.PAIRS_7)).toBe('Sub Defender');
    });

    test('should handle null/undefined inputs', () => {
      expect(getPlayerPositionDisplay(null, mockFormationIndividual6, TEAM_MODES.INDIVIDUAL_6)).toBe('Substitute');
      expect(getPlayerPositionDisplay('p1', null, TEAM_MODES.INDIVIDUAL_6)).toBe('Substitute');
    });
  });

  describe('isPlayerOnField', () => {
    test('should correctly identify field players across all team modes', () => {
      // Test configuration-driven field detection across all modes
      const testCases = [
        {
          mode: TEAM_MODES.INDIVIDUAL_6,
          formation: mockFormationIndividual6,
          onFieldPlayers: ['p1', 'p3', 'p5'], // Attacker, Defender, Goalie
          substitutePlayers: ['p6']
        },
        {
          mode: TEAM_MODES.INDIVIDUAL_7,
          formation: mockFormationIndividual7,
          onFieldPlayers: ['p1', 'p3', 'p5'], // Attacker, Defender, Goalie
          substitutePlayers: ['p6']
        },
        {
          mode: TEAM_MODES.PAIRS_7,
          formation: mockFormationPairs7,
          onFieldPlayers: ['p1', 'p3', 'p5'], // Attacker, Defender, Goalie
          substitutePlayers: ['p6'] // SubPair is substitute
        }
      ];
      
      testCases.forEach(({ mode, formation, onFieldPlayers, substitutePlayers }) => {
        onFieldPlayers.forEach(playerId => {
          expect(isPlayerOnField(playerId, formation, mode)).toBe(true);
        });
        substitutePlayers.forEach(playerId => {
          expect(isPlayerOnField(playerId, formation, mode)).toBe(false);
        });
      });
    });
  });

  describe('groupPlayersByRole', () => {
    test('should group players correctly', () => {
      const groups = groupPlayersByRole(mockPlayers, mockFormationIndividual6, TEAM_MODES.INDIVIDUAL_6);
      
      expect(groups.attackers.map(p => p.id)).toEqual(['p1', 'p2']);
      expect(groups.defenders.map(p => p.id)).toEqual(['p3', 'p4']);
      expect(groups.goalie.map(p => p.id)).toEqual(['p5']);
      expect(groups.substitutes.map(p => p.id)).toEqual(['p6', 'p7']); // p7 not in formation = substitute
    });

    test('should handle null players array', () => {
      const groups = groupPlayersByRole(null, mockFormationIndividual6, TEAM_MODES.INDIVIDUAL_6);
      
      expect(groups.attackers).toEqual([]);
      expect(groups.defenders).toEqual([]);
      expect(groups.goalie).toEqual([]);
      expect(groups.substitutes).toEqual([]);
    });

    test('should handle empty players array', () => {
      const groups = groupPlayersByRole([], mockFormationIndividual6, TEAM_MODES.INDIVIDUAL_6);
      
      expect(groups.attackers).toEqual([]);
      expect(groups.defenders).toEqual([]);
      expect(groups.goalie).toEqual([]);
      expect(groups.substitutes).toEqual([]);
    });
  });

  describe('Edge Cases', () => {
    test('should handle formation with missing positions', () => {
      const incompleteFormation = {
        leftAttacker: 'p1',
        goalie: 'p5'
        // Missing other positions
      };

      const sorted = sortPlayersByGoalScoringRelevance(mockPlayers, incompleteFormation, TEAM_MODES.INDIVIDUAL_6);
      
      // p1 should be first (attacker), p5 second (goalie), rest are substitutes
      expect(sorted[0].id).toBe('p1');
      expect(sorted[1].id).toBe('p5');
      // Other players should be in alphabetical order as substitutes
    });

    test('should handle players not in formation', () => {
      const extraPlayer = { id: 'p8', name: 'Henry' };
      const playersWithExtra = [...mockPlayers, extraPlayer];
      
      const sorted = sortPlayersByGoalScoringRelevance(playersWithExtra, mockFormationIndividual6, TEAM_MODES.INDIVIDUAL_6);
      
      // Extra player should be treated as substitute and sorted at the end
      const extraPlayerIndex = sorted.findIndex(p => p.id === 'p8');
      expect(extraPlayerIndex).toBeGreaterThan(4); // After field players and goalie
    });
  });
});