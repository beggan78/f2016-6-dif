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
      inviteSeededMatchIds: [],
      planningStatus: {}
    });
  });

  it('returns stored matches and selections when available', () => {
    currentPlanProgress = {
      matches: [{ id: 'stored-1', opponent: 'Stored', matchDate: '2030-01-02', matchTime: '19:00:00' }],
      selectedPlayersByMatch: { 'stored-1': ['p1'] },
      sortMetric: AUTO_SELECT_STRATEGY.ATTENDANCE,
      plannedMatchIds: ['stored-1'],
      inviteSeededMatchIds: ['stored-1']
    };

    const { result } = renderHook(() => usePlanProgress({ teamId: 'team-1', matchesToPlan }));

    expect(result.current.matches).toEqual(currentPlanProgress.matches);
    expect(result.current.selectedPlayersByMatch).toEqual({ 'stored-1': ['p1'] });
    expect(result.current.sortMetric).toBe(AUTO_SELECT_STRATEGY.ATTENDANCE);
    expect(result.current.plannedMatchIds).toEqual(['stored-1']);
    expect(result.current.inviteSeededMatchIds).toEqual(['stored-1']);
  });

  it('falls back to matchesToPlan and defaults when planProgress is empty', () => {
    currentPlanProgress = {
      matches: [],
      selectedPlayersByMatch: null,
      sortMetric: 'invalid',
      plannedMatchIds: null,
      inviteSeededMatchIds: null
    };

    const { result } = renderHook(() => usePlanProgress({ teamId: 'team-1', matchesToPlan }));

    expect(result.current.matches).toEqual(matchesToPlan);
    expect(result.current.selectedPlayersByMatch).toEqual({});
    expect(result.current.sortMetric).toBe(AUTO_SELECT_STRATEGY.PRACTICES);
    expect(result.current.plannedMatchIds).toEqual([]);
    expect(result.current.inviteSeededMatchIds).toEqual([]);
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

  it('updates inviteSeededMatchIds with updater function', () => {
    areIdListsEqual.mockReturnValue(false);
    currentPlanProgress = { inviteSeededMatchIds: [] };

    const { result } = renderHook(() => usePlanProgress({ teamId: 'team-1', matchesToPlan }));
    setPlanProgress.mockClear();

    act(() => {
      result.current.setInviteSeededMatchIds(prev => [...prev, 'match-1']);
    });

    const updater = setPlanProgress.mock.calls[0][0];
    const baseState = {
      matches: [],
      teamId: null,
      inviteSeededMatchIds: []
    };

    const updated = updater(baseState);
    expect(updated.inviteSeededMatchIds).toEqual(['match-1']);
    expect(updated.teamId).toBe('team-1');
  });

  it('skips inviteSeededMatchIds update when lists are equal', () => {
    areIdListsEqual.mockReturnValue(true);
    currentPlanProgress = { inviteSeededMatchIds: ['match-1'] };

    const { result } = renderHook(() => usePlanProgress({ teamId: 'team-1', matchesToPlan }));
    setPlanProgress.mockClear();

    act(() => {
      result.current.setInviteSeededMatchIds(['match-1']);
    });

    const updater = setPlanProgress.mock.calls[0][0];
    const prevState = { inviteSeededMatchIds: ['match-1'], teamId: 'team-1' };

    expect(updater(prevState)).toBe(prevState);
  });

  it('reconciles plan progress when matches change', async () => {
    const reconciled = {
      matches: matchesToPlan,
      selectedPlayersByMatch: { 'match-1': ['p1'] },
      sortMetric: AUTO_SELECT_STRATEGY.PRACTICES,
      plannedMatchIds: ['match-1'],
      inviteSeededMatchIds: [],
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
      inviteSeededMatchIds: [],
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

  it('does not re-reconcile when planProgress reference changes but matchesToPlan stays the same', async () => {
    const storedSelections = { 'match-1': ['p1', 'p2'] };
    currentPlanProgress = {
      teamId: 'team-1',
      matches: matchesToPlan,
      selectedPlayersByMatch: storedSelections,
      sortMetric: AUTO_SELECT_STRATEGY.PRACTICES,
      plannedMatchIds: [],
      inviteSeededMatchIds: []
    };

    areMatchListsEqual
      .mockImplementationOnce(() => false)
      .mockImplementation(() => true);
    reconcilePlanProgress.mockReturnValue({
      matches: matchesToPlan,
      selectedPlayersByMatch: storedSelections,
      sortMetric: AUTO_SELECT_STRATEGY.PRACTICES,
      plannedMatchIds: [],
      inviteSeededMatchIds: [],
      planningStatus: {}
    });
    areStatusMapsEqual.mockReturnValue(true);

    const { result, rerender } = renderHook(
      ({ teamId }) => usePlanProgress({ teamId, matchesToPlan }),
      { initialProps: { teamId: 'team-1' } }
    );

    await waitFor(() => {
      expect(reconcilePlanProgress).toHaveBeenCalledTimes(1);
    });

    // Simulate planProgress getting a new object reference (e.g. usePersistentState double-load)
    // by re-rendering with the same teamId -- the ref-based approach means the effect won't re-fire
    currentPlanProgress = {
      ...currentPlanProgress,
      selectedPlayersByMatch: { 'match-1': ['p1', 'p2'] }
    };
    rerender({ teamId: 'team-1' });

    await waitFor(() => {
      expect(reconcilePlanProgress).toHaveBeenCalledTimes(1);
    });

    // Selections should still be intact
    expect(result.current.selectedPlayersByMatch).toEqual(storedSelections);
  });

  it('skips reconciliation on refresh (empty matchesToPlan with teamId)', async () => {
    areMatchListsEqual.mockReturnValue(false);
    currentPlanProgress = {
      teamId: 'team-1',
      matches: [{ id: 'm1', opponent: 'Stored', matchDate: '2030-01-01', matchTime: '18:00:00' }],
      selectedPlayersByMatch: { 'm1': ['p1'] },
      sortMetric: AUTO_SELECT_STRATEGY.PRACTICES,
      plannedMatchIds: ['m1'],
      inviteSeededMatchIds: []
    };

    renderHook(() => usePlanProgress({ teamId: 'team-1', matchesToPlan: [] }));

    await waitFor(() => {
      // The no-team reconciliation call should not happen (teamId is present),
      // and the with-team reconciliation should be skipped due to empty matchesToPlan
      const teamCalls = reconcilePlanProgress.mock.calls.filter(
        call => call[0].currentTeamId === 'team-1'
      );
      expect(teamCalls).toHaveLength(0);
    });
  });

  it('restores planningStatus from persisted plannedMatchIds', async () => {
    areMatchListsEqual.mockReturnValue(false);
    currentPlanProgress = {
      teamId: 'team-1',
      matches: [{ id: 'm1', opponent: 'Stored', matchDate: '2030-01-01', matchTime: '18:00:00' }],
      selectedPlayersByMatch: {},
      sortMetric: AUTO_SELECT_STRATEGY.PRACTICES,
      plannedMatchIds: ['m1'],
      inviteSeededMatchIds: []
    };

    const { result } = renderHook(() => usePlanProgress({ teamId: 'team-1', matchesToPlan: [] }));

    await waitFor(() => {
      expect(result.current.planningStatus).toEqual({ 'm1': 'done' });
    });
  });

  it('reconciles again when teamId changes', async () => {
    areMatchListsEqual.mockReturnValue(false);
    reconcilePlanProgress.mockReturnValue({
      matches: matchesToPlan,
      selectedPlayersByMatch: {},
      sortMetric: AUTO_SELECT_STRATEGY.PRACTICES,
      plannedMatchIds: [],
      inviteSeededMatchIds: [],
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
