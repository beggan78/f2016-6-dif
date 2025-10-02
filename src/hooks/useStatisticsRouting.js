import { useEffect, useRef } from 'react';
import { VIEWS } from '../constants/viewConstants';

export function useStatisticsRouting(view, navigateToView) {
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

    if (initialPathRef.current === '/stats') {
      navigateToView?.(VIEWS.STATISTICS);
    }

    initialRouteHandledRef.current = true;
  }, [navigateToView]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const normalizedPath = (window.location.pathname || '').replace(/\/+$/, '') || '/';
    const targetPath = view === VIEWS.STATISTICS ? '/stats' : '/';

    if (normalizedPath !== targetPath) {
      const search = window.location.search || '';
      const hash = window.location.hash || '';
      const newUrl = `${targetPath}${search}${hash}`;
      window.history.replaceState(window.history.state, '', newUrl);
    }
  }, [view]);
}
