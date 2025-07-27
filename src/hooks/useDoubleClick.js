import { useRef, useCallback } from 'react';

/**
 * Custom hook for handling double-click/double-tap detection
 * Provides consistent double-click behavior across touch and mouse devices
 * 
 * @param {Function} onDoubleClick - Callback function to execute on double-click
 * @param {number} delay - Maximum time between clicks to register as double-click (default: 300ms)
 * 
 * @returns {Object} Event handlers for different interaction types
 */
export function useDoubleClick(onDoubleClick, delay = 300) {
  const lastTapRef = useRef(0);
  const tapTimeoutRef = useRef(null);

  const handleDoubleClick = useCallback(() => {
    onDoubleClick?.();
  }, [onDoubleClick]);

  // Custom double-tap detection for better touch device support
  const handleTouchStart = useCallback((event) => {
    const now = Date.now();
    const timeDiff = now - lastTapRef.current;
    
    if (timeDiff < delay && timeDiff > 0) {
      // Double tap detected
      event.preventDefault();
      event.stopPropagation();
      onDoubleClick?.();
      lastTapRef.current = 0; // Reset to prevent triple-tap
    } else {
      // Single tap - start timeout for potential double tap
      lastTapRef.current = now;
      
      // Clear any existing timeout
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
      }
      
      // Set timeout to reset tap timing
      tapTimeoutRef.current = setTimeout(() => {
        lastTapRef.current = 0;
      }, delay);
    }
  }, [onDoubleClick, delay]);

  return {
    onDoubleClick: handleDoubleClick,
    onTouchStart: handleTouchStart
  };
}