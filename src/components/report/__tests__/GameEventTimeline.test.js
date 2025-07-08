import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GameEventTimeline } from '../GameEventTimeline';
import { EVENT_TYPES } from '../../../utils/gameEventLogger';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Play: () => <div data-testid="play-icon" />,
  Square: () => <div data-testid="square-icon" />,
  Trophy: () => <div data-testid="trophy-icon" />,
  RotateCcw: () => <div data-testid="rotate-icon" />,
  Shield: () => <div data-testid="shield-icon" />,
  Pause: () => <div data-testid="pause-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  ArrowUpDown: () => <div data-testid="arrow-icon" />,
  AlertCircle: () => <div data-testid="alert-icon" />,
  CheckCircle: () => <div data-testid="check-icon" />,
  XCircle: () => <div data-testid="x-icon" />,
  ChevronUp: () => <div data-testid="chevron-up-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
}));

describe('GameEventTimeline', () => {
  const mockGetPlayerName = jest.fn((playerId) => {
    const playerNames = {
      'player1': 'Alice',
      'player2': 'Bob',
      'player3': 'Charlie'
    };
    return playerNames[playerId] || null;
  });

  const mockGoalScorers = {
    'goal-event-1': 'player1',
    'goal-event-2': 'player2'
  };

  const sampleEvents = [
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
      type: EVENT_TYPES.SUBSTITUTION,
      timestamp: 1000000120000,
      matchTime: '02:00',
      sequence: 3,
      data: { outPlayerId: 'player2', inPlayerId: 'player3' },
      undone: false
    }
  ];

  beforeEach(() => {
    mockGetPlayerName.mockClear();
  });

  it('renders empty state when no events provided', () => {
    render(<GameEventTimeline events={[]} />);
    
    expect(screen.getByText('No events recorded')).toBeInTheDocument();
    expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
  });

  it('displays events in timeline format', () => {
    // Set up fresh mock implementation
    mockGetPlayerName.mockImplementation((playerId) => {
      const playerNames = {
        'player1': 'Alice',
        'player2': 'Bob',
        'player3': 'Charlie'
      };
      return playerNames[playerId] || null;
    });

    render(
      <GameEventTimeline
        events={sampleEvents}
        getPlayerName={mockGetPlayerName}
        goalScorers={mockGoalScorers}
        homeTeamName="Djurgården"
        awayTeamName="Opponent"
      />
    );

    // Check that events are displayed
    expect(screen.getByText('Match started')).toBeInTheDocument();
    expect(screen.getByText('Goal for Djurgården - Alice')).toBeInTheDocument();
    expect(screen.getByText('Substitution: Bob ↔ Charlie')).toBeInTheDocument();

    // Check event count
    expect(screen.getByText('3 events')).toBeInTheDocument();
  });

  it('handles goal scorer attribution correctly', () => {
    // Set up fresh mock implementation
    mockGetPlayerName.mockImplementation((playerId) => {
      const playerNames = {
        'player1': 'Alice',
        'player2': 'Bob',
        'player3': 'Charlie'
      };
      return playerNames[playerId] || null;
    });

    const goalEvents = [
      {
        id: 'goal-event-1',
        type: EVENT_TYPES.GOAL_HOME,
        timestamp: 1000000060000,
        matchTime: '01:00',
        sequence: 1,
        data: {},
        undone: false
      },
      {
        id: 'goal-event-unknown',
        type: EVENT_TYPES.GOAL_AWAY,
        timestamp: 1000000120000,
        matchTime: '02:00',
        sequence: 2,
        data: {},
        undone: false
      }
    ];

    render(
      <GameEventTimeline
        events={goalEvents}
        getPlayerName={mockGetPlayerName}
        goalScorers={mockGoalScorers}
        homeTeamName="Djurgården"
        awayTeamName="Opponent"
      />
    );

    expect(screen.getByText('Goal for Djurgården - Alice')).toBeInTheDocument();
    expect(screen.getByText('Goal for Opponent - Unknown scorer')).toBeInTheDocument();
  });

  it('filters out undone events by default', () => {
    // Set up fresh mock implementation
    mockGetPlayerName.mockImplementation((playerId) => {
      const playerNames = {
        'player1': 'Alice',
        'player2': 'Bob',
        'player3': 'Charlie'
      };
      return playerNames[playerId] || null;
    });

    const eventsWithUndone = [
      ...sampleEvents,
      {
        id: 'undone-event',
        type: EVENT_TYPES.GOAL_HOME,
        timestamp: 1000000180000,
        matchTime: '03:00',
        sequence: 4,
        data: {},
        undone: true
      }
    ];

    render(
      <GameEventTimeline
        events={eventsWithUndone}
        getPlayerName={mockGetPlayerName}
        goalScorers={mockGoalScorers}
      />
    );

    // Should still show 3 events, not 4
    expect(screen.getByText('3 events')).toBeInTheDocument();
  });

  it('handles sort order toggle', () => {
    render(
      <GameEventTimeline
        events={sampleEvents}
        getPlayerName={mockGetPlayerName}
        goalScorers={mockGoalScorers}
      />
    );

    // Initially should show "Newest first"
    expect(screen.getByText('Newest first')).toBeInTheDocument();

    // Click to toggle sort order
    fireEvent.click(screen.getByText('Newest first'));

    // Should now show "Oldest first"
    expect(screen.getByText('Oldest first')).toBeInTheDocument();
  });

  it('calls onGoalClick when goal event is clicked', () => {
    // Set up fresh mock implementation
    mockGetPlayerName.mockImplementation((playerId) => {
      const playerNames = {
        'player1': 'Alice',
        'player2': 'Bob',
        'player3': 'Charlie'
      };
      return playerNames[playerId] || null;
    });

    const mockOnGoalClick = jest.fn();
    const goalEvent = {
      id: 'goal-event-1',
      type: EVENT_TYPES.GOAL_HOME,
      timestamp: 1000000060000,
      matchTime: '01:00',
      sequence: 1,
      data: {},
      undone: false
    };

    render(
      <GameEventTimeline
        events={[goalEvent]}
        getPlayerName={mockGetPlayerName}
        goalScorers={mockGoalScorers}
        onGoalClick={mockOnGoalClick}
        homeTeamName="Djurgården"
      />
    );

    // Click on the goal event
    fireEvent.click(screen.getByText('Goal for Djurgården - Alice'));

    expect(mockOnGoalClick).toHaveBeenCalledWith(goalEvent);
  });

  it('displays correct icons for different event types', () => {
    const diverseEvents = [
      {
        id: 'match-start',
        type: EVENT_TYPES.MATCH_START,
        timestamp: 1000000000000,
        matchTime: '00:00',
        sequence: 1,
        data: {},
        undone: false
      },
      {
        id: 'goal-home',
        type: EVENT_TYPES.GOAL_HOME,
        timestamp: 1000000060000,
        matchTime: '01:00',
        sequence: 2,
        data: {},
        undone: false
      },
      {
        id: 'timer-pause',
        type: EVENT_TYPES.TIMER_PAUSED,
        timestamp: 1000000120000,
        matchTime: '02:00',
        sequence: 3,
        data: {},
        undone: false
      }
    ];

    render(
      <GameEventTimeline
        events={diverseEvents}
        getPlayerName={mockGetPlayerName}
        goalScorers={mockGoalScorers}
      />
    );

    expect(screen.getByTestId('play-icon')).toBeInTheDocument();
    expect(screen.getByTestId('trophy-icon')).toBeInTheDocument();
    expect(screen.getByTestId('pause-icon')).toBeInTheDocument();
  });

  it('formats match times correctly', () => {
    render(
      <GameEventTimeline
        events={sampleEvents}
        getPlayerName={mockGetPlayerName}
        goalScorers={mockGoalScorers}
        matchStartTime={1000000000000}
      />
    );

    // Check that match times are displayed
    expect(screen.getByText('00:00')).toBeInTheDocument();
    expect(screen.getByText('01:00')).toBeInTheDocument();
    expect(screen.getByText('02:00')).toBeInTheDocument();
  });

  it('handles missing getPlayerName function gracefully', () => {
    const goalEvent = {
      id: 'goal-event-1',
      type: EVENT_TYPES.GOAL_HOME,
      timestamp: 1000000060000,
      matchTime: '01:00',
      sequence: 1,
      data: {},
      undone: false
    };

    render(
      <GameEventTimeline
        events={[goalEvent]}
        goalScorers={mockGoalScorers}
        homeTeamName="Djurgården"
        // No getPlayerName prop provided
      />
    );

    // Should still render but with "Unknown player"
    expect(screen.getByText('Goal for Djurgården - Unknown player')).toBeInTheDocument();
  });
});