import React, { useState, useEffect } from 'react';
import { Input, Button } from '../shared/UI';
import { useAuth } from '../../contexts/AuthContext';

export function ChangePassword({ isOpen, onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const { changePassword, loading, authError, clearAuthError } = useAuth();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrors({});
      setSuccessMessage('');
    }
  }, [isOpen]);

  // Clear auth errors when user starts typing
  useEffect(() => {
    if (authError) {
      clearAuthError();
    }
  }, [currentPassword, newPassword, confirmPassword, authError, clearAuthError]);

  // Handle ESC key press
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!currentPassword.trim()) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!newPassword.trim()) {
      newErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'New password must be at least 8 characters long';
    } else if (newPassword === currentPassword) {
      newErrors.newPassword = 'New password must be different from current password';
    }
    
    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const { error, message } = await changePassword(currentPassword, newPassword);
      
      if (error) {
        setErrors({ general: error.message });
      } else if (message) {
        setSuccessMessage(message);
      }
    } catch (error) {
      setErrors({ general: 'An unexpected error occurred. Please try again.' });
    }
  };

  const getErrorMessage = () => {
    if (errors.general) return errors.general;
    if (authError) return authError;
    return null;
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  // Success state
  if (successMessage) {
    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={handleBackdropClick}
      >
        <div className="bg-slate-800 rounded-lg shadow-xl max-w-md w-full border border-slate-600">
          <div className="px-6 py-6">
            <div className="space-y-6 text-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-sky-300">Password Changed!</h2>
                <p className="text-slate-400 mt-2">{successMessage}</p>
              </div>

              <Button
                onClick={onClose}
                variant="primary"
                size="lg"
                className="w-full"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Form state
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-slate-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-slate-600">
        {/* Modal Header with Close Button */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-600 px-6 py-4 flex justify-between items-center">
          <div className="text-lg font-semibold text-sky-300">
            Change Password
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
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-sky-300">Change Your Password</h2>
              <p className="text-slate-400 mt-2">
                Enter your current password to verify your identity, then set a new password
              </p>
            </div>

            {/* Error Message */}
            {getErrorMessage() && (
              <div className="bg-rose-900/50 border border-rose-600 rounded-lg p-3">
                <p className="text-rose-200 text-sm">{getErrorMessage()}</p>
              </div>
            )}

            {/* Change Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="current-password" className="block text-sm font-medium text-slate-300 mb-2">
                  Current Password
                </label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    if (errors.currentPassword) {
                      setErrors(prev => ({ ...prev, currentPassword: null }));
                    }
                  }}
                  placeholder="Enter your current password"
                  disabled={loading}
                  className={errors.currentPassword ? 'border-rose-500 focus:ring-rose-400 focus:border-rose-500' : ''}
                />
                {errors.currentPassword && (
                  <p className="text-rose-400 text-sm mt-1">{errors.currentPassword}</p>
                )}
              </div>

              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-slate-300 mb-2">
                  New Password
                </label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (errors.newPassword) {
                      setErrors(prev => ({ ...prev, newPassword: null }));
                    }
                  }}
                  placeholder="Enter your new password"
                  disabled={loading}
                  className={errors.newPassword ? 'border-rose-500 focus:ring-rose-400 focus:border-rose-500' : ''}
                />
                {errors.newPassword && (
                  <p className="text-rose-400 text-sm mt-1">{errors.newPassword}</p>
                )}
              </div>

              <div>
                <label htmlFor="confirm-new-password" className="block text-sm font-medium text-slate-300 mb-2">
                  Confirm New Password
                </label>
                <Input
                  id="confirm-new-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) {
                      setErrors(prev => ({ ...prev, confirmPassword: null }));
                    }
                  }}
                  placeholder="Confirm your new password"
                  disabled={loading}
                  className={errors.confirmPassword ? 'border-rose-500 focus:ring-rose-400 focus:border-rose-500' : ''}
                />
                {errors.confirmPassword && (
                  <p className="text-rose-400 text-sm mt-1">{errors.confirmPassword}</p>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Changing Password...' : 'Change Password'}
              </Button>
            </form>

            {/* Security Info */}
            <div className="bg-slate-700 border border-slate-600 rounded-lg p-4">
              <h4 className="text-slate-300 font-medium mb-2">Password Requirements:</h4>
              <ul className="text-slate-400 text-sm space-y-1">
                <li>• At least 8 characters long</li>
                <li>• Must be different from your current password</li>
                <li>• Use a mix of letters, numbers, and symbols</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}