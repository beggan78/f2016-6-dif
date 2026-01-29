import {
  getMostRecentFinishedMatch,
  resolveMatchPlanningDefaults,
  planUpcomingMatch
} from '../matchPlanningService';
import { supabase } from '../../lib/supabase';
import {
  createMatch,
  discardPendingMatch,
  formatMatchDataFromGameState,
  logMatchCreatedEvent,
  saveInitialMatchConfig
} from '../matchStateManager';
import { createInitialConfiguration } from '../matchConfigurationService';
import * as teamConfiguration from '../../constants/teamConfiguration';
import { DEFAULT_MATCH_TYPE } from '../../constants/matchTypes';
import { DEFAULT_VENUE_TYPE } from '../../constants/matchVenues';
import { getInitialFormationTemplate } from '../../constants/gameModes';
import { DEFAULT_PREFERENCES } from '../../types/preferences';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn()
  }
}));

jest.mock('../matchStateManager', () => ({
  createMatch: jest.fn(),
  discardPendingMatch: jest.fn(),
  formatMatchDataFromGameState: jest.fn(),
  logMatchCreatedEvent: jest.fn(() => Promise.resolve()),
  saveInitialMatchConfig: jest.fn()
}));

jest.mock('../matchConfigurationService', () => ({
  createInitialConfiguration: jest.fn()
}));

jest.mock('../../constants/gameModes', () => ({
  getInitialFormationTemplate: jest.fn()
}));

const createRecentMatchChain = ({ data = null, error = null } = {}) => {
  const chain = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    is: jest.fn(() => chain),
    order: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    maybeSingle: jest.fn().mockResolvedValue({ data, error })
  };

  supabase.from.mockReturnValue(chain);
  return chain;
};

