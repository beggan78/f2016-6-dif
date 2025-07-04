// Manual mock for rolePointUtils
export const calculateRolePoints = jest.fn((player) => {
  if (!player || !player.stats) {
    return { goaliePoints: 0, defenderPoints: 0, attackerPoints: 0 };
  }
  
  const goaliePoints = player.stats.periodsAsGoalie || 0;
  const remainingPoints = 3 - goaliePoints;
  
  if (remainingPoints <= 0) {
    return { goaliePoints, defenderPoints: 0, attackerPoints: 0 };
  }
  
  const totalOutfieldTime = (player.stats.timeAsDefenderSeconds || 0) + (player.stats.timeAsAttackerSeconds || 0);
  
  if (totalOutfieldTime === 0) {
    return { goaliePoints, defenderPoints: 0, attackerPoints: 0 };
  }
  
  // Simplified but realistic logic for testing
  const defenderPoints = Math.round(
    ((player.stats.timeAsDefenderSeconds || 0) / totalOutfieldTime) * 
    remainingPoints * 2
  ) / 2;
  const attackerPoints = remainingPoints - defenderPoints;
  
  return { goaliePoints, defenderPoints, attackerPoints };
});