import { useState, useCallback, useRef, useEffect } from 'react';
import { useMatchState } from './useMatchState';

/**
 * Hook to guard against accidental match abandonment
 * 
 * Intercepts "new game" requests and shows a warning modal
 * if there's an active match that would be lost.
 * 
 * @returns {Object} Guard interface
 * @returns {function} requestNewGame - Function to request a new game with guard protection
 * @returns {boolean} showModal - Whether the abandonment warning modal should be shown
 * @returns {function} handleAbandon - Function to handle confirmed abandonment
 * @returns {function} handleCancel - Function to handle cancelled abandonment
 * @returns {Object} matchState - Current match state information
 */
export function useMatchAbandonmentGuard() {
  const matchState = useMatchState();
  const [showModal, setShowModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  
  // Debug: Log every render of this hook to see when the component re-renders
  console.log('🏗️ useMatchAbandonmentGuard render:', {
    currentMatchId: matchState.currentMatchId,
    matchState: matchState.matchState,
    hasActiveMatch: matchState.hasActiveMatch
  });
  
  // Keep ref of latest match state to detect changes and prevent stale closures
  const matchStateRef = useRef(matchState);
  
  // Update ref whenever match state changes - expanded dependencies to catch all state changes
  useEffect(() => {
    console.log('🔄 useMatchAbandonmentGuard: Match state updated in useEffect', {
      currentMatchId: matchState.currentMatchId,
      matchState: matchState.matchState,
      hasActiveMatch: matchState.hasActiveMatch
    });
    matchStateRef.current = matchState;
  }, [
    matchState.currentMatchId, 
    matchState.matchState, 
    matchState.hasActiveMatch,
    matchState.isMatchRunning
  ]);

  /**
   * Request to start a new game, with abandonment protection
   * 
   * If there's an active match, shows warning modal.
   * If no active match, executes the callback immediately.
   * 
   * @param {function} callback - Function to execute if user confirms or no active match
   */
  const requestNewGame = useCallback((callback) => {
    // Use ref to get the most current match state (avoids stale closures)
    const currentMatchState = matchStateRef.current;
    
    console.group('🚨 Match Abandonment Guard - requestNewGame()');
    console.log('Callback type:', typeof callback);
    console.log('Hook match state:', matchState);
    console.log('Ref match state (current):', currentMatchState);
    console.log('Key values from current state:', {
      currentMatchId: currentMatchState.currentMatchId,
      matchState: currentMatchState.matchState,
      hasActiveMatch: currentMatchState.hasActiveMatch,
      isMatchRunning: currentMatchState.isMatchRunning
    });

    if (typeof callback !== 'function') {
      console.warn('useMatchAbandonmentGuard: requestNewGame requires a callback function');
      console.groupEnd();
      return;
    }

    if (currentMatchState.hasActiveMatch) {
      console.log('✅ Active match detected - showing abandonment modal');
      console.log('Modal will be shown:', true);
      // Store the callback to execute after user confirms abandonment
      setPendingAction(() => callback);
      setShowModal(true);
    } else {
      console.log('❌ No active match - executing callback immediately');
      console.log('Modal will be shown:', false);
      // No active match, execute immediately
      callback();
    }
    console.groupEnd();
  });

  /**
   * Handle confirmed abandonment
   * Executes the pending action and closes the modal
   */
  const handleAbandon = useCallback(() => {
    if (pendingAction) {
      pendingAction();
    }
    setShowModal(false);
    setPendingAction(null);
  }, [pendingAction]);

  /**
   * Handle cancelled abandonment
   * Closes the modal without executing the pending action
   */
  const handleCancel = useCallback(() => {
    setShowModal(false);
    setPendingAction(null);
  }, []);

  return {
    requestNewGame,
    showModal,
    handleAbandon,
    handleCancel,
    matchState
  };
}
