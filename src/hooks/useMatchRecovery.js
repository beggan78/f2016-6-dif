import { useState, useEffect, useCallback } from 'react';
import { 
  checkForRecoverableMatch, 
  deleteAbandonedMatch,
  checkForPendingMatches 
} from '../services/matchRecoveryService';
import { updateMatchToConfirmed } from '../services/matchStateManager';
import { resumePendingMatch, deletePendingMatch } from '../services/pendingMatchService';
import { SUCCESS_MESSAGES } from '../constants/matchDefaults';
import { VIEWS } from '../constants/viewConstants';
import { 
  applyReconstructedGameState, 
  createGameStateSetters
} from '../utils/gameStateHelpers';

/**
 * Hook to manage match recovery functionality
 * 
 * Handles detection and recovery of finished matches that weren't saved to history.
 * Also detects and manages pending matches that can be resumed.
 * Provides state management and handlers for both recovery modal workflows.
 * 
 * @param {Object} params - Hook parameters
 * @param {Object} params.user - Current authenticated user
 * @param {Object} params.currentTeam - Current selected team
 * @param {Object} params.invitationParams - Invitation parameters if present
 * @param {boolean} params.needsProfileCompletion - Whether user needs to complete profile
 * @param {Object} params.gameState - Game state object with clearStoredState method
 * @param {function} params.setSuccessMessage - Function to set success message
 * @param {function} params.navigateToView - Function to navigate to different views
 * @param {Object} params.lastAuthEvent - Latest auth event from Supabase (for sign-in detection)
 * @returns {Object} Recovery interface
 * @returns {boolean} showRecoveryModal - Whether the finished match recovery modal should be shown
 * @returns {Object} recoveryMatch - The finished match data for recovery
 * @returns {boolean} isProcessingRecovery - Whether recovery operations are in progress
 * @returns {function} handleSaveRecovery - Function to save recovered match to history
 * @returns {function} handleAbandonRecovery - Function to delete abandoned match
 * @returns {function} handleCloseRecovery - Function to close recovery modal
 * @returns {boolean} showPendingMatchesModal - Whether the pending matches modal should be shown
 * @returns {Array} pendingMatches - Array of pending matches that can be resumed
 * @returns {boolean} isLoadingPendingMatches - Whether pending matches are being loaded
 * @returns {string} pendingMatchError - Error message for pending match operations
 * @returns {function} handleResumePendingMatch - Function to resume a pending match
 * @returns {function} handleDeletePendingMatch - Function to delete a pending match
 * @returns {function} handleClosePendingModal - Function to close pending matches modal
 * @returns {function} handleConfigureNewMatch - Function to navigate to new match configuration
 */
