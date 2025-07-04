import { useState, useCallback } from 'react';

export function useGameUIState() {
  // Animation state coordination
  const [animationState, setAnimationState] = useState({
    type: 'none', // 'none', 'substitution', 'goalie', 'position-switch'
    phase: 'idle', // 'idle', 'switching', 'completing'  
    data: {} // Animation-specific data
  });

  // Recently substituted player tracking
  const [recentlySubstitutedPlayers, setRecentlySubstitutedPlayers] = useState(new Set());

  // Visual indicator management
  const [hideNextOffIndicator, setHideNextOffIndicator] = useState(false);

  // Undo state handling
  const [lastSubstitution, setLastSubstitution] = useState(null);

  // State for "substitute now" flag
  const [shouldSubstituteNow, setShouldSubstituteNow] = useState(false);

  // Integration with existing animation system
  const resetAnimationState = useCallback(() => {
    setAnimationState({ type: 'none', phase: 'idle', data: {} });
    setHideNextOffIndicator(false);
    setRecentlySubstitutedPlayers(new Set());
  }, []);

  const updateLastSubstitution = useCallback((substitutionData) => {
    setLastSubstitution(substitutionData);
  }, []);

  const clearLastSubstitution = useCallback(() => {
    setLastSubstitution(null);
  }, []);

  const addRecentlySubstitutedPlayer = useCallback((playerId) => {
    setRecentlySubstitutedPlayers(prev => new Set([...prev, playerId]));
  }, []);

  const removeRecentlySubstitutedPlayer = useCallback((playerId) => {
    setRecentlySubstitutedPlayers(prev => {
      const newSet = new Set(prev);
      newSet.delete(playerId);
      return newSet;
    });
  }, []);

  const clearRecentlySubstitutedPlayers = useCallback(() => {
    setRecentlySubstitutedPlayers(new Set());
  }, []);

  return {
    // Animation state
    animationState,
    setAnimationState,
    
    // Visual indicators
    recentlySubstitutedPlayers,
    setRecentlySubstitutedPlayers,
    addRecentlySubstitutedPlayer,
    removeRecentlySubstitutedPlayer,
    clearRecentlySubstitutedPlayers,
    hideNextOffIndicator,
    setHideNextOffIndicator,
    
    // Undo functionality
    lastSubstitution,
    setLastSubstitution,
    updateLastSubstitution,
    clearLastSubstitution,
    
    // Substitution coordination
    shouldSubstituteNow,
    setShouldSubstituteNow,
    
    // Utilities
    resetAnimationState
  };
}