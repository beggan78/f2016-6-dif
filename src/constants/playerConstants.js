export const PLAYER_ROLES = {
  GOALIE: 'Goalie',
  DEFENDER: 'Defender',
  ATTACKER: 'Attacker',
  SUBSTITUTE: 'Substitute', // Used for initial status
  ON_FIELD: 'On Field' // Used for initial status
};

export const FORMATION_TYPES = {
  PAIRS_7: 'pairs_7',
  INDIVIDUAL_6: 'individual_6', 
  INDIVIDUAL_7: 'individual_7'
};

export const PLAYER_STATUS = {
  ON_FIELD: 'on_field',
  SUBSTITUTE: 'substitute', 
  GOALIE: 'goalie'
};

export const EXPECTED_PLAYER_COUNTS = {
  [FORMATION_TYPES.INDIVIDUAL_6]: { outfield: 5, onField: 4 },
  [FORMATION_TYPES.INDIVIDUAL_7]: { outfield: 6, onField: 4 },
  [FORMATION_TYPES.PAIRS_7]: { outfield: 6, onField: 4 }
};