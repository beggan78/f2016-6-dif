import { renderHook, waitFor } from '@testing-library/react';
import { useLiveMatchRouting } from '../useLiveMatchRouting';
import { VIEWS } from '../../constants/viewConstants';

describe('useLiveMatchRouting', () => {
  const matchId = 'ad125c2d-46b9-4940-9664-cac9ff24e1f4';

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
});
