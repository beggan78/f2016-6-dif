import * as opponentPrefillService from '../opponentPrefillService';
import { supabase } from '../../lib/supabase';
import { getTeamConnectors } from '../connectorService';
import { CONNECTOR_STATUS } from '../../constants/connectorProviders';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn()
  }
}));

jest.mock('../connectorService', () => ({
  getTeamConnectors: jest.fn()
}));

const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

const createUpcomingMatchChain = ({ data = [], error = null } = {}) => {
  const order = jest.fn().mockResolvedValue({ data, error });
  const lte = jest.fn(() => ({ order }));
  const gte = jest.fn(() => ({ lte }));
  const eq = jest.fn(() => ({ gte }));
  const select = jest.fn(() => ({ eq }));
  return { select, eq, gte, lte, order };
};

const createPendingMatchesChain = ({ data = [], error = null } = {}) => {
  const isNull = jest.fn().mockResolvedValue({ data, error });
  const eqState = jest.fn(() => ({ is: isNull }));
  const eqTeam = jest.fn(() => ({ eq: eqState }));
  const select = jest.fn(() => ({ eq: eqTeam }));
  return { select, eqTeam, eqState, isNull };
};

const createUpcomingChainForMap = (dataMap) => {
  const order = jest.fn().mockResolvedValue({ data: [], error: null });
  const lte = jest.fn(() => ({ order }));
  const gte = jest.fn(() => ({ lte }));
  const eq = jest.fn((column, value) => {
    if (column === 'connector_id') {
      const rows = dataMap.get(value) || [];
      order.mockResolvedValue({ data: rows, error: null });
    }
    return { gte };
  });
  const select = jest.fn(() => ({ eq }));
  return { select };
};

