import { useState, useRef, useEffect, useCallback } from 'react';

export const useLongPressWithScrollDetection = (callback, ms = 500) => {
  const [startLongPress, setStartLongPress] = useState(false);
  const callbackRef = useRef(callback);
  const initialTouchPos = useRef({ x: 0, y: 0 });
  const hasScrolled = useRef(false);
  const timerId = useRef(null);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const startPress = (clientX, clientY) => {
    initialTouchPos.current = { x: clientX, y: clientY };
    hasScrolled.current = false;
    setStartLongPress(true);
    
    timerId.current = setTimeout(() => {
      if (!hasScrolled.current) {
        callbackRef.current();
      }
    }, ms);
  };

  const endPress = () => {
    setStartLongPress(false);
    if (timerId.current) {
      clearTimeout(timerId.current);
      timerId.current = null;
    }
  };

  const handleMove = useCallback((clientX, clientY) => {
    if (startLongPress) {
      const moveThreshold = 10; // pixels
      const deltaX = Math.abs(clientX - initialTouchPos.current.x);
      const deltaY = Math.abs(clientY - initialTouchPos.current.y);
      
      if (deltaX > moveThreshold || deltaY > moveThreshold) {
        hasScrolled.current = true;
        endPress();
      }
    }
  }, [startLongPress]);

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
    if (startLongPress) {
      document.addEventListener('touchmove', handleTouchMove, { passive: true });
      document.addEventListener('mousemove', handleMouseMove);
      
      return () => {
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('mousemove', handleMouseMove);
      };
    }
  }, [startLongPress, handleTouchMove, handleMouseMove]);

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