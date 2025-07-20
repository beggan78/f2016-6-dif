import React, { useState } from 'react';
import { Input, Button } from '../shared/UI';
import { useAuth } from '../../contexts/AuthContext';

export function SignupForm({ onSwitchToLogin, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
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
    const newErrors = {};
    
    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
    
    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])/.test(formData.password)) {
      newErrors.password = 'Password must contain both uppercase and lowercase letters';
    }
    
    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
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
      const { user, error, message } = await signUp(
        formData.email, 
        formData.password, 
        { name: formData.name.trim() }
      );
      
      if (error) {
        setErrors({ general: error.message });
      } else if (message) {
        // Email confirmation required
        setSuccessMessage(message);
        setFormData({ name: '', email: '', password: '', confirmPassword: '' });
      } else if (user) {
        // Success - close the modal
        onClose();
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
        <p className="text-slate-400 mt-2">Join the DIF F16-6 Coach community</p>
      </div>

      {/* Error Message */}
      {getErrorMessage() && (
        <div className="bg-rose-900/50 border border-rose-600 rounded-lg p-3">
          <p className="text-rose-200 text-sm">{getErrorMessage()}</p>
        </div>
      )}

      {/* Signup Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">
            Full Name
          </label>
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Enter your full name"
            disabled={loading}
            className={errors.name ? 'border-rose-500 focus:ring-rose-400 focus:border-rose-500' : ''}
          />
          {errors.name && (
            <p className="text-rose-400 text-sm mt-1">{errors.name}</p>
          )}
        </div>

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
            className={errors.email ? 'border-rose-500 focus:ring-rose-400 focus:border-rose-500' : ''}
          />
          {errors.email && (
            <p className="text-rose-400 text-sm mt-1">{errors.email}</p>
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
            className={errors.password ? 'border-rose-500 focus:ring-rose-400 focus:border-rose-500' : ''}
          />
          {errors.password && (
            <p className="text-rose-400 text-sm mt-1">{errors.password}</p>
          )}
          <p className="text-slate-500 text-xs mt-1">
            Must be at least 6 characters with uppercase and lowercase letters
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
            className={errors.confirmPassword ? 'border-rose-500 focus:ring-rose-400 focus:border-rose-500' : ''}
          />
          {errors.confirmPassword && (
            <p className="text-rose-400 text-sm mt-1">{errors.confirmPassword}</p>
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