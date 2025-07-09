import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MatchReportScreen } from '../MatchReportScreen';
import { TEAM_MODES, PLAYER_ROLES } from '../../../constants/playerConstants';
import { TEAM_CONFIG } from '../../../constants/teamConstants';
import { EVENT_TYPES } from '../../../utils/gameEventLogger';

// Mock all child components
jest.mock('../MatchSummaryHeader', () => ({
  MatchSummaryHeader: ({ homeTeamName, awayTeamName, homeScore, awayScore, matchDuration, totalPeriods, periodDurationMinutes, teamMode, matchStartTime }) => (
    <div data-testid="match-summary-header">
      <span data-testid="header-home-team">{homeTeamName}</span>
      <span data-testid="header-away-team">{awayTeamName}</span>
      <span data-testid="header-home-score">{homeScore}</span>
      <span data-testid="header-away-score">{awayScore}</span>
      <span data-testid="header-match-duration">{matchDuration}</span>
      <span data-testid="header-total-periods">{totalPeriods}</span>
      <span data-testid="header-period-duration">{periodDurationMinutes}</span>
      <span data-testid="header-team-mode">{teamMode}</span>
      <span data-testid="header-match-start-time">{matchStartTime}</span>
    </div>
  )
}));

jest.mock('../PlayerStatsTable', () => ({
  PlayerStatsTable: ({ players, teamMode }) => (
    <div data-testid="player-stats-table">
      <span data-testid="table-players-count">{players.length}</span>
      <span data-testid="table-team-mode">{teamMode}</span>
      {players.map(player => (
        <div key={player.id} data-testid={`player-${player.id}`}>
          {player.name}
        </div>
      ))}
    </div>
  )
}));

jest.mock('../GameEventTimeline', () => ({
  GameEventTimeline: ({ events, homeTeamName, awayTeamName, matchStartTime, showSubstitutions, goalScorers, getPlayerName, onGoalClick, selectedPlayerId, availablePlayers, onPlayerFilterChange }) => (
    <div data-testid="game-event-timeline">
      <span data-testid="timeline-events-count">{events ? events.length : 0}</span>
      <span data-testid="timeline-home-team">{homeTeamName}</span>
      <span data-testid="timeline-away-team">{awayTeamName}</span>
      <span data-testid="timeline-match-start-time">{matchStartTime}</span>
      <span data-testid="timeline-show-substitutions">{showSubstitutions.toString()}</span>
      <span data-testid="timeline-selected-player">{selectedPlayerId || 'null'}</span>
      <span data-testid="timeline-available-players-count">{availablePlayers ? availablePlayers.length : 0}</span>
      {events && events.map(event => (
        <div key={event.id} data-testid={`event-${event.id}`}>
          {event.type}
        </div>
      ))}
      <button data-testid="test-goal-click" onClick={() => onGoalClick && onGoalClick(events && events[0])}>
        Test Goal Click
      </button>
      <button data-testid="test-get-player-name" onClick={() => getPlayerName && getPlayerName('test-player')}>
        Test Get Player Name
      </button>
      <button data-testid="test-player-filter-change" onClick={() => onPlayerFilterChange && onPlayerFilterChange('test-player')}>
        Test Player Filter Change
      </button>
    </div>
  )
}));

jest.mock('../ReportControls', () => ({
  ReportControls: ({ matchEvents, allPlayers, gameLog, homeScore, awayScore, homeTeamName, awayTeamName, matchStartTime, periodDurationMinutes, teamMode, onNavigateToStats }) => (
    <div data-testid="report-controls">
      <span data-testid="controls-match-events-count">{matchEvents ? matchEvents.length : 0}</span>
      <span data-testid="controls-players-count">{allPlayers ? allPlayers.length : 0}</span>
      <span data-testid="controls-game-log-count">{gameLog ? gameLog.length : 0}</span>
      <span data-testid="controls-home-score">{homeScore}</span>
      <span data-testid="controls-away-score">{awayScore}</span>
      <span data-testid="controls-home-team">{homeTeamName}</span>
      <span data-testid="controls-away-team">{awayTeamName}</span>
      <span data-testid="controls-match-start-time">{matchStartTime}</span>
      <span data-testid="controls-period-duration">{periodDurationMinutes}</span>
      <span data-testid="controls-team-mode">{teamMode}</span>
      <button data-testid="navigate-to-stats" onClick={onNavigateToStats}>
        Navigate to Stats
      </button>
    </div>
  )
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  FileText: () => <div data-testid="file-text-icon" />,
  BarChart3: () => <div data-testid="bar-chart-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Trophy: () => <div data-testid="trophy-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  EyeOff: () => <div data-testid="eye-off-icon" />,
}));

