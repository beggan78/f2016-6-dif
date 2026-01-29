import React, { useState, useRef, useEffect } from 'react';

/**
 * Custom tooltip component designed for mobile/tablet use
 * Opens on click/tap rather than hover
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Trigger element (e.g., icon button)
 * @param {React.ReactNode} props.content - Tooltip content to display
 * @param {string} props.position - Position of tooltip: 'top' | 'bottom' | 'left' | 'right'
 * @param {string} props.trigger - Trigger mode: 'click' | 'hover'
 * @param {string} props.className - Additional classes for the trigger container
 * @param {string} props.contentClassName - Additional classes for the tooltip content container
 */
export function Tooltip({
  children,
  content,
  position = 'bottom',
  trigger = 'click',
  className = '',
  contentClassName = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const isHoverTrigger = trigger === 'hover';

  // Close tooltip when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const toggleTooltip = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const openTooltip = () => setIsOpen(true);
  const closeTooltip = () => setIsOpen(false);

  // Position classes for tooltip
  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'bottom-full mb-2 left-1/2 transform -translate-x-1/2';
      case 'bottom':
        return 'top-full mt-2 left-1/2 transform -translate-x-1/2';
      case 'left':
        return 'right-full mr-2 top-1/2 transform -translate-y-1/2';
      case 'right':
        return 'left-full ml-2 top-1/2 transform -translate-y-1/2';
      default:
        return 'top-full mt-2 left-1/2 transform -translate-x-1/2';
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${className}`}
      onMouseEnter={isHoverTrigger ? openTooltip : undefined}
      onMouseLeave={isHoverTrigger ? closeTooltip : undefined}
    >
      {/* Trigger element */}
      <div
        onClick={isHoverTrigger ? undefined : toggleTooltip}
        onFocus={isHoverTrigger ? openTooltip : undefined}
        onBlur={isHoverTrigger ? closeTooltip : undefined}
        className="cursor-pointer"
      >
        {children}
      </div>

      {/* Tooltip content */}
      {isOpen && (
        <div
          className={`absolute z-50 ${getPositionClasses()}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`bg-slate-700 border border-slate-500 rounded-lg shadow-xl p-3 max-w-md min-w-[18rem] whitespace-normal ${contentClassName}`}>
            {content}
          </div>
        </div>
      )}
    </div>
  );
}
