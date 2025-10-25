import { canUsePairedRoleStrategy, PAIRED_ROLE_STRATEGY_TYPES } from '../../constants/teamConfiguration';

export const FIELD_PAIR_POSITIONS = {
  left: ['leftDefender', 'leftAttacker'],
  right: ['rightDefender', 'rightAttacker']
};

const ROLE_GROUP_POSITIONS = {
  defender: ['leftDefender', 'rightDefender'],
  attacker: ['leftAttacker', 'rightAttacker']
};

const isDefenderPosition = (position) =>
  typeof position === 'string' && position.toLowerCase().includes('defender');

const isAttackerPosition = (position) =>
  typeof position === 'string' && position.toLowerCase().includes('attacker');

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

  const details = playerIds.map((playerId) => {
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

  const [first] = details;
  const allSamePair = first?.pairKey && details.every(detail => detail?.pairKey === first.pairKey);

  if (allSamePair) {
    const defenderDetail = details.find(detail => isDefenderPosition(detail.position));
    const attackerDetail = details.find(detail => isAttackerPosition(detail.position));

    if (!defenderDetail || !attackerDetail) {
      return null;
    }

    const orderedIds = [defenderDetail.playerId, attackerDetail.playerId];

    return {
      pairKey: first.pairKey,
      defenderId: defenderDetail.playerId,
      attackerId: attackerDetail.playerId,
      defenderPosition: defenderDetail.position,
      attackerPosition: attackerDetail.position,
      pairingType: 'side',
      roleGroup: null,
      playerIds: orderedIds
    };
  }

  const defenderGroup = details.every(detail => isDefenderPosition(detail.position));
  const attackerGroup = details.every(detail => isAttackerPosition(detail.position));

  if (!defenderGroup && !attackerGroup) {
    return null;
  }

  const roleGroup = defenderGroup ? 'defender' : 'attacker';
  const expectedPositions = ROLE_GROUP_POSITIONS[roleGroup] || [];
  const orderedDetails = expectedPositions
    .map(position => details.find(detail => detail.position === position))
    .filter(Boolean);

  if (orderedDetails.length !== details.length) {
    return null;
  }

  const orderedIds = orderedDetails.map(detail => detail.playerId);

  return {
    pairKey: roleGroup,
    defenderId: orderedIds[0],
    attackerId: orderedIds[1],
    defenderPosition: orderedDetails[0].position,
    attackerPosition: orderedDetails[1].position,
    pairingType: 'role_group',
    roleGroup,
    playerIds: orderedIds
  };
}

export function buildPairedRotationQueueFromFormation(formation, substitutePositions = [], options = {}) {
  const { orderingStrategy = 'pair' } = options;
  const queue = [];
  let orderingApplied = false;

  if (orderingStrategy === 'role_groups') {
    const defenders = ROLE_GROUP_POSITIONS.defender
      .map(position => formation[position])
      .filter(Boolean);

    const attackers = ROLE_GROUP_POSITIONS.attacker
      .map(position => formation[position])
      .filter(Boolean);

    if (
      defenders.length === ROLE_GROUP_POSITIONS.defender.length &&
      attackers.length === ROLE_GROUP_POSITIONS.attacker.length
    ) {
      queue.push(...defenders, ...attackers);
      orderingApplied = true;
    }
  }

  if (!orderingApplied) {
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
  }

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
