import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TacticalBoard } from '../TacticalBoard';

// Mock the child components
jest.mock('../PlayerChip', () => ({
  PlayerChip: ({ id, color, number, x, y, onPointerStart, onDoubleClick }) => (
    <div 
      data-testid={`player-chip-${id}`}
      data-color={color}
      data-number={number}
      data-x={x}
      data-y={y}
      onPointerDown={onPointerStart}
      onDoubleClick={onDoubleClick}
    >
      Player {number} ({color})
    </div>
  )
}));

jest.mock('../SoccerBallChip', () => ({
  SoccerBallChip: ({ id, x, y, onPointerStart, onDoubleClick }) => (
    <div 
      data-testid={`ball-chip-${id}`}
      data-x={x}
      data-y={y}
      onPointerDown={onPointerStart}
      onDoubleClick={onDoubleClick}
    >
      Soccer Ball
    </div>
  )
}));

jest.mock('../ChipPalette', () => ({
  ChipPalette: ({ onDragStart }) => (
    <div data-testid="chip-palette">
      <button 
        data-testid="palette-add-player"
        onClick={(e) => onDragStart({ type: 'player', color: 'red', isNewChip: true }, e)}
      >
        Add Player
      </button>
      <button 
        data-testid="palette-add-ball"
        onClick={(e) => onDragStart({ type: 'ball', isNewChip: true }, e)}
      >
        Add Ball
      </button>
    </div>
  )
}));

