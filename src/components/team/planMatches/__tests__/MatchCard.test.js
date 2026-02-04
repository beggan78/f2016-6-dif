/**
 * Integration tests for MatchCard component
 * Focus on drag and drop behavior and user interactions
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MatchCard } from '../MatchCard';

// Mock child components
jest.mock('../../shared/UI', () => ({
  Button: ({ children, onClick, disabled, className }) => (
    <button onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  )
}));

jest.mock('../../shared', () => ({
  Portal: ({ children }) => <div data-testid="portal">{children}</div>,
  Tooltip: ({ children }) => <div data-testid="tooltip">{children}</div>
}));

jest.mock('./PlayerSelector', () => ({
  PlayerSelector: ({ players, selectedIds }) => (
    <div data-testid="player-selector">
      <div>Roster: {players?.length || 0}</div>
      <div>Selected: {selectedIds?.length || 0}</div>
    </div>
  )
}));

// Mock useListDragAndDrop hook
const mockDragHook = {
  isDragging: false,
  draggedItemId: null,
  dropIndex: null,
  ghostPosition: null,
  handlePointerStart: jest.fn(),
  isItemBeingDragged: jest.fn(() => false),
  isItemDragActivating: jest.fn(() => false),
  getItemShift: jest.fn(() => 0),
  shouldSuppressClick: jest.fn(() => false)
};

jest.mock('../../../../hooks/useListDragAndDrop', () => ({
  useListDragAndDrop: jest.fn(() => mockDragHook)
}));

const { useListDragAndDrop } = require('../../../../hooks/useListDragAndDrop');

describe('MatchCard', () => {
  let defaultProps;
  let mockRoster;
  let mockMatch;
  let mockRosterById;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockRoster = [
      {
        id: '1',
        displayName: 'Player 1',
        jerseyNumber: 10,
        practicesPerMatch: 3.5,
        attendanceRate: 90
      },
      {
        id: '2',
        displayName: 'Player 2',
        jerseyNumber: 11,
        practicesPerMatch: 4.0,
        attendanceRate: 85
      },
      {
        id: '3',
        displayName: 'Player 3',
        jerseyNumber: 12,
        practicesPerMatch: 2.5,
        attendanceRate: 95
      }
    ];

    mockRosterById = new Map(mockRoster.map((player) => [player.id, player]));

    mockMatch = {
      id: 'match-1',
      opponent: 'Opponent Team',
      matchDate: '2026-02-15',
      matchTime: '10:00'
    };

    defaultProps = {
      match: mockMatch,
      roster: mockRoster,
      rosterById: mockRosterById,
      selectedIds: ['1', '2'],
      unavailableIds: [],
      planningStatus: null,
      canPlan: true,
      isSelectedInOtherMatch: jest.fn(() => false),
      isSelectedAndOnlyAvailableHere: jest.fn(() => false),
      onPlanMatch: jest.fn(),
      onToggleSelect: jest.fn(),
      onToggleUnavailable: jest.fn(),
      formatSchedule: jest.fn((date, time) => `${date} ${time}`),
      isPlayerInMultipleMatches: jest.fn(() => false),
      onReorderSelectedPlayers: jest.fn()
    };

    // Reset mock drag hook
    Object.assign(mockDragHook, {
      isDragging: false,
      draggedItemId: null,
      dropIndex: null,
      ghostPosition: null,
      handlePointerStart: jest.fn(),
      isItemBeingDragged: jest.fn(() => false),
      isItemDragActivating: jest.fn(() => false),
      getItemShift: jest.fn(() => 0),
      shouldSuppressClick: jest.fn(() => false)
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Component Rendering', () => {
    it('should render match information correctly', () => {
      render(<MatchCard {...defaultProps} />);

      expect(screen.getByText('Opponent Team')).toBeInTheDocument();
      expect(screen.getByText('2026-02-15 10:00')).toBeInTheDocument();
    });

    it('should render Save button when not planned', () => {
      render(<MatchCard {...defaultProps} />);

      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('should show Saved button when planning status is done', () => {
      const props = {
        ...defaultProps,
        planningStatus: 'done'
      };
      render(<MatchCard {...props} />);

      expect(screen.getByText('Saved')).toBeInTheDocument();
    });

    it('should show Saving... button when planning status is loading', () => {
      const props = {
        ...defaultProps,
        planningStatus: 'loading'
      };
      render(<MatchCard {...props} />);

      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    it('should render selected players list', () => {
      render(<MatchCard {...defaultProps} />);

      expect(screen.getByText('Player 1')).toBeInTheDocument();
      expect(screen.getByText('Player 2')).toBeInTheDocument();
    });

    it('should show empty message when no players selected', () => {
      const props = {
        ...defaultProps,
        selectedIds: []
      };
      render(<MatchCard {...props} />);

      expect(screen.getByText('Empty.')).toBeInTheDocument();
    });

    it('should render player selector', () => {
      render(<MatchCard {...defaultProps} />);

      expect(screen.getByTestId('player-selector')).toBeInTheDocument();
    });
  });

  describe('Drag and Drop Integration', () => {
    it('should initialize useListDragAndDrop with correct parameters', () => {
      render(<MatchCard {...defaultProps} />);

      expect(useListDragAndDrop).toHaveBeenCalledWith(
        expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({ id: '1' }),
            expect.objectContaining({ id: '2' })
          ]),
          onReorder: expect.any(Function),
          containerRef: expect.objectContaining({ current: expect.any(Object) }),
          activationThreshold: { time: 300, distance: 10 }
        })
      );
    });

    it('should pass handlePointerStart to DraggablePlayerCard', () => {
      const { container } = render(<MatchCard {...defaultProps} />);

      const playerCard = container.querySelector('[data-drag-item-id="1"]');
      expect(playerCard).toBeInTheDocument();

      fireEvent.pointerDown(playerCard, {
        pointerId: 1,
        clientX: 100,
        clientY: 100
      });

      expect(mockDragHook.handlePointerStart).toHaveBeenCalledWith(
        '1',
        expect.any(Object)
      );
    });

    it('should apply isDragging state to dragged item', () => {
      mockDragHook.isDragging = true;
      mockDragHook.draggedItemId = '1';
      mockDragHook.isItemBeingDragged = jest.fn((id) => id === '1');

      const { container } = render(<MatchCard {...defaultProps} />);

      const playerCard = container.querySelector('[data-drag-item-id="1"]');
      expect(playerCard).toHaveStyle({ opacity: 0.3 });
    });

    it('should apply shift transform to items during drag', () => {
      mockDragHook.isDragging = true;
      mockDragHook.draggedItemId = '1';
      mockDragHook.getItemShift = jest.fn((id) => (id === '2' ? 48 : 0));

      const { container } = render(<MatchCard {...defaultProps} />);

      const player2Card = container.querySelector('[data-drag-item-id="2"]');
      expect(player2Card).toHaveStyle({ transform: 'translateY(48px)' });
    });

    it('should render ghost card when dragging', () => {
      mockDragHook.isDragging = true;
      mockDragHook.draggedItemId = '1';
      mockDragHook.ghostPosition = { x: 200, y: 300 };

      render(<MatchCard {...defaultProps} />);

      const portal = screen.getByTestId('portal');
      expect(portal).toBeInTheDocument();

      const ghostCard = portal.querySelector('.ghost-card');
      expect(ghostCard).toBeInTheDocument();
      expect(ghostCard).toHaveStyle({
        left: '200px',
        top: '300px',
        transform: 'translate(-50%, -50%) scale(1.05)'
      });
    });

    it('should not render ghost card when not dragging', () => {
      mockDragHook.isDragging = false;
      mockDragHook.ghostPosition = null;

      render(<MatchCard {...defaultProps} />);

      expect(screen.queryByTestId('portal')).not.toBeInTheDocument();
    });

    it('should call onReorderSelectedPlayers when drag completes', () => {
      const { container } = render(<MatchCard {...defaultProps} />);

      // Get the onReorder callback passed to useListDragAndDrop
      const onReorderCallback = useListDragAndDrop.mock.calls[0][0].onReorder;

      const reorderedPlayers = [mockRoster[1], mockRoster[0]];

      act(() => {
        onReorderCallback(reorderedPlayers);
      });

      expect(defaultProps.onReorderSelectedPlayers).toHaveBeenCalledWith(
        'match-1',
        ['2', '1']
      );
    });

    it('should not call onReorderSelectedPlayers if callback not provided', () => {
      const props = {
        ...defaultProps,
        onReorderSelectedPlayers: undefined
      };

      render(<MatchCard {...props} />);

      const onReorderCallback = useListDragAndDrop.mock.calls[0][0].onReorder;

      const reorderedPlayers = [mockRoster[1], mockRoster[0]];

      // Should not crash
      expect(() => {
        onReorderCallback(reorderedPlayers);
      }).not.toThrow();
    });

    it('should apply drag activating state to items', () => {
      mockDragHook.isItemDragActivating = jest.fn((id) => id === '1');

      const { container } = render(<MatchCard {...defaultProps} />);

      const player1Card = container.querySelector('[data-drag-item-id="1"]');
      expect(player1Card).toHaveClass('drag-activating');
    });

    it('should suppress click after drag', () => {
      mockDragHook.shouldSuppressClick = jest.fn((id) => id === '1');

      const { container } = render(<MatchCard {...defaultProps} />);

      const player1Card = container.querySelector('[data-drag-item-id="1"]');
      fireEvent.click(player1Card);

      // Click should be suppressed, onToggleSelect should not be called
      expect(defaultProps.onToggleSelect).not.toHaveBeenCalled();
    });

    it('should allow click when not suppressed', () => {
      mockDragHook.shouldSuppressClick = jest.fn(() => false);

      const { container } = render(<MatchCard {...defaultProps} />);

      const player1Card = container.querySelector('[data-drag-item-id="1"]');
      fireEvent.click(player1Card);

      expect(defaultProps.onToggleSelect).toHaveBeenCalledWith('1');
    });
  });

  describe('Player Selection Behavior', () => {
    it('should toggle player selection on click', () => {
      const { container } = render(<MatchCard {...defaultProps} />);

      const playerCard = container.querySelector('[data-drag-item-id="1"]');
      fireEvent.click(playerCard);

      expect(defaultProps.onToggleSelect).toHaveBeenCalledWith('1');
    });

    it('should show special styling for players in multiple matches', () => {
      const props = {
        ...defaultProps,
        isPlayerInMultipleMatches: jest.fn((id) => id === '1')
      };

      const { container } = render(<MatchCard {...props} />);

      const player1Card = container.querySelector('[data-drag-item-id="1"]');
      expect(player1Card).toHaveClass('border-sky-400');
      expect(player1Card).toHaveClass('shadow-lg');
    });

    it('should show special styling for players only available here', () => {
      const props = {
        ...defaultProps,
        isSelectedAndOnlyAvailableHere: jest.fn((id) => id === '1')
      };

      const { container } = render(<MatchCard {...props} />);

      const player1Card = container.querySelector('[data-drag-item-id="1"]');
      expect(player1Card).toHaveClass('border-orange-400');
    });
  });

  describe('Match Planning Actions', () => {
    it('should call onPlanMatch when Save button clicked', () => {
      render(<MatchCard {...defaultProps} />);

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      expect(defaultProps.onPlanMatch).toHaveBeenCalled();
    });

    it('should disable Save button when planning', () => {
      const props = {
        ...defaultProps,
        planningStatus: 'loading'
      };
      render(<MatchCard {...props} />);

      const saveButton = screen.getByText('Saving...');
      expect(saveButton).toBeDisabled();
    });

    it('should disable Save button when planned', () => {
      const props = {
        ...defaultProps,
        planningStatus: 'done'
      };
      render(<MatchCard {...props} />);

      const saveButton = screen.getByText('Saved');
      expect(saveButton).toBeDisabled();
    });

    it('should disable Save button when cannot plan', () => {
      const props = {
        ...defaultProps,
        canPlan: false
      };
      render(<MatchCard {...props} />);

      const saveButton = screen.getByText('Save');
      expect(saveButton).toBeDisabled();
    });
  });

  describe('Roster Management', () => {
    it('should separate available and unavailable players', () => {
      const props = {
        ...defaultProps,
        unavailableIds: ['3']
      };

      render(<MatchCard {...props} />);

      // Available players should be shown first in selector
      const selector = screen.getByTestId('player-selector');
      expect(selector).toBeInTheDocument();
    });

    it('should show correct player counts', () => {
      render(<MatchCard {...defaultProps} />);

      expect(screen.getByText('3')).toBeInTheDocument(); // Roster count
      expect(screen.getByText('2')).toBeInTheDocument(); // Selected count
    });

    it('should handle empty roster', () => {
      const props = {
        ...defaultProps,
        roster: [],
        selectedIds: []
      };

      render(<MatchCard {...props} />);

      expect(screen.getByText('Empty.')).toBeInTheDocument();
    });

    it('should handle all players unavailable', () => {
      const props = {
        ...defaultProps,
        unavailableIds: ['1', '2', '3']
      };

      render(<MatchCard {...props} />);

      const selector = screen.getByTestId('player-selector');
      expect(selector).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle selectedIds with invalid player IDs', () => {
      const props = {
        ...defaultProps,
        selectedIds: ['1', '999', '2'] // 999 is invalid
      };

      render(<MatchCard {...props} />);

      // Should only show valid players
      expect(screen.getByText('Player 1')).toBeInTheDocument();
      expect(screen.getByText('Player 2')).toBeInTheDocument();
      expect(screen.queryByText('Player 999')).not.toBeInTheDocument();
    });

    it('should handle null roster gracefully', () => {
      const props = {
        ...defaultProps,
        roster: null,
        selectedIds: []
      };

      // Should not crash
      expect(() => {
        render(<MatchCard {...props} />);
      }).not.toThrow();
    });

    it('should handle undefined unavailableIds', () => {
      const props = {
        ...defaultProps,
        unavailableIds: undefined
      };

      // Should not crash
      expect(() => {
        render(<MatchCard {...props} />);
      }).not.toThrow();
    });

    it('should handle missing match information', () => {
      const props = {
        ...defaultProps,
        match: {
          id: 'match-1',
          opponent: '',
          matchDate: '',
          matchTime: ''
        }
      };

      render(<MatchCard {...props} />);

      // Should render without crashing
      expect(screen.getByTestId('player-selector')).toBeInTheDocument();
    });

    it('should handle reorder with empty selected list', () => {
      const props = {
        ...defaultProps,
        selectedIds: []
      };

      render(<MatchCard {...props} />);

      const onReorderCallback = useListDragAndDrop.mock.calls[0][0].onReorder;

      // Should not crash
      expect(() => {
        onReorderCallback([]);
      }).not.toThrow();
    });

    it('should maintain ghost card position accuracy during drag', () => {
      mockDragHook.isDragging = true;
      mockDragHook.draggedItemId = '1';
      mockDragHook.ghostPosition = { x: 150.5, y: 250.75 };

      render(<MatchCard {...defaultProps} />);

      const ghostCard = screen.getByTestId('portal').querySelector('.ghost-card');

      expect(ghostCard).toHaveStyle({
        left: '150.5px',
        top: '250.75px'
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible player cards', () => {
      const { container } = render(<MatchCard {...defaultProps} />);

      const playerCards = container.querySelectorAll('[role="button"]');
      expect(playerCards.length).toBeGreaterThan(0);

      playerCards.forEach((card) => {
        expect(card).toHaveAttribute('tabIndex', '0');
      });
    });

    it('should support keyboard interaction on player cards', () => {
      const { container } = render(<MatchCard {...defaultProps} />);

      const playerCard = container.querySelector('[data-drag-item-id="1"]');
      fireEvent.keyDown(playerCard, { key: 'Enter' });

      expect(defaultProps.onToggleSelect).toHaveBeenCalledWith('1');
    });
  });
});
