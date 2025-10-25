/**
 * Match Configuration Service
 * 
 * Consolidates match configuration save/update operations to eliminate code duplication.
 * Provides a unified interface for handling match configuration across different flows:
 * - Period setup navigation
 * - Configuration saving
 * - Match configuration updates
 */

import { 
  createMatch, 
  formatMatchDataFromGameState, 
  updateExistingMatch, 
  saveInitialMatchConfig 
} from './matchStateManager';
import { DEFAULT_VENUE_TYPE } from '../constants/matchVenues';
import { FORMATS, getMinimumPlayersForFormat, getMaximumPlayersForFormat } from '../constants/teamConfiguration';

/**
 * Transforms team configuration to the database format using flat structure
 * @param {Object} teamConfig - The team configuration object
 * @returns {Object} Team config for database storage (same as runtime format)
 */
export function formatTeamConfigForDatabase(teamConfig) {
  return {
    format: teamConfig.format,
    formation: teamConfig.formation,
    squadSize: teamConfig.squadSize,
    substitutionType: teamConfig.substitutionType,
    ...(teamConfig.pairedRoleStrategy && { pairedRoleStrategy: teamConfig.pairedRoleStrategy })
  };
}

/**
 * Creates the initial configuration object for database storage
 * @param {Object} params - Configuration parameters
 * @param {Object} params.formation - Formation object
 * @param {Object} params.teamConfig - Team configuration
 * @param {Object} params.matchData - Match data
 * @param {string} params.matchType - Match type
 * @param {string} params.venueType - Venue type (home, away, neutral)
 * @param {string} params.opponentTeam - Opponent team name
 * @param {number} params.numPeriods - Number of periods
 * @param {number} params.periodDurationMinutes - Period duration
 * @param {string} params.captainId - Captain player ID
 * @param {Object} params.periodGoalieIds - Period goalie assignments
 * @param {Array} params.selectedSquadIds - Selected squad player IDs
 * @returns {Object} Initial configuration object
 */
export function createInitialConfiguration(params) {
  const {
    formation,
    teamConfig,
    matchData,
    matchType,
    venueType = DEFAULT_VENUE_TYPE,
    opponentTeam,
    numPeriods,
    periodDurationMinutes,
    captainId,
    periodGoalieIds,
    selectedSquadIds
  } = params;

  const transformedTeamConfig = formatTeamConfigForDatabase(teamConfig);
  
  return {
    formation: formation,
    teamConfig: transformedTeamConfig,
    matchConfig: {
      format: matchData.format,
      matchType: matchType,
      venueType: venueType,
      opponentTeam: opponentTeam,
      periods: numPeriods,
      periodDurationMinutes: periodDurationMinutes,
      captainId: captainId
    },
    periodGoalies: periodGoalieIds,
    squadSelection: selectedSquadIds
  };
}

/**
 * Handles the creation of a new match configuration
 * @param {Object} params - Configuration parameters
 * @param {Object} params.matchData - Formatted match data
 * @param {Array} params.allPlayers - All players array
 * @param {Object} params.initialConfig - Initial configuration object
 * @param {Function} params.setCurrentMatchId - Function to set current match ID
 * @param {Function} params.setMatchCreated - Function to set match creation attempted flag
 * @returns {Promise<{success: boolean, matchId?: string, error?: string}>}
 */
export async function saveNewMatchConfiguration(params) {
  const {
    matchData,
    allPlayers,
    selectedSquadIds = [],
    initialConfig,
    setCurrentMatchId,
    setMatchCreated
  } = params;

  try {
    // CREATE FLOW: No existing match, create new one
    const createResult = await createMatch(matchData, allPlayers, selectedSquadIds);
    
    if (createResult.success) {
      setCurrentMatchId(createResult.matchId);
      setMatchCreated(true); // Prevent duplicate match creation
      
      // Save complete initial configuration for resuming (non-blocking)
      saveInitialMatchConfig(createResult.matchId, initialConfig).catch(error => {
        console.warn('⚠️ Failed to save initial match config:', error);
      });
      
      return {
        success: true,
        matchId: createResult.matchId
      };
    } else {
      console.warn('⚠️ Failed to create pending match:', createResult.error);
      return {
        success: false,
        error: createResult.error
      };
    }
  } catch (error) {
    console.error('❌ Error creating new match configuration:', error);
    return {
      success: false,
      error: `Failed to create match configuration: ${error.message}`
    };
  }
}

