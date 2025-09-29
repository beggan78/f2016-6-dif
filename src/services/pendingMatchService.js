/**
 * Pending Match Service
 * 
 * Handles detection and management of pending matches for the resume feature.
 * Integrates with session detection to trigger pending match modals.
 */

import { getPendingMatchForTeam } from './matchStateManager';
import { supabase } from '../lib/supabase';
import { getInitialFormationTemplate } from '../constants/gameModes';
import { DEFAULT_VENUE_TYPE } from '../constants/matchVenues';

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
      .is('deleted_at', null)
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

    if (!shouldShow) {
      return {
        shouldShow,
        pendingMatches: []
      };
    }

    const createdByIds = Array.from(
      new Set(
        validMatches
          .map(match => match.created_by)
          .filter(Boolean)
      )
    );

    let profileMap = new Map();

    if (createdByIds.length > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from('user_profile')
        .select('id, name')
        .in('id', createdByIds);

      if (profileError) {
        console.warn('⚠️ Failed to fetch creator profiles for pending matches:', profileError);
      } else if (profiles?.length) {
        profileMap = new Map(profiles.map(profile => [profile.id, profile.name]));
      }
    }

    const pendingMatchesWithCreators = validMatches.map(match => {
      const creatorName = profileMap.get(match.created_by) || null;

      return {
        ...match,
        created_by_profile: creatorName
          ? {
              id: match.created_by,
              name: creatorName
            }
          : null,
        creatorName
      };
    });

    return {
      shouldShow,
      pendingMatches: pendingMatchesWithCreators
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
    const shouldShow = !!(result.match &&
                         result.match.initial_config &&
                         Object.keys(result.match.initial_config).length > 0);


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
  if (!teamConfig.formation || !teamConfig.squadSize || !teamConfig.substitutionType) {
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

    // Direct assignment - no conversion needed since database now uses flat structure
    const teamConfig = initialConfig.teamConfig || {};

    return {
      squadSelection: initialConfig.squadSelection || [],
      periods: initialConfig.matchConfig?.periods || 3,
      periodDurationMinutes: initialConfig.matchConfig?.periodDurationMinutes || 15,
      opponentTeam: initialConfig.matchConfig?.opponentTeam || '',
      matchType: initialConfig.matchConfig?.matchType || 'league',
      venueType: initialConfig.matchConfig?.venueType || DEFAULT_VENUE_TYPE,
      captainId: initialConfig.matchConfig?.captainId || null,
      teamConfig: teamConfig,
      formation: teamConfig.formation || '2-2',
      formationData: initialConfig.formation || getInitialFormationTemplate(teamConfig),
      periodGoalies: initialConfig.periodGoalies || {}
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
                             currentConfig.teamConfig?.substitutionType === initial_config.teamConfig?.substitutionType;
    
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
