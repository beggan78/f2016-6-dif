import React, { useState } from 'react';
import { Input, Button } from '../shared/UI';
import { useAuth } from '../../contexts/AuthContext';

export function PasswordReset({ onSwitchToLogin, onClose }) {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const { resetPassword, loading, authError, clearAuthError } = useAuth();

  // Clear auth errors when component mounts or when user starts typing
  React.useEffect(() => {
    if (authError) {
      clearAuthError();
    }
  }, [email, authError, clearAuthError]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
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

  const getErrorMessage = () => {
    if (errors.general) return errors.general;
    if (authError) return authError;
    return null;
  };

  // If success message is shown, display that instead of the form
  if (successMessage) {
    return (
      <div className="space-y-6 text-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-sky-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 3.26a2 2 0 001.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-sky-300">Check Your Email</h2>
          <p className="text-slate-400 mt-2">{successMessage}</p>
        </div>
        
        <div className="bg-sky-900/50 border border-sky-600 rounded-lg p-4">
          <div className="space-y-2 text-sky-200 text-sm">
            <p>We've sent a password reset link to <strong>{email}</strong></p>
            <p>Click the link in the email to reset your password.</p>
            <p className="text-slate-400">
              Don't see the email? Check your spam folder or try again.
            </p>
          </div>
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
            onClick={() => {
              setSuccessMessage('');
              setEmail('');
              setErrors({});
            }}
            className="text-sky-400 hover:text-sky-300 text-sm transition-colors"
          >
            Send another reset email
          </button>
          
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-sky-300">Reset Password</h2>
        <p className="text-slate-400 mt-2">
          Enter your email address and we'll send you a link to reset your password
        </p>
      </div>

      {/* Error Message */}
      {getErrorMessage() && (
        <div className="bg-rose-900/50 border border-rose-600 rounded-lg p-3">
          <p className="text-rose-200 text-sm">{getErrorMessage()}</p>
        </div>
      )}

      {/* Password Reset Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
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

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          variant="primary"
          size="lg"
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Sending Reset Link...' : 'Send Reset Link'}
        </Button>
      </form>

      {/* Instructions */}
      <div className="bg-slate-700 border border-slate-600 rounded-lg p-4">
        <h4 className="text-slate-300 font-medium mb-2">What happens next?</h4>
        <ul className="text-slate-400 text-sm space-y-1">
          <li>• We'll send a password reset link to your email</li>
          <li>• Click the link to open a secure password reset page</li>
          <li>• Choose a new password and confirm the change</li>
          <li>• You'll be able to sign in with your new password</li>
        </ul>
      </div>

      {/* Footer Links */}
      <div className="text-center space-y-2">
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