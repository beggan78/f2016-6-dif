import { useState, useEffect, useCallback } from 'react';

/**
 * Match recovery is disabled now that finished is the terminal match state.
 * The hook remains for API compatibility but does not surface any recovery UI.
 */
export function useMatchRecovery({
  user,
  currentTeam,
  invitationParams,
  needsProfileCompletion
}) {
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryMatch, setRecoveryMatch] = useState(null);
  const [isProcessingRecovery, setIsProcessingRecovery] = useState(false);

  useEffect(() => {
    setShowRecoveryModal(false);
    setRecoveryMatch(null);
    setIsProcessingRecovery(false);
  }, [user, currentTeam, invitationParams, needsProfileCompletion]);

  const handleSaveRecovery = useCallback(() => {}, []);
  const handleAbandonRecovery = useCallback(() => {}, []);
  const handleCloseRecovery = useCallback(() => {
    setShowRecoveryModal(false);
  }, []);

  return {
    showRecoveryModal,
    recoveryMatch,
    isProcessingRecovery,
    handleSaveRecovery,
    handleAbandonRecovery,
    handleCloseRecovery
  };
}
