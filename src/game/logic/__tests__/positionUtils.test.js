/**
 * Unit tests for position utility functions
 * Tests position-to-role mapping and formation structure queries
 */

import {
  getOutfieldPositions,
  getFieldPositions
} from '../positionUtils';

import { TEAM_CONFIGS } from '../../testUtils';

describe('positionUtils', () => {
  describe('getOutfieldPositions', () => {
    test('should return correct outfield positions for each team config', () => {
      // Test using configuration-driven validation
      const testCases = [
        {
          config: TEAM_CONFIGS.INDIVIDUAL_6,
          expectedLength: 5,
          excludedPositions: ['goalie']
        },
        {
          config: TEAM_CONFIGS.INDIVIDUAL_7,
          expectedLength: 6,
          excludedPositions: ['goalie']
        },
        {
          config: TEAM_CONFIGS.PAIRS_7,
          expectedLength: 3,
          excludedPositions: ['goalie']
        }
      ];

      testCases.forEach(({ config, expectedLength, excludedPositions }) => {
        const positions = getOutfieldPositions(config);
        
        expect(positions).toHaveLength(expectedLength);
        excludedPositions.forEach(pos => {
          expect(positions).not.toContain(pos);
        });
      });
    });

    test('should return empty array for unknown team config', () => {
      const positions = getOutfieldPositions({ invalid: 'config' });
      
      expect(positions).toEqual([]);
    });

    test('should return empty array for null/undefined team config', () => {
      expect(getOutfieldPositions(null)).toEqual([]);
      expect(getOutfieldPositions(undefined)).toEqual([]);
    });
  });

  describe('getFieldPositions', () => {
    test('should return only field positions (excluding substitutes) for each team config', () => {
      // Test using configuration-driven validation
      const testCases = [
        {
          config: TEAM_CONFIGS.INDIVIDUAL_6,
          expectedLength: 4
        },
        {
          config: TEAM_CONFIGS.INDIVIDUAL_7,
          expectedLength: 4
        },
        {
          config: TEAM_CONFIGS.PAIRS_7,
          expectedLength: 2
        }
      ];

      testCases.forEach(({ config, expectedLength }) => {
        const positions = getFieldPositions(config);
        
        expect(positions).toHaveLength(expectedLength);
      });
    });

    test('should return empty array for unknown team config', () => {
      const positions = getFieldPositions({ invalid: 'config' });
      
      expect(positions).toEqual([]);
    });
  });
});