import React, { useState } from 'react';
import { Input, Button } from '../shared/UI';
import { useAuth } from '../../contexts/AuthContext';
import { validateSignupForm, getPasswordRequirementsText } from '../../utils/authValidation';
import { getPrimaryErrorMessage, getErrorDisplayClasses } from '../../utils/authErrorHandling';

export function SignupForm({ onSwitchToLogin, onClose }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
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
    const { isValid, errors: validationErrors } = validateSignupForm(formData);
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
        // Email confirmation required
        setSuccessMessage(message);
        setFormData({ email: '', password: '', confirmPassword: '' });
      } else if (user) {
        // Success - close the modal
        onClose();
      }
    } catch (error) {
      setErrors({ general: 'An unexpected error occurred. Please try again.' });
    }
  };

  const primaryError = getPrimaryErrorMessage({
    formErrors: {}, // Don't show field errors in banner
    authError,
    generalError: errors.general
  });

  const errorClasses = getErrorDisplayClasses(!!primaryError, 'banner');

  // If success message is shown, display that instead of the form
  if (successMessage) {
    return (
      <div className="space-y-6 text-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-emerald-400">Check Your Email</h2>
          <p className="text-slate-400 mt-2">{successMessage}</p>
        </div>
        
        <div className="bg-sky-900/50 border border-sky-600 rounded-lg p-4">
          <p className="text-sky-200 text-sm">
            Please check your email and click the confirmation link to complete your registration.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={onSwitchToLogin}
            variant="primary"
            size="lg"
            className="w-full"
          >
            Back to Sign In
          </Button>
          
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-300 text-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-sky-300">Create Account</h2>
        <p className="text-slate-400 mt-2">Get started with email verification</p>
      </div>

      {/* Error Message */}
      {primaryError && (
        <div className={errorClasses.container}>
          <p className={errorClasses.text}>{primaryError}</p>
        </div>
      )}

      {/* Signup Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
            Email Address
          </label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="Enter your email"
            disabled={loading}
            className={getErrorDisplayClasses(!!errors.email, 'field').container}
          />
          {errors.email && (
            <p className={getErrorDisplayClasses(!!errors.email, 'field').text}>{errors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
            Password
          </label>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            placeholder="Create a secure password"
            disabled={loading}
            className={getErrorDisplayClasses(!!errors.password, 'field').container}
          />
          {errors.password && (
            <p className={getErrorDisplayClasses(!!errors.password, 'field').text}>{errors.password}</p>
          )}
          <p className="text-slate-500 text-xs mt-1">
            {getPasswordRequirementsText()}
          </p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">
            Confirm Password
          </label>
          <Input
            id="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
            placeholder="Confirm your password"
            disabled={loading}
            className={getErrorDisplayClasses(!!errors.confirmPassword, 'field').container}
          />
          {errors.confirmPassword && (
            <p className={getErrorDisplayClasses(!!errors.confirmPassword, 'field').text}>{errors.confirmPassword}</p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          variant="primary"
          size="lg"
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </Button>
      </form>

      {/* Footer Links */}
      <div className="text-center">
        <div className="text-slate-400 text-sm">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-sky-400 hover:text-sky-300 font-medium transition-colors"
            disabled={loading}
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}