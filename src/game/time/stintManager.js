/**
 * Game state integration for time management
 * Handles player stint tracking and time allocation to stats counters
 */

import { shouldSkipTimeCalculation, calculateCurrentStintDuration } from './timeCalculator';
import { getCurrentTimestamp } from '../../utils/timeUtils';
import { PLAYER_ROLES, PLAYER_STATUS } from '../../constants/playerConstants';

/**
 * Update player time statistics based on their current stint
 * @param {Object} player - Player object with stats
 * @param {number} currentTimeEpoch - Current time in milliseconds since epoch
 * @param {boolean} isSubTimerPaused - Whether the substitution timer is paused
 * @returns {Object} Updated player stats object
 */
export const updatePlayerTimeStats = (player, currentTimeEpoch, isSubTimerPaused = false) => {
  const stats = { ...player.stats };
  
  // Skip time calculation if timer is paused or stint hasn't started
  if (shouldSkipTimeCalculation(isSubTimerPaused, stats.lastStintStartTimeEpoch)) {
    return {
      ...stats
      // Don't update lastStintStartTimeEpoch when paused or invalid
    };
  }
  
  // Calculate time spent in current stint
  const stintDuration = calculateCurrentStintDuration(stats.lastStintStartTimeEpoch, currentTimeEpoch);

  // Apply time to appropriate counters based on current status and role
  const updatedStats = applyStintTimeToCounters(stats, stintDuration);
  
  return {
    ...updatedStats,
    lastStintStartTimeEpoch: currentTimeEpoch
  };
};

/**
 * Apply stint duration to appropriate time counters based on player status and role
 * @param {Object} stats - Player stats object
 * @param {number} stintDurationSeconds - Duration of the stint in seconds
 * @returns {Object} Updated stats with time added to appropriate counters
 */
const applyStintTimeToCounters = (stats, stintDurationSeconds) => {
  // Defensive initialization - ensure all time fields exist and are valid numbers
  const updatedStats = {
    ...stats,
    timeOnFieldSeconds: stats.timeOnFieldSeconds || 0,
    timeAsAttackerSeconds: stats.timeAsAttackerSeconds || 0,
    timeAsDefenderSeconds: stats.timeAsDefenderSeconds || 0,
    timeAsMidfielderSeconds: stats.timeAsMidfielderSeconds || 0,
    timeAsSubSeconds: stats.timeAsSubSeconds || 0,
    timeAsGoalieSeconds: stats.timeAsGoalieSeconds || 0
  };
  
  // Validate stint duration
  if (isNaN(stintDurationSeconds) || stintDurationSeconds < 0) {
    return updatedStats;
  }
  
  // Allocate time based on current period status
  switch (stats.currentStatus) {
    case PLAYER_STATUS.ON_FIELD:
      updatedStats.timeOnFieldSeconds += stintDurationSeconds;
      
      // Also track role-specific time for outfield players
      if (stats.currentRole === PLAYER_ROLES.DEFENDER) {
        updatedStats.timeAsDefenderSeconds += stintDurationSeconds;
      } else if (stats.currentRole === PLAYER_ROLES.ATTACKER) {
        updatedStats.timeAsAttackerSeconds += stintDurationSeconds;
      } else if (stats.currentRole === PLAYER_ROLES.MIDFIELDER) {
        updatedStats.timeAsMidfielderSeconds += stintDurationSeconds;
      }
      break;
      
    case PLAYER_STATUS.SUBSTITUTE:
      updatedStats.timeAsSubSeconds += stintDurationSeconds;
      break;
      
    case PLAYER_STATUS.GOALIE:
      updatedStats.timeAsGoalieSeconds += stintDurationSeconds;
      break;
      
    default:
      // Unknown status - don't allocate time
      break;
  }
  
  return updatedStats;
};

/**
 * Start a new stint for a player by updating their stint start time
 * @param {Object} player - Player object
 * @param {number} currentTimeEpoch - Current time in milliseconds since epoch
 * @returns {Object} Player object with updated stint start time
 */
export const startNewStint = (player, currentTimeEpoch) => {
  // Validation
  if (!currentTimeEpoch || currentTimeEpoch <= 0) {
    currentTimeEpoch = getCurrentTimestamp(); // Fallback to current time
  }
  
  // Ensure time fields are properly initialized before starting new stint
  const playerWithInitializedTimeFields = {
    ...player,
    stats: {
      ...player.stats,
      timeOnFieldSeconds: player.stats.timeOnFieldSeconds || 0,
      timeAsAttackerSeconds: player.stats.timeAsAttackerSeconds || 0,
      timeAsDefenderSeconds: player.stats.timeAsDefenderSeconds || 0,
      timeAsMidfielderSeconds: player.stats.timeAsMidfielderSeconds || 0,
      timeAsSubSeconds: player.stats.timeAsSubSeconds || 0,
      timeAsGoalieSeconds: player.stats.timeAsGoalieSeconds || 0,
      lastStintStartTimeEpoch: currentTimeEpoch
    }
  };
  
  return playerWithInitializedTimeFields;
};

/**
 * Complete a player's current stint and update their time stats
 * @param {Object} player - Player object
 * @param {number} currentTimeEpoch - Current time in milliseconds since epoch  
 * @param {boolean} isSubTimerPaused - Whether the substitution timer is paused
 * @returns {Object} Player object with updated time stats
 */
export const completeCurrentStint = (player, currentTimeEpoch, isSubTimerPaused = false) => {
  const updatedStats = updatePlayerTimeStats(player, currentTimeEpoch, isSubTimerPaused);
  
  return {
    ...player,
    stats: updatedStats
  };
};

/**
 * Reset a player's stint timer without adding time to counters
 * Used during substitutions to stop timing without adding more time
 * @param {Object} player - Player object
 * @param {number} currentTimeEpoch - Current time in milliseconds since epoch
 * @returns {Object} Player object with reset stint timer
 */
export const resetPlayerStintTimer = (player, currentTimeEpoch) => {
  // Validation
  if (!currentTimeEpoch || currentTimeEpoch <= 0) {
    currentTimeEpoch = getCurrentTimestamp(); // Fallback to current time
  }

  return {
    ...player,
    stats: {
      ...player.stats,
      lastStintStartTimeEpoch: currentTimeEpoch
    }
  };
};

/**
 * Handle pause/resume time calculations for a player
 * @param {Object} player - Player object
 * @param {number} currentTimeEpoch - Current time in milliseconds since epoch
 * @param {boolean} isPausing - True if pausing, false if resuming
 * @returns {Object} Player object with updated stats
 */
export const handlePauseResumeTime = (player, currentTimeEpoch, isPausing) => {
  const stats = { ...player.stats };
  
  if (isPausing) {
    // When pausing: calculate and accumulate time without resetting stint timer
    if (shouldSkipTimeCalculation(false, stats.lastStintStartTimeEpoch)) {
      return { ...player, stats };
    }
    
    const currentStintTime = calculateCurrentStintDuration(stats.lastStintStartTimeEpoch, currentTimeEpoch);
    
    // Apply time to appropriate counters based on current status and role
    const updatedStats = applyStintTimeToCounters(stats, currentStintTime);
    
    return {
      ...player,
      stats: updatedStats
      // Keep lastStintStartTimeEpoch unchanged when pausing
    };
  } else {
    // When resuming: reset stint start time for active players
    if (stats.currentStatus === 'on_field' ||
        stats.currentStatus === 'substitute' ||
        stats.currentStatus === 'goalie') {
      return startNewStint(player, currentTimeEpoch);
    }
    
    return { ...player, stats };
  }
};