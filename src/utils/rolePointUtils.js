// Helper to round to nearest 0.5
const roundToNearestHalf = (value) => Math.round(value * 2) / 2;

// Calculate role points for both 6 and 7 player modes
export const calculateRolePoints = (player) => {
  const totalPoints = 3;
  const goaliePoints = player.stats.periodsAsGoalie; // 1 point per period as goalie
  const remainingPoints = totalPoints - goaliePoints;
  
  if (remainingPoints <= 0) {
    // Pure goalie - all points allocated to goalie
    return { goaliePoints, defenderPoints: 0, midfielderPoints: 0, attackerPoints: 0 };
  }
  
  const totalOutfieldTime = player.stats.timeAsDefenderSeconds + player.stats.timeAsAttackerSeconds + (player.stats.timeAsMidfielderSeconds || 0);
  
  if (totalOutfieldTime === 0) {
    // No outfield time - all remaining points stay at 0
    return { goaliePoints, defenderPoints: 0, midfielderPoints: 0, attackerPoints: 0 };
  }
  
  // Calculate proportional points based on time spent in each role
  const defenderRatio = player.stats.timeAsDefenderSeconds / totalOutfieldTime;
  const midfielderRatio = (player.stats.timeAsMidfielderSeconds || 0) / totalOutfieldTime;
  const attackerRatio = player.stats.timeAsAttackerSeconds / totalOutfieldTime;
  
  let defenderPoints = roundToNearestHalf(defenderRatio * remainingPoints);
  let midfielderPoints = roundToNearestHalf(midfielderRatio * remainingPoints);
  let attackerPoints = roundToNearestHalf(attackerRatio * remainingPoints);
  
  // Ensure sum equals remaining points (handle rounding discrepancies)
  const pointsSum = defenderPoints + midfielderPoints + attackerPoints;
  if (pointsSum !== remainingPoints) {
    const difference = remainingPoints - pointsSum;
    // Give difference to the role with most time
    const ratios = [
      { role: 'defender', ratio: defenderRatio, points: defenderPoints },
      { role: 'midfielder', ratio: midfielderRatio, points: midfielderPoints },
      { role: 'attacker', ratio: attackerRatio, points: attackerPoints }
    ];
    const maxRatio = ratios.reduce((max, current) => current.ratio > max.ratio ? current : max);
    
    if (maxRatio.role === 'defender') {
      defenderPoints += difference;
    } else if (maxRatio.role === 'midfielder') {
      midfielderPoints += difference;
    } else {
      attackerPoints += difference;
    }
  }
  
  return { goaliePoints, defenderPoints, midfielderPoints, attackerPoints };
};