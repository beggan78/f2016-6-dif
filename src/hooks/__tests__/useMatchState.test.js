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
      matchStartTime: null,
      view: 'config'
    });

    const { result } = renderHook(() => useMatchState());

    expect(result.current).toEqual({
      hasActiveMatch: false,
      hasUnsavedMatch: false,
      isMatchRunning: false,
      currentMatchId: null
    });
  });

  it('returns active match when currentMatchId exists', () => {
    mockUseGameState.mockReturnValue({
      currentMatchId: 'match-123',
      matchStartTime: Date.now(),
      view: 'game'
    });

    const { result } = renderHook(() => useMatchState());

    expect(result.current).toEqual({
      hasActiveMatch: true,
      hasUnsavedMatch: false,
      isMatchRunning: true,
      currentMatchId: 'match-123'
    });
  });

  it('returns unsaved match when in stats view with match ID', () => {
    mockUseGameState.mockReturnValue({
      currentMatchId: 'match-123',
      matchStartTime: Date.now(),
      view: 'stats'
    });

    const { result } = renderHook(() => useMatchState());

    expect(result.current).toEqual({
      hasActiveMatch: true,
      hasUnsavedMatch: true,
      isMatchRunning: false,
      currentMatchId: 'match-123'
    });
  });

  it('returns finished match when match ID exists but no start time', () => {
    mockUseGameState.mockReturnValue({
      currentMatchId: 'match-123',
      matchStartTime: null,
      view: 'stats'
    });

    const { result } = renderHook(() => useMatchState());

    expect(result.current).toEqual({
      hasActiveMatch: true,
      hasUnsavedMatch: true,
      isMatchRunning: false,
      currentMatchId: 'match-123'
    });
  });
});