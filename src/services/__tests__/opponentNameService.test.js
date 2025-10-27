import { getOpponentNameHistory } from '../opponentNameService';
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn()
  }
}));

const createSupabaseChain = ({ data = [], error = null } = {}) => {
  const limit = jest.fn(() => Promise.resolve({ data, error }));
  const order = jest.fn(() => ({ limit }));
  const isDeleted = jest.fn(() => ({ order }));
  const neqOpponent = jest.fn(() => ({ is: isDeleted }));
  const notOpponent = jest.fn(() => ({ neq: neqOpponent }));
  const eqTeam = jest.fn(() => ({ not: notOpponent }));
  const select = jest.fn(() => ({ eq: eqTeam }));

  supabase.from.mockReturnValue({ select });

  return {
    select,
    eqTeam,
    notOpponent,
    neqOpponent,
    isDeleted,
    order,
    limit
  };
};

describe('getOpponentNameHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty names when team id is missing', async () => {
    const result = await getOpponentNameHistory(null);

    expect(result).toEqual({
      success: true,
      names: []
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('fetches unique opponent names ordered by most recent', async () => {
    const chain = createSupabaseChain({
      data: [
        { opponent: 'Alpha FC', started_at: '2024-01-03T10:00:00Z' },
        { opponent: ' beta united ', started_at: '2024-01-02T10:00:00Z' },
        { opponent: 'ALPHA FC', started_at: '2024-01-01T10:00:00Z' },
        { opponent: '', started_at: '2023-12-31T10:00:00Z' },
        { opponent: null, started_at: '2023-12-30T10:00:00Z' }
      ]
    });

    const result = await getOpponentNameHistory('team-1', { limit: 50 });

    expect(supabase.from).toHaveBeenCalledWith('match');
    expect(chain.select).toHaveBeenCalledWith('opponent, started_at');
    expect(chain.eqTeam).toHaveBeenCalledWith('team_id', 'team-1');
    expect(chain.notOpponent).toHaveBeenCalledWith('opponent', 'is', null);
    expect(chain.neqOpponent).toHaveBeenCalledWith('opponent', '');
    expect(chain.isDeleted).toHaveBeenCalledWith('deleted_at', null);
    expect(chain.order).toHaveBeenCalledWith('started_at', { ascending: false });
    expect(chain.limit).toHaveBeenCalledWith(50);

    expect(result).toEqual({
      success: true,
      names: ['Alpha FC', 'beta united']
    });
  });

  it('returns an error result when supabase returns an error', async () => {
    const chain = createSupabaseChain({
      data: null,
      error: { message: 'Database error' }
    });

    const result = await getOpponentNameHistory('team-1');

    expect(chain.limit).toHaveBeenCalledWith(100);
    expect(result).toEqual({
      success: false,
      names: [],
      error: 'Failed to load opponent history.'
    });
  });

  it('returns an error result when an exception is thrown', async () => {
    const limit = jest.fn(() => {
      throw new Error('Unexpected failure');
    });
    const order = jest.fn(() => ({ limit }));
    const isDeleted = jest.fn(() => ({ order }));
    const neqOpponent = jest.fn(() => ({ is: isDeleted }));
    const notOpponent = jest.fn(() => ({ neq: neqOpponent }));
    const eqTeam = jest.fn(() => ({ not: notOpponent }));
    const select = jest.fn(() => ({ eq: eqTeam }));

    supabase.from.mockReturnValue({ select });

    const result = await getOpponentNameHistory('team-1');

    expect(result.success).toBe(false);
    expect(result.names).toEqual([]);
    expect(result.error).toBe('Unexpected error loading opponent history.');
  });
});
