import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { MatchHistoryView } from '../MatchHistoryView';
import { useTeam } from '../../../contexts/TeamContext';
import { getFinishedMatches } from '../../../services/matchStateManager';
import { STORAGE_KEYS } from '../../../constants/storageKeys';

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
    goalsScored:1,
    goalsConceded:2,
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
    goalsScored:4,
    goalsConceded:0,
    venueType: 'away',
    type: 'League',
    outcome: 'W',
    format: '5v5',
    players: ['Alice Johnson', 'Bob Smith', 'Charlie Brown']
  },
  {
    id: 5,
    date: '2024-12-20T15:30:00Z',
    opponent: 'Örebro SK',
    goalsScored:2,
    goalsConceded:1,
    venueType: 'home',
    type: 'League',
    outcome: 'W',
    format: '7v7',
    players: ['David Wilson', 'Eva Davis', 'Frank Miller']
  },
  {
    id: 6,
    date: '2024-12-15T14:00:00Z',
    opponent: 'Helsingborgs IF',
    goalsScored:0,
    goalsConceded:3,
    venueType: 'away',
    type: 'Friendly',
    outcome: 'L',
    format: '5v5',
    players: ['Alice Johnson', 'Charlie Brown', 'Eva Davis']
  },
  {
    id: 7,
    date: '2024-12-10T16:30:00Z',
    opponent: 'BK Häcken',
    goalsScored:1,
    goalsConceded:1,
    venueType: 'neutral',
    type: 'League',
    outcome: 'D',
    format: '7v7',
    players: ['Bob Smith', 'Frank Miller', 'Grace Lee']
  },
  {
    id: 8,
    date: '2024-12-05T15:00:00Z',
    opponent: 'IFK Norrköping',
    goalsScored:3,
    goalsConceded:2,
    venueType: 'away',
    type: 'Cup',
    outcome: 'W',
    format: '5v5',
    players: ['Alice Johnson', 'Charlie Brown', 'David Wilson']
  },
  {
    id: 9,
    date: '2024-11-30T14:30:00Z',
    opponent: 'Degerfors IF',
    goalsScored:2,
    goalsConceded:0,
    venueType: 'home',
    type: 'League',
    outcome: 'W',
    format: '5v5',
    players: ['Bob Smith', 'Eva Davis', 'Frank Miller']
  },
  {
    id: 10,
    date: '2024-11-25T13:30:00Z',
    opponent: 'Varbergs BoIS',
    goalsScored:1,
    goalsConceded:4,
    venueType: 'away',
    type: 'Friendly',
    outcome: 'L',
    format: '7v7',
    players: ['Charlie Brown', 'Grace Lee', 'Henry Taylor']
  }
];

