import React, { useState } from 'react';
import { Button, Input } from '../shared/UI';
import { Link, X, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export function SportAdminConnectModal({ isOpen, onClose, team, onConnected }) {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState(null);

  if (!isOpen) return null;

  // Validation
  const validateForm = () => {
    const newErrors = {};

    if (!credentials.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (credentials.username.length > 100) {
      newErrors.username = 'Username must be 100 characters or less';
    }

    if (!credentials.password) {
      newErrors.password = 'Password is required';
    } else if (credentials.password.length > 200) {
      newErrors.password = 'Password must be 200 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setGeneralError(null);

    try {
      await onConnected({
        username: credentials.username.trim(),
        password: credentials.password
      });

      // Success - parent component will close modal and refresh
      // Reset form
      setCredentials({ username: '', password: '' });
      setErrors({});
      setShowPassword(false);
    } catch (error) {
      console.error('Error connecting SportAdmin:', error);
      setGeneralError(error.message || 'Failed to connect SportAdmin. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    setCredentials(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
    if (generalError) {
      setGeneralError(null);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setCredentials({ username: '', password: '' });
      setErrors({});
      setGeneralError(null);
      setShowPassword(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg border border-slate-600 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-600">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-sky-600 rounded-full flex items-center justify-center">
              <Link className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Connect SportAdmin</h2>
              <p className="text-sm text-slate-400">
                Sync attendance and match data
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Info Message */}
          <div className="bg-sky-900/20 border border-sky-600 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <ShieldCheck className="w-5 h-5 text-sky-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sky-200 text-sm">
                  Enter your SportAdmin credentials to enable automatic synchronization.
                </p>
                <p className="text-sky-300 text-xs">
                  Your credentials will be encrypted and stored securely.
                </p>
              </div>
            </div>
          </div>

          {/* General Error */}
          {generalError && (
            <div className="bg-rose-900/50 border border-rose-600 rounded-lg p-3 mb-4">
              <p className="text-rose-200 text-sm">{generalError}</p>
            </div>
          )}

          {/* Username Field */}
          <div className="mb-4">
            <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-2">
              Username
            </label>
            <Input
              id="username"
              name="username"
              type="text"
              value={credentials.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              placeholder="Your SportAdmin username"
              disabled={loading}
              autoFocus
            />
            {errors.username && (
              <p className="text-rose-400 text-sm mt-1">{errors.username}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={credentials.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="Your SportAdmin password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                disabled={loading}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-rose-400 text-sm mt-1">{errors.password}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              disabled={loading}
              Icon={Link}
            >
              {loading ? 'Connecting...' : 'Connect'}
            </Button>
            <Button
              type="button"
              onClick={handleClose}
              variant="secondary"
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
