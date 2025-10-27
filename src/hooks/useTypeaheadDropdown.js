import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Shared dropdown logic for typeahead/autocomplete inputs.
 * Handles open/close state, outside clicks, blur delays, and Escape key handling.
 *
 * @param {Object} [options]
 * @param {string} [options.initialValue=''] - Initial query value
 * @param {number} [options.blurCloseDelay=150] - Delay before closing after blur (ms)
 * @returns {{
 *   isOpen: boolean,
 *   setIsOpen: Function,
 *   query: string,
 *   setQuery: Function,
 *   containerRef: React.MutableRefObject,
 *   inputRef: React.MutableRefObject,
 *   handleFocus: Function,
 *   handleBlur: Function,
 *   handleKeyDown: Function
 * }}
 */
export function useTypeaheadDropdown(options = {}) {
  const { initialValue = '', blurCloseDelay = 150 } = options;

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(initialValue);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const blurTimeoutRef = useRef(null);

  const clearBlurTimeout = useCallback(() => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
  }, []);

  const handleFocus = useCallback(() => {
    clearBlurTimeout();
    setIsOpen(true);
  }, [clearBlurTimeout]);

  const handleBlur = useCallback(() => {
    clearBlurTimeout();
    blurTimeoutRef.current = setTimeout(() => setIsOpen(false), blurCloseDelay);
  }, [blurCloseDelay, clearBlurTimeout]);

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      if (inputRef.current) {
        inputRef.current.blur();
      }
    }
  }, []);

  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    return () => {
      clearBlurTimeout();
    };
  }, [clearBlurTimeout]);

  return {
    isOpen,
    setIsOpen,
    query,
    setQuery,
    containerRef,
    inputRef,
    handleFocus,
    handleBlur,
    handleKeyDown
  };
}
