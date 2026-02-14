import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input, Button } from '../shared/UI';
import { FormGroup } from '../shared/FormGroup';
import { useAuth } from '../../contexts/AuthContext';
import { validateSignupForm } from '../../utils/authValidation';
import { getPrimaryErrorMessage, getErrorDisplayClasses } from '../../utils/authErrorHandling';
import { EmailVerificationForm } from './EmailVerificationForm';

export function SignupForm({ onSwitchToLogin, onClose }) {
  const { t } = useTranslation('auth');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const { signUp, loading, authError, clearAuthError } = useAuth();

  // Clear auth errors when component mounts or when user starts typing
  React.useEffect(() => {
    if (authError) {
      clearAuthError();
    }
  }, [formData, authError, clearAuthError]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const { isValid, errors: validationErrors } = validateSignupForm(formData, { t });
    setErrors(validationErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const { user, error, message } = await signUp(
        formData.email, 
        formData.password
      );
      
      if (error) {
        setErrors({ general: error.message });
      } else if (message) {
        // Email confirmation required - go directly to EmailVerificationForm
        setUserEmail(formData.email);
        setShowOtpVerification(true);
        setFormData({ email: '', password: '', confirmPassword: '' });
      } else if (user) {
        // Success - close the modal
        onClose();
      }
    } catch (error) {
      setErrors({ general: t('signup.errors.unexpected') });
    }
  };

  const handleOtpVerificationSuccess = () => {
    // OTP verification successful - close modal
    onClose();
  };

  const primaryError = getPrimaryErrorMessage({
    formErrors: {}, // Don't show field errors in banner
    authError,
    generalError: errors.general
  });

  const errorClasses = getErrorDisplayClasses(!!primaryError, 'banner');

  // If OTP verification is needed, show EmailVerificationForm
  if (showOtpVerification) {
    return (
      <EmailVerificationForm
        email={userEmail}
        onSuccess={handleOtpVerificationSuccess}
        onSwitchToLogin={onSwitchToLogin}
        onClose={onClose}
      />
    );
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-sky-300">{t('signup.header.title')}</h2>
        <p className="text-slate-400 mt-2">{t('signup.header.subtitle')}</p>
      </div>

      {/* Error Message */}
      {primaryError && (
        <div className={errorClasses.container}>
          <p className={errorClasses.text}>{primaryError}</p>
        </div>
      )}

      {/* Signup Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormGroup label={t('signup.form.emailLabel')} htmlFor="email" error={errors.email}>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder={t('signup.form.emailPlaceholder')}
            disabled={loading}
            className={getErrorDisplayClasses(!!errors.email, 'field').container}
          />
        </FormGroup>

        <FormGroup label={t('signup.form.passwordLabel')} htmlFor="password" error={errors.password}>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            placeholder={t('signup.form.passwordPlaceholder')}
            disabled={loading}
            className={getErrorDisplayClasses(!!errors.password, 'field').container}
          />
          <p className="text-slate-500 text-xs mt-1">
            {t('signup.form.passwordRequirements')}
          </p>
        </FormGroup>

        <FormGroup label={t('signup.form.confirmPasswordLabel')} htmlFor="confirmPassword" error={errors.confirmPassword}>
          <Input
            id="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
            placeholder={t('signup.form.confirmPasswordPlaceholder')}
            disabled={loading}
            className={getErrorDisplayClasses(!!errors.confirmPassword, 'field').container}
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
          {loading ? t('signup.form.submittingButton') : t('signup.form.submitButton')}
        </Button>
      </form>

      {/* Footer Links */}
      <div className="text-center">
        <div className="text-slate-400 text-sm">
          {t('signup.links.hasAccount')}{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-sky-400 hover:text-sky-300 font-medium transition-colors"
            disabled={loading}
          >
            {t('signup.links.signIn')}
          </button>
        </div>
      </div>
    </div>
  );
}