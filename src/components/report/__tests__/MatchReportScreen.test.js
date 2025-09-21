import React from 'react';
import { render } from '@testing-library/react';
import { MatchReportScreen } from '../MatchReportScreen';
import { PLAYER_ROLES } from '../../../constants/playerConstants';

const mockPlayerStatsTableSpy = jest.fn(() => <div data-testid="player-stats-table" />);

jest.mock('../MatchSummaryHeader', () => ({
  MatchSummaryHeader: () => <div data-testid="match-summary-header" />
}));

jest.mock('../PlayerStatsTable', () => ({
  PlayerStatsTable: (props) => mockPlayerStatsTableSpy(props)
}));

jest.mock('../GameEventTimeline', () => ({
  GameEventTimeline: () => <div data-testid="game-event-timeline" />
}));

jest.mock('../ReportControls', () => ({
  ReportControls: () => <div data-testid="report-controls" />
}));

jest.mock('../ReportSection', () => ({
  ReportSection: ({ children }) => <section>{children}</section>
}));

jest.mock('../EventToggleButton', () => ({
  EventToggleButton: () => <button type="button">toggle</button>
}));

jest.mock('../ReportNavigation', () => ({
  ReportNavigation: () => <nav data-testid="report-navigation" />
}));

describe('MatchReportScreen', () => {
  const createPlayer = (overrides = {}) => ({
    id: overrides.id || 'player',
    name: overrides.name || 'Player',
    stats: {
      startedMatchAs: overrides.startedMatchAs ?? null,
      timeOnFieldSeconds: overrides.timeOnFieldSeconds ?? 0,
      timeAsGoalieSeconds: overrides.timeAsGoalieSeconds ?? 0,
      timeAsDefenderSeconds: 0,
      timeAsAttackerSeconds: 0,
      timeAsMidfielderSeconds: 0,
      periodsAsGoalie: 0,
      periodsAsDefender: 0,
      periodsAsAttacker: 0,
      periodsAsMidfielder: 0,
      goals: 0,
      saves: 0,
      blocks: 0,
      cards: [],
      ...overrides.stats
    }
  });

  const baseProps = {
    matchEvents: [],
    matchStartTime: Date.now(),
    allPlayers: [],
    gameLog: [],
    ownScore: 2,
    opponentScore: 1,
    periodDurationMinutes: 12,
    ownTeamName: 'Djurgården',
    opponentTeam: 'Opponent',
    goalScorers: {},
    onNavigateToStats: jest.fn(),
    onNavigateBack: jest.fn(),
    navigateToMatchReport: jest.fn(),
    onGoalClick: jest.fn(),
    formation: {},
    debugMode: false,
    selectedSquadIds: []
  };

  beforeEach(() => {
    mockPlayerStatsTableSpy.mockClear();
  });

  it('passes only participating players to PlayerStatsTable', () => {
    const participatingPlayer = createPlayer({
      id: 'p1',
      name: 'Starter',
      startedMatchAs: PLAYER_ROLES.FIELD_PLAYER,
      timeOnFieldSeconds: 900
    });

    const goalieParticipant = createPlayer({
      id: 'p2',
      name: 'Goalie',
      startedMatchAs: PLAYER_ROLES.GOALIE,
      timeAsGoalieSeconds: 600
    });

    const benchPlayer = createPlayer({
      id: 'p3',
      name: 'Bench Only',
      startedMatchAs: PLAYER_ROLES.SUBSTITUTE,
      timeOnFieldSeconds: 0,
      timeAsGoalieSeconds: 0
    });

    render(
      <MatchReportScreen
        {...baseProps}
        allPlayers={[participatingPlayer, goalieParticipant, benchPlayer]}
        selectedSquadIds={['p1', 'p2', 'p3']}
      />
    );

    expect(mockPlayerStatsTableSpy).toHaveBeenCalledTimes(1);
    const { players } = mockPlayerStatsTableSpy.mock.calls[0][0];
    const playerIds = players.map(player => player.id);

    expect(playerIds).toEqual(expect.arrayContaining(['p1', 'p2']));
    expect(playerIds).not.toContain('p3');
  });

  it('filters out players not in the selected squad even if they have stats', () => {
    const pastMatchPlayer = createPlayer({
      id: 'p9',
      name: 'Outside Squad',
      startedMatchAs: PLAYER_ROLES.FIELD_PLAYER,
      timeOnFieldSeconds: 1200
    });

    render(
      <MatchReportScreen
        {...baseProps}
        allPlayers={[pastMatchPlayer]}
        selectedSquadIds={['p1', 'p2']}
      />
    );

    const { players } = mockPlayerStatsTableSpy.mock.calls[0][0];
    expect(players).toHaveLength(0);
  });
});
