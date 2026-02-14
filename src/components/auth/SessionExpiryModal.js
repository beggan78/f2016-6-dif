import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { ModalShell } from '../shared/ModalShell';
import { Button } from '../shared/UI';

export function SessionExpiryModal({
  isOpen,
  onExtend,
  onDismiss,
  onSignOut,
  sessionExpiry,
  loading
}) {
  const { t } = useTranslation('auth');
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isExtending, setIsExtending] = useState(false);

  // Update countdown timer
  useEffect(() => {
    if (!isOpen || !sessionExpiry) return;

    const updateTimer = () => {
      const now = Date.now();
      const expiry = sessionExpiry.getTime();
      const remaining = expiry - now;

      if (remaining <= 0) {
        setTimeRemaining(t('sessionExpiry.expired'));
        return;
      }

      const minutes = Math.floor(remaining / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      if (minutes > 0) {
        setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setTimeRemaining(t('sessionExpiry.seconds', { count: seconds }));
      }
    };

    // Update immediately
    updateTimer();
    
    // Update every second
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [isOpen, sessionExpiry, t]);

  const handleExtend = async () => {
    setIsExtending(true);
    try {
      const success = await onExtend();
      if (!success) {
        // If extension failed, show error state but keep modal open
        console.error('Session extension failed');
      }
    } catch (error) {
      console.error('Error extending session:', error);
    } finally {
      setIsExtending(false);
    }
  };

  const handleSignOut = () => {
    onSignOut();
  };

  if (!isOpen) return null;

  return (
    <ModalShell
      title={t('sessionExpiry.title')}
      icon={AlertTriangle}
      iconColor="amber"
      maxWidth="lg"
    >
              <div className="space-y-3">
                <p className="text-sm text-slate-300">
                  {t('sessionExpiry.message', { time: timeRemaining }).split(timeRemaining)[0]}
                  <span className="font-semibold text-amber-400">{timeRemaining}</span>
                  {t('sessionExpiry.message', { time: timeRemaining }).split(timeRemaining)[1]}
                </p>

                <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs text-slate-400">
                      {t('sessionExpiry.autoSaveInfo')}
                    </p>
                  </div>
                </div>
              </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row-reverse gap-3 pt-4 border-t border-slate-600 mt-4">
            <Button
              onClick={handleExtend}
              disabled={isExtending || loading}
              variant="primary"
              className="w-full sm:w-auto"
            >
              {isExtending ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('sessionExpiry.extendingButton')}
                </span>
              ) : (
                t('sessionExpiry.extendButton')
              )}
            </Button>

            <Button
              onClick={onDismiss}
              disabled={isExtending || loading}
              variant="secondary"
              className="w-full sm:w-auto"
            >
              {t('sessionExpiry.continueButton')}
            </Button>

            <Button
              onClick={handleSignOut}
              disabled={isExtending || loading}
              variant="secondary"
              className="w-full sm:w-auto text-rose-300 hover:text-rose-200 hover:bg-rose-900/50"
            >
              {t('sessionExpiry.signOutButton')}
            </Button>
          </div>
    </ModalShell>
  );
}