import { calculateRolePoints } from './rolePointUtils';
import { PLAYER_ROLES } from '../constants/playerConstants';

/**
 * Formats time in MM:SS format
 * @param {number} totalSeconds - Total seconds to format
 * @returns {string} Formatted time (e.g., "05:30")
 */
export const formatTime = (totalSeconds) => {
  // Debug logging and validation for NaN time values
  if (totalSeconds === undefined || totalSeconds === null || isNaN(totalSeconds)) {
    console.warn('formatTime received invalid value:', totalSeconds, 'returning "00:00"');
    return '00:00';
  }
  
  // Ensure we have a valid non-negative number
  const validSeconds = Math.max(0, Math.floor(totalSeconds));
  
  const minutes = Math.floor(validSeconds / 60);
  const seconds = validSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

/**
 * Formats a time duration expressed in minutes to mm:ss or hh:mm:ss.
 * @param {number} totalMinutes - Total minutes to format.
 * @returns {string} Formatted duration string.
 */
export const formatMinutesAsTime = (totalMinutes) => {
  if (totalMinutes === undefined || totalMinutes === null || isNaN(totalMinutes)) {
    console.warn('formatMinutesAsTime received invalid value:', totalMinutes, 'returning "00:00"');
    return '00:00';
  }

  const totalSeconds = Math.max(0, Math.round(totalMinutes * 60));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const twoDigitMinutes = String(minutes).padStart(2, '0');
  const twoDigitSeconds = String(seconds).padStart(2, '0');

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${twoDigitMinutes}:${twoDigitSeconds}`;
  }

  return `${twoDigitMinutes}:${twoDigitSeconds}`;
};

/**
 * Formats a time duration expressed in seconds to hh:mm:ss.
 * @param {number} totalSeconds - Total seconds to format.
 * @returns {string} Formatted duration string.
 */
export const formatSecondsAsTime = (totalSeconds) => {
  if (totalSeconds === undefined || totalSeconds === null || isNaN(totalSeconds)) {
    console.warn('formatSecondsAsTime received invalid value:', totalSeconds, 'returning "00:00:00"');
    return '00:00:00';
  }

  const validSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(validSeconds / 3600);
  const minutes = Math.floor((validSeconds % 3600) / 60);
  const seconds = validSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
};

/**
 * Formats time difference with +/- sign
 * @param {number} diffSeconds - Time difference in seconds
 * @returns {string} Formatted time difference (e.g., "+02:30" or "-01:15")
 */
export const formatTimeDifference = (diffSeconds) => {
  // Debug logging and validation for NaN time difference values
  if (diffSeconds === undefined || diffSeconds === null || isNaN(diffSeconds)) {
    console.warn('formatTimeDifference received invalid value:', diffSeconds, 'returning "+00:00"');
    return '+00:00';
  }
  
  const sign = diffSeconds >= 0 ? '+' : '-';
  const absSeconds = Math.abs(diffSeconds);
  return sign + formatTime(absSeconds);
};

/**
 * Creates player label with optional time stats for periods 2 and 3
 * @param {Object} player - Player object with name and stats
 * @param {number} currentPeriodNumber - Current period number
 * @returns {string} Player label with optional time statistics
 */
export const getPlayerLabel = (player, currentPeriodNumber) => {
  const baseLabel = formatPlayerName(player);
  
  // Add inactive indicator if player is inactive
  const inactiveLabel = player.stats?.isInactive ? `${baseLabel} (Inactive)` : baseLabel;
  
  // Only show accumulated time for periods 2 and 3
  if (currentPeriodNumber > 1) {
    const outfieldTime = formatTime(player.stats.timeOnFieldSeconds);
    // Show the balance between attacker and defender time (midfielder time is neutral)
    const attackDefenderDiff = player.stats.timeAsAttackerSeconds - player.stats.timeAsDefenderSeconds;
    const diffFormatted = formatTimeDifference(attackDefenderDiff);
    
    return `${inactiveLabel}  ⏱️ ${outfieldTime}  ⚔️ ${diffFormatted}`;
  }
  return inactiveLabel;
};

/**
 * Formats player name with captain designation
 * @param {Object} player - Player object with name and stats
 * @returns {string} Player name with (C) suffix if captain
 */
export const formatPlayerName = (player) => {
  const isCaptain = player.stats?.isCaptain;
  const baseName = player.displayName || player.firstName || 'Unknown Player';
  const formattedName = isCaptain ? `${baseName} (C)` : baseName;

  return formattedName;
};

/**
 * Formats points to show whole numbers or 1 decimal place
 * @param {number} points - Points value to format
 * @returns {string} Formatted points string
 */
export const formatPoints = (points) => {
  if (points === undefined || points === null || isNaN(points)) {
    return '0';
  }
  return points % 1 === 0 ? points.toString() : points.toFixed(1);
};

/**
 * Generates formatted text for statistics copying
 * @param {Array} squadForStats - Array of players who participated in the match
 * @param {number} ownScore - Own team score
 * @param {number} opponentScore - Opponent team score
 * @param {string} opponentTeam - Opponent team name
 * @returns {string} Formatted statistics text
 */
export const generateStatsText = (squadForStats, ownScore, opponentScore, opponentTeam) => {
  let text = `Final Score: Djurgården ${ownScore} - ${opponentScore} ${opponentTeam || 'Opponent'}\n\n`;
  text += "Spelare\t\tStart\tM\tB\tMit\tA\tUte\tBack\tMid\tFw\tMv\n";
  text += "------\t\t-------\t-\t-\t---\t-\t----------\t----\t---\t--\t--\n";
  
  squadForStats.forEach(player => {
    const { goaliePoints, defenderPoints, midfielderPoints, attackerPoints } = calculateRolePoints(player);
    const startedAs = player.stats.startedMatchAs === PLAYER_ROLES.GOALIE ? 'M' :
                     player.stats.startedMatchAs === PLAYER_ROLES.FIELD_PLAYER ? 'S' :
                     player.stats.startedMatchAs === PLAYER_ROLES.SUBSTITUTE ? 'A' : '-';
    
    const playerNameWithCaptain = formatPlayerName(player);
    
    text += `${playerNameWithCaptain}\t\t${startedAs}\t${formatPoints(goaliePoints)}\t${formatPoints(defenderPoints)}\t${formatPoints(midfielderPoints)}\t${formatPoints(attackerPoints)}\t${formatTime(player.stats.timeOnFieldSeconds)}\t${formatTime(player.stats.timeAsDefenderSeconds)}\t${formatTime(player.stats.timeAsMidfielderSeconds || 0)}\t${formatTime(player.stats.timeAsAttackerSeconds)}\t${formatTime(player.stats.timeAsGoalieSeconds)}\n`;
  });
  
  return text;
};
