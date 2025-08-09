import { useState, useRef, useEffect, useCallback } from 'react';

export const useQuickTapWithScrollDetection = (callback, ms = 150) => {
  const [startTap, setStartTap] = useState(false);
  const callbackRef = useRef(callback);
  const initialTouchPos = useRef({ x: 0, y: 0 });
  const hasScrolled = useRef(false);
  const pressStartTime = useRef(null);
  const timerId = useRef(null);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const startPress = (clientX, clientY) => {
    initialTouchPos.current = { x: clientX, y: clientY };
    hasScrolled.current = false;
    pressStartTime.current = Date.now();
    setStartTap(true);
    
    // Set timeout to cancel the potential callback if held too long
    timerId.current = setTimeout(() => {
      // If we reach this timeout, the press was too long - cancel any potential callback
      hasScrolled.current = true; // Use scroll flag to prevent callback
    }, ms);
  };

  const endPress = useCallback(() => {
    if (pressStartTime.current && !hasScrolled.current) {
      const pressDuration = Date.now() - pressStartTime.current;
      // Only trigger callback if the press was quick enough (less than threshold)
      if (pressDuration < ms) {
        callbackRef.current();
      }
    }
    
    setStartTap(false);
    pressStartTime.current = null;
    if (timerId.current) {
      clearTimeout(timerId.current);
      timerId.current = null;
    }
  }, [ms]);

  const handleMove = useCallback((clientX, clientY) => {
    if (startTap) {
      const moveThreshold = 10; // pixels
      const deltaX = Math.abs(clientX - initialTouchPos.current.x);
      const deltaY = Math.abs(clientY - initialTouchPos.current.y);
      
      if (deltaX > moveThreshold || deltaY > moveThreshold) {
        hasScrolled.current = true;
        endPress();
      }
    }
  }, [startTap, endPress]);

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    }
  }, [handleMove]);

  const handleMouseMove = useCallback((e) => {
    handleMove(e.clientX, e.clientY);
  }, [handleMove]);

  useEffect(() => {
    if (startTap) {
      document.addEventListener('touchmove', handleTouchMove, { passive: true });
      document.addEventListener('mousemove', handleMouseMove);
      
      return () => {
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('mousemove', handleMouseMove);
      };
    }
  }, [startTap, handleTouchMove, handleMouseMove]);

  useEffect(() => {
    return () => {
      if (timerId.current) {
        clearTimeout(timerId.current);
      }
    };
  }, []);

  return {
    onTouchStart: (e) => {
      const touch = e.touches[0];
      startPress(touch.clientX, touch.clientY);
    },
    onTouchEnd: (e) => {
      endPress();
    },
    onMouseDown: (e) => {
      e.preventDefault();
      startPress(e.clientX, e.clientY);
    },
    onMouseUp: (e) => {
      e.preventDefault();
      endPress();
    },
    onMouseLeave: endPress
  };
};