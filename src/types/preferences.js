// Team preference keys
export const PREFERENCE_KEYS = {
  MATCH_FORMAT: 'matchFormat',
  FORMATION: 'formation',
  PERIOD_LENGTH: 'periodLength',
  NUM_PERIODS: 'numPeriods',
  SUBSTITUTION_LOGIC: 'substitutionLogic',
  ALTERNATE_ROLES: 'alternateRoles',
  TRACK_GOAL_SCORER: 'trackGoalScorer',
  FAIR_PLAY_AWARD: 'fairPlayAward',
  TEAM_CAPTAIN: 'teamCaptain',
};

// Categories for grouping
export const PREFERENCE_CATEGORIES = {
  MATCH: 'match',
  TIME: 'time',
  SUBSTITUTION: 'substitution',
  FEATURES: 'features',
};

// Fair Play Award options
export const FAIR_PLAY_AWARD_OPTIONS = {
  NONE: 'none',
  LEAGUE_ONLY: 'league_only',
  COMPETITIVE: 'competitive',  // league, cup, tournament
  ALL_GAMES: 'all_games'
};

// Default values
export const DEFAULT_PREFERENCES = {
  [PREFERENCE_KEYS.MATCH_FORMAT]: '5v5',
  [PREFERENCE_KEYS.FORMATION]: '2-2',
  [PREFERENCE_KEYS.PERIOD_LENGTH]: 20,
  [PREFERENCE_KEYS.NUM_PERIODS]: 2,
  [PREFERENCE_KEYS.SUBSTITUTION_LOGIC]: 'equal_time',
  [PREFERENCE_KEYS.ALTERNATE_ROLES]: false,
  [PREFERENCE_KEYS.TRACK_GOAL_SCORER]: true,
  [PREFERENCE_KEYS.FAIR_PLAY_AWARD]: 'none',
  [PREFERENCE_KEYS.TEAM_CAPTAIN]: 'none',
};

// Value converters
export const parsePreferenceValue = (key, value) => {
  switch (key) {
    case PREFERENCE_KEYS.PERIOD_LENGTH:
    case PREFERENCE_KEYS.NUM_PERIODS:
      return parseInt(value, 10);
    case PREFERENCE_KEYS.TRACK_GOAL_SCORER:
    case PREFERENCE_KEYS.ALTERNATE_ROLES:
      return value === 'true';
    default:
      return value;
  }
};

export const serializePreferenceValue = (value) => {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return value.toString();
  return value;
};
