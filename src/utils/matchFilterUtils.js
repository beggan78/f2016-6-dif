export function matchPassesFilters(match, {
  typeFilter = [],
  outcomeFilter = [],
  venueFilter = [],
  opponentFilter = [],
  playerFilter = [],
  formatFilter = [],
  startDate,
  endDate
} = {}) {
  if (!match) {
    return false;
  }

  const normalizedTypeFilter = typeFilter.map(type =>
    typeof type === 'string' ? type.toLowerCase() : type
  );
  const matchType = typeof match.type === 'string' ? match.type.toLowerCase() : match.type;

  if (startDate || endDate) {
    const matchDate = match.date ? new Date(match.date) : null;
    if (startDate && matchDate && matchDate < startDate) return false;
    if (endDate && matchDate && matchDate > endDate) return false;
  }

  if (normalizedTypeFilter.length > 0 && (!matchType || !normalizedTypeFilter.includes(matchType))) {
    return false;
  }
  if (outcomeFilter.length > 0 && (!match.outcome || !outcomeFilter.includes(match.outcome))) return false;
  if (venueFilter.length > 0 && (!match.venueType || !venueFilter.includes(match.venueType))) return false;
  if (opponentFilter.length > 0 && (!match.opponent || !opponentFilter.includes(match.opponent))) return false;

  if (playerFilter.length > 0) {
    const matchPlayers = Array.isArray(match.players) ? match.players : [];
    const hasSelectedPlayer = playerFilter.some(player => matchPlayers.includes(player));
    if (!hasSelectedPlayer) return false;
  }

  if (formatFilter.length > 0 && (!match.format || !formatFilter.includes(match.format))) return false;

  return true;
}

export function filterMatchesByCriteria(matches = [], filters = {}) {
  if (!Array.isArray(matches)) {
    return [];
  }

  return matches.filter(match => matchPassesFilters(match, filters));
}
