import React, { useState, useEffect } from 'react';
import { Button, Input, Select } from '../shared/UI';
import { useTeam } from '../../contexts/TeamContext';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Mail, 
  Users, 
  CheckCircle, 
  AlertTriangle,
  X
} from 'lucide-react';

export function TeamInviteModal({ isOpen, onClose, team }) {
  const { inviteUserToTeam, loading, error } = useTeam();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    role: 'coach',
    message: ''
  });
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        email: '',
        role: 'coach',
        message: ''
      });
      setErrors({});
      setSuccessMessage('');
    }
  }, [isOpen]);

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
    
    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Role validation
    if (!formData.role) {
      newErrors.role = 'Please select a role';
    }
    
    // Message validation (optional but limit length)
    if (formData.message.length > 500) {
      newErrors.message = 'Message must be less than 500 characters';
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
      const result = await inviteUserToTeam({
        teamId: team.id,
        email: formData.email.trim(),
        role: formData.role,
        message: formData.message.trim()
      });

      if (result.success) {
        setSuccessMessage(`Invitation sent successfully to ${formData.email}! They will receive an email with instructions to join the team.`);
        // Reset form after success
        setFormData({
          email: '',
          role: 'coach',
          message: ''
        });
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      setErrors({ general: 'Failed to send invitation. Please try again.' });
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getErrorMessage = () => {
    if (errors.general) return errors.general;
    if (error) return error;
    return null;
  };

  if (!isOpen) return null;

  // Success state
  if (successMessage) {
    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={handleBackdropClick}
      >
        <div className="bg-slate-800 rounded-lg shadow-xl max-w-md w-full border border-slate-600">
          <div className="px-6 py-6">
            <div className="space-y-6 text-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-sky-300">Invitation Sent!</h2>
                <p className="text-slate-400 mt-2">{successMessage}</p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => {
                    setSuccessMessage('');
                    // Keep modal open for sending more invitations
                  }}
                  variant="secondary"
                  size="lg"
                  className="w-full"
                >
                  Send Another Invitation
                </Button>
                
                <Button
                  onClick={onClose}
                  variant="primary"
                  size="lg"
                  className="w-full"
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Form state
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-slate-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-slate-600">
        {/* Modal Header */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-600 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-sky-600 rounded-full flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-sky-300">Invite Team Member</h2>
              <p className="text-sm text-slate-400">
                {team?.name ? `${team.club?.long_name ? `${team.club.long_name} ` : ''}${team.name}` : 'Team'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-800 rounded"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="px-6 py-6">
          <div className="space-y-6">
            {/* Error Message */}
            {getErrorMessage() && (
              <div className="bg-rose-900/50 border border-rose-600 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                  <p className="text-rose-200 text-sm">{getErrorMessage()}</p>
                </div>
              </div>
            )}

            {/* Invitation Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Input */}
              <div>
                <label htmlFor="invite-email" className="block text-sm font-medium text-slate-300 mb-2">
                  Email Address
                </label>
                <Input
                  id="invite-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, email: e.target.value }));
                    if (errors.email) {
                      setErrors(prev => ({ ...prev, email: null }));
                    }
                  }}
                  placeholder="Enter email address"
                  disabled={loading}
                  className={errors.email ? 'border-rose-500 focus:ring-rose-400 focus:border-rose-500' : ''}
                />
                {errors.email && (
                  <p className="text-rose-400 text-sm mt-1">{errors.email}</p>
                )}
              </div>

              {/* Role Selection */}
              <div>
                <label htmlFor="invite-role" className="block text-sm font-medium text-slate-300 mb-2">
                  Team Role
                </label>
                <Select
                  id="invite-role"
                  value={formData.role}
                  onChange={(value) => {
                    setFormData(prev => ({ ...prev, role: value }));
                    if (errors.role) {
                      setErrors(prev => ({ ...prev, role: null }));
                    }
                  }}
                  options={[
                    { value: 'coach', label: 'Coach' },
                    { value: 'parent', label: 'Parent' },
                    { value: 'player', label: 'Player' },
                    ...(user?.id === team?.created_by ? [
                      { value: 'admin', label: 'Admin' }
                    ] : [])
                  ]}
                  disabled={loading}
                  className={errors.role ? 'border-rose-500 focus:ring-rose-400 focus:border-rose-500' : ''}
                />
                {errors.role && (
                  <p className="text-rose-400 text-sm mt-1">{errors.role}</p>
                )}
                <p className="text-slate-500 text-xs mt-1">
                  Choose the appropriate role for this team member
                </p>
              </div>

              {/* Personal Message */}
              <div>
                <label htmlFor="invite-message" className="block text-sm font-medium text-slate-300 mb-2">
                  Personal Message <span className="text-slate-500">(optional)</span>
                </label>
                <textarea
                  id="invite-message"
                  value={formData.message}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, message: e.target.value }));
                    if (errors.message) {
                      setErrors(prev => ({ ...prev, message: null }));
                    }
                  }}
                  placeholder="Add a personal message to include with the invitation..."
                  className={`w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none ${
                    errors.message ? 'border-rose-500 focus:ring-rose-400' : ''
                  }`}
                  rows={3}
                  maxLength={500}
                  disabled={loading}
                />
                {errors.message && (
                  <p className="text-rose-400 text-sm mt-1">{errors.message}</p>
                )}
                <p className="text-slate-500 text-xs mt-1">
                  {formData.message.length}/500 characters
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={loading}
                className="w-full"
                Icon={loading ? Users : Mail}
              >
                {loading ? 'Sending Invitation...' : 'Send Invitation'}
              </Button>
            </form>

            {/* Info Box */}
            <div className="bg-slate-700 border border-slate-600 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Users className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-slate-300 font-medium mb-2">What happens next?</h4>
                  <ul className="text-slate-400 text-sm space-y-1">
                    <li>• The invitee will receive an email with a secure invitation link</li>
                    <li>• They can create an account or sign in if they already have one</li>
                    <li>• Once accepted, they'll be automatically added to your team</li>
                    <li>• You can manage their role and permissions anytime</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}