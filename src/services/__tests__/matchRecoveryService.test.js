import {
  checkForRecoverableMatch,
  deleteAbandonedMatch,
  getRecoveryMatchData,
  validateRecoveryData
} from '../matchRecoveryService';
import { supabase } from '../../lib/supabase';

// Mock the supabase client
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn()
  }
}));

const createSelectChain = ({ singleResult }) => {
  const single = jest.fn().mockResolvedValue(singleResult);
  const eqState = jest.fn(() => ({ single }));
  const isDeleted = jest.fn(() => ({ eq: eqState }));
  const eqId = jest.fn(() => ({ is: isDeleted }));
  const select = jest.fn(() => ({ eq: eqId }));
  return { select, eqId, isDeleted, eqState, single };
};

const createUpdateChain = response => {
  const isDeleted = jest.fn(() => Promise.resolve(response));
  const eqId = jest.fn(() => ({ is: isDeleted }));
  const update = jest.fn(() => ({ eq: eqId }));
  return { update, eqId, isDeleted };
};

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

      const chain = createSelectChain({
        singleResult: { data: mockMatch, error: null }
      });

      supabase.from.mockReturnValue({ select: chain.select });

      const result = await checkForRecoverableMatch();

      expect(result).toEqual({
        success: true,
        match: mockMatch
      });

      expect(supabase.from).toHaveBeenCalledWith('match');
      expect(chain.select).toHaveBeenCalledWith('*');
      expect(chain.eqId).toHaveBeenCalledWith('id', 'match-123');
      expect(chain.isDeleted).toHaveBeenCalledWith('deleted_at', null);
      expect(chain.eqState).toHaveBeenCalledWith('state', 'finished');
    });

    it('returns null when match not found', async () => {
      mockLoadState.mockReturnValue({
        currentMatchId: 'non-existent-match'
      });

      const chain = createSelectChain({
        singleResult: {
          data: null,
          error: { code: 'PGRST116' }
        }
      });

      supabase.from.mockReturnValue({ select: chain.select });

      const result = await checkForRecoverableMatch();

      expect(result).toEqual({ success: true, match: null });
    });

    it('handles database errors gracefully', async () => {
      mockLoadState.mockReturnValue({
        currentMatchId: 'match-123'
      });

      const chain = createSelectChain({
        singleResult: {
          data: null,
          error: { message: 'Database connection failed', code: 'PGRST001' }
        }
      });

      supabase.from.mockReturnValue({ select: chain.select });

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
    it('successfully soft deletes a match', async () => {
      const chain = createUpdateChain({ error: null });

      supabase.from.mockReturnValue({ update: chain.update });

      const result = await deleteAbandonedMatch('match-123');

      expect(result).toEqual({ success: true });
      expect(supabase.from).toHaveBeenCalledWith('match');
      expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({
        deleted_at: expect.any(String)
      }));
      expect(chain.eqId).toHaveBeenCalledWith('id', 'match-123');
      expect(chain.isDeleted).toHaveBeenCalledWith('deleted_at', null);
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

    it('handles database update errors', async () => {
      const chain = createUpdateChain({ error: { message: 'Permission denied' } });

      supabase.from.mockReturnValue({ update: chain.update });

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
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });
});