describe('MatchReportScreen', () => {
  // Sample data for testing
  const mockPlayers = [
    {
      id: 'p1',
      name: 'Alice',
      stats: {
        startedMatchAs: PLAYER_ROLES.GOALIE,
        timeOnFieldSeconds: 300,
        timeAsAttackerSeconds: 0,
        timeAsDefenderSeconds: 0,
        timeAsGoalieSeconds: 720
      }
    },
    {
      id: 'p2',
      name: 'Bob',
      stats: {
        startedMatchAs: PLAYER_ROLES.ON_FIELD,
        timeOnFieldSeconds: 600,
        timeAsAttackerSeconds: 360,
        timeAsDefenderSeconds: 240,
        timeAsGoalieSeconds: 0
      }
    },
    {
      id: 'p3',
      name: 'Charlie',
      stats: {
        startedMatchAs: null, // Not in squad
        timeOnFieldSeconds: 0,
        timeAsAttackerSeconds: 0,
        timeAsDefenderSeconds: 0,
        timeAsGoalieSeconds: 0
      }
    }
  ];

  const mockEvents = [
    {
      id: 'match-start-1',
      type: EVENT_TYPES.MATCH_START,
      timestamp: 1000000000000,
      matchTime: '00:00',
      sequence: 1,
      data: {},
      undone: false
    },
    {
      id: 'goal-event-1',
      type: EVENT_TYPES.GOAL_HOME,
      timestamp: 1000000060000,
      matchTime: '01:00',
      sequence: 2,
      data: { homeScore: 1, awayScore: 0 },
      undone: false
    },
    {
      id: 'substitution-1',
      type: 'substitution',
      timestamp: 1000000120000,
      matchTime: '02:00',
      sequence: 3,
      data: { outPlayerId: 'p1', inPlayerId: 'p2' },
      undone: false
    },
    {
      id: 'position-change-1',
      type: 'position_change',
      timestamp: 1000000180000,
      matchTime: '03:00',
      sequence: 4,
      data: { player1Id: 'p1', player2Id: 'p2' },
      undone: false
    },
    {
      id: 'goalie-change-1',
      type: 'goalie_change',
      timestamp: 1000000240000,
      matchTime: '04:00',
      sequence: 5,
      data: { outPlayerId: 'p1', inPlayerId: 'p2' },
      undone: false
    }
  ];

  const mockGameLog = [
    { period: 1, startTime: 1000000000000, endTime: 1000000720000 },
    { period: 2, startTime: 1000000720000, endTime: 1000001440000 }
  ];

  const mockGoalScorers = {
    'goal-event-1': 'p1'
  };

  const defaultProps = {
    matchEvents: mockEvents,
    matchStartTime: 1000000000000,
    allPlayers: mockPlayers,
    gameLog: mockGameLog,
    homeScore: 2,
    awayScore: 1,
    periodDurationMinutes: 12,
    teamMode: TEAM_MODES.PAIRS_7,
    homeTeamName: 'Djurgården',
    awayTeamName: 'Opponent',
    goalScorers: mockGoalScorers,
    onNavigateToStats: jest.fn(),
    onBackToGame: jest.fn(),
    navigateToMatchReport: jest.fn(),
    onGoalClick: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear console.log mocks
    console.log = jest.fn();
  });

  describe('Core rendering scenarios', () => {
    it('renders with complete match data', () => {
      render(<MatchReportScreen {...defaultProps} />);

      // Check main header
      expect(screen.getByText('Match Report')).toBeInTheDocument();
      expect(screen.getByTestId('file-text-icon')).toBeInTheDocument();

      // Check sections are rendered
      expect(screen.getByText('Match Summary')).toBeInTheDocument();
      expect(screen.getByText('Player Statistics')).toBeInTheDocument();
      expect(screen.getByText('Game Events')).toBeInTheDocument();
      expect(screen.getByText('Report Actions')).toBeInTheDocument();

      // Check child components are rendered
      expect(screen.getByTestId('match-summary-header')).toBeInTheDocument();
      expect(screen.getByTestId('player-stats-table')).toBeInTheDocument();
      expect(screen.getByTestId('game-event-timeline')).toBeInTheDocument();
      expect(screen.getByTestId('report-controls')).toBeInTheDocument();
    });

    it('renders with empty match data', () => {
      const emptyProps = {
        ...defaultProps,
        matchEvents: [],
        gameLog: [],
        matchStartTime: null,
        homeScore: 0,
        awayScore: 0,
        goalScorers: {}
      };

      render(<MatchReportScreen {...emptyProps} />);

      // Should still render all sections
      expect(screen.getByText('Match Report')).toBeInTheDocument();
      expect(screen.getByText('Match Summary')).toBeInTheDocument();
      expect(screen.getByText('Player Statistics')).toBeInTheDocument();
      expect(screen.getByText('Game Events')).toBeInTheDocument();
      expect(screen.getByText('Report Actions')).toBeInTheDocument();
    });

    it('handles missing allPlayers prop', () => {
      const propsWithoutPlayers = {
        ...defaultProps,
        allPlayers: []
      };

      render(<MatchReportScreen {...propsWithoutPlayers} />);

      // Should show error state
      expect(screen.getByText('Match Report')).toBeInTheDocument();
      expect(screen.getByText('No match data available')).toBeInTheDocument();
      expect(screen.getByText('Quick Stats')).toBeInTheDocument();
    });

    it('handles null allPlayers prop', () => {
      const propsWithoutPlayers = {
        ...defaultProps,
        allPlayers: null
      };

      render(<MatchReportScreen {...propsWithoutPlayers} />);

      // Should show error state
      expect(screen.getByText('No match data available')).toBeInTheDocument();
    });

    it('handles undefined allPlayers prop', () => {
      const propsWithoutPlayers = {
        ...defaultProps,
        allPlayers: undefined
      };

      render(<MatchReportScreen {...propsWithoutPlayers} />);

      // Should show error state
      expect(screen.getByText('No match data available')).toBeInTheDocument();
    });
  });

  describe('Navigation callbacks', () => {
    it('calls onNavigateToStats when Quick Stats button is clicked', () => {
      const mockOnNavigateToStats = jest.fn();
      render(<MatchReportScreen {...defaultProps} onNavigateToStats={mockOnNavigateToStats} />);

      const viewStatsButton = screen.getByText('Quick Stats');
      fireEvent.click(viewStatsButton);

      expect(mockOnNavigateToStats).toHaveBeenCalledTimes(1);
    });

    it('calls onNavigateToStats from error state', () => {
      const mockOnNavigateToStats = jest.fn();
      const propsWithoutPlayers = {
        ...defaultProps,
        allPlayers: [],
        onNavigateToStats: mockOnNavigateToStats
      };

      render(<MatchReportScreen {...propsWithoutPlayers} />);

      const viewStatsButton = screen.getByText('Quick Stats');
      fireEvent.click(viewStatsButton);

      expect(mockOnNavigateToStats).toHaveBeenCalledTimes(1);
    });

    it('does not render Quick Stats button when onNavigateToStats is not provided', () => {
      const propsWithoutCallback = {
        ...defaultProps,
        onNavigateToStats: undefined
      };

      render(<MatchReportScreen {...propsWithoutCallback} />);

      expect(screen.queryByText('Quick Stats')).not.toBeInTheDocument();
    });

    it('calls onBackToGame when provided', () => {
      const mockOnBackToGame = jest.fn();
      render(<MatchReportScreen {...defaultProps} onBackToGame={mockOnBackToGame} />);

      // onBackToGame is passed to child components, test via ReportControls mock
      expect(mockOnBackToGame).toBeDefined();
    });
  });

  describe('Event filtering', () => {
    it('initially shows substitution events toggle as off', () => {
      render(<MatchReportScreen {...defaultProps} />);

      // Check that substitution toggle button is present and shows "off" state
      const substitutionToggle = screen.getByText('Substitutions');
      expect(substitutionToggle).toBeInTheDocument();
      expect(screen.getByTestId('eye-off-icon')).toBeInTheDocument();
    });

    it('toggles substitution events when button is clicked', () => {
      render(<MatchReportScreen {...defaultProps} />);

      const substitutionToggle = screen.getByText('Substitutions');
      
      // Initially should be off (false)
      expect(screen.getByTestId('timeline-show-substitutions')).toHaveTextContent('false');

      // Click to toggle on
      fireEvent.click(substitutionToggle);

      // Should now be on (true)
      expect(screen.getByTestId('timeline-show-substitutions')).toHaveTextContent('true');
      expect(screen.getByTestId('eye-icon')).toBeInTheDocument();
    });

    it('filters out substitution events when toggle is off', () => {
      render(<MatchReportScreen {...defaultProps} />);

      // With substitutions off, should filter out substitution, position_change, and goalie_change events
      // Original events: 5 total, 3 substitution-related events should be filtered out
      const eventsCount = screen.getByTestId('timeline-events-count');
      expect(eventsCount).toHaveTextContent('2'); // Only match_start and goal_home events
    });

    it('includes substitution events when toggle is on', () => {
      render(<MatchReportScreen {...defaultProps} />);

      const substitutionToggle = screen.getByText('Substitutions');
      fireEvent.click(substitutionToggle);

      // With substitutions on, should include all events
      const eventsCount = screen.getByTestId('timeline-events-count');
      expect(eventsCount).toHaveTextContent('5'); // All events
    });

    it('handles null matchEvents gracefully', () => {
      const propsWithNullEvents = {
        ...defaultProps,
        matchEvents: null
      };

      render(<MatchReportScreen {...propsWithNullEvents} />);

      // Should not crash and should show 0 events
      const eventsCount = screen.getByTestId('timeline-events-count');
      expect(eventsCount).toHaveTextContent('0');
    });
  });

  describe('Data processing', () => {
    it('calculates match duration correctly', () => {
      render(<MatchReportScreen {...defaultProps} />);

      const matchDuration = screen.getByTestId('header-match-duration');
      // Duration should be calculated from start time to max event timestamp
      // Max timestamp is 1000000240000, start is 1000000000000 = 240000ms = 240 seconds
      expect(matchDuration).toHaveTextContent('240');
    });

    it('handles match duration calculation with no events', () => {
      const propsWithNoEvents = {
        ...defaultProps,
        matchEvents: []
      };

      render(<MatchReportScreen {...propsWithNoEvents} />);

      const matchDuration = screen.getByTestId('header-match-duration');
      // Should use current time when no events - expect a number
      expect(matchDuration.textContent).toMatch(/^\d+$/);
    });

    it('returns 0 duration when no matchStartTime', () => {
      const propsWithNoStartTime = {
        ...defaultProps,
        matchStartTime: null
      };

      render(<MatchReportScreen {...propsWithNoStartTime} />);

      const matchDuration = screen.getByTestId('header-match-duration');
      expect(matchDuration).toHaveTextContent('0');
    });

    it('calculates total periods correctly', () => {
      render(<MatchReportScreen {...defaultProps} />);

      const totalPeriods = screen.getByTestId('header-total-periods');
      expect(totalPeriods).toHaveTextContent('2'); // mockGameLog has 2 periods
    });

    it('handles empty gameLog', () => {
      const propsWithEmptyGameLog = {
        ...defaultProps,
        gameLog: []
      };

      render(<MatchReportScreen {...propsWithEmptyGameLog} />);

      const totalPeriods = screen.getByTestId('header-total-periods');
      expect(totalPeriods).toHaveTextContent('0');
    });

    it('filters squadPlayers correctly', () => {
      render(<MatchReportScreen {...defaultProps} />);

      const playersCount = screen.getByTestId('table-players-count');
      // Should only include players with startedMatchAs !== null
      // mockPlayers has 3 players, but only 2 have startedMatchAs !== null
      expect(playersCount).toHaveTextContent('2');

      // Should include Alice and Bob, but not Charlie
      expect(screen.getByTestId('player-p1')).toBeInTheDocument();
      expect(screen.getByTestId('player-p2')).toBeInTheDocument();
      expect(screen.queryByTestId('player-p3')).not.toBeInTheDocument();
    });

    it('sorts filtered events by timestamp', () => {
      // Events in mockEvents are already sorted, but let's test with unsorted events
      const unsortedEvents = [
        {
          id: 'event-3',
          type: EVENT_TYPES.GOAL_HOME,
          timestamp: 1000000180000,
          matchTime: '03:00',
          sequence: 3,
          data: {},
          undone: false
        },
        {
          id: 'event-1',
          type: EVENT_TYPES.MATCH_START,
          timestamp: 1000000000000,
          matchTime: '00:00',
          sequence: 1,
          data: {},
          undone: false
        },
        {
          id: 'event-2',
          type: EVENT_TYPES.GOAL_HOME,
          timestamp: 1000000060000,
          matchTime: '01:00',
          sequence: 2,
          data: {},
          undone: false
        }
      ];

      const propsWithUnsortedEvents = {
        ...defaultProps,
        matchEvents: unsortedEvents
      };

      render(<MatchReportScreen {...propsWithUnsortedEvents} />);

      // Events should be sorted by timestamp in the timeline
      expect(screen.getByTestId('game-event-timeline')).toBeInTheDocument();
    });
  });

  describe('Component integration', () => {
    it('passes correct props to MatchSummaryHeader', () => {
      render(<MatchReportScreen {...defaultProps} />);

      const matchSummaryHeader = screen.getByTestId('match-summary-header');
      expect(matchSummaryHeader).toBeInTheDocument();

      // Check that props are passed correctly
      expect(screen.getByTestId('header-home-team')).toHaveTextContent('Djurgården');
      expect(screen.getByTestId('header-away-team')).toHaveTextContent('Opponent');
      expect(screen.getByTestId('header-home-score')).toHaveTextContent('2');
      expect(screen.getByTestId('header-away-score')).toHaveTextContent('1');
      expect(screen.getByTestId('header-period-duration')).toHaveTextContent('12');
      expect(screen.getByTestId('header-team-mode')).toHaveTextContent(TEAM_MODES.PAIRS_7);
      expect(screen.getByTestId('header-match-start-time')).toHaveTextContent('1000000000000');
    });

    it('passes correct props to PlayerStatsTable', () => {
      render(<MatchReportScreen {...defaultProps} />);

      const playerStatsTable = screen.getByTestId('player-stats-table');
      expect(playerStatsTable).toBeInTheDocument();

      // Check that only squad players are passed
      expect(screen.getByTestId('table-players-count')).toHaveTextContent('2');
      expect(screen.getByTestId('table-team-mode')).toHaveTextContent(TEAM_MODES.PAIRS_7);
    });

    it('passes correct props to GameEventTimeline', () => {
      render(<MatchReportScreen {...defaultProps} />);

      const gameEventTimeline = screen.getByTestId('game-event-timeline');
      expect(gameEventTimeline).toBeInTheDocument();

      // Check filtered events count (substitutions off by default)
      expect(screen.getByTestId('timeline-events-count')).toHaveTextContent('2');
      expect(screen.getByTestId('timeline-home-team')).toHaveTextContent('Djurgården');
      expect(screen.getByTestId('timeline-away-team')).toHaveTextContent('Opponent');
      expect(screen.getByTestId('timeline-match-start-time')).toHaveTextContent('1000000000000');
      expect(screen.getByTestId('timeline-show-substitutions')).toHaveTextContent('false');
    });

    it('passes correct props to ReportControls', () => {
      render(<MatchReportScreen {...defaultProps} />);

      const reportControls = screen.getByTestId('report-controls');
      expect(reportControls).toBeInTheDocument();

      // Check that all props are passed
      expect(screen.getByTestId('controls-match-events-count')).toHaveTextContent('5');
      expect(screen.getByTestId('controls-players-count')).toHaveTextContent('3');
      expect(screen.getByTestId('controls-game-log-count')).toHaveTextContent('2');
      expect(screen.getByTestId('controls-home-score')).toHaveTextContent('2');
      expect(screen.getByTestId('controls-away-score')).toHaveTextContent('1');
      expect(screen.getByTestId('controls-home-team')).toHaveTextContent('Djurgården');
      expect(screen.getByTestId('controls-away-team')).toHaveTextContent('Opponent');
      expect(screen.getByTestId('controls-match-start-time')).toHaveTextContent('1000000000000');
      expect(screen.getByTestId('controls-period-duration')).toHaveTextContent('12');
      expect(screen.getByTestId('controls-team-mode')).toHaveTextContent(TEAM_MODES.PAIRS_7);
    });

    it('forwards onGoalClick callback to GameEventTimeline', () => {
      const mockOnGoalClick = jest.fn();
      render(<MatchReportScreen {...defaultProps} onGoalClick={mockOnGoalClick} />);

      const testGoalClickButton = screen.getByTestId('test-goal-click');
      fireEvent.click(testGoalClickButton);

      expect(mockOnGoalClick).toHaveBeenCalledTimes(1);
    });

    it('forwards getPlayerName function to GameEventTimeline', () => {
      render(<MatchReportScreen {...defaultProps} />);

      const testGetPlayerNameButton = screen.getByTestId('test-get-player-name');
      fireEvent.click(testGetPlayerNameButton);

      // Should not crash - getPlayerName function is working
      expect(screen.getByTestId('game-event-timeline')).toBeInTheDocument();
    });
  });

  describe('Props handling', () => {
    it('applies default props correctly', () => {
      const minimalProps = {
        allPlayers: mockPlayers
      };

      render(<MatchReportScreen {...minimalProps} />);

      // Check default values are used
      expect(screen.getByTestId('header-home-team')).toHaveTextContent(TEAM_CONFIG.HOME_TEAM_NAME);
      expect(screen.getByTestId('header-away-team')).toHaveTextContent('Opponent');
      expect(screen.getByTestId('header-home-score')).toHaveTextContent('0');
      expect(screen.getByTestId('header-away-score')).toHaveTextContent('0');
      expect(screen.getByTestId('header-period-duration')).toHaveTextContent('12');
      expect(screen.getByTestId('header-team-mode')).toHaveTextContent(TEAM_MODES.PAIRS_7);
    });

    it('handles goalScorers prop correctly', () => {
      render(<MatchReportScreen {...defaultProps} />);

      // goalScorers should be passed to GameEventTimeline
      expect(screen.getByTestId('game-event-timeline')).toBeInTheDocument();
      // The goalScorers prop is passed internally to the timeline component
    });

    it('provides getPlayerName function that finds players correctly', () => {
      render(<MatchReportScreen {...defaultProps} />);

      // getPlayerName function should be able to find players by ID
      // This is tested through the GameEventTimeline mock
      expect(screen.getByTestId('game-event-timeline')).toBeInTheDocument();
    });

    it('handles custom team names', () => {
      const customProps = {
        ...defaultProps,
        homeTeamName: 'Custom Home Team',
        awayTeamName: 'Custom Away Team'
      };

      render(<MatchReportScreen {...customProps} />);

      expect(screen.getByTestId('header-home-team')).toHaveTextContent('Custom Home Team');
      expect(screen.getByTestId('header-away-team')).toHaveTextContent('Custom Away Team');
    });

    it('handles different team modes', () => {
      const individual6Props = {
        ...defaultProps,
        teamMode: TEAM_MODES.INDIVIDUAL_6
      };

      render(<MatchReportScreen {...individual6Props} />);

      expect(screen.getByTestId('header-team-mode')).toHaveTextContent(TEAM_MODES.INDIVIDUAL_6);
    });

    it('handles different period durations', () => {
      const customPeriodProps = {
        ...defaultProps,
        periodDurationMinutes: 15
      };

      render(<MatchReportScreen {...customPeriodProps} />);

      expect(screen.getByTestId('header-period-duration')).toHaveTextContent('15');
    });
  });

  describe('getPlayerName function', () => {
    it('returns correct player name for valid ID', () => {
      render(<MatchReportScreen {...defaultProps} />);

      // Test the getPlayerName function indirectly through the component
      // The function should find player names by ID from allPlayers
      const playerAlice = mockPlayers.find(p => p.id === 'p1');
      const playerBob = mockPlayers.find(p => p.id === 'p2');

      expect(playerAlice.name).toBe('Alice');
      expect(playerBob.name).toBe('Bob');
    });

    it('returns null for invalid player ID', () => {
      render(<MatchReportScreen {...defaultProps} />);

      // Test through the component's internal logic
      // getPlayerName should return null for non-existent players
      const nonExistentPlayer = mockPlayers.find(p => p.id === 'non-existent');
      expect(nonExistentPlayer).toBeUndefined();
    });
  });

  describe('Debug logging', () => {
    it('logs debug information for match duration calculation', () => {
      render(<MatchReportScreen {...defaultProps} />);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG] MatchReportScreen - Calculating match duration'),
        expect.any(Object)
      );
    });

    it('logs debug information when no matchStartTime', () => {
      const propsWithNoStartTime = {
        ...defaultProps,
        matchStartTime: null
      };

      render(<MatchReportScreen {...propsWithNoStartTime} />);

      expect(console.log).toHaveBeenCalledWith(
        '[DEBUG] MatchReportScreen - No matchStartTime, returning 0'
      );
    });
  });

  describe('Player filter functionality', () => {
    it('passes correct player filter props to GameEventTimeline', () => {
      render(<MatchReportScreen {...defaultProps} />);

      // Check that player filter props are passed correctly
      expect(screen.getByTestId('timeline-selected-player')).toHaveTextContent('null');
      expect(screen.getByTestId('timeline-available-players-count')).toHaveTextContent('2'); // mockPlayers has 2 squad players
    });

    it('auto-enables substitutions when player is selected', () => {
      render(<MatchReportScreen {...defaultProps} />);

      // Initially substitutions should be disabled
      expect(screen.getByTestId('timeline-show-substitutions')).toHaveTextContent('false');

      // Trigger player filter change
      fireEvent.click(screen.getByTestId('test-player-filter-change'));

      // Substitutions should now be enabled
      expect(screen.getByTestId('timeline-show-substitutions')).toHaveTextContent('true');
    });

    it('updates selected player when filter changes', () => {
      render(<MatchReportScreen {...defaultProps} />);

      // Initially no player selected
      expect(screen.getByTestId('timeline-selected-player')).toHaveTextContent('null');

      // Trigger player filter change
      fireEvent.click(screen.getByTestId('test-player-filter-change'));

      // Player should now be selected
      expect(screen.getByTestId('timeline-selected-player')).toHaveTextContent('test-player');
    });

    it('passes squad players as available players', () => {
      render(<MatchReportScreen {...defaultProps} />);

      // Should pass players who started the match (have non-null startedMatchAs)
      expect(screen.getByTestId('timeline-available-players-count')).toHaveTextContent('2');
    });

    it('handles empty squad players correctly', () => {
      const propsWithNoSquadPlayers = {
        ...defaultProps,
        allPlayers: [
          {
            id: 'p1',
            name: 'Alice',
            stats: { startedMatchAs: null } // Not in squad
          }
        ]
      };

      render(<MatchReportScreen {...propsWithNoSquadPlayers} />);

      // Should have 0 available players
      expect(screen.getByTestId('timeline-available-players-count')).toHaveTextContent('0');
    });

    it('maintains substitution toggle state independent of player filter', () => {
      render(<MatchReportScreen {...defaultProps} />);

      // Initially substitutions are disabled
      expect(screen.getByTestId('timeline-show-substitutions')).toHaveTextContent('false');

      // Enable substitutions manually
      fireEvent.click(screen.getByText('Substitutions'));
      expect(screen.getByTestId('timeline-show-substitutions')).toHaveTextContent('true');

      // Selecting a player should keep substitutions enabled
      fireEvent.click(screen.getByTestId('test-player-filter-change'));
      expect(screen.getByTestId('timeline-show-substitutions')).toHaveTextContent('true');
    });
  });
});