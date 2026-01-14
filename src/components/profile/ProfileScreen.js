import React, { useState, useRef, useEffect } from 'react';
import { Button, ConfirmationModal, Input } from '../shared/UI';
import { useAuth } from '../../contexts/AuthContext';
import { useTeam } from '../../contexts/TeamContext';
import { VIEWS } from '../../constants/viewConstants';
import { ChangePassword } from '../auth/ChangePassword';
import { sanitizeNameInput, isValidNameInput } from '../../utils/inputSanitization';

// Constants
const SUCCESS_MESSAGE_DURATION = 3000; // 3 seconds
const LEAVE_TEAM_BLOCKING_ERRORS = ['last_team_member', 'last_team_admin'];

export function ProfileScreen({ onNavigateBack, onNavigateTo, pushNavigationState, removeFromNavigationStack }) {
  const { user, userProfile, updateProfile, loading, authError, clearAuthError, profileName, markProfileCompleted } = useAuth();
  const {
    currentTeam,
    userTeams,
    userClubs,
    loading: teamLoading,
    leaveClub,
    leaveTeam,
    deleteTeam,
    error: teamError,
    clearError: clearTeamError
  } = useTeam();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(userProfile?.name || '');
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showAccountInfo, setShowAccountInfo] = useState(false);
  const [leavingClubId, setLeavingClubId] = useState(null);
  const [leaveClubConfirmation, setLeaveClubConfirmation] = useState(null);
  const [leaveClubBlocked, setLeaveClubBlocked] = useState(null);
  const [leavingTeamId, setLeavingTeamId] = useState(null);
  const [leaveTeamConfirmation, setLeaveTeamConfirmation] = useState(null);
  const [leaveTeamBlocked, setLeaveTeamBlocked] = useState(null);
  const [isDeletingTeam, setIsDeletingTeam] = useState(false);
  const [isDeletingClubTeam, setIsDeletingClubTeam] = useState(false);
  const nameInputRef = useRef(null);
  const successTimeoutRef = useRef(null);
  const hasClearedTeamNotFoundRef = useRef(false);

  // Register browser back handler
  useEffect(() => {
    if (pushNavigationState) {
      pushNavigationState(() => {
        onNavigateBack();
      });
    }

    return () => {
      if (removeFromNavigationStack) {
        removeFromNavigationStack();
      }
    };
  }, [pushNavigationState, removeFromNavigationStack, onNavigateBack]);

  // Clear messages when user starts editing
  useEffect(() => {
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
  };

  // Auto-focus name input when editing starts
  useEffect(() => {
    if (isEditing && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isEditing]);

  // Handle success message timeout with cleanup
  useEffect(() => {
    if (successMessage) {
      successTimeoutRef.current = setTimeout(() => {
        setSuccessMessage('');
      }, SUCCESS_MESSAGE_DURATION);
    }
    
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
        successTimeoutRef.current = null;
      }
    };
  }, [successMessage]);

  useEffect(() => {
    if (teamError === 'Team not found' && clearTeamError && !hasClearedTeamNotFoundRef.current) {
      hasClearedTeamNotFoundRef.current = true;
      clearTeamError();
      return;
    }

    if (teamError !== 'Team not found') {
      hasClearedTeamNotFoundRef.current = false;
    }
  }, [teamError, clearTeamError]);

  const handleCancel = () => {
    setIsEditing(false);
    setEditedName(userProfile?.name || '');
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};
    
    const trimmedName = editedName.trim();
    
    if (!trimmedName) {
      newErrors.name = 'Name is required';
    } else if (trimmedName.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    } else if (!isValidNameInput(trimmedName)) {
      newErrors.name = 'Name contains invalid characters. Please use only letters, numbers, spaces, hyphens, apostrophes, and periods.';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      // Sanitize the name input for security
      const sanitizedName = sanitizeNameInput(editedName.trim());
      
      const { profile, error } = await updateProfile({
        name: sanitizedName
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
      }
    } catch (error) {
      setErrors({ general: 'An unexpected error occurred. Please try again.' });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !loading) {
      e.preventDefault(); // Prevent any default form submission behavior
      handleSave();
    }
  };

  const getErrorMessage = () => {
    if (errors.general) return errors.general;
    if (authError) return authError;
    if (teamError === 'Team not found') return null;
    if (teamError && !leaveTeamBlocked && !leaveClubBlocked) return teamError;
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

  const formatClubName = (membership) => {
    return membership?.club?.long_name || membership?.club?.name || 'Unknown club';
  };

  const formatTeamName = (team) => {
    if (!team) return 'Unknown team';
    return team.club?.long_name ? `${team.club.long_name} ${team.name}` : team.name;
  };

  const getLeaveTeamBlockedMessage = () => {
    if (!leaveTeamBlocked?.team) return '';
    const teamName = formatTeamName(leaveTeamBlocked.team);
    if (leaveTeamBlocked.reason === 'last_team_member') {
      return `You're the last member of ${teamName}. Delete the team instead?`;
    }
    return `You're the last admin of ${teamName}. Delete the team instead?`;
  };

  const getLeaveClubBlockedTeams = () => {
    if (!leaveClubBlocked?.teams?.length) return [];
    const blockedTeamNames = new Set(leaveClubBlocked.teams);
    return teams.filter(team => blockedTeamNames.has(team.name) && (
      !leaveClubBlocked.clubId || team.club?.id === leaveClubBlocked.clubId
    ));
  };

  const getLeaveClubBlockedMessage = () => {
    if (!leaveClubBlocked) return '';
    const blockedTeams = getLeaveClubBlockedTeams();
    if (blockedTeams.length > 0) {
      const teamName = formatTeamName(blockedTeams[0]);
      return `You're the last member of ${teamName}. Delete the team instead?`;
    }

    const fallbackTeams = Array.isArray(leaveClubBlocked.teams) ? leaveClubBlocked.teams : [];
    if (fallbackTeams.length > 0) {
      const clubPrefix = leaveClubBlocked.club?.long_name || leaveClubBlocked.club?.name;
      const fallbackName = clubPrefix ? `${clubPrefix} ${fallbackTeams[0]}` : fallbackTeams[0];
      return `You're the last member of ${fallbackName}. Delete the team instead?`;
    }
    return "You're the last member of this team. Delete the team instead?";
  };

  const handleLeaveClub = (membership) => {
    if (!membership?.id) {
      return;
    }

    setLeaveClubConfirmation(membership);
  };

  const handleLeaveTeam = (team) => {
    if (!team?.id) {
      return;
    }

    setLeaveTeamConfirmation(team);
  };

  const confirmLeaveClub = async () => {
    if (!leaveClubConfirmation?.id || !leaveClub) {
      setLeaveClubConfirmation(null);
      return;
    }

    setLeavingClubId(leaveClubConfirmation.id);
    try {
      const result = await leaveClub(leaveClubConfirmation);
      if (result?.error === 'last_team_member') {
        setLeaveClubBlocked({
          club: leaveClubConfirmation?.club || null,
          clubId: leaveClubConfirmation?.club?.id || leaveClubConfirmation?.club_id || null,
          membership: leaveClubConfirmation,
          teams: Array.isArray(result?.teams) ? result.teams : []
        });
        if (clearTeamError) {
          clearTeamError();
        }
      } else {
        setLeaveClubBlocked(null);
      }
    } finally {
      setLeavingClubId(null);
      setLeaveClubConfirmation(null);
    }
  };

  const confirmLeaveTeam = async () => {
    if (!leaveTeamConfirmation?.id || !leaveTeam) {
      setLeaveTeamConfirmation(null);
      return;
    }

    setLeavingTeamId(leaveTeamConfirmation.id);
    try {
      const result = await leaveTeam(leaveTeamConfirmation);
      if (result?.error && LEAVE_TEAM_BLOCKING_ERRORS.includes(result.error)) {
        setLeaveTeamBlocked({
          team: leaveTeamConfirmation,
          reason: result.error
        });
        if (clearTeamError) {
          clearTeamError();
        }
      } else {
        setLeaveTeamBlocked(null);
      }
    } finally {
      setLeavingTeamId(null);
      setLeaveTeamConfirmation(null);
    }
  };

  const confirmDeleteTeam = async () => {
    if (!leaveTeamBlocked?.team?.id || !deleteTeam || isDeletingTeam) {
      return;
    }

    setIsDeletingTeam(true);
    try {
      await deleteTeam(leaveTeamBlocked.team);
    } finally {
      setIsDeletingTeam(false);
      setLeaveTeamBlocked(null);
    }
  };

  const confirmDeleteClubTeam = async () => {
    const blockedTeams = getLeaveClubBlockedTeams();
    const teamToDelete = blockedTeams[0];
    if (!teamToDelete?.id || !deleteTeam || isDeletingClubTeam) {
      return;
    }

    setIsDeletingClubTeam(true);
    try {
      const deleteResult = await deleteTeam(teamToDelete);
      if (!deleteResult) {
        setLeaveClubBlocked(null);
        return;
      }
      if (leaveClub && leaveClubBlocked?.membership) {
        const result = await leaveClub(leaveClubBlocked.membership);
        if (result?.error === 'last_team_member') {
          setLeaveClubBlocked({
            club: leaveClubBlocked.club || null,
            clubId: leaveClubBlocked.clubId || null,
            membership: leaveClubBlocked.membership,
            teams: Array.isArray(result?.teams) ? result.teams : []
          });
          if (clearTeamError) {
            clearTeamError();
          }
          return;
        }
      }
      setLeaveClubBlocked(null);
    } finally {
      setIsDeletingClubTeam(false);
    }
  };

  const handleLeaveTeamBlockedCancel = () => {
    setLeaveTeamBlocked(null);
    if (clearTeamError) {
      clearTeamError();
    }
  };

  const handleLeaveClubBlockedCancel = () => {
    setLeaveClubBlocked(null);
    if (clearTeamError) {
      clearTeamError();
    }
  };

  const clubMemberships = userClubs || [];
  const teams = userTeams || [];
  const hasClubs = clubMemberships.length > 0;
  const hasTeams = teams.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-sky-300">Profile</h1>
        <Button
          onClick={onNavigateBack}
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
                      ref={nameInputRef}
                      value={editedName}
                      onChange={(e) => {
                        setEditedName(e.target.value);
                        if (errors.name) {
                          setErrors(prev => ({ ...prev, name: null }));
                        }
                      }}
                      onKeyDown={handleKeyDown}
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
                      className={profileName === 'Not set' ? 'animate-glow-and-fade' : ''}
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
                <p className="text-slate-400 text-sm text-center">Loading your clubs and teams...</p>
              </div>
            ) : !hasClubs ? (
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-600 text-center">
                <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h4 className="font-medium text-slate-200 mb-2">No clubs yet</h4>
                <p className="text-slate-400 text-sm mb-4">
                  You haven't joined any clubs yet. Create a club or join an existing club.
                </p>
                <Button
                  onClick={() => onNavigateTo(VIEWS.TEAM_MANAGEMENT)}
                  variant="primary"
                  size="sm"
                  className="mx-auto"
                >
                  Create or join a club
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Clubs */}
                <div>
                  <h4 className="font-medium text-slate-300 mb-3">Your Clubs ({clubMemberships.length})</h4>
                  <div className="space-y-2">
                    {clubMemberships.map((membership) => (
                      <div
                        key={membership.id}
                        className="bg-slate-800 border border-slate-600 rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 text-left">
                            <p className="font-semibold text-slate-100">
                              {formatClubName(membership)}
                            </p>
                            <p className="text-slate-400 text-sm">
                              {membership.role || 'Member'}
                            </p>
                          </div>
                          <Button
                            onClick={() => handleLeaveClub(membership)}
                            variant="danger"
                            size="sm"
                            disabled={leavingClubId === membership.id}
                          >
                            {leavingClubId === membership.id ? 'Leaving...' : 'Leave'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Current Active Team */}
                {currentTeam && (
                  <button
                    onClick={() => onNavigateTo(VIEWS.TEAM_MANAGEMENT)}
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

                {hasTeams ? (
                  <div>
                    <h4 className="font-medium text-slate-300 mb-3">Your Teams ({teams.length})</h4>
                    <div className="space-y-2">
                      {teams.map((team) => (
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
                            <div className="flex items-center gap-2">
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
                              <Button
                                onClick={() => handleLeaveTeam(team)}
                                variant="danger"
                                size="sm"
                                disabled={leavingTeamId === team.id}
                              >
                                {leavingTeamId === team.id ? 'Leaving...' : 'Leave'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
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
                      onClick={() => onNavigateTo(VIEWS.TEAM_MANAGEMENT)}
                      variant="primary"
                      size="sm"
                      className="mx-auto"
                    >
                      Create or Join a Team
                    </Button>
                  </div>
                )}
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

      <ConfirmationModal
        isOpen={Boolean(leaveClubConfirmation)}
        onConfirm={confirmLeaveClub}
        onCancel={() => setLeaveClubConfirmation(null)}
        title="Leave club"
        message={
          leaveClubConfirmation
            ? `Are you sure you want to leave ${formatClubName(leaveClubConfirmation)}?`
            : ''
        }
        confirmText="Leave club"
        cancelText="Cancel"
        variant="danger"
      />

      <ConfirmationModal
        isOpen={Boolean(leaveTeamConfirmation)}
        onConfirm={confirmLeaveTeam}
        onCancel={() => setLeaveTeamConfirmation(null)}
        title="Leave team"
        message={
          leaveTeamConfirmation
            ? `Are you sure you want to leave ${formatTeamName(leaveTeamConfirmation)}?`
            : ''
        }
        confirmText="Leave team"
        cancelText="Cancel"
        variant="danger"
      />

      <ConfirmationModal
        isOpen={Boolean(leaveClubBlocked)}
        onConfirm={confirmDeleteClubTeam}
        onCancel={handleLeaveClubBlockedCancel}
        title="Can't leave club"
        message={getLeaveClubBlockedMessage()}
        confirmText={isDeletingClubTeam ? 'Deleting...' : 'Delete Team'}
        cancelText="Cancel"
        variant="danger"
      />

      <ConfirmationModal
        isOpen={Boolean(leaveTeamBlocked)}
        onConfirm={confirmDeleteTeam}
        onCancel={handleLeaveTeamBlockedCancel}
        title="Can't leave team"
        message={getLeaveTeamBlockedMessage()}
        confirmText={isDeletingTeam ? 'Deleting...' : 'Delete Team'}
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
