import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTeam } from '../contexts/TeamContext';
import { VIEWS } from '../constants/viewConstants';

/**
 * Custom hook for managing pending invitation notifications
 * 
 * Handles:
 * - Fetching pending invitations from the server
 * - Managing notification modal state
 * - Processing accept/decline actions
 * - Showing success messages after processing
 * - Navigating after successful acceptance
 * 
 * @param {Object} options Configuration options
 * @param {Function} options.onSuccess Callback when invitation is successfully processed
 * @param {Function} options.onNavigate Function to navigate to views
 * @returns {Object} Invitation notifications state and handlers
 */
export function useInvitationNotifications({ 
  onSuccess = () => {}, 
  onNavigate = () => {},
  currentView = null,
  currentMatchState = null
}) {
  const { user } = useAuth();
  const { getUserPendingInvitations } = useTeam();

  // Notification state
  const [showInvitationNotifications, setShowInvitationNotifications] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [hasCheckedInvitations, setHasCheckedInvitations] = useState(false);

  // Check for pending invitation notifications
  const checkPendingInvitationNotifications = useCallback(async () => {
    if (!user || hasCheckedInvitations) return;

    // Avoid interrupting active or in-progress matches with invitation modals
    if (currentView === VIEWS.GAME && currentMatchState && currentMatchState !== 'finished') {
      return;
    }

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
  }, [user, getUserPendingInvitations, hasCheckedInvitations, currentView, currentMatchState]);

  // Handle invitation notification processed (accept/decline)
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

    // Show success message and navigate
    if (action === 'accepted') {
      const message = `Successfully joined ${processedInvitation.team.name}!`;
      onSuccess(message);
      
      // Navigate to team management view after a delay to ensure context is updated
      setTimeout(() => {
        onNavigate(VIEWS.TEAM_MANAGEMENT);
      }, 1000);
    } else if (action === 'declined') {
      onSuccess('Invitation declined');
    }
  }, [onSuccess, onNavigate]);

  // Reset state when user changes
  const resetNotificationState = useCallback(() => {
    if (!user) {
      setHasCheckedInvitations(false);
      setPendingInvitations([]);
      setShowInvitationNotifications(false);
    }
  }, [user]);

  // Auto-reset when user changes
  useEffect(() => {
    resetNotificationState();
  }, [resetNotificationState]);

  return {
    // State
    showInvitationNotifications,
    pendingInvitations,
    hasCheckedInvitations,
    
    // Actions
    checkPendingInvitationNotifications,
    handleInvitationNotificationProcessed,
    resetNotificationState,
    
    // Setters (for manual control if needed)
    setShowInvitationNotifications,
    setPendingInvitations,
    setHasCheckedInvitations
  };
}