describe('MatchHistoryView', () => {
  const mockOnMatchSelect = jest.fn();

  beforeEach(() => {
    mockOnMatchSelect.mockClear();

    window.localStorage.removeItem(STORAGE_KEYS.STATS_FILTERS);

    // Mock useTeam hook
    useTeam.mockReturnValue({
      currentTeam: { id: 'team-123', name: 'Test Team' }
    });

    // Mock getFinishedMatches
    getFinishedMatches.mockResolvedValue({
      success: true,
      matches: mockMatches
    });
  });

  test('shows format filter when multiple formats exist in matches', async () => {
    render(<MatchHistoryView onMatchSelect={mockOnMatchSelect} />);

    await screen.findByText('Format');
  });

  test('filters matches by format correctly', async () => {
    render(<MatchHistoryView onMatchSelect={mockOnMatchSelect} />);

    await screen.findByText(/10 matches found/i);

    openFilterToggle('Format');

    const formatOption = await screen.findByLabelText('5v5');
    fireEvent.click(formatOption);

    await screen.findByText(/6 matches found/i);
  });

  test('format filter shows all format options from matches', async () => {
    render(<MatchHistoryView onMatchSelect={mockOnMatchSelect} />);

    await screen.findByText('Format');

    openFilterToggle('Format');

    const listbox = await screen.findByRole('listbox');
    const optionCheckboxes = within(listbox).getAllByRole('checkbox');
    expect(optionCheckboxes).toHaveLength(2); // 5v5 and 7v7

    expect(screen.getByLabelText('5v5')).toBeInTheDocument();
    expect(screen.getByLabelText('7v7')).toBeInTheDocument();
  });

  test('format filter visibility changes based on available formats', async () => {
    render(<MatchHistoryView onMatchSelect={mockOnMatchSelect} />);

    await screen.findByText('Format');

    openFilterToggle('Format');

    const option = await screen.findByLabelText('7v7');
    fireEvent.click(option);

    await screen.findByText(/4 matches found/i);
  });

  test('renders Add Match button when handler provided', async () => {
    const handleCreateMatch = jest.fn();

    render(
      <MatchHistoryView
        onMatchSelect={mockOnMatchSelect}
        onCreateMatch={handleCreateMatch}
      />
    );

    await screen.findByText(/10 matches found/i);

    const addButton = screen.getByRole('button', { name: /Add Match/i });
    fireEvent.click(addButton);

    expect(handleCreateMatch).toHaveBeenCalledTimes(1);
  });

  test('refetches matches when refreshKey changes', async () => {
    const { rerender } = render(
      <MatchHistoryView onMatchSelect={mockOnMatchSelect} refreshKey={0} />
    );

    await screen.findByText(/10 matches found/i);
    expect(getFinishedMatches).toHaveBeenCalledTimes(1);

    getFinishedMatches.mockClear();

    rerender(
      <MatchHistoryView onMatchSelect={mockOnMatchSelect} refreshKey={1} />
    );

    await waitFor(() => {
      expect(getFinishedMatches).toHaveBeenCalledTimes(1);
    });
  });

  test('component renders without errors', async () => {
    render(<MatchHistoryView onMatchSelect={mockOnMatchSelect} />);

    await screen.findByText('Filter');
    expect(screen.getByText('Match History')).toBeInTheDocument();
    expect(screen.getByText(/matches found/i)).toBeInTheDocument();
  });

  test('displays match format badges on wide screens', async () => {
    const originalWidth = window.innerWidth;
    window.innerWidth = 1280;

    try {
      render(<MatchHistoryView onMatchSelect={mockOnMatchSelect} />);

      await screen.findByText(/10 matches found/i);

      const hammarbyCard = screen.getByText('Hammarby IF').closest('.bg-slate-800');
      expect(hammarbyCard).not.toBeNull();
      expect(within(hammarbyCard).getByText('5v5')).toBeInTheDocument();

      const aikCard = screen.getByText('AIK').closest('.bg-slate-800');
      expect(aikCard).not.toBeNull();
      expect(within(aikCard).getByText('7v7')).toBeInTheDocument();
    } finally {
      window.innerWidth = originalWidth;
    }
  });

  test('filters matches by venue type including neutral', async () => {
    render(<MatchHistoryView onMatchSelect={mockOnMatchSelect} />);

    await screen.findByText(/10 matches found/i);

    openFilterToggle('Venue');

    const homeOption = await screen.findByLabelText('Home');
    fireEvent.click(homeOption);
    await screen.findByText(/4 matches found/i);

    fireEvent.click(homeOption);
    const awayOption = screen.getByLabelText('Away');
    fireEvent.click(awayOption);
    await screen.findByText(/4 matches found/i);

    fireEvent.click(awayOption);
    const neutralOption = screen.getByLabelText('Neutral');
    fireEvent.click(neutralOption);
    await screen.findByText(/2 matches found/i);

    const clearButton = screen.getByText('Clear selection');
    fireEvent.click(clearButton);
    await screen.findByText(/10 matches found/i);
  });

  test('venue filter shows all venue options', async () => {
    render(<MatchHistoryView onMatchSelect={mockOnMatchSelect} />);

    await screen.findByText('Venue');

    openFilterToggle('Venue');

    expect(screen.getByLabelText('Home')).toBeInTheDocument();
    expect(screen.getByLabelText('Away')).toBeInTheDocument();
    expect(screen.getByLabelText('Neutral')).toBeInTheDocument();
  });

  test('shows outcome badge at sm breakpoint and above', async () => {
    const originalWidth = window.innerWidth;
    window.innerWidth = 800;

    try {
      render(<MatchHistoryView onMatchSelect={mockOnMatchSelect} />);

      await screen.findByText(/10 matches found/i);

      const hammarbyCard = screen.getByText('Hammarby IF').closest('.bg-slate-800');
      expect(hammarbyCard).not.toBeNull();
      expect(within(hammarbyCard).getByText('Win')).toBeInTheDocument();
    } finally {
      window.innerWidth = originalWidth;
    }
  });

  test('shows venue, match type, and format badges at sm breakpoint and above', async () => {
    const originalWidth = window.innerWidth;
    window.innerWidth = 800;

    try {
      render(<MatchHistoryView onMatchSelect={mockOnMatchSelect} />);

      await screen.findByText(/10 matches found/i);

      const hammarbyCard = screen.getByText('Hammarby IF').closest('.bg-slate-800');
      expect(hammarbyCard).not.toBeNull();
      expect(within(hammarbyCard).getByText('Home')).toBeInTheDocument();
      expect(within(hammarbyCard).getByText('League')).toBeInTheDocument();
      expect(within(hammarbyCard).getByText('5v5')).toBeInTheDocument();
    } finally {
      window.innerWidth = originalWidth;
    }
  });
});
