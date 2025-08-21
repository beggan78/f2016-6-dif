import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button, Input, Select } from '../shared/UI';
import { useTeam } from '../../contexts/TeamContext';
import { useAuth } from '../../contexts/AuthContext';
import { sanitizeEmailInput, sanitizeMessageInput, isValidEmailInput } from '../../utils/inputSanitization';
import { 
  Mail, 
  Users, 
  CheckCircle, 
  AlertTriangle,
  X,
  Clock,
  UserCheck,
  RefreshCw,
  Trash2
} from 'lucide-react';

export function TeamInviteModal({ isOpen, onClose, team }) {
  const { inviteUserToTeam, getTeamInvitations, refreshInvitation, deleteInvitation, loading, error } = useTeam();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    role: 'coach',
    message: ''
  });
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessageOriginal] = useState('');
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [expiredInvitations, setExpiredInvitations] = useState([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  
  // Simplified setSuccessMessage wrapper for basic logging
  const setSuccessMessage = (value) => {
    console.log('✅ [TeamInviteModal] Setting success message:', value);
    setSuccessMessageOriginal(value);
  };

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Format time remaining until expiry
  const formatTimeRemaining = (expiresAt) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    
    if (diffMs <= 0) {
      return 'Expired';
    }
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  };

  // Check if invitation is expired
  const isInvitationExpired = (expiresAt) => {
    return new Date(expiresAt) <= new Date();
  };

  // Fetch all invitations for the current team and separate by status
  const fetchPendingInvitations = useCallback(async () => {
    if (!team?.id) return;
    
    setLoadingInvitations(true);
    try {
      const invitations = await getTeamInvitations(team.id);
      
      // Separate invitations by status, checking expiry for pending ones
      const currentTime = new Date().toISOString();
      const pending = [];
      const expired = [];
      
      invitations.forEach(invitation => {
        if (invitation.status === 'pending') {
          // Check if actually expired despite status
          if (invitation.expires_at && invitation.expires_at <= currentTime) {
            expired.push(invitation);
          } else {
            pending.push(invitation);
          }
        } else if (invitation.status === 'expired') {
          expired.push(invitation);
        }
        // Skip accepted and cancelled invitations
      });
      
      setPendingInvitations(pending);
      setExpiredInvitations(expired);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    } finally {
      setLoadingInvitations(false);
    }
  }, [team?.id, getTeamInvitations]);

  // Track previous isOpen state to detect transitions - always start with false
  const prevIsOpenRef = useRef(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    const wasOpen = prevIsOpenRef.current;
    const isNowOpen = isOpen;
    
    // Handle different modal state transitions
    if (!wasOpen && isNowOpen) {
      // Reset form when modal opens
      setFormData({
        email: '',
        role: 'coach',
        message: ''
      });
      setErrors({});
      // Fetch pending invitations when modal opens
      fetchPendingInvitations();
    } else if (wasOpen && !isNowOpen) {
      // Clear success message when modal closes
      setSuccessMessage('');
    }
    
    // Update ref for next render
    prevIsOpenRef.current = isOpen;
  }, [isOpen, fetchPendingInvitations]);

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
    
    // Enhanced email validation with sanitization
    const sanitizedEmail = sanitizeEmailInput(formData.email);
    if (!sanitizedEmail) {
      newErrors.email = 'Email address is required';
    } else if (!isValidEmailInput(sanitizedEmail)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Role validation
    if (!formData.role) {
      newErrors.role = 'Please select a role';
    }
    
    // Enhanced message validation with sanitization
    const sanitizedMessage = sanitizeMessageInput(formData.message);
    if (sanitizedMessage.length > 500) {
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
      // Use sanitized inputs for security
      const sanitizedEmail = sanitizeEmailInput(formData.email);
      const sanitizedMessage = sanitizeMessageInput(formData.message);
      
      const result = await inviteUserToTeam({
        teamId: team.id,
        email: sanitizedEmail,
        role: formData.role,
        message: sanitizedMessage
      });

      if (result.success) {
        const successMsg = 'Invitation sent successfully!';
        setSuccessMessage(successMsg);
        
        // Reset form after success
        setFormData({
          email: '',
          role: 'coach',
          message: ''
        });
        
        // Refresh pending invitations list
        fetchPendingInvitations();
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      setErrors({ general: 'Failed to send invitation. Please try again.' });
    }
  };

  const handleRefreshInvitation = async (invitation) => {
    try {
      const result = await refreshInvitation({
        invitationId: invitation.id,
        teamId: team.id,
        email: invitation.email,
        role: invitation.role,
        message: invitation.message || ''
      });

      if (result.success) {
        setSuccessMessage(result.message || 'Invitation refreshed successfully!');
        // Refresh the invitations list
        fetchPendingInvitations();
      } else {
        setErrors({ general: result.error || 'Failed to refresh invitation. Please try again.' });
      }
    } catch (error) {
      console.error('Error refreshing invitation:', error);
      setErrors({ general: 'Failed to refresh invitation. Please try again.' });
    }
  };

  const handleDeleteInvitation = async (invitation) => {
    try {
      const result = await deleteInvitation(invitation.id);

      if (result.success) {
        setSuccessMessage(result.message || 'Invitation deleted successfully!');
        // Refresh the invitations list
        fetchPendingInvitations();
      } else {
        setErrors({ general: result.error || 'Failed to delete invitation. Please try again.' });
      }
    } catch (error) {
      console.error('Error deleting invitation:', error);
      setErrors({ general: 'Failed to delete invitation. Please try again.' });
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

  // Auto-fade success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 5000); // 5 seconds
      
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  if (!isOpen) {
    return null;
  }

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

            {/* Invitations Section */}
            <div className="border-t border-slate-600 pt-6 space-y-6">
              
              {/* Pending Invitations */}
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <Clock className="w-5 h-5 text-amber-400" />
                  <h4 className="text-slate-300 font-medium">
                    Pending Invitations
                    {pendingInvitations.length > 0 && (
                      <span className="ml-2 text-sm font-normal text-slate-400">
                        ({pendingInvitations.length})
                      </span>
                    )}
                  </h4>
                </div>

                {loadingInvitations ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sky-400"></div>
                    <span className="ml-2 text-slate-400 text-sm">Loading invitations...</span>
                  </div>
                ) : pendingInvitations.length === 0 ? (
                  <div className="text-center py-4 text-slate-400">
                    <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No pending invitations</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingInvitations.map((invitation) => (
                      <div
                        key={invitation.id}
                        className="bg-slate-700/50 border border-slate-600 rounded-lg p-3"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-slate-300 font-medium text-sm">
                                {invitation.email}
                              </span>
                              <div className="flex items-center space-x-1">
                                <UserCheck className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400 text-xs font-medium">
                                  {invitation.role}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4 text-xs text-slate-400">
                              <span>Sent: {formatDate(invitation.created_at)}</span>
                              {invitation.expires_at && (
                                <span className="font-medium text-amber-400">
                                  {formatTimeRemaining(invitation.expires_at)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                            <span className="text-amber-400 text-xs font-medium">Pending</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Expired Invitations */}
              {expiredInvitations.length > 0 && (
                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-rose-400" />
                    <h4 className="text-slate-300 font-medium">
                      Expired Invitations
                      <span className="ml-2 text-sm font-normal text-slate-400">
                        ({expiredInvitations.length})
                      </span>
                    </h4>
                  </div>

                  <div className="space-y-3">
                    {expiredInvitations.map((invitation) => (
                      <div
                        key={invitation.id}
                        className="bg-slate-700/50 border border-rose-600/30 rounded-lg p-3"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-slate-300 font-medium text-sm">
                                {invitation.email}
                              </span>
                              <div className="flex items-center space-x-1">
                                <UserCheck className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400 text-xs font-medium">
                                  {invitation.role}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4 text-xs text-slate-400">
                              <span>Sent: {formatDate(invitation.created_at)}</span>
                              <span className="font-medium text-rose-400">
                                Expired
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleRefreshInvitation(invitation)}
                              disabled={loading}
                              className="flex items-center space-x-1 px-2 py-1 text-xs font-medium text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Refresh invitation"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>Refresh</span>
                            </button>
                            <button
                              onClick={() => handleDeleteInvitation(invitation)}
                              disabled={loading}
                              className="flex items-center space-x-1 px-2 py-1 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-400/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete invitation"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

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

      {/* Floating Success Toast */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-[60] max-w-sm animate-in slide-in-from-right duration-300">
          <div className="bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-lg border border-emerald-500">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{successMessage}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}