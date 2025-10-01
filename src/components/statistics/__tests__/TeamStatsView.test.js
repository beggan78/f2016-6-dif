import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TeamStatsView } from '../TeamStatsView';
import { useTeam } from '../../../contexts/TeamContext';
import { getConfirmedMatches } from '../../../services/matchStateManager';

// Mock dependencies
jest.mock('../../../contexts/TeamContext');
jest.mock('../../../services/matchStateManager');

// Mock match data
const mockMatches = [
  {
    id: 1,
    date: '2025-01-20T15:00:00Z',
    opponent: 'Hammarby IF',
    goalsScored: 3,
    goalsConceded: 1,
    venueType: 'home',
    type: 'League',
    outcome: 'W',
    format: '5v5',
    players: ['Alice Johnson', 'Bob Smith', 'Charlie Brown']
  },
  {
    id: 2,
    date: '2025-01-15T14:30:00Z',
    opponent: 'AIK',
    goalsScored: 2,
    goalsConceded: 2,
    venueType: 'neutral',
    type: 'Friendly',
    outcome: 'D',
    format: '7v7',
    players: ['Alice Johnson', 'Bob Smith', 'Frank Miller']
  },
  {
    id: 3,
    date: '2025-01-10T16:00:00Z',
    opponent: 'IFK Göteborg',
    goalsScored: 1,
    goalsConceded: 2,
    venueType: 'home',
    type: 'Cup',
    outcome: 'L',
    format: '5v5',
    players: ['Charlie Brown', 'David Wilson', 'Eva Davis']
  },
  {
    id: 4,
    date: '2025-01-05T13:00:00Z',
    opponent: 'Malmö FF',
    goalsScored: 4,
    goalsConceded: 0,
    venueType: 'away',
    type: 'League',
    outcome: 'W',
    format: '5v5',
    players: ['Alice Johnson', 'Bob Smith', 'Charlie Brown']
  }
];

describe('TeamStatsView', () => {
  const mockOnMatchSelect = jest.fn();

  beforeEach(() => {
    mockOnMatchSelect.mockClear();

    // Mock useTeam hook
    useTeam.mockReturnValue({
      currentTeam: { id: 'team-123', name: 'Test Team' }
    });

    // Mock getConfirmedMatches
    getConfirmedMatches.mockResolvedValue({
      success: true,
      matches: mockMatches
    });
  });

  test('renders filter panel and team stats', async () => {
    render(<TeamStatsView onMatchSelect={mockOnMatchSelect} />);

    // Wait for data to load and check that filter is present
    await waitFor(() => {
      expect(screen.getByText('Filter')).toBeInTheDocument();
    });

    // Check that stats are displayed
    await waitFor(() => {
      expect(screen.getByText('Total Matches')).toBeInTheDocument();
      expect(screen.getByText('Win Rate')).toBeInTheDocument();
    });
  });

  test('filters update team statistics correctly', async () => {
    render(<TeamStatsView onMatchSelect={mockOnMatchSelect} />);

    // Wait for initial data to load
    await waitFor(() => {
      expect(screen.getByText('Total Matches')).toBeInTheDocument();
    });

    // Initial stats should show all 4 matches
    const totalMatchesCard = screen.getByText('Total Matches').closest('.bg-slate-700');
    expect(totalMatchesCard).toHaveTextContent('4');

    // Find the type filter
    const typeLabel = screen.getByText('Type');
    const typeSelect = typeLabel.closest('.flex')?.querySelector('select');

    if (typeSelect) {
      // Filter by League type
      fireEvent.change(typeSelect, { target: { value: 'League' } });

      // Should now show only 2 matches (matches 1 and 4 are League)
      await waitFor(() => {
        const updatedCard = screen.getByText('Total Matches').closest('.bg-slate-700');
        expect(updatedCard).toHaveTextContent('2');
      });
    }
  });

  test('filters by player correctly', async () => {
    render(<TeamStatsView onMatchSelect={mockOnMatchSelect} />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Filter')).toBeInTheDocument();
    });

    // Find the player filter
    const playerLabel = screen.getByText('With Player');
    const playerSelect = playerLabel.closest('.flex')?.querySelector('select');

    if (playerSelect) {
      // Filter by Alice Johnson (appears in matches 1, 2, 4)
      fireEvent.change(playerSelect, { target: { value: 'Alice Johnson' } });

      // Should show 3 matches
      await waitFor(() => {
        const totalMatchesCard = screen.getByText('Total Matches').closest('.bg-slate-700');
        expect(totalMatchesCard).toHaveTextContent('3');
      });
    }
  });

  test('clear all filters resets stats', async () => {
    render(<TeamStatsView onMatchSelect={mockOnMatchSelect} />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Filter')).toBeInTheDocument();
    });

    // Apply a filter
    const outcomeLabel = screen.getByText('Outcome');
    const outcomeSelect = outcomeLabel.closest('.flex')?.querySelector('select');

    if (outcomeSelect) {
      fireEvent.change(outcomeSelect, { target: { value: 'W' } });

      // Should show 2 wins
      await waitFor(() => {
        const totalMatchesCard = screen.getByText('Total Matches').closest('.bg-slate-700');
        expect(totalMatchesCard).toHaveTextContent('2');
      });

      // Click clear all
      const clearButton = screen.getByText('Clear All');
      fireEvent.click(clearButton);

      // Should show all 4 matches again
      await waitFor(() => {
        const totalMatchesCard = screen.getByText('Total Matches').closest('.bg-slate-700');
        expect(totalMatchesCard).toHaveTextContent('4');
      });
    }
  });

  test('shows empty state when filters result in no matches', async () => {
    render(<TeamStatsView onMatchSelect={mockOnMatchSelect} />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Filter')).toBeInTheDocument();
    });

    // Find the opponent filter
    const opponentLabel = screen.getByText('Opponent');
    const opponentSelect = opponentLabel.closest('.flex')?.querySelector('select');

    if (opponentSelect) {
      // Apply multiple filters that result in no matches
      const typeLabel = screen.getByText('Type');
      const typeSelect = typeLabel.closest('.flex')?.querySelector('select');

      if (typeSelect) {
        // Filter by Friendly type
        fireEvent.change(typeSelect, { target: { value: 'Friendly' } });

        // Then filter by opponent that doesn't match Friendly (Malmö FF is League)
        fireEvent.change(opponentSelect, { target: { value: 'Malmö FF' } });

        // Should show empty state
        await waitFor(() => {
          expect(screen.getByText('No matches found with the selected filters')).toBeInTheDocument();
        });
      }
    }
  });
});
