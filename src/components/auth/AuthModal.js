import React, { useState, useEffect } from 'react';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';
import { PasswordReset } from './PasswordReset';

// Auth modes
export const AUTH_MODES = {
  LOGIN: 'login',
  SIGNUP: 'signup',
  RESET: 'reset'
};

export function AuthModal({ isOpen, onClose, initialMode = AUTH_MODES.LOGIN }) {
  const [currentMode, setCurrentMode] = useState(initialMode);
  const [emailContext, setEmailContext] = useState(''); // Email to carry between modes

  // Reset to initial mode when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentMode(initialMode);
    }
  }, [isOpen, initialMode]);

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

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

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

  const renderForm = () => {
    switch (currentMode) {
      case AUTH_MODES.LOGIN:
        return (
          <LoginForm
            onSwitchToSignup={handleSwitchToSignup}
            onSwitchToReset={handleSwitchToReset}
            onClose={onClose}
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
      default:
        return null;
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-slate-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-slate-600">
        {/* Modal Header with Close Button */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-600 px-6 py-4 flex justify-between items-center">
          <div className="text-lg font-semibold text-sky-300">
            {currentMode === AUTH_MODES.LOGIN && 'Sign In'}
            {currentMode === AUTH_MODES.SIGNUP && 'Create Account'}
            {currentMode === AUTH_MODES.RESET && 'Reset Password'}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-800 rounded"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Content */}
        <div className="px-6 py-6">
          {renderForm()}
        </div>
      </div>
    </div>
  );
}

// Hook for managing auth modal state
export function useAuthModal(initialMode = AUTH_MODES.LOGIN) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState(initialMode);

  const openModal = (authMode = initialMode) => {
    setMode(authMode);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
  };

  const switchMode = (newMode) => {
    setMode(newMode);
  };

  return {
    isOpen,
    mode,
    openModal,
    closeModal,
    switchMode,
    // Convenience methods
    openLogin: () => openModal(AUTH_MODES.LOGIN),
    openSignup: () => openModal(AUTH_MODES.SIGNUP),
    openReset: () => openModal(AUTH_MODES.RESET)
  };
}