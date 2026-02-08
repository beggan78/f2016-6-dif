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