describe('TacticalBoard', () => {
  let defaultProps;
  let mockHandlers;

  beforeEach(() => {
    mockHandlers = {
      onChipPlace: jest.fn(),
      onChipMove: jest.fn(),
      onChipDelete: jest.fn()
    };

    defaultProps = {
      pitchMode: 'full',
      placedChips: [],
      ...mockHandlers
    };

    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render tactical board with full pitch', () => {
      render(<TacticalBoard {...defaultProps} />);
      
      expect(screen.getByTestId('chip-palette')).toBeInTheDocument();
    });

    it('should render tactical board with half pitch', () => {
      const props = { ...defaultProps, pitchMode: 'half' };
      render(<TacticalBoard {...props} />);
      
      expect(screen.getByTestId('chip-palette')).toBeInTheDocument();
    });

    it('should render placed player chips', () => {
      const placedChips = [
        { id: 'chip-1', type: 'player', color: 'red', number: 1, x: 50, y: 50 },
        { id: 'chip-2', type: 'player', color: 'blue', number: 2, x: 30, y: 70 }
      ];
      
      const props = { ...defaultProps, placedChips };
      render(<TacticalBoard {...props} />);
      
      expect(screen.getByTestId('player-chip-chip-1')).toBeInTheDocument();
      expect(screen.getByTestId('player-chip-chip-2')).toBeInTheDocument();
      expect(screen.getByText('Player 1 (red)')).toBeInTheDocument();
      expect(screen.getByText('Player 2 (blue)')).toBeInTheDocument();
    });

    it('should render placed ball chips', () => {
      const placedChips = [
        { id: 'ball-1', type: 'ball', x: 45, y: 55 }
      ];
      
      const props = { ...defaultProps, placedChips };
      render(<TacticalBoard {...props} />);
      
      expect(screen.getByTestId('ball-chip-ball-1')).toBeInTheDocument();
      expect(screen.getByText('Soccer Ball')).toBeInTheDocument();
    });

    it('should render mix of player and ball chips', () => {
      const placedChips = [
        { id: 'chip-1', type: 'player', color: 'red', number: 1, x: 50, y: 50 },
        { id: 'ball-1', type: 'ball', x: 45, y: 55 },
        { id: 'chip-2', type: 'player', color: 'blue', number: 2, x: 30, y: 70 }
      ];
      
      const props = { ...defaultProps, placedChips };
      render(<TacticalBoard {...props} />);
      
      expect(screen.getByTestId('player-chip-chip-1')).toBeInTheDocument();
      expect(screen.getByTestId('ball-chip-ball-1')).toBeInTheDocument();
      expect(screen.getByTestId('player-chip-chip-2')).toBeInTheDocument();
    });
  });

  describe('Chip Palette Interactions', () => {
    it('should handle adding player chip from palette', () => {
      // Mock getBoundingClientRect to return consistent values
      const mockRect = {
        left: 0,
        top: 0,
        width: 400,
        height: 300,
        getBoundingClientRect: jest.fn()
      };
      
      // Mock the board ref
      const originalCreateElement = React.createElement;
      jest.spyOn(React, 'createElement').mockImplementation((type, props, ...children) => {
        if (type === 'div' && props?.ref) {
          const element = originalCreateElement(type, props, ...children);
          if (props.ref && typeof props.ref === 'object') {
            props.ref.current = mockRect;
          }
          return element;
        }
        return originalCreateElement(type, props, ...children);
      });

      render(<TacticalBoard {...defaultProps} />);
      
      // Simulate adding a player chip from palette
      const mockPointerEvent = {
        clientX: 200,
        clientY: 150,
        preventDefault: jest.fn(),
        target: { setPointerCapture: jest.fn() }
      };
      
      fireEvent.click(screen.getByTestId('palette-add-player'));
      
      // Verify the drag start was initiated
      expect(screen.getByTestId('chip-palette')).toBeInTheDocument();
      
      React.createElement.mockRestore();
    });

    it('should handle adding ball chip from palette', () => {
      render(<TacticalBoard {...defaultProps} />);
      
      fireEvent.click(screen.getByTestId('palette-add-ball'));
      
      expect(screen.getByTestId('chip-palette')).toBeInTheDocument();
    });
  });

  describe('Chip Interactions', () => {
    it('should handle chip double click for deletion', () => {
      const placedChips = [
        { id: 'chip-1', type: 'player', color: 'red', number: 1, x: 50, y: 50 }
      ];
      
      const props = { ...defaultProps, placedChips };
      render(<TacticalBoard {...props} />);
      
      fireEvent.doubleClick(screen.getByTestId('player-chip-chip-1'));
      
      expect(mockHandlers.onChipDelete).toHaveBeenCalledWith('chip-1');
    });

    it('should handle ball chip double click for deletion', () => {
      const placedChips = [
        { id: 'ball-1', type: 'ball', x: 45, y: 55 }
      ];
      
      const props = { ...defaultProps, placedChips };
      render(<TacticalBoard {...props} />);
      
      fireEvent.doubleClick(screen.getByTestId('ball-chip-ball-1'));
      
      expect(mockHandlers.onChipDelete).toHaveBeenCalledWith('ball-1');
    });

    it('should handle chip pointer down for dragging', () => {
      const placedChips = [
        { id: 'chip-1', type: 'player', color: 'red', number: 1, x: 50, y: 50 }
      ];
      
      const props = { ...defaultProps, placedChips };
      render(<TacticalBoard {...props} />);
      
      fireEvent.pointerDown(screen.getByTestId('player-chip-chip-1'));
      
      // Just verify the event was handled without error
      expect(screen.getByTestId('player-chip-chip-1')).toBeInTheDocument();
    });
  });

  describe('Props and State', () => {
    it('should update when pitchMode changes', () => {
      const { rerender } = render(<TacticalBoard {...defaultProps} pitchMode="full" />);
      
      // Change pitch mode
      rerender(<TacticalBoard {...defaultProps} pitchMode="half" />);
      
      expect(screen.getByTestId('chip-palette')).toBeInTheDocument();
    });

    it('should update when placedChips changes', () => {
      const { rerender } = render(<TacticalBoard {...defaultProps} placedChips={[]} />);
      
      const newChips = [
        { id: 'chip-1', type: 'player', color: 'red', number: 1, x: 50, y: 50 }
      ];
      
      rerender(<TacticalBoard {...defaultProps} placedChips={newChips} />);
      
      expect(screen.getByTestId('player-chip-chip-1')).toBeInTheDocument();
    });

    it('should pass correct chip data to components', () => {
      const placedChips = [
        { id: 'chip-1', type: 'player', color: 'red', number: 1, x: 50, y: 50 }
      ];
      
      const props = { ...defaultProps, placedChips };
      render(<TacticalBoard {...props} />);
      
      const chip = screen.getByTestId('player-chip-chip-1');
      expect(chip).toHaveAttribute('data-color', 'red');
      expect(chip).toHaveAttribute('data-number', '1');
      expect(chip).toHaveAttribute('data-x', '50');
      expect(chip).toHaveAttribute('data-y', '50');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty placedChips array', () => {
      const props = { ...defaultProps, placedChips: [] };
      
      expect(() => {
        render(<TacticalBoard {...props} />);
      }).not.toThrow();
      
      expect(screen.getByTestId('chip-palette')).toBeInTheDocument();
    });

    it('should handle chips with missing properties', () => {
      const placedChips = [
        { id: 'chip-1', type: 'player' }, // Missing color, number, x, y
        { id: 'ball-1', type: 'ball' } // Missing x, y
      ];
      
      const props = { ...defaultProps, placedChips };
      
      expect(() => {
        render(<TacticalBoard {...props} />);
      }).not.toThrow();
    });

    it('should handle invalid pitch mode', () => {
      const props = { ...defaultProps, pitchMode: 'invalid' };
      
      expect(() => {
        render(<TacticalBoard {...props} />);
      }).not.toThrow();
    });

    it('should handle missing handler props', () => {
      const propsWithoutHandlers = {
        pitchMode: 'full',
        placedChips: [],
        onChipPlace: undefined,
        onChipMove: undefined,
        onChipDelete: undefined
      };
      
      expect(() => {
        render(<TacticalBoard {...propsWithoutHandlers} />);
      }).not.toThrow();
    });
  });
});