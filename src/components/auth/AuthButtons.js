import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../shared/UI';
import { useAuthModalIntegration } from '../../hooks/useAuthModalIntegration';

/**
 * AuthButtons - Reusable authentication button components
 * 
 * Provides consistent authentication buttons across the application
 * with standardized handlers and styling variants.
 */

/**
 * useAuthHandlers - Custom hook for standardized auth button handlers
 * 
 * @param {Object} authModal - The authModal instance to use
 * @param {Function} onSignIn - Optional callback after sign in action
 * @param {Function} onSignUp - Optional callback after sign up action
 * @returns {Object} - Handler functions for authentication actions
 */
export function useAuthHandlers(authModal, { onSignIn, onSignUp } = {}) {
  const handleSignIn = () => {
    authModal.openLogin();
    onSignIn?.();
  };

  const handleSignUp = () => {
    authModal.openSignup();
    onSignUp?.();
  };

  return { handleSignIn, handleSignUp };
}

/**
 * AuthButtonPair - Reusable Sign In + Sign Up button pair
 * 
 * @param {Object} props
 * @param {Object} props.authModal - Optional authModal instance (will use fallback if not provided)
 * @param {string} props.variant - Button layout variant ('inline', 'stacked', 'compact')
 * @param {string} props.signInText - Custom text for sign in button
 * @param {string} props.signUpText - Custom text for sign up button
 * @param {Function} props.onSignIn - Optional callback after sign in action
 * @param {Function} props.onSignUp - Optional callback after sign up action
 * @param {string} props.className - Additional CSS classes
 * @returns {React.ReactNode}
 */
export function AuthButtonPair({
  authModal: authModalProp,
  variant = 'inline',
  signInText,
  signUpText,
  onSignIn,
  onSignUp,
  className = ''
}) {
  const { t } = useTranslation('auth');
  const authModal = useAuthModalIntegration(authModalProp);
  const { handleSignIn, handleSignUp } = useAuthHandlers(authModal, { onSignIn, onSignUp });

  // Use translation defaults if not provided
  const displaySignInText = signInText || t('authButtons.signIn');
  const displaySignUpText = signUpText || t('authButtons.createAccount');

  // Stacked variant - buttons in column
  if (variant === 'stacked') {
    return (
      <div className={`space-y-3 ${className}`}>
        <Button
          onClick={handleSignUp}
          variant="primary"
          size="lg"
          className="w-full"
        >
          {displaySignUpText}
        </Button>

        <Button
          onClick={handleSignIn}
          variant="secondary"
          size="lg"
          className="w-full"
        >
          {displaySignInText}
        </Button>
      </div>
    );
  }

  // Compact variant - small buttons side by side
  if (variant === 'compact') {
    return (
      <div className={`flex gap-2 ${className}`}>
        <Button
          onClick={handleSignIn}
          variant="secondary"
          size="sm"
        >
          {displaySignInText}
        </Button>
        <Button
          onClick={handleSignUp}
          variant="primary"
          size="sm"
        >
          {displaySignUpText}
        </Button>
      </div>
    );
  }

  // Default inline variant - standard buttons side by side
  return (
    <div className={`flex gap-3 justify-center ${className}`}>
      <Button
        onClick={handleSignIn}
        variant="secondary"
        size="sm"
      >
        {displaySignInText}
      </Button>
      <Button
        onClick={handleSignUp}
        variant="primary"
        size="sm"
      >
        {displaySignUpText}
      </Button>
    </div>
  );
}

/**
 * SignInButton - Individual Sign In button
 * 
 * @param {Object} props
 * @param {Object} props.authModal - Optional authModal instance
 * @param {Function} props.onSignIn - Optional callback after sign in action
 * @param {Object} props.buttonProps - Props to pass to the Button component
 * @returns {React.ReactNode}
 */
export function SignInButton({
  authModal: authModalProp,
  onSignIn,
  ...buttonProps
}) {
  const { t } = useTranslation('auth');
  const authModal = useAuthModalIntegration(authModalProp);
  const { handleSignIn } = useAuthHandlers(authModal, { onSignIn });

  return (
    <Button
      onClick={handleSignIn}
      variant="secondary"
      {...buttonProps}
    >
      {t('authButtons.signIn')}
    </Button>
  );
}

/**
 * SignUpButton - Individual Sign Up button
 * 
 * @param {Object} props
 * @param {Object} props.authModal - Optional authModal instance
 * @param {Function} props.onSignUp - Optional callback after sign up action
 * @param {string} props.children - Button text (defaults to "Create Account")
 * @param {Object} props.buttonProps - Props to pass to the Button component
 * @returns {React.ReactNode}
 */
export function SignUpButton({
  authModal: authModalProp,
  onSignUp,
  children,
  ...buttonProps
}) {
  const { t } = useTranslation('auth');
  const authModal = useAuthModalIntegration(authModalProp);
  const { handleSignUp } = useAuthHandlers(authModal, { onSignUp });

  return (
    <Button
      onClick={handleSignUp}
      variant="primary"
      {...buttonProps}
    >
      {children || t('authButtons.createAccount')}
    </Button>
  );
}