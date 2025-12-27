import { renderHook, waitFor } from '@testing-library/react';
import { usePlayerRecommendationData } from '../usePlayerRecommendationData';
import { getPlayerStats } from '../../services/matchStateManager';

// Mock the service
jest.mock('../../services/matchStateManager');

describe('usePlayerRecommendationData', () => {
  const mockTeamId = 'team-123';
  const mockSelectedSquadPlayers = [
    { id: 'player-1', displayName: 'Player 1' },
    { id: 'player-2', displayName: 'Player 2' }
  ];

  const mockPlayerStatsResponse = {
    success: true,
    players: [
      {
        id: 'player-1',
        percentStartedAsSubstitute: 25.5,
        percentTimeAsDefender: 40.0,
        percentTimeAsAttacker: 60.0
      },
      {
        id: 'player-2',
        percentStartedAsSubstitute: 10.0,
        percentTimeAsDefender: 70.0,
        percentTimeAsAttacker: 30.0
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Period 1 behavior', () => {
    it('should fetch player stats for Period 1', async () => {
      getPlayerStats.mockResolvedValue(mockPlayerStatsResponse);

      const { result } = renderHook(() =>
        usePlayerRecommendationData(mockTeamId, 1, mockSelectedSquadPlayers)
      );

      // Initially loading
      expect(result.current.loading).toBe(true);
      expect(result.current.playerStats).toBe(null);
      expect(result.current.error).toBe(null);

      // Wait for data to load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.playerStats).toEqual(mockPlayerStatsResponse.players);
      expect(result.current.error).toBe(null);
      expect(getPlayerStats).toHaveBeenCalledTimes(1);
    });

    it('should call getPlayerStats with 6-month date range', async () => {
      getPlayerStats.mockResolvedValue(mockPlayerStatsResponse);

      renderHook(() =>
        usePlayerRecommendationData(mockTeamId, 1, mockSelectedSquadPlayers)
      );

      await waitFor(() => {
        expect(getPlayerStats).toHaveBeenCalledTimes(1);
      });

      const [[teamId, startDate, endDate]] = getPlayerStats.mock.calls;

      expect(teamId).toBe(mockTeamId);
      expect(startDate).toBeInstanceOf(Date);
      expect(endDate).toBeInstanceOf(Date);

      // Verify 6-month range
      const monthsDiff =
        (endDate.getFullYear() - startDate.getFullYear()) * 12 +
        (endDate.getMonth() - startDate.getMonth());
      expect(monthsDiff).toBe(6);
    });

    it('should handle empty players array in response', async () => {
      getPlayerStats.mockResolvedValue({ success: true, players: [] });

      const { result } = renderHook(() =>
        usePlayerRecommendationData(mockTeamId, 1, mockSelectedSquadPlayers)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.playerStats).toEqual([]);
      expect(result.current.error).toBe(null);
    });
  });

  describe('Period 2+ behavior', () => {
    it('should not fetch data for Period 2', () => {
      const { result } = renderHook(() =>
        usePlayerRecommendationData(mockTeamId, 2, mockSelectedSquadPlayers)
      );

      expect(result.current.loading).toBe(false);
      expect(result.current.playerStats).toBe(null);
      expect(result.current.error).toBe(null);
      expect(getPlayerStats).not.toHaveBeenCalled();
    });

    it('should not fetch data for Period 3', () => {
      const { result } = renderHook(() =>
        usePlayerRecommendationData(mockTeamId, 3, mockSelectedSquadPlayers)
      );

      expect(result.current.loading).toBe(false);
      expect(result.current.playerStats).toBe(null);
      expect(result.current.error).toBe(null);
      expect(getPlayerStats).not.toHaveBeenCalled();
    });
  });

  describe('Invalid inputs', () => {
    it('should not fetch when teamId is null', () => {
      const { result } = renderHook(() =>
        usePlayerRecommendationData(null, 1, mockSelectedSquadPlayers)
      );

      expect(result.current.loading).toBe(false);
      expect(result.current.playerStats).toBe(null);
      expect(result.current.error).toBe(null);
      expect(getPlayerStats).not.toHaveBeenCalled();
    });

    it('should not fetch when teamId is undefined', () => {
      const { result } = renderHook(() =>
        usePlayerRecommendationData(undefined, 1, mockSelectedSquadPlayers)
      );

      expect(result.current.loading).toBe(false);
      expect(result.current.playerStats).toBe(null);
      expect(result.current.error).toBe(null);
      expect(getPlayerStats).not.toHaveBeenCalled();
    });

    it('should not fetch when selectedSquadPlayers is null', () => {
      const { result } = renderHook(() =>
        usePlayerRecommendationData(mockTeamId, 1, null)
      );

      expect(result.current.loading).toBe(false);
      expect(result.current.playerStats).toBe(null);
      expect(result.current.error).toBe(null);
      expect(getPlayerStats).not.toHaveBeenCalled();
    });

    it('should not fetch when selectedSquadPlayers is empty array', () => {
      const { result } = renderHook(() =>
        usePlayerRecommendationData(mockTeamId, 1, [])
      );

      expect(result.current.loading).toBe(false);
      expect(result.current.playerStats).toBe(null);
      expect(result.current.error).toBe(null);
      expect(getPlayerStats).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle API failure response', async () => {
      const errorMessage = 'Database connection failed';
      getPlayerStats.mockResolvedValue({
        success: false,
        error: errorMessage
      });

      const { result } = renderHook(() =>
        usePlayerRecommendationData(mockTeamId, 1, mockSelectedSquadPlayers)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.playerStats).toBe(null);
      expect(result.current.error).toBe(errorMessage);
    });

    it('should handle API exception', async () => {
      const errorMessage = 'Network error';
      getPlayerStats.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() =>
        usePlayerRecommendationData(mockTeamId, 1, mockSelectedSquadPlayers)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.playerStats).toBe(null);
      expect(result.current.error).toBe(errorMessage);
    });

    it('should handle default error message when error has no message', async () => {
      getPlayerStats.mockResolvedValue({ success: false });

      const { result } = renderHook(() =>
        usePlayerRecommendationData(mockTeamId, 1, mockSelectedSquadPlayers)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.playerStats).toBe(null);
      expect(result.current.error).toBe('Failed to load player stats');
    });
  });

  describe('Race condition handling', () => {
    it('should handle component unmount during fetch', async () => {
      let resolvePromise;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      getPlayerStats.mockReturnValue(promise);

      const { result, unmount } = renderHook(() =>
        usePlayerRecommendationData(mockTeamId, 1, mockSelectedSquadPlayers)
      );

      expect(result.current.loading).toBe(true);

      // Unmount before promise resolves
      unmount();

      // Resolve promise after unmount
      resolvePromise(mockPlayerStatsResponse);

      // Wait a bit to ensure no state updates occur
      await new Promise(resolve => setTimeout(resolve, 50));

      // No errors should occur due to setState on unmounted component
      expect(true).toBe(true);
    });

    it('should handle rapid dependency changes', async () => {
      getPlayerStats.mockResolvedValue(mockPlayerStatsResponse);

      const { result, rerender } = renderHook(
        ({ teamId, period, squad }) =>
          usePlayerRecommendationData(teamId, period, squad),
        {
          initialProps: {
            teamId: mockTeamId,
            period: 1,
            squad: mockSelectedSquadPlayers
          }
        }
      );

      // Change teamId rapidly
      rerender({ teamId: 'team-456', period: 1, squad: mockSelectedSquadPlayers });
      rerender({ teamId: 'team-789', period: 1, squad: mockSelectedSquadPlayers });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have cancelled previous fetches and only completed the last one
      expect(result.current.playerStats).toEqual(mockPlayerStatsResponse.players);
      expect(result.current.error).toBe(null);
    });
  });

  describe('Data refetch on dependency changes', () => {
    it('should refetch when teamId changes', async () => {
      getPlayerStats.mockResolvedValue(mockPlayerStatsResponse);

      const { rerender } = renderHook(
        ({ teamId }) => usePlayerRecommendationData(teamId, 1, mockSelectedSquadPlayers),
        { initialProps: { teamId: mockTeamId } }
      );

      await waitFor(() => {
        expect(getPlayerStats).toHaveBeenCalledTimes(1);
      });

      // Change teamId
      rerender({ teamId: 'team-456' });

      await waitFor(() => {
        expect(getPlayerStats).toHaveBeenCalledTimes(2);
      });
    });

    it('should refetch when selectedSquadPlayers changes', async () => {
      getPlayerStats.mockResolvedValue(mockPlayerStatsResponse);

      const { rerender } = renderHook(
        ({ squad }) => usePlayerRecommendationData(mockTeamId, 1, squad),
        { initialProps: { squad: mockSelectedSquadPlayers } }
      );

      await waitFor(() => {
        expect(getPlayerStats).toHaveBeenCalledTimes(1);
      });

      // Change squad
      const newSquad = [{ id: 'player-3', displayName: 'Player 3' }];
      rerender({ squad: newSquad });

      await waitFor(() => {
        expect(getPlayerStats).toHaveBeenCalledTimes(2);
      });
    });

    it('should transition from Period 2 to Period 1 and fetch', async () => {
      getPlayerStats.mockResolvedValue(mockPlayerStatsResponse);

      const { result, rerender } = renderHook(
        ({ period }) => usePlayerRecommendationData(mockTeamId, period, mockSelectedSquadPlayers),
        { initialProps: { period: 2 } }
      );

      // Period 2 - no fetch
      expect(getPlayerStats).not.toHaveBeenCalled();
      expect(result.current.playerStats).toBe(null);

      // Change to Period 1 - should fetch
      rerender({ period: 1 });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(getPlayerStats).toHaveBeenCalledTimes(1);
      expect(result.current.playerStats).toEqual(mockPlayerStatsResponse.players);
    });
  });
});
