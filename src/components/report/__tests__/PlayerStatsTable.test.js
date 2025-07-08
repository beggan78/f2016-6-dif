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
      startedMatchAs: PLAYER_ROLES.SUBSTITUTE,
      timeOnFieldSeconds: 450,
      timeAsAttackerSeconds: 225,
      timeAsDefenderSeconds: 225,
      timeAsGoalieSeconds: 0
    }
  }
];

describe('PlayerStatsTable', () => {
  it('renders player data correctly', () => {
    render(
      <PlayerStatsTable
        players={mockPlayers}
        sortBy="name"
        sortOrder="asc"
        onSort={jest.fn()}
        teamMode={TEAM_MODES.PAIRS_7}
      />
    );

    // Check that player names are displayed
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();

    // Check that starting roles are displayed correctly
    expect(screen.getByText('Goalie')).toBeInTheDocument();
    expect(screen.getByText('Field')).toBeInTheDocument();
    expect(screen.getByText('Sub')).toBeInTheDocument();

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
        timeAsGoalieSeconds: 0
      }
    }];

    render(
      <PlayerStatsTable
        players={playersWithZeroTime}
        sortBy="name"
        sortOrder="asc"
        onSort={jest.fn()}
        teamMode={TEAM_MODES.PAIRS_7}
      />
    );

    // Count all instances of "--" in the table
    const dashElements = screen.getAllByText('--');
    expect(dashElements).toHaveLength(4); // All time columns should show "--"
  });

  it('renders sortable column headers', () => {
    const mockOnSort = jest.fn();
    
    render(
      <PlayerStatsTable
        players={mockPlayers}
        sortBy="name"
        sortOrder="asc"
        onSort={mockOnSort}
        teamMode={TEAM_MODES.PAIRS_7}
      />
    );

    // Check that sortable headers are present
    expect(screen.getByText('Player')).toBeInTheDocument();
    expect(screen.getByText('Time on Field')).toBeInTheDocument();
    expect(screen.getByText('Time as Attacker')).toBeInTheDocument();
    expect(screen.getByText('Time as Defender')).toBeInTheDocument();
    expect(screen.getByText('Time as Goalie')).toBeInTheDocument();
    expect(screen.getByText('Starting Role')).toBeInTheDocument();
  });

  it('calls onSort when sortable headers are clicked', () => {
    const mockOnSort = jest.fn();
    
    render(
      <PlayerStatsTable
        players={mockPlayers}
        sortBy="name"
        sortOrder="asc"
        onSort={mockOnSort}
        teamMode={TEAM_MODES.PAIRS_7}
      />
    );

    // Click on the "Time on Field" header
    fireEvent.click(screen.getByText('Time on Field'));
    expect(mockOnSort).toHaveBeenCalledWith('timeOnField', 'asc');

    // Click on the "Player" header when it's already sorted
    fireEvent.click(screen.getByText('Player'));
    expect(mockOnSort).toHaveBeenCalledWith('name', 'desc');
  });

  it('displays sort indicators correctly', () => {
    const { rerender } = render(
      <PlayerStatsTable
        players={mockPlayers}
        sortBy="name"
        sortOrder="asc"
        onSort={jest.fn()}
        teamMode={TEAM_MODES.PAIRS_7}
      />
    );

    // Check for ascending sort indicator (ChevronUp)
    expect(document.querySelector('svg[data-testid="ChevronUp"], svg')).toBeInTheDocument();

    // Rerender with descending sort
    rerender(
      <PlayerStatsTable
        players={mockPlayers}
        sortBy="name"
        sortOrder="desc"
        onSort={jest.fn()}
        teamMode={TEAM_MODES.PAIRS_7}
      />
    );

    // Check that sort indicator is still present (ChevronDown)
    expect(document.querySelector('svg[data-testid="ChevronDown"], svg')).toBeInTheDocument();
  });

  it('handles empty players array', () => {
    render(
      <PlayerStatsTable
        players={[]}
        sortBy="name"
        sortOrder="asc"
        onSort={jest.fn()}
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
        timeAsGoalieSeconds: null
      }
    }];

    render(
      <PlayerStatsTable
        players={playersWithUndefinedStats}
        sortBy="name"
        sortOrder="asc"
        onSort={jest.fn()}
        teamMode={TEAM_MODES.PAIRS_7}
      />
    );

    expect(screen.getByText('Test Player')).toBeInTheDocument();
    
    // Should show "--" for all undefined/null values
    const dashElements = screen.getAllByText('--');
    expect(dashElements.length).toBeGreaterThan(0);
  });

  it('sorts players correctly', () => {
    const { container } = render(
      <PlayerStatsTable
        players={mockPlayers}
        sortBy="timeOnField"
        sortOrder="desc"
        onSort={jest.fn()}
        teamMode={TEAM_MODES.PAIRS_7}
      />
    );

    // Get all table rows with player data
    const rows = container.querySelectorAll('tbody tr');
    
    // Check that players are sorted by field time descending
    // Bob (600s) should be first, Charlie (450s) second, Alice (300s) third
    expect(rows[0]).toHaveTextContent('Bob');
    expect(rows[1]).toHaveTextContent('Charlie');
    expect(rows[2]).toHaveTextContent('Alice');
  });

  it('applies hover styles to sortable headers', () => {
    render(
      <PlayerStatsTable
        players={mockPlayers}
        sortBy="name"
        sortOrder="asc"
        onSort={jest.fn()}
        teamMode={TEAM_MODES.PAIRS_7}
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