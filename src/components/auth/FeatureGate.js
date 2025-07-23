import React, { useState } from 'react';
import { Button } from '../shared/UI';
import { useAuth } from '../../contexts/AuthContext';
import { useAuthModalIntegration } from '../../hooks/useAuthModalIntegration';
import { AuthButtonPair } from './AuthButtons';
import { AnonymousAlert } from './AnonymousAlert';

/**
 * FeatureGate - Inline component that conditionally shows content or auth prompt
 * More flexible than AuthGuard for embedding within existing components
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Content to show when authenticated
 * @param {string} props.feature - Feature name for messaging
 * @param {string} props.description - Why authentication is needed
 * @param {Function} props.onAuthRequired - Callback when auth is required
 * @param {boolean} props.showPreview - Whether to show a preview of the protected content
 * @param {React.ReactNode} props.preview - Preview content to show
 * @param {string} props.actionText - Text for the primary action button
 * @param {boolean} props.inline - Whether to use inline styling
 * @param {boolean} props.compact - Whether to use compact styling
 * @returns {React.ReactNode}
 */
export function FeatureGate({
  children,
  feature = "this feature",
  description = "Sign in to unlock this feature",
  onAuthRequired,
  showPreview = false,
  preview,
  actionText = "Sign In for a better experience",
  inline = false,
  compact = false,
  authModal: authModalProp
}) {
  const { isAuthenticated, loading } = useAuth();
  const authModal = useAuthModalIntegration(authModalProp);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-2">
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return children;
  }

  // Handle auth required callback
  if (onAuthRequired && !showAuthPrompt) {
    onAuthRequired();
  }

  const handleShowMore = () => {
    setShowAuthPrompt(true);
  };

  // Show full auth prompt if requested
  if (showAuthPrompt) {
    return (
      <div className="space-y-4">
        {preview && (
          <div className="relative">
            <div className="opacity-50 pointer-events-none">
              {preview}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-800 to-transparent"></div>
          </div>
        )}
        <AnonymousAlert
          feature={feature}
          description={description}
          variant={inline ? 'inline' : 'card'}
          authModal={authModal}
        />
      </div>
    );
  }

  // Compact inline gate
  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-600">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-sky-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <p className="text-slate-300 text-sm font-medium">Sign in required</p>
            <p className="text-slate-400 text-xs">{description}</p>
          </div>
        </div>
        <AuthButtonPair
          authModal={authModal}
          variant="compact"
          signUpText="Sign Up"
        />
      </div>
    );
  }

  // Default gate with preview option
  return (
    <div className="space-y-4">
      {/* Preview content if available */}
      {showPreview && preview && (
        <div className="relative">
          <div className="opacity-30 pointer-events-none select-none">
            {preview}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-800 via-slate-800/70 to-transparent"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg p-4 border border-slate-600 max-w-sm text-center">
              <div className="w-10 h-10 bg-sky-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="font-semibold text-sky-300 text-sm mb-2">
                Unlock {feature}
              </h3>
              <p className="text-slate-400 text-xs mb-4">{description}</p>
              <AuthButtonPair
                authModal={authModal}
                variant="compact"
                signUpText="Sign Up"
                className="grid grid-cols-2 gap-2"
              />
            </div>
          </div>
        </div>
      )}

      {/* Standard gate without preview */}
      {!showPreview && (
        <div className="text-center p-6 bg-slate-800 rounded-lg border border-slate-600">
          <div className="w-12 h-12 bg-sky-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="font-semibold text-sky-300 mb-2">
            {actionText}
          </h3>
          <p className="text-slate-400 text-sm mb-4">{description}</p>
          <AuthButtonPair
            authModal={authModal}
            variant="inline"
          />
          <button
            onClick={handleShowMore}
            className="text-sky-400 hover:text-sky-300 text-xs mt-3 transition-colors"
          >
            Learn more about the benefits
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * ButtonGate - A button that shows auth prompt when clicked by anonymous users
 * 
 * @param {Object} props
 * @param {Function} props.onClick - Function to call when authenticated user clicks
 * @param {React.ReactNode} props.children - Button content
 * @param {string} props.feature - Feature name for auth prompt
 * @param {Object} props.buttonProps - Props to pass to the button
 * @returns {React.ReactNode}
 */
export function ButtonGate({
  onClick,
  children,
  feature = "this feature",
  description = "Sign in to use this feature",
  ...buttonProps
}) {
  const { isAuthenticated } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);

  const handleClick = () => {
    if (isAuthenticated) {
      onClick?.();
    } else {
      setShowPrompt(true);
    }
  };

  if (showPrompt) {
    return (
      <div className="space-y-4">
        <AnonymousAlert
          feature={feature}
          description={description}
          variant="inline"
        />
        <Button
          onClick={() => setShowPrompt(false)}
          variant="secondary"
          size="sm"
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={handleClick}
      {...buttonProps}
    >
      {children}
    </Button>
  );
}

/**
 * LinkGate - A link/text element that shows auth prompt when clicked by anonymous users
 */
export function LinkGate({
  onClick,
  children,
  feature = "this feature",
  description = "Sign in to access this feature",
  className = "",
  ...props
}) {
  const { isAuthenticated } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);

  const handleClick = (e) => {
    e.preventDefault();
    if (isAuthenticated) {
      onClick?.();
    } else {
      setShowPrompt(true);
    }
  };

  if (showPrompt) {
    return (
      <div className="space-y-4">
        <AnonymousAlert
          feature={feature}
          description={description}
          variant="inline"
        />
        <button
          onClick={() => setShowPrompt(false)}
          className="text-slate-400 hover:text-slate-300 text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`transition-colors ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}