import { useEffect, useRef } from 'react';

/**
 * Factory that creates a path-based routing hook.
 *
 * Each generated hook handles:
 *  1. Initial route detection (URL or sessionStorage fallback)
 *  2. URL sync when the view changes (replaceState)
 *
 * @param {Object} config
 * @param {string}   config.path           - URL path to own, e.g. '/profile'
 * @param {string}   config.navigateTarget - VIEWS constant to navigate to on initial detection
 * @param {string[]} [config.activeViews]  - View constants that keep this path active
 *                                           (defaults to [navigateTarget])
 * @param {string}   config.hookName       - Name used in console logs
 * @returns {Function} A React hook with signature (view, navigateToView) => void
 */
export function createPathRoutingHook({ path, navigateTarget, activeViews, hookName }) {
  const viewSet = new Set(activeViews || [navigateTarget]);

  return function usePathRouting(view, navigateToView) {
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
            if (redirect === path) {
              normalizedPath = path;
              sessionStorage.removeItem('redirect');
              console.log(`[${hookName}] Reading from sessionStorage redirect:`, normalizedPath);
            }
          } catch (e) {
            console.warn(`[${hookName}] Could not read sessionStorage:`, e);
          }
        }

        initialPathRef.current = normalizedPath;
      }

      if (initialRouteHandledRef.current) {
        return;
      }

      if (initialPathRef.current === path && !viewSet.has(view)) {
        navigateToView?.(navigateTarget);
      }

      initialRouteHandledRef.current = true;
    }, [navigateToView, view]);

    useEffect(() => {
      if (typeof window === 'undefined') {
        return;
      }

      const normalizedPath = (window.location.pathname || '').replace(/\/+$/, '') || '/';

      let targetPath = null;
      if (viewSet.has(view)) {
        targetPath = path;
      } else if (normalizedPath === path) {
        targetPath = '/';
      }

      if (targetPath !== null && normalizedPath !== targetPath) {
        const search = window.location.search || '';
        const hash = window.location.hash || '';
        const newUrl = `${targetPath}${search}${hash}`;
        window.history.replaceState(window.history.state, '', newUrl);
      }
    }, [view]);
  };
}
