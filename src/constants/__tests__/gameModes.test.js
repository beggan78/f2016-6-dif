/**
 * Tests for game mode configuration and related utilities
 * Validates that the dynamic configuration system is consistent and complete
 */

import { 
  getModeDefinition,
  getFormationPositions,
  getOutfieldPositions,
  supportsInactiveUsers,
  supportsNextNextIndicators,
  isIndividualMode,
  getPlayerCountForMode,
  isIndividual6Mode,
  isIndividual7Mode,
  isIndividual8Mode
} from '../gameModes';

import { createTeamConfig } from '../teamConfiguration';
import { TEAM_CONFIGS } from '../../game/testUtils';

describe('Game Mode Configuration', () => {
  describe('Team configuration compatibility', () => {
    test('should work with all supported team configurations', () => {
      const expectedConfigs = [
        TEAM_CONFIGS.PAIRS_7, 
        createTeamConfig('5v5', 5, '2-2', 'individual'),
        TEAM_CONFIGS.INDIVIDUAL_6, 
        TEAM_CONFIGS.INDIVIDUAL_7, 
        TEAM_CONFIGS.INDIVIDUAL_8, 
        TEAM_CONFIGS.INDIVIDUAL_9, 
        TEAM_CONFIGS.INDIVIDUAL_10
      ];
      
      expectedConfigs.forEach(config => {
        const positions = getFormationPositions(config);
        expect(Array.isArray(positions)).toBe(true);
        expect(positions.length).toBeGreaterThan(0);
      });
    });

    test('getModeDefinition should return consistent structure for team configs', () => {
      const testConfigs = [
        createTeamConfig('5v5', 7, '2-2', 'pairs'),
        createTeamConfig('5v5', 5, '2-2', 'individual'),
        createTeamConfig('5v5', 6, '2-2', 'individual'),
        createTeamConfig('5v5', 7, '2-2', 'individual'),
        createTeamConfig('5v5', 8, '2-2', 'individual'),
        createTeamConfig('5v5', 9, '2-2', 'individual'),
        createTeamConfig('5v5', 10, '2-2', 'individual')
      ];

      testConfigs.forEach(config => {
        const modeDefinition = getModeDefinition(config);
        expect(modeDefinition).toBeDefined();
        expect(modeDefinition.positions).toBeDefined();
        expect(modeDefinition.expectedCounts).toBeDefined();
        expect(typeof modeDefinition.expectedCounts.outfield).toBe('number');
        expect(typeof modeDefinition.expectedCounts.onField).toBe('number');
      });
    });


    test('should have valid individual mode configurations', () => {
      const individualConfigs = [
        TEAM_CONFIGS.INDIVIDUAL_6,
        TEAM_CONFIGS.INDIVIDUAL_7,
        TEAM_CONFIGS.INDIVIDUAL_8
      ];

      individualConfigs.forEach(config => {
        expect(isIndividualMode(config)).toBe(true);
        const count = getPlayerCountForMode(config);
        expect(count).toBeGreaterThan(5);
      });
    });

    test('should have correct expected counts', () => {
      const testCases = [
        { config: TEAM_CONFIGS.INDIVIDUAL_6, expectedOutfield: 5 },
        { config: TEAM_CONFIGS.INDIVIDUAL_7, expectedOutfield: 6 },
        { config: TEAM_CONFIGS.PAIRS_7, expectedOutfield: 6 }
      ];

      testCases.forEach(({ config, expectedOutfield }) => {
        const modeDefinition = getModeDefinition(config);
        expect(modeDefinition.expectedCounts.outfield).toBe(expectedOutfield);
      });
    });
  });
});