import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input, Button } from '../shared/UI';
import { FormGroup } from '../shared/FormGroup';
import { useAuth } from '../../contexts/AuthContext';
import { validateLoginForm } from '../../utils/authValidation';
import { getPrimaryErrorMessage, getErrorDisplayClasses } from '../../utils/authErrorHandling';

export function LoginForm({ onSwitchToSignup, onSwitchToReset, onSwitchToVerify, onClose, initialEmail = '' }) {
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const { signIn, loading, authError, clearAuthError } = useAuth();

  // Update email if initialEmail prop changes
  React.useEffect(() => {
    if (initialEmail && initialEmail !== email) {
      setEmail(initialEmail);
    }
  }, [initialEmail, email]);

  // Clear auth errors when component mounts or when user starts typing
  React.useEffect(() => {
    if (authError) {
      clearAuthError();
    }
  }, [email, password, authError, clearAuthError]);

  const validateForm = () => {
    const { isValid, errors: validationErrors } = validateLoginForm({ email, password }, { t });
    setErrors(validationErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const { user, error } = await signIn(email, password);

      if (error) {
        // Check for unverified email error
        if (error.message && error.message.toLowerCase().includes('email not confirmed')) {
          onSwitchToVerify(email);
          return;
        }
        setErrors({ general: error.message });
      } else if (user) {
        // Success - close the modal
        onClose();
      }
    } catch (error) {
      setErrors({ general: t('login.errors.unexpected') });
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
        <h2 className="text-2xl font-bold text-sky-300">{t('login.header.title')}</h2>
        <p className="text-slate-400 mt-2">{t('login.header.subtitle')}</p>
      </div>

      {/* Error Message */}
      {primaryError && (
        <div className={errorClasses.container}>
          <p className={errorClasses.text}>{primaryError}</p>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormGroup label={t('login.form.emailLabel')} htmlFor="email" error={errors.email}>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('login.form.emailPlaceholder')}
            disabled={loading}
            className={getErrorDisplayClasses(!!errors.email, 'field').container}
          />
        </FormGroup>

        <FormGroup label={t('login.form.passwordLabel')} htmlFor="password" error={errors.password}>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('login.form.passwordPlaceholder')}
            disabled={loading}
            className={getErrorDisplayClasses(!!errors.password, 'field').container}
          />
        </FormGroup>

        {/* Submit Button */}
        <Button
          type="submit"
          onClick={handleSubmit}
          variant="primary"
          size="lg"
          disabled={loading}
          className="w-full"
        >
          {loading ? t('login.form.submittingButton') : t('login.form.submitButton')}
        </Button>
      </form>

      {/* Footer Links */}
      <div className="space-y-3 text-center">
        <button
          type="button"
          onClick={() => onSwitchToReset(email)}
          className="text-sky-400 hover:text-sky-300 text-sm transition-colors"
          disabled={loading}
        >
          {t('login.links.forgotPassword')}
        </button>

        <div className="text-slate-400 text-sm">
          {t('login.links.noAccount')}{' '}
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="text-sky-400 hover:text-sky-300 font-medium transition-colors"
            disabled={loading}
          >
            {t('login.links.signUp')}
          </button>
        </div>
      </div>
    </div>
  );
}