import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input } from '../shared/UI';
import { Alert } from '../shared/Alert';
import { ModalShell } from '../shared/ModalShell';
import { Link, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export function SportAdminConnectModal({ isOpen, onClose, team, onConnected }) {
  const { t } = useTranslation('connectors');
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
      newErrors.username = t('sportAdminConnect.validation.usernameRequired');
    } else if (credentials.username.length > 100) {
      newErrors.username = t('sportAdminConnect.validation.usernameMaxLength');
    }

    if (!credentials.password) {
      newErrors.password = t('sportAdminConnect.validation.passwordRequired');
    } else if (credentials.password.length > 200) {
      newErrors.password = t('sportAdminConnect.validation.passwordMaxLength');
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
      setGeneralError(error.message || t('sportAdminConnect.validation.connectionFailed'));
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
    <ModalShell
      title={t('sportAdminConnect.header.title')}
      subtitle={t('sportAdminConnect.header.subtitle')}
      icon={Link}
      iconColor="sky"
      onClose={handleClose}
    >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Info Message */}
          <Alert variant="info" icon={ShieldCheck} className="mb-6">
            <div className="space-y-1">
              <p>{t('sportAdminConnect.info.description')}</p>
              <p className="text-xs opacity-80">{t('sportAdminConnect.info.security')}</p>
            </div>
          </Alert>

          {/* General Error */}
          {generalError && (
            <Alert variant="error" className="mb-4">{generalError}</Alert>
          )}

          {/* Username Field */}
          <div className="mb-4">
            <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-2">
              {t('sportAdminConnect.form.labels.username')}
            </label>
            <Input
              id="username"
              name="username"
              type="text"
              value={credentials.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              placeholder={t('sportAdminConnect.form.placeholders.username')}
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
              {t('sportAdminConnect.form.labels.password')}
            </label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={credentials.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder={t('sportAdminConnect.form.placeholders.password')}
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
              {loading ? t('sportAdminConnect.buttons.connecting') : t('sportAdminConnect.buttons.connect')}
            </Button>
            <Button
              type="button"
              onClick={handleClose}
              variant="secondary"
              className="flex-1"
              disabled={loading}
            >
              {t('sportAdminConnect.buttons.cancel')}
            </Button>
          </div>
        </form>
    </ModalShell>
  );
}
