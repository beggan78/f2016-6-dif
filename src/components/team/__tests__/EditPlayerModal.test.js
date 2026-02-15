import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EditPlayerModal } from '../EditPlayerModal';

describe('EditPlayerModal', () => {
  let defaultProps;
  let mockOnClose;
  let mockOnPlayerUpdated;
  let mockGetAvailableJerseyNumbers;
  let mockGetTeamMembers;

  const mockPlayer = {
    id: 'player-1',
    first_name: 'Alice',
    last_name: 'Johnson',
    display_name: 'Alice',
    jersey_number: 7,
    on_roster: true,
    related_to: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-06-01T00:00:00Z'
  };

  beforeEach(() => {
    mockOnClose = jest.fn();
    mockOnPlayerUpdated = jest.fn().mockResolvedValue();
    mockGetAvailableJerseyNumbers = jest.fn().mockResolvedValue([1, 2, 3, 4, 5]);
    mockGetTeamMembers = jest.fn().mockResolvedValue([
      { id: 'tu-1', role: 'admin', user: { id: 'user-1', name: 'Coach Anna' } },
      { id: 'tu-2', role: 'coach', user: { id: 'user-2', name: 'Coach Bob' } },
      { id: 'tu-3', role: 'parent', user: { id: 'user-3', name: 'Parent Carl' } }
    ]);

    defaultProps = {
      player: mockPlayer,
      team: { id: 'team-1', name: 'Test Team' },
      onClose: mockOnClose,
      onPlayerUpdated: mockOnPlayerUpdated,
      getAvailableJerseyNumbers: mockGetAvailableJerseyNumbers,
      getTeamMembers: mockGetTeamMembers
    };

    jest.clearAllMocks();
  });

  it('renders the modal with form fields', async () => {
    render(<EditPlayerModal {...defaultProps} />);

    expect(screen.getByRole('heading', { name: 'Edit Player' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Johnson')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter first name')).toHaveValue('Alice');
  });

  it('renders related to dropdown with coaches and admins only', async () => {
    render(<EditPlayerModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Related To')).toBeInTheDocument();
    });

    const relatedToSelect = screen.getByDisplayValue('No relation');
    const options = relatedToSelect.querySelectorAll('option');
    const optionTexts = Array.from(options).map(o => o.textContent);
    expect(optionTexts).toContain('Coach Anna (admin)');
    expect(optionTexts).toContain('Coach Bob (coach)');
    expect(optionTexts).not.toContain('Parent Carl (parent)');
  });

  it('initializes related_to from player data', async () => {
    const playerWithRelation = { ...mockPlayer, related_to: 'user-2' };
    render(<EditPlayerModal {...defaultProps} player={playerWithRelation} />);

    await waitFor(() => {
      expect(screen.getByText('Related To')).toBeInTheDocument();
    });

    const relatedToSelect = screen.getByDisplayValue('Coach Bob (coach)');
    expect(relatedToSelect).toBeInTheDocument();
  });

  it('includes related_to in update data', async () => {
    render(<EditPlayerModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Related To')).toBeInTheDocument();
    });

    // Select a related_to value
    const relatedToSelect = screen.getByDisplayValue('No relation');
    fireEvent.change(relatedToSelect, { target: { value: 'user-1' } });

    // Submit
    fireEvent.click(screen.getByText('Update Player'));

    await waitFor(() => {
      expect(mockOnPlayerUpdated).toHaveBeenCalledWith(
        'player-1',
        expect.objectContaining({
          related_to: 'user-1'
        })
      );
    });
  });

  it('submits null for related_to when cleared', async () => {
    const playerWithRelation = { ...mockPlayer, related_to: 'user-2' };
    render(<EditPlayerModal {...defaultProps} player={playerWithRelation} />);

    await waitFor(() => {
      expect(screen.getByText('Related To')).toBeInTheDocument();
    });

    // Clear the related_to value
    const relatedToSelect = screen.getByDisplayValue('Coach Bob (coach)');
    fireEvent.change(relatedToSelect, { target: { value: '' } });

    // Submit
    fireEvent.click(screen.getByText('Update Player'));

    await waitFor(() => {
      expect(mockOnPlayerUpdated).toHaveBeenCalledWith(
        'player-1',
        expect.objectContaining({
          related_to: null
        })
      );
    });
  });

  it('does not render related to dropdown when no coaches/admins', async () => {
    mockGetTeamMembers.mockResolvedValue([
      { id: 'tu-3', role: 'parent', user: { id: 'user-3', name: 'Parent Carl' } }
    ]);
    render(<EditPlayerModal {...defaultProps} />);

    await waitFor(() => {
      expect(mockGetTeamMembers).toHaveBeenCalledWith('team-1');
    });

    expect(screen.queryByText('Related To')).not.toBeInTheDocument();
  });
});
