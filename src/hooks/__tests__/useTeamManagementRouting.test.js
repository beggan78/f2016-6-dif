import { renderHook, waitFor } from '@testing-library/react';
import { useTeamManagementRouting } from '../useTeamManagementRouting';
import { VIEWS } from '../../constants/viewConstants';

describe('useTeamManagementRouting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.history.replaceState({}, '', '/');
    sessionStorage.clear();
  });

  it('navigates to team management on /team URL', async () => {
    const navigateToView = jest.fn();
    window.history.replaceState({}, '', '/team');

    renderHook(() => useTeamManagementRouting(VIEWS.CONFIG, navigateToView));

    await waitFor(() => {
      expect(navigateToView).toHaveBeenCalledWith(VIEWS.TEAM_MANAGEMENT);
    });
  });

  it('updates URL to /team when view changes to TEAM_MANAGEMENT', async () => {
    const navigateToView = jest.fn();
    const replaceSpy = jest.spyOn(window.history, 'replaceState');
    window.history.replaceState({}, '', '/');

    const { rerender } = renderHook(
      ({ view }) => useTeamManagementRouting(view, navigateToView),
      { initialProps: { view: VIEWS.CONFIG } }
    );

    rerender({ view: VIEWS.TEAM_MANAGEMENT });

    await waitFor(() => {
      const updated = replaceSpy.mock.calls.some(call => call[2] === '/team');
      expect(updated).toBe(true);
    });

    replaceSpy.mockRestore();
  });

  it('resets URL to / when leaving TEAM_MANAGEMENT', async () => {
    const navigateToView = jest.fn();
    const replaceSpy = jest.spyOn(window.history, 'replaceState');
    window.history.replaceState({}, '', '/team');

    const { rerender } = renderHook(
      ({ view }) => useTeamManagementRouting(view, navigateToView),
      { initialProps: { view: VIEWS.TEAM_MANAGEMENT } }
    );

    rerender({ view: VIEWS.CONFIG });

    await waitFor(() => {
      const resetToRoot = replaceSpy.mock.calls.some(call => call[2] === '/');
      expect(resetToRoot).toBe(true);
    });

    replaceSpy.mockRestore();
  });

  it('navigates via sessionStorage fallback when redirect is /team', async () => {
    const navigateToView = jest.fn();
    sessionStorage.setItem('redirect', '/team');
    window.history.replaceState({}, '', '/');

    renderHook(() => useTeamManagementRouting(VIEWS.CONFIG, navigateToView));

    await waitFor(() => {
      expect(navigateToView).toHaveBeenCalledWith(VIEWS.TEAM_MANAGEMENT);
    });
    expect(sessionStorage.getItem('redirect')).toBeNull();
  });

  it('does not consume non-team sessionStorage redirects', () => {
    const navigateToView = jest.fn();
    const liveMatchId = 'ad125c2d-46b9-4940-9664-cac9ff24e1f4';
    sessionStorage.setItem('redirect', `/live/${liveMatchId}`);
    window.history.replaceState({}, '', '/');

    renderHook(() => useTeamManagementRouting(VIEWS.CONFIG, navigateToView));

    expect(navigateToView).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('redirect')).toBe(`/live/${liveMatchId}`);
  });

  it('does not clobber other URLs like /stats or /live', async () => {
    const navigateToView = jest.fn();
    const replaceSpy = jest.spyOn(window.history, 'replaceState');

    // When on /stats and view is not TEAM_MANAGEMENT, should not touch the URL
    window.history.replaceState({}, '', '/stats');

    renderHook(() => useTeamManagementRouting(VIEWS.STATISTICS, navigateToView));

    // Should not have navigated
    expect(navigateToView).not.toHaveBeenCalled();
    // Should not have changed URL from /stats
    const changedFromStats = replaceSpy.mock.calls.some(call => call[2] !== '/stats');
    expect(changedFromStats).toBe(false);

    replaceSpy.mockRestore();
  });
});
