/**
 * Tests for positionConstants.js - Position validation and utility functions
 */

import {
  POSITION_KEYS,
  getFieldPositionKeys22,
  getFieldPositionKeys121,
  getSubstitutePositionKeys,
  isFieldPosition,
  isSubstitutePosition,
  isGoaliePosition
} from '../positionConstants';

describe('positionConstants', () => {
  describe('POSITION_KEYS', () => {
    it('should have all expected position keys', () => {
      expect(POSITION_KEYS).toEqual({
        // Individual formations - 2-2 formation
        LEFT_DEFENDER: 'leftDefender',
        RIGHT_DEFENDER: 'rightDefender',
        LEFT_ATTACKER: 'leftAttacker',
        RIGHT_ATTACKER: 'rightAttacker',

        // Individual formations - 1-2-1 formation
        DEFENDER: 'defender',
        LEFT: 'left',
        RIGHT: 'right',
        ATTACKER: 'attacker',

        // Substitute positions
        SUBSTITUTE_1: 'substitute_1',
        SUBSTITUTE_2: 'substitute_2',
        SUBSTITUTE_3: 'substitute_3',
        SUBSTITUTE_4: 'substitute_4',
        SUBSTITUTE_5: 'substitute_5',

        // Common
        GOALIE: 'goalie'
      });
    });

    it('should have consistent string values', () => {
      Object.entries(POSITION_KEYS).forEach(([key, value]) => {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getFieldPositionKeys22', () => {
    it('should return all 2-2 field position keys', () => {
      const fieldKeys = getFieldPositionKeys22();
      expect(fieldKeys).toEqual(['leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker']);
      expect(fieldKeys).toHaveLength(4);
    });

    it('should include all 2-2 positions from POSITION_KEYS', () => {
      const fieldKeys = getFieldPositionKeys22();
      expect(fieldKeys).toContain(POSITION_KEYS.LEFT_DEFENDER);
      expect(fieldKeys).toContain(POSITION_KEYS.RIGHT_DEFENDER);
      expect(fieldKeys).toContain(POSITION_KEYS.LEFT_ATTACKER);
      expect(fieldKeys).toContain(POSITION_KEYS.RIGHT_ATTACKER);
    });
  });

  describe('getFieldPositionKeys121', () => {
    it('should return all 1-2-1 field position keys', () => {
      const fieldKeys = getFieldPositionKeys121();
      expect(fieldKeys).toEqual(['defender', 'left', 'right', 'attacker']);
      expect(fieldKeys).toHaveLength(4);
    });

    it('should include all 1-2-1 positions from POSITION_KEYS', () => {
      const fieldKeys = getFieldPositionKeys121();
      expect(fieldKeys).toContain(POSITION_KEYS.DEFENDER);
      expect(fieldKeys).toContain(POSITION_KEYS.LEFT);
      expect(fieldKeys).toContain(POSITION_KEYS.RIGHT);
      expect(fieldKeys).toContain(POSITION_KEYS.ATTACKER);
    });
  });

  describe('getSubstitutePositionKeys', () => {
    it('should return all substitute position keys', () => {
      const subKeys = getSubstitutePositionKeys();
      expect(subKeys).toEqual([
        'substitute_1',
        'substitute_2',
        'substitute_3',
        'substitute_4',
        'substitute_5'
      ]);
      expect(subKeys).toHaveLength(5);
    });

    it('should include all substitute positions from POSITION_KEYS', () => {
      const subKeys = getSubstitutePositionKeys();
      expect(subKeys).toContain(POSITION_KEYS.SUBSTITUTE_1);
      expect(subKeys).toContain(POSITION_KEYS.SUBSTITUTE_2);
      expect(subKeys).toContain(POSITION_KEYS.SUBSTITUTE_3);
      expect(subKeys).toContain(POSITION_KEYS.SUBSTITUTE_4);
      expect(subKeys).toContain(POSITION_KEYS.SUBSTITUTE_5);
    });
  });

  describe('isFieldPosition', () => {
    it('should identify 2-2 field positions correctly', () => {
      expect(isFieldPosition('leftDefender')).toBe(true);
      expect(isFieldPosition('rightDefender')).toBe(true);
      expect(isFieldPosition('leftAttacker')).toBe(true);
      expect(isFieldPosition('rightAttacker')).toBe(true);
    });

    it('should identify 1-2-1 field positions correctly', () => {
      expect(isFieldPosition('defender')).toBe(true);
      expect(isFieldPosition('left')).toBe(true);
      expect(isFieldPosition('right')).toBe(true);
      expect(isFieldPosition('attacker')).toBe(true);
    });

    it('should return false for non-field positions', () => {
      expect(isFieldPosition('goalie')).toBe(false);
      expect(isFieldPosition('substitute_1')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isFieldPosition('')).toBe(false);
      expect(isFieldPosition(null)).toBe(false);
      expect(isFieldPosition(undefined)).toBe(false);
      expect(isFieldPosition('invalidPosition')).toBe(false);
    });

    it('should use POSITION_KEYS constants', () => {
      expect(isFieldPosition(POSITION_KEYS.LEFT_DEFENDER)).toBe(true);
      expect(isFieldPosition(POSITION_KEYS.DEFENDER)).toBe(true);
      expect(isFieldPosition(POSITION_KEYS.LEFT)).toBe(true);
    });
  });

  describe('isSubstitutePosition', () => {
    it('should identify substitute positions correctly', () => {
      expect(isSubstitutePosition('substitute_1')).toBe(true);
      expect(isSubstitutePosition('substitute_2')).toBe(true);
      expect(isSubstitutePosition('substitute_3')).toBe(true);
      expect(isSubstitutePosition('substitute_4')).toBe(true);
      expect(isSubstitutePosition('substitute_5')).toBe(true);
    });

    it('should return false for non-substitute positions', () => {
      expect(isSubstitutePosition('leftDefender')).toBe(false);
      expect(isSubstitutePosition('goalie')).toBe(false);
      expect(isSubstitutePosition('defender')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isSubstitutePosition('')).toBe(false);
      expect(isSubstitutePosition(null)).toBe(false);
      expect(isSubstitutePosition(undefined)).toBe(false);
      expect(isSubstitutePosition('substitute_6')).toBe(false); // Beyond defined range
    });

    it('should use POSITION_KEYS constants', () => {
      expect(isSubstitutePosition(POSITION_KEYS.SUBSTITUTE_1)).toBe(true);
      expect(isSubstitutePosition(POSITION_KEYS.SUBSTITUTE_2)).toBe(true);
      expect(isSubstitutePosition(POSITION_KEYS.SUBSTITUTE_5)).toBe(true);
    });
  });

  describe('isGoaliePosition', () => {
    it('should identify goalie position correctly', () => {
      expect(isGoaliePosition('goalie')).toBe(true);
    });

    it('should return false for non-goalie positions', () => {
      expect(isGoaliePosition('leftDefender')).toBe(false);
      expect(isGoaliePosition('substitute_1')).toBe(false);
      expect(isGoaliePosition('defender')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isGoaliePosition('')).toBe(false);
      expect(isGoaliePosition(null)).toBe(false);
      expect(isGoaliePosition(undefined)).toBe(false);
      expect(isGoaliePosition('goalkeeper')).toBe(false); // Similar but different
    });

    it('should use POSITION_KEYS constant', () => {
      expect(isGoaliePosition(POSITION_KEYS.GOALIE)).toBe(true);
    });
  });

  describe('position categorization completeness', () => {
    it('should categorize all defined positions', () => {
      const allPositions = Object.values(POSITION_KEYS);
      const categorizedPositions = [];

      allPositions.forEach(position => {
        if (isFieldPosition(position)) {
          categorizedPositions.push(position);
        } else if (isSubstitutePosition(position)) {
          categorizedPositions.push(position);
        } else if (isGoaliePosition(position)) {
          categorizedPositions.push(position);
        }
      });

      expect(categorizedPositions.sort()).toEqual(allPositions.sort());
    });

    it('should have mutually exclusive categories', () => {
      Object.values(POSITION_KEYS).forEach(position => {
        const categories = [
          isFieldPosition(position),
          isSubstitutePosition(position),
          isGoaliePosition(position)
        ];

        const trueCount = categories.filter(Boolean).length;
        expect(trueCount).toBe(1); // Exactly one category should be true
      });
    });
  });

  describe('integration scenarios', () => {
    it('should support formation validation workflow', () => {
      // Check if we have all positions for 2-2 individual formation
      const field22Positions = getFieldPositionKeys22();
      expect(field22Positions).toHaveLength(4);

      field22Positions.forEach(position => {
        expect(isFieldPosition(position)).toBe(true);
      });

      // Check substitute positions
      const subPositions = getSubstitutePositionKeys();
      expect(subPositions).toHaveLength(5);

      subPositions.forEach(position => {
        expect(isSubstitutePosition(position)).toBe(true);
        expect(isFieldPosition(position)).toBe(false);
      });
    });

    it('should support position validation for game logic', () => {
      // Test various position validation scenarios
      const testCases = [
        { position: 'leftDefender', expectedCategory: 'field' },
        { position: 'substitute_1', expectedCategory: 'substitute' },
        { position: 'goalie', expectedCategory: 'goalie' },
        { position: 'defender', expectedCategory: 'field' }, // 1-2-1 formation
        { position: 'left', expectedCategory: 'field' }, // 1-2-1 midfielder
      ];

      testCases.forEach(({ position, expectedCategory }) => {
        switch (expectedCategory) {
          case 'field':
            expect(isFieldPosition(position)).toBe(true);
            break;
          case 'substitute':
            expect(isSubstitutePosition(position)).toBe(true);
            break;
          case 'goalie':
            expect(isGoaliePosition(position)).toBe(true);
            break;
        }
      });
    });

    it('should handle formation transitions', () => {
      // Simulate checking positions when transitioning between formations
      const positions22 = getFieldPositionKeys22();
      const positions121 = getFieldPositionKeys121();

      // Both formations should have 4 field positions
      expect(positions22).toHaveLength(4);
      expect(positions121).toHaveLength(4);

      // All should be field positions
      [...positions22, ...positions121].forEach(position => {
        expect(isFieldPosition(position)).toBe(true);
      });

      // Formations should be different sets of positions
      expect(positions22).not.toEqual(positions121);
    });
  });

  describe('performance tests', () => {
    it('should perform position checks efficiently', async () => {
      const positions = Object.values(POSITION_KEYS);
      const iterations = 1000;

      const performanceOperation = () => {
        for (let i = 0; i < iterations; i++) {
          positions.forEach(position => {
            isFieldPosition(position);
            isSubstitutePosition(position);
            isGoaliePosition(position);
          });
        }
      };

      // Use environment-aware performance testing
      const { testConfig } = await import('../../utils/testEnvironment');
      const threshold = testConfig.performanceThresholds.fastOperation;
      
      const start = performance.now();
      performanceOperation();
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThanOrEqual(threshold);
    });
  });
});