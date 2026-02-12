import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ModalShell } from '../shared/ModalShell';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';
import { PasswordReset } from './PasswordReset';
import { EmailVerificationForm } from './EmailVerificationForm';

// Auth modes
export const AUTH_MODES = {
  LOGIN: 'login',
  SIGNUP: 'signup',
  RESET: 'reset',
  VERIFY: 'verify'
};

export function AuthModal({ isOpen, onClose, initialMode = AUTH_MODES.LOGIN, initialEmail = '' }) {
  const { t } = useTranslation('auth');
  const [currentMode, setCurrentMode] = useState(initialMode);
  const [emailContext, setEmailContext] = useState(initialEmail); // Email to carry between modes
  const [verificationEmail, setVerificationEmail] = useState(''); // Email for verification mode

  // Reset to initial mode when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentMode(initialMode);
    }
  }, [isOpen, initialMode]);

  // Update email context when initialEmail changes
  useEffect(() => {
    if (initialEmail) {
      setEmailContext(initialEmail);
    }
  }, [initialEmail]);

  // Clear email context when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEmailContext('');
    }
  }, [isOpen]);

  // Handle ESC key press
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSwitchToReset = (email = '') => {
    setEmailContext(email);
    setCurrentMode(AUTH_MODES.RESET);
  };

  const handleSwitchToLogin = () => {
    setEmailContext(''); // Clear email when going back to login
    setCurrentMode(AUTH_MODES.LOGIN);
  };

  const handleSwitchToSignup = () => {
    setEmailContext(''); // Clear email when switching to signup
    setCurrentMode(AUTH_MODES.SIGNUP);
  };

  const handleSwitchToVerify = (email = '') => {
    setVerificationEmail(email);
    setCurrentMode(AUTH_MODES.VERIFY);
  };

  const renderForm = () => {
    switch (currentMode) {
      case AUTH_MODES.LOGIN:
        return (
          <LoginForm
            onSwitchToSignup={handleSwitchToSignup}
            onSwitchToReset={handleSwitchToReset}
            onSwitchToVerify={handleSwitchToVerify}
            onClose={onClose}
            initialEmail={emailContext}
          />
        );
      case AUTH_MODES.SIGNUP:
        return (
          <SignupForm
            onSwitchToLogin={handleSwitchToLogin}
            onClose={onClose}
          />
        );
      case AUTH_MODES.RESET:
        return (
          <PasswordReset
            onSwitchToLogin={handleSwitchToLogin}
            onClose={onClose}
            initialEmail={emailContext}
          />
        );
      case AUTH_MODES.VERIFY:
        return (
          <EmailVerificationForm
            email={verificationEmail}
            onSuccess={onClose}
            onSwitchToLogin={handleSwitchToLogin}
            onClose={onClose}
          />
        );
      default:
        return null;
    }
  };

  const modalTitle = currentMode === AUTH_MODES.LOGIN ? t('authModal.titles.login')
    : currentMode === AUTH_MODES.SIGNUP ? t('authModal.titles.signup')
    : currentMode === AUTH_MODES.RESET ? t('authModal.titles.reset')
    : t('authModal.titles.verify');

  return (
    <ModalShell
      title={modalTitle}
      onClose={onClose}
      className="max-h-[90vh] overflow-y-auto"
    >
        {renderForm()}
    </ModalShell>
  );
}

// Hook for managing auth modal state
export function useAuthModal(initialMode = AUTH_MODES.LOGIN) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState(initialMode);
  const [initialEmail, setInitialEmail] = useState('');

  const openModal = (authMode = initialMode, email = '') => {
    setMode(authMode);
    setInitialEmail(email);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setInitialEmail(''); // Clear email when closing
  };

  const switchMode = (newMode) => {
    setMode(newMode);
  };

  return {
    isOpen,
    mode,
    initialEmail,
    openModal,
    closeModal,
    switchMode,
    // Convenience methods
    openLogin: (email = '') => openModal(AUTH_MODES.LOGIN, email),
    openSignup: () => openModal(AUTH_MODES.SIGNUP),
    openReset: () => openModal(AUTH_MODES.RESET)
  };
}