import { renderHook, waitFor } from '@testing-library/react';
import { usePlanMatchesRouting } from '../usePlanMatchesRouting';
import { VIEWS } from '../../constants/viewConstants';

describe('usePlanMatchesRouting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.history.replaceState({}, '', '/');
    sessionStorage.clear();
  });

  it('navigates to team matches on /plan URL', async () => {
    const navigateToView = jest.fn();
    window.history.replaceState({}, '', '/plan');

    renderHook(() => usePlanMatchesRouting(VIEWS.CONFIG, navigateToView));

    await waitFor(() => {
      expect(navigateToView).toHaveBeenCalledWith(VIEWS.TEAM_MATCHES);
    });
  });

  it('updates URL to /plan when view changes to TEAM_MATCHES', async () => {
    const navigateToView = jest.fn();
    const replaceSpy = jest.spyOn(window.history, 'replaceState');
    window.history.replaceState({}, '', '/');

    const { rerender } = renderHook(
      ({ view }) => usePlanMatchesRouting(view, navigateToView),
      { initialProps: { view: VIEWS.CONFIG } }
    );

    rerender({ view: VIEWS.TEAM_MATCHES });

    await waitFor(() => {
      const updated = replaceSpy.mock.calls.some(call => call[2] === '/plan');
      expect(updated).toBe(true);
    });

    replaceSpy.mockRestore();
  });

  it('keeps URL as /plan when view changes to PLAN_MATCHES', async () => {
    const navigateToView = jest.fn();
    const replaceSpy = jest.spyOn(window.history, 'replaceState');
    window.history.replaceState({}, '', '/plan');

    const { rerender } = renderHook(
      ({ view }) => usePlanMatchesRouting(view, navigateToView),
      { initialProps: { view: VIEWS.TEAM_MATCHES } }
    );

    rerender({ view: VIEWS.PLAN_MATCHES });

    await waitFor(() => {
      // URL should still be /plan — no reset to /
      const resetToRoot = replaceSpy.mock.calls.some(call => call[2] === '/');
      expect(resetToRoot).toBe(false);
    });

    replaceSpy.mockRestore();
  });

  it('resets URL to / when leaving TEAM_MATCHES', async () => {
    const navigateToView = jest.fn();
    const replaceSpy = jest.spyOn(window.history, 'replaceState');
    window.history.replaceState({}, '', '/plan');

    const { rerender } = renderHook(
      ({ view }) => usePlanMatchesRouting(view, navigateToView),
      { initialProps: { view: VIEWS.TEAM_MATCHES } }
    );

    rerender({ view: VIEWS.CONFIG });

    await waitFor(() => {
      const resetToRoot = replaceSpy.mock.calls.some(call => call[2] === '/');
      expect(resetToRoot).toBe(true);
    });

    replaceSpy.mockRestore();
  });

  it('resets URL to / when leaving PLAN_MATCHES', async () => {
    const navigateToView = jest.fn();
    const replaceSpy = jest.spyOn(window.history, 'replaceState');
    window.history.replaceState({}, '', '/plan');

    const { rerender } = renderHook(
      ({ view }) => usePlanMatchesRouting(view, navigateToView),
      { initialProps: { view: VIEWS.PLAN_MATCHES } }
    );

    rerender({ view: VIEWS.CONFIG });

    await waitFor(() => {
      const resetToRoot = replaceSpy.mock.calls.some(call => call[2] === '/');
      expect(resetToRoot).toBe(true);
    });

    replaceSpy.mockRestore();
  });

  it('navigates via sessionStorage fallback when redirect is /plan', async () => {
    const navigateToView = jest.fn();
    sessionStorage.setItem('redirect', '/plan');
    window.history.replaceState({}, '', '/');

    renderHook(() => usePlanMatchesRouting(VIEWS.CONFIG, navigateToView));

    await waitFor(() => {
      expect(navigateToView).toHaveBeenCalledWith(VIEWS.TEAM_MATCHES);
    });
    expect(sessionStorage.getItem('redirect')).toBeNull();
  });

  it('does not consume non-plan sessionStorage redirects', () => {
    const navigateToView = jest.fn();
    const liveMatchId = 'ad125c2d-46b9-4940-9664-cac9ff24e1f4';
    sessionStorage.setItem('redirect', `/live/${liveMatchId}`);
    window.history.replaceState({}, '', '/');

    renderHook(() => usePlanMatchesRouting(VIEWS.CONFIG, navigateToView));

    expect(navigateToView).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('redirect')).toBe(`/live/${liveMatchId}`);
  });

  it('does not clobber other URLs like /stats, /team, or /tactics', async () => {
    const navigateToView = jest.fn();
    const replaceSpy = jest.spyOn(window.history, 'replaceState');

    // When on /stats and view is not a plan view, should not touch the URL
    window.history.replaceState({}, '', '/stats');

    renderHook(() => usePlanMatchesRouting(VIEWS.STATISTICS, navigateToView));

    // Should not have navigated
    expect(navigateToView).not.toHaveBeenCalled();
    // Should not have changed URL from /stats
    const changedFromStats = replaceSpy.mock.calls.some(call => call[2] !== '/stats');
    expect(changedFromStats).toBe(false);

    replaceSpy.mockRestore();
  });
});
