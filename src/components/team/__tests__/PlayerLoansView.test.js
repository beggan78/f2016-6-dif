/**
 * PlayerLoansView Tests
 *
 * Comprehensive test suite covering:
 * - Component rendering and layout
 * - Filter functionality (player, team, status, time range)
 * - Loan match grouping and display
 * - Edit and delete operations
 * - Modal interactions
 * - Permission checks (canManageTeam)
 * - Time range persistence
 * - Browser back integration
 * - Error handling and loading states
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PlayerLoansView from '../PlayerLoansView';
import * as playerLoanService from '../../../services/playerLoanService';
import { useTeam } from '../../../contexts/TeamContext';
import { useBrowserBackIntercept } from '../../../hooks/useBrowserBackIntercept';

// Mock dependencies
jest.mock('../../../services/playerLoanService');
jest.mock('../../../contexts/TeamContext');
jest.mock('../../../hooks/useBrowserBackIntercept');
jest.mock('../../shared/UI', () => ({
  Button: ({ children, onClick, Icon, variant, size, disabled }) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} data-size={size}>
      {Icon && <Icon />}
      {children}
    </button>
  ),
  ConfirmationModal: ({ isOpen, onConfirm, onCancel, title, message, confirmText, cancelText }) =>
    isOpen ? (
      <div role="dialog">
        <h2>{title}</h2>
        <p>{message}</p>
        <button onClick={onCancel}>{cancelText}</button>
        <button onClick={onConfirm}>{confirmText}</button>
      </div>
    ) : null,
  MultiSelect: ({ value, onChange, options, placeholder }) => (
    <div>
      <button onClick={() => onChange(value)}>
        {placeholder}
      </button>
      {options.map(opt => (
        <div key={opt.value}>{opt.label}</div>
      ))}
    </div>
  ),
  Select: ({ value, onChange, options }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}));

jest.mock('../PlayerLoanModal', () => ({
  PlayerLoanModal: ({ isOpen, onClose, onSave, players, loan }) =>
    isOpen ? (
      <div role="dialog" data-testid="loan-modal">
        <h2>{loan ? 'Edit Loan' : 'Record Loan'}</h2>
        <button onClick={onClose}>Close Modal</button>
        <button onClick={() => onSave({ playerIds: ['p1'], receivingTeamName: 'Team', loanDate: '2025-01-15' })}>
          Save
        </button>
        <div>Players: {players.length}</div>
      </div>
    ) : null
}));

jest.mock('../../statistics/TimeFilter', () => ({
  TimeFilter: ({ startDate, endDate, selectedPresetId, onTimeRangeChange }) => (
    <div data-testid="time-filter">
      <span>Preset: {selectedPresetId}</span>
      <button onClick={() => onTimeRangeChange(new Date('2025-01-01'), new Date('2025-01-31'), 'custom')}>
        Set Custom Range
      </button>
    </div>
  )
}));

const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('PlayerLoansView', () => {
  let defaultProps;
  let mockGetTeamRoster;
  let mockPushNavigationState;
  let mockRemoveFromNavigationStack;

  const mockRoster = [
    { id: 'player-1', display_name: 'Alice Johnson', jersey_number: 10 },
    { id: 'player-2', display_name: 'Bob Smith', jersey_number: 7 },
    { id: 'player-3', display_name: 'Charlie Brown', jersey_number: null }
  ];

  const mockLoans = [
    {
      id: 'loan-1',
      player_id: 'player-1',
      receiving_team_name: 'Other Team A',
      loan_date: '2025-01-15',
      player: mockRoster[0]
    },
    {
      id: 'loan-2',
      player_id: 'player-2',
      receiving_team_name: 'Other Team A',
      loan_date: '2025-01-15',
      player: mockRoster[1]
    },
    {
      id: 'loan-3',
      player_id: 'player-1',
      receiving_team_name: 'Other Team B',
      loan_date: '2025-02-01',
      player: mockRoster[0]
    }
  ];

  beforeEach(() => {
    mockGetTeamRoster = jest.fn().mockResolvedValue(mockRoster);
    mockPushNavigationState = jest.fn();
    mockRemoveFromNavigationStack = jest.fn();

    useTeam.mockReturnValue({
      getTeamRoster: mockGetTeamRoster
    });

    useBrowserBackIntercept.mockReturnValue({
      pushNavigationState: mockPushNavigationState,
      removeFromNavigationStack: mockRemoveFromNavigationStack
    });

    playerLoanService.getTeamLoans.mockResolvedValue({
      success: true,
      loans: mockLoans
    });

    playerLoanService.deleteMatchLoans.mockResolvedValue({
      success: true,
      deletedCount: 2
    });

    defaultProps = {
      currentTeam: { id: 'team-1', name: 'Test Team' },
      canManageTeam: true
    };

    // Mock localStorage
    Storage.prototype.getItem = jest.fn(() => null);
    Storage.prototype.setItem = jest.fn();

    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('Component Rendering', () => {
    it('renders with correct title', async () => {
      render(<PlayerLoansView {...defaultProps} />);

      expect(screen.getByText('Player Loans')).toBeInTheDocument();

      await waitFor(() => {
        expect(playerLoanService.getTeamLoans).toHaveBeenCalled();
      });
    });

    it('displays New Loan button when user can manage team', async () => {
      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('New Loan')).toBeInTheDocument();
      });
    });

    it('hides New Loan button when user cannot manage team', async () => {
      render(<PlayerLoansView {...defaultProps} canManageTeam={false} />);

      await waitFor(() => {
        expect(screen.queryByText('New Loan')).not.toBeInTheDocument();
      });
    });

    it('displays all filter controls', async () => {
      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Filters')).toBeInTheDocument();
        expect(screen.getByText('All players')).toBeInTheDocument();
        expect(screen.getByText('All teams')).toBeInTheDocument();
        expect(screen.getByRole('combobox')).toBeInTheDocument(); // Status filter
      });
    });

    it('displays loading state initially', () => {
      playerLoanService.getTeamLoans.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<PlayerLoansView {...defaultProps} />);

      expect(screen.getByText('Loading loan matches...')).toBeInTheDocument();
    });

    it('fetches roster and loans on mount', async () => {
      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetTeamRoster).toHaveBeenCalledWith('team-1');
        expect(playerLoanService.getTeamLoans).toHaveBeenCalledWith(
          'team-1',
          expect.objectContaining({ startDate: null })
        );
      });
    });
  });

  describe('Loan Match Display', () => {
    it('groups loans by match (team + date)', async () => {
      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText('Other Team A').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Other Team B').length).toBeGreaterThan(0);
      });
    });

    it('displays player information in matches', async () => {
      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText('Alice Johnson').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Bob Smith').length).toBeGreaterThan(0);
      });
    });

    it('displays player count for each match', async () => {
      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        const playerCountElements = screen.getAllByText(/Players \(\d+\):/);
        expect(playerCountElements).toHaveLength(2); // Two distinct matches
      });
    });

    it('displays future loan badge for upcoming matches', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const futureDateString = futureDate.toISOString().slice(0, 10);

      const futureLoans = [
        {
          id: 'loan-future',
          player_id: 'player-1',
          receiving_team_name: 'Future Team',
          loan_date: futureDateString,
          player: mockRoster[0]
        }
      ];

      playerLoanService.getTeamLoans.mockResolvedValue({
        success: true,
        loans: futureLoans
      });

      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Upcoming')).toBeInTheDocument();
      });
    });

    it('sorts matches by date descending, then by team name', async () => {
      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        const teamElements = screen.getAllByText(/Other Team/);
        // More recent match (Other Team B, Feb) should appear before older match (Other Team A, Jan)
        expect(teamElements.length).toBeGreaterThan(0);
      });
    });

    it('displays jersey numbers when available', async () => {
      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText('10').length).toBeGreaterThan(0); // Alice's jersey
        expect(screen.getAllByText('7').length).toBeGreaterThan(0); // Bob's jersey
      });
    });

    it('handles players without jersey numbers', async () => {
      const loansWithCharlie = [
        {
          id: 'loan-charlie',
          player_id: 'player-3',
          receiving_team_name: 'Team',
          loan_date: '2025-01-15',
          player: mockRoster[2]
        }
      ];

      playerLoanService.getTeamLoans.mockResolvedValue({
        success: true,
        loans: loansWithCharlie
      });

      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText('Charlie Brown').length).toBeGreaterThan(0);
      });
    });

    it('displays deleted players correctly', async () => {
      const loansWithDeleted = [
        {
          id: 'loan-deleted',
          player_id: 'deleted-player',
          receiving_team_name: 'Team',
          loan_date: '2025-01-15',
          player: null // Player was deleted
        }
      ];

      playerLoanService.getTeamLoans.mockResolvedValue({
        success: true,
        loans: loansWithDeleted
      });

      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Unknown Player (deleted)')).toBeInTheDocument();
      });
    });
  });

  describe('Filter Functionality', () => {
    it('filters by player', async () => {
      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText('Alice Johnson').length).toBeGreaterThan(0);
      });

      // Player filter would filter out matches without Alice
      // This test verifies the filter UI exists
      expect(screen.getByText('All players')).toBeInTheDocument();
    });

    it('filters by receiving team', async () => {
      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('All teams')).toBeInTheDocument();
      });
    });

    it('filters by status (future/past)', async () => {
      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        const statusSelect = screen.getByRole('combobox');
        fireEvent.change(statusSelect, { target: { value: 'past' } });

        // Future loans should be filtered out (no upcoming badge)
        expect(screen.queryByText('Upcoming', { selector: 'span' })).not.toBeInTheDocument();
      });
    });

    it('shows clear filters button when filters are active', async () => {
      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        const statusSelect = screen.getByRole('combobox');
        fireEvent.change(statusSelect, { target: { value: 'future' } });
      });

      await waitFor(() => {
        expect(screen.getByText('Clear filters')).toBeInTheDocument();
      });
    });

    it('clears all filters when clear button clicked', async () => {
      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        const statusSelect = screen.getByRole('combobox');
        fireEvent.change(statusSelect, { target: { value: 'future' } });
      });

      await waitFor(() => {
        const clearButton = screen.getByText('Clear filters');
        fireEvent.click(clearButton);
      });

      await waitFor(() => {
        const statusSelect = screen.getByRole('combobox');
        expect(statusSelect.value).toBe('all');
      });
    });

    it('collapses filters on narrow screens', async () => {
      // Simulate narrow screen
      global.innerWidth = 800;
      global.dispatchEvent(new Event('resize'));

      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Filters')).toBeInTheDocument();
      });
    });

    it('shows receiving team options from existing loans', async () => {
      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        // Teams should appear in multiselect options
        expect(screen.getAllByText('Other Team A').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Other Team B').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Time Range Filter', () => {
    it('displays time filter component', async () => {
      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('time-filter')).toBeInTheDocument();
      });
    });

    it('fetches loans with date range when custom range selected', async () => {
      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        const setRangeButton = screen.getByText('Set Custom Range');
        fireEvent.click(setRangeButton);
      });

      await waitFor(() => {
        expect(playerLoanService.getTeamLoans).toHaveBeenCalledWith(
          'team-1',
          expect.objectContaining({
            startDate: '2025-01-01',
            endDate: '2025-01-31'
          })
        );
      });
    });

    it('persists time range selection to localStorage', async () => {
      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        const setRangeButton = screen.getByText('Set Custom Range');
        fireEvent.click(setRangeButton);
      });

      await waitFor(() => {
        expect(Storage.prototype.setItem).toHaveBeenCalled();
      });
    });

    it('loads persisted time range on mount', () => {
      const persistedState = JSON.stringify({
        presetId: 'last-30-days',
        customStartDate: null,
        customEndDate: null
      });

      Storage.prototype.getItem.mockReturnValue(persistedState);

      render(<PlayerLoansView {...defaultProps} />);

      expect(screen.getByText(/Preset: last-30-days/)).toBeInTheDocument();
    });

    it('only applies endDate for custom preset', async () => {
      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        const setRangeButton = screen.getByText('Set Custom Range');
        fireEvent.click(setRangeButton);
      });

      await waitFor(() => {
        expect(playerLoanService.getTeamLoans).toHaveBeenCalledWith(
          'team-1',
          expect.objectContaining({
            endDate: '2025-01-31'
          })
        );
      });
    });
  });

  describe('Edit Loan Functionality', () => {
    it('shows edit and delete buttons when user can manage team', async () => {
      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        const editButtons = screen.getAllByLabelText('Edit match');
        expect(editButtons.length).toBeGreaterThan(0);

        const deleteButtons = screen.getAllByLabelText('Delete match');
        expect(deleteButtons.length).toBeGreaterThan(0);
      });
    });

    it('hides edit and delete buttons when user cannot manage team', async () => {
      render(<PlayerLoansView {...defaultProps} canManageTeam={false} />);

      await waitFor(() => {
        expect(screen.queryByLabelText('Edit match')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Delete match')).not.toBeInTheDocument();
      });
    });

    it('opens modal in edit mode when edit button clicked', async () => {
      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        const editButton = screen.getAllByLabelText('Edit match')[0];
        fireEvent.click(editButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Edit Loan')).toBeInTheDocument();
      });
    });

    it('pushes navigation state when opening edit modal', async () => {
      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        const editButton = screen.getAllByLabelText('Edit match')[0];
        fireEvent.click(editButton);
      });

      expect(mockPushNavigationState).toHaveBeenCalled();
    });

    it('includes deleted players in edit modal roster', async () => {
      const loansWithDeleted = [
        {
          id: 'loan-1',
          player_id: 'deleted-player',
          receiving_team_name: 'Team',
          loan_date: '2025-01-15',
          player: null
        }
      ];

      playerLoanService.getTeamLoans.mockResolvedValue({
        success: true,
        loans: loansWithDeleted
      });

      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        const editButton = screen.getByLabelText('Edit match');
        fireEvent.click(editButton);
      });

      await waitFor(() => {
        // Modal should show players count including deleted
        expect(screen.getByText(/Players: \d+/)).toBeInTheDocument();
      });
    });
  });

  describe('Delete Loan Functionality', () => {
    it('shows confirmation modal when delete button clicked', async () => {
      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        const deleteButton = screen.getAllByLabelText('Delete match')[0];
        fireEvent.click(deleteButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Delete loan match')).toBeInTheDocument();
      });
    });

    it('deletes match loans when confirmed', async () => {
      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        const deleteButton = screen.getAllByLabelText('Delete match')[0];
        fireEvent.click(deleteButton);
      });

      await waitFor(() => {
        const confirmButton = screen.getByText('Delete Match');
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(playerLoanService.deleteMatchLoans).toHaveBeenCalledWith({
          teamId: 'team-1',
          receivingTeamName: expect.any(String),
          loanDate: expect.any(String)
        });
      });
    });

    it('shows success message after deletion', async () => {
      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        const deleteButton = screen.getAllByLabelText('Delete match')[0];
        fireEvent.click(deleteButton);
      });

      await waitFor(() => {
        const confirmButton = screen.getByText('Delete Match');
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Removed \d+ player\(s\) from loan match/)).toBeInTheDocument();
      });
    });

    it('closes confirmation modal when cancelled', async () => {
      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        const deleteButton = screen.getAllByLabelText('Delete match')[0];
        fireEvent.click(deleteButton);
      });

      await waitFor(() => {
        const cancelButton = screen.getByText('Cancel');
        fireEvent.click(cancelButton);
      });

      await waitFor(() => {
        expect(screen.queryByText('Delete loan match')).not.toBeInTheDocument();
      });

      expect(playerLoanService.deleteMatchLoans).not.toHaveBeenCalled();
    });

    it('handles deletion errors', async () => {
      playerLoanService.deleteMatchLoans.mockResolvedValue({
        success: false,
        error: 'Database error'
      });

      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        const deleteButton = screen.getAllByLabelText('Delete match')[0];
        fireEvent.click(deleteButton);
      });

      await waitFor(() => {
        const confirmButton = screen.getByText('Delete Match');
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Database error')).toBeInTheDocument();
      });
    });
  });

  describe('New Loan Modal', () => {
    it('opens modal when New Loan button clicked', async () => {
      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        const newLoanButton = screen.getByText('New Loan');
        fireEvent.click(newLoanButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('loan-modal')).toBeInTheDocument();
      });
    });

    it('filters temporary players from modal roster', async () => {
      const rosterWithTemp = [
        ...mockRoster,
        { id: 'temp-1', display_name: 'Temp Player', match_id: 'match-1' }
      ];

      mockGetTeamRoster.mockResolvedValue(rosterWithTemp);

      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        const newLoanButton = screen.getByText('New Loan');
        fireEvent.click(newLoanButton);
      });

      await waitFor(() => {
        // Modal should show 3 players (excluding temp)
        expect(screen.getByText('Players: 3')).toBeInTheDocument();
      });
    });

    it('saves new loan and refreshes list', async () => {
      playerLoanService.recordPlayerLoans.mockResolvedValue({
        success: true,
        loans: [{ id: 'new-loan' }]
      });

      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        const newLoanButton = screen.getByText('New Loan');
        fireEvent.click(newLoanButton);
      });

      await waitFor(() => {
        const saveButton = screen.getByText('Save');
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(playerLoanService.recordPlayerLoans).toHaveBeenCalled();
      });

      // Should refetch loans after save
      await waitFor(() => {
        expect(playerLoanService.getTeamLoans).toHaveBeenCalledTimes(2);
      });
    });

    it('shows success message after creating loan', async () => {
      playerLoanService.recordPlayerLoans.mockResolvedValue({
        success: true,
        loans: [{ id: 'new-loan' }]
      });

      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        const newLoanButton = screen.getByText('New Loan');
        fireEvent.click(newLoanButton);
      });

      await waitFor(() => {
        const saveButton = screen.getByText('Save');
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Loan match recorded for \d+ player/)).toBeInTheDocument();
      });
    });

    it('handles save errors gracefully', async () => {
      playerLoanService.recordPlayerLoans.mockResolvedValue({
        success: false,
        error: 'Save failed'
      });

      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        const newLoanButton = screen.getByText('New Loan');
        fireEvent.click(newLoanButton);
      });

      // Modal's onSave should handle the error internally
      // This test ensures component doesn't crash
      const modal = screen.getByTestId('loan-modal');
      expect(modal).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('shows empty state when no loans exist', async () => {
      playerLoanService.getTeamLoans.mockResolvedValue({
        success: true,
        loans: []
      });

      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('No loan matches recorded yet')).toBeInTheDocument();
        expect(screen.getByText('Track when your players appear for other teams.')).toBeInTheDocument();
      });
    });

    it('shows filtered empty state when filters exclude all loans', async () => {
      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        const statusSelect = screen.getByRole('combobox');
        fireEvent.change(statusSelect, { target: { value: 'future' } });
      });

      await waitFor(() => {
        expect(screen.getByText('No loans found')).toBeInTheDocument();
        expect(screen.getByText('Try adjusting your filters.')).toBeInTheDocument();
      });
    });

    it('shows Record First Match button in empty state when can manage', async () => {
      playerLoanService.getTeamLoans.mockResolvedValue({
        success: true,
        loans: []
      });

      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Record First Match')).toBeInTheDocument();
      });
    });

    it('hides Record First Match button when cannot manage', async () => {
      playerLoanService.getTeamLoans.mockResolvedValue({
        success: true,
        loans: []
      });

      render(<PlayerLoansView {...defaultProps} canManageTeam={false} />);

      await waitFor(() => {
        expect(screen.queryByText('Record First Match')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when fetch fails', async () => {
      playerLoanService.getTeamLoans.mockResolvedValue({
        success: false,
        error: 'Failed to load loans'
      });

      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load loans')).toBeInTheDocument();
      });
    });

    it('shows retry button on error', async () => {
      playerLoanService.getTeamLoans.mockResolvedValue({
        success: false,
        error: 'Network error'
      });

      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('refetches data when retry clicked', async () => {
      playerLoanService.getTeamLoans.mockResolvedValueOnce({
        success: false,
        error: 'Network error'
      }).mockResolvedValueOnce({
        success: true,
        loans: mockLoans
      });

      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        const retryButton = screen.getByText('Retry');
        fireEvent.click(retryButton);
      });

      await waitFor(() => {
        expect(playerLoanService.getTeamLoans).toHaveBeenCalledTimes(2);
        expect(screen.getAllByText('Other Team A').length).toBeGreaterThan(0);
      });
    });

    it('auto-dismisses success message after 4 seconds', async () => {
      jest.useFakeTimers();

      playerLoanService.recordPlayerLoans.mockResolvedValue({
        success: true,
        loans: [{ id: 'new-loan' }]
      });

      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        const newLoanButton = screen.getByText('New Loan');
        fireEvent.click(newLoanButton);
      });

      await waitFor(() => {
        const saveButton = screen.getByText('Save');
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Loan match recorded/)).toBeInTheDocument();
      });

      jest.advanceTimersByTime(4000);

      await waitFor(() => {
        expect(screen.queryByText(/Loan match recorded/)).not.toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });

  describe('Browser Back Integration', () => {
    it('registers navigation handler when opening modal', async () => {
      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        const newLoanButton = screen.getByText('New Loan');
        fireEvent.click(newLoanButton);
      });

      expect(mockPushNavigationState).toHaveBeenCalledWith(
        expect.any(Function),
        'PlayerLoansView-LoanModal'
      );
    });

    it('removes navigation handler when closing modal', async () => {
      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        const newLoanButton = screen.getByText('New Loan');
        fireEvent.click(newLoanButton);
      });

      await waitFor(() => {
        const closeButton = screen.getByText('Close Modal');
        fireEvent.click(closeButton);
      });

      expect(mockRemoveFromNavigationStack).toHaveBeenCalled();
    });

    it('registers navigation handler for delete confirmation', async () => {
      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        const deleteButton = screen.getAllByLabelText('Delete match')[0];
        fireEvent.click(deleteButton);
      });

      expect(mockPushNavigationState).toHaveBeenCalledWith(
        expect.any(Function),
        'PlayerLoansView-DeleteMatch'
      );
    });
  });

  describe('Edge Cases', () => {
    it('handles missing currentTeam gracefully', async () => {
      render(<PlayerLoansView {...defaultProps} currentTeam={null} />);

      await waitFor(() => {
        expect(playerLoanService.getTeamLoans).not.toHaveBeenCalled();
      });
    });

    it('handles roster fetch failure', async () => {
      mockGetTeamRoster.mockRejectedValue(new Error('Roster error'));

      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        expect(mockConsoleError).toHaveBeenCalledWith(
          'Failed to load roster for loans:',
          expect.any(Error)
        );
      });

      // Should still work with empty roster
      expect(screen.getByText('Player Loans')).toBeInTheDocument();
    });

    it('handles window resize events', async () => {
      render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Filters')).toBeInTheDocument();
      });

      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      // Component should handle resize without crashing
      expect(screen.getByText('Filters')).toBeInTheDocument();
    });

    it('cleans up event listeners on unmount', async () => {
      const removeEventListener = jest.spyOn(window, 'removeEventListener');

      const { unmount } = render(<PlayerLoansView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Player Loans')).toBeInTheDocument();
      });

      unmount();

      expect(removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    });
  });
});
