/**
 * Tests for formation standardization utilities
 */
import {
  normalizeFormationStructure,
  validateFormationStructure,
  getExpectedFormationStructure
} from '../formationUtils';

describe('Formation Utilities', () => {
  describe('getExpectedFormationStructure', () => {
    it('should return correct structure for 2-2 individual formation', () => {
      const teamConfig = {
        format: '5v5',
        formation: '2-2',
        squadSize: 7,
        substitutionType: 'individual'
      };

      const expected = getExpectedFormationStructure(teamConfig);

      expect(expected).toEqual({
        goalie: null,
        leftDefender: null,
        rightDefender: null,
        leftAttacker: null,
        rightAttacker: null,
        substitute_1: null,
        substitute_2: null
      });
    });

    it('should return correct structure for 1-2-1 individual formation', () => {
      const teamConfig = {
        format: '5v5',
        formation: '1-2-1',
        squadSize: 6,
        substitutionType: 'individual'
      };

      const expected = getExpectedFormationStructure(teamConfig);

      expect(expected).toEqual({
        goalie: null,
        defender: null,
        left: null,
        right: null,
        attacker: null,
        substitute_1: null
      });
    });

    it('should return correct structure for pairs mode', () => {
      const teamConfig = {
        format: '5v5',
        formation: '2-2',
        squadSize: 7,
        substitutionType: 'pairs'
      };

      const expected = getExpectedFormationStructure(teamConfig);

      expect(expected).toEqual({
        goalie: null,
        leftPair: { defender: null, attacker: null },
        rightPair: { defender: null, attacker: null },
        subPair: { defender: null, attacker: null }
      });
    });
    it('should return correct structure for 7v7 2-3-1 formation', () => {
      const teamConfig = {
        format: '7v7',
        formation: '2-3-1',
        squadSize: 10,
        substitutionType: 'individual'
      };

      const expected = getExpectedFormationStructure(teamConfig);

      expect(expected).toEqual({
        goalie: null,
        leftDefender: null,
        rightDefender: null,
        leftMidfielder: null,
        centerMidfielder: null,
        rightMidfielder: null,
        attacker: null,
        substitute_1: null,
        substitute_2: null,
        substitute_3: null
      });
    });
  });

  describe('validateFormationStructure', () => {
    it('should validate correct 2-2 individual formation', () => {
      const teamConfig = {
        format: '5v5',
        formation: '2-2',
        squadSize: 7,
        substitutionType: 'individual'
      };

      const formation = {
        goalie: 'player1',
        leftDefender: 'player2',
        rightDefender: 'player3',
        leftAttacker: 'player4',
        rightAttacker: 'player5',
        substitute_1: 'player6',
        substitute_2: 'player7'
      };

      const result = validateFormationStructure(formation, teamConfig);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing positions', () => {
      const teamConfig = {
        format: '5v5',
        formation: '2-2',
        squadSize: 6,
        substitutionType: 'individual'
      };

      const formation = {
        goalie: 'player1',
        leftDefender: 'player2',
        // Missing rightDefender, leftAttacker, rightAttacker, substitute_1
      };

      const result = validateFormationStructure(formation, teamConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Missing required positions');
    });

    it('should detect extra positions', () => {
      const teamConfig = {
        format: '5v5',
        formation: '2-2',
        squadSize: 6,
        substitutionType: 'individual'
      };

      const formation = {
        goalie: 'player1',
        leftDefender: 'player2',
        rightDefender: 'player3',
        leftAttacker: 'player4',
        rightAttacker: 'player5',
        substitute_1: 'player6',
        extraPosition: 'player7' // This shouldn't be here
      };

      const result = validateFormationStructure(formation, teamConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Unexpected positions found');
    });
  });

  describe('normalizeFormationStructure', () => {
    it('should clean up messy formation structure', () => {
      const teamConfig = {
        format: '5v5',
        formation: '2-2',
        squadSize: 7,
        substitutionType: 'individual'
      };

      const squadSelection = ['player1', 'player2', 'player3', 'player4', 'player5', 'player6', 'player7'];

      // Messy formation with redundant properties (like the example from the user)
      const messyFormation = {
        goalie: 'player1',
        leftDefender: 'player2',
        rightDefender: 'player3',
        leftAttacker: 'player4',
        rightAttacker: 'player5',
        substitute_1: 'player6',
        substitute_2: 'player7',
        // Redundant properties that should be cleaned up
        left: 'player8', // Invalid player not in squad
        right: 'player9', // Invalid player not in squad
        attacker: 'player10', // Invalid player not in squad
        defender: 'player11' // Invalid player not in squad
      };

      const cleaned = normalizeFormationStructure(messyFormation, teamConfig, squadSelection);

      // Should only contain the expected positions
      expect(cleaned).toEqual({
        goalie: 'player1',
        leftDefender: 'player2',
        rightDefender: 'player3',
        leftAttacker: 'player4',
        rightAttacker: 'player5',
        substitute_1: 'player6',
        substitute_2: 'player7'
      });
    });

    it('should handle pairs mode normalization', () => {
      const teamConfig = {
        format: '5v5',
        formation: '2-2',
        squadSize: 7,
        substitutionType: 'pairs'
      };

      const squadSelection = ['player1', 'player2', 'player3', 'player4', 'player5', 'player6', 'player7'];

      const messyFormation = {
        goalie: 'player1',
        leftPair: { defender: 'player2', attacker: 'player3' },
        rightPair: { defender: 'player4', attacker: 'player5' },
        subPair: { defender: 'player6', attacker: 'player7' },
        // Redundant individual positions that should be ignored
        leftDefender: 'player8',
        rightDefender: 'player9',
        leftAttacker: 'player10',
        rightAttacker: 'player11'
      };

      const cleaned = normalizeFormationStructure(messyFormation, teamConfig, squadSelection);

      expect(cleaned).toEqual({
        goalie: 'player1',
        leftPair: { defender: 'player2', attacker: 'player3' },
        rightPair: { defender: 'player4', attacker: 'player5' },
        subPair: { defender: 'player6', attacker: 'player7' }
      });
    });

    it('should filter out invalid player IDs', () => {
      const teamConfig = {
        format: '5v5',
        formation: '2-2',
        squadSize: 6,
        substitutionType: 'individual'
      };

      const squadSelection = ['player1', 'player2', 'player3', 'player4', 'player5', 'player6'];

      const messyFormation = {
        goalie: 'invalid-player', // Not in squad selection
        leftDefender: 'player2',
        rightDefender: 'player3',
        leftAttacker: 'player4',
        rightAttacker: 'player5',
        substitute_1: 'player6'
      };

      const cleaned = normalizeFormationStructure(messyFormation, teamConfig, squadSelection);

      expect(cleaned.goalie).toBeNull(); // Invalid player ID should be nullified
      expect(cleaned.leftDefender).toBe('player2');
      expect(cleaned.substitute_1).toBe('player6');
    });
    it('should normalize 7v7 2-2-2 formation', () => {
      const teamConfig = {
        format: '7v7',
        formation: '2-2-2',
        squadSize: 9,
        substitutionType: 'individual'
      };

      const squadSelection = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9'];

      const messyFormation = {
        goalie: 'p1',
        leftDefender: 'p2',
        rightDefender: 'p3',
        leftMidfielder: 'p4',
        rightMidfielder: 'p5',
        leftAttacker: 'p6',
        rightAttacker: 'p7',
        substitute_1: 'p8',
        substitute_2: 'p9'
      };

      const normalized = normalizeFormationStructure(messyFormation, teamConfig, squadSelection);

      expect(normalized).toEqual({
        goalie: 'p1',
        leftDefender: 'p2',
        rightDefender: 'p3',
        leftMidfielder: 'p4',
        rightMidfielder: 'p5',
        leftAttacker: 'p6',
        rightAttacker: 'p7',
        substitute_1: 'p8',
        substitute_2: 'p9'
      });
    });
  });
});
    it('should validate correct 7v7 2-3-1 formation', () => {
      const teamConfig = {
        format: '7v7',
        formation: '2-3-1',
        squadSize: 10,
        substitutionType: 'individual'
      };

      const formation = {
        goalie: 'player1',
        leftDefender: 'player2',
        rightDefender: 'player3',
        leftMidfielder: 'player4',
        centerMidfielder: 'player5',
        rightMidfielder: 'player6',
        attacker: 'player7',
        substitute_1: 'player8',
        substitute_2: 'player9',
        substitute_3: 'player10'
      };

      const result = validateFormationStructure(formation, teamConfig);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
