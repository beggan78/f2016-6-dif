import { cleanupAbandonedMatches, getOrphanedMatchStats } from '../matchCleanupService';
import { supabase } from '../../lib/supabase';

// Mock the supabase client
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      delete: jest.fn(() => ({
        eq: jest.fn(() => ({
          lt: jest.fn(() => ({
            select: jest.fn()
          }))
        }))
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          lt: jest.fn()
        }))
      }))
    }))
  }
}));

describe('matchCleanupService', () => {
  let mockFrom;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the mock chain for each test
    mockFrom = {
      delete: jest.fn(() => ({
        eq: jest.fn(() => ({
          lt: jest.fn(() => ({
            select: jest.fn()
          }))
        }))
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          lt: jest.fn()
        }))
      }))
    };
    
    supabase.from.mockReturnValue(mockFrom);
    
    // Mock console methods for clean test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('cleanupAbandonedMatches', () => {
    it('successfully cleans up running and finished matches', async () => {
      // Mock successful cleanup responses
      supabase.from
        .mockReturnValueOnce({
          delete: jest.fn(() => ({
            eq: jest.fn(() => ({
              lt: jest.fn(() => ({
                select: jest.fn().mockResolvedValue({
                  data: [{ id: 'match-1' }, { id: 'match-2' }],
                  error: null
                })
              }))
            }))
          }))
        })
        .mockReturnValueOnce({
          delete: jest.fn(() => ({
            eq: jest.fn(() => ({
              lt: jest.fn(() => ({
                select: jest.fn().mockResolvedValue({
                  data: [{ id: 'match-3' }],
                  error: null
                })
              }))
            }))
          }))
        });

      const result = await cleanupAbandonedMatches();

      expect(result).toEqual({
        success: true,
        cleanedRunning: 2,
        cleanedFinished: 1
      });

      expect(supabase.from).toHaveBeenCalledTimes(2);
      expect(supabase.from).toHaveBeenCalledWith('match');
    });

    it('handles zero matches to cleanup', async () => {
      // Mock empty cleanup responses
      const mockDeleteChain = {
        delete: jest.fn(() => ({
          eq: jest.fn(() => ({
            lt: jest.fn(() => ({
              select: jest.fn().mockResolvedValue({
                data: [],
                error: null
              })
            }))
          }))
        }))
      };

      supabase.from.mockReturnValue(mockDeleteChain);

      const result = await cleanupAbandonedMatches();

      expect(result).toEqual({
        success: true,
        cleanedRunning: 0,
        cleanedFinished: 0
      });
    });

    it('handles error cleaning up running matches', async () => {
      // Mock error response for running matches
      supabase.from.mockReturnValueOnce({
        delete: jest.fn(() => ({
          eq: jest.fn(() => ({
            lt: jest.fn(() => ({
              select: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database connection failed' }
              })
            }))
          }))
        }))
      });

      const result = await cleanupAbandonedMatches();

      expect(result).toEqual({
        success: false,
        cleanedRunning: 0,
        cleanedFinished: 0,
        error: 'Failed to cleanup running matches: Database connection failed'
      });

      expect(console.error).toHaveBeenCalledWith(
        '❌ Failed to cleanup running matches:',
        { message: 'Database connection failed' }
      );
    });

    it('handles error cleaning up finished matches but succeeds with running', async () => {
      // Mock successful running cleanup but failed finished cleanup
      supabase.from
        .mockReturnValueOnce({
          delete: jest.fn(() => ({
            eq: jest.fn(() => ({
              lt: jest.fn(() => ({
                select: jest.fn().mockResolvedValue({
                  data: [{ id: 'match-1' }],
                  error: null
                })
              }))
            }))
          }))
        })
        .mockReturnValueOnce({
          delete: jest.fn(() => ({
            eq: jest.fn(() => ({
              lt: jest.fn(() => ({
                select: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Permission denied' }
                })
              }))
            }))
          }))
        });

      const result = await cleanupAbandonedMatches();

      expect(result).toEqual({
        success: false,
        cleanedRunning: 1,
        cleanedFinished: 0,
        error: 'Failed to cleanup finished matches: Permission denied'
      });
    });

    it('handles unexpected exceptions', async () => {
      // Mock an exception during the operation
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

    it('handles cleanup with different time periods', async () => {
      // This test verifies the service works with the date calculations
      const mockDeleteChain = {
        delete: jest.fn(() => ({
          eq: jest.fn(() => ({
            lt: jest.fn(() => ({
              select: jest.fn().mockResolvedValue({
                data: [],
                error: null
              })
            }))
          }))
        }))
      };

      supabase.from.mockReturnValue(mockDeleteChain);

      const result = await cleanupAbandonedMatches();

      expect(result.success).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('match');
    });
  });

  describe('getOrphanedMatchStats', () => {
    it('successfully gets stats for orphaned matches', async () => {
      // Mock count responses
      const runningSelectChain = mockFrom.select().eq().lt;
      const finishedSelectChain = mockFrom.select().eq().lt;

      // Mock the select chain to return count responses
      supabase.from
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              lt: jest.fn().mockResolvedValueOnce({
                count: 3,
                error: null
              })
            }))
          }))
        })
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              lt: jest.fn().mockResolvedValueOnce({
                count: 1,
                error: null
              })
            }))
          }))
        });

      const result = await getOrphanedMatchStats();

      expect(result).toEqual({
        success: true,
        runningCount: 3,
        finishedCount: 1
      });
    });

    it('handles error counting running matches', async () => {
      supabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            lt: jest.fn().mockResolvedValueOnce({
              count: null,
              error: { message: 'Count query failed' }
            })
          }))
        }))
      });

      const result = await getOrphanedMatchStats();

      expect(result).toEqual({
        success: false,
        runningCount: 0,
        finishedCount: 0,
        error: 'Failed to count running matches: Count query failed'
      });
    });

    it('handles error counting finished matches', async () => {
      supabase.from
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              lt: jest.fn().mockResolvedValueOnce({
                count: 2,
                error: null
              })
            }))
          }))
        })
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              lt: jest.fn().mockResolvedValueOnce({
                count: null,
                error: { message: 'Finished count failed' }
              })
            }))
          }))
        });

      const result = await getOrphanedMatchStats();

      expect(result).toEqual({
        success: false,
        runningCount: 2,
        finishedCount: 0,
        error: 'Failed to count finished matches: Finished count failed'
      });
    });

    it('handles null counts gracefully', async () => {
      supabase.from
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              lt: jest.fn().mockResolvedValueOnce({
                count: null,
                error: null
              })
            }))
          }))
        })
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              lt: jest.fn().mockResolvedValueOnce({
                count: null,
                error: null
              })
            }))
          }))
        });

      const result = await getOrphanedMatchStats();

      expect(result).toEqual({
        success: true,
        runningCount: 0,
        finishedCount: 0
      });
    });
  });
});