/**
 * Pending Match Service
 * 
 * Handles detection and management of pending matches for the resume feature.
 * Integrates with session detection to trigger pending match modals.
 */

import { getPendingMatchForTeam } from './matchStateManager';
import { supabase } from '../lib/supabase';
import { normalizeFormationStructure } from '../utils/formationUtils';

/**
 * Get ALL pending matches for a team (for multi-match modal)
 * @param {string} teamId - Current team ID
 * @returns {Promise<{shouldShow: boolean, pendingMatches: Array}>}
 */
export async function checkForPendingMatches(teamId) {
  try {
    if (!teamId) {
      return { shouldShow: false, pendingMatches: [] };
    }

    const { data, error } = await supabase
      .from('match')
      .select('*')
      .eq('team_id', teamId)
      .eq('state', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('⚠️ Failed to check for pending matches:', error);
      return { shouldShow: false, pendingMatches: [] };
    }

    // Filter matches that have valid initial config
    const validMatches = data?.filter(match => 
      match.initial_config && 
      Object.keys(match.initial_config).length > 0
    ) || [];

    const shouldShow = validMatches.length > 0;


    return {
      shouldShow,
      pendingMatches: validMatches
    };

  } catch (error) {
    console.error('❌ Exception while checking for pending matches:', error);
    return { shouldShow: false, pendingMatches: [] };
  }
}

/**
 * Check if user has pending match and should show resume modal
 * @param {string} teamId - Current team ID
 * @returns {Promise<{shouldShow: boolean, pendingMatch?: Object}>}
 */
export async function checkForPendingMatch(teamId) {
  try {
    if (!teamId) {
      return { shouldShow: false };
    }

    const result = await getPendingMatchForTeam(teamId);
    
    if (!result.success) {
      console.warn('⚠️ Failed to check for pending match:', result.error);
      return { shouldShow: false };
    }

    // Only show modal if there's a pending match with initial config
    const shouldShow = result.match && 
                      result.match.initial_config && 
                      Object.keys(result.match.initial_config).length > 0;


    return {
      shouldShow,
      pendingMatch: shouldShow ? result.match : null
    };

  } catch (error) {
    console.error('❌ Exception while checking for pending match:', error);
    return { shouldShow: false };
  }
}

/**
 * Validate that pending match configuration is complete and valid
 * @param {Object} initialConfig - Initial configuration from database
 * @returns {boolean} True if configuration is valid for resuming
 */
export function validatePendingMatchConfig(initialConfig) {
  if (!initialConfig || typeof initialConfig !== 'object') {
    return false;
  }

  // Check for required top-level properties
  const requiredProps = ['teamConfig', 'matchConfig', 'squadSelection'];
  for (const prop of requiredProps) {
    if (!initialConfig[prop]) {
      return false;
    }
  }

  // Validate team config
  const { teamConfig } = initialConfig;
  if (!teamConfig.formation || !teamConfig.squadSize || !teamConfig.substitutionConfig) {
    return false;
  }

  // Validate match config
  const { matchConfig } = initialConfig;
  if (!matchConfig.format || !matchConfig.periods || !matchConfig.periodDurationMinutes) {
    return false;
  }

  // Validate squad selection
  const { squadSelection } = initialConfig;
  if (!Array.isArray(squadSelection) || squadSelection.length === 0) {
    return false;
  }

  return true;
}

/**
 * Extract and normalize formation data from initial config for PeriodSetupScreen
 * @param {Object} initialConfig - Initial configuration from database
 * @returns {Object|null} Clean formation object or null if not available
 */
