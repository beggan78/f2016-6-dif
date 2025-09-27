/**
 * Tests for Pending Match Service
 *
 * Tests the complete functionality of pending match detection, validation,
 * and resume data creation for the match resume feature.
 */

import {
  checkForPendingMatches,
  checkForPendingMatch,
  validatePendingMatchConfig,
  createResumeDataForConfiguration,
  matchesCurrentConfiguration
} from '../pendingMatchService';
import { getPendingMatchForTeam } from '../matchStateManager';
import { supabase } from '../../lib/supabase';
import { getInitialFormationTemplate } from '../../constants/gameModes';

// Mock dependencies
jest.mock('../matchStateManager', () => ({
  getPendingMatchForTeam: jest.fn()
}));

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn()
  }
}));

jest.mock('../../constants/gameModes', () => ({
  getInitialFormationTemplate: jest.fn(() => ({
    leftDefender: { playerId: null },
    rightDefender: { playerId: null },
    leftAttacker: { playerId: null },
    rightAttacker: { playerId: null }
  }))
}));

// Mock console methods
const mockConsole = {
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn()
};

const createMatchSelectChain = ({ data = [], error = null } = {}) => {
  const order = jest.fn(() => Promise.resolve({ data, error }));
  const eqState = jest.fn(() => ({ order }));
  const isDeleted = jest.fn(() => ({ eq: eqState }));
  const eqTeam = jest.fn(() => ({ is: isDeleted }));
  const select = jest.fn(() => ({ eq: eqTeam }));
  return { select, eqTeam, isDeleted, eqState, order };
};

