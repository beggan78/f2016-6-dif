import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTeam } from '../contexts/TeamContext';
import { VIEWS } from '../constants/viewConstants';
import { shouldProcessInvitation, needsAccountCompletion, retrievePendingInvitation, hasPendingInvitation } from '../utils/invitationUtils';

/**
 * Custom hook for processing invitation acceptance workflow
 * 
 * Handles:
 * - Invitation acceptance API calls
 * - Processing state management
 * - Navigation after successful acceptance
 * - Pending invitation processing after sign-in
 * - Success/error handling
 * 
 * @param {Object} options Configuration options
 * @param {Function} options.onSuccess Callback when invitation is successfully processed
 * @param {Function} options.onNavigate Function to navigate to views
 * @param {Function} options.clearInvitationParams Function to clear invitation parameters
 * @returns {Object} Invitation processing state and handlers
 */
export function useInvitationProcessing({ 
  onSuccess = () => {}, 
  onNavigate = () => {},
  clearInvitationParams = () => {}
}) {
  const { user } = useAuth();
  const { acceptTeamInvitation } = useTeam();
  const [isProcessing, setIsProcessing] = useState(false);

  // Handle invitation acceptance
  const handleInvitationAcceptance = useCallback(async (params) => {
    if (!params.invitationId) {
      console.error('No invitation ID provided');
      return;
    }

    if (isProcessing) {
      console.log('Invitation already being processed, skipping');
      return;
    }

    try {
      setIsProcessing(true);
      console.log('Processing invitation:', params.invitationId);

      const result = await acceptTeamInvitation(params.invitationId);

      if (result.success) {
        // Clear URL parameters
        clearInvitationParams();

        // Trigger success callback with result
        onSuccess(result.message || 'Welcome to the team!');

        // Navigate to team management view
        onNavigate(VIEWS.TEAM_MANAGEMENT);

        return result;
      } else {
        console.error('Failed to accept invitation:', result.error);
        return result;
      }
    } catch (error) {
      console.error('Error processing invitation:', error);
      return { success: false, error: error.message };
    } finally {
      setIsProcessing(false);
    }
  }, [acceptTeamInvitation, isProcessing, onSuccess, onNavigate, clearInvitationParams]);

  // Handle invitation processed callback from InvitationWelcome component
  const handleInvitationProcessed = useCallback((result) => {
    if (result?.success) {
      // Clear URL parameters
      clearInvitationParams();

      // Trigger success callback
      onSuccess(result.message || 'Welcome to the team!');

      // Navigate to team management view
      onNavigate(VIEWS.TEAM_MANAGEMENT);
    }
  }, [onSuccess, onNavigate, clearInvitationParams]);

  // Process invitation when user becomes authenticated (but only if they don't need password setup)
  const processInvitationForUser = useCallback((invitationParams) => {
    if (user && invitationParams && shouldProcessInvitation(user, invitationParams)) {
      // Check if user still needs to complete account setup (password)
      if (needsAccountCompletion(invitationParams, user)) {
        console.log('User needs to complete account setup before processing invitation');
        return; // Don't process invitation yet, user needs to set password first
      }

      console.log('User is ready to process invitation');
      handleInvitationAcceptance(invitationParams);
    }
  }, [user, handleInvitationAcceptance]);

  // Check for pending invitation after user signs in (for users who completed password setup)
  const processPendingInvitationForUser = useCallback((invitationParams) => {
    if (user && !invitationParams && hasPendingInvitation()) {
      console.log('User signed in, checking for pending invitation...');
      const pendingInvitation = retrievePendingInvitation();

      if (pendingInvitation && pendingInvitation.invitationId) {
        console.log('Processing pending invitation:', pendingInvitation);

        // Process the stored invitation
        handleInvitationAcceptance({ invitationId: pendingInvitation.invitationId });

        // Show success message with team context
        const teamContext = pendingInvitation.teamName ?
          ` Welcome to ${pendingInvitation.teamName}!` :
          ' Welcome to the team!';
        const message = `Successfully joined as ${pendingInvitation.role || 'member'}.${teamContext}`;
        
        onSuccess(message);
      }
    }
  }, [user, handleInvitationAcceptance, onSuccess]);

  return {
    isProcessing,
    handleInvitationAcceptance,
    handleInvitationProcessed,
    processInvitationForUser,
    processPendingInvitationForUser
  };
}