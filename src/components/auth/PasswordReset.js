import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Input, Button } from '../shared/UI';
import { FormGroup } from '../shared/FormGroup';
import { Alert } from '../shared/Alert';
import { Card } from '../shared/Card';
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
  const { t } = useTranslation('auth');
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
      newErrors.email = t('auth:passwordReset.errors.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = t('auth:passwordReset.errors.emailInvalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateCodeForm = () => {
    const { isValid, error } = validateOtpCode(code, { t });
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
      newErrors.newPassword = t('auth:passwordReset.errors.newPasswordRequired');
    } else if (newPassword.length < 8) {
      newErrors.newPassword = t('auth:passwordReset.errors.newPasswordTooShort');
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = t('auth:passwordReset.errors.confirmPasswordRequired');
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = t('auth:passwordReset.errors.passwordsMismatch');
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
      setErrors({ general: t('auth:passwordReset.errors.unexpected') });
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
        setSuccessMessage('');
        setErrors({});
      }
    } catch (error) {
      setErrors({ general: t('auth:passwordReset.errors.unexpected') });
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
          ? t('auth:passwordReset.update.success.messageWithUser')
          : t('auth:passwordReset.update.success.messageWithoutUser');
        setSuccessMessage(contextMessage);
      }
    } catch (error) {
      setErrors({ general: t('auth:passwordReset.errors.unexpected') });
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
            {mode === RESET_MODES.UPDATE ? t('auth:passwordReset.update.success.title') : t('auth:passwordReset.code.success.title')}
          </h2>
          <p className="text-slate-400 mt-2">{successMessage}</p>
        </div>
        
        {mode !== RESET_MODES.UPDATE && (
          <Alert variant="info">
            <div className="space-y-2 text-sky-200 text-sm">
              <p>{t('auth:passwordReset.code.success.sentTo')} <strong>{email}</strong></p>
              <p>{t('auth:passwordReset.code.success.instructions')}</p>
              <p className="text-slate-400">
                {t('auth:passwordReset.code.success.spamNote')}
              </p>
            </div>
          </Alert>
        )}

        {mode === RESET_MODES.UPDATE ? (
          <div className="space-y-3">
            <Button
              onClick={user ? onClose : onSwitchToLogin}
              variant="primary"
              size="lg"
              className="w-full"
            >
              {user ? t('auth:passwordReset.update.success.continueButton') : t('auth:passwordReset.update.success.signInButton')}
            </Button>
            
            <button
              type="button"
              onClick={onClose}
              className="block text-slate-400 hover:text-slate-300 text-sm transition-colors mx-auto"
            >
              {t('auth:passwordReset.update.success.closeButton')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Code input form */}
            {getErrorMessage() && (
              <Alert variant="error">{getErrorMessage()}</Alert>
            )}

            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <FormGroup label={t('auth:passwordReset.code.form.codeLabel')} htmlFor="reset-code" error={errors.code}>
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
                  placeholder={t('auth:passwordReset.code.form.codePlaceholder')}
                  disabled={loading}
                  className="text-center text-lg tracking-widest"
                  error={!!errors.code}
                  maxLength={6}
                  autoComplete="one-time-code"
                />
                <p className="text-slate-500 text-xs mt-1">
                  {t('auth:passwordReset.code.form.codeHint')}
                </p>
              </FormGroup>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={loading || code.length !== 6}
                className="w-full"
              >
                {loading ? t('auth:passwordReset.code.form.submittingButton') : t('auth:passwordReset.code.form.submitButton')}
              </Button>
            </form>

            <div className="text-center space-y-2">
              <button
                type="button"
                onClick={() => {
                  setSuccessMessage('');
                  setEmail('');
                  setCode('');
                  setErrors({});
                  setMode(RESET_MODES.EMAIL);
                }}
                className="text-sky-400 hover:text-sky-300 text-sm transition-colors"
                disabled={loading}
              >
                {t('auth:passwordReset.code.links.resend')}
              </button>
              
              <button
                type="button"
                onClick={onClose}
                className="block text-slate-400 hover:text-slate-300 text-sm transition-colors mx-auto"
              >
                {t('auth:passwordReset.code.links.close')}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Email submission mode
  if (mode === RESET_MODES.EMAIL) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-sky-300">{t('auth:passwordReset.email.header.title')}</h2>
          <p className="text-slate-400 mt-2">
            {t('auth:passwordReset.email.header.subtitle')}
          </p>
        </div>

        {getErrorMessage() && (
          <Alert variant="error">{getErrorMessage()}</Alert>
        )}

        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <FormGroup label={t('auth:passwordReset.email.form.emailLabel')} htmlFor="reset-email" error={errors.email}>
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
              placeholder={t('auth:passwordReset.email.form.emailPlaceholder')}
              disabled={loading}
              error={!!errors.email}
            />
          </FormGroup>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={loading}
            className="w-full"
          >
            {loading ? t('auth:passwordReset.email.form.submittingButton') : t('auth:passwordReset.email.form.submitButton')}
          </Button>
        </form>

        <Card>
          <h4 className="text-slate-300 font-medium mb-2">{t('auth:passwordReset.email.info.title')}</h4>
          <ul className="text-slate-400 text-sm space-y-1">
            {t('auth:passwordReset.email.info.steps', { returnObjects: true }).map((step, index) => (
              <li key={index}>• {step}</li>
            ))}
          </ul>
        </Card>

        <div className="text-center">
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-sky-400 hover:text-sky-300 text-sm transition-colors"
            disabled={loading}
          >
            {t('auth:passwordReset.email.links.backToLogin')}
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
          <h2 className="text-2xl font-bold text-sky-300">{t('auth:passwordReset.update.header.title')}</h2>
          <p className="text-slate-400 mt-2">
            {t('auth:passwordReset.update.header.subtitle')}
          </p>
        </div>

        {getErrorMessage() && (
          <Alert variant="error">{getErrorMessage()}</Alert>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <FormGroup label={t('auth:passwordReset.update.form.newPasswordLabel')} htmlFor="new-password" error={errors.newPassword}>
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
              placeholder={t('auth:passwordReset.update.form.newPasswordPlaceholder')}
              disabled={loading}
              error={!!errors.newPassword}
            />
          </FormGroup>

          <FormGroup label={t('auth:passwordReset.update.form.confirmPasswordLabel')} htmlFor="confirm-password" error={errors.confirmPassword}>
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
              placeholder={t('auth:passwordReset.update.form.confirmPasswordPlaceholder')}
              disabled={loading}
              error={!!errors.confirmPassword}
            />
          </FormGroup>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={loading}
            className="w-full"
          >
            {loading ? t('auth:passwordReset.update.form.submittingButton') : t('auth:passwordReset.update.form.submitButton')}
          </Button>
        </form>

        <Card>
          <h4 className="text-slate-300 font-medium mb-2">{t('auth:passwordReset.update.requirements.title')}</h4>
          <ul className="text-slate-400 text-sm space-y-1">
            {t('auth:passwordReset.update.requirements.items', { returnObjects: true }).map((item, index) => (
              <li key={index}>• {item}</li>
            ))}
          </ul>
        </Card>
      </div>
    );
  }

  return null;
}