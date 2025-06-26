/**
 * Unit tests for position utility functions
 * Tests position-to-role mapping and formation structure queries
 */

import {
  getPositionRole,
  getOutfieldPositions,
  getFieldPositions,
  getSubstitutePositions,
  isFieldPosition,
  isSubstitutePosition,
  getExpectedCounts,
  getExpectedOutfieldPlayerCount
} from '../positionUtils';

import { FORMATION_TYPES, PLAYER_ROLES } from '../../../constants/playerConstants';
import { POSITION_KEYS } from '../../../constants/positionConstants';

describe('positionUtils', () => {
  describe('getPositionRole', () => {
    test('should map defender positions to DEFENDER role', () => {
      expect(getPositionRole(POSITION_KEYS.LEFT_DEFENDER)).toBe(PLAYER_ROLES.DEFENDER);
      expect(getPositionRole(POSITION_KEYS.RIGHT_DEFENDER)).toBe(PLAYER_ROLES.DEFENDER);
      expect(getPositionRole(POSITION_KEYS.LEFT_DEFENDER_7)).toBe(PLAYER_ROLES.DEFENDER);
      expect(getPositionRole(POSITION_KEYS.RIGHT_DEFENDER_7)).toBe(PLAYER_ROLES.DEFENDER);
    });

    test('should map attacker positions to ATTACKER role', () => {
      expect(getPositionRole(POSITION_KEYS.LEFT_ATTACKER)).toBe(PLAYER_ROLES.ATTACKER);
      expect(getPositionRole(POSITION_KEYS.RIGHT_ATTACKER)).toBe(PLAYER_ROLES.ATTACKER);
      expect(getPositionRole(POSITION_KEYS.LEFT_ATTACKER_7)).toBe(PLAYER_ROLES.ATTACKER);
      expect(getPositionRole(POSITION_KEYS.RIGHT_ATTACKER_7)).toBe(PLAYER_ROLES.ATTACKER);
    });

    test('should map substitute positions to SUBSTITUTE role', () => {
      expect(getPositionRole(POSITION_KEYS.SUBSTITUTE)).toBe(PLAYER_ROLES.SUBSTITUTE);
      expect(getPositionRole(POSITION_KEYS.SUBSTITUTE_7_1)).toBe(PLAYER_ROLES.SUBSTITUTE);
      expect(getPositionRole(POSITION_KEYS.SUBSTITUTE_7_2)).toBe(PLAYER_ROLES.SUBSTITUTE);
    });

    test('should map goalie position to GOALIE role', () => {
      expect(getPositionRole(POSITION_KEYS.GOALIE)).toBe(PLAYER_ROLES.GOALIE);
    });

    test('should return null for unknown positions', () => {
      expect(getPositionRole('unknownPosition')).toBeNull();
      expect(getPositionRole(null)).toBeNull();
      expect(getPositionRole(undefined)).toBeNull();
      expect(getPositionRole('')).toBeNull();
    });

    test('should handle pair positions (no direct role mapping)', () => {
      expect(getPositionRole(POSITION_KEYS.LEFT_PAIR)).toBeNull();
      expect(getPositionRole(POSITION_KEYS.RIGHT_PAIR)).toBeNull();
      expect(getPositionRole(POSITION_KEYS.SUB_PAIR)).toBeNull();
    });
  });

  describe('getOutfieldPositions', () => {
    test('should return all outfield positions for INDIVIDUAL_6', () => {
      const positions = getOutfieldPositions(FORMATION_TYPES.INDIVIDUAL_6);
      
      expect(positions).toHaveLength(5);
      expect(positions).toContain(POSITION_KEYS.LEFT_DEFENDER);
      expect(positions).toContain(POSITION_KEYS.RIGHT_DEFENDER);
      expect(positions).toContain(POSITION_KEYS.LEFT_ATTACKER);
      expect(positions).toContain(POSITION_KEYS.RIGHT_ATTACKER);
      expect(positions).toContain(POSITION_KEYS.SUBSTITUTE);
      expect(positions).not.toContain(POSITION_KEYS.GOALIE);
    });

    test('should return all outfield positions for INDIVIDUAL_7', () => {
      const positions = getOutfieldPositions(FORMATION_TYPES.INDIVIDUAL_7);
      
      expect(positions).toHaveLength(6);
      expect(positions).toContain(POSITION_KEYS.LEFT_DEFENDER_7);
      expect(positions).toContain(POSITION_KEYS.RIGHT_DEFENDER_7);
      expect(positions).toContain(POSITION_KEYS.LEFT_ATTACKER_7);
      expect(positions).toContain(POSITION_KEYS.RIGHT_ATTACKER_7);
      expect(positions).toContain(POSITION_KEYS.SUBSTITUTE_7_1);
      expect(positions).toContain(POSITION_KEYS.SUBSTITUTE_7_2);
      expect(positions).not.toContain(POSITION_KEYS.GOALIE);
    });

    test('should return all outfield positions for PAIRS_7', () => {
      const positions = getOutfieldPositions(FORMATION_TYPES.PAIRS_7);
      
      expect(positions).toHaveLength(3);
      expect(positions).toContain(POSITION_KEYS.LEFT_PAIR);
      expect(positions).toContain(POSITION_KEYS.RIGHT_PAIR);
      expect(positions).toContain(POSITION_KEYS.SUB_PAIR);
      expect(positions).not.toContain(POSITION_KEYS.GOALIE);
    });

    test('should return empty array for unknown formation type', () => {
      const positions = getOutfieldPositions('UNKNOWN_FORMATION');
      
      expect(positions).toEqual([]);
    });

    test('should return empty array for null/undefined formation type', () => {
      expect(getOutfieldPositions(null)).toEqual([]);
      expect(getOutfieldPositions(undefined)).toEqual([]);
    });
  });

  describe('getFieldPositions', () => {
    test('should return only field positions for INDIVIDUAL_6 (excluding substitutes)', () => {
      const positions = getFieldPositions(FORMATION_TYPES.INDIVIDUAL_6);
      
      expect(positions).toHaveLength(4);
      expect(positions).toContain(POSITION_KEYS.LEFT_DEFENDER);
      expect(positions).toContain(POSITION_KEYS.RIGHT_DEFENDER);
      expect(positions).toContain(POSITION_KEYS.LEFT_ATTACKER);
      expect(positions).toContain(POSITION_KEYS.RIGHT_ATTACKER);
      expect(positions).not.toContain(POSITION_KEYS.SUBSTITUTE);
      expect(positions).not.toContain(POSITION_KEYS.GOALIE);
    });

    test('should return only field positions for INDIVIDUAL_7', () => {
      const positions = getFieldPositions(FORMATION_TYPES.INDIVIDUAL_7);
      
      expect(positions).toHaveLength(4);
      expect(positions).toContain(POSITION_KEYS.LEFT_DEFENDER_7);
      expect(positions).toContain(POSITION_KEYS.RIGHT_DEFENDER_7);
      expect(positions).toContain(POSITION_KEYS.LEFT_ATTACKER_7);
      expect(positions).toContain(POSITION_KEYS.RIGHT_ATTACKER_7);
      expect(positions).not.toContain(POSITION_KEYS.SUBSTITUTE_7_1);
      expect(positions).not.toContain(POSITION_KEYS.SUBSTITUTE_7_2);
    });

    test('should return only playing pairs for PAIRS_7', () => {
      const positions = getFieldPositions(FORMATION_TYPES.PAIRS_7);
      
      expect(positions).toHaveLength(2);
      expect(positions).toContain(POSITION_KEYS.LEFT_PAIR);
      expect(positions).toContain(POSITION_KEYS.RIGHT_PAIR);
      expect(positions).not.toContain(POSITION_KEYS.SUB_PAIR);
    });

    test('should return empty array for unknown formation type', () => {
      const positions = getFieldPositions('UNKNOWN_FORMATION');
      
      expect(positions).toEqual([]);
    });
  });

  describe('getSubstitutePositions', () => {
    test('should return substitute positions for INDIVIDUAL_6', () => {
      const positions = getSubstitutePositions(FORMATION_TYPES.INDIVIDUAL_6);
      
      expect(positions).toHaveLength(1);
      expect(positions).toContain(POSITION_KEYS.SUBSTITUTE);
    });

    test('should return substitute positions for INDIVIDUAL_7', () => {
      const positions = getSubstitutePositions(FORMATION_TYPES.INDIVIDUAL_7);
      
      expect(positions).toHaveLength(2);
      expect(positions).toContain(POSITION_KEYS.SUBSTITUTE_7_1);
      expect(positions).toContain(POSITION_KEYS.SUBSTITUTE_7_2);
    });

    test('should return substitute pair for PAIRS_7', () => {
      const positions = getSubstitutePositions(FORMATION_TYPES.PAIRS_7);
      
      expect(positions).toHaveLength(1);
      expect(positions).toContain(POSITION_KEYS.SUB_PAIR);
    });

    test('should return empty array for unknown formation type', () => {
      const positions = getSubstitutePositions('UNKNOWN_FORMATION');
      
      expect(positions).toEqual([]);
    });
  });

  describe('isFieldPosition', () => {
    test('should correctly identify field positions in INDIVIDUAL_6', () => {
      expect(isFieldPosition(POSITION_KEYS.LEFT_DEFENDER, FORMATION_TYPES.INDIVIDUAL_6)).toBe(true);
      expect(isFieldPosition(POSITION_KEYS.RIGHT_DEFENDER, FORMATION_TYPES.INDIVIDUAL_6)).toBe(true);
      expect(isFieldPosition(POSITION_KEYS.LEFT_ATTACKER, FORMATION_TYPES.INDIVIDUAL_6)).toBe(true);
      expect(isFieldPosition(POSITION_KEYS.RIGHT_ATTACKER, FORMATION_TYPES.INDIVIDUAL_6)).toBe(true);
      
      expect(isFieldPosition(POSITION_KEYS.SUBSTITUTE, FORMATION_TYPES.INDIVIDUAL_6)).toBe(false);
      expect(isFieldPosition(POSITION_KEYS.GOALIE, FORMATION_TYPES.INDIVIDUAL_6)).toBe(false);
    });

    test('should correctly identify field positions in INDIVIDUAL_7', () => {
      expect(isFieldPosition(POSITION_KEYS.LEFT_DEFENDER_7, FORMATION_TYPES.INDIVIDUAL_7)).toBe(true);
      expect(isFieldPosition(POSITION_KEYS.RIGHT_DEFENDER_7, FORMATION_TYPES.INDIVIDUAL_7)).toBe(true);
      expect(isFieldPosition(POSITION_KEYS.LEFT_ATTACKER_7, FORMATION_TYPES.INDIVIDUAL_7)).toBe(true);
      expect(isFieldPosition(POSITION_KEYS.RIGHT_ATTACKER_7, FORMATION_TYPES.INDIVIDUAL_7)).toBe(true);
      
      expect(isFieldPosition(POSITION_KEYS.SUBSTITUTE_7_1, FORMATION_TYPES.INDIVIDUAL_7)).toBe(false);
      expect(isFieldPosition(POSITION_KEYS.SUBSTITUTE_7_2, FORMATION_TYPES.INDIVIDUAL_7)).toBe(false);
    });

    test('should correctly identify playing pairs in PAIRS_7', () => {
      expect(isFieldPosition(POSITION_KEYS.LEFT_PAIR, FORMATION_TYPES.PAIRS_7)).toBe(true);
      expect(isFieldPosition(POSITION_KEYS.RIGHT_PAIR, FORMATION_TYPES.PAIRS_7)).toBe(true);
      
      expect(isFieldPosition(POSITION_KEYS.SUB_PAIR, FORMATION_TYPES.PAIRS_7)).toBe(false);
    });

    test('should return false for unknown positions or formation types', () => {
      expect(isFieldPosition('unknownPosition', FORMATION_TYPES.INDIVIDUAL_6)).toBe(false);
      expect(isFieldPosition(POSITION_KEYS.LEFT_DEFENDER, 'UNKNOWN_FORMATION')).toBe(false);
    });
  });

  describe('isSubstitutePosition', () => {
    test('should correctly identify substitute positions in INDIVIDUAL_6', () => {
      expect(isSubstitutePosition(POSITION_KEYS.SUBSTITUTE, FORMATION_TYPES.INDIVIDUAL_6)).toBe(true);
      
      expect(isSubstitutePosition(POSITION_KEYS.LEFT_DEFENDER, FORMATION_TYPES.INDIVIDUAL_6)).toBe(false);
      expect(isSubstitutePosition(POSITION_KEYS.GOALIE, FORMATION_TYPES.INDIVIDUAL_6)).toBe(false);
    });

    test('should correctly identify substitute positions in INDIVIDUAL_7', () => {
      expect(isSubstitutePosition(POSITION_KEYS.SUBSTITUTE_7_1, FORMATION_TYPES.INDIVIDUAL_7)).toBe(true);
      expect(isSubstitutePosition(POSITION_KEYS.SUBSTITUTE_7_2, FORMATION_TYPES.INDIVIDUAL_7)).toBe(true);
      
      expect(isSubstitutePosition(POSITION_KEYS.LEFT_DEFENDER_7, FORMATION_TYPES.INDIVIDUAL_7)).toBe(false);
    });

    test('should correctly identify substitute pair in PAIRS_7', () => {
      expect(isSubstitutePosition(POSITION_KEYS.SUB_PAIR, FORMATION_TYPES.PAIRS_7)).toBe(true);
      
      expect(isSubstitutePosition(POSITION_KEYS.LEFT_PAIR, FORMATION_TYPES.PAIRS_7)).toBe(false);
      expect(isSubstitutePosition(POSITION_KEYS.RIGHT_PAIR, FORMATION_TYPES.PAIRS_7)).toBe(false);
    });

    test('should return false for unknown positions or formation types', () => {
      expect(isSubstitutePosition('unknownPosition', FORMATION_TYPES.INDIVIDUAL_6)).toBe(false);
      expect(isSubstitutePosition(POSITION_KEYS.SUBSTITUTE, 'UNKNOWN_FORMATION')).toBe(false);
    });
  });

  describe('getExpectedCounts', () => {
    test('should return correct counts for INDIVIDUAL_6', () => {
      const counts = getExpectedCounts(FORMATION_TYPES.INDIVIDUAL_6);
      
      expect(counts).toBeDefined();
      expect(counts.outfield).toBe(5); // 4 field + 1 substitute
      expect(counts.onField).toBe(4); // 4 field players
    });

    test('should return correct counts for INDIVIDUAL_7', () => {
      const counts = getExpectedCounts(FORMATION_TYPES.INDIVIDUAL_7);
      
      expect(counts).toBeDefined();
      expect(counts.outfield).toBe(6); // 4 field + 2 substitutes
      expect(counts.onField).toBe(4); // 4 field players
    });

    test('should return correct counts for PAIRS_7', () => {
      const counts = getExpectedCounts(FORMATION_TYPES.PAIRS_7);
      
      expect(counts).toBeDefined();
      expect(counts.outfield).toBe(6); // 2 field pairs (4 players) + 1 sub pair (2 players)
      expect(counts.onField).toBe(4); // 2 field pairs (4 players)
    });

    test('should return default counts for unknown formation type', () => {
      const counts = getExpectedCounts('UNKNOWN_FORMATION');
      
      expect(counts).toEqual({ outfield: 0, onField: 0 });
    });

    test('should handle null/undefined formation type', () => {
      expect(getExpectedCounts(null)).toEqual({ outfield: 0, onField: 0 });
      expect(getExpectedCounts(undefined)).toEqual({ outfield: 0, onField: 0 });
    });
  });

  describe('getExpectedOutfieldPlayerCount', () => {
    test('should return outfield count for valid formation types', () => {
      expect(getExpectedOutfieldPlayerCount(FORMATION_TYPES.INDIVIDUAL_6)).toBe(5);
      expect(getExpectedOutfieldPlayerCount(FORMATION_TYPES.INDIVIDUAL_7)).toBe(6);
      expect(getExpectedOutfieldPlayerCount(FORMATION_TYPES.PAIRS_7)).toBe(6);
    });

    test('should return 0 for unknown formation type', () => {
      expect(getExpectedOutfieldPlayerCount('UNKNOWN_FORMATION')).toBe(0);
      expect(getExpectedOutfieldPlayerCount(null)).toBe(0);
      expect(getExpectedOutfieldPlayerCount(undefined)).toBe(0);
    });
  });

  describe('formation consistency', () => {
    test('field positions + substitute positions should equal outfield positions for individual modes', () => {
      [FORMATION_TYPES.INDIVIDUAL_6, FORMATION_TYPES.INDIVIDUAL_7].forEach(formationType => {
        const fieldPositions = getFieldPositions(formationType);
        const substitutePositions = getSubstitutePositions(formationType);
        const outfieldPositions = getOutfieldPositions(formationType);
        
        expect(fieldPositions.length + substitutePositions.length).toBe(outfieldPositions.length);
        
        // Check no overlap
        const overlap = fieldPositions.filter(pos => substitutePositions.includes(pos));
        expect(overlap).toHaveLength(0);
      });
    });

    test('all field positions should be identified as field positions', () => {
      [FORMATION_TYPES.INDIVIDUAL_6, FORMATION_TYPES.INDIVIDUAL_7, FORMATION_TYPES.PAIRS_7].forEach(formationType => {
        const fieldPositions = getFieldPositions(formationType);
        
        fieldPositions.forEach(position => {
          expect(isFieldPosition(position, formationType)).toBe(true);
          expect(isSubstitutePosition(position, formationType)).toBe(false);
        });
      });
    });

    test('all substitute positions should be identified as substitute positions', () => {
      [FORMATION_TYPES.INDIVIDUAL_6, FORMATION_TYPES.INDIVIDUAL_7, FORMATION_TYPES.PAIRS_7].forEach(formationType => {
        const substitutePositions = getSubstitutePositions(formationType);
        
        substitutePositions.forEach(position => {
          expect(isSubstitutePosition(position, formationType)).toBe(true);
          expect(isFieldPosition(position, formationType)).toBe(false);
        });
      });
    });
  });
});