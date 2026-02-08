import { renderHook, waitFor } from '@testing-library/react';
import { useLiveMatchRouting } from '../useLiveMatchRouting';
import { VIEWS } from '../../constants/viewConstants';

describe('useLiveMatchRouting', () => {
  const matchId = 'ad125c2d-46b9-4940-9664-cac9ff24e1f4';
  const anotherMatchId = 'f7a2b4c6-d8e9-4f01-a234-b56789c0d1e2';

  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    sessionStorage.clear();
    jest.clearAllMocks();
  });

  it('preserves /live/{matchId} URL while syncing view state', async () => {
    const navigateToView = jest.fn();
    const setLiveMatchId = jest.fn();

    window.history.replaceState({}, '', `/live/${matchId}`);

    const { rerender } = renderHook(
      ({ view, activeMatchId }) => useLiveMatchRouting(view, navigateToView, setLiveMatchId, activeMatchId),
      { initialProps: { view: VIEWS.CONFIG, activeMatchId: null } }
    );

    await waitFor(() => {
      expect(setLiveMatchId).toHaveBeenCalledWith(matchId);
      expect(navigateToView).toHaveBeenCalledWith(VIEWS.LIVE_MATCH);
    });

    expect(window.location.pathname).toBe(`/live/${matchId}`);

    rerender({ view: VIEWS.LIVE_MATCH, activeMatchId: matchId });
    await waitFor(() => expect(window.location.pathname).toBe(`/live/${matchId}`));

    rerender({ view: VIEWS.CONFIG, activeMatchId: matchId });
    await waitFor(() => expect(window.location.pathname).toBe('/'));
  });

  it('updates the URL when navigating to a live match programmatically', async () => {
    const navigateToView = jest.fn();
    const setLiveMatchId = jest.fn();

    const { rerender } = renderHook(
      ({ view, activeMatchId }) => useLiveMatchRouting(view, navigateToView, setLiveMatchId, activeMatchId),
      { initialProps: { view: VIEWS.CONFIG, activeMatchId: null } }
    );

    expect(window.location.pathname).toBe('/');

    rerender({ view: VIEWS.LIVE_MATCH, activeMatchId: matchId });

    await waitFor(() => {
      expect(window.location.pathname).toBe(`/live/${matchId}`);
    });
  });

  it('syncs URL from the activeMatchId parameter and updates when the match changes', async () => {
    const navigateToView = jest.fn();
    const setLiveMatchId = jest.fn();

    const { rerender } = renderHook(
      ({ view, activeMatchId }) => useLiveMatchRouting(view, navigateToView, setLiveMatchId, activeMatchId),
      { initialProps: { view: VIEWS.LIVE_MATCH, activeMatchId: matchId } }
    );

    await waitFor(() => expect(window.location.pathname).toBe(`/live/${matchId}`));
    expect(setLiveMatchId).not.toHaveBeenCalled();

    rerender({ view: VIEWS.LIVE_MATCH, activeMatchId: anotherMatchId });
    await waitFor(() => expect(window.location.pathname).toBe(`/live/${anotherMatchId}`));
  });

  it('uses sessionStorage redirect when the initial path is root', async () => {
    const navigateToView = jest.fn();
    const setLiveMatchId = jest.fn();

    sessionStorage.setItem('redirect', `/live/${matchId}`);
    window.history.replaceState({}, '', '/');

    const { rerender } = renderHook(
      ({ view, activeMatchId }) => useLiveMatchRouting(view, navigateToView, setLiveMatchId, activeMatchId),
      { initialProps: { view: VIEWS.CONFIG, activeMatchId: null } }
    );

    await waitFor(() => {
      expect(setLiveMatchId).toHaveBeenCalledWith(matchId);
      expect(navigateToView).toHaveBeenCalledWith(VIEWS.LIVE_MATCH);
    });
    expect(sessionStorage.getItem('redirect')).toBeNull();
    expect(window.location.pathname).toBe('/');

    rerender({ view: VIEWS.LIVE_MATCH, activeMatchId: matchId });
    await waitFor(() => expect(window.location.pathname).toBe(`/live/${matchId}`));
  });

  it('cleans up the live URL when leaving the live view', async () => {
    const navigateToView = jest.fn();
    const setLiveMatchId = jest.fn();

    const { rerender, unmount } = renderHook(
      ({ view, activeMatchId }) => useLiveMatchRouting(view, navigateToView, setLiveMatchId, activeMatchId),
      { initialProps: { view: VIEWS.LIVE_MATCH, activeMatchId: matchId } }
    );

    await waitFor(() => expect(window.location.pathname).toBe(`/live/${matchId}`));

    rerender({ view: VIEWS.CONFIG, activeMatchId: matchId });
    await waitFor(() => expect(window.location.pathname).toBe('/'));

    unmount();
    expect(window.location.pathname).toBe('/');
  });

  it('ignores invalid /live/ paths that do not contain a UUID', () => {
    const navigateToView = jest.fn();
    const setLiveMatchId = jest.fn();

    window.history.replaceState({}, '', '/live/not-a-valid-uuid');

    renderHook(
      ({ view, activeMatchId }) => useLiveMatchRouting(view, navigateToView, setLiveMatchId, activeMatchId),
      { initialProps: { view: VIEWS.CONFIG, activeMatchId: null } }
    );

    expect(setLiveMatchId).not.toHaveBeenCalled();
    expect(navigateToView).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe('/');
  });

  it('does not clobber non-live URLs when view changes', async () => {
    const navigateToView = jest.fn();
    const setLiveMatchId = jest.fn();

    // Start at /stats (set by useStatisticsRouting)
    window.history.replaceState({}, '', '/stats');

    const { rerender } = renderHook(
      ({ view, activeMatchId }) => useLiveMatchRouting(view, navigateToView, setLiveMatchId, activeMatchId),
      { initialProps: { view: VIEWS.STATISTICS, activeMatchId: null } }
    );

    // URL should remain /stats — useLiveMatchRouting should not touch it
    expect(window.location.pathname).toBe('/stats');

    // Change view to CONFIG — URL should still not be touched by this hook
    rerender({ view: VIEWS.CONFIG, activeMatchId: null });
    expect(window.location.pathname).toBe('/stats');
  });

  it('does not set a live URL when activeMatchId is null', async () => {
    const navigateToView = jest.fn();
    const setLiveMatchId = jest.fn();

    renderHook(
      ({ view, activeMatchId }) => useLiveMatchRouting(view, navigateToView, setLiveMatchId, activeMatchId),
      { initialProps: { view: VIEWS.LIVE_MATCH, activeMatchId: null } }
    );

    await waitFor(() => expect(window.location.pathname).toBe('/'));
    expect(setLiveMatchId).not.toHaveBeenCalled();
    expect(navigateToView).not.toHaveBeenCalled();
  });
});
