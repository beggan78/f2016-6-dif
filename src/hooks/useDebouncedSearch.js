import { useRef, useEffect, useCallback } from 'react';

/**
 * Provides a debounced wrapper around a search callback.
 *
 * @param {Function} callback - The function to invoke after the debounce delay
 * @param {number} [delay=300] - Delay in milliseconds before the callback executes
 * @returns {{ run: Function, cancel: Function }}
 */
export function useDebouncedSearch(callback, delay = 300) {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef(null);

  // Keep latest callback without recreating the debounced function
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const run = useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callbackRef.current?.(...args);
    }, delay);
  }, [delay]);

  return { run, cancel };
}
