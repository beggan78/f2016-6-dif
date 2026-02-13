import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const iconColorMap = {
  sky: { bg: 'bg-sky-500/20', text: 'text-sky-400' },
  rose: { bg: 'bg-rose-500/20', text: 'text-rose-400' },
  emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  amber: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  blue: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
};

const maxWidthMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  '2xl': 'max-w-2xl',
};

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function ModalShell({
  children,
  title,
  subtitle,
  icon: Icon,
  iconColor = 'sky',
  onClose,
  maxWidth = 'md',
  className = '',
}) {
  const isRich = Boolean(Icon);
  const maxWidthClass = maxWidthMap[maxWidth] || maxWidthMap.md;
  const colors = iconColorMap[iconColor] || iconColorMap.sky;
  const dialogRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement;

    if (dialogRef.current && !dialogRef.current.contains(document.activeElement)) {
      dialogRef.current.focus();
    }

    return () => {
      if (
        previouslyFocusedRef.current &&
        document.body.contains(previouslyFocusedRef.current)
      ) {
        previouslyFocusedRef.current.focus();
      }
    };
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && onClose) {
      e.stopPropagation();
      onClose();
      return;
    }

    if (e.key === 'Tab' && dialogRef.current) {
      const focusable = dialogRef.current.querySelectorAll(FOCUSABLE_SELECTOR);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const handleBackdropClick = (e) => {
    if (onClose && e.target === e.currentTarget) {
      onClose();
    }
  };

  const closeButtonClasses =
    'text-slate-400 hover:text-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-800 rounded';

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        className={`bg-slate-800 rounded-lg shadow-xl ${maxWidthClass} w-full border border-slate-600 ${isRich ? 'relative' : ''} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
      >
        {isRich ? (
          <>
            {onClose && (
              <button
                className={`absolute top-3 right-3 ${closeButtonClasses}`}
                onClick={onClose}
              >
                <X className="w-5 h-5" />
              </button>
            )}
            <div className="p-6">
              <div className="flex items-center space-x-4 mb-4">
                <div
                  className={`w-12 h-12 ${colors.bg} rounded-full flex items-center justify-center flex-shrink-0`}
                >
                  <Icon className={`w-6 h-6 ${colors.text}`} />
                </div>
                <div>
                  <h3
                    id="modal-title"
                    className="text-xl font-semibold text-slate-100"
                  >
                    {title}
                  </h3>
                  {subtitle && (
                    <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
                  )}
                </div>
              </div>
              {children}
            </div>
          </>
        ) : (
          <>
            <div className="p-4 border-b border-slate-600 flex items-center justify-between">
              <h3
                id="modal-title"
                className="text-lg font-semibold text-sky-300"
              >
                {title}
              </h3>
              {onClose && (
                <button className={closeButtonClasses} onClick={onClose}>
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            <div className="p-4">{children}</div>
          </>
        )}
      </div>
    </div>
  );
}
