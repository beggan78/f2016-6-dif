import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlayerStatsTable } from '../PlayerStatsTable';
import { PLAYER_ROLES, TEAM_MODES } from '../../../constants/playerConstants';

// Mock players data for testing
const mockPlayers = [
  {
    id: 'p1',
    name: 'Alice',
    stats: {
      startedMatchAs: PLAYER_ROLES.GOALIE,
      timeOnFieldSeconds: 300,
      timeAsAttackerSeconds: 0,
      timeAsDefenderSeconds: 0,
      timeAsGoalieSeconds: 720,
      timeAsSubSeconds: 0
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
      timeAsGoalieSeconds: 0,
      timeAsSubSeconds: 180
    }
  },
  {
    id: 'p3',
    name: 'Charlie',
    stats: {
      startedMatchAs: PLAYER_ROLES.SUBSTITUTE,
      timeOnFieldSeconds: 450,
      timeAsAttackerSeconds: 225,
      timeAsDefenderSeconds: 225,
      timeAsGoalieSeconds: 0,
      timeAsSubSeconds: 120
    }
  }
];

// Mock formation data for testing
const mockFormation = {
  goalie: 'p1',
  leftPair: { defender: 'p3', attacker: 'p2' },
  rightPair: { defender: null, attacker: null },
  subPair: { defender: null, attacker: null }
};

// Mock match events for testing
const mockMatchEvents = [
  {
    id: 'event1',
    type: 'goal_home',
    data: { scorerId: 'p2' },
    undone: false
  },
  {
    id: 'event2',
    type: 'goal_home',
    data: { scorerId: 'p2' },
    undone: false
  },
  {
    id: 'event3',
    type: 'goal_home',
    data: { scorerId: 'p3' },
    undone: false
  }
];

// Mock goal scorers for testing
const mockGoalScorers = {
  'event1': 'p2',
  'event2': 'p2',
  'event3': 'p3'
};

