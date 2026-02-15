import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddRosterPlayerModal } from '../AddRosterPlayerModal';

describe('AddRosterPlayerModal', () => {
  let defaultProps;
  let mockOnClose;
  let mockOnPlayerAdded;
  let mockGetAvailableJerseyNumbers;
  let mockGetTeamMembers;

  beforeEach(() => {
    mockOnClose = jest.fn();
    mockOnPlayerAdded = jest.fn().mockResolvedValue();
    mockGetAvailableJerseyNumbers = jest.fn().mockResolvedValue([1, 2, 3, 4, 5]);
    mockGetTeamMembers = jest.fn().mockResolvedValue([
      { id: 'tu-1', role: 'admin', user: { id: 'user-1', name: 'Coach Anna' } },
      { id: 'tu-2', role: 'coach', user: { id: 'user-2', name: 'Coach Bob' } },
      { id: 'tu-3', role: 'parent', user: { id: 'user-3', name: 'Parent Carl' } }
    ]);

    defaultProps = {
      team: { id: 'team-1', name: 'Test Team' },
      onClose: mockOnClose,
      onPlayerAdded: mockOnPlayerAdded,
      getAvailableJerseyNumbers: mockGetAvailableJerseyNumbers,
      getTeamMembers: mockGetTeamMembers
    };

    jest.clearAllMocks();
  });

  it('renders the modal with form fields', async () => {
    render(<AddRosterPlayerModal {...defaultProps} />);

    expect(screen.getByRole('heading', { name: 'Add Player' })).toBeInTheDocument();
    expect(screen.getByText('First Name *')).toBeInTheDocument();
    expect(screen.getByText('Display Name *')).toBeInTheDocument();
    expect(screen.getByText('Jersey Number')).toBeInTheDocument();
  });

  it('renders related to dropdown with coaches and admins only', async () => {
    render(<AddRosterPlayerModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Related To')).toBeInTheDocument();
    });

    // Should show admin and coach, not parent
    const relatedToSelect = screen.getByDisplayValue('No relation');
    expect(relatedToSelect).toBeInTheDocument();

    const options = relatedToSelect.querySelectorAll('option');
    const optionTexts = Array.from(options).map(o => o.textContent);
    expect(optionTexts).toContain('Coach Anna (admin)');
    expect(optionTexts).toContain('Coach Bob (coach)');
    expect(optionTexts).not.toContain('Parent Carl (parent)');
  });

  it('does not render related to dropdown when no team members', async () => {
    mockGetTeamMembers.mockResolvedValue([]);
    render(<AddRosterPlayerModal {...defaultProps} />);

    await waitFor(() => {
      expect(mockGetTeamMembers).toHaveBeenCalledWith('team-1');
    });

    expect(screen.queryByText('Related To')).not.toBeInTheDocument();
  });

  it('does not render related to dropdown when only parents exist', async () => {
    mockGetTeamMembers.mockResolvedValue([
      { id: 'tu-3', role: 'parent', user: { id: 'user-3', name: 'Parent Carl' } }
    ]);
    render(<AddRosterPlayerModal {...defaultProps} />);

    await waitFor(() => {
      expect(mockGetTeamMembers).toHaveBeenCalledWith('team-1');
    });

    expect(screen.queryByText('Related To')).not.toBeInTheDocument();
  });

  it('includes related_to in submission data when selected', async () => {
    render(<AddRosterPlayerModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Related To')).toBeInTheDocument();
    });

    // Fill required fields
    fireEvent.change(screen.getByPlaceholderText('Enter first name'), { target: { value: 'Test' } });
    fireEvent.change(screen.getByPlaceholderText('Enter display name'), { target: { value: 'Test' } });

    // Select related_to
    const relatedToSelect = screen.getByDisplayValue('No relation');
    fireEvent.change(relatedToSelect, { target: { value: 'user-1' } });

    // Submit using the button role
    const submitButton = screen.getByRole('button', { name: 'Add Player' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnPlayerAdded).toHaveBeenCalledWith(
        expect.objectContaining({
          first_name: 'Test',
          display_name: 'Test',
          related_to: 'user-1'
        })
      );
    });
  });

  it('submits null for related_to when not selected', async () => {
    render(<AddRosterPlayerModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Related To')).toBeInTheDocument();
    });

    // Fill required fields only
    fireEvent.change(screen.getByPlaceholderText('Enter first name'), { target: { value: 'Test' } });
    fireEvent.change(screen.getByPlaceholderText('Enter display name'), { target: { value: 'Test' } });

    // Submit without selecting related_to
    const submitButton = screen.getByRole('button', { name: 'Add Player' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnPlayerAdded).toHaveBeenCalledWith(
        expect.objectContaining({
          related_to: null
        })
      );
    });
  });

  it('resets related_to on form reset after successful add', async () => {
    render(<AddRosterPlayerModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Related To')).toBeInTheDocument();
    });

    // Fill required fields
    fireEvent.change(screen.getByPlaceholderText('Enter first name'), { target: { value: 'Test' } });
    fireEvent.change(screen.getByPlaceholderText('Enter display name'), { target: { value: 'Test' } });

    // Select related_to
    const relatedToSelect = screen.getByDisplayValue('No relation');
    fireEvent.change(relatedToSelect, { target: { value: 'user-1' } });

    // Submit
    const submitButton = screen.getByRole('button', { name: 'Add Player' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnPlayerAdded).toHaveBeenCalled();
    });

    // After success, form should reset - related_to should be back to empty
    await waitFor(() => {
      const selects = screen.getAllByDisplayValue('No relation');
      expect(selects.length).toBeGreaterThan(0);
    });
  });
});
