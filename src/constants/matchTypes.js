/**
 * Match Type Constants
 * Defines the types of matches that can be created, corresponding to the database enum match_type
 */

export const MATCH_TYPES = {
  FRIENDLY: 'friendly',
  INTERNAL: 'internal', 
  LEAGUE: 'league',
  TOURNAMENT: 'tournament',
  CUP: 'cup'
};

// Match type options with translation keys
export const getMatchTypeOptions = (t) => [
  {
    value: MATCH_TYPES.LEAGUE,
    label: t('configuration:matchTypes.league.label'),
    description: t('configuration:matchTypes.league.description')
  },
  {
    value: MATCH_TYPES.FRIENDLY,
    label: t('configuration:matchTypes.friendly.label'),
    description: t('configuration:matchTypes.friendly.description')
  },
  {
    value: MATCH_TYPES.CUP,
    label: t('configuration:matchTypes.cup.label'),
    description: t('configuration:matchTypes.cup.description')
  },
  {
    value: MATCH_TYPES.TOURNAMENT,
    label: t('configuration:matchTypes.tournament.label'),
    description: t('configuration:matchTypes.tournament.description')
  },
  {
    value: MATCH_TYPES.INTERNAL,
    label: t('configuration:matchTypes.internal.label'),
    description: t('configuration:matchTypes.internal.description')
  }
];

// Backward compatibility - static MATCH_TYPE_OPTIONS for components that don't use translation yet
export const MATCH_TYPE_OPTIONS = [
  {
    value: MATCH_TYPES.LEAGUE,
    label: 'League',
    description: 'Official league/conference game'
  },
  {
    value: MATCH_TYPES.FRIENDLY,
    label: 'Friendly',
    description: 'Practice or non-competitive game'
  },
  {
    value: MATCH_TYPES.CUP,
    label: 'Cup',
    description: 'Tournament or cup competition game'
  },
  {
    value: MATCH_TYPES.TOURNAMENT,
    label: 'Tournament',
    description: 'Tournament bracket or playoff game'
  },
  {
    value: MATCH_TYPES.INTERNAL,
    label: 'Internal',
    description: 'Team scrimmage or internal practice'
  }
];

// Default match type
export const DEFAULT_MATCH_TYPE = MATCH_TYPES.LEAGUE;