import React from 'react';
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

  const handleBackdropClick = (e) => {
    if (onClose && e.target === e.currentTarget) {
      onClose();
    }
  };

  const closeButtonClasses =
    'text-slate-400 hover:text-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-800 rounded';

  if (isRich) {
    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={handleBackdropClick}
      >
        <div
          className={`bg-slate-800 rounded-lg shadow-xl ${maxWidthClass} w-full border border-slate-600 relative ${className}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          onClick={(e) => e.stopPropagation()}
        >
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
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div
        className={`bg-slate-800 rounded-lg shadow-xl ${maxWidthClass} w-full border border-slate-600 ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
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
      </div>
    </div>
  );
}
