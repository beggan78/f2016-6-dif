import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TacticalBoardScreen } from '../TacticalBoardScreen';

// Mock the TacticalBoard component
jest.mock('../TacticalBoard', () => ({
  TacticalBoard: ({ 
    pitchMode, 
    placedChips, 
    onChipPlace, 
    onChipMove, 
    onChipDelete,
    interactionMode,
    drawings,
    onAddDrawing
  }) => (
    <div data-testid="tactical-board">
      <div data-testid="pitch-mode">{pitchMode}</div>
      <div data-testid="placed-chips-count">{placedChips.length}</div>
      <div data-testid="interaction-mode">{interactionMode}</div>
      <div data-testid="drawings-count">{drawings.length}</div>
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
      <button
        data-testid="mock-add-drawing"
        onClick={() => onAddDrawing({
          id: `drawing-${Date.now()}`,
          color: '#fbbf24',
          width: 1.5,
          points: [{ x: 10, y: 10 }, { x: 15, y: 15 }]
        })}
      >
        Add Drawing
      </button>
    </div>
  )
}));

// Mock the persistenceManager to ensure clean state for each test
jest.mock('../../../utils/persistenceManager', () => ({
  createPersistenceManager: jest.fn(() => ({
    loadState: jest.fn(() => ({
      pitchMode: 'full',
      interactionMode: 'drag',
      fullModeChips: [],
      halfModeChips: [],
      fullModeDrawings: [],
      halfModeDrawings: [],
      fromView: null
    })),
    saveState: jest.fn()
  }))
}));

