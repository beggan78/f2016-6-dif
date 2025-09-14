import { useState, useCallback } from 'react';
import { createTeamConfig, createDefaultTeamConfig, FORMATIONS } from '../constants/teamConfiguration';

/**
 * Hook for managing team configuration and formation selection
 *
 * Handles:
 * - Team configuration state (format, squad size, formation, substitution type)
 * - Formation selection UI state
 * - Configuration updates and validation
 * - Formation compatibility logic (e.g., 1-2-1 with pairs)
 *
 * @param {Object} initialState - Initial state from persistence
 * @returns {Object} Team configuration state and handlers
 */
export function useTeamConfig(initialState = {}) {
  // Initialize team config with defaults if needed
  const initializeTeamConfig = (state) => {
    let config = state.teamConfig;
    if (!config) {
      config = createDefaultTeamConfig(7); // Default to 7-player individual
    }

    // Migration: Extract formation from teamConfig if not present
    let formation = state.selectedFormation;
    if (!formation && config) {
      formation = config.formation || FORMATIONS.FORMATION_2_2;
    }

    return { teamConfig: config, selectedFormation: formation };
  };

  const { teamConfig: initialTeamConfig, selectedFormation: initialFormation } =
    initializeTeamConfig(initialState);

  // Team configuration state
  const [teamConfig, setTeamConfig] = useState(initialTeamConfig);
  const [selectedFormation, setSelectedFormation] = useState(initialFormation || FORMATIONS.FORMATION_2_2);

  // Team configuration update function
  const updateTeamConfig = useCallback((newTeamConfig) => {
    setTeamConfig(newTeamConfig);
  }, []);

  // Formation selection update with compatibility checks
  const updateFormationSelection = useCallback((newFormation) => {
    setSelectedFormation(newFormation);

    // Automatically switch to individual mode when selecting 1-2-1 formation with 7 players
    // Pairs mode is incompatible with 1-2-1 formation
    if (newFormation === '1-2-1' && teamConfig?.squadSize === 7 && teamConfig?.substitutionType === 'pairs') {
      const updatedConfig = createTeamConfig('5v5', 7, newFormation, 'individual');
      updateTeamConfig(updatedConfig);
      return;
    }

    // Update team config with new formation
    if (teamConfig) {
      const updatedConfig = {
        ...teamConfig,
        formation: newFormation
      };
      updateTeamConfig(updatedConfig);
    }
  }, [teamConfig, updateTeamConfig]);

  // Create new team config from squad size
  const createTeamConfigFromSquadSize = useCallback((squadSize, substitutionType = 'individual') => {
    const newConfig = createTeamConfig(
      '5v5', // format
      squadSize,
      selectedFormation, // use current formation selection
      substitutionType
    );
    updateTeamConfig(newConfig);
    return newConfig;
  }, [selectedFormation, updateTeamConfig]);

  // Helper function to create formation-aware team config
  const getFormationAwareTeamConfig = useCallback(() => {
    if (!teamConfig) return null;

    // Use selectedFormation if available to override the teamConfig formation
    return selectedFormation && selectedFormation !== teamConfig.formation ? {
      ...teamConfig,
      formation: selectedFormation
    } : teamConfig;
  }, [teamConfig, selectedFormation]);

  return {
    // State
    teamConfig,
    selectedFormation,

    // Setters (for external state management)
    setTeamConfig,
    setSelectedFormation,

    // Actions
    updateTeamConfig,
    updateFormationSelection,
    createTeamConfigFromSquadSize,
    getFormationAwareTeamConfig,

    // Computed values for persistence
    getTeamConfigState: () => ({
      teamConfig,
      selectedFormation,
    }),
  };
}