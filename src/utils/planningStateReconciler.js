import { AUTO_SELECT_STRATEGY } from '../constants/planMatchesConstants';

const normalizeMatches = (matches) => (Array.isArray(matches) ? matches : []);

export const reconcilePlanProgress = ({
  currentTeamId,
  matchesToPlan,
  planProgress
}) => {
  const fallbackMatches = normalizeMatches(matchesToPlan);

  if (!currentTeamId) {
    return {
      matches: fallbackMatches,
      selectedPlayersByMatch: {},
      planningStatus: {},
      sortMetric: AUTO_SELECT_STRATEGY.PRACTICES,
      plannedMatchIds: [],
      inviteSeededMatchIds: []
    };
  }

  const storedForTeam = planProgress?.teamId === currentTeamId ? planProgress : null;
  const storedMatches = normalizeMatches(storedForTeam?.matches);
  const incomingMatches = fallbackMatches.length > 0 ? fallbackMatches : null;
  const nextMatches = incomingMatches || storedMatches;

  const nextMatchIds = new Set(nextMatches.map(match => String(match?.id)));
  const storedMatchIds = new Set(storedMatches.map(match => String(match?.id)));
  const storedMatchesAlign = storedForTeam &&
    nextMatchIds.size > 0 &&
    storedMatchIds.size > 0 &&
    nextMatchIds.size === storedMatchIds.size &&
    [...nextMatchIds].every(id => storedMatchIds.has(id));
  const shouldApplyStored = storedForTeam && (!incomingMatches || storedMatchesAlign);

  if (!shouldApplyStored && incomingMatches && !storedForTeam) {
    return {
      matches: nextMatches,
      selectedPlayersByMatch: {},
      planningStatus: {},
      sortMetric: AUTO_SELECT_STRATEGY.PRACTICES,
      plannedMatchIds: [],
      inviteSeededMatchIds: []
    };
  }

  const storedSelections = storedForTeam?.selectedPlayersByMatch;
  const filteredSelections = storedSelections && typeof storedSelections === 'object'
    ? Object.entries(storedSelections).reduce((acc, [matchId, playerIds]) => {
      acc[matchId] = Array.isArray(playerIds) ? playerIds : [];
      return acc;
    }, {})
    : {};

  const storedSortMetric = storedForTeam?.sortMetric;
  const resolvedSortMetric = Object.values(AUTO_SELECT_STRATEGY).includes(storedSortMetric)
    ? storedSortMetric
    : AUTO_SELECT_STRATEGY.PRACTICES;

  const storedPlannedIds = Array.isArray(storedForTeam?.plannedMatchIds)
    ? storedForTeam.plannedMatchIds
    : [];

  const storedSeededIds = Array.isArray(storedForTeam?.inviteSeededMatchIds)
    ? storedForTeam.inviteSeededMatchIds
    : [];

  const planningStatus = storedPlannedIds.length > 0
    ? storedPlannedIds.reduce((acc, matchId) => {
      acc[matchId] = 'done';
      return acc;
    }, {})
    : {};

  return {
    matches: nextMatches,
    selectedPlayersByMatch: filteredSelections,
    planningStatus,
    sortMetric: resolvedSortMetric,
    plannedMatchIds: storedPlannedIds,
    inviteSeededMatchIds: storedSeededIds
  };
};