describe('pendingMatchService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    const chain = createMatchSelectChain();
    supabase.from.mockImplementation(() => ({ select: chain.select }));

    // Setup console mocks
    console.warn = mockConsole.warn;
    console.error = mockConsole.error;
    console.log = mockConsole.log;
  });

  describe('checkForPendingMatches', () => {
    it('should return empty result when no teamId provided', async () => {
      const result = await checkForPendingMatches();

      expect(result).toEqual({
        shouldShow: false,
        pendingMatches: []
      });
    });

    it('should return empty result when teamId is null', async () => {
      const result = await checkForPendingMatches(null);

      expect(result).toEqual({
        shouldShow: false,
        pendingMatches: []
      });
    });

    it('should fetch pending matches for valid team', async () => {
      const mockMatches = [
        {
          id: 'match1',
          team_id: 'team123',
          state: 'pending',
          initial_config: {
            teamConfig: { formation: '2-2', squadSize: 7 },
            matchConfig: { periods: 3, periodDurationMinutes: 15 },
            squadSelection: ['player1', 'player2']
          },
          created_at: '2023-09-17T10:00:00Z'
        },
        {
          id: 'match2',
          team_id: 'team123',
          state: 'pending',
          initial_config: {
            teamConfig: { formation: '1-2-1', squadSize: 6 },
            matchConfig: { periods: 2, periodDurationMinutes: 20 },
            squadSelection: ['player3', 'player4']
          },
          created_at: '2023-09-17T09:00:00Z'
        }
      ];

      // Mock successful Supabase response
      const chain = createMatchSelectChain({ data: mockMatches });
      supabase.from.mockReturnValue({ select: chain.select });

      const result = await checkForPendingMatches('team123');

      expect(supabase.from).toHaveBeenCalledWith('match');
      expect(chain.select).toHaveBeenCalledWith('*');
      expect(chain.eqTeam).toHaveBeenCalledWith('team_id', 'team123');
      expect(chain.isDeleted).toHaveBeenCalledWith('deleted_at', null);
      expect(chain.eqState).toHaveBeenCalledWith('state', 'pending');
      expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });

      expect(result).toEqual({
        shouldShow: true,
        pendingMatches: mockMatches.map(match => ({
          ...match,
          created_by_profile: null,
          creatorName: null
        }))
      });
    });

    it('should include creator profile name when available', async () => {
      const mockMatches = [
        {
          id: 'match1',
          team_id: 'team123',
          state: 'pending',
          created_by: 'user-1',
          initial_config: {
            teamConfig: { formation: '2-2', squadSize: 7 },
            matchConfig: { periods: 3, periodDurationMinutes: 15 },
            squadSelection: ['player1', 'player2']
          },
          created_at: '2023-09-17T10:00:00Z'
        },
        {
          id: 'match2',
          team_id: 'team123',
          state: 'pending',
          created_by: null,
          initial_config: {
            teamConfig: { formation: '1-2-1', squadSize: 6 },
            matchConfig: { periods: 2, periodDurationMinutes: 20 },
            squadSelection: ['player3', 'player4']
          },
          created_at: '2023-09-17T09:00:00Z'
        }
      ];

      const matchChain = createMatchSelectChain({ data: mockMatches });

      const mockIn = jest.fn(() => Promise.resolve({
        data: [{ id: 'user-1', name: 'Coach Carter' }],
        error: null
      }));
      const mockSelectProfiles = jest.fn(() => ({ in: mockIn }));

      supabase.from.mockImplementation((table) => {
        if (table === 'match') {
          return { select: matchChain.select };
        }
        if (table === 'user_profile') {
          return { select: mockSelectProfiles };
        }
        return { select: jest.fn() };
      });

      const result = await checkForPendingMatches('team123');

      expect(matchChain.select).toHaveBeenCalledWith('*');
      expect(matchChain.eqTeam).toHaveBeenCalledWith('team_id', 'team123');
      expect(matchChain.isDeleted).toHaveBeenCalledWith('deleted_at', null);
      expect(matchChain.eqState).toHaveBeenCalledWith('state', 'pending');
      expect(matchChain.order).toHaveBeenCalledWith('created_at', { ascending: false });

      expect(mockSelectProfiles).toHaveBeenCalledWith('id, name');
      expect(mockIn).toHaveBeenCalledWith('id', ['user-1']);

      expect(result).toEqual({
        shouldShow: true,
        pendingMatches: [
          {
            ...mockMatches[0],
            created_by_profile: {
              id: 'user-1',
              name: 'Coach Carter'
            },
            creatorName: 'Coach Carter'
          },
          {
            ...mockMatches[1],
            created_by_profile: null,
            creatorName: null
          }
        ]
      });
    });

    it('should filter out matches with invalid initial_config', async () => {
      const mockMatches = [
        {
          id: 'match1',
          initial_config: {
            teamConfig: { formation: '2-2' },
            matchConfig: { periods: 3 },
            squadSelection: ['player1']
          }
        },
        {
          id: 'match2',
          initial_config: null
        },
        {
          id: 'match3',
          initial_config: {}
        },
        {
          id: 'match4'
          // missing initial_config
        }
      ];

      const chain = createMatchSelectChain({ data: mockMatches });
      supabase.from.mockReturnValue({ select: chain.select });

      const result = await checkForPendingMatches('team123');

      expect(result).toEqual({
        shouldShow: true,
        pendingMatches: [
          {
            ...mockMatches[0],
            created_by_profile: null,
            creatorName: null
          }
        ] // Only the first match should remain
      });
    });

    it('should handle database errors gracefully', async () => {
      const chain = createMatchSelectChain({
        data: null,
        error: { message: 'Database connection failed' }
      });
      supabase.from.mockReturnValue({ select: chain.select });

      const result = await checkForPendingMatches('team123');

      expect(result).toEqual({
        shouldShow: false,
        pendingMatches: []
      });
      expect(mockConsole.warn).toHaveBeenCalledWith(
        '⚠️ Failed to check for pending matches:',
        { message: 'Database connection failed' }
      );
    });

    it('should handle exceptions gracefully', async () => {
      supabase.from.mockImplementation(() => {
        throw new Error('Network error');
      });

      const result = await checkForPendingMatches('team123');

      expect(result).toEqual({
        shouldShow: false,
        pendingMatches: []
      });
      expect(mockConsole.error).toHaveBeenCalledWith(
        '❌ Exception while checking for pending matches:',
        expect.any(Error)
      );
    });
  });

  describe('checkForPendingMatch', () => {
    it('should return empty result when no teamId provided', async () => {
      const result = await checkForPendingMatch();

      expect(result).toEqual({
        shouldShow: false
      });
    });

    it('should use getPendingMatchForTeam to fetch match', async () => {
      const mockMatch = {
        id: 'match1',
        initial_config: {
          teamConfig: { formation: '2-2' },
          matchConfig: { periods: 3 },
          squadSelection: ['player1']
        }
      };

      getPendingMatchForTeam.mockResolvedValue({
        success: true,
        match: mockMatch
      });

      const result = await checkForPendingMatch('team123');

      expect(getPendingMatchForTeam).toHaveBeenCalledWith('team123');
      expect(result).toEqual({
        shouldShow: true,
        pendingMatch: mockMatch
      });
    });

    it('should handle getPendingMatchForTeam failure', async () => {
      getPendingMatchForTeam.mockResolvedValue({
        success: false,
        error: 'Database error'
      });

      const result = await checkForPendingMatch('team123');

      expect(result).toEqual({
        shouldShow: false
      });
      expect(mockConsole.warn).toHaveBeenCalledWith(
        '⚠️ Failed to check for pending match:',
        'Database error'
      );
    });

    it('should not show modal for match without initial_config', async () => {
      getPendingMatchForTeam.mockResolvedValue({
        success: true,
        match: {
          id: 'match1',
          initial_config: {} // empty config (no keys)
        }
      });

      const result = await checkForPendingMatch('team123');

      // The actual service returns shouldShow: false when initial_config is empty
      expect(result.shouldShow).toBe(false);
      expect(result.pendingMatch).toBe(null);
    });

    it('should not show modal for match with undefined initial_config', async () => {
      getPendingMatchForTeam.mockResolvedValue({
        success: true,
        match: { id: 'match1' } // missing initial_config entirely
      });

      const result = await checkForPendingMatch('team123');

      // When initial_config is undefined, shouldShow should be false
      expect(result.shouldShow).toBe(false);
      expect(result.pendingMatch).toBe(null);
    });

    it('should handle exceptions gracefully', async () => {
      getPendingMatchForTeam.mockRejectedValue(new Error('Network error'));

      const result = await checkForPendingMatch('team123');

      expect(result).toEqual({
        shouldShow: false
      });
      expect(mockConsole.error).toHaveBeenCalledWith(
        '❌ Exception while checking for pending match:',
        expect.any(Error)
      );
    });
  });

  describe('validatePendingMatchConfig', () => {
    it('should return false for null/undefined config', () => {
      expect(validatePendingMatchConfig(null)).toBe(false);
      expect(validatePendingMatchConfig(undefined)).toBe(false);
    });

    it('should return false for non-object config', () => {
      expect(validatePendingMatchConfig('string')).toBe(false);
      expect(validatePendingMatchConfig(123)).toBe(false);
      expect(validatePendingMatchConfig([])).toBe(false);
    });

    it('should return false for config missing required top-level properties', () => {
      expect(validatePendingMatchConfig({})).toBe(false);
      expect(validatePendingMatchConfig({ teamConfig: {} })).toBe(false);
      expect(validatePendingMatchConfig({
        teamConfig: {},
        matchConfig: {}
      })).toBe(false);
    });

    it('should return false for invalid teamConfig', () => {
      const config = {
        teamConfig: {}, // missing required properties
        matchConfig: { format: '5v5', periods: 3, periodDurationMinutes: 15 },
        squadSelection: ['player1']
      };

      expect(validatePendingMatchConfig(config)).toBe(false);
    });

    it('should return false for invalid matchConfig', () => {
      const config = {
        teamConfig: { formation: '2-2', squadSize: 7, substitutionType: 'pairs' },
        matchConfig: {}, // missing required properties
        squadSelection: ['player1']
      };

      expect(validatePendingMatchConfig(config)).toBe(false);
    });

    it('should return false for invalid squadSelection', () => {
      const config = {
        teamConfig: { formation: '2-2', squadSize: 7, substitutionType: 'pairs' },
        matchConfig: { format: '5v5', periods: 3, periodDurationMinutes: 15 },
        squadSelection: [] // empty array
      };

      expect(validatePendingMatchConfig(config)).toBe(false);

      config.squadSelection = 'not an array';
      expect(validatePendingMatchConfig(config)).toBe(false);
    });

    it('should return true for valid complete config', () => {
      const config = {
        teamConfig: {
          formation: '2-2',
          squadSize: 7,
          substitutionType: 'pairs'
        },
        matchConfig: {
          format: '5v5',
          periods: 3,
          periodDurationMinutes: 15
        },
        squadSelection: ['player1', 'player2', 'player3']
      };

      expect(validatePendingMatchConfig(config)).toBe(true);
    });
  });

  describe('createResumeDataForConfiguration', () => {
    it('should return null for invalid config', () => {
      expect(createResumeDataForConfiguration(null)).toBe(null);
      expect(createResumeDataForConfiguration({})).toBe(null);
    });

    it('should create resume data from valid config', () => {
      const validConfig = {
        teamConfig: {
          formation: '2-2',
          squadSize: 7,
          substitutionType: 'pairs'
        },
        matchConfig: {
          format: '5v5',
          periods: 3,
          periodDurationMinutes: 15,
          opponentTeam: 'Eagles FC',
          matchType: 'league',
          captainId: 'player1'
        },
        squadSelection: ['player1', 'player2', 'player3'],
        formation: {
          leftDefender: { playerId: 'player1' },
          rightDefender: { playerId: 'player2' }
        },
        periodGoalies: {
          1: 'player3'
        }
      };

      const result = createResumeDataForConfiguration(validConfig);

      expect(result).toEqual({
        squadSelection: ['player1', 'player2', 'player3'],
        periods: 3,
        periodDurationMinutes: 15,
        opponentTeam: 'Eagles FC',
        matchType: 'league',
        venueType: 'home',
        captainId: 'player1',
        teamConfig: validConfig.teamConfig,
        formation: '2-2',
        formationData: validConfig.formation,
        periodGoalies: { 1: 'player3' }
      });
    });

    it('should use defaults for missing optional properties', () => {
      const minimalConfig = {
        teamConfig: {
          formation: '1-2-1',
          squadSize: 6,
          substitutionType: 'individual'
        },
        matchConfig: {
          format: '5v5',
          periods: 2,
          periodDurationMinutes: 20
        },
        squadSelection: ['player1', 'player2']
      };

      const result = createResumeDataForConfiguration(minimalConfig);

      expect(result.opponentTeam).toBe('');
      expect(result.matchType).toBe('league');
      expect(result.captainId).toBe(null);
      expect(result.formationData).toEqual(getInitialFormationTemplate(minimalConfig.teamConfig));
      expect(result.periodGoalies).toEqual({});
    });

    it('should handle exceptions gracefully', () => {
      // Mock getInitialFormationTemplate to throw an error
      getInitialFormationTemplate.mockImplementation(() => {
        throw new Error('Formation template error');
      });

      const validConfig = {
        teamConfig: { formation: '2-2', squadSize: 7, substitutionType: 'pairs' },
        matchConfig: { format: '5v5', periods: 3, periodDurationMinutes: 15 },
        squadSelection: ['player1']
      };

      const result = createResumeDataForConfiguration(validConfig);

      expect(result).toBe(null);
      expect(mockConsole.error).toHaveBeenCalledWith(
        '❌ Failed to create resume data:',
        expect.any(Error)
      );
    });
  });

  describe('matchesCurrentConfiguration', () => {
    const createBaseConfig = () => ({
      squadSelection: ['player1', 'player2', 'player3'],
      teamConfig: {
        formation: '2-2',
        squadSize: 7,
        substitutionType: 'pairs'
      },
      periods: 3,
      periodDurationMinutes: 15,
      opponentTeam: 'Eagles FC',
      matchType: 'league'
    });

    const createBasePendingMatch = () => ({
      initial_config: {
        squadSelection: ['player1', 'player2', 'player3'],
        teamConfig: {
          formation: '2-2',
          squadSize: 7,
          substitutionType: 'pairs'
        },
        matchConfig: {
          periods: 3,
          periodDurationMinutes: 15,
          opponentTeam: 'Eagles FC',
          matchType: 'league'
        }
      }
    });

    it('should return false for null/undefined inputs', () => {
      expect(matchesCurrentConfiguration(null, null)).toBe(false);
      expect(matchesCurrentConfiguration({}, null)).toBe(false);
      expect(matchesCurrentConfiguration(null, {})).toBe(false);
    });

    it('should return false for pending match without initial_config', () => {
      const currentConfig = createBaseConfig();
      const pendingMatch = { id: 'match1' }; // missing initial_config

      expect(matchesCurrentConfiguration(currentConfig, pendingMatch)).toBe(false);
    });

    it('should return true for matching configurations', () => {
      const currentConfig = createBaseConfig();
      const pendingMatch = createBasePendingMatch();

      expect(matchesCurrentConfiguration(currentConfig, pendingMatch)).toBe(true);
    });

    it('should handle different squad order correctly', () => {
      const currentConfig = createBaseConfig();
      currentConfig.squadSelection = ['player3', 'player1', 'player2']; // different order

      const pendingMatch = createBasePendingMatch();

      expect(matchesCurrentConfiguration(currentConfig, pendingMatch)).toBe(true);
    });

    it('should return false for different squad players', () => {
      const currentConfig = createBaseConfig();
      currentConfig.squadSelection = ['player1', 'player2', 'player4']; // different player

      const pendingMatch = createBasePendingMatch();

      expect(matchesCurrentConfiguration(currentConfig, pendingMatch)).toBe(false);
    });

    it('should return false for different team config', () => {
      const currentConfig = createBaseConfig();
      currentConfig.teamConfig.formation = '1-2-1'; // different formation

      const pendingMatch = createBasePendingMatch();

      expect(matchesCurrentConfiguration(currentConfig, pendingMatch)).toBe(false);
    });

    it('should return false for different match config', () => {
      const currentConfig = createBaseConfig();
      currentConfig.periods = 2; // different periods

      const pendingMatch = createBasePendingMatch();

      expect(matchesCurrentConfiguration(currentConfig, pendingMatch)).toBe(false);
    });

    it('should handle exceptions gracefully', () => {
      // Create config that will cause JSON.stringify to throw
      const currentConfig = createBaseConfig();
      currentConfig.squadSelection = ['player1'];
      currentConfig.squadSelection.push(currentConfig.squadSelection); // circular reference

      const pendingMatch = createBasePendingMatch();

      const result = matchesCurrentConfiguration(currentConfig, pendingMatch);

      expect(result).toBe(false);
      expect(mockConsole.error).toHaveBeenCalledWith(
        '❌ Error comparing configurations:',
        expect.any(Error)
      );
    });
  });
});
