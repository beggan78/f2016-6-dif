import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t, i18n } = useTranslation('profile');
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

  const handleCancel = () => {
    setIsEditing(false);
    setEditedName(userProfile?.name || '');
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};

    const trimmedName = editedName.trim();

    if (!trimmedName) {
      newErrors.name = t('validation.nameRequired');
    } else if (trimmedName.length < 2) {
      newErrors.name = t('validation.nameTooShort');
    } else if (!isValidNameInput(trimmedName)) {
      newErrors.name = t('validation.nameInvalidChars');
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
        setSuccessMessage(t('messages.updateSuccess'));
        // Mark profile as completed if name was added
        if (profile.name && profile.name.trim()) {
          markProfileCompleted();
        }
      }
    } catch (error) {
      setErrors({ general: t('messages.unexpectedError') });
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
    if (teamError && !leaveTeamBlocked && !leaveClubBlocked) return teamError;
    return null;
  };

  const formatDate = (dateString) => {
    if (!dateString) return t('formatting.notAvailable');
    try {
      const locale = i18n.language === 'sv' ? 'sv-SE' : 'en-US';
      return new Date(dateString).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return t('formatting.invalidDate');
    }
  };

  const getUserDisplayName = () => {
    if (userProfile?.name) {
      return userProfile.name;
    }
    if (user?.email) {
      return user.email.split('@')[0]; // Fallback to email username
    }
    return t('formatting.defaultUser');
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
    return membership?.club?.long_name || membership?.club?.name || t('formatting.unknownClub');
  };

  const formatTeamName = (team) => {
    if (!team) return t('formatting.unknownTeam');
    return team.club?.long_name ? `${team.club.long_name} ${team.name}` : team.name;
  };

  const getLeaveTeamBlockedMessage = () => {
    if (!leaveTeamBlocked?.team) return '';
    const teamName = formatTeamName(leaveTeamBlocked.team);
    if (leaveTeamBlocked.reason === 'last_team_member') {
      return t('modals.cantLeaveTeam.lastMember', { teamName });
    }
    return t('modals.cantLeaveTeam.lastAdmin', { teamName });
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
      return t('modals.cantLeaveClub.lastMember', { teamName });
    }

    const fallbackTeams = Array.isArray(leaveClubBlocked.teams) ? leaveClubBlocked.teams : [];
    if (fallbackTeams.length > 0) {
      const clubPrefix = leaveClubBlocked.club?.long_name || leaveClubBlocked.club?.name;
      const fallbackName = clubPrefix ? `${clubPrefix} ${fallbackTeams[0]}` : fallbackTeams[0];
      return t('modals.cantLeaveClub.lastMember', { teamName: fallbackName });
    }
    return t('modals.cantLeaveClub.lastMember', { teamName: t('formatting.thisTeam') });
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
        <h1 className="text-2xl font-bold text-sky-300">{t('screen.title')}</h1>
        <Button
          onClick={onNavigateBack}
          variant="secondary"
          size="sm"
        >
          {t('screen.back')}
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
                  <span className="text-emerald-300 text-sm">{t('personalInfo.emailVerified')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Profile Details */}
        <div className="p-6 space-y-6">
          {/* Personal Information */}
          <div>
            <h3 className="text-lg font-semibold text-slate-200 mb-4">{t('personalInfo.title')}</h3>

            <div className="space-y-4">
              {/* Name Field */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t('personalInfo.fullName')}
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
                      placeholder={t('personalInfo.namePlaceholder')}
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
                        {loading ? t('buttons.saving') : t('buttons.save')}
                      </Button>
                      <Button
                        onClick={handleCancel}
                        variant="secondary"
                        size="sm"
                        disabled={loading}
                      >
                        {t('buttons.cancel')}
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
                      {t('buttons.edit')}
                    </Button>
                  </div>
                )}
              </div>

              {/* Email Field (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t('personalInfo.emailAddress')}
                </label>
                <div className="flex items-center justify-between">
                  <span className="text-slate-100">{user?.email}</span>
                  <span className="text-xs text-slate-400">{t('personalInfo.readOnly')}</span>
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t('personalInfo.password')}
                </label>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">••••••••••••</span>
                  <Button
                    onClick={() => setShowChangePassword(true)}
                    variant="secondary"
                    size="sm"
                  >
                    {t('personalInfo.changePassword')}
                  </Button>
                </div>
                <p className="text-slate-500 text-xs mt-1">
                  {t('personalInfo.passwordHint')}
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
              <h3 className="text-lg font-semibold text-slate-200">{t('accountInfo.title')}</h3>
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
                    {t('accountInfo.created')}
                  </label>
                  <span className="text-slate-100 text-sm">
                    {formatDate(user?.created_at)}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    {t('accountInfo.updated')}
                  </label>
                  <span className="text-slate-100 text-sm">
                    {formatDate(userProfile?.updated_at)}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    {t('accountInfo.userId')}
                  </label>
                  <span className="text-slate-400 text-xs font-mono break-all">
                    {user?.id}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    {t('accountInfo.emailStatus')}
                  </label>
                  <span className={`text-sm ${
                    user?.email_confirmed_at
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }`}>
                    {user?.email_confirmed_at ? t('accountInfo.verified') : t('accountInfo.pendingVerification')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Team Management */}
          <div className="border-t border-slate-600 pt-6">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">{t('teamManagement.title')}</h3>

            {teamLoading ? (
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
                <p className="text-slate-400 text-sm text-center">{t('teamManagement.loading')}</p>
              </div>
            ) : !hasClubs ? (
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-600 text-center">
                <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h4 className="font-medium text-slate-200 mb-2">{t('emptyStates.noClubs.title')}</h4>
                <p className="text-slate-400 text-sm mb-4">
                  {t('emptyStates.noClubs.description')}
                </p>
                <Button
                  onClick={() => onNavigateTo(VIEWS.TEAM_MANAGEMENT)}
                  variant="primary"
                  size="sm"
                  className="mx-auto"
                >
                  {t('emptyStates.noClubs.action')}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Clubs */}
                <div>
                  <h4 className="font-medium text-slate-300 mb-3">{t('teamManagement.yourClubs', { count: clubMemberships.length })}</h4>
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
                              {membership.role || t('teamManagement.member')}
                            </p>
                          </div>
                          <Button
                            onClick={() => handleLeaveClub(membership)}
                            variant="danger"
                            size="sm"
                            disabled={leavingClubId === membership.id}
                          >
                            {leavingClubId === membership.id ? t('teamManagement.leaving') : t('teamManagement.leave')}
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
                        <h4 className="font-medium text-sky-200">{t('teamManagement.currentTeam')}</h4>
                        <p className="text-sky-100 font-semibold">
                          {currentTeam.club?.long_name ? `${currentTeam.club.long_name} ${currentTeam.name}` : currentTeam.name}
                        </p>
                        <p className="text-sky-300 text-sm">
                          {currentTeam.userRole || t('teamManagement.member')}
                        </p>
                      </div>
                      <div className="w-3 h-3 bg-emerald-400 rounded-full"></div>
                    </div>
                  </button>
                )}

                {hasTeams ? (
                  <div>
                    <h4 className="font-medium text-slate-300 mb-3">{t('teamManagement.yourTeams', { count: teams.length })}</h4>
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
                                {team.userRole || t('teamManagement.member')}
                                {team.active === false && ` • ${t('teamManagement.inactive')}`}
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
                                  {t('teamManagement.switch')}
                                </button>
                              )}
                              <Button
                                onClick={() => handleLeaveTeam(team)}
                                variant="danger"
                                size="sm"
                                disabled={leavingTeamId === team.id}
                              >
                                {leavingTeamId === team.id ? t('teamManagement.leaving') : t('teamManagement.leave')}
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
                    <h4 className="font-medium text-slate-200 mb-2">{t('emptyStates.noTeams.title')}</h4>
                    <p className="text-slate-400 text-sm mb-4">
                      {t('emptyStates.noTeams.description')}
                    </p>
                    <Button
                      onClick={() => onNavigateTo(VIEWS.TEAM_MANAGEMENT)}
                      variant="primary"
                      size="sm"
                      className="mx-auto"
                    >
                      {t('emptyStates.noTeams.action')}
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
        title={t('modals.leaveClub.title')}
        message={
          leaveClubConfirmation
            ? t('modals.leaveClub.message', { clubName: formatClubName(leaveClubConfirmation) })
            : ''
        }
        confirmText={t('modals.leaveClub.confirm')}
        cancelText={t('buttons.cancel')}
        variant="danger"
      />

      <ConfirmationModal
        isOpen={Boolean(leaveTeamConfirmation)}
        onConfirm={confirmLeaveTeam}
        onCancel={() => setLeaveTeamConfirmation(null)}
        title={t('modals.leaveTeam.title')}
        message={
          leaveTeamConfirmation
            ? t('modals.leaveTeam.message', { teamName: formatTeamName(leaveTeamConfirmation) })
            : ''
        }
        confirmText={t('modals.leaveTeam.confirm')}
        cancelText={t('buttons.cancel')}
        variant="danger"
      />

      <ConfirmationModal
        isOpen={Boolean(leaveClubBlocked)}
        onConfirm={confirmDeleteClubTeam}
        onCancel={handleLeaveClubBlockedCancel}
        title={t('modals.cantLeaveClub.title')}
        message={getLeaveClubBlockedMessage()}
        confirmText={isDeletingClubTeam ? t('modals.cantLeaveClub.deletingButton') : t('modals.cantLeaveClub.deleteButton')}
        cancelText={t('buttons.cancel')}
        variant="danger"
      />

      <ConfirmationModal
        isOpen={Boolean(leaveTeamBlocked)}
        onConfirm={confirmDeleteTeam}
        onCancel={handleLeaveTeamBlockedCancel}
        title={t('modals.cantLeaveTeam.title')}
        message={getLeaveTeamBlockedMessage()}
        confirmText={isDeletingTeam ? t('modals.cantLeaveClub.deletingButton') : t('modals.cantLeaveClub.deleteButton')}
        cancelText={t('buttons.cancel')}
        variant="danger"
      />
    </div>
  );
}
