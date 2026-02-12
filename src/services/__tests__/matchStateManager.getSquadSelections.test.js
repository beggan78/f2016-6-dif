/**
 * Tests for getSquadSelectionsForMatches service function
 */

import { getSquadSelectionsForMatches } from '../matchStateManager';
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn()
  }
}));

const createSelectChain = ({ data = null, error = null } = {}) => {
  const isNull = jest.fn().mockResolvedValue({ data, error });
  const eq = jest.fn(() => ({ is: isNull }));
  const inFn = jest.fn(() => ({ eq }));
  const select = jest.fn(() => ({ in: inFn }));
  return { select, in: inFn, eq, is: isNull };
};

describe('getSquadSelectionsForMatches', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty selections for empty input', async () => {
    const result = await getSquadSelectionsForMatches([]);
    expect(result).toEqual({ success: true, selections: {} });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('should return empty selections for null input', async () => {
    const result = await getSquadSelectionsForMatches(null);
    expect(result).toEqual({ success: true, selections: {} });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('should return empty selections for undefined input', async () => {
    const result = await getSquadSelectionsForMatches(undefined);
    expect(result).toEqual({ success: true, selections: {} });
  });

  it('should extract squadSelection from initial_config', async () => {
    const chain = createSelectChain({
      data: [
        {
          id: 'match-1',
          initial_config: { squadSelection: ['p1', 'p2', 'p3'] }
        },
        {
          id: 'match-2',
          initial_config: { squadSelection: ['p4', 'p5'] }
        }
      ]
    });
    supabase.from.mockReturnValue(chain);

    const result = await getSquadSelectionsForMatches(['match-1', 'match-2']);

    expect(result.success).toBe(true);
    expect(result.selections).toEqual({
      'match-1': ['p1', 'p2', 'p3'],
      'match-2': ['p4', 'p5']
    });
    expect(supabase.from).toHaveBeenCalledWith('match');
    expect(chain.select).toHaveBeenCalledWith('id, initial_config');
    expect(chain.in).toHaveBeenCalledWith('id', ['match-1', 'match-2']);
    expect(chain.eq).toHaveBeenCalledWith('state', 'pending');
    expect(chain.is).toHaveBeenCalledWith('deleted_at', null);
  });

  it('should skip matches with no initial_config', async () => {
    const chain = createSelectChain({
      data: [
        { id: 'match-1', initial_config: null },
        { id: 'match-2', initial_config: { squadSelection: ['p1'] } }
      ]
    });
    supabase.from.mockReturnValue(chain);

    const result = await getSquadSelectionsForMatches(['match-1', 'match-2']);

    expect(result.success).toBe(true);
    expect(result.selections).toEqual({
      'match-2': ['p1']
    });
  });

  it('should skip matches with empty squadSelection array', async () => {
    const chain = createSelectChain({
      data: [
        { id: 'match-1', initial_config: { squadSelection: [] } }
      ]
    });
    supabase.from.mockReturnValue(chain);

    const result = await getSquadSelectionsForMatches(['match-1']);

    expect(result.success).toBe(true);
    expect(result.selections).toEqual({});
  });

  it('should skip matches with non-array squadSelection', async () => {
    const chain = createSelectChain({
      data: [
        { id: 'match-1', initial_config: { squadSelection: 'not-an-array' } }
      ]
    });
    supabase.from.mockReturnValue(chain);

    const result = await getSquadSelectionsForMatches(['match-1']);

    expect(result.success).toBe(true);
    expect(result.selections).toEqual({});
  });

  it('should handle database errors', async () => {
    const chain = createSelectChain({
      error: { message: 'DB connection failed' }
    });
    supabase.from.mockReturnValue(chain);

    const result = await getSquadSelectionsForMatches(['match-1']);

    expect(result.success).toBe(false);
    expect(result.error).toContain('DB connection failed');
  });

  it('should handle unexpected exceptions', async () => {
    supabase.from.mockImplementation(() => {
      throw new Error('Network failure');
    });

    const result = await getSquadSelectionsForMatches(['match-1']);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Network failure');
  });
});
