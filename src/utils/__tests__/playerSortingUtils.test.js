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
    leftAttacker7: 'p1',
    rightAttacker7: 'p2',
    leftDefender7: 'p3',
    rightDefender7: 'p4',
    goalie: 'p5',
    substitute7_1: 'p6',
    substitute7_2: 'p7'
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
    test('should identify attackers in INDIVIDUAL_6 mode', () => {
      expect(getPlayerCurrentRole('p1', mockFormationIndividual6, TEAM_MODES.INDIVIDUAL_6)).toBe('ATTACKER');
      expect(getPlayerCurrentRole('p2', mockFormationIndividual6, TEAM_MODES.INDIVIDUAL_6)).toBe('ATTACKER');
    });

    test('should identify defenders in INDIVIDUAL_6 mode', () => {
      expect(getPlayerCurrentRole('p3', mockFormationIndividual6, TEAM_MODES.INDIVIDUAL_6)).toBe('DEFENDER');
      expect(getPlayerCurrentRole('p4', mockFormationIndividual6, TEAM_MODES.INDIVIDUAL_6)).toBe('DEFENDER');
    });

    test('should identify goalie in INDIVIDUAL_6 mode', () => {
      expect(getPlayerCurrentRole('p5', mockFormationIndividual6, TEAM_MODES.INDIVIDUAL_6)).toBe('GOALIE');
    });

    test('should identify substitutes in INDIVIDUAL_6 mode', () => {
      expect(getPlayerCurrentRole('p6', mockFormationIndividual6, TEAM_MODES.INDIVIDUAL_6)).toBe('SUBSTITUTE');
    });

    test('should identify attackers in INDIVIDUAL_7 mode', () => {
      expect(getPlayerCurrentRole('p1', mockFormationIndividual7, TEAM_MODES.INDIVIDUAL_7)).toBe('ATTACKER');
      expect(getPlayerCurrentRole('p2', mockFormationIndividual7, TEAM_MODES.INDIVIDUAL_7)).toBe('ATTACKER');
    });

    test('should identify defenders in INDIVIDUAL_7 mode', () => {
      expect(getPlayerCurrentRole('p3', mockFormationIndividual7, TEAM_MODES.INDIVIDUAL_7)).toBe('DEFENDER');
      expect(getPlayerCurrentRole('p4', mockFormationIndividual7, TEAM_MODES.INDIVIDUAL_7)).toBe('DEFENDER');
    });

    test('should identify substitutes in INDIVIDUAL_7 mode', () => {
      expect(getPlayerCurrentRole('p6', mockFormationIndividual7, TEAM_MODES.INDIVIDUAL_7)).toBe('SUBSTITUTE');
      expect(getPlayerCurrentRole('p7', mockFormationIndividual7, TEAM_MODES.INDIVIDUAL_7)).toBe('SUBSTITUTE');
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
    test('should get attackers for INDIVIDUAL_6 mode', () => {
      const attackers = getCurrentAttackers(mockFormationIndividual6, TEAM_MODES.INDIVIDUAL_6);
      expect(attackers).toEqual(['p1', 'p2']);
    });

    test('should get attackers for INDIVIDUAL_7 mode', () => {
      const attackers = getCurrentAttackers(mockFormationIndividual7, TEAM_MODES.INDIVIDUAL_7);
      expect(attackers).toEqual(['p1', 'p2']);
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
    test('should get defenders for INDIVIDUAL_6 mode', () => {
      const defenders = getCurrentDefenders(mockFormationIndividual6, TEAM_MODES.INDIVIDUAL_6);
      expect(defenders).toEqual(['p3', 'p4']);
    });

    test('should get defenders for INDIVIDUAL_7 mode', () => {
      const defenders = getCurrentDefenders(mockFormationIndividual7, TEAM_MODES.INDIVIDUAL_7);
      expect(defenders).toEqual(['p3', 'p4']);
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
    test('should sort players by relevance for INDIVIDUAL_6 mode', () => {
      // Use only players that are in the formation for this test
      const playersForIndividual6 = mockPlayers.slice(0, 6); // p1-p6
      const sorted = sortPlayersByGoalScoringRelevance(playersForIndividual6, mockFormationIndividual6, TEAM_MODES.INDIVIDUAL_6);
      
      // Should be: Attackers (p1, p2), Defenders (p3, p4), Goalie (p5), Substitutes (p6)
      const expectedOrder = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
      const actualOrder = sorted.map(p => p.id);
      
      expect(actualOrder).toEqual(expectedOrder);
    });

    test('should sort players by relevance for INDIVIDUAL_7 mode', () => {
      const sorted = sortPlayersByGoalScoringRelevance(mockPlayers, mockFormationIndividual7, TEAM_MODES.INDIVIDUAL_7);
      
      // Should be: Attackers (p1, p2), Defenders (p3, p4), Goalie (p5), Substitutes (p6, p7)
      const expectedOrder = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
      const actualOrder = sorted.map(p => p.id);
      
      expect(actualOrder).toEqual(expectedOrder);
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
    test('should return correct position names for INDIVIDUAL_6 mode', () => {
      expect(getPlayerPositionDisplay('p1', mockFormationIndividual6, TEAM_MODES.INDIVIDUAL_6)).toBe('Left Attacker');
      expect(getPlayerPositionDisplay('p2', mockFormationIndividual6, TEAM_MODES.INDIVIDUAL_6)).toBe('Right Attacker');
      expect(getPlayerPositionDisplay('p3', mockFormationIndividual6, TEAM_MODES.INDIVIDUAL_6)).toBe('Left Defender');
      expect(getPlayerPositionDisplay('p4', mockFormationIndividual6, TEAM_MODES.INDIVIDUAL_6)).toBe('Right Defender');
      expect(getPlayerPositionDisplay('p5', mockFormationIndividual6, TEAM_MODES.INDIVIDUAL_6)).toBe('Goalie');
      expect(getPlayerPositionDisplay('p6', mockFormationIndividual6, TEAM_MODES.INDIVIDUAL_6)).toBe('Substitute');
    });

    test('should return correct position names for INDIVIDUAL_7 mode', () => {
      expect(getPlayerPositionDisplay('p1', mockFormationIndividual7, TEAM_MODES.INDIVIDUAL_7)).toBe('Left Attacker');
      expect(getPlayerPositionDisplay('p2', mockFormationIndividual7, TEAM_MODES.INDIVIDUAL_7)).toBe('Right Attacker');
      expect(getPlayerPositionDisplay('p3', mockFormationIndividual7, TEAM_MODES.INDIVIDUAL_7)).toBe('Left Defender');
      expect(getPlayerPositionDisplay('p4', mockFormationIndividual7, TEAM_MODES.INDIVIDUAL_7)).toBe('Right Defender');
      expect(getPlayerPositionDisplay('p5', mockFormationIndividual7, TEAM_MODES.INDIVIDUAL_7)).toBe('Goalie');
      expect(getPlayerPositionDisplay('p6', mockFormationIndividual7, TEAM_MODES.INDIVIDUAL_7)).toBe('Substitute');
      expect(getPlayerPositionDisplay('p7', mockFormationIndividual7, TEAM_MODES.INDIVIDUAL_7)).toBe('Substitute');
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
    test('should correctly identify field players', () => {
      expect(isPlayerOnField('p1', mockFormationIndividual6, TEAM_MODES.INDIVIDUAL_6)).toBe(true); // Attacker
      expect(isPlayerOnField('p3', mockFormationIndividual6, TEAM_MODES.INDIVIDUAL_6)).toBe(true); // Defender
      expect(isPlayerOnField('p5', mockFormationIndividual6, TEAM_MODES.INDIVIDUAL_6)).toBe(true); // Goalie
      expect(isPlayerOnField('p6', mockFormationIndividual6, TEAM_MODES.INDIVIDUAL_6)).toBe(false); // Substitute
    });

    test('should work across all team modes', () => {
      // Test INDIVIDUAL_7
      expect(isPlayerOnField('p1', mockFormationIndividual7, TEAM_MODES.INDIVIDUAL_7)).toBe(true);
      expect(isPlayerOnField('p6', mockFormationIndividual7, TEAM_MODES.INDIVIDUAL_7)).toBe(false);
      
      // Test PAIRS_7
      expect(isPlayerOnField('p1', mockFormationPairs7, TEAM_MODES.PAIRS_7)).toBe(true);
      expect(isPlayerOnField('p6', mockFormationPairs7, TEAM_MODES.PAIRS_7)).toBe(false); // SubPair is substitute
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