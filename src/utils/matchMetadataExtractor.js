export function extractMatchMetadata(events = []) {
  if (!events || events.length === 0) return null;

  const matchStartEvent = events.find(e => e.event_type === 'match_started');
  const matchCreatedEvent = events.find(e => e.event_type === 'match_created');
  const matchEndEvent = events.find(e => e.event_type === 'match_ended');
  const periodStartEvents = events.filter(e => e.event_type === 'period_started');
  const goalScoredEvents = events.filter(e => e.event_type === 'goal_scored');
  const goalConcededEvents = events.filter(e => e.event_type === 'goal_conceded');

  // Determine if match has actually started
  const matchHasStarted = !!matchStartEvent;

  // Use match_started data if available, otherwise fall back to match_created
  const eventForMetadata = matchStartEvent || matchCreatedEvent;

  // Extract team names from match_started or match_created event data
  const ownTeamName = eventForMetadata?.data?.ownTeamName || 'Own Team';
  const opponentName = eventForMetadata?.data?.opponentTeamName
    || matchStartEvent?.data?.opponentTeam
    || matchStartEvent?.data?.opponentName
    || 'Opponent';

  // Calculate scores
  const ownScore = goalScoredEvents.length;
  const opponentScore = goalConcededEvents.length;

  // Determine current period
  const currentPeriod = periodStartEvents.length;

  // Calculate match start time from match_started event
  const matchStartTime = matchStartEvent ? new Date(matchStartEvent.created_at).getTime() : null;
  const matchEndTime = matchEndEvent ? new Date(matchEndEvent.created_at).getTime() : null;

  // Check if match is live (no match_ended event)
  const isLive = !matchEndEvent;

  const totalPeriods = eventForMetadata?.data?.totalPeriods
    || matchStartEvent?.data?.numPeriods
    || matchStartEvent?.data?.matchMetadata?.plannedPeriods
    || matchEndEvent?.data?.totalPeriods
    || currentPeriod;

  const periodDurationMinutes = eventForMetadata?.data?.periodDurationMinutes
    || matchEndEvent?.data?.matchMetadata?.plannedDurationMinutes
    || 15;

  const matchDurationSeconds = matchEndEvent?.data?.matchDurationSeconds
    || (matchStartTime && matchEndTime ? Math.max(0, Math.round((matchEndTime - matchStartTime) / 1000)) : 0);

  return {
    ownTeamName,
    opponentName,
    ownScore,
    opponentScore,
    currentPeriod,
    matchStartTime,
    matchEndTime,
    isLive,
    matchHasStarted,
    totalPeriods,
    periodDurationMinutes,
    matchDurationSeconds
  };
}