describe('PlayerStatsTable', () => {
  it('renders player data correctly', () => {
    render(
      <PlayerStatsTable
        players={mockPlayers}
        teamMode={TEAM_MODES.PAIRS_7}
        periodFormation={mockFormation}
        matchEvents={mockMatchEvents}
        goalScorers={mockGoalScorers}
      />
    );

    // Check that player names are displayed
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();

    // Check that starting roles are displayed correctly
    expect(screen.getByText('Goalie')).toBeInTheDocument(); // Alice (p1) is goalie
    expect(screen.getByText('Attacker')).toBeInTheDocument(); // Bob (p2) is in leftPair.attacker
    expect(screen.getByText('Defender')).toBeInTheDocument(); // Charlie (p3) is in leftPair.defender

    // Check that time values are formatted correctly
    expect(screen.getByText('05:00')).toBeInTheDocument(); // Alice's field time
    expect(screen.getByText('10:00')).toBeInTheDocument(); // Bob's field time
    expect(screen.getByText('06:00')).toBeInTheDocument(); // Bob's attacker time
    expect(screen.getByText('04:00')).toBeInTheDocument(); // Bob's defender time
    expect(screen.getByText('07:30')).toBeInTheDocument(); // Charlie's field time
    expect(screen.getByText('12:00')).toBeInTheDocument(); // Alice's goalie time
  });

  it('displays "--" for zero time values', () => {
    const playersWithZeroTime = [{
      id: 'p1',
      name: 'Test Player',
      stats: {
        startedMatchAs: PLAYER_ROLES.SUBSTITUTE,
        timeOnFieldSeconds: 0,
        timeAsAttackerSeconds: 0,
        timeAsDefenderSeconds: 0,
        timeAsGoalieSeconds: 0,
        timeAsSubSeconds: 0
      }
    }];

    render(
      <PlayerStatsTable
        players={playersWithZeroTime}
        teamMode={TEAM_MODES.PAIRS_7}
        periodFormation={{}}
        matchEvents={[]}
        goalScorers={{}}
      />
    );

    // Count all instances of "--" in the table
    const dashElements = screen.getAllByText('--');
    expect(dashElements).toHaveLength(6); // All time columns + goals column should show "--"
  });

  it('renders sortable column headers', () => {
    render(
      <PlayerStatsTable
        players={mockPlayers}
        teamMode={TEAM_MODES.PAIRS_7}
        periodFormation={mockFormation}
        matchEvents={mockMatchEvents}
        goalScorers={mockGoalScorers}
      />
    );

    // Check that sortable headers are present
    expect(screen.getByText('Player')).toBeInTheDocument();
    expect(screen.getByText('Time on Field')).toBeInTheDocument();
    expect(screen.getByText('Time as Attacker')).toBeInTheDocument();
    expect(screen.getByText('Time as Defender')).toBeInTheDocument();
    expect(screen.getByText('Time as Goalie')).toBeInTheDocument();
    expect(screen.getByText('Time as Substitute')).toBeInTheDocument();
    expect(screen.getByText('Goals Scored')).toBeInTheDocument();
    expect(screen.getByText('Starting Role')).toBeInTheDocument();
  });

  it('sorts players when sortable headers are clicked', () => {
    const { container } = render(
      <PlayerStatsTable
        players={mockPlayers}
        teamMode={TEAM_MODES.PAIRS_7}
        periodFormation={mockFormation}
        matchEvents={mockMatchEvents}
        goalScorers={mockGoalScorers}
      />
    );

    // Initially sorted by name (default) - should be Alice, Bob, Charlie
    let rows = container.querySelectorAll('tbody tr');
    expect(rows[0]).toHaveTextContent('Alice');
    expect(rows[1]).toHaveTextContent('Bob');
    expect(rows[2]).toHaveTextContent('Charlie');

    // Click on the "Time on Field" header to sort by time
    fireEvent.click(screen.getByText('Time on Field'));
    
    // After clicking, should be sorted by time descending (Bob has most time)
    rows = container.querySelectorAll('tbody tr');
    expect(rows[0]).toHaveTextContent('Bob'); // 600s
    expect(rows[1]).toHaveTextContent('Charlie'); // 450s
    expect(rows[2]).toHaveTextContent('Alice'); // 300s

    // Click on the "Player" header to sort by name
    fireEvent.click(screen.getByText('Player'));
    
    // Should now be sorted by name descending (reverse alphabetical)
    rows = container.querySelectorAll('tbody tr');
    expect(rows[0]).toHaveTextContent('Charlie');
    expect(rows[1]).toHaveTextContent('Bob');
    expect(rows[2]).toHaveTextContent('Alice');
  });

  it('displays sort indicators correctly', () => {
    render(
      <PlayerStatsTable
        players={mockPlayers}
        teamMode={TEAM_MODES.PAIRS_7}
        periodFormation={mockFormation}
        matchEvents={mockMatchEvents}
        goalScorers={mockGoalScorers}
      />
    );

    // Initially sorted by name ascending - should have ChevronUp
    expect(document.querySelector('svg')).toBeInTheDocument();

    // Click on the Player header to toggle to descending
    fireEvent.click(screen.getByText('Player'));
    
    // Should still show sort indicator (ChevronDown)
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('handles empty players array', () => {
    render(
      <PlayerStatsTable
        players={[]}
        teamMode={TEAM_MODES.PAIRS_7}
      />
    );

    expect(screen.getByText('No player statistics available')).toBeInTheDocument();
  });

  it('handles undefined stats gracefully', () => {
    const playersWithUndefinedStats = [{
      id: 'p1',
      name: 'Test Player',
      stats: {
        startedMatchAs: null,
        timeOnFieldSeconds: undefined,
        timeAsAttackerSeconds: null,
        timeAsDefenderSeconds: undefined,
        timeAsGoalieSeconds: null,
        timeAsSubSeconds: undefined
      }
    }];

    render(
      <PlayerStatsTable
        players={playersWithUndefinedStats}
        teamMode={TEAM_MODES.PAIRS_7}
        periodFormation={{}}
        matchEvents={[]}
        goalScorers={{}}
      />
    );

    expect(screen.getByText('Test Player')).toBeInTheDocument();
    
    // Should show "--" for all undefined/null values
    const dashElements = screen.getAllByText('--');
    expect(dashElements.length).toBeGreaterThan(0);
  });

  it('applies hover styles to sortable headers', () => {
    render(
      <PlayerStatsTable
        players={mockPlayers}
        teamMode={TEAM_MODES.PAIRS_7}
        periodFormation={mockFormation}
        matchEvents={mockMatchEvents}
        goalScorers={mockGoalScorers}
      />
    );

    // Check that sortable headers have hover styles
    const playerHeader = screen.getByText('Player').closest('th');
    expect(playerHeader).toHaveClass('cursor-pointer', 'hover:bg-slate-700');

    // Check that non-sortable headers don't have hover styles
    const startingRoleHeader = screen.getByText('Starting Role').closest('th');
    expect(startingRoleHeader).not.toHaveClass('cursor-pointer');
  });
});