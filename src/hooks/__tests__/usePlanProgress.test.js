import { renderHook, act, waitFor } from '@testing-library/react';
import { usePlanProgress } from '../usePlanProgress';
import { usePersistentState } from '../usePersistentState';
import { reconcilePlanProgress } from '../../utils/planningStateReconciler';
import {
  areIdListsEqual,
  areMatchListsEqual,
  areSelectionMapsEqual,
  areStatusMapsEqual
} from '../../utils/comparisonUtils';
import { AUTO_SELECT_STRATEGY } from '../../constants/planMatchesConstants';

jest.mock('../usePersistentState');

jest.mock('../../utils/planningStateReconciler', () => ({
  reconcilePlanProgress: jest.fn()
}));

jest.mock('../../utils/comparisonUtils', () => ({
  areIdListsEqual: jest.fn(),
  areMatchListsEqual: jest.fn(),
  areSelectionMapsEqual: jest.fn(),
  areStatusMapsEqual: jest.fn()
}));

describe('usePlanProgress', () => {
  let currentPlanProgress;
  let setPlanProgress;

  const matchesToPlan = [
    { id: 'match-1', opponent: 'Opponent', matchDate: '2030-01-01', matchTime: '18:00:00' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    currentPlanProgress = null;
    setPlanProgress = jest.fn();
    usePersistentState.mockImplementation(() => [currentPlanProgress, setPlanProgress]);
    areMatchListsEqual.mockReturnValue(true);
    areStatusMapsEqual.mockReturnValue(true);
    reconcilePlanProgress.mockReturnValue({
      matches: [],
      selectedPlayersByMatch: {},
      sortMetric: AUTO_SELECT_STRATEGY.PRACTICES,
      plannedMatchIds: [],
      planningStatus: {}
    });
  });

  it('returns stored matches and selections when available', () => {
    currentPlanProgress = {
      matches: [{ id: 'stored-1', opponent: 'Stored', matchDate: '2030-01-02', matchTime: '19:00:00' }],
      selectedPlayersByMatch: { 'stored-1': ['p1'] },
      sortMetric: AUTO_SELECT_STRATEGY.ATTENDANCE,
      plannedMatchIds: ['stored-1']
    };

    const { result } = renderHook(() => usePlanProgress({ teamId: 'team-1', matchesToPlan }));

    expect(result.current.matches).toEqual(currentPlanProgress.matches);
    expect(result.current.selectedPlayersByMatch).toEqual({ 'stored-1': ['p1'] });
    expect(result.current.sortMetric).toBe(AUTO_SELECT_STRATEGY.ATTENDANCE);
    expect(result.current.plannedMatchIds).toEqual(['stored-1']);
  });

  it('falls back to matchesToPlan and defaults when planProgress is empty', () => {
    currentPlanProgress = {
      matches: [],
      selectedPlayersByMatch: null,
      sortMetric: 'invalid',
      plannedMatchIds: null
    };

    const { result } = renderHook(() => usePlanProgress({ teamId: 'team-1', matchesToPlan }));

    expect(result.current.matches).toEqual(matchesToPlan);
    expect(result.current.selectedPlayersByMatch).toEqual({});
    expect(result.current.sortMetric).toBe(AUTO_SELECT_STRATEGY.PRACTICES);
    expect(result.current.plannedMatchIds).toEqual([]);
  });

  it('updates selectedPlayersByMatch when changed', () => {
    areSelectionMapsEqual.mockReturnValue(false);
    currentPlanProgress = { selectedPlayersByMatch: {}, matches: [] };

    const { result } = renderHook(() => usePlanProgress({ teamId: 'team-1', matchesToPlan }));
    setPlanProgress.mockClear();

    act(() => {
      result.current.setSelectedPlayersByMatch({ match1: ['p1'] });
    });

    const updater = setPlanProgress.mock.calls[0][0];
    const prevState = { selectedPlayersByMatch: {}, matches: [], teamId: null };
    const nextState = updater(prevState);

    expect(nextState).toEqual({
      ...prevState,
      teamId: 'team-1',
      selectedPlayersByMatch: { match1: ['p1'] }
    });
  });

  it('skips selectedPlayersByMatch update when maps are equal', () => {
    areSelectionMapsEqual.mockReturnValue(true);
    currentPlanProgress = { selectedPlayersByMatch: {}, matches: [] };

    const { result } = renderHook(() => usePlanProgress({ teamId: 'team-1', matchesToPlan }));
    setPlanProgress.mockClear();

    act(() => {
      result.current.setSelectedPlayersByMatch({ match1: ['p1'] });
    });

    const updater = setPlanProgress.mock.calls[0][0];
    const prevState = { selectedPlayersByMatch: { match1: ['p1'] }, matches: [], teamId: 'team-1' };

    expect(updater(prevState)).toBe(prevState);
  });

  it('updates sortMetric and plannedMatchIds with updater functions', () => {
    areIdListsEqual.mockReturnValue(false);
    currentPlanProgress = { sortMetric: AUTO_SELECT_STRATEGY.PRACTICES, plannedMatchIds: [] };

    const { result } = renderHook(() => usePlanProgress({ teamId: 'team-1', matchesToPlan }));
    setPlanProgress.mockClear();

    act(() => {
      result.current.setSortMetric(prev => (prev === AUTO_SELECT_STRATEGY.PRACTICES
        ? AUTO_SELECT_STRATEGY.ATTENDANCE
        : prev));
      result.current.setPlannedMatchIds(prev => [...prev, 'match-1']);
    });

    const sortUpdater = setPlanProgress.mock.calls[0][0];
    const idsUpdater = setPlanProgress.mock.calls[1][0];
    const baseState = {
      matches: [],
      teamId: null,
      sortMetric: AUTO_SELECT_STRATEGY.PRACTICES,
      plannedMatchIds: []
    };

    const updatedSort = sortUpdater(baseState);
    expect(updatedSort.sortMetric).toBe(AUTO_SELECT_STRATEGY.ATTENDANCE);

    const updatedIds = idsUpdater(baseState);
    expect(updatedIds.plannedMatchIds).toEqual(['match-1']);
  });

  it('skips plannedMatchIds update when lists are equal', () => {
    areIdListsEqual.mockReturnValue(true);
    currentPlanProgress = { plannedMatchIds: [] };

    const { result } = renderHook(() => usePlanProgress({ teamId: 'team-1', matchesToPlan }));
    setPlanProgress.mockClear();

    act(() => {
      result.current.setPlannedMatchIds(['match-1']);
    });

    const updater = setPlanProgress.mock.calls[0][0];
    const prevState = { plannedMatchIds: ['match-1'], teamId: 'team-1' };

    expect(updater(prevState)).toBe(prevState);
  });

  it('reconciles plan progress when matches change', async () => {
    const reconciled = {
      matches: matchesToPlan,
      selectedPlayersByMatch: { 'match-1': ['p1'] },
      sortMetric: AUTO_SELECT_STRATEGY.PRACTICES,
      plannedMatchIds: ['match-1'],
      planningStatus: { 'match-1': 'done' }
    };

    areMatchListsEqual.mockReturnValue(false);
    areStatusMapsEqual.mockReturnValue(false);
    reconcilePlanProgress.mockReturnValue(reconciled);

    const { result } = renderHook(() => usePlanProgress({ teamId: 'team-1', matchesToPlan }));

    await waitFor(() => {
      expect(reconcilePlanProgress).toHaveBeenCalledWith({
        currentTeamId: 'team-1',
        matchesToPlan,
        planProgress: currentPlanProgress
      });
      expect(result.current.planningStatus).toEqual({ 'match-1': 'done' });
    });
  });

  it('skips reconciliation when matchesToPlan are unchanged', async () => {
    areMatchListsEqual
      .mockImplementationOnce(() => false)
      .mockImplementationOnce(() => true);
    reconcilePlanProgress.mockReturnValue({
      matches: matchesToPlan,
      selectedPlayersByMatch: {},
      sortMetric: AUTO_SELECT_STRATEGY.PRACTICES,
      plannedMatchIds: [],
      planningStatus: {}
    });
    areStatusMapsEqual.mockReturnValue(true);

    const { rerender } = renderHook(
      ({ teamId }) => usePlanProgress({ teamId, matchesToPlan }),
      { initialProps: { teamId: 'team-1' } }
    );

    await waitFor(() => {
      expect(reconcilePlanProgress).toHaveBeenCalled();
    });
    const initialCalls = reconcilePlanProgress.mock.calls.length;

    rerender({ teamId: 'team-1' });

    await waitFor(() => {
      expect(reconcilePlanProgress).toHaveBeenCalledTimes(initialCalls);
    });
  });

  it('reconciles again when teamId changes', async () => {
    areMatchListsEqual.mockReturnValue(false);
    reconcilePlanProgress.mockReturnValue({
      matches: matchesToPlan,
      selectedPlayersByMatch: {},
      sortMetric: AUTO_SELECT_STRATEGY.PRACTICES,
      plannedMatchIds: [],
      planningStatus: {}
    });
    areStatusMapsEqual.mockReturnValue(false);

    const { rerender } = renderHook(
      ({ teamId }) => usePlanProgress({ teamId, matchesToPlan }),
      { initialProps: { teamId: 'team-1' } }
    );

    await waitFor(() => {
      expect(reconcilePlanProgress).toHaveBeenCalled();
    });
    const initialCalls = reconcilePlanProgress.mock.calls.length;

    rerender({ teamId: 'team-2' });

    await waitFor(() => {
      expect(reconcilePlanProgress.mock.calls.length).toBeGreaterThan(initialCalls);
    });
  });
});
