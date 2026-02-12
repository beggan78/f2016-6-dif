import React, { useState } from 'react';
import { Button } from '../shared/UI';
import { Alert } from '../shared/Alert';
import { ModalShell } from '../shared/ModalShell';
import { useTeam } from '../../contexts/TeamContext';
import { useTranslation } from 'react-i18next';
import {
  Users,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  UserCheck,
  Calendar
} from 'lucide-react';

export function InvitationNotificationModal({
  isOpen,
  invitations,
  onClose,
  onInvitationProcessed
}) {
  const { t, i18n } = useTranslation('team');
  const {
    acceptTeamInvitation,
    declineTeamInvitation,
    getUserTeams,
    switchCurrentTeam,
    getTeamPlayers,
    getClubMemberships,
    loading
  } = useTeam();
  const [processingInvitations, setProcessingInvitations] = useState(new Set());
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen || !invitations || invitations.length === 0) {
    return null;
  }

  const handleAcceptInvitation = async (invitation) => {
    if (processingInvitations.has(invitation.id)) return;

    setProcessingInvitations(prev => new Set([...prev, invitation.id]));

    try {
      const result = await acceptTeamInvitation(invitation.id);

      if (result.success) {
        setSuccessMessage(t('invitationNotification.successJoined', { teamName: invitation.team.name }));

        // Refresh team data and set the newly joined team as current
        try {
          const refreshedTeams = await getUserTeams();

          // Find and set the newly joined team as current
          if (refreshedTeams && refreshedTeams.length > 0) {
            const newTeam = refreshedTeams.find(team => team.id === invitation.teamId);
            if (newTeam) {
              await switchCurrentTeam(newTeam.id);

              // Refresh club memberships to ensure hasClubs is updated
              try {
                await getClubMemberships();
              } catch (clubError) {
                console.error('Error refreshing club memberships:', clubError);
              }

              // Load team players for the newly joined team
              try {
                await getTeamPlayers(newTeam.id);
              } catch (playersError) {
                console.error('Error loading team players:', playersError);
              }
            }
          }
        } catch (refreshError) {
          console.error('Error refreshing team data:', refreshError);
        }

        onInvitationProcessed?.(invitation, 'accepted');

        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      } else {
        console.error('Failed to accept invitation:', result.error);
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
    } finally {
      setProcessingInvitations(prev => {
        const newSet = new Set(prev);
        newSet.delete(invitation.id);
        return newSet;
      });
    }
  };

  const handleDeclineInvitation = async (invitation) => {
    if (processingInvitations.has(invitation.id)) return;

    setProcessingInvitations(prev => new Set([...prev, invitation.id]));

    try {
      const result = await declineTeamInvitation(invitation.id);

      if (result.success) {
        onInvitationProcessed?.(invitation, 'declined');
      } else {
        console.error('Failed to decline invitation:', result.error);
      }
    } catch (error) {
      console.error('Error declining invitation:', error);
    } finally {
      setProcessingInvitations(prev => {
        const newSet = new Set(prev);
        newSet.delete(invitation.id);
        return newSet;
      });
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(i18n.language, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTeamName = (team) => {
    if (team.club && team.club.long_name) {
      return `${team.club.long_name} ${team.name}`;
    }
    return team.name;
  };

  return (
    <ModalShell
      title={t('invitationNotification.title')}
      icon={Users}
      iconColor="blue"
      onClose={onClose}
      maxWidth="2xl"
      className="max-h-[90vh] overflow-y-auto"
    >
          {/* Success Message */}
          {successMessage && (
            <Alert variant="success" icon={CheckCircle} className="mb-4">{successMessage}</Alert>
          )}

          <p className="text-slate-300 text-sm mb-6">
            {invitations.length === 1
              ? t('invitationNotification.inviteDescription')
              : t('invitationNotification.inviteDescriptionPlural', { count: invitations.length })}
          </p>

          {/* Invitations List */}
          <div className="space-y-4">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="border border-slate-600 rounded-lg p-4 bg-slate-700/50"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-slate-100 mb-1">
                      {formatTeamName(invitation.team)}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-slate-400">
                      <div className="flex items-center space-x-1">
                        <UserCheck className="w-4 h-4" />
                        <span>{t('invitationNotification.role', { role: invitation.role })}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{t('invitationNotification.expires', { date: formatDate(invitation.expiresAt) })}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {invitation.invitedBy && (
                  <p className="text-sm text-slate-300 mb-3">
                    {t('invitationNotification.invitedBy', { name: invitation.invitedBy.name })}
                  </p>
                )}

                {invitation.message && (
                  <div className="mb-4 p-3 bg-slate-600/30 rounded border-l-4 border-blue-400">
                    <div className="flex items-start space-x-2">
                      <MessageSquare className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-slate-200">{invitation.message}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end space-x-3">
                  <Button
                    onClick={() => handleDeclineInvitation(invitation)}
                    disabled={loading || processingInvitations.has(invitation.id)}
                    variant="secondary"
                    size="sm"
                    Icon={processingInvitations.has(invitation.id) ? null : XCircle}
                  >
                    {processingInvitations.has(invitation.id) ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-400"></div>
                        {t('invitationNotification.buttons.declining')}
                      </>
                    ) : (
                      t('invitationNotification.buttons.decline')
                    )}
                  </Button>
                  <Button
                    onClick={() => handleAcceptInvitation(invitation)}
                    disabled={loading || processingInvitations.has(invitation.id)}
                    variant="primary"
                    size="sm"
                    Icon={processingInvitations.has(invitation.id) ? null : CheckCircle}
                  >
                    {processingInvitations.has(invitation.id) ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        {t('invitationNotification.buttons.accepting')}
                      </>
                    ) : (
                      t('invitationNotification.buttons.accept')
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-600">
            <div className="flex items-center justify-end">
              <Button onClick={onClose} variant="secondary" Icon={Clock}>
                {t('invitationNotification.buttons.decideLater')}
              </Button>
            </div>
          </div>
    </ModalShell>
  );
}
