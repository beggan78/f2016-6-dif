import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { TeamStatsView } from '../TeamStatsView';
import { useTeam } from '../../../contexts/TeamContext';
import { getConfirmedMatches } from '../../../services/matchStateManager';

// Mock dependencies
jest.mock('../../../contexts/TeamContext');
jest.mock('../../../services/matchStateManager');

/* eslint-disable testing-library/no-node-access */
function openFilterToggle(labelText) {
  const label = screen.getByText(labelText);
  const container = label.closest('div');
  if (!container) {
    throw new Error(`Unable to find container for label ${labelText}`);
  }
  const toggle = within(container).getByRole('button');
  fireEvent.click(toggle);
  return toggle;
}
/* eslint-enable testing-library/no-node-access */

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

    useTeam.mockReturnValue({
      currentTeam: { id: 'team-123', name: 'Test Team' }
    });

    getConfirmedMatches.mockResolvedValue({
      success: true,
      matches: mockMatches
    });
  });

  test('renders filter panel and team stats', async () => {
    render(<TeamStatsView onMatchSelect={mockOnMatchSelect} />);

    await screen.findByText('Filter');
    await screen.findByText('Total Matches');
    expect(screen.getByText('Win Rate')).toBeInTheDocument();
  });

  test('filters update team statistics correctly', async () => {
    render(<TeamStatsView onMatchSelect={mockOnMatchSelect} />);

    await screen.findByText('Total Matches');

    const totalMatchesValue = screen.getByLabelText('Total Matches value');
    expect(totalMatchesValue).toHaveTextContent('4');

    openFilterToggle('Type');

    const leagueOption = await screen.findByLabelText('League');
    fireEvent.click(leagueOption);

    await waitFor(() => {
      expect(screen.getByLabelText('Total Matches value')).toHaveTextContent('2');
    });
  });

  test('filters by player correctly', async () => {
    render(<TeamStatsView onMatchSelect={mockOnMatchSelect} />);

    await screen.findByText('Filter');

    openFilterToggle('With Player');

    const aliceOption = await screen.findByLabelText('Alice Johnson');
    fireEvent.click(aliceOption);

    await waitFor(() => {
      expect(screen.getByLabelText('Total Matches value')).toHaveTextContent('3');
    });
  });

  test('clear all filters resets stats', async () => {
    render(<TeamStatsView onMatchSelect={mockOnMatchSelect} />);

    await screen.findByText('Filter');

    openFilterToggle('Outcome');

    const winOption = await screen.findByLabelText('Win');
    fireEvent.click(winOption);

    await waitFor(() => {
      expect(screen.getByLabelText('Total Matches value')).toHaveTextContent('2');
    });

    fireEvent.click(screen.getByText('Clear All'));

    await waitFor(() => {
      expect(screen.getByLabelText('Total Matches value')).toHaveTextContent('4');
    });
  });

  test('shows empty state when filters result in no matches', async () => {
    render(<TeamStatsView onMatchSelect={mockOnMatchSelect} />);

    await screen.findByText('Filter');

    const typeButton = openFilterToggle('Type');
    const friendlyOption = await screen.findByLabelText('Friendly');
    fireEvent.click(friendlyOption);
    fireEvent.click(typeButton);

    openFilterToggle('Opponent');
    const malmoOption = await screen.findByLabelText('Malmö FF');
    fireEvent.click(malmoOption);

    await screen.findByText('No matches found with the selected filters');
  });
});
