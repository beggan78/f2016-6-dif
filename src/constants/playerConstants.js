export const PLAYER_ROLES = {
  GOALIE: 'GOALIE',
  DEFENDER: 'DEFENDER',
  ATTACKER: 'ATTACKER',
  MIDFIELDER: 'MIDFIELDER', // Used for 1-2-1 formation and future tactical formations
  SUBSTITUTE: 'SUBSTITUTE', // Used for initial status
  FIELD_PLAYER: 'FIELD_PLAYER' // Used when specific field role is unknown
};



export const PLAYER_STATUS = {
  ON_FIELD: 'on_field',
  SUBSTITUTE: 'substitute', 
  GOALIE: 'goalie'
};

// EXPECTED_PLAYER_COUNTS moved to constants/gameModes.js to eliminate duplication