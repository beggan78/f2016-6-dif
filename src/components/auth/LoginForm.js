import React, { useState } from 'react';
import { Input, Button } from '../shared/UI';
import { useAuth } from '../../contexts/AuthContext';

export function LoginForm({ onSwitchToSignup, onSwitchToReset, onClose }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const { signIn, loading, authError, clearAuthError } = useAuth();

  // Clear auth errors when component mounts or when user starts typing
  React.useEffect(() => {
    if (authError) {
      clearAuthError();
    }
  }, [email, password, authError, clearAuthError]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
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
      const { user, error } = await signIn(email, password);
      
      if (error) {
        setErrors({ general: error.message });
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-sky-300">Welcome Back</h2>
        <p className="text-slate-400 mt-2">Sign in to your account</p>
      </div>

      {/* Error Message */}
      {getErrorMessage() && (
        <div className="bg-rose-900/50 border border-rose-600 rounded-lg p-3">
          <p className="text-rose-200 text-sm">{getErrorMessage()}</p>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
            Email Address
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            disabled={loading}
            className={errors.password ? 'border-rose-500 focus:ring-rose-400 focus:border-rose-500' : ''}
          />
          {errors.password && (
            <p className="text-rose-400 text-sm mt-1">{errors.password}</p>
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
          {loading ? 'Signing In...' : 'Sign In'}
        </Button>
      </form>

      {/* Footer Links */}
      <div className="space-y-3 text-center">
        <button
          type="button"
          onClick={onSwitchToReset}
          className="text-sky-400 hover:text-sky-300 text-sm transition-colors"
          disabled={loading}
        >
          Forgot your password?
        </button>
        
        <div className="text-slate-400 text-sm">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="text-sky-400 hover:text-sky-300 font-medium transition-colors"
            disabled={loading}
          >
            Sign up
          </button>
        </div>
      </div>
    </div>
  );
}