export function extractFormationFromConfig(initialConfig) {
  try {
    if (!initialConfig || !initialConfig.formation || !initialConfig.teamConfig) {
      return null;
    }

    // Convert database teamConfig format (nested) to runtime format (flat) for normalization
    const runtimeTeamConfig = {
      format: initialConfig.teamConfig?.format,
      formation: initialConfig.teamConfig?.formation,
      squadSize: initialConfig.teamConfig?.squadSize,
      substitutionType: initialConfig.teamConfig?.substitutionConfig?.type || 'individual',
      ...(initialConfig.teamConfig?.substitutionConfig?.pairRoleRotation && {
        pairRoleRotation: initialConfig.teamConfig.substitutionConfig.pairRoleRotation
      })
    };

    // Normalize the potentially messy formation structure
    const cleanFormation = normalizeFormationStructure(
      initialConfig.formation,
      runtimeTeamConfig,
      initialConfig.squadSelection || []
    );

    return cleanFormation;
  } catch (error) {
    console.error('❌ Failed to extract and normalize formation from config:', error);
    return null;
  }
}

/**
 * Create resume data object for ConfigurationScreen
 * @param {Object} initialConfig - Initial configuration from database
 * @returns {Object} Resume data formatted for ConfigurationScreen
 */
export function createResumeDataForConfiguration(initialConfig) {
  try {
    if (!validatePendingMatchConfig(initialConfig)) {
      console.warn('⚠️ Invalid pending match config, cannot create resume data');
      return null;
    }

    // Convert database teamConfig format (nested) back to runtime format (flat)
    const runtimeTeamConfig = {
      format: initialConfig.teamConfig?.format,
      formation: initialConfig.teamConfig?.formation,
      squadSize: initialConfig.teamConfig?.squadSize,
      substitutionType: initialConfig.teamConfig?.substitutionConfig?.type,
      ...(initialConfig.teamConfig?.substitutionConfig?.pairRoleRotation && {
        pairRoleRotation: initialConfig.teamConfig.substitutionConfig.pairRoleRotation
      })
    };

    // Get clean, normalized formation data
    const cleanFormationData = extractFormationFromConfig(initialConfig);

    return {
      squadSelection: initialConfig.squadSelection || [],
      periods: initialConfig.matchConfig?.periods || 3,
      periodDurationMinutes: initialConfig.matchConfig?.periodDurationMinutes || 15,
      opponentTeam: initialConfig.matchConfig?.opponentTeam || '',
      matchType: initialConfig.matchConfig?.matchType || 'league',
      captainId: initialConfig.matchConfig?.captainId || null,
      teamConfig: runtimeTeamConfig,
      formation: initialConfig.teamConfig?.formation || '2-2',
      periodGoalies: initialConfig.periodGoalies || {},
      formationData: cleanFormationData
    };
  } catch (error) {
    console.error('❌ Failed to create resume data:', error);
    return null;
  }
}

/**
 * Check if the current match configuration matches a pending match
 * This can be used to avoid creating duplicate pending matches
 * @param {Object} currentConfig - Current match configuration
 * @param {Object} pendingMatch - Pending match from database
 * @returns {boolean} True if configurations are essentially the same
 */
export function matchesCurrentConfiguration(currentConfig, pendingMatch) {
  try {
    if (!currentConfig || !pendingMatch?.initial_config) {
      return false;
    }

    const { initial_config } = pendingMatch;
    
    // Compare key configuration elements
    const squadMatches = JSON.stringify(currentConfig.squadSelection?.sort()) === 
                        JSON.stringify(initial_config.squadSelection?.sort());
    
    const teamConfigMatches = currentConfig.teamConfig?.formation === initial_config.teamConfig?.formation &&
                             currentConfig.teamConfig?.squadSize === initial_config.teamConfig?.squadSize &&
                             currentConfig.teamConfig?.substitutionType === initial_config.teamConfig?.substitutionConfig?.type;
    
    const matchConfigMatches = currentConfig.periods === initial_config.matchConfig?.periods &&
                              currentConfig.periodDurationMinutes === initial_config.matchConfig?.periodDurationMinutes &&
                              currentConfig.opponentTeam === initial_config.matchConfig?.opponentTeam &&
                              currentConfig.matchType === initial_config.matchConfig?.matchType;

    return squadMatches && teamConfigMatches && matchConfigMatches;
  } catch (error) {
    console.error('❌ Error comparing configurations:', error);
    return false;
  }
}