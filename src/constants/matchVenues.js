export const VENUE_TYPES = {
  HOME: 'home',
  AWAY: 'away',
  NEUTRAL: 'neutral'
};

export const DEFAULT_VENUE_TYPE = VENUE_TYPES.HOME;

// Venue type options with translation keys
export const getVenueTypeOptions = (t) => [
  {
    value: VENUE_TYPES.HOME,
    label: t('configuration:venueTypes.home.label'),
    description: t('configuration:venueTypes.home.description')
  },
  {
    value: VENUE_TYPES.AWAY,
    label: t('configuration:venueTypes.away.label'),
    description: t('configuration:venueTypes.away.description')
  },
  {
    value: VENUE_TYPES.NEUTRAL,
    label: t('configuration:venueTypes.neutral.label'),
    description: t('configuration:venueTypes.neutral.description')
  }
];

// Backward compatibility - static VENUE_TYPE_OPTIONS for components that don't use translation yet
export const VENUE_TYPE_OPTIONS = [
  {
    value: VENUE_TYPES.HOME,
    label: 'Home',
    description: 'Match is played on our home field with familiar surroundings.'
  },
  {
    value: VENUE_TYPES.AWAY,
    label: 'Away',
    description: "Match is played at the opponent's venue."
  },
  {
    value: VENUE_TYPES.NEUTRAL,
    label: 'Neutral',
    description: 'Match is played on a neutral field for both teams.'
  }
];
