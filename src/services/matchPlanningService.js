import { supabase } from '../lib/supabase';
import { createMatch, discardPendingMatch, formatMatchDataFromGameState, logMatchCreatedEvent, saveInitialMatchConfig } from './matchStateManager';
import { createInitialConfiguration } from './matchConfigurationService';
import { createTeamConfig, FORMAT_CONFIGS, FORMATS } from '../constants/teamConfiguration';
import { DEFAULT_MATCH_TYPE } from '../constants/matchTypes';
import { DEFAULT_VENUE_TYPE } from '../constants/matchVenues';
import { createEmptyPlayerStats } from '../utils/playerUtils';
import { getInitialFormationTemplate } from '../constants/gameModes';
import { DEFAULT_PREFERENCES } from '../types/preferences';

export async function getMostRecentFinishedMatch(teamId) {
  if (!teamId) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('match')
      .select('id, format, formation, periods, period_duration_minutes, type, venue_type, started_at')
      .eq('team_id', teamId)
      .eq('state', 'finished')
      .is('deleted_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch most recent finished match:', error);
      return null;
    }

    return data || null;
  } catch (error) {
    console.error('Exception while fetching most recent finished match:', error);
    return null;
  }
}

export function resolveMatchPlanningDefaults(preferences = {}, recentMatch = null) {
  const rawFormat = preferences.matchFormat || recentMatch?.format || DEFAULT_PREFERENCES.matchFormat || FORMATS.FORMAT_5V5;
  const normalizedFormat = FORMAT_CONFIGS[rawFormat] ? rawFormat : (DEFAULT_PREFERENCES.matchFormat || FORMATS.FORMAT_5V5);
  const formatConfig = FORMAT_CONFIGS[normalizedFormat] || FORMAT_CONFIGS[FORMATS.FORMAT_5V5];

  const candidateFormation = preferences.formation || recentMatch?.formation;
  const formation = formatConfig?.formations?.includes(candidateFormation)
    ? candidateFormation
    : (formatConfig?.defaultFormation || DEFAULT_PREFERENCES.formation || FORMAT_CONFIGS[FORMATS.FORMAT_5V5]?.defaultFormation);

  return {
    format: normalizedFormat,
    formation,
    periods: preferences.numPeriods || recentMatch?.periods || DEFAULT_PREFERENCES.numPeriods || 2,
    periodDurationMinutes: preferences.periodLength || recentMatch?.period_duration_minutes || DEFAULT_PREFERENCES.periodLength || 20,
    matchType: recentMatch?.type || DEFAULT_MATCH_TYPE,
    venueType: recentMatch?.venue_type || DEFAULT_VENUE_TYPE
  };
}

function buildRosterPlayersForPlanning(rosterPlayers) {
  return (rosterPlayers || []).map(player => ({
    id: player.id,
    displayName: player.display_name || player.first_name || 'Unknown Player',
    firstName: player.first_name || player.display_name || 'Unknown Player',
    lastName: player.last_name || null,
    stats: createEmptyPlayerStats()
  }));
}

export async function planUpcomingMatch({
  teamId,
  teamName,
  upcomingMatch,
  selectedSquadIds,
  rosterPlayers,
  defaults
}) {
  if (!teamId) {
    return { success: false, error: 'Team ID is required.' };
  }

  if (!upcomingMatch?.id) {
    return { success: false, error: 'Upcoming match is required.' };
  }

  if (!Array.isArray(selectedSquadIds) || selectedSquadIds.length === 0) {
    return { success: false, error: 'Select at least one player for the match.' };
  }

  if (!defaults?.format || !defaults?.formation) {
    return { success: false, error: 'Match defaults are missing.' };
  }

  try {
    const squadSize = selectedSquadIds.length;
    const teamConfig = createTeamConfig(defaults.format, squadSize, defaults.formation);
    const formation = getInitialFormationTemplate(teamConfig);

    const matchData = formatMatchDataFromGameState({
      teamConfig,
      selectedFormation: defaults.formation,
      periods: defaults.periods,
      periodDurationMinutes: defaults.periodDurationMinutes,
      opponentTeam: upcomingMatch.opponent,
      matchType: defaults.matchType,
      venueType: defaults.venueType,
      teamName
    }, teamId);

    const initialConfig = createInitialConfiguration({
      formation,
      teamConfig,
      matchData,
      matchType: defaults.matchType,
      venueType: defaults.venueType,
      opponentTeam: upcomingMatch.opponent,
      numPeriods: defaults.periods,
      periodDurationMinutes: defaults.periodDurationMinutes,
      captainId: null,
      periodGoalieIds: {},
      selectedSquadIds
    });

    const playersForMatch = buildRosterPlayersForPlanning(rosterPlayers);
    const createResult = await createMatch(matchData, playersForMatch, selectedSquadIds);

    if (!createResult.success) {
      return { success: false, error: createResult.error || 'Failed to create planned match.' };
    }

    const matchId = createResult.matchId;
    const saveResult = await saveInitialMatchConfig(matchId, initialConfig);

    if (!saveResult.success) {
      await discardPendingMatch(matchId);
      return { success: false, error: saveResult.error || 'Failed to save match configuration.' };
    }

    logMatchCreatedEvent(matchId, {
      ownTeamName: teamName || null,
      opponentTeamName: upcomingMatch.opponent || null,
      totalPeriods: defaults.periods,
      periodDurationMinutes: defaults.periodDurationMinutes
    }).catch(error => {
      console.warn('Failed to log match_created event:', error);
    });

    const { data: linkData, error: linkError } = await supabase
      .rpc('link_upcoming_match_to_planned_match', {
        p_upcoming_match_id: upcomingMatch.id,
        p_planned_match_id: matchId
      });

    if (linkError || !linkData?.success) {
      const linkMessage = linkData?.message || linkData?.error || linkError?.message;
      console.error('Failed to link upcoming match to planned match:', linkError || linkData);
      return {
        success: true,
        matchId,
        warning: linkMessage
          ? `Planned match created, but upcoming match was not linked: ${linkMessage}`
          : 'Planned match created, but upcoming match was not linked.'
      };
    }

    return { success: true, matchId };
  } catch (error) {
    console.error('Exception while planning upcoming match:', error);
    return { success: false, error: `Unexpected error: ${error.message}` };
  }
}
