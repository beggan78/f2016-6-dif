import { useGameState } from './useGameState';

/**
 * Centralized hook for detecting current match state
 * 
 * Provides consistent match state detection across the application
 * for determining when to show abandonment warnings.
 * 
 * @returns {Object} Match state information
 * @returns {boolean} hasActiveMatch - True if there's any active match (running or finished)
 * @returns {boolean} hasUnsavedMatch - True if there's a finished match not yet saved to history
 * @returns {boolean} isMatchRunning - True if there's an active running match
 * @returns {string|null} currentMatchId - The current match ID if any
 */
export function useMatchState() {
  const { currentMatchId, matchStartTime, view } = useGameState();
  
  // Match state calculations
  const hasActiveMatch = Boolean(currentMatchId);
  const hasUnsavedMatch = Boolean(currentMatchId && view === 'stats');
  const isMatchRunning = Boolean(currentMatchId && matchStartTime && view !== 'stats');
  
  return {
    hasActiveMatch,
    hasUnsavedMatch,
    isMatchRunning,
    currentMatchId
  };
}