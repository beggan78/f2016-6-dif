/**
 * Tests for GoalScorerModal component
 * Verifies goal scorer selection behavior and state persistence
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import GoalScorerModal from '../GoalScorerModal';

// Mock the playerUtils functions
jest.mock('../../../utils/playerUtils', () => ({
  getPlayerName: (players, playerId) => {
    const player = players.find(p => p.id === playerId);
    return player ? player.name : 'Unknown Player';
  }
}));

// Mock the playerSortingUtils functions
jest.mock('../../../utils/playerSortingUtils', () => ({
  getPlayerPositionDisplay: (player) => {
    return player.position || 'Unknown Position';
  },
  isPlayerOnField: (player) => {
    return player.status === 'on_field';
  },
  getPlayerCurrentRole: (player) => {
    // Mock implementation that returns a role based on position
    if (player.position && player.position.includes('Attacker')) {
      return 'attacker';
    } else if (player.position && player.position.includes('Defender')) {
      return 'defender';
    } else if (player.position && player.position.includes('Goalie')) {
      return 'goalie';
    } else {
      return 'substitute';
    }
  }
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  X: ({ className }) => <div data-testid="x-icon" className={className} />,
  Users: ({ className }) => <div data-testid="users-icon" className={className} />,
  Trophy: ({ className }) => <div data-testid="trophy-icon" className={className} />,
  Sword: ({ className }) => <div data-testid="sword-icon" className={className} />,
  Shield: ({ className }) => <div data-testid="shield-icon" className={className} />,
  Goal: ({ className }) => <div data-testid="goal-icon" className={className} />,
  RotateCcw: ({ className }) => <div data-testid="rotate-ccw-icon" className={className} />,
  ArrowDownUp: ({ className }) => <div data-testid="arrow-down-up-icon" className={className} />,
  Hand: ({ className }) => <div data-testid="hand-icon" className={className} />
}));

describe('GoalScorerModal', () => {
  const mockPlayers = [
    { id: '1', name: 'Player 1', position: 'Left Attacker', status: 'on_field' },
    { id: '2', name: 'Player 2', position: 'Right Defender', status: 'on_field' },
    { id: '3', name: 'Player 3', position: 'Substitute', status: 'substitute' }
  ];

  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSelectScorer: jest.fn(),
    onCorrectGoal: jest.fn(),
    eligiblePlayers: mockPlayers,
    mode: 'new',
    existingGoalData: null,
    matchTime: '15:30',
    goalType: 'scored'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear console logs
    console.log = jest.fn();
  });

  describe('Rendering', () => {
    it('should render modal when isOpen is true', () => {
      render(<GoalScorerModal {...defaultProps} />);
      
      expect(screen.getByText('Who Scored?')).toBeInTheDocument();
      expect(screen.getByText('Scored goal at 15:30')).toBeInTheDocument();
    });

    it('should not render modal when isOpen is false', () => {
      render(<GoalScorerModal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByText('Who Scored?')).not.toBeInTheDocument();
    });

    it('should render all eligible players as options', () => {
      render(<GoalScorerModal {...defaultProps} />);
      
      expect(screen.getByText('Player 1')).toBeInTheDocument();
      expect(screen.getByText('Player 2')).toBeInTheDocument();
      expect(screen.getByText('Player 3')).toBeInTheDocument();
    });

    it('should render "No specific scorer" option for new goals', () => {
      render(<GoalScorerModal {...defaultProps} mode="new" />);
      
      expect(screen.getByText('No specific scorer')).toBeInTheDocument();
    });

    it('should not render "No specific scorer" option for corrections', () => {
      render(<GoalScorerModal {...defaultProps} mode="correct" />);
      
      expect(screen.queryByText('No specific scorer')).not.toBeInTheDocument();
    });
  });

  describe('Player Selection', () => {
    it('should start with no selection for new goals', () => {
      render(<GoalScorerModal {...defaultProps} mode="new" />);
      
      // "No specific scorer" should be selected by default
      const noScorerButton = screen.getByText('No specific scorer').closest('button');
      expect(noScorerButton).toHaveClass('bg-slate-500');
    });

    it('should allow selecting a player', () => {
      render(<GoalScorerModal {...defaultProps} />);
      
      const player1Button = screen.getByText('Player 1').closest('button');
      fireEvent.click(player1Button);
      
      expect(player1Button).toHaveClass('bg-sky-500');
    });

    it('should allow selecting "No specific scorer"', () => {
      render(<GoalScorerModal {...defaultProps} mode="new" />);
      
      // First select a player
      const player1Button = screen.getByText('Player 1').closest('button');
      fireEvent.click(player1Button);
      
      // Then select "No specific scorer"
      const noScorerButton = screen.getByText('No specific scorer').closest('button');
      fireEvent.click(noScorerButton);
      
      expect(noScorerButton).toHaveClass('bg-slate-500');
    });

    it('should persist selection when eligiblePlayers prop changes', () => {
      const { rerender } = render(<GoalScorerModal {...defaultProps} />);
      
      // Select a player
      const player1Button = screen.getByText('Player 1').closest('button');
      fireEvent.click(player1Button);
      
      // Change eligiblePlayers prop (simulate re-render)
      const newPlayers = [...mockPlayers, { id: '4', name: 'Player 4', position: 'Goalie', status: 'on_field' }];
      rerender(<GoalScorerModal {...defaultProps} eligiblePlayers={newPlayers} />);
      
      // Selection should persist
      const updatedPlayer1Button = screen.getByText('Player 1').closest('button');
      expect(updatedPlayer1Button).toHaveClass('bg-sky-500');
    });
  });

  describe('Modal Actions', () => {
    it('should call onSelectScorer when confirming new goal', () => {
      render(<GoalScorerModal {...defaultProps} mode="new" />);
      
      // Select a player
      const player1Button = screen.getByText('Player 1').closest('button');
      fireEvent.click(player1Button);
      
      // Click confirm
      const confirmButton = screen.getByText('Confirm Scorer');
      fireEvent.click(confirmButton);
      
      expect(defaultProps.onSelectScorer).toHaveBeenCalledWith('1');
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should call onCorrectGoal when correcting existing goal', () => {
      const existingGoalData = { eventId: 'goal-123', scorerId: '2' };
      render(<GoalScorerModal {...defaultProps} mode="correct" existingGoalData={existingGoalData} />);
      
      // Select a different player
      const player1Button = screen.getByText('Player 1').closest('button');
      fireEvent.click(player1Button);
      
      // Click update
      const updateButton = screen.getByText('Update Scorer');
      fireEvent.click(updateButton);
      
      expect(defaultProps.onCorrectGoal).toHaveBeenCalledWith('goal-123', '1');
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should call onClose when canceling', () => {
      render(<GoalScorerModal {...defaultProps} />);
      
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Different Modes', () => {
    it('should show correct title and action for new mode', () => {
      render(<GoalScorerModal {...defaultProps} mode="new" />);
      
      expect(screen.getByText('Who Scored?')).toBeInTheDocument();
      expect(screen.getByText('Confirm Scorer')).toBeInTheDocument();
    });

    it('should show correct title and action for correct mode', () => {
      render(<GoalScorerModal {...defaultProps} mode="correct" />);
      
      expect(screen.getByText('Correct Goal Scorer')).toBeInTheDocument();
      expect(screen.getByText('Update Scorer')).toBeInTheDocument();
    });

    it('should show correct title and action for view mode', () => {
      render(<GoalScorerModal {...defaultProps} mode="view" />);
      
      expect(screen.getByText('Goal Information')).toBeInTheDocument();
      // In view mode, there's no primary action button, only Cancel
      expect(screen.queryByText('Close')).not.toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should start with existing scorer selected in correct mode', () => {
      const existingGoalData = { eventId: 'goal-123', scorerId: '2' };
      render(<GoalScorerModal {...defaultProps} mode="correct" existingGoalData={existingGoalData} />);
      
      // Find the player selection button (not the one in the current scorer display)
      const player2Buttons = screen.getAllByText('Player 2');
      const player2Button = player2Buttons.find(el => el.closest('button[class*="transition-colors"]'));
      expect(player2Button.closest('button')).toHaveClass('bg-sky-500');
    });
  });

  describe('State Management', () => {
    it('should reset selection when modal opens', () => {
      const { rerender } = render(<GoalScorerModal {...defaultProps} isOpen={false} />);
      
      // Open modal
      rerender(<GoalScorerModal {...defaultProps} isOpen={true} mode="new" />);
      
      // Should start with no selection for new mode
      const noScorerButton = screen.getByText('No specific scorer').closest('button');
      expect(noScorerButton).toHaveClass('bg-slate-500');
    });

    it('should not reset selection when only eligiblePlayers changes', () => {
      const { rerender } = render(<GoalScorerModal {...defaultProps} />);
      
      // Select a player
      const player1Button = screen.getByText('Player 1').closest('button');
      fireEvent.click(player1Button);
      
      expect(player1Button).toHaveClass('bg-sky-500');
      
      // Change only eligiblePlayers
      const newPlayers = [...mockPlayers];
      rerender(<GoalScorerModal {...defaultProps} eligiblePlayers={newPlayers} />);
      
      // Selection should persist
      const updatedPlayer1Button = screen.getByText('Player 1').closest('button');
      expect(updatedPlayer1Button).toHaveClass('bg-sky-500');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty eligiblePlayers array', () => {
      render(<GoalScorerModal {...defaultProps} eligiblePlayers={[]} />);
      
      expect(screen.getByText('Who Scored?')).toBeInTheDocument();
      expect(screen.getByText('No specific scorer')).toBeInTheDocument();
    });

    it('should handle undefined existingGoalData', () => {
      render(<GoalScorerModal {...defaultProps} mode="correct" existingGoalData={undefined} />);
      
      expect(screen.getByText('Correct Goal Scorer')).toBeInTheDocument();
    });

    it('should handle null scorerId in existingGoalData', () => {
      const existingGoalData = { eventId: 'goal-123', scorerId: null };
      render(<GoalScorerModal {...defaultProps} mode="correct" existingGoalData={existingGoalData} />);
      
      // Should not have any player selected
      const allPlayerButtons = screen.getAllByRole('button').filter(btn => 
        btn.textContent.includes('Player')
      );
      allPlayerButtons.forEach(button => {
        expect(button).not.toHaveClass('bg-sky-500');
      });
    });
  });
});