import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { NavigationHistoryProvider } from '../contexts/NavigationHistoryContext';
import { useScreenNavigation } from '../hooks/useNavigationHistory';
import { VIEWS } from '../constants/viewConstants';
import { MATCH_TYPES } from '../constants/matchTypes';
import { GameFinishedScreen } from '../components/stats/GameFinishedScreen';
import { LiveMatchScreen } from '../components/live/LiveMatchScreen';
import { createMockPlayers } from '../components/__tests__/componentTestUtils';

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true })
}));

jest.mock('../contexts/TeamContext', () => {
  const { FAIR_PLAY_AWARD_OPTIONS } = require('../types/preferences');

  return {
    useTeam: () => ({
      currentTeam: { id: 'team-1' },
      loadTeamPreferences: jest.fn(() => Promise.resolve({ fairPlayAward: FAIR_PLAY_AWARD_OPTIONS.ALL_GAMES }))
    })
  };
});

jest.mock('../utils/formatUtils', () => ({
  formatPoints: jest.fn((points) => points.toString()),
  formatPlayerName: jest.fn((player) => player ? player.displayName : 'Unknown'),
  generateStatsText: jest.fn(() => 'mock stats text')
}));

jest.mock('../services/matchStateManager', () => ({
  updateFinishedMatchMetadata: jest.fn().mockResolvedValue({ success: true })
}));

jest.mock('../components/report/MatchSummaryHeader', () => ({
  MatchSummaryHeader: () => <div data-testid="match-summary-header" />
}));

jest.mock('../components/report/PlayerStatsTable', () => ({
  PlayerStatsTable: () => <div data-testid="player-stats-table" />
}));

jest.mock('../components/live/LiveMatchScreen', () => ({
  LiveMatchScreen: ({ showBackButton, onNavigateBack }) => (
    <div>
      <h2>Live Match</h2>
      {showBackButton && (
        <button type="button" onClick={onNavigateBack}>
          Back
        </button>
      )}
    </div>
  )
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
  selectedSquadIds: mockPlayers.map((player) => player.id),
  matchType: MATCH_TYPES.LEAGUE
};

function NavigationHarness() {
  const [view, setView] = useState(VIEWS.STATS);
  const [navigationData, setNavigationData] = useState(null);
  const navigation = useScreenNavigation(setView, { enableBrowserBack: false, fallbackView: VIEWS.CONFIG });

  if (view === VIEWS.STATS) {
    return (
      <GameFinishedScreen
        {...statsProps}
        onNavigateTo={(targetView, data) => {
          setNavigationData(data);
          navigation.navigateTo(targetView);
        }}
        onNavigateBack={() => navigation.navigateBack(VIEWS.STATS)}
      />
    );
  }

  const matchId = navigationData?.matchId || null;
  const entryPoint = navigationData?.entryPoint || null;

  return (
    <LiveMatchScreen
      matchId={matchId}
      showBackButton={entryPoint === VIEWS.STATS}
      onNavigateBack={() => {
        setNavigationData(null);
        navigation.navigateBack(VIEWS.STATS);
      }}
    />
  );
}

describe('Stats to Live Match navigation flow', () => {
  it('navigates from stats to live match and back using the Back button', async () => {
    render(
      <NavigationHistoryProvider>
        <NavigationHarness />
      </NavigationHistoryProvider>
    );

    expect(screen.getByText('Game Finished - Statistics')).toBeInTheDocument();

    await userEvent.click(screen.getByText('View Match Report'));

    expect(await screen.findByText('Live Match')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Back'));

    expect(await screen.findByText('Game Finished - Statistics')).toBeInTheDocument();
    expect(screen.queryByText('Live Match')).not.toBeInTheDocument();
  });
});
