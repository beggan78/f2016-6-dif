import React, { useState, useEffect } from 'react';
import { Input, Button } from '../shared/UI';
import { useAuth } from '../../contexts/AuthContext';
import { validateOtpCode } from '../../utils/authValidation';
import { detectResetTokens, clearResetTokensFromUrl, isPasswordResetSession } from '../../utils/resetTokenUtils';

// Password reset modes
const RESET_MODES = {
  EMAIL: 'email',      // Request reset via email
  CODE: 'code',        // Enter OTP code from email  
  UPDATE: 'update'     // Set new password (when user is authenticated)
};

export function PasswordReset({ onSwitchToLogin, onClose, initialEmail = '' }) {
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [mode, setMode] = useState(RESET_MODES.EMAIL);
  const { resetPassword, verifyOtp, updatePassword, loading, authError, clearAuthError, user } = useAuth();

  // Check for password reset tokens in URL on component mount
  useEffect(() => {
    const { hasTokens, format } = detectResetTokens();
    
    if (hasTokens && format === 'tokens') {
      // Direct Supabase auth redirect with tokens - go straight to password update
      setMode(RESET_MODES.UPDATE);
      // Clean up URL parameters to improve UX
      clearResetTokensFromUrl();
    }
    // Note: Magic link codes (?code=...) are handled by Supabase's automatic auth flow
    // The AuthContext will detect the authenticated session and we'll handle it via props or context
  }, []);

  // Update email if initialEmail prop changes
  useEffect(() => {
    if (initialEmail && initialEmail !== email) {
      setEmail(initialEmail);
    }
  }, [initialEmail, email]);

  // Clear auth errors when component mounts or when user starts typing
  useEffect(() => {
    if (authError) {
      clearAuthError();
    }
  }, [email, code, newPassword, confirmPassword, authError, clearAuthError]);

  // Check if we should show password update mode based on authentication state
  useEffect(() => {
    if (isPasswordResetSession(user)) {
      // User is authenticated via password reset (magic link or tokens), show password update form
      setMode(RESET_MODES.UPDATE);
      // Clean up URL parameters if still present
      clearResetTokensFromUrl();
    }
  }, [user]);

  const validateEmailForm = () => {
    const newErrors = {};
    
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateCodeForm = () => {
    const { isValid, error } = validateOtpCode(code);
    if (!isValid) {
      setErrors({ code: error });
      return false;
    }
    setErrors({});
    return true;
  };

  const validatePasswordForm = () => {
    const newErrors = {};
    
    if (!newPassword.trim()) {
      newErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters long';
    }
    
    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateEmailForm()) {
      return;
    }

    try {
      const { error, message } = await resetPassword(email);
      
      if (error) {
        setErrors({ general: error.message });
      } else if (message) {
        setSuccessMessage(message);
      }
    } catch (error) {
      setErrors({ general: 'An unexpected error occurred. Please try again.' });
    }
  };

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateCodeForm()) {
      return;
    }

    try {
      const { user, error } = await verifyOtp(email, code, 'recovery');
      
      if (error) {
        setErrors({ general: error.message });
      } else if (user) {
        // Switch to password update mode
        setMode(RESET_MODES.UPDATE);
        setErrors({});
      }
    } catch (error) {
      setErrors({ general: 'An unexpected error occurred. Please try again.' });
    }
  };


  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (!validatePasswordForm()) {
      return;
    }

    try {
      const { error, message } = await updatePassword(newPassword);
      
      if (error) {
        setErrors({ general: error.message });
      } else if (message) {
        // Customize success message based on authentication state
        const contextMessage = user 
          ? 'Password updated successfully. You can now continue using the app.'
          : 'Password updated successfully. You can now sign in with your new password.';
        setSuccessMessage(contextMessage);
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

  // If success message is shown, display success state
  if (successMessage) {
    return (
      <div className="space-y-6 text-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-sky-300">
            {mode === RESET_MODES.UPDATE ? 'Password Updated!' : 'Check Your Email'}
          </h2>
          <p className="text-slate-400 mt-2">{successMessage}</p>
        </div>
        
        {mode !== RESET_MODES.UPDATE && (
          <div className="bg-sky-900/50 border border-sky-600 rounded-lg p-4">
            <div className="space-y-2 text-sky-200 text-sm">
              <p>We've sent a password reset email to <strong>{email}</strong></p>
              <p>Click the link in the email OR enter the 6-digit code below.</p>
              <p className="text-slate-400">
                Don't see the email? Check your spam folder.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {mode === RESET_MODES.UPDATE ? (
            <Button
              onClick={user ? onClose : onSwitchToLogin}
              variant="primary"
              size="lg"
              className="w-full"
            >
              {user ? 'Continue' : 'Sign In Now'}
            </Button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setMode(RESET_MODES.CODE);
                  setSuccessMessage('');
                  setErrors({});
                }}
                className="text-sky-400 hover:text-sky-300 font-medium transition-colors"
              >
                I have the 6-digit code from my email
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setSuccessMessage('');
                  setEmail('');
                  setErrors({});
                  setMode(RESET_MODES.EMAIL);
                }}
                className="block text-sky-400 hover:text-sky-300 text-sm transition-colors mx-auto"
              >
                Send another reset email
              </button>
            </>
          )}
          
          <button
            type="button"
            onClick={onClose}
            className="block text-slate-400 hover:text-slate-300 text-sm transition-colors mx-auto"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Email submission mode
  if (mode === RESET_MODES.EMAIL) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-sky-300">Reset Password</h2>
          <p className="text-slate-400 mt-2">
            Enter your email address and we'll send you a link and code to reset your password
          </p>
        </div>

        {getErrorMessage() && (
          <div className="bg-rose-900/50 border border-rose-600 rounded-lg p-3">
            <p className="text-rose-200 text-sm">{getErrorMessage()}</p>
          </div>
        )}

        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div>
            <label htmlFor="reset-email" className="block text-sm font-medium text-slate-300 mb-2">
              Email Address
            </label>
            <Input
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) {
                  setErrors(prev => ({ ...prev, email: null }));
                }
              }}
              placeholder="Enter your email address"
              disabled={loading}
              className={errors.email ? 'border-rose-500 focus:ring-rose-400 focus:border-rose-500' : ''}
            />
            {errors.email && (
              <p className="text-rose-400 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Sending Reset Email...' : 'Send Reset Email'}
          </Button>
        </form>

        <div className="bg-slate-700 border border-slate-600 rounded-lg p-4">
          <h4 className="text-slate-300 font-medium mb-2">What happens next?</h4>
          <ul className="text-slate-400 text-sm space-y-1">
            <li>• We'll send a password reset email to your address</li>
            <li>• The email contains a 6-digit code</li>
            <li>• Enter the code manually</li>
            <li>• Choose a new password and confirm the change</li>
          </ul>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-sky-400 hover:text-sky-300 text-sm transition-colors"
            disabled={loading}
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  // OTP code entry mode
  if (mode === RESET_MODES.CODE) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-sky-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-sky-300">Enter Reset Code</h2>
          <p className="text-slate-400 mt-2">
            Enter the 6-digit code from your password reset email
          </p>
        </div>

        {getErrorMessage() && (
          <div className="bg-rose-900/50 border border-rose-600 rounded-lg p-3">
            <p className="text-rose-200 text-sm">{getErrorMessage()}</p>
          </div>
        )}

        <form onSubmit={handleCodeSubmit} className="space-y-4">
          <div>
            <label htmlFor="reset-code" className="block text-sm font-medium text-slate-300 mb-2">
              6-Digit Code
            </label>
            <Input
              id="reset-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={code}
              onChange={(e) => {
                let value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setCode(value);
                if (errors.code) {
                  setErrors(prev => ({ ...prev, code: null }));
                }
              }}
              placeholder="Enter 6-digit code"
              disabled={loading}
              className={`text-center text-lg tracking-widest ${errors.code ? 'border-rose-500 focus:ring-rose-400 focus:border-rose-500' : ''}`}
              maxLength={6}
              autoComplete="one-time-code"
            />
            {errors.code && (
              <p className="text-rose-400 text-sm mt-1">{errors.code}</p>
            )}
            <p className="text-slate-500 text-xs mt-1">
              Check your email for the 6-digit verification code
            </p>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={loading || code.length !== 6}
            className="w-full"
          >
            {loading ? 'Verifying Code...' : 'Verify Code'}
          </Button>
        </form>

        <div className="text-center space-y-2">
          <button
            type="button"
            onClick={() => {
              setMode(RESET_MODES.EMAIL);
              setCode('');
              setErrors({});
            }}
            className="text-sky-400 hover:text-sky-300 text-sm transition-colors"
            disabled={loading}
          >
            ← Back to email entry
          </button>
        </div>
      </div>
    );
  }


  // Password update mode (when user clicked email link or verified code)
  if (mode === RESET_MODES.UPDATE) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-sky-300">Set New Password</h2>
          <p className="text-slate-400 mt-2">
            Choose a strong password for your account
          </p>
        </div>

        {getErrorMessage() && (
          <div className="bg-rose-900/50 border border-rose-600 rounded-lg p-3">
            <p className="text-rose-200 text-sm">{getErrorMessage()}</p>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
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
            <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-300 mb-2">
              Confirm New Password
            </label>
            <Input
              id="confirm-password"
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
            {loading ? 'Updating Password...' : 'Update Password'}
          </Button>
        </form>

        <div className="bg-slate-700 border border-slate-600 rounded-lg p-4">
          <h4 className="text-slate-300 font-medium mb-2">Password Requirements:</h4>
          <ul className="text-slate-400 text-sm space-y-1">
            <li>• At least 8 characters long</li>
            <li>• Use a mix of letters, numbers, and symbols</li>
            <li>• Avoid common passwords or personal information</li>
          </ul>
        </div>
      </div>
    );
  }

  return null;
}