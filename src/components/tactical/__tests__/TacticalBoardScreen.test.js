import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TacticalBoardScreen } from '../TacticalBoardScreen';
import { BackHandlerContext } from '../../../hooks/BackHandlerContext';

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

// Mock the persistenceManager to ensure clean state for each test
jest.mock('../../../utils/persistenceManager', () => ({
  createPersistenceManager: jest.fn(() => ({
    loadState: jest.fn(() => ({
      pitchMode: 'full',
      fullModeChips: [],
      halfModeChips: [],
      fromView: null
    })),
    saveState: jest.fn()
  }))
}));

// Mock the useBrowserBackIntercept hook
jest.mock('../../../hooks/useBrowserBackIntercept', () => ({
  useBrowserBackIntercept: jest.fn(() => ({
    pushBackHandler: jest.fn(),
    popBackHandler: jest.fn(),
    removeModalFromStack: jest.fn()
  }))
}));

// Test wrapper that provides the BackHandlerContext
const TestWrapper = ({ children }) => {
  const mockBackHandler = {
    pushBackHandler: jest.fn(),
    popBackHandler: jest.fn(),
    removeModalFromStack: jest.fn()
  };
  
  return (
    <BackHandlerContext.Provider value={mockBackHandler}>
      {children}
    </BackHandlerContext.Provider>
  );
};

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
    
    // Reset the persistence manager mock for each test
    const { createPersistenceManager } = require('../../../utils/persistenceManager');
    createPersistenceManager.mockReturnValue({
      loadState: jest.fn(() => ({
        pitchMode: 'full',
        fullModeChips: [],
        halfModeChips: [],
        fromView: null
      })),
      saveState: jest.fn()
    });
  });

  describe('Component Rendering', () => {
    it('should render tactical board screen with essential elements', () => {
      render(<TacticalBoardScreen {...defaultProps} />, { wrapper: TestWrapper });
      
      expect(screen.getByText('Back')).toBeInTheDocument();
      expect(screen.getByText('Full')).toBeInTheDocument();
      expect(screen.getByText('Half')).toBeInTheDocument();
      expect(screen.getByTestId('tactical-board')).toBeInTheDocument();
    });

    it('should render pitch mode toggle buttons', () => {
      render(<TacticalBoardScreen {...defaultProps} />, { wrapper: TestWrapper });
      
      expect(screen.getByText('Full')).toBeInTheDocument();
      expect(screen.getByText('Half')).toBeInTheDocument();
    });

    

    it('should start with no placed chips', () => {
      render(<TacticalBoardScreen {...defaultProps} />, { wrapper: TestWrapper });
      
      expect(screen.getByTestId('placed-chips-count')).toHaveTextContent('0');
    });
  });

  describe('User Interactions', () => {
    it('should handle back button click', () => {
      render(<TacticalBoardScreen {...defaultProps} />, { wrapper: TestWrapper });
      
      fireEvent.click(screen.getByText('Back'));
      
      expect(mockHandlers.onNavigateBack).toHaveBeenCalledTimes(1);
    });

    it('should switch to half pitch mode when clicked', async () => {
      render(<TacticalBoardScreen {...defaultProps} />, { wrapper: TestWrapper });
      
      fireEvent.click(screen.getByText('Half'));
      
      await waitFor(() => {
        expect(screen.getByTestId('pitch-mode')).toHaveTextContent('half');
      });
      expect(screen.getByText('Half')).toHaveClass('bg-sky-500');
      expect(screen.getByText('Full')).not.toHaveClass('bg-sky-500');
    });

    it('should switch to full pitch mode when clicked', async () => {
      render(<TacticalBoardScreen {...defaultProps} />, { wrapper: TestWrapper });
      
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

    
  });

  describe('Chip Management', () => {
    it('should handle chip placement', () => {
      render(<TacticalBoardScreen {...defaultProps} />, { wrapper: TestWrapper });
      
      fireEvent.click(screen.getByTestId('mock-place-chip'));
      
      expect(screen.getByTestId('placed-chips-count')).toHaveTextContent('1');
    });

    it('should handle chip movement', () => {
      render(<TacticalBoardScreen {...defaultProps} />, { wrapper: TestWrapper });
      
      // Place a chip first
      fireEvent.click(screen.getByTestId('mock-place-chip'));
      expect(screen.getByTestId('placed-chips-count')).toHaveTextContent('1');
      
      // Move the chip (should still have 1 chip)
      fireEvent.click(screen.getByTestId('mock-move-chip'));
      expect(screen.getByTestId('placed-chips-count')).toHaveTextContent('1');
    });

    it('should handle chip deletion', () => {
      render(<TacticalBoardScreen {...defaultProps} />, { wrapper: TestWrapper });
      
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
      render(<TacticalBoardScreen {...defaultProps} />, { wrapper: TestWrapper });
      
      const tacticalBoard = screen.getByTestId('tactical-board');
      expect(tacticalBoard).toBeInTheDocument();
      
      // Verify initial state is passed correctly
      expect(screen.getByTestId('pitch-mode')).toHaveTextContent('full');
      expect(screen.getByTestId('placed-chips-count')).toHaveTextContent('0');
    });

    it('should handle multiple chip operations', () => {
      render(<TacticalBoardScreen {...defaultProps} />, { wrapper: TestWrapper });
      
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
        render(<TacticalBoardScreen {...propsWithoutHandlers} />, { wrapper: TestWrapper });
      }).not.toThrow();
    });

    it('should handle rapid pitch mode switching', async () => {
      render(<TacticalBoardScreen {...defaultProps} />, { wrapper: TestWrapper });
      
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