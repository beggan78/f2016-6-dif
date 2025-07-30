export const PLAYER_ROLES = {
  GOALIE: 'GOALIE',
  DEFENDER: 'DEFENDER',
  ATTACKER: 'ATTACKER',
  MIDFIELDER: 'MIDFIELDER', // Used for 1-2-1 formation and future tactical formations
  SUBSTITUTE: 'SUBSTITUTE', // Used for initial status
  ON_FIELD: 'ON_FIELD' // Used for initial status
};

// Team management modes - how players are organized and managed
export const TEAM_MODES = {
  PAIRS_7: 'pairs_7',        // 7 players managed in pairs (3 pairs + goalie)
  INDIVIDUAL_5: 'individual_5', // 5 players managed individually (4 field + 0 subs + goalie)
  INDIVIDUAL_6: 'individual_6', // 6 players managed individually (4 field + 1 sub + goalie)
  INDIVIDUAL_7: 'individual_7', // 7 players managed individually (4 field + 2 subs + goalie)
  INDIVIDUAL_8: 'individual_8', // 8 players managed individually (4 field + 3 subs + goalie)
  INDIVIDUAL_9: 'individual_9', // 9 players managed individually (4 field + 4 subs + goalie)
  INDIVIDUAL_10: 'individual_10' // 10 players managed individually (4 field + 5 subs + goalie)
};


export const PLAYER_STATUS = {
  ON_FIELD: 'on_field',
  SUBSTITUTE: 'substitute', 
  GOALIE: 'goalie'
};

// EXPECTED_PLAYER_COUNTS moved to constants/gameModes.js to eliminate duplication