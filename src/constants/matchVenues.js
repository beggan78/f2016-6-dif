export const VENUE_TYPES = {
  HOME: 'home',
  AWAY: 'away',
  NEUTRAL: 'neutral'
};

export const DEFAULT_VENUE_TYPE = VENUE_TYPES.HOME;

export const VENUE_TYPE_OPTIONS = [
  {
    value: VENUE_TYPES.HOME,
    label: 'Home',
    description: 'Match is played on our home field with familiar surroundings.'
  },
  {
    value: VENUE_TYPES.AWAY,
    label: 'Away',
    description: 'Match is played at the opponent’s venue.'
  },
  {
    value: VENUE_TYPES.NEUTRAL,
    label: 'Neutral',
    description: 'Match is played on a neutral field for both teams.'
  }
];
