import { 
  checkForRecoverableMatch, 
  deleteAbandonedMatch, 
  getRecoveryMatchData, 
  validateRecoveryData,
  checkForPendingMatches,
  validatePendingMatchData
} from '../matchRecoveryService';
import { supabase } from '../../lib/supabase';

// Mock the supabase client
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn()
      }))
    }))
  }
}));

// Mock the persistence manager
jest.mock('../../utils/persistenceManager', () => {
  const mockLoadState = jest.fn();
  return {
    createGamePersistenceManager: jest.fn(() => ({
      loadState: mockLoadState
    }))
  };
});

// Get the mock function to use in tests
const { createGamePersistenceManager } = require('../../utils/persistenceManager');
const mockLoadState = createGamePersistenceManager().loadState;

describe('matchRecoveryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock console methods for clean test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('checkForRecoverableMatch', () => {
    it('returns null when no currentMatchId in localStorage', async () => {
      mockLoadState.mockReturnValue({
        currentMatchId: null
      });

      const result = await checkForRecoverableMatch();

      expect(result).toEqual({ success: true, match: null });
      expect(mockLoadState).toHaveBeenCalled();
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('returns null when currentMatchId is undefined', async () => {
      mockLoadState.mockReturnValue({
        // currentMatchId is undefined
      });

      const result = await checkForRecoverableMatch();

      expect(result).toEqual({ success: true, match: null });
      expect(mockLoadState).toHaveBeenCalled();
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('successfully finds a recoverable match', async () => {
      const mockMatch = {
        id: 'match-123',
        state: 'finished',
        opponent: 'Test Team',
        finished_at: '2024-01-15T10:30:00Z',
        outcome: 'win',
        goals_scored: 3,
        goals_conceded: 1
      };

      mockLoadState.mockReturnValue({
        currentMatchId: 'match-123'
      });

      const mockSingle = jest.fn().mockResolvedValue({
        data: mockMatch,
        error: null
      });
      
      const mockEq2 = jest.fn(() => ({
        single: mockSingle
      }));
      
      const mockEq1 = jest.fn(() => ({
        eq: mockEq2
      }));
      
      const mockSelect = jest.fn(() => ({
        eq: mockEq1
      }));

      supabase.from.mockReturnValue({
        select: mockSelect
      });

      const result = await checkForRecoverableMatch();

      expect(result).toEqual({
        success: true,
        match: mockMatch
      });

      expect(supabase.from).toHaveBeenCalledWith('match');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq1).toHaveBeenCalledWith('id', 'match-123');
      expect(mockEq2).toHaveBeenCalledWith('state', 'finished');
    });

    it('returns null when match not found', async () => {
      mockLoadState.mockReturnValue({
        currentMatchId: 'non-existent-match'
      });

      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' } // Not found
      });
      
      const mockEq2 = jest.fn(() => ({
        single: mockSingle
      }));
      
      const mockEq1 = jest.fn(() => ({
        eq: mockEq2
      }));
      
      const mockSelect = jest.fn(() => ({
        eq: mockEq1
      }));

      supabase.from.mockReturnValue({
        select: mockSelect
      });

      const result = await checkForRecoverableMatch();

      expect(result).toEqual({ success: true, match: null });
    });

    it('handles database errors gracefully', async () => {
      mockLoadState.mockReturnValue({
        currentMatchId: 'match-123'
      });

      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed', code: 'PGRST001' }
      });
      
      const mockEq2 = jest.fn(() => ({
        single: mockSingle
      }));
      
      const mockEq1 = jest.fn(() => ({
        eq: mockEq2
      }));
      
      const mockSelect = jest.fn(() => ({
        eq: mockEq1
      }));

      supabase.from.mockReturnValue({
        select: mockSelect
      });

      const result = await checkForRecoverableMatch();

      expect(result).toEqual({
        success: false,
        error: 'Database error: Database connection failed'
      });

      expect(console.error).toHaveBeenCalledWith(
        '❌ Error checking for recoverable match:',
        { message: 'Database connection failed', code: 'PGRST001' }
      );
    });

    it('handles unexpected exceptions', async () => {
      mockLoadState.mockImplementation(() => {
        throw new Error('LocalStorage access failed');
      });

      const result = await checkForRecoverableMatch();

      expect(result).toEqual({
        success: false,
        error: 'Unexpected error: LocalStorage access failed'
      });

      expect(console.error).toHaveBeenCalledWith(
        '❌ Exception while checking for recoverable match:',
        expect.any(Error)
      );
    });
  });

  describe('deleteAbandonedMatch', () => {
    it('successfully deletes a match', async () => {
      const mockEq = jest.fn().mockResolvedValue({
        error: null
      });
      const mockDelete = jest.fn(() => ({
        eq: mockEq
      }));

      supabase.from.mockReturnValue({
        delete: mockDelete
      });

      const result = await deleteAbandonedMatch('match-123');

      expect(result).toEqual({ success: true });
      expect(supabase.from).toHaveBeenCalledWith('match');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'match-123');
    });

    it('returns error when matchId is missing', async () => {
      const result = await deleteAbandonedMatch();

      expect(result).toEqual({
        success: false,
        error: 'Match ID is required'
      });

      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('returns error when matchId is empty string', async () => {
      const result = await deleteAbandonedMatch('');

      expect(result).toEqual({
        success: false,
        error: 'Match ID is required'
      });
    });

    it('handles database delete errors', async () => {
      const mockEq = jest.fn().mockResolvedValue({
        error: { message: 'Permission denied' }
      });
      const mockDelete = jest.fn(() => ({
        eq: mockEq
      }));

      supabase.from.mockReturnValue({
        delete: mockDelete
      });

      const result = await deleteAbandonedMatch('match-123');

      expect(result).toEqual({
        success: false,
        error: 'Database error: Permission denied'
      });

      expect(console.error).toHaveBeenCalledWith(
        '❌ Failed to delete abandoned match:',
        { message: 'Permission denied' }
      );
    });

    it('handles unexpected exceptions during deletion', async () => {
      supabase.from.mockImplementation(() => {
        throw new Error('Network timeout');
      });

      const result = await deleteAbandonedMatch('match-123');

      expect(result).toEqual({
        success: false,
        error: 'Unexpected error: Network timeout'
      });

      expect(console.error).toHaveBeenCalledWith(
        '❌ Exception while deleting abandoned match:',
        expect.any(Error)
      );
    });
  });

  describe('getRecoveryMatchData', () => {
    it('returns recovery data from localStorage', () => {
      const mockGameState = {
        allPlayers: [
          { id: 1, name: 'Player 1' },
          { id: 2, name: 'Player 2' }
        ],
        goalScorers: { 1: 2, 2: 1 },
        matchEvents: [
          { type: 'goal', playerId: 1, timestamp: '10:30' }
        ],
        currentMatchId: 'match-123',
        ownScore: 3,
        opponentScore: 1,
        opponentTeam: 'Test Team',
        captainId: 1
      };

      mockLoadState.mockReturnValue(mockGameState);

      const result = getRecoveryMatchData();

      expect(result).toEqual({
        allPlayers: mockGameState.allPlayers,
        goalScorers: mockGameState.goalScorers,
        matchEvents: mockGameState.matchEvents,
        currentMatchId: mockGameState.currentMatchId,
        ownScore: mockGameState.ownScore,
        opponentScore: mockGameState.opponentScore,
        opponentTeam: mockGameState.opponentTeam,
        captainId: mockGameState.captainId
      });
    });

    it('returns defaults for missing data', () => {
      mockLoadState.mockReturnValue({
        currentMatchId: 'match-123'
        // Other fields missing
      });

      const result = getRecoveryMatchData();

      expect(result).toEqual({
        allPlayers: [],
        goalScorers: {},
        matchEvents: [],
        currentMatchId: 'match-123',
        ownScore: 0,
        opponentScore: 0,
        opponentTeam: '',
        captainId: null
      });
    });

    it('handles persistence manager errors', () => {
      mockLoadState.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const result = getRecoveryMatchData();

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        '❌ Error getting recovery match data:',
        expect.any(Error)
      );
    });
  });

  describe('validateRecoveryData', () => {
    const validMatch = {
      id: 'match-123',
      state: 'finished',
      opponent: 'Test Team'
    };

    const validLocalData = {
      currentMatchId: 'match-123',
      allPlayers: [{ id: 1, name: 'Player 1' }],
      ownScore: 2,
      opponentScore: 1
    };

    it('validates correct match and local data', () => {
      const result = validateRecoveryData(validMatch, validLocalData);

      expect(result).toBe(true);
    });

    it('returns false when match is null', () => {
      const result = validateRecoveryData(null, validLocalData);

      expect(result).toBe(false);
    });

    it('returns false when localData is null', () => {
      const result = validateRecoveryData(validMatch, null);

      expect(result).toBe(false);
    });

    it('returns false when match IDs do not match', () => {
      const mismatchedLocalData = {
        ...validLocalData,
        currentMatchId: 'different-match-id'
      };

      const result = validateRecoveryData(validMatch, mismatchedLocalData);

      expect(result).toBe(false);
    });

    it('returns false when allPlayers is missing', () => {
      const invalidLocalData = {
        ...validLocalData,
        allPlayers: undefined
      };

      const result = validateRecoveryData(validMatch, invalidLocalData);

      expect(result).toBe(false);
    });

    it('returns false when allPlayers is empty', () => {
      const invalidLocalData = {
        ...validLocalData,
        allPlayers: []
      };

      const result = validateRecoveryData(validMatch, invalidLocalData);

      expect(result).toBe(false);
    });

    it('returns false when allPlayers is not an array', () => {
      const invalidLocalData = {
        ...validLocalData,
        allPlayers: 'not-an-array'
      };

      const result = validateRecoveryData(validMatch, invalidLocalData);

      expect(result).toBe(false);
    });

    it('returns false when ownScore is negative', () => {
      const invalidLocalData = {
        ...validLocalData,
        ownScore: -1
      };

      const result = validateRecoveryData(validMatch, invalidLocalData);

      expect(result).toBe(false);
    });

    it('returns false when opponentScore is negative', () => {
      const invalidLocalData = {
        ...validLocalData,
        opponentScore: -2
      };

      const result = validateRecoveryData(validMatch, invalidLocalData);

      expect(result).toBe(false);
    });

    it('returns false when ownScore is not a number', () => {
      const invalidLocalData = {
        ...validLocalData,
        ownScore: 'two'
      };

      const result = validateRecoveryData(validMatch, invalidLocalData);

      expect(result).toBe(false);
    });

    it('accepts zero scores as valid', () => {
      const validLocalDataWithZeros = {
        ...validLocalData,
        ownScore: 0,
        opponentScore: 0
      };

      const result = validateRecoveryData(validMatch, validLocalDataWithZeros);

      expect(result).toBe(true);
    });

    it('logs validation details in development', () => {
      // Set NODE_ENV to development for this test
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      try {
        const result = validateRecoveryData(validMatch, validLocalData);

        expect(result).toBe(true);
        expect(console.log).toHaveBeenCalledWith('🔍 Recovery data validation:', {
          isValid: true,
          matchId: 'match-123',
          localMatchId: 'match-123',
          playersCount: 1,
          scores: '2-1'
        });
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('logs validation failure details in development', () => {
      // Set NODE_ENV to development for this test
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      try {
        const invalidLocalData = {
          ...validLocalData,
          currentMatchId: 'wrong-id'
        };

        const result = validateRecoveryData(validMatch, invalidLocalData);

        expect(result).toBe(false);
        expect(console.log).toHaveBeenCalledWith('🔍 Recovery data validation:', {
          isValid: false,
          matchId: 'match-123',
          localMatchId: 'wrong-id',
          playersCount: 1,
          scores: '2-1'
        });
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('checkForPendingMatches', () => {
    it('should successfully return pending matches', async () => {
      const mockMatches = [
        { 
          id: 'match-1', 
          opponent: 'Team A', 
          created_at: '2023-01-01T10:00:00Z',
          formation: '2-2',
          initial_config: { teamConfig: { substitutionType: 'individual' } }
        },
        { 
          id: 'match-2', 
          opponent: 'Team B', 
          created_at: '2023-01-01T11:00:00Z',
          formation: '1-2-1',
          initial_config: { teamConfig: { substitutionType: 'pairs', pairRoleRotation: 'swap_every_rotation' } }
        }
      ];

      const mockOrder = jest.fn().mockResolvedValue({ data: mockMatches, error: null });
      const mockEq2 = jest.fn().mockReturnValue({ order: mockOrder });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });

      supabase.from.mockReturnValue({ select: mockSelect });

      const result = await checkForPendingMatches('team-123');

      expect(result.success).toBe(true);
      expect(result.matches).toEqual(mockMatches);
      expect(supabase.from).toHaveBeenCalledWith('match');
      expect(mockSelect).toHaveBeenCalledWith('id, opponent, created_at, formation, initial_config');
      expect(mockEq1).toHaveBeenCalledWith('team_id', 'team-123');
      expect(mockEq2).toHaveBeenCalledWith('state', 'pending');
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should handle missing team ID', async () => {
      const result = await checkForPendingMatches();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Team ID is required');
    });

    it('should handle database errors', async () => {
      const mockError = { message: 'Database connection failed' };
      const mockOrder = jest.fn().mockResolvedValue({ data: null, error: mockError });
      const mockEq2 = jest.fn().mockReturnValue({ order: mockOrder });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });

      supabase.from.mockReturnValue({ select: mockSelect });

      const result = await checkForPendingMatches('team-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error: Database connection failed');
      expect(console.error).toHaveBeenCalledWith('❌ Error querying pending matches:', mockError);
    });

    it('should return empty array when no pending matches found', async () => {
      const mockOrder = jest.fn().mockResolvedValue({ data: [], error: null });
      const mockEq2 = jest.fn().mockReturnValue({ order: mockOrder });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });

      supabase.from.mockReturnValue({ select: mockSelect });

      const result = await checkForPendingMatches('team-123');

      expect(result.success).toBe(true);
      expect(result.matches).toEqual([]);
    });
  });

  describe('validatePendingMatchData', () => {
    it('should successfully validate pending match with player stats', async () => {
      const mockMatch = {
        id: 'match-1',
        formation: '2-2',
        opponent: 'Test Team'
      };

      const mockPlayerStats = [
        { player_id: 'player-1', started_as: 'defender' },
        { player_id: 'player-2', started_as: 'attacker' }
      ];

      // Mock match query
      const mockSingle = jest.fn().mockResolvedValue({ data: mockMatch, error: null });
      const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect1 = jest.fn().mockReturnValue({ eq: mockEq1 });

      // Mock player stats query
      const mockEq3 = jest.fn().mockResolvedValue({ data: mockPlayerStats, error: null });
      const mockSelect2 = jest.fn().mockReturnValue({ eq: mockEq3 });

      supabase.from
        .mockReturnValueOnce({ select: mockSelect1 }) // Match query
        .mockReturnValueOnce({ select: mockSelect2 }); // Player stats query

      const result = await validatePendingMatchData('match-1');

      expect(result.success).toBe(true);
      expect(result.issues).toEqual([]);
      expect(result.playerCount).toBe(2);
      expect(result.hasValidStats).toBe(true);
      expect(result.match).toEqual(mockMatch);
    });

    it('should handle missing match ID', async () => {
      const result = await validatePendingMatchData();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Match ID is required');
    });

    it('should handle match not found', async () => {
      const mockError = { code: 'PGRST116', message: 'No rows found' };
      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: mockError });
      const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });

      supabase.from.mockReturnValue({ select: mockSelect });

      const result = await validatePendingMatchData('match-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Pending match not found or not accessible');
    });

    it('should identify validation issues', async () => {
      const mockMatch = {
        id: 'match-1',
        formation: null, // Missing formation
        opponent: 'Test Team'
      };

      const mockPlayerStats = []; // No player stats

      // Mock match query
      const mockSingle = jest.fn().mockResolvedValue({ data: mockMatch, error: null });
      const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect1 = jest.fn().mockReturnValue({ eq: mockEq1 });

      // Mock player stats query
      const mockEq3 = jest.fn().mockResolvedValue({ data: mockPlayerStats, error: null });
      const mockSelect2 = jest.fn().mockReturnValue({ eq: mockEq3 });

      supabase.from
        .mockReturnValueOnce({ select: mockSelect1 })
        .mockReturnValueOnce({ select: mockSelect2 });

      const result = await validatePendingMatchData('match-1');

      expect(result.success).toBe(true);
      expect(result.issues).toContain('No player statistics found for this match');
      expect(result.issues).toContain('Missing formation configuration');
      expect(result.playerCount).toBe(0);
      expect(result.hasValidStats).toBe(false);
    });
  });
});