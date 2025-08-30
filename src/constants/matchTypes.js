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