import { renderHook, act } from '@testing-library/react';
import { useAutoSelectPreferences } from '../useAutoSelectPreferences';
import { usePersistentState } from '../usePersistentState';
import { areStatusMapsEqual } from '../../utils/comparisonUtils';
import { AUTO_SELECT_STRATEGY } from '../../constants/planMatchesConstants';

jest.mock('../usePersistentState');

jest.mock('../../utils/comparisonUtils', () => ({
  areStatusMapsEqual: jest.fn()
}));

describe('useAutoSelectPreferences', () => {
  let currentPreferences;
  let setPreferences;

  beforeEach(() => {
    jest.clearAllMocks();
    currentPreferences = null;
    setPreferences = jest.fn();
    usePersistentState.mockImplementation(() => [currentPreferences, setPreferences]);
  });

  it('returns default settings when stored values are invalid', () => {
    currentPreferences = {
      ensureCoverage: 'yes',
      metric: 'invalid',
      targetCounts: null
    };

    const { result } = renderHook(() => useAutoSelectPreferences('team-1'));

    expect(result.current.autoSelectSettings).toEqual({
      ensureCoverage: true,
      metric: AUTO_SELECT_STRATEGY.PRACTICES
    });
    expect(result.current.targetCounts).toEqual({});
  });

  it('returns stored settings when valid', () => {
    currentPreferences = {
      ensureCoverage: false,
      metric: AUTO_SELECT_STRATEGY.ATTENDANCE,
      targetCounts: { match1: 5 }
    };

    const { result } = renderHook(() => useAutoSelectPreferences('team-1'));

    expect(result.current.autoSelectSettings).toEqual({
      ensureCoverage: false,
      metric: AUTO_SELECT_STRATEGY.ATTENDANCE
    });
    expect(result.current.targetCounts).toEqual({ match1: 5 });
  });

  it('updates auto select settings via updater function', () => {
    currentPreferences = {
      ensureCoverage: true,
      metric: AUTO_SELECT_STRATEGY.PRACTICES,
      targetCounts: { match1: 2 }
    };

    const { result } = renderHook(() => useAutoSelectPreferences('team-1'));
    setPreferences.mockClear();

    act(() => {
      result.current.setAutoSelectSettings(() => ({
        ensureCoverage: false,
        metric: AUTO_SELECT_STRATEGY.ATTENDANCE
      }));
    });

    const updater = setPreferences.mock.calls[0][0];
    const nextState = updater(currentPreferences);

    expect(nextState).toEqual({
      ...currentPreferences,
      teamId: 'team-1',
      ensureCoverage: false,
      metric: AUTO_SELECT_STRATEGY.ATTENDANCE
    });
  });

  it('skips auto select settings update when unchanged', () => {
    currentPreferences = {
      ensureCoverage: true,
      metric: AUTO_SELECT_STRATEGY.PRACTICES,
      targetCounts: {}
    };

    const { result } = renderHook(() => useAutoSelectPreferences('team-1'));
    setPreferences.mockClear();

    act(() => {
      result.current.setAutoSelectSettings({
        ensureCoverage: true,
        metric: AUTO_SELECT_STRATEGY.PRACTICES
      });
    });

    const updater = setPreferences.mock.calls[0][0];
    expect(updater(currentPreferences)).toBe(currentPreferences);
  });

  it('updates targetCounts when changed', () => {
    areStatusMapsEqual.mockReturnValue(false);
    currentPreferences = {
      ensureCoverage: true,
      metric: AUTO_SELECT_STRATEGY.PRACTICES,
      targetCounts: { match1: 2 }
    };

    const { result } = renderHook(() => useAutoSelectPreferences('team-1'));
    setPreferences.mockClear();

    act(() => {
      result.current.setTargetCounts({ match1: 3 });
    });

    const updater = setPreferences.mock.calls[0][0];
    const nextState = updater(currentPreferences);

    expect(nextState).toEqual({
      ...currentPreferences,
      teamId: 'team-1',
      targetCounts: { match1: 3 }
    });
  });

  it('skips targetCounts update when maps are equal', () => {
    areStatusMapsEqual.mockReturnValue(true);
    currentPreferences = {
      ensureCoverage: true,
      metric: AUTO_SELECT_STRATEGY.PRACTICES,
      targetCounts: { match1: 2 }
    };

    const { result } = renderHook(() => useAutoSelectPreferences('team-1'));
    setPreferences.mockClear();

    act(() => {
      result.current.setTargetCounts({ match1: 2 });
    });

    const updater = setPreferences.mock.calls[0][0];
    expect(updater(currentPreferences)).toBe(currentPreferences);
  });
});
