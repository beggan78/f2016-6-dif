import React, { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('auth');
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
    const { isValid, error } = validateOtpCode(code, { t });
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
      setErrors({ general: t('emailVerification.errors.unexpected') });
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
      setErrors({ general: t('emailVerification.errors.resendFailed') });
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
        <h2 className="text-2xl font-bold text-sky-300">{t('emailVerification.header.title')}</h2>
        <p className="text-slate-400 mt-2">
          {t('emailVerification.header.sentTo')} <span className="text-slate-300 font-medium">{email}</span>
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
              {t('emailVerification.form.codeLabel')}
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
              placeholder={t('emailVerification.form.codePlaceholder')}
              disabled={loading}
              className={`text-center text-lg tracking-widest ${getErrorDisplayClasses(!!errors.code, 'field').container}`}
              maxLength={6}
              autoComplete="one-time-code"
              aria-label={t('emailVerification.form.codePlaceholder')}
              aria-describedby="code-help-text"
            />
            {errors.code && (
              <p className={getErrorDisplayClasses(!!errors.code, 'field').text}>{errors.code}</p>
            )}
            <p id="code-help-text" className="text-slate-500 text-xs mt-1">
              {t('emailVerification.form.codeHint')}
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
            {loading ? t('emailVerification.form.submittingButton') : t('emailVerification.form.submitButton')}
          </Button>
        </form>
      ) : (
        // EXPIRED STATE: Show warning and resend button
        <div className="space-y-4">
          {/* Expired Message */}
          <div className="bg-amber-900/50 border border-amber-600 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label={t('emailVerification.expiry.title')}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-amber-300 font-medium">{t('emailVerification.expiry.title')}</p>
            </div>
            <p className="text-amber-200 text-sm">
              {t('emailVerification.expiry.description')}
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
              ? t('emailVerification.expiry.sendingButton')
              : resendCooldown > 0
                ? t('emailVerification.expiry.cooldownButton', { seconds: resendCooldown })
                : t('emailVerification.expiry.sendNewButton')}
          </Button>

          <p className="text-slate-400 text-sm text-center">
            {t('emailVerification.expiry.confirmMessage')} <span className="text-slate-300 font-medium">{email}</span>
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
          aria-label={showHelpSection ? t('emailVerification.help.toggleButtonHide') : t('emailVerification.help.toggleButtonShow')}
        >
          <span>{t('emailVerification.help.toggleButton')}</span>
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
                aria-label={resendCooldown > 0 ? t('emailVerification.help.resendCooldown', { seconds: resendCooldown }) : t('emailVerification.help.resendButton')}
              >
                {resendCooldown > 0 ? t('emailVerification.help.resendCooldown', { seconds: resendCooldown }) : t('emailVerification.help.resendButton')}
              </button>
            </div>

            {/* Troubleshooting Tips */}
            <div className="space-y-3">
              <h4 id="help-title" className="text-slate-300 font-medium text-sm">{t('emailVerification.help.title')}</h4>

              <div className="space-y-2 text-xs text-slate-400">
                <div className="flex items-start gap-2">
                  <span className="text-slate-500 mt-0.5">•</span>
                  <span>{t('emailVerification.help.tips.spam')}</span>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-slate-500 mt-0.5">•</span>
                  <span>{t('emailVerification.help.tips.wait')}</span>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-slate-500 mt-0.5">•</span>
                  <span>{t('emailVerification.help.tips.checkEmail', { email: <span className="text-slate-300 font-medium">{email}</span> })}</span>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-slate-500 mt-0.5">•</span>
                  <span>{t('emailVerification.help.tips.provider')}</span>
                </div>
              </div>
            </div>

            {/* Email Enumeration Protection Explanation */}
            <div className="pt-3 border-t border-slate-600">
              <h4 className="text-slate-300 font-medium text-sm mb-2">{t('emailVerification.help.enumeration.title')}</h4>
              <div className="space-y-2 text-xs text-slate-400">
                <p>
                  {t('emailVerification.help.enumeration.description')}
                </p>
                <p>
                  <strong className="text-slate-300">{t('emailVerification.help.enumeration.whyTitle')}</strong> {t('emailVerification.help.enumeration.whyDescription')}
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onSwitchToLogin}
                    className="text-sky-400 hover:text-sky-300 text-sm font-medium transition-colors"
                    disabled={loading}
                    aria-label={t('emailVerification.help.enumeration.signInLink')}
                  >
                    {t('emailVerification.help.enumeration.signInLink')}
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
          {t('emailVerification.footer.hasAccount')}{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-sky-400 hover:text-sky-300 font-medium transition-colors"
            disabled={loading}
            aria-label={t('emailVerification.footer.signInLink')}
          >
            {t('emailVerification.footer.signInLink')}
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-300 text-sm transition-colors"
          disabled={loading}
          aria-label={t('emailVerification.footer.closeButton')}
        >
          {t('emailVerification.footer.closeButton')}
        </button>
      </div>
    </div>
  );
}