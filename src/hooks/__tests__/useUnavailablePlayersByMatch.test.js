import { renderHook, act } from '@testing-library/react';
import { useUnavailablePlayersByMatch } from '../useUnavailablePlayersByMatch';
import { usePersistentState } from '../usePersistentState';
import { areSelectionMapsEqual } from '../../utils/comparisonUtils';

jest.mock('../usePersistentState');

jest.mock('../../utils/comparisonUtils', () => ({
  areSelectionMapsEqual: jest.fn()
}));

describe('useUnavailablePlayersByMatch', () => {
  let currentUnavailableState;
  let setUnavailableState;

  beforeEach(() => {
    jest.clearAllMocks();
    currentUnavailableState = null;
    setUnavailableState = jest.fn();
    usePersistentState.mockImplementation(() => [currentUnavailableState, setUnavailableState]);
  });

  it('returns stored matches when available', () => {
    currentUnavailableState = {
      matches: { match1: ['p1', 'p2'] }
    };

    const { result } = renderHook(() => useUnavailablePlayersByMatch('team-1'));

    expect(result.current.unavailablePlayersByMatch).toEqual({ match1: ['p1', 'p2'] });
  });

  it('falls back to empty object when matches are invalid', () => {
    currentUnavailableState = { matches: null };

    const { result } = renderHook(() => useUnavailablePlayersByMatch('team-1'));

    expect(result.current.unavailablePlayersByMatch).toEqual({});
  });

  it('updates unavailable players map when changed', () => {
    areSelectionMapsEqual.mockReturnValue(false);
    currentUnavailableState = { matches: {} };

    const { result } = renderHook(() => useUnavailablePlayersByMatch('team-1'));
    setUnavailableState.mockClear();

    act(() => {
      result.current.setUnavailablePlayersByMatch({ match1: ['p1'] });
    });

    const updater = setUnavailableState.mock.calls[0][0];
    const nextState = updater({ matches: {}, teamId: null });

    expect(nextState).toEqual({
      matches: { match1: ['p1'] },
      teamId: 'team-1'
    });
  });

  it('skips update when maps are equal', () => {
    areSelectionMapsEqual.mockReturnValue(true);
    currentUnavailableState = { matches: { match1: ['p1'] } };

    const { result } = renderHook(() => useUnavailablePlayersByMatch('team-1'));
    setUnavailableState.mockClear();

    act(() => {
      result.current.setUnavailablePlayersByMatch({ match1: ['p1'] });
    });

    const updater = setUnavailableState.mock.calls[0][0];
    const prevState = { matches: { match1: ['p1'] }, teamId: 'team-1' };

    expect(updater(prevState)).toBe(prevState);
  });
});
