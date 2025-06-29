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

// EXPECTED_PLAYER_COUNTS moved to constants/formations.js to eliminate duplication