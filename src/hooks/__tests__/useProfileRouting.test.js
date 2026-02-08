import { renderHook, waitFor } from '@testing-library/react';
import { useProfileRouting } from '../useProfileRouting';
import { VIEWS } from '../../constants/viewConstants';

describe('useProfileRouting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.history.replaceState({}, '', '/');
    sessionStorage.clear();
  });

  it('navigates to profile on /profile URL', async () => {
    const navigateToView = jest.fn();
    window.history.replaceState({}, '', '/profile');

    renderHook(() => useProfileRouting(VIEWS.CONFIG, navigateToView));

    await waitFor(() => {
      expect(navigateToView).toHaveBeenCalledWith(VIEWS.PROFILE);
    });
  });

  it('updates URL to /profile when view changes to PROFILE', async () => {
    const navigateToView = jest.fn();
    const replaceSpy = jest.spyOn(window.history, 'replaceState');
    window.history.replaceState({}, '', '/');

    const { rerender } = renderHook(
      ({ view }) => useProfileRouting(view, navigateToView),
      { initialProps: { view: VIEWS.CONFIG } }
    );

    rerender({ view: VIEWS.PROFILE });

    await waitFor(() => {
      const updated = replaceSpy.mock.calls.some(call => call[2] === '/profile');
      expect(updated).toBe(true);
    });

    replaceSpy.mockRestore();
  });

  it('resets URL to / when leaving PROFILE', async () => {
    const navigateToView = jest.fn();
    const replaceSpy = jest.spyOn(window.history, 'replaceState');
    window.history.replaceState({}, '', '/profile');

    const { rerender } = renderHook(
      ({ view }) => useProfileRouting(view, navigateToView),
      { initialProps: { view: VIEWS.PROFILE } }
    );

    rerender({ view: VIEWS.CONFIG });

    await waitFor(() => {
      const resetToRoot = replaceSpy.mock.calls.some(call => call[2] === '/');
      expect(resetToRoot).toBe(true);
    });

    replaceSpy.mockRestore();
  });

  it('navigates via sessionStorage fallback when redirect is /profile', async () => {
    const navigateToView = jest.fn();
    sessionStorage.setItem('redirect', '/profile');
    window.history.replaceState({}, '', '/');

    renderHook(() => useProfileRouting(VIEWS.CONFIG, navigateToView));

    await waitFor(() => {
      expect(navigateToView).toHaveBeenCalledWith(VIEWS.PROFILE);
    });
    expect(sessionStorage.getItem('redirect')).toBeNull();
  });

  it('does not consume non-profile sessionStorage redirects', () => {
    const navigateToView = jest.fn();
    const liveMatchId = 'ad125c2d-46b9-4940-9664-cac9ff24e1f4';
    sessionStorage.setItem('redirect', `/live/${liveMatchId}`);
    window.history.replaceState({}, '', '/');

    renderHook(() => useProfileRouting(VIEWS.CONFIG, navigateToView));

    expect(navigateToView).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('redirect')).toBe(`/live/${liveMatchId}`);
  });

  it('does not clobber other URLs like /stats, /team, /tactics, or /plan', async () => {
    const navigateToView = jest.fn();
    const replaceSpy = jest.spyOn(window.history, 'replaceState');

    // When on /stats and view is not PROFILE, should not touch the URL
    window.history.replaceState({}, '', '/stats');

    renderHook(() => useProfileRouting(VIEWS.STATISTICS, navigateToView));

    // Should not have navigated
    expect(navigateToView).not.toHaveBeenCalled();
    // Should not have changed URL from /stats
    const changedFromStats = replaceSpy.mock.calls.some(call => call[2] !== '/stats');
    expect(changedFromStats).toBe(false);

    replaceSpy.mockRestore();
  });
});
