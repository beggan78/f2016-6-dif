import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTeam } from '../contexts/TeamContext';
import { VIEWS } from '../constants/viewConstants';
import { 
  detectInvitationParams, 
  clearInvitationParamsFromUrl, 
  shouldProcessInvitation, 
  needsAccountCompletion, 
  retrievePendingInvitation, 
  hasPendingInvitation
} from '../utils/invitationUtils';
import { supabase } from '../lib/supabase';

/**
 * Hook to manage team invitation functionality
 * 
 * Handles team invitation detection, processing, acceptance workflows,
 * and pending invitation notifications. Provides state management and 
 * handlers for the complete invitation lifecycle.
 * 
 * @param {Object} params - Hook parameters
 * @param {Object} params.gameState - Game state object with view methods
 * @param {Object} params.authModal - Auth modal interface
 * @param {function} params.showSuccessMessage - Function to show success messages
 * @param {boolean} params.needsProfileCompletion - Whether user needs to complete profile setup
 * @returns {Object} Invitation management interface
 */
export function useTeamInvitationManager({ gameState, authModal, showSuccessMessage, needsProfileCompletion }) {
  const { user } = useAuth();
  const { acceptTeamInvitation, getUserPendingInvitations } = useTeam();

  // Invitation state
  const [invitationParams, setInvitationParams] = useState(null);
  const [isProcessingInvitation, setIsProcessingInvitation] = useState(false);

  // Pending invitation notifications
  const [showInvitationNotifications, setShowInvitationNotifications] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [hasCheckedInvitations, setHasCheckedInvitations] = useState(false);

  /**
   * Handle invitation acceptance
   */
  const handleInvitationAcceptance = useCallback(async (params) => {
    if (!params.invitationId) {
      console.error('No invitation ID provided');
      return;
    }

    if (isProcessingInvitation) {
      return;
    }

    try {
      setIsProcessingInvitation(true);

      const result = await acceptTeamInvitation(params.invitationId);

      if (result.success) {
        // Clear URL parameters
        clearInvitationParamsFromUrl();
        setInvitationParams(null);

        // Show welcome message
        showSuccessMessage(result.message || 'Welcome to the team!');

        // Navigate to team management view
        gameState.setView(VIEWS.TEAM_MANAGEMENT);
      } else {
        console.error('Failed to accept invitation:', result.error);
      }
    } catch (error) {
      console.error('Error processing invitation:', error);
    } finally {
      setIsProcessingInvitation(false);
    }
  }, [acceptTeamInvitation, gameState, isProcessingInvitation, showSuccessMessage]);

  /**
   * Handle invitation processed callback from InvitationWelcome
   */
  const handleInvitationProcessed = useCallback((result) => {
    if (result?.success) {
      // Clear URL parameters
      clearInvitationParamsFromUrl();
      setInvitationParams(null);

      // Show welcome message
      showSuccessMessage(result.message || 'Welcome to the team!');

      // Navigate to team management view
      gameState.setView(VIEWS.TEAM_MANAGEMENT);
    }
  }, [gameState, showSuccessMessage]);

  /**
   * Handle request to show sign-in modal after password setup
   */
  const handleRequestSignIn = useCallback(() => {

    // Clear invitation parameters to close InvitationWelcome modal
    clearInvitationParamsFromUrl();
    setInvitationParams(null);

    // Open the AuthModal in sign-in mode
    authModal.openLogin();
  }, [authModal]);

  /**
   * Check for pending invitation notifications
   */
  const checkPendingInvitationNotifications = useCallback(async () => {
    if (!user || hasCheckedInvitations) return;

    try {
      const invitations = await getUserPendingInvitations();

      if (invitations && invitations.length > 0) {
        setPendingInvitations(invitations);
        setShowInvitationNotifications(true);
      } else {
      }

      setHasCheckedInvitations(true);
    } catch (error) {
      console.error('Error checking pending invitations:', error);
      setHasCheckedInvitations(true);
    }
  }, [user, getUserPendingInvitations, hasCheckedInvitations]);

  /**
   * Handle invitation notification processed
   */
  const handleInvitationNotificationProcessed = useCallback((processedInvitation, action) => {
    // Remove processed invitation from the list
    setPendingInvitations(prev =>
      prev.filter(inv => inv.id !== processedInvitation.id)
    );

    // Close modal if no more invitations
    setPendingInvitations(prev => {
      if (prev.length <= 1) {
        setShowInvitationNotifications(false);
      }
      return prev.filter(inv => inv.id !== processedInvitation.id);
    });

    // Show success message
    if (action === 'accepted') {
      showSuccessMessage(`Successfully joined ${processedInvitation.team.name}!`);
      // Navigate to team management view after a longer delay to ensure context is fully updated
      setTimeout(() => {
        gameState.setView(VIEWS.TEAM_MANAGEMENT);
      }, 1000);
    } else if (action === 'declined') {
      showSuccessMessage('Invitation declined');
    }
  }, [gameState, showSuccessMessage]);

  // Check for invitation parameters in URL on app load (only run once)
  useEffect(() => {
    const handleInvitationAndSession = async () => {
      const params = detectInvitationParams();

      if (params.hasInvitation) {
        setInvitationParams(params);

        // If we have Supabase tokens in the URL hash, set the session
        if (params.isSupabaseInvitation && params.accessToken && params.refreshToken) {
          try {
            const { error } = await supabase.auth.setSession({
              access_token: params.accessToken,
              refresh_token: params.refreshToken
            });

            if (error) {
              console.error('Error setting session:', error);
            } else {
              // Reset view to CONFIG to ensure invitation modal can show properly
              // This prevents users from staying on TEAM_MANAGEMENT view which shows loading spinner
              gameState.setView(VIEWS.CONFIG);
            }
          } catch (error) {
            console.error('Exception setting session:', error);
          }
        }
      }
    };

    handleInvitationAndSession();
  }, [gameState]); // Include gameState as dependency

  // Process invitation when user becomes authenticated (but only if they don't need password setup)
  useEffect(() => {
    if (user && invitationParams && shouldProcessInvitation(user, invitationParams)) {
      // Check if user still needs to complete account setup (password)
      if (needsAccountCompletion(invitationParams, user)) {
        return; // Don't process invitation yet, user needs to set password first
      }

      handleInvitationAcceptance(invitationParams);
    }
  }, [user, invitationParams, handleInvitationAcceptance]);

  // Check for pending invitation after user signs in (for users who completed password setup)
  useEffect(() => {
    if (user && !invitationParams && hasPendingInvitation()) {
      const pendingInvitation = retrievePendingInvitation();

      if (pendingInvitation && pendingInvitation.invitationId) {

        // Process the stored invitation
        handleInvitationAcceptance({ invitationId: pendingInvitation.invitationId });

        // Show success message with team context
        const teamContext = pendingInvitation.teamName ?
          ` Welcome to ${pendingInvitation.teamName}!` :
          ' Welcome to the team!';
        showSuccessMessage(`Successfully joined as ${pendingInvitation.role || 'member'}.${teamContext}`);
      }
    }
  }, [user, invitationParams, handleInvitationAcceptance, showSuccessMessage]);

  // Check for pending invitation notifications after user login
  useEffect(() => {
    if (user && !invitationParams && !needsProfileCompletion) {
      // Small delay to allow other authentication flows to complete
      const timer = setTimeout(() => {
        checkPendingInvitationNotifications();
      }, 1000);

      return () => clearTimeout(timer);
    }

    // Reset check flag when user changes
    if (!user) {
      setHasCheckedInvitations(false);
      setPendingInvitations([]);
      setShowInvitationNotifications(false);
    }
  }, [user, invitationParams, needsProfileCompletion, checkPendingInvitationNotifications]);

  // Clear invitation state when user changes
  useEffect(() => {
    if (!user) {
      setInvitationParams(null);
      setIsProcessingInvitation(false);
    }
  }, [user]);

  return {
    // State
    invitationParams,
    isProcessingInvitation,
    showInvitationNotifications,
    pendingInvitations,

    // Handlers
    handleInvitationAcceptance,
    handleInvitationProcessed,
    handleRequestSignIn,
    handleInvitationNotificationProcessed,
    checkPendingInvitationNotifications
  };
}