import { useState, useEffect, useCallback } from 'react';
import { checkForRecoverableMatch, deleteAbandonedMatch, getRecoveryMatchData, validateRecoveryData } from '../services/matchRecoveryService';
import { updateMatchToConfirmed, updatePlayerMatchStatsOnFinish } from '../services/matchStateManager';

/**
 * Hook to manage match recovery functionality
 * 
 * Handles detection and recovery of finished matches that weren't saved to history.
 * Provides state management and handlers for the match recovery modal workflow.
 * 
 * @param {Object} params - Hook parameters
 * @param {Object} params.user - Current authenticated user
 * @param {Object} params.currentTeam - Current selected team
 * @param {Object} params.invitationParams - Invitation parameters if present
 * @param {boolean} params.needsProfileCompletion - Whether user needs to complete profile
 * @param {Object} params.gameState - Game state object with clearStoredState method
 * @param {function} params.setSuccessMessage - Function to set success message
 * @returns {Object} Recovery interface
 * @returns {boolean} showRecoveryModal - Whether the recovery modal should be shown
 * @returns {Object} recoveryMatch - The match data for recovery
 * @returns {boolean} isProcessingRecovery - Whether recovery operations are in progress
 * @returns {function} handleSaveRecovery - Function to save recovered match to history
 * @returns {function} handleAbandonRecovery - Function to delete abandoned match
 * @returns {function} handleCloseRecovery - Function to close recovery modal
 */
export function useMatchRecovery({
  user,
  currentTeam,
  invitationParams,
  needsProfileCompletion,
  gameState,
  setSuccessMessage
}) {
  // Match recovery state
  const [recoveryMatch, setRecoveryMatch] = useState(null);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [isProcessingRecovery, setIsProcessingRecovery] = useState(false);

  // Check for recoverable match on login
  useEffect(() => {
    if (user && currentTeam && !invitationParams && !needsProfileCompletion) {
      // Small delay to allow other authentication flows to complete
      const timer = setTimeout(async () => {
        try {
          if (process.env.NODE_ENV === 'development') {
            console.log('🔍 Checking for recoverable match...');
          }
          
          const result = await checkForRecoverableMatch();
          
          if (result.success && result.match) {
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ Found recoverable match:', result.match.id);
            }
            
            // Validate localStorage data against database match
            const localData = getRecoveryMatchData();
            if (validateRecoveryData(result.match, localData)) {
              setRecoveryMatch(result.match);
              setShowRecoveryModal(true);
            } else {
              if (process.env.NODE_ENV === 'development') {
                console.warn('⚠️ Recovery data validation failed, cleaning up orphaned match');
              }
              // Clean up orphaned match and localStorage
              await deleteAbandonedMatch(result.match.id);
              gameState.clearStoredState();
            }
          }
        } catch (error) {
          console.error('❌ Error checking for recoverable match:', error);
        }
      }, 1500); // Slightly longer delay to avoid conflicts with other systems

      return () => clearTimeout(timer);
    }

    // Reset recovery state when user changes
    if (!user) {
      setRecoveryMatch(null);
      setShowRecoveryModal(false);
      setIsProcessingRecovery(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentTeam, invitationParams, needsProfileCompletion]);

  /**
   * Handle saving recovered match to history
   * Updates match to confirmed state and inserts player statistics
   */
  const handleSaveRecovery = useCallback(async () => {
    if (!recoveryMatch || isProcessingRecovery) return;

    setIsProcessingRecovery(true);
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('💾 Saving recovered match to history:', recoveryMatch.id);
      }

      // Get match data from localStorage
      const localData = getRecoveryMatchData();
      if (!localData) {
        throw new Error('No recovery data found in localStorage');
      }

      // Update match to confirmed state
      const updateResult = await updateMatchToConfirmed(recoveryMatch.id);
      if (!updateResult.success) {
        throw new Error(updateResult.error);
      }

      // Update player statistics with performance data (recovery scenario)
      const statsResult = await updatePlayerMatchStatsOnFinish(
        recoveryMatch.id,
        localData.allPlayers || [],
        localData.goalScorers || {},
        localData.matchEvents || []
      );
      if (!statsResult.success) {
        console.warn('⚠️ Failed to update player statistics:', statsResult.error);
        // Continue even if stats fail - match is already saved
      }

      // Clear localStorage data
      gameState.clearStoredState();

      // Show success message
      setSuccessMessage('Match successfully saved to history!');
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

  return {
    showRecoveryModal,
    recoveryMatch,
    isProcessingRecovery,
    handleSaveRecovery,
    handleAbandonRecovery,
    handleCloseRecovery
  };
}