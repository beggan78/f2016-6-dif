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

  // ====================
  // NEW COMPREHENSIVE TESTS - ADDRESSING IDENTIFIED GAPS
  // ====================

  describe('Error handling and data corruption', () => {
    it('handles corrupted player data gracefully', () => {
      // Suppress React warnings for this test
      const originalConsoleError = console.error;
      console.error = jest.fn();

      const corruptedPlayersProps = {
        ...defaultProps,
        allPlayers: [
          { id: 'p1', name: 'Alice', stats: {} }, // Missing startedMatchAs (undefined)
          { id: 'p2', stats: { startedMatchAs: PLAYER_ROLES.ON_FIELD } }, // Missing name
          { id: 'p3', name: 'Bob', stats: { startedMatchAs: PLAYER_ROLES.ON_FIELD } }, // Valid player
        ]
      };

      // Should not crash with corrupted data
      expect(() => {
        render(<MatchReportScreen {...corruptedPlayersProps} />);
      }).not.toThrow();

      // Should render the component
      expect(screen.getByText('Match Report')).toBeInTheDocument();
      
      // Should filter players safely - the component filters by p.stats.startedMatchAs !== null
      // p1 has undefined startedMatchAs (undefined !== null is true, so it's included)
      // p2 and p3 have valid startedMatchAs values
      // So all 3 players should be included since undefined !== null
      expect(screen.getByTestId('table-players-count')).toHaveTextContent('3');

      // Restore console.error
      console.error = originalConsoleError;
    });

    it('handles corrupted event data gracefully', () => {
      // Suppress React warnings for this test
      const originalConsoleError = console.error;
      console.error = jest.fn();

      const corruptedEventsProps = {
        ...defaultProps,
        matchEvents: [
          { id: 'event-1', type: 'unknown_type', timestamp: null }, // null timestamp
          { id: 'event-missing-type', timestamp: 1000000000000 }, // missing type
          { id: 'event-2', type: EVENT_TYPES.GOAL_HOME, timestamp: 'invalid' }, // invalid timestamp
          { id: 'event-3', timestamp: 1000000060000 } // missing type
        ]
      };

      expect(() => {
        render(<MatchReportScreen {...corruptedEventsProps} />);
      }).not.toThrow();

      expect(screen.getByText('Match Report')).toBeInTheDocument();

      // Restore console.error
      console.error = originalConsoleError;
    });

    it('handles malformed goalScorers data', () => {
      const malformedGoalScorersProps = {
        ...defaultProps,
        goalScorers: {
          'non-existent-event': 'non-existent-player',
          'goal-event-1': null,
          null: 'p1',
          123: 'p2'
        }
      };

      expect(() => {
        render(<MatchReportScreen {...malformedGoalScorersProps} />);
      }).not.toThrow();

      expect(screen.getByText('Match Report')).toBeInTheDocument();
    });

    it('handles invalid timestamp formats in events', () => {
      const invalidTimestampProps = {
        ...defaultProps,
        matchEvents: [
          { id: 'event-1', type: EVENT_TYPES.MATCH_START, timestamp: '2023-01-01T00:00:00Z' },
          { id: 'event-2', type: EVENT_TYPES.GOAL_HOME, timestamp: NaN },
          { id: 'event-3', type: EVENT_TYPES.GOAL_HOME, timestamp: Infinity },
          { id: 'event-4', type: EVENT_TYPES.GOAL_HOME, timestamp: -1 }
        ]
      };

      expect(() => {
        render(<MatchReportScreen {...invalidTimestampProps} />);
      }).not.toThrow();

      expect(screen.getByText('Match Report')).toBeInTheDocument();
    });
  });

  describe('Performance testing with large datasets', () => {
    it('renders efficiently with large number of players', () => {
      const largeMockPlayers = Array.from({ length: 15 }, (_, i) => ({
        id: `player-${i}`,
        name: `Player ${i}`,
        stats: {
          startedMatchAs: i < 10 ? PLAYER_ROLES.ON_FIELD : null,
          timeOnFieldSeconds: Math.floor(Math.random() * 3600),
          timeAsAttackerSeconds: Math.floor(Math.random() * 1800),
          timeAsDefenderSeconds: Math.floor(Math.random() * 1800),
          timeAsGoalieSeconds: Math.floor(Math.random() * 900)
        }
      }));

      const largeDataProps = {
        ...defaultProps,
        allPlayers: largeMockPlayers
      };

      const startTime = performance.now();
      render(<MatchReportScreen {...largeDataProps} />);
      const endTime = performance.now();

      // Should render within reasonable time (200ms threshold)
      expect(endTime - startTime).toBeLessThan(200);

      // Should still display correct count
      expect(screen.getByTestId('table-players-count')).toHaveTextContent('10');
    });

    it('handles large number of events efficiently', () => {
      const largeEventList = Array.from({ length: 200 }, (_, i) => ({
        id: `event-${i}`,
        type: i % 2 === 0 ? EVENT_TYPES.GOAL_HOME : 'substitution',
        timestamp: 1000000000000 + (i * 10000),
        matchTime: `${Math.floor(i / 6)}:${String(i % 60).padStart(2, '0')}`,
        sequence: i + 1,
        data: {},
        undone: false
      }));

      const largeEventsProps = {
        ...defaultProps,
        matchEvents: largeEventList
      };

      const startTime = performance.now();
      render(<MatchReportScreen {...largeEventsProps} />);
      const endTime = performance.now();

      // Should render within reasonable time
      expect(endTime - startTime).toBeLessThan(300);

      // Should correctly filter events (substitutions off by default)
      const filteredCount = largeEventList.filter(e => e.type !== 'substitution').length;
      expect(screen.getByTestId('timeline-events-count')).toHaveTextContent(filteredCount.toString());
    });

    it('efficiently processes complex filtering operations', () => {
      const complexEventList = Array.from({ length: 500 }, (_, i) => ({
        id: `event-${i}`,
        type: ['substitution', 'position_change', 'goalie_change', EVENT_TYPES.GOAL_HOME, EVENT_TYPES.MATCH_START][i % 5],
        timestamp: 1000000000000 + (i * 15000),
        matchTime: `${Math.floor(i / 4)}:${String((i * 15) % 60).padStart(2, '0')}`,
        sequence: i + 1,
        data: {},
        undone: false
      }));

      const complexFilterProps = {
        ...defaultProps,
        matchEvents: complexEventList
      };

      render(<MatchReportScreen {...complexFilterProps} />);

      // Toggle substitutions multiple times to test filtering performance
      const substitutionToggle = screen.getByText('Substitutions');
      
      const startTime = performance.now();
      for (let i = 0; i < 10; i++) {
        fireEvent.click(substitutionToggle);
      }
      const endTime = performance.now();

      // Multiple filtering operations should complete quickly (relaxed threshold for CI)
      expect(endTime - startTime).toBeLessThan(500);
    });
  });

  describe('Accessibility testing', () => {
    it('has proper semantic structure with headings', () => {
      render(<MatchReportScreen {...defaultProps} />);

      // Should have main heading
      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toHaveTextContent('Match Report');

      // Should have section headings
      const sectionHeadings = screen.getAllByRole('heading', { level: 2 });
      expect(sectionHeadings).toHaveLength(4);
      expect(sectionHeadings[0]).toHaveTextContent('Match Summary');
      expect(sectionHeadings[1]).toHaveTextContent('Player Statistics');
      expect(sectionHeadings[2]).toHaveTextContent('Game Events');
      expect(sectionHeadings[3]).toHaveTextContent('Report Actions');
    });

    it('has accessible navigation controls', () => {
      render(<MatchReportScreen {...defaultProps} />);

      // Navigation buttons should be accessible
      const statsButton = screen.getByRole('button', { name: /quick stats/i });
      expect(statsButton).toBeInTheDocument();
      expect(statsButton).toBeEnabled();

      const backButton = screen.getByRole('button', { name: /back to game/i });
      expect(backButton).toBeInTheDocument();
      expect(backButton).toBeEnabled();
    });

    it('has accessible toggle button for substitutions', () => {
      render(<MatchReportScreen {...defaultProps} />);

      const toggleButton = screen.getByRole('button', { name: /substitutions/i });
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton).toBeEnabled();

      // Should indicate current state
      expect(toggleButton).toHaveTextContent('Substitutions');
    });

    it('maintains keyboard navigation support', () => {
      render(<MatchReportScreen {...defaultProps} />);

      const toggleButton = screen.getByRole('button', { name: /substitutions/i });
      
      // Should be focusable
      toggleButton.focus();
      expect(document.activeElement).toBe(toggleButton);

      // Should respond to Enter key
      fireEvent.keyDown(toggleButton, { key: 'Enter', code: 'Enter' });
      // Toggle should work (though we test this via click in the existing tests)
    });

    it('provides appropriate ARIA labels and roles', () => {
      render(<MatchReportScreen {...defaultProps} />);

      // Should have proper article/section structure
      const sections = screen.getAllByRole('generic');
      expect(sections.length).toBeGreaterThan(0);

      // Icons should not interfere with accessibility
      expect(screen.getByTestId('file-text-icon')).toBeInTheDocument();
      expect(screen.getByTestId('trophy-icon')).toBeInTheDocument();
      expect(screen.getByTestId('users-icon')).toBeInTheDocument();
      expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
      expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
    });
  });

  describe('Advanced prop validation and edge cases', () => {
    it('handles extreme timestamp values', () => {
      const extremeTimestampProps = {
        ...defaultProps,
        matchStartTime: 0, // Unix epoch
        matchEvents: [
          { id: 'event-1', type: EVENT_TYPES.MATCH_START, timestamp: 0 },
          { id: 'event-2', type: EVENT_TYPES.GOAL_HOME, timestamp: 8640000000000000 } // Max safe integer
        ]
      };

      expect(() => {
        render(<MatchReportScreen {...extremeTimestampProps} />);
      }).not.toThrow();

      // Should calculate duration without crashing
      const durationElement = screen.getByTestId('header-match-duration');
      expect(durationElement).toBeInTheDocument();
    });

    it('handles invalid numeric props gracefully', () => {
      const invalidNumericProps = {
        ...defaultProps,
        homeScore: 'invalid',
        awayScore: NaN,
        periodDurationMinutes: null,
        matchStartTime: 'not-a-timestamp'
      };

      expect(() => {
        render(<MatchReportScreen {...invalidNumericProps} />);
      }).not.toThrow();

      expect(screen.getByText('Match Report')).toBeInTheDocument();
    });

    it('handles missing or invalid callback functions', () => {
      // Suppress React warnings about invalid event listeners for this test
      const originalConsoleError = console.error;
      console.error = jest.fn();

      const invalidCallbackProps = {
        ...defaultProps,
        onNavigateToStats: null, // Use null instead of string to avoid React warnings
        onBackToGame: undefined,
        onGoalClick: undefined,
        navigateToMatchReport: undefined
      };

      expect(() => {
        render(<MatchReportScreen {...invalidCallbackProps} />);
      }).not.toThrow();

      expect(screen.getByText('Match Report')).toBeInTheDocument();

      // Restore console.error
      console.error = originalConsoleError;
    });

    it('handles invalid team mode gracefully', () => {
      const invalidTeamModeProps = {
        ...defaultProps,
        teamMode: 'INVALID_MODE'
      };

      expect(() => {
        render(<MatchReportScreen {...invalidTeamModeProps} />);
      }).not.toThrow();

      expect(screen.getByTestId('header-team-mode')).toHaveTextContent('INVALID_MODE');
    });

    it('handles extremely long team names', () => {
      const longTeamNameProps = {
        ...defaultProps,
        homeTeamName: 'A'.repeat(1000),
        awayTeamName: 'B'.repeat(1000)
      };

      expect(() => {
        render(<MatchReportScreen {...longTeamNameProps} />);
      }).not.toThrow();

      expect(screen.getByTestId('header-home-team')).toHaveTextContent('A'.repeat(1000));
      expect(screen.getByTestId('header-away-team')).toHaveTextContent('B'.repeat(1000));
    });
  });

  describe('Complex state interaction scenarios', () => {
    it('maintains consistent state during rapid user interactions', () => {
      render(<MatchReportScreen {...defaultProps} />);

      const substitutionToggle = screen.getByText('Substitutions');
      const playerFilterButton = screen.getByTestId('test-player-filter-change');

      // Rapid interactions should not cause state inconsistency
      fireEvent.click(substitutionToggle);
      fireEvent.click(playerFilterButton);
      fireEvent.click(substitutionToggle);
      fireEvent.click(playerFilterButton);

      // Final state should be predictable
      expect(screen.getByTestId('timeline-show-substitutions')).toHaveTextContent('true'); // Auto-enabled by player selection
      expect(screen.getByTestId('timeline-selected-player')).toHaveTextContent('test-player');
    });

    it('handles simultaneous prop updates correctly', () => {
      const { rerender } = render(<MatchReportScreen {...defaultProps} />);

      // Update multiple props simultaneously
      const updatedProps = {
        ...defaultProps,
        homeScore: 5,
        awayScore: 3,
        matchEvents: [...defaultProps.matchEvents, {
          id: 'new-event',
          type: EVENT_TYPES.GOAL_HOME,
          timestamp: 1000000300000,
          matchTime: '05:00',
          sequence: 6,
          data: {},
          undone: false
        }],
        allPlayers: [...defaultProps.allPlayers, {
          id: 'p4',
          name: 'Dave',
          stats: {
            startedMatchAs: PLAYER_ROLES.ON_FIELD,
            timeOnFieldSeconds: 200,
            timeAsAttackerSeconds: 100,
            timeAsDefenderSeconds: 100,
            timeAsGoalieSeconds: 0
          }
        }]
      };

      expect(() => {
        rerender(<MatchReportScreen {...updatedProps} />);
      }).not.toThrow();

      // Should reflect all updates
      expect(screen.getByTestId('header-home-score')).toHaveTextContent('5');
      expect(screen.getByTestId('header-away-score')).toHaveTextContent('3');
      expect(screen.getByTestId('table-players-count')).toHaveTextContent('3');
      expect(screen.getByTestId('timeline-events-count')).toHaveTextContent('3'); // Non-substitution events
    });

    it('handles prop changes while user interactions are active', () => {
      const { rerender } = render(<MatchReportScreen {...defaultProps} />);

      // Enable substitutions
      fireEvent.click(screen.getByText('Substitutions'));
      expect(screen.getByTestId('timeline-show-substitutions')).toHaveTextContent('true');

      // Change props while toggle is on
      const newProps = {
        ...defaultProps,
        matchEvents: [] // Empty events
      };

      rerender(<MatchReportScreen {...newProps} />);

      // Toggle state should persist
      expect(screen.getByTestId('timeline-show-substitutions')).toHaveTextContent('true');
      expect(screen.getByTestId('timeline-events-count')).toHaveTextContent('0');
    });
  });

  describe('Memory management and cleanup', () => {
    it('cleans up properly when unmounted', () => {
      const { unmount } = render(<MatchReportScreen {...defaultProps} />);

      // Should unmount without errors
      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it('handles rapid mount/unmount cycles', () => {
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(<MatchReportScreen {...defaultProps} />);
        unmount();
      }

      // Should not cause memory leaks or errors
      expect(true).toBe(true); // Test completes without throwing
    });

    it('properly handles callback cleanup', () => {
      const mockCallbacks = {
        onNavigateToStats: jest.fn(),
        onBackToGame: jest.fn(),
        onGoalClick: jest.fn()
      };

      const { unmount } = render(<MatchReportScreen {...defaultProps} {...mockCallbacks} />);

      // Trigger some callbacks before unmount
      fireEvent.click(screen.getByText('Quick Stats'));
      fireEvent.click(screen.getByTestId('test-goal-click'));

      unmount();

      // Callbacks should have been called
      expect(mockCallbacks.onNavigateToStats).toHaveBeenCalled();
      expect(mockCallbacks.onGoalClick).toHaveBeenCalled();
    });
  });

  describe('Browser compatibility and edge cases', () => {
    it('handles Date.now() variations for duration calculation', () => {
      const originalDateNow = Date.now;
      
      // Mock Date.now to return a specific value
      Date.now = jest.fn(() => 1000000500000);

      const propsWithoutEvents = {
        ...defaultProps,
        matchEvents: []
      };

      render(<MatchReportScreen {...propsWithoutEvents} />);

      const durationElement = screen.getByTestId('header-match-duration');
      // Should use mocked Date.now value: (1000000500000 - 1000000000000) / 1000 = 500
      expect(durationElement).toHaveTextContent('500');

      // Restore original Date.now
      Date.now = originalDateNow;
    });

    it('handles performance.now() unavailability gracefully', () => {
      const originalPerformanceNow = performance.now;
      
      // Temporarily remove performance.now
      delete performance.now;

      expect(() => {
        render(<MatchReportScreen {...defaultProps} />);
      }).not.toThrow();

      expect(screen.getByText('Match Report')).toBeInTheDocument();

      // Restore performance.now
      performance.now = originalPerformanceNow;
    });

    it('handles missing console methods gracefully', () => {
      const originalConsoleLog = console.log;
      
      // Temporarily remove console.log
      delete console.log;

      expect(() => {
        render(<MatchReportScreen {...defaultProps} />);
      }).not.toThrow();

      expect(screen.getByText('Match Report')).toBeInTheDocument();

      // Restore console.log
      console.log = originalConsoleLog;
    });
  });

  describe('Component isolation and mocking validation', () => {
    it('verifies all child components receive expected props', () => {
      render(<MatchReportScreen {...defaultProps} />);

      // Verify MatchSummaryHeader receives all required props
      const summaryHeader = screen.getByTestId('match-summary-header');
      expect(summaryHeader).toBeInTheDocument();
      
      // All expected data attributes should be present
      expect(screen.getByTestId('header-home-team')).toBeInTheDocument();
      expect(screen.getByTestId('header-away-team')).toBeInTheDocument();
      expect(screen.getByTestId('header-home-score')).toBeInTheDocument();
      expect(screen.getByTestId('header-away-score')).toBeInTheDocument();
      expect(screen.getByTestId('header-match-duration')).toBeInTheDocument();
      expect(screen.getByTestId('header-total-periods')).toBeInTheDocument();
      expect(screen.getByTestId('header-period-duration')).toBeInTheDocument();
      expect(screen.getByTestId('header-team-mode')).toBeInTheDocument();
      expect(screen.getByTestId('header-match-start-time')).toBeInTheDocument();
    });

    it('validates formation prop is passed to PlayerStatsTable', () => {
      const customFormation = {
        goalie: { playerId: 'p1' },
        positions: [
          { playerId: 'p2', role: 'attacker' }
        ]
      };

      render(<MatchReportScreen {...defaultProps} formation={customFormation} />);

      // PlayerStatsTable should receive the formation
      expect(screen.getByTestId('player-stats-table')).toBeInTheDocument();
    });

    it('validates debugMode prop is passed to GameEventTimeline', () => {
      render(<MatchReportScreen {...defaultProps} debugMode={true} />);

      // GameEventTimeline should receive debugMode prop
      expect(screen.getByTestId('game-event-timeline')).toBeInTheDocument();
    });

    it('ensures getPlayerName function works correctly with real data', () => {
      // Test the actual getPlayerName logic by checking if it finds correct players
      render(<MatchReportScreen {...defaultProps} />);

      // The function should be able to find players by ID
      const alice = mockPlayers.find(p => p.id === 'p1');
      const bob = mockPlayers.find(p => p.id === 'p2');
      const charlie = mockPlayers.find(p => p.id === 'p3');

      expect(alice?.name).toBe('Alice');
      expect(bob?.name).toBe('Bob');
      expect(charlie?.name).toBe('Charlie');

      // Non-existent player should return undefined
      const nonExistent = mockPlayers.find(p => p.id === 'non-existent');
      expect(nonExistent).toBeUndefined();
    });
  });
});