import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../shared/UI';
import { AlertTriangle, X } from 'lucide-react';

/**
 * Modal to warn users before abandoning an active match
 *
 * Shows different messages based on match state:
 * - Running match: Warns about losing active match data
 *
 * @param {boolean} isOpen - Whether modal is visible
 * @param {function} onAbandon - Called when user confirms abandonment
 * @param {function} onCancel - Called when user cancels abandonment
 * @param {boolean} isMatchRunning - Whether match is currently running
 */
export function AbandonMatchModal({
  isOpen,
  onAbandon,
  onCancel,
  isMatchRunning
}) {
  const { t } = useTranslation('modals');

  if (!isOpen) return null;

  // Determine warning message based on match state
  const getWarningContent = () => {
    if (isMatchRunning) {
      return {
        title: t('abandonMatch.titleRunning'),
        message: t('abandonMatch.messageRunning'),
        subtitle: t('abandonMatch.subtitleRunning'),
        icon: <AlertTriangle className="w-6 h-6 text-amber-400" />,
        iconBg: 'bg-amber-600'
      };
    } else {
      return {
        title: t('abandonMatch.titleNotRunning'),
        message: t('abandonMatch.messageNotRunning'),
        subtitle: t('abandonMatch.subtitleNotRunning'),
        icon: <AlertTriangle className="w-6 h-6 text-blue-400" />,
        iconBg: 'bg-blue-600'
      };
    }
  };

  const { title, message, subtitle, icon, iconBg } = getWarningContent();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg border border-slate-600 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-600">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 ${iconBg} rounded-full flex items-center justify-center`}>
              {icon}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
              <p className="text-sm text-slate-400">
                {subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-slate-200 mb-6 leading-relaxed">
            {message}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={onCancel}
              variant="accent"
              className="w-full"
            >
              {t('abandonMatch.cancel')}
            </Button>
            <Button
              onClick={onAbandon}
              variant="danger"
              className="w-full"
            >
              {isMatchRunning ? t('abandonMatch.abandonMatch') : t('abandonMatch.startNewGame')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
