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
  console.log(`🔍 DEBUG updatePlayerTimeStats - Player ${player.id} (${player.name}):`);
  console.log(`  📊 Input: timeOnField=${player.stats.timeOnFieldSeconds}s, timeAsAttacker=${player.stats.timeAsAttackerSeconds}s, timeAsDefender=${player.stats.timeAsDefenderSeconds}s`);
  console.log(`  ⏱️ isSubTimerPaused: ${isSubTimerPaused}, lastStintStart: ${player.stats.lastStintStartTimeEpoch}, currentTime: ${currentTimeEpoch}`);
  
  const stats = { ...player.stats };
  
  // Skip time calculation if timer is paused or stint hasn't started
  if (shouldSkipTimeCalculation(isSubTimerPaused, stats.lastStintStartTimeEpoch)) {
    console.log(`  ⏸️ SKIPPING time calculation (timer paused or invalid stint start)`);
    return {
      ...stats
      // Don't update lastStintStartTimeEpoch when paused or invalid
    };
  }
  
  // Calculate time spent in current stint
  const stintDuration = calculateCurrentStintDuration(stats.lastStintStartTimeEpoch, currentTimeEpoch);
  console.log(`  ⏰ Calculated stint duration: ${stintDuration}s`);

  // Apply time to appropriate counters based on current status and role
  const updatedStats = applyStintTimeToCounters(stats, stintDuration);
  console.log(`  📊 After applying time: timeOnField=${updatedStats.timeOnFieldSeconds}s, timeAsAttacker=${updatedStats.timeAsAttackerSeconds}s, timeAsDefender=${updatedStats.timeAsDefenderSeconds}s`);
  
  const result = {
    ...updatedStats,
    lastStintStartTimeEpoch: currentTimeEpoch
  };
  
  console.log(`  ✅ Final result: timeOnField=${result.timeOnFieldSeconds}s, timeAsAttacker=${result.timeAsAttackerSeconds}s, timeAsDefender=${result.timeAsDefenderSeconds}s`);
  return result;
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
    timeAsSubSeconds: stats.timeAsSubSeconds || 0,
    timeAsGoalieSeconds: stats.timeAsGoalieSeconds || 0
  };
  
  // Validate stint duration
  if (isNaN(stintDurationSeconds) || stintDurationSeconds < 0) {
    console.warn('applyStintTimeToCounters: Invalid stint duration:', stintDurationSeconds);
    return updatedStats;
  }
  
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
  // Validation
  if (!currentTimeEpoch || currentTimeEpoch <= 0) {
    console.warn(`startNewStint: Invalid currentTimeEpoch for player ${player.id}:`, currentTimeEpoch);
    currentTimeEpoch = Date.now(); // Fallback to current time
  }
  
  // Ensure time fields are properly initialized before starting new stint
  const playerWithInitializedTimeFields = {
    ...player,
    stats: {
      ...player.stats,
      timeOnFieldSeconds: player.stats.timeOnFieldSeconds || 0,
      timeAsAttackerSeconds: player.stats.timeAsAttackerSeconds || 0,
      timeAsDefenderSeconds: player.stats.timeAsDefenderSeconds || 0,
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
  console.log(`🔄 DEBUG resetPlayerStintTimer - Player ${player.id} (${player.name}):`);
  console.log(`  📊 Input: timeOnField=${player.stats.timeOnFieldSeconds}s, timeAsAttacker=${player.stats.timeAsAttackerSeconds}s, timeAsDefender=${player.stats.timeAsDefenderSeconds}s`);
  console.log(`  ⏱️ lastStintStart: ${player.stats.lastStintStartTimeEpoch}, newCurrentTime: ${currentTimeEpoch}`);
  
  // Calculate potential stint duration that is being ignored
  const stintDuration = player.stats.lastStintStartTimeEpoch ? Math.round((currentTimeEpoch - player.stats.lastStintStartTimeEpoch) / 1000) : 0;
  console.log(`  ⏰ Stint duration being IGNORED: ${stintDuration}s`);
  
  // Validation
  if (!currentTimeEpoch || currentTimeEpoch <= 0) {
    console.warn(`resetPlayerStintTimer: Invalid currentTimeEpoch for player ${player.id}:`, currentTimeEpoch);
    currentTimeEpoch = Date.now(); // Fallback to current time
  }

  const result = {
    ...player,
    stats: {
      ...player.stats,
      lastStintStartTimeEpoch: currentTimeEpoch
    }
  };
  
  console.log(`  📊 Output (UNCHANGED): timeOnField=${result.stats.timeOnFieldSeconds}s, timeAsAttacker=${result.stats.timeAsAttackerSeconds}s, timeAsDefender=${result.stats.timeAsDefenderSeconds}s`);
  console.log(`  ❌ PROBLEM: ${stintDuration}s of time was NOT added to accumulated stats`);
  
  return result;
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
    if (stats.currentPeriodStatus === 'on_field' || 
        stats.currentPeriodStatus === 'substitute' || 
        stats.currentPeriodStatus === 'goalie') {
      return startNewStint(player, currentTimeEpoch);
    }
    
    return { ...player, stats };
  }
};