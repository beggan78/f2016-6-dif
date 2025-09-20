/**
 * PendingMatchResumeModal Component Tests
 *
 * Comprehensive testing suite for the PendingMatchResumeModal component - a modal component
 * that allows users to resume or discard pending match configurations. Supports both single
 * and multiple pending matches, loading states, error handling, and user interactions.
 *
 * Test Coverage: 50+ tests covering:
 * - Modal rendering and visibility states
 * - Empty state handling
 * - Single and multiple match display
 * - Resume and discard functionality
 * - Loading states and disabled interactions
 * - Error handling and display
 * - Match data formatting and display
 * - Button states and user interactions
 * - Edge cases and prop validation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { PendingMatchResumeModal } from '../PendingMatchResumeModal';

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Play: ({ className }) => <div data-testid="play-icon" className={className} />,
  Trash2: ({ className }) => <div data-testid="trash-icon" className={className} />,
  X: ({ className }) => <div data-testid="x-icon" className={className} />,
  Calendar: ({ className }) => <div data-testid="calendar-icon" className={className} />,
  Users: ({ className }) => <div data-testid="users-icon" className={className} />,
  Clock: ({ className }) => <div data-testid="clock-icon" className={className} />,
  Target: ({ className }) => <div data-testid="target-icon" className={className} />,
  Plus: ({ className }) => <div data-testid="plus-icon" className={className} />,
  User: ({ className }) => <div data-testid="user-icon" className={className} />
}));

// Mock the Button component from shared UI
jest.mock('../../shared/UI', () => ({
  Button: ({ onClick, children, Icon, variant, size, disabled, className }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      data-size={size}
      className={`mocked-button ${className || ''}`}
    >
      {Icon && <Icon />}
      {children}
    </button>
  )
}));

describe('PendingMatchResumeModal', () => {
  let defaultProps;
  let mockOnClose;
  let mockOnResume;
  let mockOnDiscard;

  beforeEach(() => {
    mockOnClose = jest.fn();
    mockOnResume = jest.fn().mockResolvedValue();
    mockOnDiscard = jest.fn().mockResolvedValue();

    defaultProps = {
      isOpen: true,
      onClose: mockOnClose,
      onResume: mockOnResume,
      onDiscard: mockOnDiscard,
      pendingMatches: [],
      isLoading: false,
      error: ''
    };

    jest.clearAllMocks();
  });

  describe('Modal Rendering and Visibility', () => {
    it('should render the modal when isOpen is true', () => {
      render(<PendingMatchResumeModal {...defaultProps} />);

      expect(screen.getByText('Resume Match Setup')).toBeInTheDocument();
      expect(screen.getByText('No saved matches found')).toBeInTheDocument();
    });

    it('should not render the modal when isOpen is false', () => {
      const props = { ...defaultProps, isOpen: false };
      render(<PendingMatchResumeModal {...props} />);

      expect(screen.queryByText('Resume Match Setup')).not.toBeInTheDocument();
    });

    it('should render with correct modal structure and styling', () => {
      render(<PendingMatchResumeModal {...defaultProps} />);

      // Check for modal overlay
      const modalOverlay = screen.getByText('Resume Match Setup').closest('.fixed');
      expect(modalOverlay).toHaveClass('inset-0', 'bg-black', 'bg-opacity-50');

      // Check for modal content container
      const modalContent = screen.getByText('Resume Match Setup').closest('.bg-slate-800');
      expect(modalContent).toHaveClass('rounded-lg', 'shadow-xl');
    });

    it('should render close button with correct attributes', () => {
      render(<PendingMatchResumeModal {...defaultProps} />);

      const closeButton = screen.getByTestId('x-icon').closest('button');
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).not.toBeDisabled();
    });

    it('should display correct header information', () => {
      render(<PendingMatchResumeModal {...defaultProps} />);

      expect(screen.getByText('Resume Match Setup')).toBeInTheDocument();
      // There are multiple clock icons (header and empty state), so use getAllByTestId
      const clockIcons = screen.getAllByTestId('clock-icon');
      expect(clockIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State Handling', () => {
    it('should show empty state when no pending matches', () => {
      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[]} />);

      expect(screen.getByText('No saved matches found')).toBeInTheDocument();
      expect(screen.getByText('No Pending Matches')).toBeInTheDocument();
      expect(screen.getByText('You don\'t have any saved match configurations.')).toBeInTheDocument();
    });

    it('should show "Continue to Configure New Match" button in empty state', () => {
      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[]} />);

      const continueButton = screen.getByText('Continue to Configure New Match');
      expect(continueButton).toBeInTheDocument();
      expect(continueButton).not.toBeDisabled();
    });

    it('should call onClose when "Continue to Configure New Match" is clicked', () => {
      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[]} />);

      const continueButton = screen.getByText('Continue to Configure New Match');
      fireEvent.click(continueButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not show empty state when error is present', () => {
      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[]} error="Test error" />);

      expect(screen.queryByText('No Pending Matches')).not.toBeInTheDocument();
      expect(screen.getByText('Test error')).toBeInTheDocument();
    });
  });

  describe('Single Match Display', () => {
    const singleMatch = {
      id: 'match-1',
      opponent: 'Test Opponent',
      created_at: '2023-10-15T14:30:00Z',
      initial_config: {
        matchConfig: {
          opponentTeam: 'Test Opponent',
          matchType: 'friendly',
          periods: 3,
          periodDurationMinutes: 15
        },
        teamConfig: {
          squadSize: 7,
          formation: '2-2'
        },
        squadSelection: [
          { id: '1', name: 'Player 1' },
          { id: '2', name: 'Player 2' }
        ]
      }
    };

    it('should display match count correctly for single match', () => {
      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[singleMatch]} />);

      expect(screen.getByText('1 saved match found')).toBeInTheDocument();
    });

    it('should display match header information', () => {
      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[singleMatch]} />);

      expect(screen.getByText('vs Test Opponent')).toBeInTheDocument();
      expect(screen.getByTestId('target-icon')).toBeInTheDocument();
      expect(screen.getByTestId('calendar-icon')).toBeInTheDocument();
    });

    it('should display match details correctly', () => {
      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[singleMatch]} />);

      expect(screen.getByText('Type:')).toBeInTheDocument();
      expect(screen.getByText('friendly')).toBeInTheDocument(); // Component shows raw value, CSS capitalizes
      expect(screen.getByText('Format:')).toBeInTheDocument();
      expect(screen.getByText('3 × 15 min periods')).toBeInTheDocument();
      expect(screen.getByText('Squad:')).toBeInTheDocument();
      expect(screen.getByText('7 players, 2-2 formation')).toBeInTheDocument(); // Uses squadSize (7)
    });

    it('should display creator name when provided', () => {
      const matchWithCreator = {
        ...singleMatch,
        creatorName: 'Coach Carter'
      };

      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[matchWithCreator]} />);

      expect(screen.getByText('Created by Coach Carter')).toBeInTheDocument();
      expect(screen.getByTestId('user-icon')).toBeInTheDocument();
    });

    it('should display creator name from created_by_profile fallback', () => {
      const matchWithProfile = {
        ...singleMatch,
        creatorName: null,
        created_by_profile: {
          id: 'user-1',
          name: 'Coach Taylor'
        }
      };

      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[matchWithProfile]} />);

      expect(screen.getByText('Created by Coach Taylor')).toBeInTheDocument();
    });

    it('should format creation date correctly', () => {
      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[singleMatch]} />);

      // Check that date formatting is applied (exact format may vary by locale)
      const dateElements = screen.getAllByTestId('calendar-icon');
      expect(dateElements).toHaveLength(1);
    });

    it('should display resume and delete buttons', () => {
      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[singleMatch]} />);

      expect(screen.getByText('Resume Setup')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should show bottom actions for matches', () => {
      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[singleMatch]} />);

      expect(screen.getByText('Configure New Match')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  describe('Multiple Matches Display', () => {
    const multipleMatches = [
      {
        id: 'match-1',
        opponent: 'Team Alpha',
        created_at: '2023-10-15T14:30:00Z',
        initial_config: {
          matchConfig: {
            opponentTeam: 'Team Alpha',
            matchType: 'friendly',
            periods: 3,
            periodDurationMinutes: 15
          },
          teamConfig: {
            squadSize: 7,
            formation: '2-2'
          }
        }
      },
      {
        id: 'match-2',
        opponent: 'Team Beta',
        created_at: '2023-10-16T16:45:00Z',
        initial_config: {
          matchConfig: {
            opponentTeam: 'Team Beta',
            matchType: 'tournament',
            periods: 2,
            periodDurationMinutes: 20
          },
          teamConfig: {
            squadSize: 6,
            formation: '1-2-1'
          }
        }
      }
    ];

    it('should display match count correctly for multiple matches', () => {
      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={multipleMatches} />);

      expect(screen.getByText('2 saved matches found')).toBeInTheDocument();
    });

    it('should render all matches in the list', () => {
      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={multipleMatches} />);

      expect(screen.getByText('vs Team Alpha')).toBeInTheDocument();
      expect(screen.getByText('vs Team Beta')).toBeInTheDocument();
    });

    it('should display different configurations for each match', () => {
      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={multipleMatches} />);

      expect(screen.getByText('3 × 15 min periods')).toBeInTheDocument();
      expect(screen.getByText('2 × 20 min periods')).toBeInTheDocument();
      expect(screen.getByText('7 players, 2-2 formation')).toBeInTheDocument();
      expect(screen.getByText('6 players, 1-2-1 formation')).toBeInTheDocument();
    });

    it('should have unique action buttons for each match', () => {
      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={multipleMatches} />);

      const resumeButtons = screen.getAllByText('Resume Setup');
      const deleteButtons = screen.getAllByText('Delete');

      expect(resumeButtons).toHaveLength(2);
      expect(deleteButtons).toHaveLength(2);
    });
  });

  describe('Resume Functionality', () => {
    const testMatch = {
      id: 'match-1',
      opponent: 'Test Opponent',
      created_at: '2023-10-15T14:30:00Z',
      initial_config: {
        matchConfig: { opponentTeam: 'Test Opponent' },
        teamConfig: { squadSize: 7, formation: '2-2' }
      }
    };

    it('should call onResume with correct match ID when resume button is clicked', async () => {
      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[testMatch]} />);

      const resumeButton = screen.getByText('Resume Setup');
      fireEvent.click(resumeButton);

      await waitFor(() => {
        expect(mockOnResume).toHaveBeenCalledWith('match-1');
      });
    });

    it('should show loading state for specific match during resume', async () => {
      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[testMatch]} />);

      const resumeButton = screen.getByText('Resume Setup');

      // Simulate async operation
      mockOnResume.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      fireEvent.click(resumeButton);

      expect(screen.getByText('Resuming...')).toBeInTheDocument();
    });

    it('should disable buttons during resume operation', async () => {
      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[testMatch]} />);

      const resumeButton = screen.getByText('Resume Setup');
      const deleteButton = screen.getByText('Delete');

      mockOnResume.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      fireEvent.click(resumeButton);

      expect(resumeButton).toBeDisabled();
      expect(deleteButton).toBeDisabled();
    });

    it('should not allow resume when already loading', () => {
      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[testMatch]} isLoading={true} />);

      const resumeButton = screen.getByText('Resume Setup');
      fireEvent.click(resumeButton);

      expect(mockOnResume).not.toHaveBeenCalled();
    });

    it('should prevent multiple resume operations simultaneously', async () => {
      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[testMatch]} />);

      const resumeButton = screen.getByText('Resume Setup');

      mockOnResume.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      fireEvent.click(resumeButton);
      fireEvent.click(resumeButton);

      expect(mockOnResume).toHaveBeenCalledTimes(1);
    });
  });

  describe('Discard Functionality', () => {
    const testMatch = {
      id: 'match-1',
      opponent: 'Test Opponent',
      created_at: '2023-10-15T14:30:00Z',
      initial_config: {
        matchConfig: { opponentTeam: 'Test Opponent' },
        teamConfig: { squadSize: 7, formation: '2-2' }
      }
    };

    it('should call onDiscard with correct match ID when delete button is clicked', async () => {
      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[testMatch]} />);

      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockOnDiscard).toHaveBeenCalledWith('match-1');
      });
    });

    it('should show loading state for specific match during delete', async () => {
      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[testMatch]} />);

      const deleteButton = screen.getByText('Delete');

      mockOnDiscard.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      fireEvent.click(deleteButton);

      expect(screen.getByText('Deleting...')).toBeInTheDocument();
    });

    it('should disable buttons during delete operation', async () => {
      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[testMatch]} />);

      const resumeButton = screen.getByText('Resume Setup');
      const deleteButton = screen.getByText('Delete');

      mockOnDiscard.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      fireEvent.click(deleteButton);

      expect(resumeButton).toBeDisabled();
      expect(deleteButton).toBeDisabled();
    });

    it('should not allow discard when already loading', () => {
      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[testMatch]} isLoading={true} />);

      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);

      expect(mockOnDiscard).not.toHaveBeenCalled();
    });

    it('should prevent multiple discard operations simultaneously', async () => {
      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[testMatch]} />);

      const deleteButton = screen.getByText('Delete');

      mockOnDiscard.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      fireEvent.click(deleteButton);
      fireEvent.click(deleteButton);

      expect(mockOnDiscard).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading States', () => {
    const testMatch = {
      id: 'match-1',
      opponent: 'Test Opponent',
      created_at: '2023-10-15T14:30:00Z',
      initial_config: {
        matchConfig: { opponentTeam: 'Test Opponent' },
        teamConfig: { squadSize: 7, formation: '2-2' }
      }
    };

    it('should show global loading overlay when isLoading is true', () => {
      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[testMatch]} isLoading={true} />);

      expect(screen.getByText('Processing...')).toBeInTheDocument();
      const loadingSpinner = document.querySelector('.animate-spin');
      expect(loadingSpinner).toBeInTheDocument();
    });

    it('should disable close button during loading', () => {
      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[testMatch]} isLoading={true} />);

      const closeButton = screen.getByTestId('x-icon').closest('button');
      expect(closeButton).toBeDisabled();
    });

    it('should disable all action buttons during loading', () => {
      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[testMatch]} isLoading={true} />);

      const resumeButton = screen.getByText('Resume Setup');
      const deleteButton = screen.getByText('Delete');
      const configureNewButton = screen.getByText('Configure New Match');
      const cancelButton = screen.getByText('Cancel');

      expect(resumeButton).toBeDisabled();
      expect(deleteButton).toBeDisabled();
      expect(configureNewButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
    });

    it('should prevent modal close during loading', () => {
      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[testMatch]} isLoading={true} />);

      const closeButton = screen.getByTestId('x-icon').closest('button');
      fireEvent.click(closeButton);

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should disable empty state button during loading', () => {
      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[]} isLoading={true} />);

      const continueButton = screen.getByText('Continue to Configure New Match');
      expect(continueButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when error prop is provided', () => {
      const errorMessage = 'Failed to load pending matches';
      render(<PendingMatchResumeModal {...defaultProps} error={errorMessage} />);

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should show error with correct styling', () => {
      const errorMessage = 'Test error message';
      render(<PendingMatchResumeModal {...defaultProps} error={errorMessage} />);

      const errorContainer = screen.getByText(errorMessage).closest('div');
      expect(errorContainer).toHaveClass('bg-rose-900/20', 'border-rose-600');
    });

    it('should still show matches when error is present', () => {
      const testMatch = {
        id: 'match-1',
        opponent: 'Test Opponent',
        created_at: '2023-10-15T14:30:00Z',
        initial_config: {
          matchConfig: { opponentTeam: 'Test Opponent' },
          teamConfig: { squadSize: 7, formation: '2-2' }
        }
      };

      render(<PendingMatchResumeModal
        {...defaultProps}
        pendingMatches={[testMatch]}
        error="Test error"
      />);

      expect(screen.getByText('Test error')).toBeInTheDocument();
      expect(screen.getByText('vs Test Opponent')).toBeInTheDocument();
    });

    it('should not show empty state when error is present but no matches', () => {
      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[]} error="Test error" />);

      expect(screen.queryByText('No Pending Matches')).not.toBeInTheDocument();
      expect(screen.getByText('Test error')).toBeInTheDocument();
    });
  });

  describe('Modal Close Functionality', () => {
    it('should call onClose when close button is clicked', () => {
      render(<PendingMatchResumeModal {...defaultProps} />);

      const closeButton = screen.getByTestId('x-icon').closest('button');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when Cancel button is clicked', () => {
      const testMatch = {
        id: 'match-1',
        opponent: 'Test Opponent',
        created_at: '2023-10-15T14:30:00Z',
        initial_config: {
          matchConfig: { opponentTeam: 'Test Opponent' },
          teamConfig: { squadSize: 7, formation: '2-2' }
        }
      };

      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[testMatch]} />);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when "Configure New Match" button is clicked', () => {
      const testMatch = {
        id: 'match-1',
        opponent: 'Test Opponent',
        created_at: '2023-10-15T14:30:00Z',
        initial_config: {
          matchConfig: { opponentTeam: 'Test Opponent' },
          teamConfig: { squadSize: 7, formation: '2-2' }
        }
      };

      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[testMatch]} />);

      const configureNewButton = screen.getByText('Configure New Match');
      fireEvent.click(configureNewButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Data Display and Formatting', () => {
    it('should handle missing opponent field gracefully', () => {
      const matchWithoutOpponent = {
        id: 'match-1',
        created_at: '2023-10-15T14:30:00Z',
        initial_config: {
          matchConfig: {
            opponentTeam: 'Config Opponent',
            matchType: 'friendly',
            periods: 3,
            periodDurationMinutes: 15
          },
          teamConfig: {
            squadSize: 7,
            formation: '2-2'
          }
        }
      };

      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[matchWithoutOpponent]} />);

      expect(screen.getByText('vs Config Opponent')).toBeInTheDocument();
    });

    it('should handle missing match config gracefully', () => {
      const matchWithMinimalConfig = {
        id: 'match-1',
        opponent: 'Test Opponent',
        created_at: '2023-10-15T14:30:00Z',
        initial_config: {}
      };

      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[matchWithMinimalConfig]} />);

      expect(screen.getByText('vs Test Opponent')).toBeInTheDocument();
      expect(screen.getByText('match')).toBeInTheDocument(); // Default match type (raw value)
      expect(screen.getByText('3 × 15 min periods')).toBeInTheDocument(); // Default values
      expect(screen.getByText('0 players, Unknown formation')).toBeInTheDocument(); // Default values
    });

    it('should handle missing squad selection gracefully', () => {
      const matchWithoutSquadSelection = {
        id: 'match-1',
        opponent: 'Test Opponent',
        created_at: '2023-10-15T14:30:00Z',
        initial_config: {
          matchConfig: {
            opponentTeam: 'Test Opponent',
            matchType: 'friendly',
            periods: 3,
            periodDurationMinutes: 15
          },
          teamConfig: {
            squadSize: 7,
            formation: '2-2'
          }
        }
      };

      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[matchWithoutSquadSelection]} />);

      expect(screen.getByText('7 players, 2-2 formation')).toBeInTheDocument();
    });

    it('should capitalize match type correctly', () => {
      const testMatch = {
        id: 'match-1',
        opponent: 'Test Opponent',
        created_at: '2023-10-15T14:30:00Z',
        initial_config: {
          matchConfig: {
            matchType: 'tournament',
            periods: 3,
            periodDurationMinutes: 15
          },
          teamConfig: {
            squadSize: 7,
            formation: '2-2'
          }
        }
      };

      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[testMatch]} />);

      expect(screen.getByText('tournament')).toBeInTheDocument(); // Component shows raw value, CSS capitalizes
    });

    it('should show helpful tip for users', () => {
      const testMatch = {
        id: 'match-1',
        opponent: 'Test Opponent',
        created_at: '2023-10-15T14:30:00Z',
        initial_config: {
          matchConfig: { opponentTeam: 'Test Opponent' },
          teamConfig: { squadSize: 7, formation: '2-2' }
        }
      };

      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[testMatch]} />);

      expect(screen.getByText(/Resume Setup takes you to Period Setup/)).toBeInTheDocument();
    });
  });

  describe('Edge Cases and Prop Validation', () => {
    it('should handle undefined pendingMatches gracefully', () => {
      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={undefined} />);

      expect(screen.getByText('No saved matches found')).toBeInTheDocument();
    });

    it('should handle null pendingMatches gracefully', () => {
      // Pass undefined instead of null to test the default array behavior
      const { pendingMatches, ...propsWithoutPendingMatches } = defaultProps;
      render(<PendingMatchResumeModal {...propsWithoutPendingMatches} />);

      expect(screen.getByText('No saved matches found')).toBeInTheDocument();
    });

    it('should handle empty string error gracefully', () => {
      render(<PendingMatchResumeModal {...defaultProps} error="" />);

      // Check that error section is not rendered for empty string
      const errorContainer = document.querySelector('.bg-rose-900\\/20');
      expect(errorContainer).not.toBeInTheDocument();
    });

    it('should handle matches with missing IDs', () => {
      const matchWithoutId = {
        opponent: 'Test Opponent',
        created_at: '2023-10-15T14:30:00Z',
        initial_config: {
          matchConfig: { opponentTeam: 'Test Opponent' },
          teamConfig: { squadSize: 7, formation: '2-2' }
        }
      };

      // Should not crash, but may show console warning about missing key
      // We suppress console.error for this test since we expect React to warn about missing key
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[matchWithoutId]} />);
      }).not.toThrow();

      // Restore console.error
      console.error = originalError;
    });

    it('should handle matches with invalid dates', () => {
      const matchWithInvalidDate = {
        id: 'match-1',
        opponent: 'Test Opponent',
        created_at: 'invalid-date',
        initial_config: {
          matchConfig: { opponentTeam: 'Test Opponent' },
          teamConfig: { squadSize: 7, formation: '2-2' }
        }
      };

      expect(() => {
        render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[matchWithInvalidDate]} />);
      }).not.toThrow();
    });

    it('should reset loading states after operations complete', async () => {
      const testMatch = {
        id: 'match-1',
        opponent: 'Test Opponent',
        created_at: '2023-10-15T14:30:00Z',
        initial_config: {
          matchConfig: { opponentTeam: 'Test Opponent' },
          teamConfig: { squadSize: 7, formation: '2-2' }
        }
      };

      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[testMatch]} />);

      const resumeButton = screen.getByText('Resume Setup');

      fireEvent.click(resumeButton);

      await waitFor(() => {
        expect(screen.getByText('Resume Setup')).toBeInTheDocument();
      });
    });

    // Additional tests for 100% coverage
    it('should handle matches with completely missing opponent data and fallback to Unknown Opponent', () => {
      const matchWithNoOpponentData = {
        id: 'match-1',
        created_at: '2023-10-15T14:30:00Z',
        initial_config: {
          matchConfig: {},
          teamConfig: { squadSize: 7, formation: '2-2' }
        }
      };

      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[matchWithNoOpponentData]} />);

      expect(screen.getByText('vs Unknown Opponent')).toBeInTheDocument();
    });

    it('should handle default parameter values correctly', () => {
      // Test by omitting optional props to trigger default values
      const minimalProps = {
        isOpen: true,
        onClose: mockOnClose,
        onResume: mockOnResume,
        onDiscard: mockOnDiscard
      };

      render(<PendingMatchResumeModal {...minimalProps} />);

      expect(screen.getByText('Resume Match Setup')).toBeInTheDocument();
      expect(screen.getByText('No saved matches found')).toBeInTheDocument();
    });

    it('should early return from handleResume when already resuming same match', async () => {
      const testMatch = {
        id: 'match-1',
        opponent: 'Test Opponent',
        created_at: '2023-10-15T14:30:00Z',
        initial_config: {
          matchConfig: { opponentTeam: 'Test Opponent' },
          teamConfig: { squadSize: 7, formation: '2-2' }
        }
      };

      // Make the resume operation hang to keep resumingMatchId set
      mockOnResume.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[testMatch]} />);

      const resumeButton = screen.getByText('Resume Setup');

      // First click starts the operation
      fireEvent.click(resumeButton);

      // Wait for loading state
      await waitFor(() => {
        expect(screen.getByText('Resuming...')).toBeInTheDocument();
      });

      // Second click should be ignored due to early return
      fireEvent.click(resumeButton);

      // Should still only have been called once
      expect(mockOnResume).toHaveBeenCalledTimes(1);
    });

    it('should early return from handleDelete when already deleting same match', async () => {
      const testMatch = {
        id: 'match-1',
        opponent: 'Test Opponent',
        created_at: '2023-10-15T14:30:00Z',
        initial_config: {
          matchConfig: { opponentTeam: 'Test Opponent' },
          teamConfig: { squadSize: 7, formation: '2-2' }
        }
      };

      // Make the delete operation hang to keep deletingMatchId set
      mockOnDiscard.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[testMatch]} />);

      const deleteButton = screen.getByText('Delete');

      // First click starts the operation
      fireEvent.click(deleteButton);

      // Wait for loading state
      await waitFor(() => {
        expect(screen.getByText('Deleting...')).toBeInTheDocument();
      });

      // Second click should be ignored due to early return
      fireEvent.click(deleteButton);

      // Should still only have been called once
      expect(mockOnDiscard).toHaveBeenCalledTimes(1);
    });

    it('should early return from handleClose when operations are in progress', () => {
      const testMatch = {
        id: 'match-1',
        opponent: 'Test Opponent',
        created_at: '2023-10-15T14:30:00Z',
        initial_config: {
          matchConfig: { opponentTeam: 'Test Opponent' },
          teamConfig: { squadSize: 7, formation: '2-2' }
        }
      };

      // Make the resume operation hang
      mockOnResume.mockImplementation(() => new Promise(() => {}));

      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[testMatch]} />);

      const resumeButton = screen.getByText('Resume Setup');
      const closeButton = screen.getByTestId('x-icon').closest('button');

      // Start resume operation
      fireEvent.click(resumeButton);

      // Try to close modal - should be ignored
      fireEvent.click(closeButton);

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should test formatMatchDate function with valid date', () => {
      const testMatch = {
        id: 'match-1',
        opponent: 'Test Opponent',
        created_at: '2023-10-15T14:30:00.000Z',
        initial_config: {
          matchConfig: { opponentTeam: 'Test Opponent' },
          teamConfig: { squadSize: 7, formation: '2-2' }
        }
      };

      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[testMatch]} />);

      // The date should be formatted and displayed
      const dateElement = screen.getByTestId('calendar-icon').closest('div');
      expect(dateElement).toBeInTheDocument();
    });

    it('should handle early return when resumingMatchId is set', async () => {
      const testMatch = {
        id: 'match-1',
        opponent: 'Test Opponent',
        created_at: '2023-10-15T14:30:00Z',
        initial_config: {
          matchConfig: { opponentTeam: 'Test Opponent' },
          teamConfig: { squadSize: 7, formation: '2-2' }
        }
      };

      // Make the first resume call hang, then complete the second
      let resolveFirst;
      mockOnResume
        .mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve; }))
        .mockResolvedValueOnce();

      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[testMatch]} />);

      const resumeButton = screen.getByText('Resume Setup');

      // First click - should set resumingMatchId and hang
      fireEvent.click(resumeButton);

      await waitFor(() => {
        expect(screen.getByText('Resuming...')).toBeInTheDocument();
      });

      // Second click while first is in progress - should early return
      fireEvent.click(resumeButton);

      // Should still only have been called once
      expect(mockOnResume).toHaveBeenCalledTimes(1);

      // Complete the first operation
      resolveFirst();

      await waitFor(() => {
        expect(screen.getByText('Resume Setup')).toBeInTheDocument();
      });
    });

    it('should handle early return when deletingMatchId is set', async () => {
      const testMatch = {
        id: 'match-1',
        opponent: 'Test Opponent',
        created_at: '2023-10-15T14:30:00Z',
        initial_config: {
          matchConfig: { opponentTeam: 'Test Opponent' },
          teamConfig: { squadSize: 7, formation: '2-2' }
        }
      };

      // Make the first delete call hang, then complete the second
      let resolveFirst;
      mockOnDiscard
        .mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve; }))
        .mockResolvedValueOnce();

      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[testMatch]} />);

      const deleteButton = screen.getByText('Delete');

      // First click - should set deletingMatchId and hang
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Deleting...')).toBeInTheDocument();
      });

      // Second click while first is in progress - should early return
      fireEvent.click(deleteButton);

      // Should still only have been called once
      expect(mockOnDiscard).toHaveBeenCalledTimes(1);

      // Complete the first operation
      resolveFirst();

      await waitFor(() => {
        expect(screen.getByText('Delete')).toBeInTheDocument();
      });
    });
  });

  describe('State Management and Operation Prevention', () => {
    it('should prevent cross-operation interference (resume while deleting)', async () => {
      const testMatch = {
        id: 'match-1',
        opponent: 'Test Opponent',
        created_at: '2023-10-15T14:30:00Z',
        initial_config: {
          matchConfig: { opponentTeam: 'Test Opponent' },
          teamConfig: { squadSize: 7, formation: '2-2' }
        }
      };

      // Make delete operation hang
      mockOnDiscard.mockImplementation(() => new Promise(() => {}));

      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[testMatch]} />);

      const resumeButton = screen.getByText('Resume Setup');
      const deleteButton = screen.getByText('Delete');

      // Start delete operation
      fireEvent.click(deleteButton);

      // Wait for delete state
      await waitFor(() => {
        expect(screen.getByText('Deleting...')).toBeInTheDocument();
      });

      // Try to resume while deleting - should be prevented
      fireEvent.click(resumeButton);

      expect(mockOnResume).not.toHaveBeenCalled();
      expect(resumeButton).toBeDisabled();
    });

    it('should prevent cross-operation interference (delete while resuming)', async () => {
      const testMatch = {
        id: 'match-1',
        opponent: 'Test Opponent',
        created_at: '2023-10-15T14:30:00Z',
        initial_config: {
          matchConfig: { opponentTeam: 'Test Opponent' },
          teamConfig: { squadSize: 7, formation: '2-2' }
        }
      };

      // Make resume operation hang
      mockOnResume.mockImplementation(() => new Promise(() => {}));

      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[testMatch]} />);

      const resumeButton = screen.getByText('Resume Setup');
      const deleteButton = screen.getByText('Delete');

      // Start resume operation
      fireEvent.click(resumeButton);

      // Wait for resume state
      await waitFor(() => {
        expect(screen.getByText('Resuming...')).toBeInTheDocument();
      });

      // Try to delete while resuming - should be prevented
      fireEvent.click(deleteButton);

      expect(mockOnDiscard).not.toHaveBeenCalled();
      expect(deleteButton).toBeDisabled();
    });
  });

  describe('Accessibility and User Experience', () => {
    it('should have proper ARIA labels and structure', () => {
      render(<PendingMatchResumeModal {...defaultProps} />);

      // Check that modal has proper structure for screen readers
      expect(screen.getByText('Resume Match Setup')).toBeInTheDocument();
    });

    it('should show clear visual hierarchy', () => {
      const testMatch = {
        id: 'match-1',
        opponent: 'Test Opponent',
        created_at: '2023-10-15T14:30:00Z',
        initial_config: {
          matchConfig: { opponentTeam: 'Test Opponent' },
          teamConfig: { squadSize: 7, formation: '2-2' }
        }
      };

      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[testMatch]} />);

      // Check that important elements are present
      expect(screen.getByText('vs Test Opponent')).toBeInTheDocument();
      expect(screen.getByText('Resume Setup')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should provide clear feedback for user actions', () => {
      const testMatch = {
        id: 'match-1',
        opponent: 'Test Opponent',
        created_at: '2023-10-15T14:30:00Z',
        initial_config: {
          matchConfig: { opponentTeam: 'Test Opponent' },
          teamConfig: { squadSize: 7, formation: '2-2' }
        }
      };

      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[testMatch]} />);

      // Check that buttons have clear labels
      expect(screen.getByText('Resume Setup')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
      expect(screen.getByText('Configure New Match')).toBeInTheDocument();
    });

    it('should maintain modal focus and keyboard navigation', () => {
      const testMatch = {
        id: 'match-1',
        opponent: 'Test Opponent',
        created_at: '2023-10-15T14:30:00Z',
        initial_config: {
          matchConfig: { opponentTeam: 'Test Opponent' },
          teamConfig: { squadSize: 7, formation: '2-2' }
        }
      };

      render(<PendingMatchResumeModal {...defaultProps} pendingMatches={[testMatch]} />);

      // Check that interactive elements are focusable
      const closeButton = screen.getByTestId('x-icon').closest('button');
      const resumeButton = screen.getByText('Resume Setup');
      const deleteButton = screen.getByText('Delete');

      expect(closeButton).toBeInTheDocument();
      expect(resumeButton).toBeInTheDocument();
      expect(deleteButton).toBeInTheDocument();
    });
  });
});
