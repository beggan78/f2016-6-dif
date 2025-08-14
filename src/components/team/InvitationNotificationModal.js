import React, { useState } from 'react';
import { Button } from '../shared/UI';
import { useTeam } from '../../contexts/TeamContext';
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
        setSuccessMessage(`Successfully joined ${invitation.team.name}!`);
        
        // Refresh team data and set the newly joined team as current
        try {
          console.log('[DEBUG] InvitationModal: Starting team data refresh after accepting invitation to team:', invitation.teamId);
          const refreshedTeams = await getUserTeams();
          console.log('[DEBUG] InvitationModal: Team data refreshed, got', refreshedTeams?.length || 0, 'teams');
          
          // Find and set the newly joined team as current
          if (refreshedTeams && refreshedTeams.length > 0) {
            const newTeam = refreshedTeams.find(team => team.id === invitation.teamId);
            console.log('[DEBUG] InvitationModal: Looking for team ID:', invitation.teamId, 'found:', !!newTeam);
            if (newTeam) {
              console.log('[DEBUG] InvitationModal: Setting newly joined team as current:', newTeam.name);
              await switchCurrentTeam(newTeam.id);
              
              // Refresh club memberships to ensure hasClubs is updated
              try {
                console.log('[DEBUG] InvitationModal: Refreshing club memberships after team join');
                await getClubMemberships();
                console.log('[DEBUG] InvitationModal: Club memberships refreshed successfully');
              } catch (clubError) {
                console.error('[DEBUG] InvitationModal: Error refreshing club memberships:', clubError);
              }
              
              // Load team players for the newly joined team
              try {
                console.log('[DEBUG] InvitationModal: Loading team players for:', newTeam.name);
                await getTeamPlayers(newTeam.id);
                console.log('[DEBUG] InvitationModal: Team players loaded successfully');
              } catch (playersError) {
                console.error('[DEBUG] InvitationModal: Error loading team players:', playersError);
              }
            } else {
              console.log('[DEBUG] InvitationModal: New team not found in refreshed teams. Available teams:', refreshedTeams.map(t => ({id: t.id, name: t.name})));
            }
          } else {
            console.log('[DEBUG] InvitationModal: No teams found after refresh');
          }
        } catch (refreshError) {
          console.error('[DEBUG] InvitationModal: Error refreshing team data:', refreshError);
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
    return new Date(dateString).toLocaleDateString('en-US', {
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Users className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-semibold text-slate-100">
                Team Invitations
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 p-3 bg-emerald-900/50 border border-emerald-600 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span className="text-emerald-200 text-sm">{successMessage}</span>
              </div>
            </div>
          )}

          <p className="text-slate-300 text-sm mb-6">
            You have been invited to join {invitations.length === 1 ? 'a team' : `${invitations.length} teams`}. 
            Choose to accept or decline each invitation below.
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
                        <span>Role: {invitation.role}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>Expires: {formatDate(invitation.expiresAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {invitation.invitedBy && (
                  <p className="text-sm text-slate-300 mb-3">
                    Invited by <span className="font-medium">{invitation.invitedBy.name}</span>
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
                        Declining...
                      </>
                    ) : (
                      'Decline'
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
                        Accepting...
                      </>
                    ) : (
                      'Accept'
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-600">
            <div className="flex items-center justify-end">
              <Button onClick={onClose} variant="secondary" Icon={Clock}>
                I'll decide later
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}