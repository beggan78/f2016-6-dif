import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MatchHistoryView } from '../MatchHistoryView';
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
    homeScore: 3,
    awayScore: 1,
    isHome: true,
    type: 'League',
    outcome: 'W',
    format: '5v5',
    players: ['Alice Johnson', 'Bob Smith', 'Charlie Brown']
  },
  {
    id: 2,
    date: '2025-01-15T14:30:00Z',
    opponent: 'AIK',
    homeScore: 2,
    awayScore: 2,
    isHome: false,
    type: 'Friendly',
    outcome: 'D',
    format: '7v7',
    players: ['Alice Johnson', 'Bob Smith', 'Frank Miller']
  },
  {
    id: 3,
    date: '2025-01-10T16:00:00Z',
    opponent: 'IFK Göteborg',
    homeScore: 1,
    awayScore: 2,
    isHome: true,
    type: 'Cup',
    outcome: 'L',
    format: '5v5',
    players: ['Charlie Brown', 'David Wilson', 'Eva Davis']
  },
  {
    id: 4,
    date: '2025-01-05T13:00:00Z',
    opponent: 'Malmö FF',
    homeScore: 4,
    awayScore: 0,
    isHome: false,
    type: 'League',
    outcome: 'W',
    format: '5v5',
    players: ['Alice Johnson', 'Bob Smith', 'Charlie Brown']
  },
  {
    id: 5,
    date: '2024-12-20T15:30:00Z',
    opponent: 'Örebro SK',
    homeScore: 2,
    awayScore: 1,
    isHome: true,
    type: 'League',
    outcome: 'W',
    format: '7v7',
    players: ['David Wilson', 'Eva Davis', 'Frank Miller']
  },
  {
    id: 6,
    date: '2024-12-15T14:00:00Z',
    opponent: 'Helsingborgs IF',
    homeScore: 0,
    awayScore: 3,
    isHome: false,
    type: 'Friendly',
    outcome: 'L',
    format: '5v5',
    players: ['Alice Johnson', 'Charlie Brown', 'Eva Davis']
  },
  {
    id: 7,
    date: '2024-12-10T16:30:00Z',
    opponent: 'BK Häcken',
    homeScore: 1,
    awayScore: 1,
    isHome: true,
    type: 'League',
    outcome: 'D',
    format: '7v7',
    players: ['Bob Smith', 'Frank Miller', 'Grace Lee']
  },
  {
    id: 8,
    date: '2024-12-05T15:00:00Z',
    opponent: 'IFK Norrköping',
    homeScore: 3,
    awayScore: 2,
    isHome: false,
    type: 'Cup',
    outcome: 'W',
    format: '5v5',
    players: ['Alice Johnson', 'Charlie Brown', 'David Wilson']
  },
  {
    id: 9,
    date: '2024-11-30T14:30:00Z',
    opponent: 'Degerfors IF',
    homeScore: 2,
    awayScore: 0,
    isHome: true,
    type: 'League',
    outcome: 'W',
    format: '5v5',
    players: ['Bob Smith', 'Eva Davis', 'Frank Miller']
  },
  {
    id: 10,
    date: '2024-11-25T13:30:00Z',
    opponent: 'Varbergs BoIS',
    homeScore: 1,
    awayScore: 4,
    isHome: false,
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

  test('shows format filter when multiple formats exist in matches', async () => {
    render(<MatchHistoryView onMatchSelect={mockOnMatchSelect} />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Format')).toBeInTheDocument();
    });
  });

  test('filters matches by format correctly', async () => {
    render(<MatchHistoryView onMatchSelect={mockOnMatchSelect} />);

    // Wait for data to load and check initial count
    await waitFor(() => {
      expect(screen.getByText(/10 matches found/i)).toBeInTheDocument();
    });

    // Find the format filter by looking for the label
    const formatLabel = screen.getByText('Format');
    const formatSelect = formatLabel.closest('.flex')?.querySelector('select');

    expect(formatSelect).toBeInTheDocument();

    if (formatSelect) {
      // Change to 5v5 filter
      fireEvent.change(formatSelect, { target: { value: '5v5' } });

      // Should now show fewer matches (6 matches have 5v5 format in mock data)
      await waitFor(() => {
        expect(screen.getByText(/6 matches found/i)).toBeInTheDocument();
      });
    }
  });

  test('format filter shows all format options from matches', async () => {
    render(<MatchHistoryView onMatchSelect={mockOnMatchSelect} />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Format')).toBeInTheDocument();
    });

    // Find the format filter select
    const formatLabel = screen.getByText('Format');
    const formatSelect = formatLabel.closest('.flex')?.querySelector('select');

    expect(formatSelect).toBeInTheDocument();

    if (formatSelect) {
      // The select should have All, 5v5, and 7v7 options based on mock data
      expect(formatSelect.children).toHaveLength(3); // All + 5v5 + 7v7

      const options = Array.from(formatSelect.children).map(option => option.textContent);
      expect(options).toContain('All');
      expect(options).toContain('5v5');
      expect(options).toContain('7v7');
    }
  });

  test('format filter visibility changes based on available formats', async () => {
    render(<MatchHistoryView onMatchSelect={mockOnMatchSelect} />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Format')).toBeInTheDocument();
    });

    // Format dropdown should exist
    const formatLabel = screen.getByText('Format');
    const formatSelect = formatLabel.closest('.flex')?.querySelector('select');
    expect(formatSelect).toBeInTheDocument();

    // Test that 7v7 filter works too
    if (formatSelect) {
      fireEvent.change(formatSelect, { target: { value: '7v7' } });
      await waitFor(() => {
        expect(screen.getByText(/4 matches found/i)).toBeInTheDocument();
      });
    }
  });

  test('component renders without errors', async () => {
    render(<MatchHistoryView onMatchSelect={mockOnMatchSelect} />);

    // Wait for data to load and check basic elements are present
    await waitFor(() => {
      expect(screen.getByText('Filter')).toBeInTheDocument();
      expect(screen.getByText('Match History')).toBeInTheDocument();
      expect(screen.getByText(/matches found/i)).toBeInTheDocument();
    });
  });
});