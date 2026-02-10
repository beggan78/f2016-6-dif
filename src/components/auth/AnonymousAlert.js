import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../shared/Card';
import { useAuthModalIntegration } from '../../hooks/useAuthModalIntegration';
import { AuthButtonPair } from './AuthButtons';

/**
 * AnonymousAlert - User-friendly prompt for anonymous users to sign up
 * Provides contextual messaging about the benefits of authentication
 * 
 * @param {Object} props
 * @param {string} props.feature - Name of the feature being protected
 * @param {string} props.description - Description of why authentication is needed
 * @param {boolean} props.requireProfile - Whether user profile completion is needed
 * @param {string} props.title - Custom title (optional)
 * @param {Array} props.benefits - List of benefits for signing up
 * @param {string} props.variant - Visual style variant ('card' | 'inline' | 'minimal')
 * @param {React.ReactNode} props.icon - Custom icon component
 * @returns {React.ReactNode}
 */
export function AnonymousAlert({
  feature,
  description,
  requireProfile = false,
  title,
  benefits = [],
  variant = 'card',
  icon,
  authModal: authModalProp
}) {
  const { t } = useTranslation('auth');
  const authModal = useAuthModalIntegration(authModalProp);

  // Use translations with fallbacks
  const displayFeature = feature || t('anonymousAlert.defaultFeature');
  const displayDescription = description || t('anonymousAlert.defaultDescription');

  // Default benefits if none provided
  const defaultBenefits = [
    t('anonymousAlert.defaultBenefits.saveData'),
    t('anonymousAlert.defaultBenefits.accessHistory'),
    t('anonymousAlert.defaultBenefits.manageTeams'),
    t('anonymousAlert.defaultBenefits.neverLose')
  ];

  const displayBenefits = benefits.length > 0 ? benefits : defaultBenefits;
  const displayTitle = title || (requireProfile ? t('anonymousAlert.completeProfile') : t('anonymousAlert.signInToUse', { feature: displayFeature }));

  // Minimal variant for inline use
  if (variant === 'minimal') {
    return (
      <div className="text-center py-2">
        <p className="text-slate-400 text-sm mb-3">{displayDescription}</p>
        <AuthButtonPair
          authModal={authModal}
          variant="compact"
          signUpText={t('anonymousAlert.signUpButton')}
          className="justify-center"
        />
      </div>
    );
  }

  // Inline variant for embedding in existing layouts
  if (variant === 'inline') {
    return (
      <div className="bg-sky-900/20 border border-sky-600/50 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          {icon || (
            <div className="w-10 h-10 bg-sky-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          )}
          <div className="flex-1">
            <h3 className="font-semibold text-sky-300 text-sm">{displayTitle}</h3>
            <p className="text-slate-400 text-sm mt-1">{displayDescription}</p>
            <div className="mt-3">
              <AuthButtonPair
                authModal={authModal}
                variant="compact"
                signUpText={t('anonymousAlert.createAccountButton')}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default card variant - full-featured prompt
  return (
    <Card padding="lg">
      <div className="text-center">
        {/* Icon */}
        <div className="mx-auto w-16 h-16 bg-sky-600 rounded-full flex items-center justify-center mb-4">
          {icon || (
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {requireProfile ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              )}
            </svg>
          )}
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-sky-300 mb-2">
          {displayTitle}
        </h2>

        {/* Description */}
        <p className="text-slate-400 mb-6">
          {displayDescription}
        </p>

        {/* Benefits List */}
        {displayBenefits.length > 0 && (
          <div className="bg-slate-800 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">{t('anonymousAlert.benefitsTitle')}</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              {displayBenefits.map((benefit, index) => (
                <li key={index} className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <AuthButtonPair
          authModal={authModal}
          variant="stacked"
          signUpText={t('anonymousAlert.createFreeAccountButton')}
        />

        {/* Fine Print */}
        <p className="text-xs text-slate-500 mt-4">
          {t('anonymousAlert.finePrint')}
        </p>
      </div>
    </Card>
  );
}

/**
 * TeamManagementAlert - Specialized alert for team management features
 */
export function TeamManagementAlert(props) {
  const { t } = useTranslation('auth');

  return (
    <AnonymousAlert
      feature={t('anonymousAlert.teamManagement.feature')}
      title={t('anonymousAlert.teamManagement.title')}
      description={t('anonymousAlert.teamManagement.description')}
      benefits={[
        t('anonymousAlert.teamManagement.benefits.createRosters'),
        t('anonymousAlert.teamManagement.benefits.savePlayerInfo'),
        t('anonymousAlert.teamManagement.benefits.trackPerformance'),
        t('anonymousAlert.teamManagement.benefits.accessHistory'),
        t('anonymousAlert.teamManagement.benefits.syncDevices')
      ]}
      {...props}
    />
  );
}

/**
 * MatchHistoryAlert - Specialized alert for match history features
 */
export function MatchHistoryAlert(props) {
  const { t } = useTranslation('auth');

  return (
    <AnonymousAlert
      feature={t('anonymousAlert.matchHistory.feature')}
      title={t('anonymousAlert.matchHistory.title')}
      description={t('anonymousAlert.matchHistory.description')}
      benefits={[
        t('anonymousAlert.matchHistory.benefits.saveReports'),
        t('anonymousAlert.matchHistory.benefits.trackStats'),
        t('anonymousAlert.matchHistory.benefits.viewPatterns'),
        t('anonymousAlert.matchHistory.benefits.comparePerformance'),
        t('anonymousAlert.matchHistory.benefits.neverLoseData')
      ]}
      {...props}
    />
  );
}

/**
 * CloudSyncAlert - Specialized alert for cloud synchronization features
 */
export function CloudSyncAlert(props) {
  const { t } = useTranslation('auth');

  return (
    <AnonymousAlert
      feature={t('anonymousAlert.cloudSync.feature')}
      title={t('anonymousAlert.cloudSync.title')}
      description={t('anonymousAlert.cloudSync.description')}
      benefits={[
        t('anonymousAlert.cloudSync.benefits.accessAnywhere'),
        t('anonymousAlert.cloudSync.benefits.autoBackup'),
        t('anonymousAlert.cloudSync.benefits.neverLose'),
        t('anonymousAlert.cloudSync.benefits.shareInfo'),
        t('anonymousAlert.cloudSync.benefits.realTimeSync')
      ]}
      {...props}
    />
  );
}