import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../shared/UI';
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
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-lg border border-slate-600 max-w-md w-full p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-sky-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-sky-300">{t('profileCompletion.welcome')}</h2>
          <p className="text-slate-400 mt-2">{t('profileCompletion.subtitle')}</p>
        </div>

        {/* Benefits */}
        <div className="bg-slate-700 rounded-lg p-4 mb-6">
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
        </div>

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
      </div>
    </div>
  );
}