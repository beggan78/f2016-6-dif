import React from 'react';
import { Button } from '../shared/UI';
import { useAuthModalIntegration } from '../../hooks/useAuthModalIntegration';

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
  feature = "this feature",
  description = "Sign in to access enhanced features and save your data across devices.",
  requireProfile = false,
  title,
  benefits = [],
  variant = 'card',
  icon,
  authModal: authModalProp
}) {
  const authModal = useAuthModalIntegration(authModalProp);

  // Default benefits if none provided
  const defaultBenefits = [
    "Save your team data across devices",
    "Access match history and statistics",
    "Create and manage multiple teams",
    "Never lose your progress"
  ];

  const displayBenefits = benefits.length > 0 ? benefits : defaultBenefits;
  const displayTitle = title || (requireProfile ? "Complete Your Profile" : `Sign in to use ${feature}`);

  const handleSignIn = () => {
    authModal.openLogin();
  };

  const handleSignUp = () => {
    authModal.openSignup();
  };

  // Minimal variant for inline use
  if (variant === 'minimal') {
    return (
      <div className="text-center py-2">
        <p className="text-slate-400 text-sm mb-3">{description}</p>
        <div className="flex gap-2 justify-center">
          <Button
            onClick={handleSignIn}
            variant="secondary"
            size="sm"
          >
            Sign In
          </Button>
          <Button
            onClick={handleSignUp}
            variant="primary"
            size="sm"
          >
            Sign Up
          </Button>
        </div>
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
            <p className="text-slate-400 text-sm mt-1">{description}</p>
            <div className="flex gap-2 mt-3">
              <Button
                onClick={handleSignIn}
                variant="secondary"
                size="sm"
              >
                Sign In
              </Button>
              <Button
                onClick={handleSignUp}
                variant="primary"
                size="sm"
              >
                Create Account
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default card variant - full-featured prompt
  return (
    <div className="bg-slate-700 rounded-lg border border-slate-600 p-6">
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
          {description}
        </p>

        {/* Benefits List */}
        {displayBenefits.length > 0 && (
          <div className="bg-slate-800 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">What you'll get:</h3>
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
        <div className="space-y-3">
          <Button
            onClick={handleSignUp}
            variant="primary"
            size="lg"
            className="w-full"
          >
            Create Free Account
          </Button>
          
          <Button
            onClick={handleSignIn}
            variant="secondary"
            size="lg"
            className="w-full"
          >
            Sign In
          </Button>
        </div>

        {/* Fine Print */}
        <p className="text-xs text-slate-500 mt-4">
          Free forever • No credit card required • Your data stays private
        </p>
      </div>
    </div>
  );
}

/**
 * TeamManagementAlert - Specialized alert for team management features
 */
export function TeamManagementAlert(props) {
  return (
    <AnonymousAlert
      feature="team management"
      title="Manage Your Teams"
      description="Create and manage team rosters, save player information, and track team performance across multiple matches."
      benefits={[
        "Create multiple team rosters",
        "Save player information and jersey numbers",
        "Track team performance over time",
        "Access match history and analytics",
        "Sync data across all your devices"
      ]}
      {...props}
    />
  );
}

/**
 * MatchHistoryAlert - Specialized alert for match history features
 */
export function MatchHistoryAlert(props) {
  return (
    <AnonymousAlert
      feature="match history"
      title="Save Your Match History"
      description="Keep track of all your matches with detailed statistics, player performance data, and game analytics."
      benefits={[
        "Save detailed match reports",
        "Track player statistics over time",
        "View formation and substitution patterns",
        "Compare team performance across matches",
        "Never lose important game data"
      ]}
      {...props}
    />
  );
}

/**
 * CloudSyncAlert - Specialized alert for cloud synchronization features  
 */
export function CloudSyncAlert(props) {
  return (
    <AnonymousAlert
      feature="cloud sync"
      title="Sync Across Devices"
      description="Access your teams and match data from any device. Your information is automatically backed up and synchronized."
      benefits={[
        "Access from phone, tablet, or computer",
        "Automatic cloud backup",
        "Never lose your data",
        "Share team information with other coaches",
        "Real-time synchronization"
      ]}
      {...props}
    />
  );
}