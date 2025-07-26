import React, { useCallback, useRef } from 'react';

const CHIP_COLORS = {
  white: 'bg-white text-slate-900 border-slate-300',
  red: 'bg-red-500 text-white border-red-600',
  blue: 'bg-blue-500 text-white border-blue-600',
  yellow: 'bg-yellow-500 text-slate-900 border-yellow-600',
  green: 'bg-green-500 text-white border-green-600',
  orange: 'bg-orange-500 text-white border-orange-600',
  purple: 'bg-purple-500 text-white border-purple-600',
  black: 'bg-slate-800 text-white border-slate-700',
  djurgarden: 'bg-sky-400 text-white border-sky-500'
};

export function PlayerChip({ 
  id, 
  color, 
  number, 
  x, 
  y, 
  onPointerStart, 
  onDoubleClick,
  isInPalette = false 
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

  const chipClasses = CHIP_COLORS[color] || CHIP_COLORS.white;
  
  // Special styling for Djurgården striped jersey
  const isDjurgarden = color === 'djurgarden';

  return (
    <div
      className={`
        ${isInPalette ? 'relative' : 'absolute'} 
        w-7 h-7 sm:w-8 sm:h-8 
        rounded-full 
        border-2 
        ${chipClasses}
        cursor-move 
        select-none 
        flex 
        items-center 
        justify-center 
        font-bold 
        text-xs 
        sm:text-sm
        shadow-lg
        hover:shadow-xl
        transition-all
        duration-200
        transform
        hover:scale-105
        ${isDjurgarden ? 'overflow-hidden' : ''}
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
        touchAction: 'none'
      }}
      onPointerDown={handlePointerStart}
      onDoubleClick={handleDoubleClick}
      onTouchStart={handleTouchStart}
    >
      {/* Djurgården striped pattern (winner: #3 - slightly thicker stripes) */}
      {isDjurgarden && (
        <div className="absolute inset-0 rounded-full overflow-hidden bg-sky-400">
          <div className="absolute top-0 bottom-0 bg-blue-800" style={{left: '13.5%', width: '16%'}}></div>
          <div className="absolute top-0 bottom-0 bg-blue-800" style={{left: '42%', width: '16%'}}></div>
          <div className="absolute top-0 bottom-0 bg-blue-800" style={{left: '70.5%', width: '16%'}}></div>
        </div>
      )}
      
      {/* Number display */}
      <span className="relative z-10 font-bold">
        {number}
      </span>
    </div>
  );
}