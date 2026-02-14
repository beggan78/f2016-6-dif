import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../shared/UI';
import { ModalShell } from '../shared/ModalShell';
import { AlertTriangle } from 'lucide-react';

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

  const title = isMatchRunning ? t('abandonMatch.titleRunning') : t('abandonMatch.titleNotRunning');
  const message = isMatchRunning ? t('abandonMatch.messageRunning') : t('abandonMatch.messageNotRunning');
  const subtitle = isMatchRunning ? t('abandonMatch.subtitleRunning') : t('abandonMatch.subtitleNotRunning');

  return (
    <ModalShell
      title={title}
      subtitle={subtitle}
      icon={AlertTriangle}
      iconColor={isMatchRunning ? 'amber' : 'blue'}
      onClose={onCancel}
    >
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
    </ModalShell>
  );
}
