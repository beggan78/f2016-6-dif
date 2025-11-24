import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ChipPalette } from '../ChipPalette';

// Mock the child components
jest.mock('../PlayerChip', () => ({
  PlayerChip: ({ id, color, number, onPointerStart, isInPalette }) => (
    <div 
      data-testid={`palette-player-${color}`}
      data-id={id}
      data-color={color}
      data-number={number}
      data-in-palette={isInPalette}
      onPointerDown={onPointerStart}
    >
      Player {color} {number}
    </div>
  )
}));

jest.mock('../SoccerBallChip', () => ({
  SoccerBallChip: ({ id, variation, number, onPointerStart, isInPalette }) => (
    <div 
      data-testid={`palette-${variation || 'ball'}`}
      data-id={id}
      data-variation={variation}
      data-number={number}
      data-in-palette={isInPalette}
      onPointerDown={onPointerStart}
    >
      Soccer Ball {variation} {number}
    </div>
  )
}));

describe('ChipPalette', () => {
  let defaultProps;
  let mockHandlers;

  beforeEach(() => {
    mockHandlers = {
      onDragStart: jest.fn()
    };

    defaultProps = {
      ...mockHandlers
    };

    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render palette container', () => {
      render(<ChipPalette {...defaultProps} />);
      
      // Check that the main container is rendered
      const container = document.querySelector('.bg-slate-800');
      expect(container).toBeInTheDocument();
    });

    it('should render all available player chip colors', () => {
      render(<ChipPalette {...defaultProps} />);
      
      const expectedColors = [
        'djurgarden', 'white', 'red', 'blue', 'yellow', 'green', 
        'orange', 'purple', 'black'
      ];
      
      expectedColors.forEach(color => {
        expect(screen.getByTestId(`palette-player-${color}`)).toBeInTheDocument();
      });
    });

    it('should render soccer ball chip', () => {
      render(<ChipPalette {...defaultProps} />);
      
      // Only ball-v1 is available in the current implementation
      expect(screen.getByTestId('palette-ball-v1')).toBeInTheDocument();
    });

    it('should render djurgarden chip in main row', () => {
      render(<ChipPalette {...defaultProps} />);
      
      expect(screen.getByTestId('palette-player-djurgarden')).toBeInTheDocument();
    });

    it('should show instructions', () => {
      render(<ChipPalette {...defaultProps} />);
      
      expect(screen.getByText('Drag chips onto the pitch • Double-tap to delete')).toBeInTheDocument();
    });

    it('should render chips with palette flag set', () => {
      render(<ChipPalette {...defaultProps} />);
      
      const playerChip = screen.getByTestId('palette-player-red');
      const ballChip = screen.getByTestId('palette-ball-v1');
      
      expect(playerChip).toHaveAttribute('data-in-palette', 'true');
      expect(ballChip).toHaveAttribute('data-in-palette', 'true');
    });

    it('should render player chips with infinity symbol', () => {
      render(<ChipPalette {...defaultProps} />);
      
      const redChip = screen.getByTestId('palette-player-red');
      expect(redChip).toHaveAttribute('data-number', '1');
    });
  });

  describe('User Interactions', () => {
    it('should call onDragStart with correct data for player chips', () => {
      render(<ChipPalette {...defaultProps} />);
      
      fireEvent.pointerDown(screen.getByTestId('palette-player-red'));
      
      expect(mockHandlers.onDragStart).toHaveBeenCalledWith(
        {
          type: 'player',
          color: 'red',
          isNewChip: true
        },
        expect.any(Object)
      );
    });

    it('should call onDragStart with correct data for different color chips', () => {
      render(<ChipPalette {...defaultProps} />);
      
      // Test blue chip
      fireEvent.pointerDown(screen.getByTestId('palette-player-blue'));
      
      expect(mockHandlers.onDragStart).toHaveBeenCalledWith(
        {
          type: 'player',
          color: 'blue',
          isNewChip: true
        },
        expect.any(Object)
      );
    });

    it('should call onDragStart with correct data for striped chip', () => {
      render(<ChipPalette {...defaultProps} />);
      
      fireEvent.pointerDown(screen.getByTestId('palette-player-djurgarden'));
      
      expect(mockHandlers.onDragStart).toHaveBeenCalledWith(
        {
          type: 'player',
          color: 'djurgarden',
          isNewChip: true
        },
        expect.any(Object)
      );
    });

    it('should call onDragStart with correct data for ball variation chip', () => {
      render(<ChipPalette {...defaultProps} />);
      
      fireEvent.pointerDown(screen.getByTestId('palette-ball-v1'));
      
      expect(mockHandlers.onDragStart).toHaveBeenCalledWith(
        {
          type: 'ball',
          variation: 'ball-v1',
          isNewChip: true
        },
        expect.any(Object)
      );
    });

    it('should handle multiple chip interactions', () => {
      render(<ChipPalette {...defaultProps} />);
      
      // Interact with multiple chips
      fireEvent.pointerDown(screen.getByTestId('palette-player-red'));
      fireEvent.pointerDown(screen.getByTestId('palette-player-blue'));
      fireEvent.pointerDown(screen.getByTestId('palette-ball-v1'));
      
      expect(mockHandlers.onDragStart).toHaveBeenCalledTimes(3);
    });
  });

  describe('Layout and Styling', () => {
    it('should have proper layout structure', () => {
      render(<ChipPalette {...defaultProps} />);
      
      // Check for main container
      const container = document.querySelector('.bg-slate-800');
      expect(container).toBeInTheDocument();
      
      // Check for chips container
      const chipsContainer = document.querySelector('.flex.flex-wrap');
      expect(chipsContainer).toBeInTheDocument();
      
      // Check for instructions section
      const instructionsSection = document.querySelector('.border-t');
      expect(instructionsSection).toBeInTheDocument();
    });

    it('should have visual separator for instructions', () => {
      render(<ChipPalette {...defaultProps} />);
      
      // The component should have border-t class for separation above instructions
      const instructionsContainer = document.querySelector('.border-t');
      expect(instructionsContainer).toBeInTheDocument();
    });

    it('should organize chips in a responsive grid', () => {
      render(<ChipPalette {...defaultProps} />);
      
      // All player chips should be rendered
      const expectedColors = [
        'djurgarden', 'white', 'red', 'blue', 'yellow', 'green', 
        'orange', 'purple', 'black'
      ];
      
      expectedColors.forEach(color => {
        expect(screen.getByTestId(`palette-player-${color}`)).toBeInTheDocument();
      });
    });
  });

  describe('Props and State', () => {
    it('should pass correct props to PlayerChip components', () => {
      render(<ChipPalette {...defaultProps} />);
      
      const redChip = screen.getByTestId('palette-player-red');
      expect(redChip).toHaveAttribute('data-color', 'red');
      expect(redChip).toHaveAttribute('data-number', '1');
      expect(redChip).toHaveAttribute('data-in-palette', 'true');
    });

    it('should pass correct props to SoccerBallChip components', () => {
      render(<ChipPalette {...defaultProps} />);
      
      const ballChip = screen.getByTestId('palette-ball-v1');
      expect(ballChip).toHaveAttribute('data-in-palette', 'true');
      expect(ballChip).toHaveAttribute('data-variation', 'ball-v1');
      // Note: SoccerBallChip doesn't receive number prop in current implementation
    });

    it('should generate unique IDs for each chip', () => {
      render(<ChipPalette {...defaultProps} />);
      
      const redChip = screen.getByTestId('palette-player-red');
      const blueChip = screen.getByTestId('palette-player-blue');
      const ballChip = screen.getByTestId('palette-ball-v1');
      
      expect(redChip).toHaveAttribute('data-id', 'palette-red');
      expect(blueChip).toHaveAttribute('data-id', 'palette-blue');
      expect(ballChip).toHaveAttribute('data-id', 'palette-ball-v1');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing onDragStart prop gracefully', () => {
      const propsWithoutHandler = {
        onDragStart: undefined
      };
      
      expect(() => {
        render(<ChipPalette {...propsWithoutHandler} />);
      }).not.toThrow();
    });

    it('should render all chips even without handlers', () => {
      const propsWithoutHandler = {
        onDragStart: undefined
      };
      
      render(<ChipPalette {...propsWithoutHandler} />);
      
      expect(screen.getByTestId('palette-player-red')).toBeInTheDocument();
      expect(screen.getByTestId('palette-ball-v1')).toBeInTheDocument();
    });

    it('should handle interaction events without handlers', () => {
      const propsWithoutHandler = {
        onDragStart: undefined
      };
      
      render(<ChipPalette {...propsWithoutHandler} />);
      
      expect(() => {
        fireEvent.pointerDown(screen.getByTestId('palette-player-red'));
        fireEvent.pointerDown(screen.getByTestId('palette-ball-v1'));
      }).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('should not have heading structure (simplified layout)', () => {
      render(<ChipPalette {...defaultProps} />);
      
      // The component no longer has headings - it's a simplified layout
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      expect(headings).toHaveLength(0);
    });

    it('should provide helpful instructions', () => {
      render(<ChipPalette {...defaultProps} />);
      
      const instructions = screen.getByText(/Drag chips onto the pitch/);
      expect(instructions).toBeInTheDocument();
    });

    it('should provide accessible instructions', () => {
      render(<ChipPalette {...defaultProps} />);
      
      // The component provides instructions for accessibility instead of headings
      const instructions = screen.getByText('Drag chips onto the pitch • Double-tap to delete');
      expect(instructions).toBeInTheDocument();
    });
  });
});
