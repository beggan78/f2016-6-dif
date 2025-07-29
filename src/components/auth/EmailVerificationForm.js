import React, { useState, useRef, useEffect } from 'react';
import { Input, Button } from '../shared/UI';
import { useAuth } from '../../contexts/AuthContext';
import { validateOtpCode } from '../../utils/authValidation';
import { getPrimaryErrorMessage, getErrorDisplayClasses } from '../../utils/authErrorHandling';

/**
 * EmailVerificationForm - Component for OTP code verification
 * 
 * Handles email verification using 6-digit codes sent via email.
 * Provides better UX than email link clicking, especially on mobile.
 * 
 * @param {Object} props
 * @param {string} props.email - Email address that needs verification
 * @param {Function} props.onSuccess - Callback when verification succeeds
 * @param {Function} props.onSwitchToLogin - Switch to login form
 * @param {Function} props.onClose - Close modal
 * @returns {React.ReactNode}
 */
export function EmailVerificationForm({ email, onSuccess, onSwitchToLogin, onClose }) {
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState({});
  const [resendCooldown, setResendCooldown] = useState(0);
  const { verifyEmailOtp, loading, authError, clearAuthError } = useAuth();
  const codeInputRef = useRef(null);

  // Auto-focus the code input when component mounts
  useEffect(() => {
    if (codeInputRef.current) {
      codeInputRef.current.focus();
    }
  }, []);

  // Clear auth errors when component mounts or when user starts typing
  useEffect(() => {
    if (authError) {
      clearAuthError();
    }
  }, [code, authError, clearAuthError]);

  // Handle resend cooldown
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleCodeChange = (e) => {
    let value = e.target.value;
    
    // Only allow digits and limit to 6 characters
    value = value.replace(/\D/g, '').slice(0, 6);
    
    setCode(value);
    
    // Clear code-specific error when user starts typing
    if (errors.code) {
      setErrors(prev => ({ ...prev, code: null }));
    }
  };

  const handleKeyDown = (e) => {
    // Submit on Enter if code is complete
    if (e.key === 'Enter' && code.length === 6) {
      handleSubmit(e);
    }
  };

  const validateForm = () => {
    const { isValid, error } = validateOtpCode(code);
    if (!isValid) {
      setErrors({ code: error });
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const { user, error } = await verifyEmailOtp(email, code);
      
      if (error) {
        setErrors({ general: error.message });
      } else if (user) {
        // Success - call onSuccess callback
        onSuccess();
      }
    } catch (error) {
      setErrors({ general: 'An unexpected error occurred. Please try again.' });
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    
    try {
      // TODO: Implement resend functionality in AuthContext
      // await resendEmailOtp(email);
      setResendCooldown(60); // 60 second cooldown
      setErrors({}); // Clear any errors
    } catch (error) {
      setErrors({ general: 'Failed to resend code. Please try again.' });
    }
  };

  const primaryError = getPrimaryErrorMessage({
    formErrors: {}, // Don't show field errors in banner
    authError,
    generalError: errors.general
  });

  const errorClasses = getErrorDisplayClasses(!!primaryError, 'banner');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-sky-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-sky-300">Check Your Email</h2>
        <p className="text-slate-400 mt-2">
          We sent a 6-digit code to <span className="text-slate-300 font-medium">{email}</span>
        </p>
      </div>

      {/* Error Message */}
      {primaryError && (
        <div className={errorClasses.container}>
          <p className={errorClasses.text}>{primaryError}</p>
        </div>
      )}

      {/* Code Input Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="verification-code" className="block text-sm font-medium text-slate-300 mb-2">
            Verification Code
          </label>
          <Input
            ref={codeInputRef}
            id="verification-code"
            type="text"
            value={code}
            onChange={handleCodeChange}
            onKeyDown={handleKeyDown}
            placeholder="Enter 6-digit code"
            disabled={loading}
            className={`text-center text-lg tracking-widest ${getErrorDisplayClasses(!!errors.code, 'field').container}`}
            maxLength={6}
            autoComplete="one-time-code"
          />
          {errors.code && (
            <p className={getErrorDisplayClasses(!!errors.code, 'field').text}>{errors.code}</p>
          )}
          <p className="text-slate-500 text-xs mt-1">
            Enter the 6-digit code from your email
          </p>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          onClick={handleSubmit}
          variant="primary"
          size="lg"
          disabled={loading || code.length !== 6}
          className="w-full"
        >
          {loading ? 'Verifying...' : 'Verify Email'}
        </Button>
      </form>

      {/* Resend and Alternative Options */}
      <div className="space-y-3 text-center">
        <div className="text-slate-400 text-sm">
          Didn't receive the code?{' '}
          <button
            type="button"
            onClick={handleResendCode}
            disabled={resendCooldown > 0 || loading}
            className="text-sky-400 hover:text-sky-300 font-medium transition-colors disabled:text-slate-500 disabled:cursor-not-allowed"
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
          </button>
        </div>

        <div className="bg-slate-700 rounded-lg p-4">
          <p className="text-slate-300 text-sm mb-2">
            <strong>Alternative:</strong> Check your email for a confirmation link
          </p>
          <p className="text-slate-400 text-xs">
            You can also click the link in your email to verify your account
          </p>
        </div>
      </div>

      {/* Footer Links */}
      <div className="text-center space-y-2">
        <div className="text-slate-400 text-sm">
          Already verified?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-sky-400 hover:text-sky-300 font-medium transition-colors"
            disabled={loading}
          >
            Sign in
          </button>
        </div>
        
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-300 text-sm transition-colors"
          disabled={loading}
        >
          Close
        </button>
      </div>
    </div>
  );
}