/**
 * Handles the update of an existing match configuration
 * @param {Object} params - Configuration parameters
 * @param {string} params.matchId - Current match ID
 * @param {Object} params.matchData - Formatted match data
 * @param {Object} params.initialConfig - Initial configuration object
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateMatchConfiguration(params) {
  const { matchId, matchData, initialConfig } = params;

  try {
    // UPDATE FLOW: Match already exists, update it with new configuration
    const updateResult = await updateExistingMatch(matchId, matchData);
    
    if (updateResult.success) {
      // Update initial configuration for resuming (non-blocking)
      saveInitialMatchConfig(matchId, initialConfig).catch(error => {
        console.warn('⚠️ Failed to update initial match config:', error);
      });
      
      return {
        success: true
      };
    } else {
      console.warn('⚠️ Failed to update pending match:', updateResult.error);
      return {
        success: false,
        error: updateResult.error
      };
    }
  } catch (error) {
    console.error('❌ Error updating match configuration:', error);
    return {
      success: false,
      error: `Failed to update match configuration: ${error.message}`
    };
  }
}

/**
 * Main service function that handles match configuration save/update operations
 * Consolidates the logic from handleStartPeriodSetup, handleSaveConfiguration, and saveMatchConfiguration
 * @param {Object} params - Configuration parameters
 * @param {Object} params.teamConfig - Team configuration
 * @param {string} params.selectedFormation - Selected formation
 * @param {number} params.numPeriods - Number of periods
 * @param {number} params.periodDurationMinutes - Period duration
 * @param {string} params.opponentTeam - Opponent team name
 * @param {string} params.captainId - Captain player ID
 * @param {string} params.matchType - Match type
 * @param {string} params.venueType - Venue type (home, away, neutral)
 * @param {Object} params.formation - Formation object
 * @param {Object} params.periodGoalieIds - Period goalie assignments
 * @param {Array} params.selectedSquadIds - Selected squad player IDs
 * @param {Array} params.allPlayers - All players array
 * @param {Object} params.currentTeam - Current team object
 * @param {string} params.currentMatchId - Current match ID (if exists)
 * @param {boolean} params.matchCreated - Whether match creation was attempted
 * @param {Function} params.setCurrentMatchId - Function to set current match ID
 * @param {Function} params.setMatchCreated - Function to set match creation attempted flag
 * @returns {Promise<{success: boolean, matchId?: string, message?: string, error?: string}>}
 */
export async function saveMatchConfiguration(params) {
  const {
    teamConfig,
    selectedFormation,
    numPeriods,
    periodDurationMinutes,
    opponentTeam,
    captainId,
    matchType,
    venueType = DEFAULT_VENUE_TYPE,
    formation,
    periodGoalieIds,
    selectedSquadIds,
    allPlayers,
    currentTeam,
    currentMatchId,
    matchCreated,
    setCurrentMatchId,
    setMatchCreated
  } = params;

  // Skip save if no team context
  if (!currentTeam?.id) {
    return {
      success: false,
      error: "Team context required for saving configuration."
    };
  }

  try {
    // Prepare match data for database
    const matchData = formatMatchDataFromGameState({
      teamConfig,
      selectedFormation,
      periods: numPeriods,
      periodDurationMinutes,
      opponentTeam,
      captainId,
      matchType,
      venueType
    }, currentTeam.id);

    // Create initial configuration object
    const initialConfig = createInitialConfiguration({
      formation,
      teamConfig,
      matchData,
      matchType,
      venueType,
      opponentTeam,
      numPeriods,
      periodDurationMinutes,
      captainId,
      periodGoalieIds,
      selectedSquadIds
    });

    let result;
    
    if (currentMatchId && matchCreated) {
      // Update existing match
      result = await updateMatchConfiguration({
        matchId: currentMatchId,
        matchData,
        initialConfig
      });
    } else {
      // Create new match
      result = await saveNewMatchConfiguration({
        matchData,
        allPlayers,
        selectedSquadIds,
        initialConfig,
        setCurrentMatchId,
        setMatchCreated
      });
    }

    if (result.success) {
      return {
        success: true,
        matchId: result.matchId || currentMatchId,
        message: `Configuration ${currentMatchId ? 'updated' : 'saved'} successfully`
      };
    } else {
      return {
        success: false,
        error: result.error
      };
    }
  } catch (error) {
    console.error('❌ Error managing match configuration:', error);
    return {
      success: false,
      error: `Failed to save configuration: ${error.message}`
    };
  }
}

