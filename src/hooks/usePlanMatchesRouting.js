import { useEffect, useRef } from 'react';
import { VIEWS } from '../constants/viewConstants';

export function usePlanMatchesRouting(view, navigateToView) {
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
          if (redirect === '/plan') {
            normalizedPath = '/plan';
            sessionStorage.removeItem('redirect');
            console.log('[usePlanMatchesRouting] Reading from sessionStorage redirect:', normalizedPath);
          }
        } catch (e) {
          console.warn('[usePlanMatchesRouting] Could not read sessionStorage:', e);
        }
      }

      initialPathRef.current = normalizedPath;
    }

    if (initialRouteHandledRef.current) {
      return;
    }

    if (initialPathRef.current === '/plan') {
      navigateToView?.(VIEWS.TEAM_MATCHES);
    }

    initialRouteHandledRef.current = true;
  }, [navigateToView]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const normalizedPath = (window.location.pathname || '').replace(/\/+$/, '') || '/';

    // Only manage /plan URLs — don't touch other routes
    let targetPath = null;
    if (view === VIEWS.TEAM_MATCHES || view === VIEWS.PLAN_MATCHES) {
      targetPath = '/plan';
    } else if (normalizedPath === '/plan') {
      // Leaving plan views while URL still shows /plan — clean up to /
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
