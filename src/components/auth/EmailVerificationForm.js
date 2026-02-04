import React, { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Input, Button } from '../shared/UI';
import { useAuth } from '../../contexts/AuthContext';
import { validateOtpCode } from '../../utils/authValidation';
import { getPrimaryErrorMessage, getErrorDisplayClasses } from '../../utils/authErrorHandling';
import { checkOtpExpiry } from '../../utils/timeUtils';

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
  const [showHelpSection, setShowHelpSection] = useState(false);
  const [otpStatus, setOtpStatus] = useState({ isExpired: false, minutesRemaining: 60 });
  const { verifyOtp, resendOtp, loading, authError, clearAuthError } = useAuth();
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

  // Check OTP expiry on mount and every 60 seconds
  useEffect(() => {
    const checkExpiry = () => {
      const status = checkOtpExpiry(email);
      setOtpStatus(status);
    };

    checkExpiry(); // Check immediately
    const intervalId = setInterval(checkExpiry, 60000); // Check every 60 seconds

    return () => clearInterval(intervalId);
  }, [email]);

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
      const { user, error } = await verifyOtp(email, code);

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
      const { error } = await resendOtp(email, 'signup');

      if (error) {
        setErrors({ general: error.message });
      } else {
        // Success - reset cooldown and clear input
        setCode('');
        setResendCooldown(60); // 60 second cooldown
        setErrors({}); // Clear any errors

        // Reset expiry state (resendOtp in AuthContext already called setOtpSentTime)
        setOtpStatus({ isExpired: false, minutesRemaining: 59 });
      }
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

      {/* Conditional rendering based on expiry status */}
      {!otpStatus.isExpired ? (
        // NORMAL STATE: Show code input form
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="verification-code" className="block text-sm font-medium text-slate-300 mb-2">
              Verification Code
            </label>
            <Input
              ref={codeInputRef}
              id="verification-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={code}
              onChange={handleCodeChange}
              onKeyDown={handleKeyDown}
              placeholder="Enter 6-digit code"
              disabled={loading}
              className={`text-center text-lg tracking-widest ${getErrorDisplayClasses(!!errors.code, 'field').container}`}
              maxLength={6}
              autoComplete="one-time-code"
              aria-label="Enter 6-digit verification code"
              aria-describedby="code-help-text"
            />
            {errors.code && (
              <p className={getErrorDisplayClasses(!!errors.code, 'field').text}>{errors.code}</p>
            )}
            <p id="code-help-text" className="text-slate-500 text-xs mt-1">
              Enter the 6-digit code from your email
            </p>
          </div>

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
      ) : (
        // EXPIRED STATE: Show warning and resend button
        <div className="space-y-4">
          {/* Expired Message */}
          <div className="bg-amber-900/50 border border-amber-600 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Code expired">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-amber-300 font-medium">Your verification code has expired</p>
            </div>
            <p className="text-amber-200 text-sm">
              Verification codes are valid for 60 minutes. Please request a new code to continue.
            </p>
          </div>

          {/* Send New Code Button */}
          <Button
            type="button"
            onClick={handleResendCode}
            variant="primary"
            size="lg"
            disabled={resendCooldown > 0 || loading}
            className="w-full"
          >
            {loading
              ? 'Sending...'
              : resendCooldown > 0
                ? `Send New Code (${resendCooldown}s)`
                : 'Send New Verification Code'}
          </Button>

          <p className="text-slate-400 text-sm text-center">
            A new 6-digit code will be sent to <span className="text-slate-300 font-medium">{email}</span>
          </p>
        </div>
      )}

      {/* Expandable Help Section */}
      <div className="text-center">
        <button
          type="button"
          onClick={() => setShowHelpSection(!showHelpSection)}
          className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-300 text-sm font-medium transition-colors"
          disabled={loading}
          aria-expanded={showHelpSection}
          aria-controls="help-section"
          aria-label={showHelpSection ? "Hide troubleshooting help" : "Show troubleshooting help"}
        >
          <span>Didn't receive an email?</span>
          {showHelpSection ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {showHelpSection && (
          <div id="help-section" className="mt-4 space-y-4 text-left bg-slate-700 rounded-lg p-4" role="region" aria-labelledby="help-title">
            {/* Resend Option */}
            <div className="text-center pb-3 border-b border-slate-600">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resendCooldown > 0 || loading}
                className="text-sky-400 hover:text-sky-300 font-medium transition-colors disabled:text-slate-500 disabled:cursor-not-allowed"
                aria-label={resendCooldown > 0 ? `Resend code available in ${resendCooldown} seconds` : "Resend verification code"}
              >
                {resendCooldown > 0 ? `Resend code again in ${resendCooldown}s` : 'Resend verification code'}
              </button>
            </div>

            {/* Troubleshooting Tips */}
            <div className="space-y-3">
              <h4 id="help-title" className="text-slate-300 font-medium text-sm">Troubleshooting tips:</h4>
              
              <div className="space-y-2 text-xs text-slate-400">
                <div className="flex items-start gap-2">
                  <span className="text-slate-500 mt-0.5">•</span>
                  <span>Check your spam/junk folder - automated emails sometimes end up there</span>
                </div>
                
                <div className="flex items-start gap-2">
                  <span className="text-slate-500 mt-0.5">•</span>
                  <span>Wait a few minutes - email delivery can take 2-5 minutes</span>
                </div>
                
                <div className="flex items-start gap-2">
                  <span className="text-slate-500 mt-0.5">•</span>
                  <span>Check that <span className="text-slate-300 font-medium">{email}</span> is correct</span>
                </div>
                
                <div className="flex items-start gap-2">
                  <span className="text-slate-500 mt-0.5">•</span>
                  <span>Some email providers (especially corporate) may block automated emails</span>
                </div>
              </div>
            </div>

            {/* Email Enumeration Protection Explanation */}
            <div className="pt-3 border-t border-slate-600">
              <h4 className="text-slate-300 font-medium text-sm mb-2">Account already exists?</h4>
              <div className="space-y-2 text-xs text-slate-400">
                <p>
                  If an account with your email already exists, you won't receive a signup email. 
                  This is intentional security behavior.
                </p>
                <p>
                  <strong className="text-slate-300">Why not just say the email is in use?</strong> This protects your privacy by preventing
                  bad actors from discovering which email addresses are registered with us.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onSwitchToLogin}
                    className="text-sky-400 hover:text-sky-300 text-sm font-medium transition-colors"
                    disabled={loading}
                    aria-label="Switch to sign in form if account already exists"
                  >
                    Try signing in instead →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Links */}
      <div className="text-center space-y-2">
        <div className="text-slate-400 text-sm">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-sky-400 hover:text-sky-300 font-medium transition-colors"
            disabled={loading}
            aria-label="Switch to sign in form"
          >
            Sign in
          </button>
        </div>
        
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-300 text-sm transition-colors"
          disabled={loading}
          aria-label="Close email verification form"
        >
          Close
        </button>
      </div>
    </div>
  );
}