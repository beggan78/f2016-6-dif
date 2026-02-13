import React from 'react';
import { useTranslation } from 'react-i18next';
import { User } from 'lucide-react';
import { Button } from '../shared/UI';
import { ModalShell } from '../shared/ModalShell';
import { Card } from '../shared/Card';
import { VIEWS } from '../../constants/viewConstants';
import { useAuth } from '../../contexts/AuthContext';

/**
 * ProfileCompletionPrompt - Prompts new users to complete their profile
 * 
 * Shows after email confirmation when user doesn't have a name set
 * 
 * @param {Object} props
 * @param {Function} props.setView - Function to navigate to different views
 * @param {Function} props.onClose - Optional callback to close/dismiss the prompt
 * @returns {React.ReactNode}
 */
export function ProfileCompletionPrompt({ setView, onClose }) {
  const { t } = useTranslation('auth');
  const { markProfileCompleted } = useAuth();

  const handleCompleteProfile = () => {
    markProfileCompleted();
    setView(VIEWS.PROFILE);
  };

  const handleSkipForNow = () => {
    markProfileCompleted();
    if (onClose) {
      onClose();
    }
  };

  return (
    <ModalShell title={t('profileCompletion.welcome')} subtitle={t('profileCompletion.subtitle')} icon={User} iconColor="sky">
        {/* Benefits */}
        <Card className="mb-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">{t('profileCompletion.benefitsTitle')}</h3>
          <ul className="space-y-2 text-sm text-slate-400">
            <li className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{t('profileCompletion.benefits.personalize')}</span>
            </li>
            <li className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{t('profileCompletion.benefits.displayName')}</span>
            </li>
            <li className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{t('profileCompletion.benefits.preferences')}</span>
            </li>
          </ul>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={handleCompleteProfile}
            variant="primary"
            size="lg"
            className="w-full"
          >
            {t('profileCompletion.completeButton')}
          </Button>

          <button
            onClick={handleSkipForNow}
            className="w-full text-slate-400 hover:text-slate-300 text-sm transition-colors py-2"
          >
            {t('profileCompletion.skipButton')}
          </button>
        </div>

        {/* Fine Print */}
        <p className="text-xs text-slate-500 mt-4 text-center">
          {t('profileCompletion.finePrint')}
        </p>
    </ModalShell>
  );
}