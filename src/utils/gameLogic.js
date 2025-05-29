export const PLAYER_ROLES = {
  GOALIE: 'Goalie',
  DEFENDER: 'Defender',
  ATTACKER: 'Attacker',
  SUBSTITUTE: 'Substitute', // Used for initial status
  ON_FIELD: 'On Field' // Used for initial status
};

export const PERIOD_OPTIONS = [1, 2, 3];
export const DURATION_OPTIONS = [10, 15, 20, 25, 30];

export const initialRoster = [
  "Alma", "Ebba", "Elise", "Filippa", "Fiona", "Ines", "Isabelle",
  "Julie", "Leonie", "Nicole", "Rebecka", "Sigrid", "Sophie", "Tyra"
];

// Helper to round to nearest 0.5
const roundToNearestHalf = (value) => Math.round(value * 2) / 2;

// Calculate role points for both 6 and 7 player modes
export const calculateRolePoints = (player) => {
  const totalPoints = 3;
  const goaliePoints = player.stats.periodsAsGoalie; // 1 point per period as goalie
  const remainingPoints = totalPoints - goaliePoints;
  
  if (remainingPoints <= 0) {
    // Pure goalie - all points allocated to goalie
    return { goaliePoints, defenderPoints: 0, attackerPoints: 0 };
  }
  
  const totalOutfieldTime = player.stats.timeAsDefenderSeconds + player.stats.timeAsAttackerSeconds;
  
  if (totalOutfieldTime === 0) {
    // No outfield time - all remaining points stay at 0
    return { goaliePoints, defenderPoints: 0, attackerPoints: 0 };
  }
  
  // Calculate proportional points based on time spent in each role
  const defenderRatio = player.stats.timeAsDefenderSeconds / totalOutfieldTime;
  const attackerRatio = player.stats.timeAsAttackerSeconds / totalOutfieldTime;
  
  let defenderPoints = roundToNearestHalf(defenderRatio * remainingPoints);
  let attackerPoints = roundToNearestHalf(attackerRatio * remainingPoints);
  
  // Ensure sum equals remaining points (handle rounding discrepancies)
  const pointsSum = defenderPoints + attackerPoints;
  if (pointsSum !== remainingPoints) {
    const difference = remainingPoints - pointsSum;
    // Give difference to the role with more time
    if (defenderRatio > attackerRatio) {
      defenderPoints += difference;
    } else {
      attackerPoints += difference;
    }
  }
  
  return { goaliePoints, defenderPoints, attackerPoints };
};

// Helper to initialize player objects
export const initializePlayers = (roster) => roster.map((name, index) => ({
  id: `p${index + 1}`,
  name,
  stats: {
    startedMatchAs: null, // 'Goalie', 'On Field', 'Substitute'
    periodsAsGoalie: 0,
    periodsAsDefender: 0,
    periodsAsAttacker: 0,
    timeOnFieldSeconds: 0, // Total outfield play time
    timeAsSubSeconds: 0,   // Total time as substitute
    timeAsGoalieSeconds: 0, // Total time as goalie
    // Role-specific time tracking for new points system
    timeAsDefenderSeconds: 0, // Total time spent as defender
    timeAsAttackerSeconds: 0, // Total time spent as attacker
    // Temporary per-period tracking
    currentPeriodRole: null, // 'Goalie', 'Defender', 'Attacker'
    currentPeriodStatus: null, // 'on_field', 'substitute', 'goalie'
    lastStintStartTimeEpoch: 0, // For calculating duration of current stint
    currentPairKey: null, // 'leftPair', 'rightPair', 'subPair'
  }
}));