import { calculateRolePoints } from './rolePointUtils';
import { PLAYER_ROLES } from '../constants/playerConstants';

/**
 * Formats time in MM:SS format
 * @param {number} totalSeconds - Total seconds to format
 * @returns {string} Formatted time (e.g., "05:30")
 */
export const formatTime = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

/**
 * Formats time difference with +/- sign
 * @param {number} diffSeconds - Time difference in seconds
 * @returns {string} Formatted time difference (e.g., "+02:30" or "-01:15")
 */
export const formatTimeDifference = (diffSeconds) => {
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
  // Only show accumulated time for periods 2 and 3
  if (currentPeriodNumber > 1) {
    const outfieldTime = formatTime(player.stats.timeOnFieldSeconds);
    const attackDefenderDiff = player.stats.timeAsAttackerSeconds - player.stats.timeAsDefenderSeconds;
    const diffFormatted = formatTimeDifference(attackDefenderDiff);
    
    return `${player.name}  ⏱️ ${outfieldTime}  ⚔️ ${diffFormatted}`;
  }
  return player.name;
};

/**
 * Formats points to show whole numbers or 1 decimal place
 * @param {number} points - Points value to format
 * @returns {string} Formatted points string
 */
export const formatPoints = (points) => {
  return points % 1 === 0 ? points.toString() : points.toFixed(1);
};

/**
 * Generates formatted text for statistics copying
 * @param {Array} squadForStats - Array of players who participated in the match
 * @param {number} homeScore - Home team score
 * @param {number} awayScore - Away team score
 * @param {string} opponentTeamName - Opponent team name
 * @returns {string} Formatted statistics text
 */
export const generateStatsText = (squadForStats, homeScore, awayScore, opponentTeamName) => {
  let text = `Final Score: Djurgården ${homeScore} - ${awayScore} ${opponentTeamName || 'Opponent'}\n\n`;
  text += "Spelare\t\tStart\tM\tB\tA\tUte\tBack\tFw\tMv\n";
  text += "------\t\t-------\t-\t-\t-\t----------\t----\t--\t--\n";
  
  squadForStats.forEach(player => {
    const { goaliePoints, defenderPoints, attackerPoints } = calculateRolePoints(player);
    const startedAs = player.stats.startedMatchAs === PLAYER_ROLES.GOALIE ? 'M' :
                     player.stats.startedMatchAs === PLAYER_ROLES.ON_FIELD ? 'S' :
                     player.stats.startedMatchAs === PLAYER_ROLES.SUBSTITUTE ? 'A' : '-';
    
    text += `${player.name}\t\t${startedAs}\t${formatPoints(goaliePoints)}\t${formatPoints(defenderPoints)}\t${formatPoints(attackerPoints)}\t${formatTime(player.stats.timeOnFieldSeconds)}\t${formatTime(player.stats.timeAsDefenderSeconds)}\t${formatTime(player.stats.timeAsAttackerSeconds)}\t${formatTime(player.stats.timeAsGoalieSeconds)}\n`;
  });
  
  return text;
};