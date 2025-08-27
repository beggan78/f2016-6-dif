// Manual mock for rolePointUtils
export const calculateRolePoints = jest.fn((player) => {
  if (!player || !player.stats) {
    return { goaliePoints: 0, defenderPoints: 0, midfielderPoints: 0, attackerPoints: 0 };
  }
  
  const goaliePoints = player.stats.periodsAsGoalie || 0;
  const remainingPoints = 3 - goaliePoints;
  
  if (remainingPoints <= 0) {
    return { goaliePoints, defenderPoints: 0, midfielderPoints: 0, attackerPoints: 0 };
  }
  
  const totalOutfieldTime = (player.stats.timeAsDefenderSeconds || 0) + 
                           (player.stats.timeAsMidfielderSeconds || 0) + 
                           (player.stats.timeAsAttackerSeconds || 0);
  
  if (totalOutfieldTime === 0) {
    return { goaliePoints, defenderPoints: 0, midfielderPoints: 0, attackerPoints: 0 };
  }
  
  // Simplified but realistic logic for testing with midfielder support
  const defenderRatio = (player.stats.timeAsDefenderSeconds || 0) / totalOutfieldTime;
  const midfielderRatio = (player.stats.timeAsMidfielderSeconds || 0) / totalOutfieldTime;
  const attackerRatio = (player.stats.timeAsAttackerSeconds || 0) / totalOutfieldTime;
  
  const defenderPoints = Math.round(defenderRatio * remainingPoints * 2) / 2;
  const midfielderPoints = Math.round(midfielderRatio * remainingPoints * 2) / 2;
  const attackerPoints = Math.round(attackerRatio * remainingPoints * 2) / 2;
  
  return { goaliePoints, defenderPoints, midfielderPoints, attackerPoints };
});