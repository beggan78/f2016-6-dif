import { useGameState } from './useGameState';
import { useRef } from 'react';

/**
 * Centralized hook for detecting current match state
 * 
 * Provides consistent match state detection across the application
 * for determining when to show abandonment warnings. Uses explicit
 * match state instead of UI view inference for reliability.
 * 
 * @returns {Object} Match state information
 * @returns {boolean} hasActiveMatch - True if there's any active match (running or finished)
 * @returns {boolean} hasUnsavedMatch - True if there's a finished match not yet saved to history
 * @returns {boolean} isMatchRunning - True if there's an active running match
 * @returns {string|null} currentMatchId - The current match ID if any
 * @returns {string} matchState - Explicit match state: 'not_started', 'running', 'finished', 'saved'
 */
export function useMatchState() {
  const { currentMatchId, matchState } = useGameState();
  
  // Match state calculations using explicit state instead of view inference
  const hasActiveMatch = Boolean(currentMatchId && (matchState === 'running' || matchState === 'finished'));
  const hasUnsavedMatch = Boolean(currentMatchId && matchState === 'finished');
  const isMatchRunning = Boolean(currentMatchId && matchState === 'running');
  
  // Debug: Only log when match state becomes ready for abandonment guard
  const renderCount = useRef(0);
  const wasActiveMatch = useRef(false);
  renderCount.current++;
  
  // Log only when match state transitions to active (focused debugging)
  if (hasActiveMatch && !wasActiveMatch.current) {
    console.log('✅ MATCH STATE READY FOR ABANDONMENT GUARD', {
      currentMatchId,
      matchState,
      hasActiveMatch,
      hasUnsavedMatch,
      isMatchRunning
    });
  }
  wasActiveMatch.current = hasActiveMatch;
  
  return {
    hasActiveMatch,
    hasUnsavedMatch,
    isMatchRunning,
    currentMatchId,
    matchState
  };
}