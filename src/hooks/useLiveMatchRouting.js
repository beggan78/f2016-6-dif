import { useEffect, useRef } from 'react';
import { VIEWS } from '../constants/viewConstants';

/**
 * Hook to handle /live/{matchId} route detection and navigation
 * Similar pattern to useStatisticsRouting
 *
 * Detects when the user navigates to /live/{matchId} and triggers
 * navigation to the LIVE_MATCH view with the extracted matchId.
 *
 * @param {string} view - Current view from game state
 * @param {Function} navigateToView - Function to navigate to a view
 * @param {Function} setLiveMatchId - Function to set the live match ID
 */
export function useLiveMatchRouting(view, navigateToView, setLiveMatchId) {
  const initialPathRef = useRef(null);
  const initialRouteHandledRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      initialRouteHandledRef.current = true;
      return;
    }

    if (initialPathRef.current === null) {
      const normalizedPath = (window.location.pathname || '').replace(/\/+$/, '') || '/';
      initialPathRef.current = normalizedPath;
    }

    if (initialRouteHandledRef.current) {
      return;
    }

    // Match /live/{matchId} pattern with UUID validation
    const liveMatchPattern = /^\/live\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;
    const match = initialPathRef.current.match(liveMatchPattern);

    if (match && match[1]) {
      const matchId = match[1];
      setLiveMatchId(matchId);
      navigateToView?.(VIEWS.LIVE_MATCH);
    }

    initialRouteHandledRef.current = true;
  }, [navigateToView, setLiveMatchId]);

  // Update URL when navigating to/from live match view
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const normalizedPath = (window.location.pathname || '').replace(/\/+$/, '') || '/';

    // Don't update URL if already on correct path
    if (view === VIEWS.LIVE_MATCH) {
      // Live match view should maintain /live/{matchId} path
      // Don't change it
      return;
    }

    // If not on live match view and path is /live/*, navigate to home
    if (normalizedPath.startsWith('/live/')) {
      window.history.replaceState(window.history.state, '', '/');
    }
  }, [view]);
}
