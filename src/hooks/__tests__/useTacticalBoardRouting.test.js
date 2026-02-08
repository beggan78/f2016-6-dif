import { renderHook, waitFor } from '@testing-library/react';
import { useTacticalBoardRouting } from '../useTacticalBoardRouting';
import { VIEWS } from '../../constants/viewConstants';

describe('useTacticalBoardRouting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.history.replaceState({}, '', '/');
    sessionStorage.clear();
  });

  it('navigates to tactical board on /tactics URL', async () => {
    const navigateToView = jest.fn();
    window.history.replaceState({}, '', '/tactics');

    renderHook(() => useTacticalBoardRouting(VIEWS.CONFIG, navigateToView));

    await waitFor(() => {
      expect(navigateToView).toHaveBeenCalledWith(VIEWS.TACTICAL_BOARD);
    });
  });

  it('updates URL to /tactics when view changes to TACTICAL_BOARD', async () => {
    const navigateToView = jest.fn();
    const replaceSpy = jest.spyOn(window.history, 'replaceState');
    window.history.replaceState({}, '', '/');

    const { rerender } = renderHook(
      ({ view }) => useTacticalBoardRouting(view, navigateToView),
      { initialProps: { view: VIEWS.CONFIG } }
    );

    rerender({ view: VIEWS.TACTICAL_BOARD });

    await waitFor(() => {
      const updated = replaceSpy.mock.calls.some(call => call[2] === '/tactics');
      expect(updated).toBe(true);
    });

    replaceSpy.mockRestore();
  });

  it('resets URL to / when leaving TACTICAL_BOARD', async () => {
    const navigateToView = jest.fn();
    const replaceSpy = jest.spyOn(window.history, 'replaceState');
    window.history.replaceState({}, '', '/tactics');

    const { rerender } = renderHook(
      ({ view }) => useTacticalBoardRouting(view, navigateToView),
      { initialProps: { view: VIEWS.TACTICAL_BOARD } }
    );

    rerender({ view: VIEWS.CONFIG });

    await waitFor(() => {
      const resetToRoot = replaceSpy.mock.calls.some(call => call[2] === '/');
      expect(resetToRoot).toBe(true);
    });

    replaceSpy.mockRestore();
  });

  it('navigates via sessionStorage fallback when redirect is /tactics', async () => {
    const navigateToView = jest.fn();
    sessionStorage.setItem('redirect', '/tactics');
    window.history.replaceState({}, '', '/');

    renderHook(() => useTacticalBoardRouting(VIEWS.CONFIG, navigateToView));

    await waitFor(() => {
      expect(navigateToView).toHaveBeenCalledWith(VIEWS.TACTICAL_BOARD);
    });
    expect(sessionStorage.getItem('redirect')).toBeNull();
  });

  it('does not consume non-tactics sessionStorage redirects', () => {
    const navigateToView = jest.fn();
    const liveMatchId = 'ad125c2d-46b9-4940-9664-cac9ff24e1f4';
    sessionStorage.setItem('redirect', `/live/${liveMatchId}`);
    window.history.replaceState({}, '', '/');

    renderHook(() => useTacticalBoardRouting(VIEWS.CONFIG, navigateToView));

    expect(navigateToView).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('redirect')).toBe(`/live/${liveMatchId}`);
  });

  it('does not clobber other URLs like /stats or /team or /live', async () => {
    const navigateToView = jest.fn();
    const replaceSpy = jest.spyOn(window.history, 'replaceState');

    // When on /stats and view is not TACTICAL_BOARD, should not touch the URL
    window.history.replaceState({}, '', '/stats');

    renderHook(() => useTacticalBoardRouting(VIEWS.STATISTICS, navigateToView));

    // Should not have navigated
    expect(navigateToView).not.toHaveBeenCalled();
    // Should not have changed URL from /stats
    const changedFromStats = replaceSpy.mock.calls.some(call => call[2] !== '/stats');
    expect(changedFromStats).toBe(false);

    replaceSpy.mockRestore();
  });
});
