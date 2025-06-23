/**
 * Game state integration for time management
 * Handles player stint tracking and time allocation to stats counters
 */

import { shouldSkipTimeCalculation, calculateCurrentStintDuration } from './timeCalculator';
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
  const updatedStats = { ...stats };
  
  // Allocate time based on current period status
  switch (stats.currentPeriodStatus) {
    case PLAYER_STATUS.ON_FIELD:
      updatedStats.timeOnFieldSeconds += stintDurationSeconds;
      
      // Also track role-specific time for outfield players
      if (stats.currentPeriodRole === PLAYER_ROLES.DEFENDER) {
        updatedStats.timeAsDefenderSeconds += stintDurationSeconds;
      } else if (stats.currentPeriodRole === PLAYER_ROLES.ATTACKER) {
        updatedStats.timeAsAttackerSeconds += stintDurationSeconds;
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
      console.warn(`Unknown player status: ${stats.currentPeriodStatus}`);
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
  return {
    ...player,
    stats: {
      ...player.stats,
      lastStintStartTimeEpoch: currentTimeEpoch
    }
  };
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