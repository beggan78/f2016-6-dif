import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TacticalBoardScreen } from '../TacticalBoardScreen';

// Mock the TacticalBoard component
jest.mock('../TacticalBoard', () => ({
  TacticalBoard: ({ pitchMode, placedChips, onChipPlace, onChipMove, onChipDelete }) => (
    <div data-testid="tactical-board">
      <div data-testid="pitch-mode">{pitchMode}</div>
      <div data-testid="placed-chips-count">{placedChips.length}</div>
      <button 
        data-testid="mock-place-chip" 
        onClick={() => onChipPlace({ id: 'test-chip', type: 'player', color: 'red', number: 1, x: 50, y: 50 })}
      >
        Place Chip
      </button>
      <button 
        data-testid="mock-move-chip" 
        onClick={() => onChipMove('test-chip', { x: 60, y: 60 })}
      >
        Move Chip
      </button>
      <button 
        data-testid="mock-delete-chip" 
        onClick={() => onChipDelete('test-chip')}
      >
        Delete Chip
      </button>
    </div>
  )
}));

describe('TacticalBoardScreen', () => {
  let defaultProps;
  let mockHandlers;

  beforeEach(() => {
    mockHandlers = {
      onNavigateBack: jest.fn(),
      pushModalState: jest.fn(),
      removeModalFromStack: jest.fn()
    };

    defaultProps = {
      ...mockHandlers
    };

    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render tactical board screen with essential elements', () => {
      render(<TacticalBoardScreen {...defaultProps} />);
      
      expect(screen.getByText('Back')).toBeInTheDocument();
      expect(screen.getByText('Full Pitch')).toBeInTheDocument();
      expect(screen.getByText('Half Pitch')).toBeInTheDocument();
      expect(screen.getByTestId('tactical-board')).toBeInTheDocument();
    });

    it('should render pitch mode toggle buttons', () => {
      render(<TacticalBoardScreen {...defaultProps} />);
      
      expect(screen.getByText('Full Pitch')).toBeInTheDocument();
      expect(screen.getByText('Half Pitch')).toBeInTheDocument();
    });

    it('should default to half pitch mode', () => {
      render(<TacticalBoardScreen {...defaultProps} />);
      
      expect(screen.getByTestId('pitch-mode')).toHaveTextContent('half');
      expect(screen.getByText('Half Pitch')).toHaveClass('bg-sky-600');
    });

    it('should start with no placed chips', () => {
      render(<TacticalBoardScreen {...defaultProps} />);
      
      expect(screen.getByTestId('placed-chips-count')).toHaveTextContent('0');
    });
  });

  describe('User Interactions', () => {
    it('should handle back button click', () => {
      render(<TacticalBoardScreen {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Back'));
      
      expect(mockHandlers.onNavigateBack).toHaveBeenCalledTimes(1);
    });

    it('should switch to half pitch mode when clicked', () => {
      render(<TacticalBoardScreen {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Half Pitch'));
      
      expect(screen.getByTestId('pitch-mode')).toHaveTextContent('half');
      expect(screen.getByText('Half Pitch')).toHaveClass('bg-sky-600');
      expect(screen.getByText('Full Pitch')).not.toHaveClass('bg-sky-600');
    });

    it('should switch to full pitch mode when clicked', () => {
      render(<TacticalBoardScreen {...defaultProps} />);
      
      // Default is half, switch to full
      fireEvent.click(screen.getByText('Full Pitch'));
      expect(screen.getByTestId('pitch-mode')).toHaveTextContent('full');
      expect(screen.getByText('Full Pitch')).toHaveClass('bg-sky-600');
      
      // Switch back to half
      fireEvent.click(screen.getByText('Half Pitch'));
      expect(screen.getByTestId('pitch-mode')).toHaveTextContent('half');
      expect(screen.getByText('Half Pitch')).toHaveClass('bg-sky-600');
    });

    it('should clear chips when switching pitch modes', () => {
      render(<TacticalBoardScreen {...defaultProps} />);
      
      // Place a chip
      fireEvent.click(screen.getByTestId('mock-place-chip'));
      expect(screen.getByTestId('placed-chips-count')).toHaveTextContent('1');
      
      // Switch pitch mode (from default half to full)
      fireEvent.click(screen.getByText('Full Pitch'));
      
      // Chips should be cleared
      expect(screen.getByTestId('placed-chips-count')).toHaveTextContent('0');
    });
  });

  describe('Chip Management', () => {
    it('should handle chip placement', () => {
      render(<TacticalBoardScreen {...defaultProps} />);
      
      fireEvent.click(screen.getByTestId('mock-place-chip'));
      
      expect(screen.getByTestId('placed-chips-count')).toHaveTextContent('1');
    });

    it('should handle chip movement', () => {
      render(<TacticalBoardScreen {...defaultProps} />);
      
      // Place a chip first
      fireEvent.click(screen.getByTestId('mock-place-chip'));
      expect(screen.getByTestId('placed-chips-count')).toHaveTextContent('1');
      
      // Move the chip (should still have 1 chip)
      fireEvent.click(screen.getByTestId('mock-move-chip'));
      expect(screen.getByTestId('placed-chips-count')).toHaveTextContent('1');
    });

    it('should handle chip deletion', () => {
      render(<TacticalBoardScreen {...defaultProps} />);
      
      // Place a chip first
      fireEvent.click(screen.getByTestId('mock-place-chip'));
      expect(screen.getByTestId('placed-chips-count')).toHaveTextContent('1');
      
      // Delete the chip
      fireEvent.click(screen.getByTestId('mock-delete-chip'));
      expect(screen.getByTestId('placed-chips-count')).toHaveTextContent('0');
    });
  });

  describe('Props and State', () => {
    it('should pass correct props to TacticalBoard', () => {
      render(<TacticalBoardScreen {...defaultProps} />);
      
      const tacticalBoard = screen.getByTestId('tactical-board');
      expect(tacticalBoard).toBeInTheDocument();
      
      // Verify initial state is passed correctly
      expect(screen.getByTestId('pitch-mode')).toHaveTextContent('half');
      expect(screen.getByTestId('placed-chips-count')).toHaveTextContent('0');
    });

    it('should handle multiple chip operations', () => {
      render(<TacticalBoardScreen {...defaultProps} />);
      
      // Place multiple chips
      fireEvent.click(screen.getByTestId('mock-place-chip'));
      fireEvent.click(screen.getByTestId('mock-place-chip'));
      fireEvent.click(screen.getByTestId('mock-place-chip'));
      
      expect(screen.getByTestId('placed-chips-count')).toHaveTextContent('3');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing navigation props gracefully', () => {
      const propsWithoutHandlers = {
        onNavigateBack: undefined,
        pushModalState: mockHandlers.pushModalState,
        removeModalFromStack: mockHandlers.removeModalFromStack
      };
      
      expect(() => {
        render(<TacticalBoardScreen {...propsWithoutHandlers} />);
      }).not.toThrow();
    });

    it('should handle rapid pitch mode switching', () => {
      render(<TacticalBoardScreen {...defaultProps} />);
      
      // Rapidly switch modes (starting from default half)
      fireEvent.click(screen.getByText('Full Pitch'));
      fireEvent.click(screen.getByText('Half Pitch'));
      fireEvent.click(screen.getByText('Full Pitch'));
      fireEvent.click(screen.getByText('Half Pitch'));
      
      expect(screen.getByTestId('pitch-mode')).toHaveTextContent('half');
      expect(screen.getByText('Half Pitch')).toHaveClass('bg-sky-600');
    });
  });
});