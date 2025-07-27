import React, { useCallback } from 'react';
import { useDoubleClick } from '../../hooks/useDoubleClick';

/**
 * Base component for all tactical chips (Player and Soccer Ball)
 * Handles common functionality like positioning, drag events, and double-click detection
 * 
 * @param {Object} props - Component props
 * @param {string} props.id - Unique identifier for the chip
 * @param {number} props.x - X coordinate (percentage, 0-100)
 * @param {number} props.y - Y coordinate (percentage, 0-100)
 * @param {Function} props.onPointerStart - Drag start handler
 * @param {Function} props.onDoubleClick - Double-click handler
 * @param {boolean} props.isInPalette - Whether chip is in palette or on field
 * @param {Object} props.style - Additional styles to apply
 * @param {string} props.className - CSS classes for the chip
 * @param {React.ReactNode} props.children - Chip content (visual representation)
 * 
 * @returns {React.ReactElement} Rendered chip component
 */
export function BaseChip({ 
  id, 
  x = 0, 
  y = 0, 
  onPointerStart, 
  onDoubleClick,
  isInPalette = false,
  style = {},
  className = '',
  children,
  ...otherProps
}) {
  const handlePointerStart = useCallback((event) => {
    onPointerStart?.(event);
  }, [onPointerStart]);

  const doubleClickHandlers = useDoubleClick(onDoubleClick);

  const baseClasses = `
    ${isInPalette ? 'relative' : 'absolute'} 
    cursor-move 
    select-none 
    shadow-lg
    hover:shadow-xl
    transition-all
    duration-200
    transform
    hover:scale-105
  `.trim();

  const finalClassName = `${baseClasses} ${className}`.trim();

  const finalStyle = {
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
  };

  return (
    <div
      id={id}
      className={finalClassName}
      style={finalStyle}
      onPointerDown={handlePointerStart}
      onDoubleClick={doubleClickHandlers.onDoubleClick}
      onTouchStart={doubleClickHandlers.onTouchStart}
      {...otherProps}
    >
      {children}
    </div>
  );
}