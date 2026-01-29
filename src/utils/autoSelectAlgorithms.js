import { AUTO_SELECT_STRATEGY } from '../constants/planMatchesConstants';

const getMetricValue = (player, metric) => {
  return metric === AUTO_SELECT_STRATEGY.ATTENDANCE
    ? player.attendanceRate
    : player.practicesPerMatch;
};

export const buildSortedRoster = (rosterWithStats, metric) => {
  return [...(rosterWithStats || [])].sort((a, b) => {
    const diff = (getMetricValue(b, metric) || 0) - (getMetricValue(a, metric) || 0);
    if (diff !== 0) return diff;
    return (a.displayName || '').localeCompare(b.displayName || '');
  });
};

export const autoSelectSingleMatch = ({
  rosterWithStats,
  metric,
  targetCount,
  unavailableIds
}) => {
  const target = Math.max(0, targetCount || 0);
  const unavailableSet = new Set(unavailableIds || []);
  const sorted = buildSortedRoster(rosterWithStats, metric);

  return sorted
    .filter(player => !unavailableSet.has(player.id))
    .slice(0, target)
    .map(player => player.id);
};

export const autoSelectMultipleMatches = ({
  rosterWithStats,
  metric,
  matches,
  targetCounts,
  unavailableByMatch,
  ensureCoverage
}) => {
  const sorted = buildSortedRoster(rosterWithStats, metric);
  const matchIds = (matches || []).map(match => match.id);
  const targets = matchIds.reduce((acc, id) => {
    acc[id] = targetCounts?.[id] || 0;
    return acc;
  }, {});

  const totalSlots = matchIds.reduce((sum, id) => sum + targets[id], 0);
  const canCoverAll = ensureCoverage && totalSlots >= sorted.length;
  const nextSelections = matchIds.reduce((acc, id) => {
    acc[id] = [];
    return acc;
  }, {});

  if (canCoverAll) {
    sorted.forEach((player) => {
      const availableMatches = matchIds.filter((id) => {
        if (nextSelections[id].length >= targets[id]) return false;
        const unavailableSet = new Set(unavailableByMatch?.[id] || []);
        return !unavailableSet.has(player.id);
      });

      if (availableMatches.length === 0) {
        return;
      }

      availableMatches.sort((a, b) => nextSelections[a].length - nextSelections[b].length);
      nextSelections[availableMatches[0]].push(player.id);
    });
  }

  matchIds.forEach((matchId) => {
    const target = targets[matchId];
    const unavailableSet = new Set(unavailableByMatch?.[matchId] || []);

    sorted.forEach((player) => {
      if (nextSelections[matchId].length >= target) return;
      if (unavailableSet.has(player.id)) return;
      if (nextSelections[matchId].includes(player.id)) return;
      nextSelections[matchId].push(player.id);
    });
  });

  return nextSelections;
};
