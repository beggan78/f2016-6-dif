import { useGameState } from './useGameState';

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
  
  // Debug logging for match state calculations
  console.group('🔍 useMatchState - State Calculation');
  console.log('Raw values from useGameState:', { currentMatchId, matchState });
  console.log('Match state conditions:', {
    'currentMatchId exists': Boolean(currentMatchId),
    'matchState === running': matchState === 'running',
    'matchState === finished': matchState === 'finished',
    'matchState in [running,finished]': matchState === 'running' || matchState === 'finished'
  });
  console.log('Calculated boolean values:', {
    hasActiveMatch,
    hasUnsavedMatch,
    isMatchRunning
  });
  console.groupEnd();
  
  return {
    hasActiveMatch,
    hasUnsavedMatch,
    isMatchRunning,
    currentMatchId,
    matchState
  };
}