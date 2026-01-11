import { PLAYER_ROLES } from '../constants/playerConstants';
import { getPositionRole } from '../game/logic/positionUtils';

const FIELD_ROLE_DISPLAY_ORDER = [
  PLAYER_ROLES.ATTACKER,
  PLAYER_ROLES.MIDFIELDER,
  PLAYER_ROLES.DEFENDER
];

export const orderFieldPositionsForDisplay = (positions = []) => {
  if (!Array.isArray(positions)) {
    return [];
  }

  const ordered = [];

  FIELD_ROLE_DISPLAY_ORDER.forEach(role => {
    positions.forEach(position => {
      if (getPositionRole(position) === role) {
        ordered.push(position);
      }
    });
  });

  const orderedSet = new Set(ordered);
  positions.forEach(position => {
    if (!orderedSet.has(position)) {
      ordered.push(position);
    }
  });

  return ordered;
};
