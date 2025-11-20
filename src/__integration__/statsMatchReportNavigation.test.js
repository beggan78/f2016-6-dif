import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { NavigationHistoryProvider } from '../contexts/NavigationHistoryContext';
import { useScreenNavigation } from '../hooks/useNavigationHistory';
import { VIEWS } from '../constants/viewConstants';
import { GameFinishedScreen } from '../components/stats/GameFinishedScreen';
import { MatchReportScreen } from '../components/report/MatchReportScreen';
import { createMockPlayers } from '../components/__tests__/componentTestUtils';

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true })
}));

jest.mock('../utils/formatUtils', () => ({
  formatPoints: jest.fn((points) => points.toString()),
  formatPlayerName: jest.fn((player) => player ? player.displayName : 'Unknown'),
  generateStatsText: jest.fn(() => 'mock stats text')
}));

jest.mock('../services/matchStateManager', () => ({
  updateMatchToConfirmed: jest.fn().mockResolvedValue({ success: true })
}));

jest.mock('../components/report/MatchSummaryHeader', () => ({
  MatchSummaryHeader: () => <div data-testid="match-summary-header" />
}));

jest.mock('../components/report/PlayerStatsTable', () => ({
  PlayerStatsTable: () => <div data-testid="player-stats-table" />
}));

jest.mock('../components/report/GameEventTimeline', () => ({
  GameEventTimeline: () => <div data-testid="game-event-timeline" />
}));

jest.mock('../components/report/ReportControls', () => ({
  ReportControls: () => <div data-testid="report-controls" />
}));

jest.mock('../components/report/ReportSection', () => ({
  ReportSection: ({ children }) => <section>{children}</section>
}));

jest.mock('../components/report/EventToggleButton', () => ({
  EventToggleButton: () => <button type="button">toggle</button>
}));

const mockPlayers = createMockPlayers(5);

const statsProps = {
  allPlayers: mockPlayers,
  setView: jest.fn(),
  setAllPlayers: jest.fn(),
  setSelectedSquadIds: jest.fn(),
  setPeriodGoalieIds: jest.fn(),
  setGameLog: jest.fn(),
  initializePlayers: jest.fn(),
  initialRoster: mockPlayers,
  clearStoredState: jest.fn(),
  clearTimerState: jest.fn(),
  ownScore: 3,
  opponentScore: 2,
  opponentTeam: 'Rivals',
  resetScore: jest.fn(),
  setOpponentTeam: jest.fn(),
  matchEvents: [],
  goalScorers: {},
  authModal: {
    isOpen: false,
    mode: 'login',
    openModal: jest.fn(),
    closeModal: jest.fn(),
    openLogin: jest.fn(),
    openSignup: jest.fn()
  },
  checkForActiveMatch: jest.fn(),
  currentMatchId: 'match-123',
  selectedSquadIds: mockPlayers.map((player) => player.id)
};

const reportProps = {
  matchEvents: [],
  matchStartTime: Date.now(),
  allPlayers: mockPlayers,
  gameLog: [],
  ownScore: 3,
  opponentScore: 2,
  periodDurationMinutes: 12,
  ownTeamName: 'Djurgården',
  opponentTeam: 'Rivals',
  goalScorers: {},
  onGoalClick: jest.fn(),
  formation: {},
  debugMode: false,
  selectedSquadIds: mockPlayers.map((player) => player.id)
};

function NavigationHarness() {
  const [view, setView] = useState(VIEWS.STATS);
  const navigation = useScreenNavigation(setView, { enableBrowserBack: false, fallbackView: VIEWS.CONFIG });

  if (view === VIEWS.STATS) {
    return (
      <GameFinishedScreen
        {...statsProps}
        navigateToMatchReport={() => navigation.navigateTo(VIEWS.MATCH_REPORT)}
      />
    );
  }

  return (
    <MatchReportScreen
      {...reportProps}
      onNavigateBack={() => navigation.navigateBack(VIEWS.STATS)}
    />
  );
}

describe('Stats to Match Report navigation flow', () => {
  it('navigates from stats to match report and back using the Back button', async () => {
    render(
      <NavigationHistoryProvider>
        <NavigationHarness />
      </NavigationHistoryProvider>
    );

    expect(screen.getByText('Game Finished - Statistics')).toBeInTheDocument();

    await userEvent.click(screen.getByText('View Match Report'));

    expect(await screen.findByText('Match Report')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Back'));

    expect(await screen.findByText('Game Finished - Statistics')).toBeInTheDocument();
    expect(screen.queryByText('Match Report')).not.toBeInTheDocument();
  });
});
