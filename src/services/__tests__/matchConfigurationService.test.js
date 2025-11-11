/**
 * Tests for Match Configuration Service
 *
 * Tests the complete functionality of match configuration management,
 * including save/update operations, validation, and data transformation.
 */

import {
  formatTeamConfigForDatabase,
  createInitialConfiguration,
  saveNewMatchConfiguration,
  updateMatchConfiguration,
  saveMatchConfiguration,
  validateConfiguration,
  handleMatchCreateOrUpdate
} from '../matchConfigurationService';
import {
  createMatch,
  formatMatchDataFromGameState,
  updateExistingMatch,
  saveInitialMatchConfig
} from '../matchStateManager';
import { FORMATS, getMinimumPlayersForFormat, getMaximumPlayersForFormat } from '../../constants/teamConfiguration';

// Mock dependencies
jest.mock('../matchStateManager', () => ({
  createMatch: jest.fn(),
  formatMatchDataFromGameState: jest.fn(),
  updateExistingMatch: jest.fn(),
  saveInitialMatchConfig: jest.fn()
}));

// Mock console methods
const mockConsole = {
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn()
};

describe('matchConfigurationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup console mocks
    console.warn = mockConsole.warn;
    console.error = mockConsole.error;
    console.log = mockConsole.log;
  });

  describe('formatTeamConfigForDatabase', () => {
    it('should format basic team configuration', () => {
      const teamConfig = {
        format: '5v5',
        formation: '2-2',
        squadSize: 7,
        substitutionType: 'individual'
      };

      const result = formatTeamConfigForDatabase(teamConfig);

      expect(result).toEqual({
        format: '5v5',
        formation: '2-2',
        squadSize: 7,
        substitutionType: 'individual'
      });
    });
  });

  describe('createInitialConfiguration', () => {
    it('should create complete initial configuration', () => {
      const params = {
        formation: {
          leftDefender: { playerId: 'player1' },
          rightDefender: { playerId: 'player2' },
          leftAttacker: { playerId: 'player3' },
          rightAttacker: { playerId: 'player4' }
        },
        teamConfig: {
          format: '5v5',
          formation: '2-2',
          squadSize: 7,
          substitutionType: 'individual'
        },
        matchData: {
          format: '5v5',
          venueType: 'home'
        },
        matchType: 'league',
        opponentTeam: 'Eagles FC',
        numPeriods: 3,
        periodDurationMinutes: 15,
        captainId: 'player1',
        periodGoalieIds: { 1: 'player5', 2: 'player6', 3: 'player7' },
        selectedSquadIds: ['player1', 'player2', 'player3', 'player4', 'player5', 'player6', 'player7']
      };

      const result = createInitialConfiguration(params);

      expect(result).toEqual({
        formation: params.formation,
        teamConfig: {
          format: '5v5',
          formation: '2-2',
          squadSize: 7,
          substitutionType: 'individual'
        },
        matchConfig: {
          format: '5v5',
          matchType: 'league',
          venueType: 'home',
          opponentTeam: 'Eagles FC',
          periods: 3,
          periodDurationMinutes: 15,
          captainId: 'player1'
        },
        periodGoalies: { 1: 'player5', 2: 'player6', 3: 'player7' },
        squadSelection: ['player1', 'player2', 'player3', 'player4', 'player5', 'player6', 'player7']
      });
    });

    it('should handle minimal configuration', () => {
      const params = {
        formation: {},
        teamConfig: {
          format: '5v5',
          formation: '1-2-1',
          squadSize: 6,
          substitutionType: 'individual'
        },
        matchData: {
          format: '5v5',
          venueType: 'home'
        },
        matchType: 'friendly',
        opponentTeam: '',
        numPeriods: 2,
        periodDurationMinutes: 20,
        captainId: null,
        periodGoalieIds: {},
        selectedSquadIds: ['player1', 'player2']
      };

      const result = createInitialConfiguration(params);

      expect(result.teamConfig.formation).toBe('1-2-1');
      expect(result.matchConfig.matchType).toBe('friendly');
      expect(result.matchConfig.venueType).toBe('home');
      expect(result.matchConfig.opponentTeam).toBe('');
      expect(result.matchConfig.captainId).toBe(null);
      expect(result.periodGoalies).toEqual({});
      expect(result.squadSelection).toEqual(['player1', 'player2']);
    });
  });

  describe('saveNewMatchConfiguration', () => {
    const createMockParams = () => ({
      matchData: { format: '5v5', teamId: 'team123', venueType: 'home' },
      allPlayers: [{
        id: 'player1',
        displayName: 'Player 1',
        firstName: 'Player',
        lastName: 'One'
      }],
      selectedSquadIds: ['player1'],
      initialConfig: { formation: {}, teamConfig: {}, matchConfig: {} },
      setCurrentMatchId: jest.fn(),
      setMatchCreated: jest.fn()
    });

    it('should create new match successfully', async () => {
      const params = createMockParams();
      createMatch.mockResolvedValue({
        success: true,
        matchId: 'match123'
      });
      saveInitialMatchConfig.mockResolvedValue({ success: true });

      const result = await saveNewMatchConfiguration(params);

      expect(createMatch).toHaveBeenCalledWith(params.matchData, params.allPlayers, params.selectedSquadIds);
      expect(params.setCurrentMatchId).toHaveBeenCalledWith('match123');
      expect(params.setMatchCreated).toHaveBeenCalledWith(true);
      expect(result).toEqual({
        success: true,
        matchId: 'match123'
      });
    });

    it('should handle create match failure', async () => {
      const params = createMockParams();
      createMatch.mockResolvedValue({
        success: false,
        error: 'Database error'
      });

      const result = await saveNewMatchConfiguration(params);

      expect(result).toEqual({
        success: false,
        error: 'Database error'
      });
      expect(params.setCurrentMatchId).not.toHaveBeenCalled();
      expect(params.setMatchCreated).not.toHaveBeenCalled();
      expect(mockConsole.warn).toHaveBeenCalledWith(
        '⚠️ Failed to create pending match:',
        'Database error'
      );
    });

    it('should handle saveInitialMatchConfig failure gracefully', async () => {
      const params = createMockParams();
      createMatch.mockResolvedValue({
        success: true,
        matchId: 'match123'
      });
      saveInitialMatchConfig.mockRejectedValue(new Error('Config save failed'));

      const result = await saveNewMatchConfiguration(params);

      expect(result).toEqual({
        success: true,
        matchId: 'match123'
      });
      // Should still succeed even if config save fails
      expect(params.setCurrentMatchId).toHaveBeenCalledWith('match123');
      expect(params.setMatchCreated).toHaveBeenCalledWith(true);
    });

    it('should handle exceptions gracefully', async () => {
      const params = createMockParams();
      createMatch.mockRejectedValue(new Error('Network error'));

      const result = await saveNewMatchConfiguration(params);

      expect(result).toEqual({
        success: false,
        error: 'Failed to create match configuration: Network error'
      });
      expect(mockConsole.error).toHaveBeenCalledWith(
        '❌ Error creating new match configuration:',
        expect.any(Error)
      );
    });
  });

  describe('updateMatchConfiguration', () => {
    const createMockParams = () => ({
      matchId: 'match123',
      matchData: { format: '5v5', teamId: 'team123', venueType: 'home' },
      initialConfig: { formation: {}, teamConfig: {}, matchConfig: {} }
    });

    it('should update match successfully', async () => {
      const params = createMockParams();
      updateExistingMatch.mockResolvedValue({
        success: true
      });
      saveInitialMatchConfig.mockResolvedValue({ success: true });

      const result = await updateMatchConfiguration(params);

      expect(updateExistingMatch).toHaveBeenCalledWith('match123', params.matchData);
      expect(result).toEqual({
        success: true
      });
    });

    it('should handle update match failure', async () => {
      const params = createMockParams();
      updateExistingMatch.mockResolvedValue({
        success: false,
        error: 'Update failed'
      });

      const result = await updateMatchConfiguration(params);

      expect(result).toEqual({
        success: false,
        error: 'Update failed'
      });
      expect(mockConsole.warn).toHaveBeenCalledWith(
        '⚠️ Failed to update pending match:',
        'Update failed'
      );
    });

    it('should handle saveInitialMatchConfig failure gracefully', async () => {
      const params = createMockParams();
      updateExistingMatch.mockResolvedValue({
        success: true
      });
      saveInitialMatchConfig.mockRejectedValue(new Error('Config update failed'));

      const result = await updateMatchConfiguration(params);

      expect(result).toEqual({
        success: true
      });
      // Should still succeed even if config update fails
    });

    it('should handle exceptions gracefully', async () => {
      const params = createMockParams();
      updateExistingMatch.mockRejectedValue(new Error('Network error'));

      const result = await updateMatchConfiguration(params);

      expect(result).toEqual({
        success: false,
        error: 'Failed to update match configuration: Network error'
      });
      expect(mockConsole.error).toHaveBeenCalledWith(
        '❌ Error updating match configuration:',
        expect.any(Error)
      );
    });
  });

  describe('saveMatchConfiguration', () => {
    const createMockParams = (overrides = {}) => ({
      teamConfig: {
        format: '5v5',
        formation: '2-2',
        squadSize: 7,
        substitutionType: 'individual'
      },
      selectedFormation: '2-2',
      numPeriods: 3,
      periodDurationMinutes: 15,
      opponentTeam: 'Eagles FC',
      captainId: 'player1',
      matchType: 'league',
      formation: {
        leftDefender: { playerId: 'player1' },
        rightDefender: { playerId: 'player2' }
      },
      periodGoalieIds: { 1: 'player5', 2: 'player6', 3: 'player7' },
      selectedSquadIds: ['player1', 'player2', 'player3', 'player4', 'player5', 'player6', 'player7'],
      allPlayers: [{
        id: 'player1',
        displayName: 'Player 1',
        firstName: 'Player',
        lastName: 'One'
      }],
      currentTeam: { id: 'team123', name: 'Test Team' },
      currentMatchId: null,
      matchCreated: false,
      setCurrentMatchId: jest.fn(),
      setMatchCreated: jest.fn(),
      ...overrides
    });

    it('should create new match when no existing match', async () => {
      const params = createMockParams();
      formatMatchDataFromGameState.mockReturnValue({
        format: '5v5',
        teamId: 'team123',
        venueType: 'home'
      });
      createMatch.mockResolvedValue({
        success: true,
        matchId: 'match123'
      });
      saveInitialMatchConfig.mockResolvedValue({ success: true });

      const result = await saveMatchConfiguration(params);

      expect(formatMatchDataFromGameState).toHaveBeenCalled();
      expect(createMatch).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        matchId: 'match123',
        message: 'Configuration saved successfully'
      });
    });

    it('should update existing match when match exists', async () => {
      const params = createMockParams({
        currentMatchId: 'match123',
        matchCreated: true
      });
      formatMatchDataFromGameState.mockReturnValue({
        format: '5v5',
        teamId: 'team123',
        venueType: 'home'
      });
      updateExistingMatch.mockResolvedValue({
        success: true
      });
      saveInitialMatchConfig.mockResolvedValue({ success: true });

      const result = await saveMatchConfiguration(params);

      expect(formatMatchDataFromGameState).toHaveBeenCalled();
      expect(updateExistingMatch).toHaveBeenCalledWith('match123', expect.any(Object));
      expect(result).toEqual({
        success: true,
        matchId: 'match123',
        message: 'Configuration updated successfully'
      });
    });

    it('should fail when no team context', async () => {
      const params = createMockParams({
        currentTeam: null
      });

      const result = await saveMatchConfiguration(params);

      expect(result).toEqual({
        success: false,
        error: 'Team context required for saving configuration.'
      });
    });

    it('should handle create/update failures', async () => {
      const params = createMockParams();
      formatMatchDataFromGameState.mockReturnValue({
        format: '5v5',
        teamId: 'team123',
        venueType: 'home'
      });
      createMatch.mockResolvedValue({
        success: false,
        error: 'Database error'
      });

      const result = await saveMatchConfiguration(params);

      expect(result).toEqual({
        success: false,
        error: 'Database error'
      });
    });

    it('should handle exceptions gracefully', async () => {
      const params = createMockParams();
      formatMatchDataFromGameState.mockImplementation(() => {
        throw new Error('Format error');
      });

      const result = await saveMatchConfiguration(params);

      expect(result).toEqual({
        success: false,
        error: 'Failed to save configuration: Format error'
      });
      expect(mockConsole.error).toHaveBeenCalledWith(
        '❌ Error managing match configuration:',
        expect.any(Error)
      );
    });
  });

  describe('validateConfiguration', () => {
    const baseMinPlayers = getMinimumPlayersForFormat(FORMATS.FORMAT_5V5);
    const baseMaxPlayers = getMaximumPlayersForFormat(FORMATS.FORMAT_5V5);
    const baseRangeError = `Please select between ${baseMinPlayers} and ${baseMaxPlayers} players for the squad.`;
    const maxPlayersFor7v7 = getMaximumPlayersForFormat(FORMATS.FORMAT_7V7);

    it('should validate correct configuration', () => {
      const params = {
        selectedSquadIds: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'],
        numPeriods: 3,
        periodGoalieIds: { 1: 'p1', 2: 'p2', 3: 'p3' }
      };

      const result = validateConfiguration(params);

      expect(result).toEqual({
        isValid: true
      });
    });

    it('should fail with too few players', () => {
      const params = {
        selectedSquadIds: ['p1', 'p2', 'p3', 'p4'], // Only 4 players
        numPeriods: 3,
        periodGoalieIds: { 1: 'p1', 2: 'p2', 3: 'p3' }
      };

      const result = validateConfiguration(params);

      expect(result).toEqual({
        isValid: false,
        error: baseRangeError
      });
    });

    it('should fail with too many players', () => {
      const params = {
        selectedSquadIds: Array.from({ length: baseMaxPlayers + 1 }, (_, index) => `p${index + 1}`),
        numPeriods: 3,
        periodGoalieIds: { 1: 'p1', 2: 'p2', 3: 'p3' }
      };

      const result = validateConfiguration(params);

      expect(result).toEqual({
        isValid: false,
        error: baseRangeError
      });
    });

    it('should enforce format-specific minimum players', () => {
      const minPlayersFor7v7 = getMinimumPlayersForFormat(FORMATS.FORMAT_7V7);
      const params = {
        selectedSquadIds: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'], // Missing required players for 7v7
        numPeriods: 2,
        periodGoalieIds: { 1: 'p1', 2: 'p2' },
        format: FORMATS.FORMAT_7V7
      };

      const result = validateConfiguration(params);

      expect(result).toEqual({
        isValid: false,
        error: `Please select between ${minPlayersFor7v7} and ${maxPlayersFor7v7} players for the squad.`
      });
    });

    it('should respect custom max players when provided', () => {
      const params = {
        selectedSquadIds: Array.from({ length: 11 }, (_, index) => `p${index + 1}`),
        numPeriods: 3,
        periodGoalieIds: { 1: 'p1', 2: 'p2', 3: 'p3' },
        maxPlayersAllowed: 10
      };

      const result = validateConfiguration(params);

      expect(result).toEqual({
        isValid: false,
        error: `Please select between ${baseMinPlayers} and 10 players for the squad.`
      });
    });

    it('should not exceed the format maximum when custom max is higher', () => {
      const params = {
        selectedSquadIds: Array.from({ length: baseMaxPlayers + 1 }, (_, index) => `p${index + 1}`),
        numPeriods: 3,
        periodGoalieIds: { 1: 'p1', 2: 'p2', 3: 'p3' },
        maxPlayersAllowed: baseMaxPlayers + 5
      };

      const result = validateConfiguration(params);

      expect(result).toEqual({
        isValid: false,
        error: baseRangeError
      });
    });

    it('should fail with missing goalie assignments', () => {
      const params = {
        selectedSquadIds: ['p1', 'p2', 'p3', 'p4', 'p5'],
        numPeriods: 3,
        periodGoalieIds: { 1: 'p1', 2: 'p2' } // Missing period 3 goalie
      };

      const result = validateConfiguration(params);

      expect(result).toEqual({
        isValid: false,
        error: 'Please assign a goalie for each period.'
      });
    });

    it('should handle zero periods edge case', () => {
      const params = {
        selectedSquadIds: ['p1', 'p2', 'p3', 'p4', 'p5'],
        numPeriods: 0,
        periodGoalieIds: {}
      };

      const result = validateConfiguration(params);

      expect(result).toEqual({
        isValid: true
      });
    });
  });

  describe('handleMatchCreateOrUpdate', () => {
    const createMockParams = (overrides = {}) => ({
      currentMatchId: null,
      matchCreated: false,
      matchData: { format: '5v5', teamId: 'team123', venueType: 'home' },
      allPlayers: [{
        id: 'player1',
        displayName: 'Player 1',
        firstName: 'Player',
        lastName: 'One'
      }],
      selectedSquadIds: ['player1'],
      setCurrentMatchId: jest.fn(),
      setMatchCreated: jest.fn(),
      ...overrides
    });

    it('should create new match when no existing match', async () => {
      const params = createMockParams();
      createMatch.mockResolvedValue({
        success: true,
        matchId: 'match123'
      });

      const result = await handleMatchCreateOrUpdate(params);

      expect(params.setMatchCreated).toHaveBeenCalledWith(true);
      expect(createMatch).toHaveBeenCalledWith(params.matchData, params.allPlayers, params.selectedSquadIds);
      expect(params.setCurrentMatchId).toHaveBeenCalledWith('match123');
      expect(result).toEqual({
        success: true,
        matchId: 'match123'
      });
    });

    it('should update existing match when match exists', async () => {
      const params = createMockParams({
        currentMatchId: 'match123',
        matchCreated: true
      });
      updateExistingMatch.mockResolvedValue({
        success: true
      });

      const result = await handleMatchCreateOrUpdate(params);

      expect(updateExistingMatch).toHaveBeenCalledWith('match123', params.matchData);
      expect(result).toEqual({
        success: true,
        matchId: 'match123'
      });
    });

    it('should handle create match failure', async () => {
      const params = createMockParams();
      createMatch.mockResolvedValue({
        success: false,
        error: 'Database error'
      });

      const result = await handleMatchCreateOrUpdate(params);

      expect(result).toEqual({
        success: false,
        error: 'Database error'
      });
      expect(mockConsole.warn).toHaveBeenCalledWith(
        '⚠️ Failed to create match record:',
        'Database error'
      );
    });

    it('should handle update match failure', async () => {
      const params = createMockParams({
        currentMatchId: 'match123',
        matchCreated: true
      });
      updateExistingMatch.mockResolvedValue({
        success: false,
        error: 'Update failed'
      });

      const result = await handleMatchCreateOrUpdate(params);

      expect(result).toEqual({
        success: false,
        matchId: 'match123',
        error: 'Update failed'
      });
      expect(mockConsole.warn).toHaveBeenCalledWith(
        '⚠️ Failed to update match record:',
        'Update failed'
      );
    });

    it('should handle exceptions gracefully', async () => {
      const params = createMockParams();
      createMatch.mockRejectedValue(new Error('Network error'));

      const result = await handleMatchCreateOrUpdate(params);

      expect(result).toEqual({
        success: false,
        error: 'Network error'
      });
      expect(mockConsole.error).toHaveBeenCalledWith(
        '❌ Error in match create/update flow:',
        expect.any(Error)
      );
    });
  });
});
