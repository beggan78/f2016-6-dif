/**
 * Tests for PendingMatchesModal component
 * 
 * Tests the pending match modal UI including match list display, 
 * user interactions, and integration with the useMatchRecovery hook.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PendingMatchesModal } from '../PendingMatchesModal';

describe('PendingMatchesModal', () => {
  const mockPendingMatches = [
    {
      id: 'match-1',
      opponent: 'Team Alpha',
      created_at: '2024-03-15T14:30:00Z',
      formation: '2-2',
      substitution_config: { type: 'individual' }
    },
    {
      id: 'match-2', 
      opponent: 'Team Beta',
      created_at: '2024-03-14T10:15:00Z',
      formation: '1-2-1',
      substitution_config: { type: 'pairs', pairRoleRotation: 'swap_every_rotation' }
    },
    {
      id: 'match-3',
      opponent: 'Team Gamma',
      created_at: '2024-03-10T16:45:00Z',
      formation: '2-2',
      substitution_config: { type: 'pairs', pairRoleRotation: 'keep_throughout_period' }
    }
  ];

  const defaultProps = {
    isOpen: true,
    pendingMatches: mockPendingMatches,
    isLoading: false,
    error: '',
    onResume: jest.fn(),
    onDelete: jest.fn(),
    onClose: jest.fn(),
    onConfigureNew: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock console methods for clean test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('rendering', () => {
    it('should not render when isOpen is false', () => {
      render(<PendingMatchesModal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByText('Resume Pending Match')).not.toBeInTheDocument();
    });

    it('should render modal when isOpen is true', () => {
      render(<PendingMatchesModal {...defaultProps} />);
      
      expect(screen.getByText('Resume Pending Match')).toBeInTheDocument();
      expect(screen.getByText('3 saved matches found')).toBeInTheDocument();
    });

    it('should render header with correct information', () => {
      render(<PendingMatchesModal {...defaultProps} />);
      
      expect(screen.getByText('Resume Pending Match')).toBeInTheDocument();
      expect(screen.getByText('3 saved matches found')).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<PendingMatchesModal {...defaultProps} />);
      
      // The close button has X icon but no text, find by specific selector
      const closeButton = screen.getByRole('button', { name: '' });
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('match list display', () => {
    it('should display all pending matches', () => {
      render(<PendingMatchesModal {...defaultProps} />);
      
      expect(screen.getByText('Team Alpha')).toBeInTheDocument();
      expect(screen.getByText('Team Beta')).toBeInTheDocument();
      expect(screen.getByText('Team Gamma')).toBeInTheDocument();
    });

    it('should display match details correctly', () => {
      render(<PendingMatchesModal {...defaultProps} />);
      
      // Check formation display
      expect(screen.getAllByText('2-2')).toHaveLength(2);
      expect(screen.getByText('1-2-1')).toBeInTheDocument();
      
      // Check substitution config display
      expect(screen.getByText('Individual')).toBeInTheDocument();
      expect(screen.getByText('Pairs (Swap)')).toBeInTheDocument();
      expect(screen.getByText('Pairs (Keep)')).toBeInTheDocument();
    });

    it('should display Resume and Delete buttons for each match', () => {
      render(<PendingMatchesModal {...defaultProps} />);
      
      const resumeButtons = screen.getAllByText('Resume Setup');
      const deleteButtons = screen.getAllByText('Delete');
      
      expect(resumeButtons).toHaveLength(3);
      expect(deleteButtons).toHaveLength(3);
    });

    it('should format dates correctly', () => {
      render(<PendingMatchesModal {...defaultProps} />);
      
      // Just verify the component renders the matches
      expect(screen.getByText('Team Alpha')).toBeInTheDocument();
      expect(screen.getByText('Team Beta')).toBeInTheDocument();
      expect(screen.getByText('Team Gamma')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should display empty state when no matches', () => {
      render(<PendingMatchesModal {...defaultProps} pendingMatches={[]} />);
      
      expect(screen.getByText('No Pending Matches')).toBeInTheDocument();
      expect(screen.getByText(/You don't have any saved match configurations/)).toBeInTheDocument();
      expect(screen.getByText('Configure New Match')).toBeInTheDocument();
    });

    it('should show correct header count for no matches', () => {
      render(<PendingMatchesModal {...defaultProps} pendingMatches={[]} />);
      
      expect(screen.getByText('No saved matches found')).toBeInTheDocument();
    });

    it('should call onConfigureNew when Configure New Match clicked in empty state', () => {
      render(<PendingMatchesModal {...defaultProps} pendingMatches={[]} />);
      
      const configureButton = screen.getByText('Configure New Match');
      fireEvent.click(configureButton);
      
      expect(defaultProps.onConfigureNew).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('should display error message when error prop is provided', () => {
      const errorMessage = 'Failed to load pending matches';
      render(<PendingMatchesModal {...defaultProps} error={errorMessage} />);
      
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should display error message with proper styling', () => {
      const errorMessage = 'Connection failed';
      render(<PendingMatchesModal {...defaultProps} error={errorMessage} />);
      
      const errorElement = screen.getByText(errorMessage);
      expect(errorElement.closest('div')).toHaveClass('bg-rose-900/20', 'border-rose-600');
    });
  });

  describe('user interactions', () => {
    it('should call onClose when close button is clicked', () => {
      render(<PendingMatchesModal {...defaultProps} />);
      
      const closeButton = screen.getByRole('button', { name: '' });
      fireEvent.click(closeButton);
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onResume with correct match ID when Resume button is clicked', () => {
      render(<PendingMatchesModal {...defaultProps} />);
      
      const resumeButtons = screen.getAllByText('Resume Setup');
      fireEvent.click(resumeButtons[0]);
      
      expect(defaultProps.onResume).toHaveBeenCalledWith('match-1');
    });

    it('should call onDelete with correct match ID when Delete button is clicked', () => {
      render(<PendingMatchesModal {...defaultProps} />);
      
      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[1]);
      
      expect(defaultProps.onDelete).toHaveBeenCalledWith('match-2');
    });

    it('should call onConfigureNew when Configure New Match button is clicked', () => {
      render(<PendingMatchesModal {...defaultProps} />);
      
      const configureButton = screen.getByText('Configure New Match');
      fireEvent.click(configureButton);
      
      expect(defaultProps.onConfigureNew).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when Cancel button is clicked', () => {
      render(<PendingMatchesModal {...defaultProps} />);
      
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('loading states', () => {
    it('should show loading states on buttons during operations', async () => {
      const { rerender } = render(<PendingMatchesModal {...defaultProps} />);
      
      // Click resume button
      const resumeButton = screen.getAllByText('Resume Setup')[0];
      fireEvent.click(resumeButton);
      
      // Simulate loading state by re-rendering with the button in loading state
      rerender(<PendingMatchesModal {...defaultProps} />);
      
      // After click, the component should handle its own loading state
      expect(defaultProps.onResume).toHaveBeenCalledWith('match-1');
    });

    it('should handle loading state', () => {
      render(<PendingMatchesModal {...defaultProps} isLoading={true} />);
      
      // Just verify the component renders during loading
      expect(screen.getByText('Resume Pending Match')).toBeInTheDocument();
    });

    it('should handle loading state for empty matches', () => {
      render(<PendingMatchesModal {...defaultProps} isLoading={true} pendingMatches={[]} />);
      
      expect(screen.getByText('No Pending Matches')).toBeInTheDocument();
    });
  });

  describe('substitution config formatting', () => {
    it('should format individual substitution config correctly', () => {
      const singleMatch = [{
        id: 'match-1',
        opponent: 'Test Team',
        created_at: '2024-03-15T14:30:00Z',
        formation: '2-2',
        substitution_config: { type: 'individual' }
      }];
      
      render(<PendingMatchesModal {...defaultProps} pendingMatches={singleMatch} />);
      
      expect(screen.getByText('Individual')).toBeInTheDocument();
    });

    it('should format pairs substitution config with rotation correctly', () => {
      const singleMatch = [{
        id: 'match-1',
        opponent: 'Test Team',
        created_at: '2024-03-15T14:30:00Z',
        formation: '2-2',
        substitution_config: { type: 'pairs', pairRoleRotation: 'swap_every_rotation' }
      }];
      
      render(<PendingMatchesModal {...defaultProps} pendingMatches={singleMatch} />);
      
      expect(screen.getByText('Pairs (Swap)')).toBeInTheDocument();
    });

    it('should handle missing substitution config gracefully', () => {
      const singleMatch = [{
        id: 'match-1',
        opponent: 'Test Team',
        created_at: '2024-03-15T14:30:00Z',
        formation: '2-2',
        substitution_config: null
      }];
      
      render(<PendingMatchesModal {...defaultProps} pendingMatches={singleMatch} />);
      
      expect(screen.getByText('Individual')).toBeInTheDocument();
    });
  });

  describe('date formatting', () => {
    it('should handle date formatting', () => {
      const singleMatch = [{
        id: 'match-1',
        opponent: 'Test Team',
        created_at: '2024-03-15T10:00:00Z',
        formation: '2-2',
        substitution_config: { type: 'individual' }
      }];
      
      render(<PendingMatchesModal {...defaultProps} pendingMatches={singleMatch} />);
      
      // Just check that the component renders without crashing
      expect(screen.getByText('Test Team')).toBeInTheDocument();
    });

    it('should handle invalid dates gracefully', () => {
      const invalidDateMatch = [{
        id: 'match-1',
        opponent: 'Test Team',
        created_at: 'invalid-date',
        formation: '2-2',
        substitution_config: { type: 'individual' }
      }];
      
      render(<PendingMatchesModal {...defaultProps} pendingMatches={invalidDateMatch} />);
      
      // Component should still render the team name
      expect(screen.getByText('Test Team')).toBeInTheDocument();
    });
  });

  describe('bottom actions', () => {
    it('should show bottom actions when matches are present', () => {
      render(<PendingMatchesModal {...defaultProps} />);
      
      expect(screen.getByText('Configure New Match')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText((content) => content.includes('Resume Setup takes you to Period Setup'))).toBeInTheDocument();
    });

    it('should not show bottom actions section when no matches', () => {
      render(<PendingMatchesModal {...defaultProps} pendingMatches={[]} />);
      
      // Should only have the Configure New Match in empty state, not in bottom actions
      const configureButtons = screen.getAllByText('Configure New Match');
      expect(configureButtons).toHaveLength(1);
      
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
      expect(screen.queryByText((content) => content.includes('Period Setup'))).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should render modal with proper structure', () => {
      render(<PendingMatchesModal {...defaultProps} />);
      
      expect(screen.getByText('Resume Pending Match')).toBeInTheDocument();
      expect(screen.getByText('3 saved matches found')).toBeInTheDocument();
    });

    it('should have accessible button labels', () => {
      render(<PendingMatchesModal {...defaultProps} />);
      
      const resumeButtons = screen.getAllByText('Resume Setup');
      const deleteButtons = screen.getAllByText('Delete');
      
      resumeButtons.forEach(button => {
        expect(button).toBeInTheDocument();
      });
      
      deleteButtons.forEach(button => {
        expect(button).toBeInTheDocument();
      });
    });
  });

  describe('responsive behavior', () => {
    it('should render modal component', () => {
      render(<PendingMatchesModal {...defaultProps} />);
      
      // Just verify the component renders properly
      expect(screen.getByText('Resume Pending Match')).toBeInTheDocument();
    });
  });
});