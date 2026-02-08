import { useEffect, useRef } from 'react';
import { VIEWS } from '../constants/viewConstants';

export function useTacticalBoardRouting(view, navigateToView) {
  const initialPathRef = useRef(null);
  const initialRouteHandledRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      initialRouteHandledRef.current = true;
      return;
    }

    if (initialPathRef.current === null) {
      let normalizedPath = (window.location.pathname || '').replace(/\/+$/, '') || '/';

      // Fallback to sessionStorage redirect if path is '/'
      if (normalizedPath === '/') {
        try {
          const redirect = sessionStorage.getItem('redirect');
          if (redirect === '/tactics') {
            normalizedPath = '/tactics';
            sessionStorage.removeItem('redirect');
            console.log('[useTacticalBoardRouting] Reading from sessionStorage redirect:', normalizedPath);
          }
        } catch (e) {
          console.warn('[useTacticalBoardRouting] Could not read sessionStorage:', e);
        }
      }

      initialPathRef.current = normalizedPath;
    }

    if (initialRouteHandledRef.current) {
      return;
    }

    if (initialPathRef.current === '/tactics') {
      navigateToView?.(VIEWS.TACTICAL_BOARD);
    }

    initialRouteHandledRef.current = true;
  }, [navigateToView]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const normalizedPath = (window.location.pathname || '').replace(/\/+$/, '') || '/';

    // Only manage /tactics URLs — don't touch other routes
    let targetPath = null;
    if (view === VIEWS.TACTICAL_BOARD) {
      targetPath = '/tactics';
    } else if (normalizedPath === '/tactics') {
      // Leaving tactical board view while URL still shows /tactics — clean up to /
      targetPath = '/';
    }

    if (targetPath !== null && normalizedPath !== targetPath) {
      const search = window.location.search || '';
      const hash = window.location.hash || '';
      const newUrl = `${targetPath}${search}${hash}`;
      window.history.replaceState(window.history.state, '', newUrl);
    }
  }, [view]);
}
