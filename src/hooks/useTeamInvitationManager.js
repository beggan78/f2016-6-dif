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
 * @returns {Object} Invitation management interface
 */
export function useTeamInvitationManager({ gameState, authModal, showSuccessMessage }) {
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
      console.log('Invitation already being processed, skipping');
      return;
    }

    try {
      setIsProcessingInvitation(true);
      console.log('Processing invitation:', params.invitationId);

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
    console.log('Handling sign-in request after password setup');

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
      console.log('Checking for pending invitation notifications...');
      const invitations = await getUserPendingInvitations();

      if (invitations && invitations.length > 0) {
        console.log(`Found ${invitations.length} pending invitation(s)`);
        setPendingInvitations(invitations);
        setShowInvitationNotifications(true);
      } else {
        console.log('No pending invitations found');
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
        console.log('Invitation detected:', params);
        setInvitationParams(params);

        // If we have Supabase tokens in the URL hash, set the session
        if (params.isSupabaseInvitation && params.accessToken && params.refreshToken) {
          try {
            console.log('Setting Supabase session with invitation tokens...');
            const { data, error } = await supabase.auth.setSession({
              access_token: params.accessToken,
              refresh_token: params.refreshToken
            });

            if (error) {
              console.error('Error setting session:', error);
            } else {
              console.log('Session set successfully:', data);
            }
          } catch (error) {
            console.error('Exception setting session:', error);
          }
        }
      }
    };

    handleInvitationAndSession();
  }, []); // Run only once on mount

  // Process invitation when user becomes authenticated (but only if they don't need password setup)
  useEffect(() => {
    if (user && invitationParams && shouldProcessInvitation(user, invitationParams)) {
      // Check if user still needs to complete account setup (password)
      if (needsAccountCompletion(invitationParams, user)) {
        console.log('User needs to complete account setup before processing invitation');
        return; // Don't process invitation yet, user needs to set password first
      }

      console.log('User is ready to process invitation');
      handleInvitationAcceptance(invitationParams);
    }
  }, [user, invitationParams, handleInvitationAcceptance]);

  // Check for pending invitation after user signs in (for users who completed password setup)
  useEffect(() => {
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
        showSuccessMessage(`Successfully joined as ${pendingInvitation.role || 'member'}.${teamContext}`);
      }
    }
  }, [user, invitationParams, handleInvitationAcceptance, showSuccessMessage]);

  // Check for pending invitation notifications after user login
  useEffect(() => {
    if (user && !invitationParams) {
      // Small delay to allow other authentication flows to complete
      const timer = setTimeout(() => {
        checkPendingInvitationNotifications();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [user, invitationParams, checkPendingInvitationNotifications]);

  // Clear checked invitations flag when user changes
  useEffect(() => {
    if (!user) {
      setHasCheckedInvitations(false);
      setPendingInvitations([]);
      setShowInvitationNotifications(false);
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