describe('matchPlanningService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    logMatchCreatedEvent.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getMostRecentFinishedMatch', () => {
    it('returns null when teamId is missing', async () => {
      const result = await getMostRecentFinishedMatch(null);

      expect(result).toBeNull();
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('returns the most recent finished match', async () => {
      const matchData = { id: 'match-1', format: '5v5' };
      const chain = createRecentMatchChain({ data: matchData, error: null });

      const result = await getMostRecentFinishedMatch('team-1');

      expect(supabase.from).toHaveBeenCalledWith('match');
      expect(chain.select).toHaveBeenCalledWith(
        'id, format, formation, periods, period_duration_minutes, type, venue_type, started_at'
      );
      expect(chain.eq).toHaveBeenCalledWith('team_id', 'team-1');
      expect(chain.eq).toHaveBeenCalledWith('state', 'finished');
      expect(chain.is).toHaveBeenCalledWith('deleted_at', null);
      expect(chain.order).toHaveBeenCalledWith('started_at', { ascending: false });
      expect(chain.limit).toHaveBeenCalledWith(1);
      expect(chain.maybeSingle).toHaveBeenCalled();
      expect(result).toEqual(matchData);
    });

    it('returns null when supabase returns an error', async () => {
      createRecentMatchChain({ data: null, error: { message: 'db error' } });

      const result = await getMostRecentFinishedMatch('team-1');

      expect(result).toBeNull();
    });

    it('returns null when supabase throws', async () => {
      supabase.from.mockImplementation(() => {
        throw new Error('boom');
      });

      const result = await getMostRecentFinishedMatch('team-1');

      expect(result).toBeNull();
    });
  });

  describe('resolveMatchPlanningDefaults', () => {
    it('prefers preferences when available', () => {
      const preferences = {
        matchFormat: teamConfiguration.FORMATS.FORMAT_7V7,
        formation: teamConfiguration.FORMATS.FORMAT_7V7
          ? teamConfiguration.FORMAT_CONFIGS[teamConfiguration.FORMATS.FORMAT_7V7].formations[1]
          : '2-3-1',
        numPeriods: 3,
        periodLength: 15
      };
      const recentMatch = {
        format: teamConfiguration.FORMATS.FORMAT_5V5,
        formation: teamConfiguration.FORMAT_CONFIGS[teamConfiguration.FORMATS.FORMAT_5V5].formations[0],
        periods: 2,
        period_duration_minutes: 20,
        type: 'friendly',
        venue_type: 'away'
      };

      const result = resolveMatchPlanningDefaults(preferences, recentMatch);

      expect(result).toEqual({
        format: preferences.matchFormat,
        formation: preferences.formation,
        periods: 3,
        periodDurationMinutes: 15,
        matchType: recentMatch.type,
        venueType: recentMatch.venue_type
      });
    });

    it('falls back to recent match data when preferences are missing', () => {
      const recentMatch = {
        format: teamConfiguration.FORMATS.FORMAT_7V7,
        formation: teamConfiguration.FORMAT_CONFIGS[teamConfiguration.FORMATS.FORMAT_7V7].formations[0],
        periods: 4,
        period_duration_minutes: 25,
        type: 'league',
        venue_type: 'neutral'
      };

      const result = resolveMatchPlanningDefaults({}, recentMatch);

      expect(result.format).toBe(recentMatch.format);
      expect(result.formation).toBe(recentMatch.formation);
      expect(result.periods).toBe(4);
      expect(result.periodDurationMinutes).toBe(25);
      expect(result.matchType).toBe('league');
      expect(result.venueType).toBe('neutral');
    });

    it('normalizes invalid format and formation to defaults', () => {
      const preferences = {
        matchFormat: 'invalid-format',
        formation: 'invalid-formation'
      };

      const result = resolveMatchPlanningDefaults(preferences, null);

      expect(result.format).toBe(DEFAULT_PREFERENCES.matchFormat);
      expect(result.formation).toBe(
        teamConfiguration.FORMAT_CONFIGS[DEFAULT_PREFERENCES.matchFormat].defaultFormation
      );
    });

    it('uses global defaults when preferences and recent match are missing', () => {
      const result = resolveMatchPlanningDefaults(undefined, null);

      expect(result).toEqual({
        format: DEFAULT_PREFERENCES.matchFormat,
        formation: DEFAULT_PREFERENCES.formation,
        periods: DEFAULT_PREFERENCES.numPeriods,
        periodDurationMinutes: DEFAULT_PREFERENCES.periodLength,
        matchType: DEFAULT_MATCH_TYPE,
        venueType: DEFAULT_VENUE_TYPE
      });
    });
  });

  describe('planUpcomingMatch', () => {
    const baseDefaults = {
      format: teamConfiguration.FORMATS.FORMAT_5V5,
      formation: teamConfiguration.FORMAT_CONFIGS[teamConfiguration.FORMATS.FORMAT_5V5].defaultFormation,
      periods: 2,
      periodDurationMinutes: 20,
      matchType: 'friendly',
      venueType: 'home'
    };

    const baseUpcomingMatch = {
      id: 'upcoming-1',
      opponent: 'Rivals FC'
    };

    const baseRosterPlayers = [
      {
        id: 'player-1',
        display_name: 'Alex Player',
        first_name: 'Alex',
        last_name: 'Player'
      }
    ];

    it('validates required inputs', async () => {
      const missingTeam = await planUpcomingMatch({
        teamId: null,
        upcomingMatch: baseUpcomingMatch,
        selectedSquadIds: ['player-1'],
        rosterPlayers: baseRosterPlayers,
        defaults: baseDefaults
      });

      expect(missingTeam).toEqual({ success: false, error: 'Team ID is required.' });

      const missingUpcoming = await planUpcomingMatch({
        teamId: 'team-1',
        upcomingMatch: null,
        selectedSquadIds: ['player-1'],
        rosterPlayers: baseRosterPlayers,
        defaults: baseDefaults
      });

      expect(missingUpcoming).toEqual({ success: false, error: 'Upcoming match is required.' });

      const missingSquad = await planUpcomingMatch({
        teamId: 'team-1',
        upcomingMatch: baseUpcomingMatch,
        selectedSquadIds: [],
        rosterPlayers: baseRosterPlayers,
        defaults: baseDefaults
      });

      expect(missingSquad).toEqual({
        success: false,
        error: 'Select at least one player for the match.'
      });

      const missingDefaults = await planUpcomingMatch({
        teamId: 'team-1',
        upcomingMatch: baseUpcomingMatch,
        selectedSquadIds: ['player-1'],
        rosterPlayers: baseRosterPlayers,
        defaults: { format: null, formation: null }
      });

      expect(missingDefaults).toEqual({
        success: false,
        error: 'Match defaults are missing.'
      });
    });

    it('creates planned match and links upcoming match successfully', async () => {
      const matchData = { id: 'match-1', format: baseDefaults.format };
      const teamConfig = { format: baseDefaults.format, formation: baseDefaults.formation, squadSize: 1 };
      const formationTemplate = { goalie: { playerId: null } };
      const initialConfig = { matchConfig: { format: baseDefaults.format } };

      jest.spyOn(teamConfiguration, 'createTeamConfig').mockReturnValue(teamConfig);
      getInitialFormationTemplate.mockReturnValue(formationTemplate);
      formatMatchDataFromGameState.mockReturnValue(matchData);
      createInitialConfiguration.mockReturnValue(initialConfig);

      createMatch.mockResolvedValue({ success: true, matchId: 'match-1' });
      saveInitialMatchConfig.mockResolvedValue({ success: true });
      supabase.rpc.mockResolvedValue({ data: { success: true }, error: null });

      const result = await planUpcomingMatch({
        teamId: 'team-1',
        teamName: 'Test Team',
        upcomingMatch: baseUpcomingMatch,
        selectedSquadIds: ['player-1'],
        rosterPlayers: baseRosterPlayers,
        defaults: baseDefaults
      });

      expect(teamConfiguration.createTeamConfig).toHaveBeenCalledWith(
        baseDefaults.format,
        1,
        baseDefaults.formation
      );
      expect(getInitialFormationTemplate).toHaveBeenCalledWith(teamConfig);
      expect(formatMatchDataFromGameState).toHaveBeenCalledWith(
        expect.objectContaining({
          teamConfig,
          selectedFormation: baseDefaults.formation,
          periods: baseDefaults.periods,
          periodDurationMinutes: baseDefaults.periodDurationMinutes,
          opponentTeam: baseUpcomingMatch.opponent,
          matchType: baseDefaults.matchType,
          venueType: baseDefaults.venueType,
          teamName: 'Test Team'
        }),
        'team-1'
      );
      expect(createInitialConfiguration).toHaveBeenCalledWith(
        expect.objectContaining({
          formation: formationTemplate,
          teamConfig,
          matchData,
          selectedSquadIds: ['player-1']
        })
      );
      expect(createMatch).toHaveBeenCalledWith(
        matchData,
        [
          expect.objectContaining({
            id: 'player-1',
            displayName: 'Alex Player',
            firstName: 'Alex',
            lastName: 'Player',
            stats: expect.any(Object)
          })
        ],
        ['player-1']
      );
      expect(saveInitialMatchConfig).toHaveBeenCalledWith('match-1', initialConfig);
      expect(logMatchCreatedEvent).toHaveBeenCalledWith('match-1', {
        ownTeamName: 'Test Team',
        opponentTeamName: baseUpcomingMatch.opponent,
        totalPeriods: baseDefaults.periods,
        periodDurationMinutes: baseDefaults.periodDurationMinutes
      });
      expect(supabase.rpc).toHaveBeenCalledWith('link_upcoming_match_to_planned_match', {
        p_upcoming_match_id: baseUpcomingMatch.id,
        p_planned_match_id: 'match-1'
      });
      expect(result).toEqual({ success: true, matchId: 'match-1' });
    });

    it('returns error when createMatch fails', async () => {
      createMatch.mockResolvedValue({ success: false, error: 'db error' });

      const result = await planUpcomingMatch({
        teamId: 'team-1',
        teamName: 'Test Team',
        upcomingMatch: baseUpcomingMatch,
        selectedSquadIds: ['player-1'],
        rosterPlayers: baseRosterPlayers,
        defaults: baseDefaults
      });

      expect(result).toEqual({ success: false, error: 'db error' });
      expect(saveInitialMatchConfig).not.toHaveBeenCalled();
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('discards match when saveInitialMatchConfig fails', async () => {
      createMatch.mockResolvedValue({ success: true, matchId: 'match-1' });
      saveInitialMatchConfig.mockResolvedValue({ success: false, error: 'config error' });

      const result = await planUpcomingMatch({
        teamId: 'team-1',
        teamName: 'Test Team',
        upcomingMatch: baseUpcomingMatch,
        selectedSquadIds: ['player-1'],
        rosterPlayers: baseRosterPlayers,
        defaults: baseDefaults
      });

      expect(discardPendingMatch).toHaveBeenCalledWith('match-1');
      expect(result).toEqual({ success: false, error: 'config error' });
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('returns warning when RPC link fails', async () => {
      createMatch.mockResolvedValue({ success: true, matchId: 'match-1' });
      saveInitialMatchConfig.mockResolvedValue({ success: true });
      supabase.rpc.mockResolvedValue({ data: { success: false, message: 'link failed' }, error: null });

      const result = await planUpcomingMatch({
        teamId: 'team-1',
        teamName: 'Test Team',
        upcomingMatch: baseUpcomingMatch,
        selectedSquadIds: ['player-1'],
        rosterPlayers: baseRosterPlayers,
        defaults: baseDefaults
      });

      expect(result).toEqual({
        success: true,
        matchId: 'match-1',
        warning: 'Planned match created, but upcoming match was not linked: link failed'
      });
    });

    it('handles RPC errors with warning', async () => {
      createMatch.mockResolvedValue({ success: true, matchId: 'match-1' });
      saveInitialMatchConfig.mockResolvedValue({ success: true });
      supabase.rpc.mockResolvedValue({ data: null, error: { message: 'rpc error' } });

      const result = await planUpcomingMatch({
        teamId: 'team-1',
        teamName: 'Test Team',
        upcomingMatch: baseUpcomingMatch,
        selectedSquadIds: ['player-1'],
        rosterPlayers: baseRosterPlayers,
        defaults: baseDefaults
      });

      expect(result).toEqual({
        success: true,
        matchId: 'match-1',
        warning: 'Planned match created, but upcoming match was not linked: rpc error'
      });
    });
  });
});
