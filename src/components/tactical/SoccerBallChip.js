import React, { useCallback, useRef } from 'react';

export function SoccerBallChip({ 
  id, 
  x, 
  y, 
  variation = 'ball-v1',
  number,
  onPointerStart, 
  onDoubleClick,
  isInPalette = false,
  style = {}
}) {
  const lastTapRef = useRef(0);
  const tapTimeoutRef = useRef(null);

  const handlePointerStart = useCallback((event) => {
    onPointerStart?.(event);
  }, [onPointerStart]);

  const handleDoubleClick = useCallback(() => {
    onDoubleClick?.();
  }, [onDoubleClick]);

  // Custom double-tap detection for better touch device support
  const handleTouchStart = useCallback((event) => {
    const now = Date.now();
    const timeDiff = now - lastTapRef.current;
    
    if (timeDiff < 300 && timeDiff > 0) {
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
      }, 300);
    }
  }, [onDoubleClick]);

  return (
    <div
      className={`
        ${isInPalette ? 'relative' : 'absolute'} 
        w-4 h-4 sm:w-5 sm:h-5 
        rounded-full 
        cursor-move 
        select-none 
        shadow-lg
        hover:shadow-xl
        transition-all
        duration-200
        transform
        hover:scale-105
        overflow-hidden
      `}
      style={{
        ...(isInPalette
          ? {}
          : {
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 10
            }),
        touchAction: 'none',
        ...style
      }}
      onPointerDown={handlePointerStart}
      onDoubleClick={handleDoubleClick}
      onTouchStart={handleTouchStart}
    >
      {/* Soccer ball pattern variations */}
      <div className="absolute inset-0 bg-white rounded-full">
        {variation === 'ball-v1' && (
          <>
            {/* 1: Centered pentagon with three accent dots */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-black" style={{clipPath: 'polygon(50% 0%, 95% 35%, 78% 90%, 22% 90%, 5% 35%)'}}></div>
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0.5 h-0.5 bg-black rounded-full"></div>
            <div className="absolute bottom-0 left-1/4 w-0.5 h-0.5 bg-black rounded-full"></div>
            <div className="absolute bottom-0 right-1/4 w-0.5 h-0.5 bg-black rounded-full"></div>
          </>
        )}
      </div>
      
      {/* Number display for palette */}
      {isInPalette && number && (
        <span className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-sm font-bold text-white bg-slate-900 rounded px-1">
          {number}
        </span>
      )}
    </div>
  );
}