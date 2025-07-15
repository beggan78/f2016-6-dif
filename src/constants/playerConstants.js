export const PLAYER_ROLES = {
  GOALIE: 'Goalie',
  DEFENDER: 'Defender',
  ATTACKER: 'Attacker',
  SUBSTITUTE: 'Substitute', // Used for initial status
  ON_FIELD: 'On Field' // Used for initial status
};

// Team management modes - how players are organized and managed
export const TEAM_MODES = {
  PAIRS_7: 'pairs_7',        // 7 players managed in pairs (3 pairs + goalie)
  INDIVIDUAL_6: 'individual_6', // 6 players managed individually (4 field + 1 sub + goalie)
  INDIVIDUAL_7: 'individual_7', // 7 players managed individually (4 field + 2 subs + goalie)
  INDIVIDUAL_8: 'individual_8'  // 8 players managed individually (4 field + 3 subs + goalie)
};


export const PLAYER_STATUS = {
  ON_FIELD: 'on_field',
  SUBSTITUTE: 'substitute', 
  GOALIE: 'goalie'
};

// EXPECTED_PLAYER_COUNTS moved to constants/gameModes.js to eliminate duplication