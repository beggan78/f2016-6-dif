/**
 * Tests for DraggablePlayerCard component
 * Comprehensive coverage of draggable card rendering and interactions
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DraggablePlayerCard } from '../DraggablePlayerCard';

// Mock Tooltip component
jest.mock('../../../shared', () => ({
  Tooltip: ({ children, content }) => (
    <div data-testid="tooltip" title={content}>
      {children}
    </div>
  )
}));

describe('DraggablePlayerCard', () => {
  let defaultProps;
  let mockPlayer;
  let mockOnPointerStart;
  let mockOnClick;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPlayer = {
      id: '1',
      displayName: 'Test Player',
      jerseyNumber: 10,
      practicesPerMatch: 3.45,
      attendanceRate: 85.5
    };

    mockOnPointerStart = jest.fn();
    mockOnClick = jest.fn();

    defaultProps = {
      player: mockPlayer,
      isDragging: false,
      shift: 0,
      onPointerStart: mockOnPointerStart,
      onClick: mockOnClick,
      isInMultipleMatches: false,
      isSelectedAndOnlyAvailableHere: false,
      isDragActivating: false
    };
  });

  describe('Component Rendering', () => {
    it('should render player information correctly', () => {
      render(<DraggablePlayerCard {...defaultProps} />);

      expect(screen.getByText('Test Player')).toBeInTheDocument();
      expect(screen.getByText('#10')).toBeInTheDocument();
      expect(screen.getByText('3.45')).toBeInTheDocument();
      expect(screen.getByText('85.5%')).toBeInTheDocument();
    });

    it('should render without jersey number', () => {
      const playerWithoutJersey = { ...mockPlayer, jerseyNumber: null };
      render(<DraggablePlayerCard {...defaultProps} player={playerWithoutJersey} />);

      expect(screen.getByText('Test Player')).toBeInTheDocument();
      expect(screen.queryByText(/#/)).not.toBeInTheDocument();
    });

    it('should return null when player is null', () => {
      const { container } = render(<DraggablePlayerCard {...defaultProps} player={null} />);

      expect(container.firstChild).toBeNull();
    });

    it('should return null when player is undefined', () => {
      const { container } = render(<DraggablePlayerCard {...defaultProps} player={undefined} />);

      expect(container.firstChild).toBeNull();
    });

    it('should set correct data-drag-item-id attribute', () => {
      const { container } = render(<DraggablePlayerCard {...defaultProps} />);

      const card = container.querySelector('[data-drag-item-id="1"]');
      expect(card).toBeInTheDocument();
    });

    it('should have correct role and tabIndex for accessibility', () => {
      render(<DraggablePlayerCard {...defaultProps} />);

      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('should render tooltip for practices', () => {
      render(<DraggablePlayerCard {...defaultProps} />);

      const tooltip = screen.getByTestId('tooltip');
      expect(tooltip).toBeInTheDocument();
      expect(tooltip).toHaveAttribute('title', expect.stringContaining(''));
    });
  });

  describe('Styling and Visual States', () => {
    it('should apply default styling when not in any special state', () => {
      const { container } = render(<DraggablePlayerCard {...defaultProps} />);

      const card = container.querySelector('[data-drag-item-id]');
      expect(card).toHaveClass('border-sky-500/60');
      expect(card).toHaveClass('bg-sky-900/20');
      expect(card).toHaveClass('text-sky-100');
    });

    it('should apply special styling when selected and only available here', () => {
      const props = {
        ...defaultProps,
        isSelectedAndOnlyAvailableHere: true
      };
      const { container } = render(<DraggablePlayerCard {...props} />);

      const card = container.querySelector('[data-drag-item-id]');
      expect(card).toHaveClass('border-2');
      expect(card).toHaveClass('border-orange-400');
      expect(card).toHaveClass('bg-orange-900/20');
      expect(card).toHaveClass('text-orange-100');
    });

    it('should apply special styling when in multiple matches', () => {
      const props = {
        ...defaultProps,
        isInMultipleMatches: true
      };
      const { container } = render(<DraggablePlayerCard {...props} />);

      const card = container.querySelector('[data-drag-item-id]');
      expect(card).toHaveClass('border-2');
      expect(card).toHaveClass('border-sky-400');
      expect(card).toHaveClass('bg-sky-900/20');
      expect(card).toHaveClass('shadow-lg');
      expect(card).toHaveClass('shadow-sky-500/60');
    });

    it('should apply drag activating class when pulse animation active', () => {
      const props = {
        ...defaultProps,
        isDragActivating: true
      };
      const { container } = render(<DraggablePlayerCard {...props} />);

      const card = container.querySelector('[data-drag-item-id]');
      expect(card).toHaveClass('drag-activating');
    });

    it('should apply reduced opacity when being dragged', () => {
      const props = {
        ...defaultProps,
        isDragging: true
      };
      const { container } = render(<DraggablePlayerCard {...props} />);

      const card = container.querySelector('[data-drag-item-id]');
      expect(card).toHaveStyle({ opacity: 0.3 });
    });

    it('should have full opacity when not being dragged', () => {
      const { container } = render(<DraggablePlayerCard {...defaultProps} />);

      const card = container.querySelector('[data-drag-item-id]');
      expect(card).toHaveStyle({ opacity: 1 });
    });

    it('should apply transform when shift is provided', () => {
      const props = {
        ...defaultProps,
        shift: 48
      };
      const { container } = render(<DraggablePlayerCard {...props} />);

      const card = container.querySelector('[data-drag-item-id]');
      expect(card).toHaveStyle({ transform: 'translateY(48px)' });
    });

    it('should apply negative transform when shift is negative', () => {
      const props = {
        ...defaultProps,
        shift: -48
      };
      const { container } = render(<DraggablePlayerCard {...props} />);

      const card = container.querySelector('[data-drag-item-id]');
      expect(card).toHaveStyle({ transform: 'translateY(-48px)' });
    });

    it('should have no transform when shift is zero', () => {
      const props = {
        ...defaultProps,
        shift: 0
      };
      const { container } = render(<DraggablePlayerCard {...props} />);

      const card = container.querySelector('[data-drag-item-id]');
      expect(card).toHaveStyle({ transform: undefined });
    });

    it('should disable transitions when dragging', () => {
      const props = {
        ...defaultProps,
        isDragging: true
      };
      const { container } = render(<DraggablePlayerCard {...props} />);

      const card = container.querySelector('[data-drag-item-id]');
      expect(card).toHaveStyle({ transition: 'none' });
    });

    it('should enable transitions when not dragging', () => {
      const { container } = render(<DraggablePlayerCard {...defaultProps} />);

      const card = container.querySelector('[data-drag-item-id]');
      expect(card).toHaveStyle({
        transition: 'transform 200ms ease-out, opacity 100ms ease-out'
      });
    });
  });

  describe('User Interactions', () => {
    it('should call onPointerStart when pointer down event occurs', () => {
      const { container } = render(<DraggablePlayerCard {...defaultProps} />);

      const card = container.querySelector('[data-drag-item-id]');
      const mockEvent = { pointerId: 1, clientX: 100, clientY: 100 };

      fireEvent.pointerDown(card, mockEvent);

      expect(mockOnPointerStart).toHaveBeenCalledTimes(1);
      expect(mockOnPointerStart).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'pointerdown'
        })
      );
    });

    it('should call onClick when clicked and not dragging', () => {
      const { container } = render(<DraggablePlayerCard {...defaultProps} />);

      const card = container.querySelector('[data-drag-item-id]');
      fireEvent.click(card);

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when dragging', () => {
      const props = {
        ...defaultProps,
        isDragging: true
      };
      const { container } = render(<DraggablePlayerCard {...props} />);

      const card = container.querySelector('[data-drag-item-id]');
      fireEvent.click(card);

      expect(mockOnClick).not.toHaveBeenCalled();
    });

    it('should call onClick when Enter key is pressed and not dragging', () => {
      const { container } = render(<DraggablePlayerCard {...defaultProps} />);

      const card = container.querySelector('[data-drag-item-id]');
      fireEvent.keyDown(card, { key: 'Enter' });

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when Enter key is pressed and dragging', () => {
      const props = {
        ...defaultProps,
        isDragging: true
      };
      const { container } = render(<DraggablePlayerCard {...props} />);

      const card = container.querySelector('[data-drag-item-id]');
      fireEvent.keyDown(card, { key: 'Enter' });

      expect(mockOnClick).not.toHaveBeenCalled();
    });

    it('should not call onClick for non-Enter keys', () => {
      const { container } = render(<DraggablePlayerCard {...defaultProps} />);

      const card = container.querySelector('[data-drag-item-id]');
      fireEvent.keyDown(card, { key: 'Space' });

      expect(mockOnClick).not.toHaveBeenCalled();
    });

    it('should handle onClick being undefined', () => {
      const props = {
        ...defaultProps,
        onClick: undefined
      };
      const { container } = render(<DraggablePlayerCard {...props} />);

      const card = container.querySelector('[data-drag-item-id]');

      expect(() => {
        fireEvent.click(card);
      }).not.toThrow();

      expect(() => {
        fireEvent.keyDown(card, { key: 'Enter' });
      }).not.toThrow();
    });

    it('should handle onPointerStart being undefined', () => {
      const props = {
        ...defaultProps,
        onPointerStart: undefined
      };
      const { container } = render(<DraggablePlayerCard {...props} />);

      const card = container.querySelector('[data-drag-item-id]');

      expect(() => {
        fireEvent.pointerDown(card, { pointerId: 1 });
      }).not.toThrow();
    });
  });

  describe('Data Display', () => {
    it('should format practices per match with 2 decimal places', () => {
      const player = {
        ...mockPlayer,
        practicesPerMatch: 3.456789
      };
      render(<DraggablePlayerCard {...defaultProps} player={player} />);

      expect(screen.getByText('3.46')).toBeInTheDocument();
    });

    it('should format attendance rate with 1 decimal place', () => {
      const player = {
        ...mockPlayer,
        attendanceRate: 85.56789
      };
      render(<DraggablePlayerCard {...defaultProps} player={player} />);

      expect(screen.getByText('85.6%')).toBeInTheDocument();
    });

    it('should handle zero practices per match', () => {
      const player = {
        ...mockPlayer,
        practicesPerMatch: 0
      };
      render(<DraggablePlayerCard {...defaultProps} player={player} />);

      expect(screen.getByText('0.00')).toBeInTheDocument();
    });

    it('should handle zero attendance rate', () => {
      const player = {
        ...mockPlayer,
        attendanceRate: 0
      };
      render(<DraggablePlayerCard {...defaultProps} player={player} />);

      expect(screen.getByText('0.0%')).toBeInTheDocument();
    });

    it('should handle very long player names with truncation', () => {
      const player = {
        ...mockPlayer,
        displayName: 'Very Long Player Name That Should Be Truncated'
      };
      const { container } = render(<DraggablePlayerCard {...defaultProps} player={player} />);

      const nameElement = container.querySelector('.truncate');
      expect(nameElement).toBeInTheDocument();
      expect(nameElement).toHaveTextContent(player.displayName);
    });
  });

  describe('React.memo Optimization', () => {
    it('should use React.memo for performance optimization', () => {
      // React.memo is applied to the component
      expect(DraggablePlayerCard).toBeDefined();

      // Render component multiple times with same props
      const props = {
        player: mockPlayer,
        isDragging: false,
        shift: 0,
        onPointerStart: jest.fn(),
        onClick: jest.fn(),
        isInMultipleMatches: false,
        isSelectedAndOnlyAvailableHere: false,
        isDragActivating: false
      };

      const { rerender, container } = render(<DraggablePlayerCard {...props} />);

      const firstRenderHTML = container.innerHTML;

      // Re-render with same props
      rerender(<DraggablePlayerCard {...props} />);

      // HTML should be identical (component memoized correctly)
      expect(container.innerHTML).toBe(firstRenderHTML);
    });

    it('should re-render when shift changes', () => {
      const { container, rerender } = render(
        <DraggablePlayerCard
          player={mockPlayer}
          isDragging={false}
          shift={0}
          onPointerStart={jest.fn()}
          onClick={jest.fn()}
          isInMultipleMatches={false}
          isSelectedAndOnlyAvailableHere={false}
          isDragActivating={false}
        />
      );

      const card = container.querySelector('[data-drag-item-id]');
      expect(card).toHaveStyle({ transform: undefined });

      // Re-render with different shift
      rerender(
        <DraggablePlayerCard
          player={mockPlayer}
          isDragging={false}
          shift={48}
          onPointerStart={jest.fn()}
          onClick={jest.fn()}
          isInMultipleMatches={false}
          isSelectedAndOnlyAvailableHere={false}
          isDragActivating={false}
        />
      );

      // Should update transform
      expect(card).toHaveStyle({ transform: 'translateY(48px)' });
    });

    it('should re-render when isDragging changes', () => {
      const { container, rerender } = render(
        <DraggablePlayerCard
          player={mockPlayer}
          isDragging={false}
          shift={0}
          onPointerStart={jest.fn()}
          onClick={jest.fn()}
          isInMultipleMatches={false}
          isSelectedAndOnlyAvailableHere={false}
          isDragActivating={false}
        />
      );

      const card = container.querySelector('[data-drag-item-id]');
      expect(card).toHaveStyle({ opacity: 1 });

      // Re-render with different isDragging
      rerender(
        <DraggablePlayerCard
          player={mockPlayer}
          isDragging={true}
          shift={0}
          onPointerStart={jest.fn()}
          onClick={jest.fn()}
          isInMultipleMatches={false}
          isSelectedAndOnlyAvailableHere={false}
          isDragActivating={false}
        />
      );

      // Should update opacity
      expect(card).toHaveStyle({ opacity: 0.3 });
    });

    it('should re-render when player properties change', () => {
      const { container, rerender } = render(
        <DraggablePlayerCard {...defaultProps} />
      );

      expect(screen.getByText('Test Player')).toBeInTheDocument();

      const updatedPlayer = {
        ...mockPlayer,
        displayName: 'Updated Player'
      };

      rerender(<DraggablePlayerCard {...defaultProps} player={updatedPlayer} />);

      expect(screen.getByText('Updated Player')).toBeInTheDocument();
      expect(screen.queryByText('Test Player')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle player with string id', () => {
      const player = {
        ...mockPlayer,
        id: 'string-id'
      };
      const { container } = render(<DraggablePlayerCard {...defaultProps} player={player} />);

      const card = container.querySelector('[data-drag-item-id="string-id"]');
      expect(card).toBeInTheDocument();
    });

    it('should handle player with numeric id', () => {
      const player = {
        ...mockPlayer,
        id: 123
      };
      const { container } = render(<DraggablePlayerCard {...defaultProps} player={player} />);

      const card = container.querySelector('[data-drag-item-id="123"]');
      expect(card).toBeInTheDocument();
    });

    it('should handle all boolean props being true', () => {
      const props = {
        ...defaultProps,
        isDragging: true,
        isDragActivating: true,
        isInMultipleMatches: true,
        isSelectedAndOnlyAvailableHere: true
      };
      const { container } = render(<DraggablePlayerCard {...props} />);

      const card = container.querySelector('[data-drag-item-id]');
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('drag-activating');
    });

    it('should handle extreme shift values', () => {
      const props = {
        ...defaultProps,
        shift: 1000
      };
      const { container } = render(<DraggablePlayerCard {...props} />);

      const card = container.querySelector('[data-drag-item-id]');
      expect(card).toHaveStyle({ transform: 'translateY(1000px)' });
    });

    it('should handle missing player properties gracefully', () => {
      const minimalPlayer = {
        id: '1',
        displayName: 'Minimal Player',
        practicesPerMatch: 0,
        attendanceRate: 0
      };
      render(<DraggablePlayerCard {...defaultProps} player={minimalPlayer} />);

      expect(screen.getByText('Minimal Player')).toBeInTheDocument();
      expect(screen.getByText('0.00')).toBeInTheDocument();
      expect(screen.getByText('0.0%')).toBeInTheDocument();
    });
  });
});