export function useMatchRecovery({
  user,
  currentTeam,
  invitationParams,
  needsProfileCompletion,
  gameState,
  setSuccessMessage,
  navigateToView,
  lastAuthEvent
}) {
  // Finished match recovery state
  const [recoveryMatch, setRecoveryMatch] = useState(null);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [isProcessingRecovery, setIsProcessingRecovery] = useState(false);

  // Pending match state
  const [pendingMatches, setPendingMatches] = useState([]);
  const [showPendingMatchesModal, setShowPendingMatchesModal] = useState(false);
  const [isLoadingPendingMatches, setIsLoadingPendingMatches] = useState(false);
  const [pendingMatchError, setPendingMatchError] = useState('');

  // Check for recoverable and pending matches on actual sign-in (not page refresh)
  useEffect(() => {
    if (user && currentTeam && !invitationParams && !needsProfileCompletion) {
      
      // Detect if this is a page refresh vs actual sign-in
      const isPageRefresh = performance.navigation.type === 1;
      const isActualSignIn = lastAuthEvent?.event === 'SIGNED_IN' && 
        lastAuthEvent?.timestamp && 
        (Date.now() - lastAuthEvent.timestamp) < 5000; // Within last 5 seconds
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Match recovery check conditions:', {
          isPageRefresh,
          isActualSignIn,
          lastAuthEvent,
          shouldShowModal: !isPageRefresh || isActualSignIn
        });
      }
      
      // Only show modals on actual sign-in, not on page refresh
      if (isPageRefresh && !isActualSignIn) {
        if (process.env.NODE_ENV === 'development') {
          console.log('⏭️ Skipping match recovery check: page refresh detected without recent sign-in');
        }
        return;
      }
      
      // Small delay to allow other authentication flows to complete
      const timer = setTimeout(async () => {
        try {
          // First, check for finished matches that need recovery
          if (process.env.NODE_ENV === 'development') {
            console.log('🔍 Checking for recoverable match...');
          }
          
          const recoveryResult = await checkForRecoverableMatch();
          
          if (recoveryResult.success && recoveryResult.match) {
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ Found recoverable match:', recoveryResult.match.id);
            }
            
            // Priority: Show finished match recovery modal first
            setRecoveryMatch(recoveryResult.match);
            setShowRecoveryModal(true);
            return; // Don't check for pending matches if finished match found
          }

          // If no finished match found, check for pending matches
          if (process.env.NODE_ENV === 'development') {
            console.log('🔍 Checking for pending matches...');
          }

          const pendingResult = await checkForPendingMatches(currentTeam.id);
          
          if (pendingResult.success && pendingResult.matches && pendingResult.matches.length > 0) {
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ Found pending matches:', pendingResult.matches.length);
            }
            
            // Show pending matches modal
            setPendingMatches(pendingResult.matches);
            setShowPendingMatchesModal(true);
          } else if (process.env.NODE_ENV === 'development') {
            console.log('ℹ️ No pending matches found');
          }

        } catch (error) {
          console.error('❌ Error checking for matches:', error);
          setPendingMatchError('Failed to check for pending matches');
        }
      }, 1500); // Slightly longer delay to avoid conflicts with other systems

      return () => clearTimeout(timer);
    }

    // Reset all state when user changes
    if (!user) {
      // Finished match recovery state
      setRecoveryMatch(null);
      setShowRecoveryModal(false);
      setIsProcessingRecovery(false);
      
      // Pending match state
      setPendingMatches([]);
      setShowPendingMatchesModal(false);
      setIsLoadingPendingMatches(false);
      setPendingMatchError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentTeam, invitationParams, needsProfileCompletion, lastAuthEvent]);

  /**
   * Handle saving recovered match to history
   * Updates match to confirmed state - player statistics are already in database
   */
  const handleSaveRecovery = useCallback(async () => {
    if (!recoveryMatch || isProcessingRecovery) return;

    setIsProcessingRecovery(true);
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('💾 Saving recovered match to history:', recoveryMatch.id);
      }

      // Update match to confirmed state - all player stats are already in database
      const updateResult = await updateMatchToConfirmed(recoveryMatch.id);
      if (!updateResult.success) {
        throw new Error(updateResult.error);
      }

      // Clear localStorage data
      gameState.clearStoredState();

      // Show success message
      setSuccessMessage(SUCCESS_MESSAGES.MATCH_SAVED);
      setTimeout(() => setSuccessMessage(''), 3000);

      // Close modal
      setShowRecoveryModal(false);
      setRecoveryMatch(null);

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Match recovery completed successfully');
      }

    } catch (error) {
      console.error('❌ Failed to save recovered match:', error);
      setSuccessMessage('Failed to save match. Please try again.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } finally {
      setIsProcessingRecovery(false);
    }
  }, [recoveryMatch, isProcessingRecovery, gameState, setSuccessMessage]);

  /**
   * Handle abandoning recovered match
   * Deletes match from database and clears localStorage
   */
  const handleAbandonRecovery = useCallback(async () => {
    if (!recoveryMatch || isProcessingRecovery) return;

    setIsProcessingRecovery(true);
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🗑️ Deleting abandoned recovered match:', recoveryMatch.id);
      }

      // Delete match from database
      const deleteResult = await deleteAbandonedMatch(recoveryMatch.id);
      if (!deleteResult.success) {
        throw new Error(deleteResult.error);
      }

      // Clear localStorage data
      gameState.clearStoredState();

      // Show success message
      setSuccessMessage('Match deleted successfully');
      setTimeout(() => setSuccessMessage(''), 3000);

      // Close modal
      setShowRecoveryModal(false);
      setRecoveryMatch(null);

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Abandoned match deleted successfully');
      }

    } catch (error) {
      console.error('❌ Failed to delete abandoned match:', error);
      setSuccessMessage('Failed to delete match. Please try again.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } finally {
      setIsProcessingRecovery(false);
    }
  }, [recoveryMatch, isProcessingRecovery, gameState, setSuccessMessage]);

  /**
   * Handle closing recovery modal
   * Only allows closing if not currently processing
   */
  const handleCloseRecovery = useCallback(() => {
    if (!isProcessingRecovery) {
      setShowRecoveryModal(false);
      setRecoveryMatch(null);
    }
  }, [isProcessingRecovery]);

  /**
   * Handle resuming a pending match
   * Loads match data and navigates to PeriodSetupScreen
   */
  const handleResumePendingMatch = useCallback(async (matchId) => {
    if (!matchId || isLoadingPendingMatches) return;

    setIsLoadingPendingMatches(true);
    setPendingMatchError('');
    
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Resuming pending match:', matchId);
      }

      // Resume the pending match and get reconstructed game state
      const resumeResult = await resumePendingMatch(matchId);
      if (!resumeResult.success) {
        throw new Error(resumeResult.error);
      }

      // Clear localStorage and prepare for new state
      gameState.clearStoredState();
      
      // Load the reconstructed game state into the application
      const reconstructedState = resumeResult.gameState;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Pending match resumed, loading state:', reconstructedState);
        console.log('🔍 FORMATION DEBUG: Reconstructed formation data:', {
          hasFormation: !!reconstructedState.formation,
          formationKeys: reconstructedState.formation ? Object.keys(reconstructedState.formation) : [],
          formationData: reconstructedState.formation,
          hasPeriodGoalieIds: !!reconstructedState.periodGoalieIds,
          periodGoalieIds: reconstructedState.periodGoalieIds
        });
      }

      // Store formation data as backup before applying state (prevent corruption)
      if (reconstructedState.formation) {
        try {
          localStorage.setItem('formationBackup', JSON.stringify({
            formation: reconstructedState.formation,
            timestamp: Date.now(),
            source: 'match_resumption'
          }));
          
          if (process.env.NODE_ENV === 'development') {
            console.log('💾 Formation backup stored:', reconstructedState.formation);
          }
        } catch (error) {
          console.warn('Failed to store formation backup:', error);
        }
      }

      // Apply all game state values using consolidated helper
      const gameStateSetters = createGameStateSetters(gameState);
      const applySuccess = applyReconstructedGameState(reconstructedState, gameStateSetters);
      
      if (!applySuccess) {
        console.warn('Some game state values may not have been applied correctly');
      }

      // Check formation state immediately after application
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 FORMATION STATE CHECK:', {
          hasFormation: !!gameState.formation,
          hasValidData: !!gameState.formation && Object.values(gameState.formation).some(v => v !== null && v !== ''),
          formationKeys: gameState.formation ? Object.keys(gameState.formation) : [],
          applySuccess,
          timestamp: new Date().toISOString()
        });
      }

      // Close the modal
      setShowPendingMatchesModal(false);
      setPendingMatches([]);

      // Navigate to ConfigurationScreen (intentionally) to allow user review before proceeding
      // This gives users a chance to modify settings before going to PeriodSetupScreen
      if (navigateToView) {
        navigateToView(VIEWS.CONFIG);
      }

      // Show success message
      setSuccessMessage(SUCCESS_MESSAGES.MATCH_RESUMED);
      setTimeout(() => setSuccessMessage(''), 3000);

    } catch (error) {
      console.error('❌ Failed to resume pending match:', error);
      setPendingMatchError(`Failed to resume match: ${error.message}`);
    } finally {
      setIsLoadingPendingMatches(false);
    }
  }, [isLoadingPendingMatches, gameState, setSuccessMessage, navigateToView]);

  /**
   * Handle deleting a pending match
   * Removes match from database and updates the list
   */
  const handleDeletePendingMatch = useCallback(async (matchId) => {
    if (!matchId || isLoadingPendingMatches) return;

    setIsLoadingPendingMatches(true);
    setPendingMatchError('');

    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🗑️ Deleting pending match:', matchId);
      }

      // Delete the pending match
      const deleteResult = await deletePendingMatch(matchId);
      if (!deleteResult.success) {
        throw new Error(deleteResult.error);
      }

      // Remove from local state
      setPendingMatches(prev => prev.filter(match => match.id !== matchId));

      // Show success message
      setSuccessMessage(SUCCESS_MESSAGES.MATCH_DELETED);
      setTimeout(() => setSuccessMessage(''), 3000);

      // Close modal if no more pending matches
      if (pendingMatches.length <= 1) {
        setShowPendingMatchesModal(false);
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Pending match deleted successfully');
      }

    } catch (error) {
      console.error('❌ Failed to delete pending match:', error);
      setPendingMatchError(`Failed to delete match: ${error.message}`);
    } finally {
      setIsLoadingPendingMatches(false);
    }
  }, [isLoadingPendingMatches, pendingMatches.length, setSuccessMessage]);

  /**
   * Handle closing pending matches modal
   * Only allows closing if not currently processing
   */
  const handleClosePendingModal = useCallback(() => {
    if (!isLoadingPendingMatches) {
      setShowPendingMatchesModal(false);
      setPendingMatches([]);
      setPendingMatchError('');
    }
  }, [isLoadingPendingMatches]);

  /**
   * Handle configuring a new match
   * Closes the modal and navigates to configuration
   */
  const handleConfigureNewMatch = useCallback(() => {
    // Close the modal
    setShowPendingMatchesModal(false);
    setPendingMatches([]);
    setPendingMatchError('');

    // Navigate to configuration screen
    if (navigateToView) {
      navigateToView(VIEWS.CONFIG);
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('🏗️ Navigated to new match configuration');
    }
  }, [navigateToView]);

  return {
    // Finished match recovery
    showRecoveryModal,
    recoveryMatch,
    isProcessingRecovery,
    handleSaveRecovery,
    handleAbandonRecovery,
    handleCloseRecovery,
    
    // Pending match management
    showPendingMatchesModal,
    pendingMatches,
    isLoadingPendingMatches,
    pendingMatchError,
    handleResumePendingMatch,
    handleDeletePendingMatch,
    handleClosePendingModal,
    handleConfigureNewMatch
  };
}