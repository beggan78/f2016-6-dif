import { cleanupAbandonedMatches, getOrphanedMatchStats } from '../matchCleanupService';
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn()
  }
}));

const createSelectChain = response => {
  const chain = {};
  chain.select = jest.fn(() => chain);
  chain.eq = jest.fn(() => chain);
  chain.is = jest.fn(() => chain);
  chain.not = jest.fn(() => chain);
  chain.lt = jest.fn(() => Promise.resolve(response));
  return chain;
};

const createUpdateChain = response => {
  const chain = {};
  chain.update = jest.fn(() => chain);
  chain.in = jest.fn(() => Promise.resolve(response));
  return chain;
};

const createCountChain = response => {
  const chain = {};
  chain.select = jest.fn(() => chain);
  chain.eq = jest.fn(() => chain);
  chain.is = jest.fn(() => chain);
  chain.not = jest.fn(() => chain);
  chain.lt = jest.fn(() => Promise.resolve(response));
  return chain;
};

describe('matchCleanupService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('cleanupAbandonedMatches', () => {
    it('soft deletes running and finished matches when both queries succeed', async () => {
      const runningSelectChain = createSelectChain({ data: [{ id: 'match-1' }, { id: 'match-2' }], error: null });
      const runningUpdateChain = createUpdateChain({ error: null });
      const finishedSelectChain = createSelectChain({ data: [{ id: 'match-3' }], error: null });
      const finishedUpdateChain = createUpdateChain({ error: null });

      supabase.from
        .mockReturnValueOnce(runningSelectChain)
        .mockReturnValueOnce(runningUpdateChain)
        .mockReturnValueOnce(finishedSelectChain)
        .mockReturnValueOnce(finishedUpdateChain);

      const result = await cleanupAbandonedMatches();

      expect(result).toEqual({ success: true, cleanedRunning: 2, cleanedFinished: 1 });
      expect(supabase.from).toHaveBeenCalledTimes(4);
      expect(runningUpdateChain.update).toHaveBeenCalledWith(expect.objectContaining({
        deleted_at: expect.any(String)
      }), { returning: 'minimal' });
      expect(finishedUpdateChain.update).toHaveBeenCalledWith(expect.objectContaining({
        deleted_at: expect.any(String)
      }), { returning: 'minimal' });
    });

    it('handles zero matches gracefully', async () => {
      const runningSelectChain = createSelectChain({ data: [], error: null });
      const finishedSelectChain = createSelectChain({ data: [], error: null });

      supabase.from
        .mockReturnValueOnce(runningSelectChain)
        .mockReturnValueOnce(finishedSelectChain);

      const result = await cleanupAbandonedMatches();

      expect(result).toEqual({ success: true, cleanedRunning: 0, cleanedFinished: 0 });
    });

    it('returns an error when the running match cleanup fails', async () => {
      const runningSelectChain = createSelectChain({ data: null, error: { message: 'Database connection failed' } });

      supabase.from.mockReturnValueOnce(runningSelectChain);

      const result = await cleanupAbandonedMatches();

      expect(result).toEqual({
        success: false,
        cleanedRunning: 0,
        cleanedFinished: 0,
        error: 'Failed to fetch running matches: Database connection failed'
      });
      expect(console.error).toHaveBeenCalledWith(
        '❌ Failed to fetch running matches for cleanup:',
        { message: 'Database connection failed' }
      );
    });

    it('returns an error when the finished match cleanup fails', async () => {
      const runningSelectChain = createSelectChain({ data: [{ id: 'match-1' }], error: null });
      const runningUpdateChain = createUpdateChain({ error: null });
      const finishedSelectChain = createSelectChain({ data: null, error: { message: 'Permission denied' } });

      supabase.from
        .mockReturnValueOnce(runningSelectChain)
        .mockReturnValueOnce(runningUpdateChain)
        .mockReturnValueOnce(finishedSelectChain);

      const result = await cleanupAbandonedMatches();

      expect(result).toEqual({
        success: false,
        cleanedRunning: 1,
        cleanedFinished: 0,
        error: 'Failed to fetch finished matches: Permission denied'
      });
    });

    it('propagates unexpected exceptions', async () => {
      supabase.from.mockImplementation(() => {
        throw new Error('Unexpected network error');
      });

      const result = await cleanupAbandonedMatches();

      expect(result).toEqual({
        success: false,
        cleanedRunning: 0,
        cleanedFinished: 0,
        error: 'Unexpected error: Unexpected network error'
      });
      expect(console.error).toHaveBeenCalledWith(
        '❌ Exception during match cleanup:',
        expect.any(Error)
      );
    });
  });

  describe('getOrphanedMatchStats', () => {
    it('returns counts for running and finished matches', async () => {
      const runningCountChain = createCountChain({ count: 3, error: null });
      const finishedCountChain = createCountChain({ count: 7, error: null });

      supabase.from
        .mockReturnValueOnce(runningCountChain)
        .mockReturnValueOnce(finishedCountChain);

      const result = await getOrphanedMatchStats();

      expect(result).toEqual({ success: true, runningCount: 3, finishedCount: 7 });
    });

    it('returns an error when counting running matches fails', async () => {
      const runningCountChain = createCountChain({ count: null, error: { message: 'Timeout' } });

      supabase.from.mockReturnValueOnce(runningCountChain);

      const result = await getOrphanedMatchStats();

      expect(result).toEqual({
        success: false,
        runningCount: 0,
        finishedCount: 0,
        error: 'Failed to count running matches: Timeout'
      });
    });

    it('returns an error when counting finished matches fails', async () => {
      const runningCountChain = createCountChain({ count: 2, error: null });
      const finishedCountChain = createCountChain({ count: null, error: { message: 'Permission denied' } });

      supabase.from
        .mockReturnValueOnce(runningCountChain)
        .mockReturnValueOnce(finishedCountChain);

      const result = await getOrphanedMatchStats();

      expect(result).toEqual({
        success: false,
        runningCount: 2,
        finishedCount: 0,
        error: 'Failed to count finished matches: Permission denied'
      });
    });

    it('propagates unexpected exceptions when counting', async () => {
      supabase.from.mockImplementation(() => {
        throw new Error('Unexpected failure');
      });

      const result = await getOrphanedMatchStats();

      expect(result).toEqual({
        success: false,
        runningCount: 0,
        finishedCount: 0,
        error: 'Unexpected error: Unexpected failure'
      });
      expect(console.error).toHaveBeenCalledWith(
        '❌ Exception while getting orphaned match stats:',
        expect.any(Error)
      );
    });
  });
});
