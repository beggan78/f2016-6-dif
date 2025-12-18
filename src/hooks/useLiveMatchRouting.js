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
 * @param {string|null} activeMatchId - Currently selected live match ID (for programmatic navigation)
 */
export function useLiveMatchRouting(view, navigateToView, setLiveMatchId, activeMatchId = null) {
  const initialPathRef = useRef(null);
  const initialRouteHandledRef = useRef(false);
  const currentMatchIdRef = useRef(null);
  const hasSyncedInitialLiveRouteRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      initialRouteHandledRef.current = true;
      return;
    }

    if (initialPathRef.current === null) {
      // Try window.location.pathname first
      let normalizedPath = (window.location.pathname || '').replace(/\/+$/, '') || '/';

      // Fallback to sessionStorage redirect if path is '/'
      if (normalizedPath === '/') {
        try {
          const redirect = sessionStorage.getItem('redirect');
          if (redirect) {
            normalizedPath = redirect.replace(/\/+$/, '') || '/';
            console.log('[useLiveMatchRouting] Reading from sessionStorage redirect:', normalizedPath);
          }
        } catch (e) {
          console.warn('[useLiveMatchRouting] Could not read sessionStorage:', e);
        }
      }

      initialPathRef.current = normalizedPath;
      console.log('[useLiveMatchRouting] Initial path captured:', initialPathRef.current);
    }

    if (initialRouteHandledRef.current) {
      return;
    }

    // Match /live/{matchId} pattern with UUID validation
    const liveMatchPattern = /^\/live\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;
    const match = initialPathRef.current.match(liveMatchPattern);

    if (match && match[1]) {
      const matchId = match[1];
      console.log('[useLiveMatchRouting] Detected /live/ route, matchId:', matchId);
      currentMatchIdRef.current = matchId;
      setLiveMatchId(matchId);
      navigateToView?.(VIEWS.LIVE_MATCH);

      // Clean up sessionStorage now that we've successfully detected the route
      try {
        sessionStorage.removeItem('redirect');
        console.log('[useLiveMatchRouting] Cleared sessionStorage redirect');
      } catch (e) {
        // Ignore if sessionStorage is unavailable
      }
    }

    initialRouteHandledRef.current = true;
  }, [navigateToView, setLiveMatchId]);

  useEffect(() => {
    if (activeMatchId && activeMatchId !== currentMatchIdRef.current) {
      currentMatchIdRef.current = activeMatchId;
    }
  }, [activeMatchId]);

  // Update URL when navigating to/from live match view
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const normalizedPath = (window.location.pathname || '').replace(/\/+$/, '') || '/';
    const isLivePath = normalizedPath.startsWith('/live/');

    // Mark once we've synced the live view so subsequent view changes can update the URL
    if (isLivePath && view === VIEWS.LIVE_MATCH && currentMatchIdRef.current) {
      hasSyncedInitialLiveRouteRef.current = true;
    }

    // Avoid overriding a direct /live/{matchId} navigation before the view syncs
    if (
      isLivePath &&
      currentMatchIdRef.current &&
      !hasSyncedInitialLiveRouteRef.current &&
      view !== VIEWS.LIVE_MATCH
    ) {
      return;
    }

    // Calculate target path based on view (mirrors useStatisticsRouting pattern)
    let targetPath = '/';
    const resolvedMatchId = currentMatchIdRef.current || activeMatchId;
    if (view === VIEWS.LIVE_MATCH && resolvedMatchId) {
      targetPath = `/live/${resolvedMatchId}`;
    }

    console.log('[useLiveMatchRouting] URL sync:', {
      view,
      currentPath: normalizedPath,
      targetPath,
      willUpdate: normalizedPath !== targetPath
    });

    // Sync URL with target path
    if (normalizedPath !== targetPath) {
      const search = window.location.search || '';
      const hash = window.location.hash || '';
      const newUrl = `${targetPath}${search}${hash}`;
      window.history.replaceState(window.history.state, '', newUrl);

      // Mark sync when we programmatically set a live path so cleanup can occur later
      if (targetPath.startsWith('/live/')) {
        hasSyncedInitialLiveRouteRef.current = true;
      }
    }
  }, [activeMatchId, view]);
}
