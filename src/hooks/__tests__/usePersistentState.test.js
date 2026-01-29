import { renderHook, act, waitFor } from '@testing-library/react';
import { usePersistentState } from '../usePersistentState';
import { createPersistenceManager } from '../../utils/persistenceManager';

jest.mock('../../utils/persistenceManager', () => ({
  createPersistenceManager: jest.fn()
}));

describe('usePersistentState', () => {
  const storageKey = 'test-storage-key';
  const defaultState = { teamId: null, value: 0 };
  let mockManager;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    mockManager = {
      loadState: jest.fn(),
      saveState: jest.fn()
    };

    createPersistenceManager.mockReturnValue(mockManager);
  });

  it('initializes with default state when teamId is missing', () => {
    const { result } = renderHook(() => usePersistentState(storageKey, defaultState, null));

    expect(createPersistenceManager).toHaveBeenCalledWith(storageKey, defaultState);
    expect(mockManager.loadState).not.toHaveBeenCalled();
    expect(result.current[0]).toBe(defaultState);
  });

  it('loads stored state when teamId matches', async () => {
    const storedState = { teamId: 'team-1', value: 5 };
    mockManager.loadState.mockReturnValue(storedState);

    const { result } = renderHook(() => usePersistentState(storageKey, defaultState, 'team-1'));

    expect(mockManager.loadState).toHaveBeenCalled();
    expect(result.current[0]).toEqual(storedState);

    await waitFor(() => {
      expect(mockManager.saveState).toHaveBeenCalledWith(storedState);
    });
  });

  it('attaches teamId to default state when stored teamId mismatches', () => {
    mockManager.loadState.mockReturnValue({ teamId: 'other-team', value: 7 });

    const { result } = renderHook(() => usePersistentState(storageKey, defaultState, 'team-1'));

    expect(result.current[0]).toEqual({
      ...defaultState,
      teamId: 'team-1'
    });
  });

  it('uses default state when stored state is missing teamId', () => {
    mockManager.loadState.mockReturnValue({ value: 12 });

    const { result } = renderHook(() => usePersistentState(storageKey, defaultState, 'team-1'));

    expect(result.current[0]).toEqual({
      ...defaultState,
      teamId: 'team-1'
    });
  });

  it('persists updates when teamId is set', async () => {
    mockManager.loadState.mockReturnValue(null);

    const { result } = renderHook(() => usePersistentState(storageKey, defaultState, 'team-1'));

    act(() => {
      const [, setState] = result.current;
      setState({ value: 2 });
    });

    await waitFor(() => {
      expect(mockManager.saveState).toHaveBeenCalledWith({
        teamId: 'team-1',
        value: 2
      });
    });
  });

  it('resets to default state when teamId is cleared', async () => {
    const storedState = { teamId: 'team-1', value: 5 };
    mockManager.loadState.mockReturnValue(storedState);

    const { result, rerender } = renderHook(
      ({ teamId }) => usePersistentState(storageKey, defaultState, teamId),
      { initialProps: { teamId: 'team-1' } }
    );

    expect(result.current[0]).toEqual(storedState);

    rerender({ teamId: null });

    await waitFor(() => {
      expect(result.current[0]).toBe(defaultState);
    });
  });

  it('isolates state by team when teamId changes', async () => {
    const storedTeam1 = { teamId: 'team-1', value: 1 };
    const storedTeam2 = { teamId: 'team-2', value: 2 };

    mockManager.loadState.mockReturnValue(storedTeam1);

    const { result, rerender } = renderHook(
      ({ teamId }) => usePersistentState(storageKey, defaultState, teamId),
      { initialProps: { teamId: 'team-1' } }
    );

    expect(result.current[0]).toEqual(storedTeam1);

    mockManager.loadState.mockReturnValue(storedTeam2);
    rerender({ teamId: 'team-2' });

    await waitFor(() => {
      expect(result.current[0]).toEqual(storedTeam2);
    });
  });
});
