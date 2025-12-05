import { renderHook } from '@testing-library/react';
import { useMatchState } from '../useMatchState';
import { useGameState } from '../useGameState';

// Mock the useGameState hook
jest.mock('../useGameState');
const mockUseGameState = useGameState;

describe('useMatchState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns no active match when currentMatchId is null', () => {
    mockUseGameState.mockReturnValue({
      currentMatchId: null,
      matchState: 'not_started'
    });

    const { result } = renderHook(() => useMatchState());

    expect(result.current).toEqual({
      hasActiveMatch: false,
      isMatchRunning: false,
      currentMatchId: null,
      matchState: 'not_started'
    });
  });

  it('returns active running match when currentMatchId exists and state is running', () => {
    mockUseGameState.mockReturnValue({
      currentMatchId: 'match-123',
      matchState: 'running'
    });

    const { result } = renderHook(() => useMatchState());

    expect(result.current).toEqual({
      hasActiveMatch: true,
      isMatchRunning: true,
      currentMatchId: 'match-123',
      matchState: 'running'
    });
  });

  it('treats finished matches as inactive for abandonment guard', () => {
    mockUseGameState.mockReturnValue({
      currentMatchId: 'match-123',
      matchState: 'finished'
    });

    const { result } = renderHook(() => useMatchState());

    expect(result.current).toEqual({
      hasActiveMatch: false,
      isMatchRunning: false,
      currentMatchId: 'match-123',
      matchState: 'finished'
    });
  });

  it('returns no active match when match ID exists but state is not_started', () => {
    mockUseGameState.mockReturnValue({
      currentMatchId: 'match-123',
      matchState: 'not_started'
    });

    const { result } = renderHook(() => useMatchState());

    expect(result.current).toEqual({
      hasActiveMatch: false,
      isMatchRunning: false,
      currentMatchId: 'match-123',
      matchState: 'not_started'
    });
  });
});
