import { canUsePairedRoleStrategy, PAIRED_ROLE_STRATEGY_TYPES } from '../../constants/teamConfiguration';

export const FIELD_PAIR_POSITIONS = {
  left: ['leftDefender', 'leftAttacker'],
  right: ['rightDefender', 'rightAttacker']
};

export function getPairKeyForFieldPosition(position) {
  if (!position) return null;
  if (FIELD_PAIR_POSITIONS.left.includes(position)) return 'left';
  if (FIELD_PAIR_POSITIONS.right.includes(position)) return 'right';
  return null;
}

export function analyzeOutgoingPair(formation, playerIds) {
  if (!Array.isArray(playerIds) || playerIds.length !== 2) {
    return null;
  }

  const details = playerIds.map(playerId => {
    const position = Object.keys(formation).find(key => formation[key] === playerId);
    if (!position) {
      return null;
    }

    const pairKey = getPairKeyForFieldPosition(position);
    if (!pairKey) {
      return null;
    }

    return { playerId, position, pairKey };
  });

  if (details.some(detail => detail === null)) {
    return null;
  }

  const [first, second] = details;
  if (!first?.pairKey || first.pairKey !== second?.pairKey) {
    return null;
  }

  const defender = first.position.toLowerCase().includes('defender') ? first : second;
  const attacker = defender === first ? second : first;

  if (!defender || !attacker) {
    return null;
  }

  return {
    pairKey: first.pairKey,
    defenderId: defender.playerId,
    attackerId: attacker.playerId,
    defenderPosition: defender.position,
    attackerPosition: attacker.position
  };
}

export function buildPairedRotationQueueFromFormation(formation, substitutePositions = []) {
  const queue = [];

  FIELD_PAIR_POSITIONS.left.forEach(position => {
    const playerId = formation[position];
    if (playerId) {
      queue.push(playerId);
    }
  });

  FIELD_PAIR_POSITIONS.right.forEach(position => {
    const playerId = formation[position];
    if (playerId) {
      queue.push(playerId);
    }
  });

  for (let i = 0; i < substitutePositions.length; i += 2) {
    const pairPositions = substitutePositions.slice(i, i + 2);
    pairPositions.forEach(position => {
      const playerId = formation[position];
      if (playerId) {
        queue.push(playerId);
      }
    });
  }

  return queue;
}

export function isPairedRotationActive(teamConfig, substitutionCount) {
  if (!teamConfig) return false;
  if (substitutionCount !== 2) return false;
  return canUsePairedRoleStrategy(teamConfig);
}

export function normalizePairedRoleStrategy(teamConfig) {
  if (!teamConfig) return teamConfig;
  if (!canUsePairedRoleStrategy(teamConfig)) {
    return { ...teamConfig, pairedRoleStrategy: null };
  }
  return {
    ...teamConfig,
    pairedRoleStrategy: teamConfig.pairedRoleStrategy || PAIRED_ROLE_STRATEGY_TYPES.KEEP_THROUGHOUT_PERIOD
  };
}
