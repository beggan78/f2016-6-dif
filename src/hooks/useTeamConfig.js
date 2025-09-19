import { useState, useCallback } from 'react';
import {
  createTeamConfig,
  createDefaultTeamConfig,
  FORMATIONS,
  FORMATS,
  FORMAT_CONFIGS,
  SUBSTITUTION_TYPES,
  validateAndCorrectTeamConfig
} from '../constants/teamConfiguration';

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
      const defaultFormat = state.teamConfig?.format || FORMATS.FORMAT_5V5;
      config = createDefaultTeamConfig(7, defaultFormat); // Default squad size/format
    }

    let normalizedConfig = config;
    try {
      const validated = validateAndCorrectTeamConfig(config);
      normalizedConfig = validated?.correctedConfig || config;
    } catch (error) {
      console.warn('⚠️ Failed to validate existing team config, falling back to defaults:', error);
      normalizedConfig = createDefaultTeamConfig(config?.squadSize || 7, config?.format || FORMATS.FORMAT_5V5);
    }

    // Migration: Extract formation from teamConfig if not present
    let formation = state.selectedFormation;
    if (!formation && normalizedConfig) {
      formation = normalizedConfig.formation || FORMATIONS.FORMATION_2_2;
    }

    return { teamConfig: normalizedConfig, selectedFormation: formation };
  };

  const { teamConfig: initialTeamConfig, selectedFormation: initialFormation } =
    initializeTeamConfig(initialState);

  // Team configuration state
  const [teamConfig, setTeamConfig] = useState(initialTeamConfig);
  const [selectedFormation, setSelectedFormation] = useState(initialFormation || FORMATIONS.FORMATION_2_2);

  // Team configuration update function with validation
  const updateTeamConfig = useCallback((newTeamConfig) => {
    console.log('📝 updateTeamConfig called:', {
      'newTeamConfig.substitutionType': newTeamConfig?.substitutionType,
      'newTeamConfig.pairRoleRotation': newTeamConfig?.pairRoleRotation,
      fullNewConfig: newTeamConfig
    });

    // Validate and auto-correct the configuration
    const { isValid, correctedConfig, corrections } = validateAndCorrectTeamConfig(newTeamConfig);

    if (!isValid && corrections.length > 0) {
      console.log('⚠️ TEAM CONFIG CORRECTED:', {
        original: newTeamConfig,
        corrected: correctedConfig,
        corrections
      });
    }

    setTeamConfig(correctedConfig);
  }, []);

  // Formation selection update with centralized validation
  const updateFormationSelection = useCallback((newFormation) => {
    console.log('🔄 updateFormationSelection called:', {
      newFormation,
      'teamConfig.substitutionType': teamConfig?.substitutionType,
      'teamConfig.pairRoleRotation': teamConfig?.pairRoleRotation,
      'teamConfig.squadSize': teamConfig?.squadSize
    });

    setSelectedFormation(newFormation);

    // Update team config with new formation - validation will auto-correct if needed
    if (teamConfig) {
      console.log('🔄 updateFormationSelection: Updating team config with new formation');
      const updatedConfig = {
        ...teamConfig,
        formation: newFormation
      };
      updateTeamConfig(updatedConfig);
    }
  }, [teamConfig, updateTeamConfig]);

  // Create new team config from squad size with validation
  const createTeamConfigFromSquadSize = useCallback((squadSize, substitutionType = null, formatOverride = null) => {
    console.log('🔧 createTeamConfigFromSquadSize called:', {
      squadSize,
      substitutionType,
      selectedFormation,
      'currentTeamConfig.pairRoleRotation': teamConfig?.pairRoleRotation,
      'currentTeamConfig.substitutionType': teamConfig?.substitutionType
    });

    const formatToUse = formatOverride || teamConfig?.format || FORMATS.FORMAT_5V5;
    const formatConfig = FORMAT_CONFIGS[formatToUse] || FORMAT_CONFIGS[FORMATS.FORMAT_5V5];
    const substitutionToUse = substitutionType
      || teamConfig?.substitutionType
      || (formatConfig.getDefaultSubstitutionType
        ? formatConfig.getDefaultSubstitutionType(squadSize)
        : SUBSTITUTION_TYPES.INDIVIDUAL);

    const pairRotation = substitutionToUse === SUBSTITUTION_TYPES.PAIRS
      ? teamConfig?.pairRoleRotation
      : null;

    const newConfig = createTeamConfig(
      formatToUse,
      squadSize,
      selectedFormation, // use current formation selection
      substitutionToUse,
      pairRotation
    );

    console.log('🔧 createTeamConfigFromSquadSize result:', {
      'newConfig.substitutionType': newConfig.substitutionType,
      'newConfig.pairRoleRotation': newConfig.pairRoleRotation,
      fullNewConfig: newConfig
    });

    // updateTeamConfig will handle validation and auto-correction
    updateTeamConfig(newConfig);
    return newConfig;
  }, [selectedFormation, updateTeamConfig, teamConfig]);

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
