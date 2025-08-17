import React, { useState } from 'react';
import { Button, Input } from '../shared/UI';
import { useAuth } from '../../contexts/AuthContext';
import { useTeam } from '../../contexts/TeamContext';
import { VIEWS } from '../../constants/viewConstants';
import { ChangePassword } from '../auth/ChangePassword';

export function ProfileScreen({ setView }) {
  const { user, userProfile, updateProfile, loading, authError, clearAuthError, profileName, markProfileCompleted } = useAuth();
  const { currentTeam, userTeams, loading: teamLoading } = useTeam();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(userProfile?.name || '');
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showAccountInfo, setShowAccountInfo] = useState(false);

  // Clear messages when user starts editing
  React.useEffect(() => {
    if (isEditing) {
      setSuccessMessage('');
      if (authError) {
        clearAuthError();
      }
    }
  }, [isEditing, authError, clearAuthError]);

  const handleEdit = () => {
    setIsEditing(true);
    setEditedName(userProfile?.name || '');
    setErrors({});
    setSuccessMessage('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedName(userProfile?.name || '');
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!editedName.trim()) {
      newErrors.name = 'Name is required';
    } else if (editedName.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const { profile, error } = await updateProfile({
        name: editedName.trim()
      });

      if (error) {
        setErrors({ general: error.message });
      } else if (profile) {
        setIsEditing(false);
        setSuccessMessage('Profile updated successfully!');
        // Mark profile as completed if name was added
        if (profile.name && profile.name.trim()) {
          markProfileCompleted();
        }
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const getUserDisplayName = () => {
    if (userProfile?.name) {
      return userProfile.name;
    }
    if (user?.email) {
      return user.email.split('@')[0]; // Fallback to email username
    }
    return 'User';
  };

  const getInitials = () => {
    const displayName = getUserDisplayName();
    const names = displayName.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return displayName.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-sky-300">Profile</h1>
        <Button
          onClick={() => setView(VIEWS.CONFIG)}
          variant="secondary"
          size="sm"
        >
          Back
        </Button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-emerald-900/50 border border-emerald-600 rounded-lg p-3">
          <p className="text-emerald-200 text-sm">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {getErrorMessage() && (
        <div className="bg-rose-900/50 border border-rose-600 rounded-lg p-3">
          <p className="text-rose-200 text-sm">{getErrorMessage()}</p>
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-slate-700 rounded-lg border border-slate-600 overflow-hidden">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-sky-600 to-sky-700 px-6 py-8">
          <div className="flex items-center space-x-4">
            {/* Avatar */}
            <div className="w-20 h-20 bg-sky-800 rounded-full flex items-center justify-center border-4 border-sky-400">
              <span className="text-sky-100 text-2xl font-bold">
                {getInitials()}
              </span>
            </div>
            
            {/* User Info */}
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white">
                {getUserDisplayName()}
              </h2>
              <p className="text-sky-200 opacity-90">
                {user?.email}
              </p>
              {user?.email_confirmed_at && (
                <div className="flex items-center space-x-1 mt-1">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-emerald-300 text-sm">Email verified</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Profile Details */}
        <div className="p-6 space-y-6">
          {/* Personal Information */}
          <div>
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Personal Information</h3>
            
            <div className="space-y-4">
              {/* Name Field */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Full Name
                </label>
                {isEditing ? (
                  <div className="space-y-2">
                    <Input
                      value={editedName}
                      onChange={(e) => {
                        setEditedName(e.target.value);
                        if (errors.name) {
                          setErrors(prev => ({ ...prev, name: null }));
                        }
                      }}
                      placeholder="Enter your full name"
                      disabled={loading}
                      className={errors.name ? 'border-rose-500 focus:ring-rose-400 focus:border-rose-500' : ''}
                    />
                    {errors.name && (
                      <p className="text-rose-400 text-sm">{errors.name}</p>
                    )}
                    <div className="flex space-x-2">
                      <Button
                        onClick={handleSave}
                        variant="primary"
                        size="sm"
                        disabled={loading}
                      >
                        {loading ? 'Saving...' : 'Save'}
                      </Button>
                      <Button
                        onClick={handleCancel}
                        variant="secondary"
                        size="sm"
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-100">
                      {profileName}
                    </span>
                    <Button
                      onClick={handleEdit}
                      variant="secondary"
                      size="sm"
                    >
                      Edit
                    </Button>
                  </div>
                )}
              </div>

              {/* Email Field (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email Address
                </label>
                <div className="flex items-center justify-between">
                  <span className="text-slate-100">{user?.email}</span>
                  <span className="text-xs text-slate-400">(Read-only)</span>
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Password
                </label>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">••••••••••••</span>
                  <Button
                    onClick={() => setShowChangePassword(true)}
                    variant="secondary"
                    size="sm"
                  >
                    Change Password
                  </Button>
                </div>
                <p className="text-slate-500 text-xs mt-1">
                  Regularly updating your password helps keep your account secure
                </p>
              </div>
            </div>
          </div>

          {/* Account Information - Collapsible */}
          <div>
            <button
              onClick={() => setShowAccountInfo(!showAccountInfo)}
              className="w-full flex items-center justify-between text-left hover:bg-slate-600 hover:bg-opacity-30 rounded-lg p-2 -m-2 transition-colors"
            >
              <h3 className="text-lg font-semibold text-slate-200">Account Information</h3>
              <svg
                className={`w-5 h-5 text-slate-400 transition-transform ${
                  showAccountInfo ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showAccountInfo && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Account Created
                  </label>
                  <span className="text-slate-100 text-sm">
                    {formatDate(user?.created_at)}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Last Updated
                  </label>
                  <span className="text-slate-100 text-sm">
                    {formatDate(userProfile?.updated_at)}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    User ID
                  </label>
                  <span className="text-slate-400 text-xs font-mono break-all">
                    {user?.id}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Email Status
                  </label>
                  <span className={`text-sm ${
                    user?.email_confirmed_at 
                      ? 'text-emerald-400' 
                      : 'text-amber-400'
                  }`}>
                    {user?.email_confirmed_at ? 'Verified' : 'Pending verification'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Team Management */}
          <div className="border-t border-slate-600 pt-6">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Team Management</h3>
            
            {teamLoading ? (
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
                <p className="text-slate-400 text-sm text-center">Loading your teams...</p>
              </div>
            ) : userTeams && userTeams.length > 0 ? (
              <div className="space-y-4">
                {/* Current Active Team */}
                {currentTeam && (
                  <button
                    onClick={() => setView(VIEWS.TEAM_MANAGEMENT)}
                    className="w-full bg-sky-900/30 border border-sky-600 rounded-lg p-4 hover:bg-sky-900/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <h4 className="font-medium text-sky-200">Current Team</h4>
                        <p className="text-sky-100 font-semibold">
                          {currentTeam.club?.long_name ? `${currentTeam.club.long_name} ${currentTeam.name}` : currentTeam.name}
                        </p>
                        <p className="text-sky-300 text-sm">
                          {currentTeam.userRole || 'Member'}
                        </p>
                      </div>
                      <div className="w-3 h-3 bg-emerald-400 rounded-full"></div>
                    </div>
                  </button>
                )}

                {/* All Teams */}
                <div>
                  <h4 className="font-medium text-slate-300 mb-3">Your Teams ({userTeams.length})</h4>
                  <div className="space-y-2">
                    {userTeams.map((team) => (
                      <div
                        key={team.id}
                        className={`p-3 rounded-lg border transition-colors ${
                          currentTeam && team.id === currentTeam.id
                            ? 'bg-sky-900/20 border-sky-600'
                            : 'bg-slate-800 border-slate-600 hover:bg-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-slate-100">
                              {team.club?.long_name ? `${team.club.long_name} ${team.name}` : team.name}
                            </p>
                            <p className="text-slate-400 text-sm">
                              {team.userRole || 'Member'}
                              {team.active === false && ' • Inactive'}
                            </p>
                          </div>
                          {currentTeam && team.id !== currentTeam.id && (
                            <button
                              onClick={() => {
                                // TODO: Implement team switching
                                console.log('Switch to team:', team.id);
                              }}
                              className="text-sky-400 hover:text-sky-300 text-sm font-medium transition-colors"
                            >
                              Switch
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="pt-2">
                  <Button
                    onClick={() => setView(VIEWS.TEAM_MANAGEMENT)}
                    variant="secondary"
                    size="sm"
                    className="w-full"
                  >
                    Manage All Teams
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-600 text-center">
                <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h4 className="font-medium text-slate-200 mb-2">No Teams Yet</h4>
                <p className="text-slate-400 text-sm mb-4">
                  You haven't joined any teams yet. Create your first team or ask a coach to invite you.
                </p>
                <Button
                  onClick={() => setView(VIEWS.TEAM_MANAGEMENT)}
                  variant="primary"
                  size="sm"
                >
                  Create Your First Team
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <ChangePassword
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </div>
  );
}