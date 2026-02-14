import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Input, Button } from '../shared/UI';
import { FormGroup } from '../shared/FormGroup';
import { Alert } from '../shared/Alert';
import { Card } from '../shared/Card';
import { ModalShell } from '../shared/ModalShell';
import { useAuth } from '../../contexts/AuthContext';

export function ChangePassword({ isOpen, onClose }) {
  const { t } = useTranslation('auth');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const { changePassword, loading, authError, clearAuthError } = useAuth();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrors({});
      setSuccessMessage('');
    }
  }, [isOpen]);

  // Clear auth errors when user starts typing
  useEffect(() => {
    if (authError) {
      clearAuthError();
    }
  }, [currentPassword, newPassword, confirmPassword, authError, clearAuthError]);

  // Handle ESC key press
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);

  const validateForm = () => {
    const newErrors = {};

    if (!currentPassword.trim()) {
      newErrors.currentPassword = t('changePassword.errors.currentPasswordRequired');
    }

    if (!newPassword.trim()) {
      newErrors.newPassword = t('changePassword.errors.newPasswordRequired');
    } else if (newPassword.length < 8) {
      newErrors.newPassword = t('changePassword.errors.newPasswordTooShort');
    } else if (newPassword === currentPassword) {
      newErrors.newPassword = t('changePassword.errors.newPasswordSame');
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = t('changePassword.errors.confirmPasswordRequired');
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = t('changePassword.errors.passwordsMismatch');
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
      const { error, message } = await changePassword(currentPassword, newPassword);
      
      if (error) {
        setErrors({ general: error.message });
      } else if (message) {
        setSuccessMessage(message);
      }
    } catch (error) {
      setErrors({ general: t('changePassword.errors.unexpected') });
    }
  };

  const getErrorMessage = () => {
    if (errors.general) return errors.general;
    if (authError) return authError;
    return null;
  };

  if (!isOpen) return null;

  // Success state
  if (successMessage) {
    return (
      <ModalShell title={t('changePassword.success.title')} onClose={onClose}>
            <div className="space-y-6 text-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-sky-300">{t('changePassword.success.title')}</h2>
                <p className="text-slate-400 mt-2">{successMessage}</p>
              </div>

              <Button
                onClick={onClose}
                variant="primary"
                size="lg"
                className="w-full"
              >
                {t('changePassword.success.button')}
              </Button>
            </div>
      </ModalShell>
    );
  }

  // Form state
  return (
    <ModalShell
      title={t('changePassword.modalTitle')}
      onClose={onClose}
      className="max-h-[90vh] overflow-y-auto"
    >
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-sky-300">{t('changePassword.header.title')}</h2>
              <p className="text-slate-400 mt-2">
                {t('changePassword.header.subtitle')}
              </p>
            </div>

            {/* Error Message */}
            {getErrorMessage() && (
              <Alert variant="error">{getErrorMessage()}</Alert>
            )}

            {/* Change Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormGroup label={t('changePassword.form.currentPasswordLabel')} htmlFor="current-password" error={errors.currentPassword}>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    if (errors.currentPassword) {
                      setErrors(prev => ({ ...prev, currentPassword: null }));
                    }
                  }}
                  placeholder={t('changePassword.form.currentPasswordPlaceholder')}
                  disabled={loading}
                  error={!!errors.currentPassword}
                />
              </FormGroup>

              <FormGroup label={t('changePassword.form.newPasswordLabel')} htmlFor="new-password" error={errors.newPassword}>
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
                  placeholder={t('changePassword.form.newPasswordPlaceholder')}
                  disabled={loading}
                  error={!!errors.newPassword}
                />
              </FormGroup>

              <FormGroup label={t('changePassword.form.confirmPasswordLabel')} htmlFor="confirm-new-password" error={errors.confirmPassword}>
                <Input
                  id="confirm-new-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) {
                      setErrors(prev => ({ ...prev, confirmPassword: null }));
                    }
                  }}
                  placeholder={t('changePassword.form.confirmPasswordPlaceholder')}
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
                {loading ? t('changePassword.form.submittingButton') : t('changePassword.form.submitButton')}
              </Button>
            </form>

            {/* Security Info */}
            <Card>
              <h4 className="text-slate-300 font-medium mb-2">{t('changePassword.requirements.title')}</h4>
              <ul className="text-slate-400 text-sm space-y-1">
                <li>• {t('changePassword.requirements.items.minLength')}</li>
                <li>• {t('changePassword.requirements.items.different')}</li>
                <li>• {t('changePassword.requirements.items.mix')}</li>
              </ul>
            </Card>
          </div>
    </ModalShell>
  );
}