describe('opponentPrefillService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
    mockConsoleWarn.mockRestore();
  });

  describe('getUpcomingMatchesWithinWindow', () => {
    it('throws when connector id missing', async () => {
      await expect(opponentPrefillService.getUpcomingMatchesWithinWindow()).rejects.toThrow(
        'Connector ID is required'
      );
    });

    it('returns rows when supabase succeeds', async () => {
      const chain = createUpcomingMatchChain({
        data: [{ opponent: 'Alpha', match_date: '2024-03-10' }]
      });
      supabase.from.mockReturnValue({ select: chain.select });

      const result = await opponentPrefillService.getUpcomingMatchesWithinWindow('connector-1', 2);

      expect(supabase.from).toHaveBeenCalledWith('upcoming_match');
      expect(chain.select).toHaveBeenCalledWith('opponent, match_date');
      expect(chain.eq).toHaveBeenCalledWith('connector_id', 'connector-1');
      expect(chain.gte).toHaveBeenCalledWith('match_date', expect.any(String));
      expect(chain.lte).toHaveBeenCalledWith('match_date', expect.any(String));
      expect(chain.order).toHaveBeenCalledWith('match_date', { ascending: true });
      expect(result).toEqual([{ opponent: 'Alpha', match_date: '2024-03-10' }]);
    });

    it('throws on supabase error', async () => {
      const chain = createUpcomingMatchChain({ error: { message: 'db error' } });
      supabase.from.mockReturnValue({ select: chain.select });

      await expect(opponentPrefillService.getUpcomingMatchesWithinWindow('connector-1')).rejects.toThrow(
        'Failed to load upcoming matches'
      );
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to fetch upcoming matches for connector:',
        { message: 'db error' }
      );
    });
  });

  describe('getPendingMatchesForTeam', () => {
    it('throws when team id missing', async () => {
      await expect(opponentPrefillService.getPendingMatchesForTeam()).rejects.toThrow(
        'Team ID is required'
      );
    });

    it('returns pending matches', async () => {
      const chain = createPendingMatchesChain({
        data: [{ opponent: 'Beta' }]
      });
      supabase.from.mockReturnValue({ select: chain.select });

      const result = await opponentPrefillService.getPendingMatchesForTeam('team-1');

      expect(supabase.from).toHaveBeenCalledWith('match');
      expect(chain.select).toHaveBeenCalledWith('opponent');
      expect(chain.eqTeam).toHaveBeenCalledWith('team_id', 'team-1');
      expect(chain.eqState).toHaveBeenCalledWith('state', 'pending');
      expect(chain.isNull).toHaveBeenCalledWith('deleted_at', null);
      expect(result).toEqual([{ opponent: 'Beta' }]);
    });

    it('throws on supabase error', async () => {
      const chain = createPendingMatchesChain({ error: { message: 'nope' } });
      supabase.from.mockReturnValue({ select: chain.select });

      await expect(opponentPrefillService.getPendingMatchesForTeam('team-1')).rejects.toThrow(
        'Failed to load pending matches'
      );
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to fetch pending matches for team:',
        { message: 'nope' }
      );
    });
  });

  describe('suggestUpcomingOpponent', () => {
    it('returns missing team reason when no team id', async () => {
      const result = await opponentPrefillService.suggestUpcomingOpponent();
      expect(result).toEqual({ opponent: null, reason: 'missing-team' });
    });

    it('returns reason when no active connectors', async () => {
      getTeamConnectors.mockResolvedValue([{ id: '1', status: 'error' }]);
      const result = await opponentPrefillService.suggestUpcomingOpponent('team-1');
      expect(result).toEqual({ opponent: null, reason: 'no-active-connector' });
    });

    it('returns null when no eligible upcoming matches', async () => {
      getTeamConnectors.mockResolvedValue([
        { id: '1', status: CONNECTOR_STATUS.CONNECTED }
      ]);

      const pendingChain = createPendingMatchesChain({ data: [] });
      const upcomingMap = new Map([['1', []]]);

      supabase.from.mockImplementation((table) => {
        if (table === 'match') {
          return { select: pendingChain.select };
        }
        if (table === 'upcoming_match') {
          return { select: createUpcomingChainForMap(upcomingMap).select };
        }
        return { select: jest.fn() };
      });

      const result = await opponentPrefillService.suggestUpcomingOpponent('team-1');

      expect(result).toEqual({ opponent: null, reason: 'no-eligible-upcoming' });
    });

    it('returns earliest eligible opponent', async () => {
      getTeamConnectors.mockResolvedValue([
        { id: '1', status: CONNECTOR_STATUS.CONNECTED },
        { id: '2', status: CONNECTOR_STATUS.CONNECTED }
      ]);

      const pendingChain = createPendingMatchesChain({ data: [{ opponent: 'Taken FC' }] });
      const upcomingMap = new Map([
        ['1', [
          { opponent: 'Taken FC', match_date: '2024-03-02' },
          { opponent: 'Alpha FC', match_date: '2024-03-04' }
        ]],
        ['2', [
          { opponent: 'Beta United', match_date: '2024-03-03' }
        ]]
      ]);

      supabase.from.mockImplementation((table) => {
        if (table === 'match') {
          return { select: pendingChain.select };
        }
        if (table === 'upcoming_match') {
          return { select: createUpcomingChainForMap(upcomingMap).select };
        }
        return { select: jest.fn() };
      });

      const result = await opponentPrefillService.suggestUpcomingOpponent('team-1', { lookaheadDays: 4 });

      expect(result).toEqual({
        opponent: 'Beta United',
        connectorId: '2',
        matchDate: '2024-03-03',
        reason: 'matched'
      });
    });

    it('returns error reason when helper throws', async () => {
      getTeamConnectors.mockResolvedValue([
        { id: '1', status: CONNECTOR_STATUS.CONNECTED }
      ]);

      const pendingChain = createPendingMatchesChain({ error: { message: 'boom' } });

      supabase.from.mockImplementation((table) => {
        if (table === 'match') {
          return { select: pendingChain.select };
        }
        if (table === 'upcoming_match') {
          return { select: createUpcomingChainForMap(new Map()).select };
        }
        return { select: jest.fn() };
      });

      const result = await opponentPrefillService.suggestUpcomingOpponent('team-1');

      expect(result.reason).toBe('error');
      expect(result.opponent).toBeNull();
    });
  });
});
