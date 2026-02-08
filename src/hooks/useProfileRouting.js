import { useEffect, useRef } from 'react';
import { VIEWS } from '../constants/viewConstants';

export function useProfileRouting(view, navigateToView) {
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
          if (redirect === '/profile') {
            normalizedPath = '/profile';
            sessionStorage.removeItem('redirect');
            console.log('[useProfileRouting] Reading from sessionStorage redirect:', normalizedPath);
          }
        } catch (e) {
          console.warn('[useProfileRouting] Could not read sessionStorage:', e);
        }
      }

      initialPathRef.current = normalizedPath;
    }

    if (initialRouteHandledRef.current) {
      return;
    }

    if (initialPathRef.current === '/profile') {
      navigateToView?.(VIEWS.PROFILE);
    }

    initialRouteHandledRef.current = true;
  }, [navigateToView]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const normalizedPath = (window.location.pathname || '').replace(/\/+$/, '') || '/';

    // Only manage /profile URLs — don't touch other routes
    let targetPath = null;
    if (view === VIEWS.PROFILE) {
      targetPath = '/profile';
    } else if (normalizedPath === '/profile') {
      // Leaving profile view while URL still shows /profile — clean up to /
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