describe('TacticalBoardScreen', () => {
  let defaultProps;
  let mockHandlers;

  beforeEach(() => {
    mockHandlers = {
      onNavigateBack: jest.fn(),
      pushNavigationState: jest.fn(),
      removeFromNavigationStack: jest.fn()
    };

    defaultProps = {
      ...mockHandlers
    };

    jest.clearAllMocks();
    
    // Reset the persistence manager mock for each test
    const { createPersistenceManager } = require('../../../utils/persistenceManager');
    createPersistenceManager.mockReturnValue({
      loadState: jest.fn(() => ({
        pitchMode: 'full',
        interactionMode: 'drag',
        fullModeChips: [],
        halfModeChips: [],
        fullModeDrawings: [],
        halfModeDrawings: [],
        fromView: null
      })),
      saveState: jest.fn()
    });
  });

  describe('Component Rendering', () => {
    it('should render tactical board screen with essential elements', () => {
      render(<TacticalBoardScreen {...defaultProps} />);
      
      expect(screen.getByText('Back')).toBeInTheDocument();
      expect(screen.getByText('Full')).toBeInTheDocument();
      expect(screen.getByText('Half')).toBeInTheDocument();
      expect(screen.getByText('Drag')).toBeInTheDocument();
      expect(screen.getByText('Draw')).toBeInTheDocument();
      expect(screen.getByText('Clear All')).toBeInTheDocument();
      expect(screen.getByTestId('tactical-board')).toBeInTheDocument();
    });

    it('should render pitch mode toggle buttons', () => {
      render(<TacticalBoardScreen {...defaultProps} />);
      
      expect(screen.getByText('Full')).toBeInTheDocument();
      expect(screen.getByText('Half')).toBeInTheDocument();
    });

    

    it('should start with no placed chips', () => {
      render(<TacticalBoardScreen {...defaultProps} />);
      
      expect(screen.getByTestId('placed-chips-count')).toHaveTextContent('0');
      expect(screen.getByTestId('drawings-count')).toHaveTextContent('0');
    });
  });

  describe('User Interactions', () => {
    it('should handle back button click', () => {
      render(<TacticalBoardScreen {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Back'));
      
      expect(mockHandlers.onNavigateBack).toHaveBeenCalledTimes(1);
    });

    it('should switch to half pitch mode when clicked', async () => {
      render(<TacticalBoardScreen {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Half'));
      
      await waitFor(() => {
        expect(screen.getByTestId('pitch-mode')).toHaveTextContent('half');
      });
      expect(screen.getByText('Half')).toHaveClass('bg-sky-500');
      expect(screen.getByText('Full')).not.toHaveClass('bg-sky-500');
    });

    it('should switch to full pitch mode when clicked', async () => {
      render(<TacticalBoardScreen {...defaultProps} />);
      
      // Default is full, switch to half
      fireEvent.click(screen.getByText('Half'));
      await waitFor(() => {
        expect(screen.getByTestId('pitch-mode')).toHaveTextContent('half');
      });
      expect(screen.getByText('Half')).toHaveClass('bg-sky-500');
      
      // Switch back to full
      fireEvent.click(screen.getByText('Full'));
      await waitFor(() => {
        expect(screen.getByTestId('pitch-mode')).toHaveTextContent('full');
      });
      expect(screen.getByText('Full')).toHaveClass('bg-sky-500');
    });

    it('should toggle between drag and draw modes', () => {
      render(<TacticalBoardScreen {...defaultProps} />);

      expect(screen.getByTestId('interaction-mode')).toHaveTextContent('drag');
      expect(screen.queryByText('Undo')).not.toBeInTheDocument();

      fireEvent.click(screen.getByText('Draw'));

      expect(screen.getByTestId('interaction-mode')).toHaveTextContent('draw');
      expect(screen.getByText('Undo')).toBeInTheDocument();
      expect(screen.getByText('Clear')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Drag'));

      expect(screen.getByTestId('interaction-mode')).toHaveTextContent('drag');
      expect(screen.queryByText('Undo')).not.toBeInTheDocument();
      expect(screen.getByText('Clear All')).toBeInTheDocument();
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

  describe('Draw Mode Controls', () => {
    it('should add and undo drawings', () => {
      render(<TacticalBoardScreen {...defaultProps} />);

      fireEvent.click(screen.getByText('Draw'));
      expect(screen.getByText('Undo')).toBeDisabled();

      fireEvent.click(screen.getByTestId('mock-add-drawing'));
      expect(screen.getByTestId('drawings-count')).toHaveTextContent('1');
      expect(screen.getByText('Undo')).not.toBeDisabled();

      fireEvent.click(screen.getByText('Undo'));
      expect(screen.getByTestId('drawings-count')).toHaveTextContent('0');
      expect(screen.getByText('Undo')).toBeDisabled();
    });

    it('should clear only drawings when in draw mode', () => {
      render(<TacticalBoardScreen {...defaultProps} />);

      fireEvent.click(screen.getByTestId('mock-place-chip'));
      fireEvent.click(screen.getByText('Draw'));
      fireEvent.click(screen.getByTestId('mock-add-drawing'));

      expect(screen.getByTestId('placed-chips-count')).toHaveTextContent('1');
      expect(screen.getByTestId('drawings-count')).toHaveTextContent('1');

      fireEvent.click(screen.getByText('Clear'));

      expect(screen.getByTestId('placed-chips-count')).toHaveTextContent('1');
      expect(screen.getByTestId('drawings-count')).toHaveTextContent('0');
    });

    it('should clear only chips when in drag mode', () => {
      render(<TacticalBoardScreen {...defaultProps} />);

      fireEvent.click(screen.getByTestId('mock-place-chip'));
      expect(screen.getByTestId('placed-chips-count')).toHaveTextContent('1');

      fireEvent.click(screen.getByText('Clear All'));

      expect(screen.getByTestId('placed-chips-count')).toHaveTextContent('0');
    });
  });

  describe('Props and State', () => {
    it('should pass correct props to TacticalBoard', () => {
      render(<TacticalBoardScreen {...defaultProps} />);
      
      const tacticalBoard = screen.getByTestId('tactical-board');
      expect(tacticalBoard).toBeInTheDocument();
      
      // Verify initial state is passed correctly
      expect(screen.getByTestId('pitch-mode')).toHaveTextContent('full');
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

  describe('Browser Back Navigation Integration', () => {
    it('should register navigation handler on mount and cleanup on unmount', () => {
      const mockPushNavigation = jest.fn();
      const mockRemoveNavigation = jest.fn();
      
      const props = {
        ...defaultProps,
        pushNavigationState: mockPushNavigation,
        removeFromNavigationStack: mockRemoveNavigation
      };
      
      const { unmount } = render(<TacticalBoardScreen {...props} />);
      
      // Verify navigation handler was registered on mount
      expect(mockPushNavigation).toHaveBeenCalledTimes(1);
      expect(mockPushNavigation).toHaveBeenCalledWith(expect.any(Function));
      
      // Verify cleanup happens on unmount
      unmount();
      
      expect(mockRemoveNavigation).toHaveBeenCalledTimes(1);
    });

    it('should call handleBackPress when registered navigation handler is invoked', () => {
      const mockPushNavigation = jest.fn();
      const mockOnNavigateBack = jest.fn();
      
      const props = {
        ...defaultProps,
        pushNavigationState: mockPushNavigation,
        onNavigateBack: mockOnNavigateBack
      };
      
      render(<TacticalBoardScreen {...props} />);
      
      // Get the registered navigation handler function
      expect(mockPushNavigation).toHaveBeenCalledWith(expect.any(Function));
      const registeredHandler = mockPushNavigation.mock.calls[0][0];
      
      // Invoke the registered handler (simulating browser back)
      registeredHandler();
      
      // Verify it calls the same logic as the back button
      expect(mockOnNavigateBack).toHaveBeenCalledTimes(1);
    });

    it('should handle missing pushNavigationState prop gracefully', () => {
      const propsWithoutPushNavigation = {
        ...defaultProps,
        pushNavigationState: undefined,
        removeFromNavigationStack: jest.fn()
      };
      
      expect(() => {
        render(<TacticalBoardScreen {...propsWithoutPushNavigation} />);
      }).not.toThrow();
    });

    it('should handle missing removeFromNavigationStack prop gracefully', () => {
      const propsWithoutRemoveNavigation = {
        ...defaultProps,
        pushNavigationState: jest.fn(),
        removeFromNavigationStack: undefined
      };
      
      expect(() => {
        const { unmount } = render(<TacticalBoardScreen {...propsWithoutRemoveNavigation} />);
        unmount(); // Should not throw during cleanup
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing navigation props gracefully', () => {
      const propsWithoutHandlers = {
        onNavigateBack: undefined,
        pushNavigationState: mockHandlers.pushNavigationState,
        removeFromNavigationStack: mockHandlers.removeFromNavigationStack
      };
      
      expect(() => {
        render(<TacticalBoardScreen {...propsWithoutHandlers} />);
      }).not.toThrow();
    });

    it('should handle rapid pitch mode switching', async () => {
      render(<TacticalBoardScreen {...defaultProps} />);
      
      // Rapidly switch modes (starting from default full)
      fireEvent.click(screen.getByText('Half'));
      await waitFor(() => {
        expect(screen.getByTestId('pitch-mode')).toHaveTextContent('half');
      });
      fireEvent.click(screen.getByText('Full'));
      await waitFor(() => {
        expect(screen.getByTestId('pitch-mode')).toHaveTextContent('full');
      });
      fireEvent.click(screen.getByText('Half'));
      await waitFor(() => {
        expect(screen.getByTestId('pitch-mode')).toHaveTextContent('half');
      });
      fireEvent.click(screen.getByText('Full'));
      await waitFor(() => {
        expect(screen.getByTestId('pitch-mode')).toHaveTextContent('full');
      });
      
      expect(screen.getByText('Full')).toHaveClass('bg-sky-500');
    });
  });
});
