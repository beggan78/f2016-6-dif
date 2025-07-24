import React, { useState } from 'react';
import { Button, Input } from '../shared/UI';
import { useAuth } from '../../contexts/AuthContext';
import { VIEWS } from '../../constants/viewConstants';

export function ProfileScreen({ setView }) {
  const { user, userProfile, updateProfile, loading, authError, clearAuthError, profileName, markProfileCompleted } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(userProfile?.name || '');
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

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
      const { data, error } = await updateProfile({
        name: editedName.trim()
      });

      if (error) {
        setErrors({ general: error.message });
      } else if (data) {
        setIsEditing(false);
        setSuccessMessage('Profile updated successfully!');
        // Mark profile as completed if name was added
        if (data.name && data.name.trim()) {
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
            </div>
          </div>

          {/* Account Information */}
          <div>
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Account Information</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </div>

          {/* Future Features Placeholder */}
          <div className="border-t border-slate-600 pt-6">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Team Management</h3>
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
              <p className="text-slate-400 text-sm text-center">
                Team creation and management features coming soon!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}