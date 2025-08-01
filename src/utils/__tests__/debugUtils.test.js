/**
 * Debug Utils Tests
 * 
 * Tests for debug utility functions that help with testing and development.
 */

import { 
  shuffleArray, 
  getRandomPlayers, 
  randomizeGoalieAssignments, 
  randomizeFormationPositions,
  isDebugMode,
  getRandomGameSettings
} from '../debugUtils';

// Mock players for testing
const mockPlayers = [
  { id: '1', name: 'Player 1' },
  { id: '2', name: 'Player 2' },
  { id: '3', name: 'Player 3' },
  { id: '4', name: 'Player 4' },
  { id: '5', name: 'Player 5' },
  { id: '6', name: 'Player 6' },
  { id: '7', name: 'Player 7' }
];

describe('debugUtils', () => {
  describe('shuffleArray', () => {
    it('should return array with same length', () => {
      const original = [1, 2, 3, 4, 5];
      const shuffled = shuffleArray(original);
      
      expect(shuffled).toHaveLength(original.length);
      expect(shuffled).not.toBe(original); // Should be new array
    });

    it('should contain all original elements', () => {
      const original = ['a', 'b', 'c', 'd'];
      const shuffled = shuffleArray(original);
      
      original.forEach(item => {
        expect(shuffled).toContain(item);
      });
    });

    it('should handle empty array', () => {
      const result = shuffleArray([]);
      expect(result).toEqual([]);
    });
  });

  describe('getRandomPlayers', () => {
    it('should return requested number of players', () => {
      const result = getRandomPlayers(mockPlayers, 3);
      expect(result).toHaveLength(3);
    });

    it('should return all players if count exceeds available', () => {
      const result = getRandomPlayers(mockPlayers, 10);
      expect(result).toHaveLength(mockPlayers.length);
    });

    it('should return unique players', () => {
      const result = getRandomPlayers(mockPlayers, 3);
      const ids = result.map(p => p.id);
      const uniqueIds = [...new Set(ids)];
      
      expect(ids).toHaveLength(uniqueIds.length);
    });

    it('should handle empty player list', () => {
      const result = getRandomPlayers([], 3);
      expect(result).toEqual([]);
    });
  });

  describe('randomizeGoalieAssignments', () => {
    it('should assign goalies for all periods', () => {
      const assignments = randomizeGoalieAssignments(mockPlayers, 3);
      
      expect(assignments).toHaveProperty('1');
      expect(assignments).toHaveProperty('2');
      expect(assignments).toHaveProperty('3');
    });

    it('should use valid player IDs', () => {
      const assignments = randomizeGoalieAssignments(mockPlayers, 2);
      const validIds = mockPlayers.map(p => p.id);
      
      expect(validIds).toContain(assignments[1]);
      expect(validIds).toContain(assignments[2]);
    });

    it('should handle more periods than players by cycling', () => {
      const smallPlayerList = mockPlayers.slice(0, 2);
      const assignments = randomizeGoalieAssignments(smallPlayerList, 5);
      
      expect(Object.keys(assignments)).toHaveLength(5);
      
      // All assignments should be valid player IDs
      Object.values(assignments).forEach(id => {
        expect(smallPlayerList.map(p => p.id)).toContain(id);
      });
    });
  });

  describe('randomizeFormationPositions', () => {
    it('should create PAIRS_7 formation correctly', () => {
      const formation = randomizeFormationPositions(mockPlayers, 'pairs_7');
      
      expect(formation).toHaveProperty('leftPair');
      expect(formation).toHaveProperty('rightPair');
      expect(formation).toHaveProperty('subPair');
      
      expect(formation.leftPair).toHaveProperty('defender');
      expect(formation.leftPair).toHaveProperty('attacker');
    });

    it('should create INDIVIDUAL_6 formation correctly', () => {
      const formation = randomizeFormationPositions(mockPlayers, 'individual_6');
      
      expect(formation).toHaveProperty('leftDefender');
      expect(formation).toHaveProperty('rightDefender');
      expect(formation).toHaveProperty('leftAttacker');
      expect(formation).toHaveProperty('rightAttacker');
      expect(formation).toHaveProperty('substitute_1');
    });

    it('should create INDIVIDUAL_7 formation correctly', () => {
      const formation = randomizeFormationPositions(mockPlayers, 'individual_7');
      
      expect(formation).toHaveProperty('leftDefender');
      expect(formation).toHaveProperty('rightDefender');
      expect(formation).toHaveProperty('leftAttacker');
      expect(formation).toHaveProperty('rightAttacker');
      expect(formation).toHaveProperty('substitute_1');
      expect(formation).toHaveProperty('substitute_2');
    });

    it('should create INDIVIDUAL_8 formation correctly', () => {
      const formation = randomizeFormationPositions(mockPlayers, 'individual_8');
      
      expect(formation).toHaveProperty('leftDefender');
      expect(formation).toHaveProperty('rightDefender');
      expect(formation).toHaveProperty('leftAttacker');
      expect(formation).toHaveProperty('rightAttacker');
      expect(formation).toHaveProperty('substitute_1');
      expect(formation).toHaveProperty('substitute_2');
      expect(formation).toHaveProperty('substitute_3');
    });

    it('should create INDIVIDUAL_9 formation correctly', () => {
      const formation = randomizeFormationPositions(mockPlayers, 'individual_9');
      
      expect(formation).toHaveProperty('leftDefender');
      expect(formation).toHaveProperty('rightDefender');
      expect(formation).toHaveProperty('leftAttacker');
      expect(formation).toHaveProperty('rightAttacker');
      expect(formation).toHaveProperty('substitute_1');
      expect(formation).toHaveProperty('substitute_2');
      expect(formation).toHaveProperty('substitute_3');
      expect(formation).toHaveProperty('substitute_4');
    });

    it('should create INDIVIDUAL_10 formation correctly', () => {
      const formation = randomizeFormationPositions(mockPlayers, 'individual_10');
      
      expect(formation).toHaveProperty('leftDefender');
      expect(formation).toHaveProperty('rightDefender');
      expect(formation).toHaveProperty('leftAttacker');
      expect(formation).toHaveProperty('rightAttacker');
      expect(formation).toHaveProperty('substitute_1');
      expect(formation).toHaveProperty('substitute_2');
      expect(formation).toHaveProperty('substitute_3');
      expect(formation).toHaveProperty('substitute_4');
      expect(formation).toHaveProperty('substitute_5');
    });

    it('should assign unique players in formation', () => {
      const formation = randomizeFormationPositions(mockPlayers, 'pairs_7');
      
      const allAssignedIds = [
        formation.leftPair.defender,
        formation.leftPair.attacker,
        formation.rightPair.defender,
        formation.rightPair.attacker,
        formation.subPair.defender,
        formation.subPair.attacker
      ].filter(Boolean);
      
      const uniqueIds = [...new Set(allAssignedIds)];
      expect(allAssignedIds).toHaveLength(uniqueIds.length);
    });

    it('should create 1-2-1 formation correctly with team config object', () => {
      const teamConfig = {
        format: '5v5',
        squadSize: 7,
        formation: '1-2-1',
        substitutionType: 'individual'
      };
      
      const formation = randomizeFormationPositions(mockPlayers, teamConfig);
      
      // Should have 1-2-1 formation positions
      expect(formation).toHaveProperty('defender');
      expect(formation).toHaveProperty('left');
      expect(formation).toHaveProperty('right');
      expect(formation).toHaveProperty('attacker');
      expect(formation).toHaveProperty('substitute_1');
      expect(formation).toHaveProperty('substitute_2');
      
      // Should NOT have 2-2 formation positions
      expect(formation).not.toHaveProperty('leftDefender');
      expect(formation).not.toHaveProperty('rightDefender');
      expect(formation).not.toHaveProperty('leftAttacker');
      expect(formation).not.toHaveProperty('rightAttacker');
    });

    it('should create 2-2 formation with team config object when formation is 2-2', () => {
      const teamConfig = {
        format: '5v5',
        squadSize: 6,
        formation: '2-2',
        substitutionType: 'individual'
      };
      
      const formation = randomizeFormationPositions(mockPlayers, teamConfig);
      
      // Should have 2-2 formation positions
      expect(formation).toHaveProperty('leftDefender');
      expect(formation).toHaveProperty('rightDefender');
      expect(formation).toHaveProperty('leftAttacker');
      expect(formation).toHaveProperty('rightAttacker');
      expect(formation).toHaveProperty('substitute_1');
      
      // Should NOT have 1-2-1 formation positions
      expect(formation).not.toHaveProperty('defender');
      expect(formation).not.toHaveProperty('left');
      expect(formation).not.toHaveProperty('right');
      expect(formation).not.toHaveProperty('attacker');
    });

    it('should default to 2-2 formation for legacy string inputs', () => {
      const formation = randomizeFormationPositions(mockPlayers, 'individual_6');
      
      // Legacy calls should default to 2-2 formation
      expect(formation).toHaveProperty('leftDefender');
      expect(formation).toHaveProperty('rightDefender');
      expect(formation).toHaveProperty('leftAttacker');
      expect(formation).toHaveProperty('rightAttacker');
      expect(formation).toHaveProperty('substitute_1');
    });

    it('should handle unknown team mode gracefully', () => {
      const formation = randomizeFormationPositions(mockPlayers, 'unknown_mode');
      
      expect(formation).toEqual({});
    });
  });

  describe('isDebugMode', () => {
    beforeEach(() => {
      // Clear localStorage
      localStorage.clear();
      
      // Clear URL search params (can't actually modify window.location in jest)
      delete window.location;
      window.location = { search: '' };
    });

    it('should return false by default', () => {
      const result = isDebugMode();
      expect(result).toBe(false);
    });

    it('should return true if localStorage debug-mode is set', () => {
      localStorage.setItem('debug-mode', 'true');
      const result = isDebugMode();
      expect(result).toBe(true);
    });
  });

  describe('getRandomGameSettings', () => {
    it('should return valid game settings', () => {
      const settings = getRandomGameSettings();
      
      expect(settings).toHaveProperty('numPeriods');
      expect(settings).toHaveProperty('periodDurationMinutes');
      expect(settings).toHaveProperty('alertMinutes');
      
      expect([1, 2]).toContain(settings.numPeriods);
      expect([5, 10, 15, 20]).toContain(settings.periodDurationMinutes);
      expect([1, 2, 3]).toContain(settings.alertMinutes);
    });

    it('should return consistent structure across calls', () => {
      const settings1 = getRandomGameSettings();
      const settings2 = getRandomGameSettings();
      
      expect(Object.keys(settings1).sort()).toEqual(Object.keys(settings2).sort());
    });
  });
});