/**
 * Validation function to check if configuration is complete
 * @param {Object} params - Validation parameters
 * @param {Array} params.selectedSquadIds - Selected squad player IDs
 * @param {number} params.numPeriods - Number of periods
 * @param {Object} params.periodGoalieIds - Period goalie assignments
 * @param {string} [params.format] - Team format identifier used to derive minimum players
 * @param {number} [params.maxPlayersAllowed] - Maximum players permitted (defaults to global max)
 * @returns {{isValid: boolean, error?: string}} Validation result
 */
export function validateConfiguration(params) {
  const {
    selectedSquadIds = [],
    numPeriods = 0,
    periodGoalieIds = {},
    format = FORMATS.FORMAT_5V5,
    maxPlayersAllowed
  } = params;

  const minimumPlayersRequired = getMinimumPlayersForFormat(format);
  const formatMaximum = getMaximumPlayersForFormat(format);
  const normalizedMax = typeof maxPlayersAllowed === 'number' ? maxPlayersAllowed : formatMaximum;
  const maximumPlayersAllowed = Math.max(
    minimumPlayersRequired,
    Math.min(formatMaximum, normalizedMax)
  );

  // Validate squad size
  if (selectedSquadIds.length < minimumPlayersRequired || selectedSquadIds.length > maximumPlayersAllowed) {
    return {
      isValid: false,
      error: `Please select between ${minimumPlayersRequired} and ${maximumPlayersAllowed} players for the squad.`
    };
  }

  // Validate goalie assignments
  const goaliesAssigned = Array.from({ length: numPeriods }, (_, i) => periodGoalieIds[i + 1]).every(Boolean);
  if (!goaliesAssigned) {
    return {
      isValid: false,
      error: "Please assign a goalie for each period."
    };
  }

  return { isValid: true };
}

/**
 * Utility function to handle CREATE vs UPDATE match flow pattern
 * This is a simplified version that extracts the common pattern without the complex async coordination
 * @param {Object} params - Flow parameters
 * @param {string} params.currentMatchId - Current match ID (if exists)
 * @param {boolean} params.matchCreated - Whether match creation was attempted
 * @param {Object} params.matchData - Formatted match data
 * @param {Array} params.allPlayers - All players array
 * @param {Function} params.setCurrentMatchId - Function to set current match ID
 * @param {Function} params.setMatchCreated - Function to set match creation attempted flag
 * @returns {Promise<{success: boolean, matchId?: string, error?: string}>}
 */
export async function handleMatchCreateOrUpdate(params) {
  const {
    currentMatchId,
    matchCreated,
    matchData,
    allPlayers,
    selectedSquadIds = [],
    setCurrentMatchId,
    setMatchCreated
  } = params;

  try {
    if (currentMatchId && matchCreated) {
      // UPDATE FLOW: Match already exists, update it
      const updateResult = await updateExistingMatch(currentMatchId, matchData);
      if (!updateResult.success) {
        console.warn('⚠️ Failed to update match record:', updateResult.error);
      }
      return {
        success: updateResult.success,
        matchId: currentMatchId,
        error: updateResult.error
      };
    } else {
      // CREATE FLOW: No existing match, create new one
      setMatchCreated(true); // Prevent duplicate attempts
      
      const createResult = await createMatch(matchData, allPlayers, selectedSquadIds);
      if (createResult.success) {
        setCurrentMatchId(createResult.matchId);
        return {
          success: true,
          matchId: createResult.matchId
        };
      } else {
        console.warn('⚠️ Failed to create match record:', createResult.error);
        return {
          success: false,
          error: createResult.error
        };
      }
    }
  } catch (error) {
    console.error('❌ Error in match create/update flow:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
