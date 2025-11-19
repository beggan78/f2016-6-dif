import React from 'react';
import { render } from '@testing-library/react';
import { MatchReportScreen } from '../MatchReportScreen';
import { PLAYER_ROLES } from '../../../constants/playerConstants';

jest.mock('../MatchSummaryHeader', () => ({
  MatchSummaryHeader: () => <div data-testid="match-summary-header" />
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
    onNavigateBack: jest.fn(),
    navigateToMatchReport: jest.fn(),
    onGoalClick: jest.fn(),
    formation: {},
    debugMode: false,
    selectedSquadIds: []
  };

  it('renders without crashing', () => {
    render(<MatchReportScreen {...baseProps} />);
  });
});
