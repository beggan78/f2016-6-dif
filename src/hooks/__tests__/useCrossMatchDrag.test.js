/**
 * Tests for useCrossMatchDrag hook
 * Cross-match player swap via drag-and-drop coordination
 */

import { renderHook, act } from '@testing-library/react';
import { useCrossMatchDrag } from '../useCrossMatchDrag';

describe('useCrossMatchDrag', () => {
  let defaultProps;
  let mockOnSwapPlayers;

  const createMockContainer = (matchId, playerIds, rect) => {
    const container = document.createElement('div');
    container.getBoundingClientRect = jest.fn(() => rect);

    playerIds.forEach((id, index) => {
      const node = document.createElement('div');
      node.dataset.dragItemId = String(id);
      node.getBoundingClientRect = jest.fn(() => ({
        top: rect.top + index * 40,
        left: rect.left,
        right: rect.right,
        bottom: rect.top + (index + 1) * 40,
        width: rect.right - rect.left,
        height: 40
      }));
      container.appendChild(node);
    });

    return { current: container };
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockOnSwapPlayers = jest.fn();

    defaultProps = {
      selectedPlayersByMatch: {
        'match-1': ['p1', 'p2', 'p3'],
        'match-2': ['p4', 'p5', 'p6']
      },
      unavailablePlayersByMatch: {},
      onSwapPlayers: mockOnSwapPlayers
    };
  });

  describe('Initialization', () => {
    it('should return initial state', () => {
      const { result } = renderHook(() => useCrossMatchDrag(defaultProps));

      expect(result.current.crossMatchState).toEqual({
        active: false,
        sourceMatchId: null,
        sourcePlayerId: null,
        targetMatchId: null,
        hoveredPlayerId: null,
        isEligible: false
      });
      expect(result.current.swapAnimation).toBeNull();
      expect(result.current.registerContainer).toBeInstanceOf(Function);
      expect(result.current.handleDragMove).toBeInstanceOf(Function);
      expect(result.current.handleDragEnd).toBeInstanceOf(Function);
    });
  });

  describe('Container Registration', () => {
    it('should register and return cleanup function', () => {
      const { result } = renderHook(() => useCrossMatchDrag(defaultProps));
      const containerRef = { current: document.createElement('div') };

      let cleanup;
      act(() => {
        cleanup = result.current.registerContainer('match-1', containerRef);
      });

      expect(cleanup).toBeInstanceOf(Function);
    });

    it('should cleanup on unmount', () => {
      const { result } = renderHook(() => useCrossMatchDrag(defaultProps));
      const containerRef = { current: document.createElement('div') };

      let cleanup;
      act(() => {
        cleanup = result.current.registerContainer('match-1', containerRef);
      });

      // After cleanup, dragging over the container area should not find a target
      act(() => {
        cleanup();
      });

      act(() => {
        result.current.handleDragMove(
          { itemId: 'p4', clientX: 100, clientY: 120 },
          'match-2'
        );
      });

      expect(result.current.crossMatchState.active).toBe(false);
    });
  });

  describe('Drag Move - Target Detection', () => {
    it('should detect pointer over target container and player', () => {
      const { result } = renderHook(() => useCrossMatchDrag(defaultProps));

      const containerA = createMockContainer('match-1', ['p1', 'p2'], {
        top: 0, left: 0, right: 200, bottom: 100, width: 200, height: 100
      });
      const containerB = createMockContainer('match-2', ['p4', 'p5'], {
        top: 0, left: 250, right: 450, bottom: 100, width: 200, height: 100
      });

      act(() => {
        result.current.registerContainer('match-1', containerA);
        result.current.registerContainer('match-2', containerB);
      });

      // Drag from match-1, pointer over match-2 (over p4)
      act(() => {
        result.current.handleDragMove(
          { itemId: 'p1', clientX: 300, clientY: 20 },
          'match-1'
        );
      });

      expect(result.current.crossMatchState).toEqual({
        active: true,
        sourceMatchId: 'match-1',
        sourcePlayerId: 'p1',
        targetMatchId: 'match-2',
        hoveredPlayerId: 'p4',
        isEligible: true
      });
    });

    it('should not detect source container as target', () => {
      const { result } = renderHook(() => useCrossMatchDrag(defaultProps));

      const containerA = createMockContainer('match-1', ['p1', 'p2'], {
        top: 0, left: 0, right: 200, bottom: 100, width: 200, height: 100
      });

      act(() => {
        result.current.registerContainer('match-1', containerA);
      });

      // Pointer inside source container
      act(() => {
        result.current.handleDragMove(
          { itemId: 'p1', clientX: 100, clientY: 50 },
          'match-1'
        );
      });

      expect(result.current.crossMatchState.active).toBe(false);
    });

    it('should clear state when pointer leaves all containers', () => {
      const { result } = renderHook(() => useCrossMatchDrag(defaultProps));

      const containerA = createMockContainer('match-1', ['p1'], {
        top: 0, left: 0, right: 200, bottom: 100, width: 200, height: 100
      });
      const containerB = createMockContainer('match-2', ['p4'], {
        top: 0, left: 250, right: 450, bottom: 100, width: 200, height: 100
      });

      act(() => {
        result.current.registerContainer('match-1', containerA);
        result.current.registerContainer('match-2', containerB);
      });

      // First, move over target
      act(() => {
        result.current.handleDragMove(
          { itemId: 'p1', clientX: 300, clientY: 20 },
          'match-1'
        );
      });

      expect(result.current.crossMatchState.active).toBe(true);

      // Now move outside both containers
      act(() => {
        result.current.handleDragMove(
          { itemId: 'p1', clientX: 500, clientY: 500 },
          'match-1'
        );
      });

      expect(result.current.crossMatchState.active).toBe(false);
    });

    it('should set hoveredPlayerId to null when over container but not over a player', () => {
      const { result } = renderHook(() => useCrossMatchDrag(defaultProps));

      const containerB = createMockContainer('match-2', ['p4'], {
        top: 0, left: 250, right: 450, bottom: 200, width: 200, height: 200
      });

      act(() => {
        result.current.registerContainer('match-2', containerB);
      });

      // First hover over a player to set active state
      act(() => {
        result.current.handleDragMove(
          { itemId: 'p1', clientX: 300, clientY: 20 },
          'match-1'
        );
      });

      expect(result.current.crossMatchState.hoveredPlayerId).toBe('p4');

      // Now pointer in container but below all player cards (p4 is at 0-40)
      act(() => {
        result.current.handleDragMove(
          { itemId: 'p1', clientX: 300, clientY: 150 },
          'match-1'
        );
      });

      expect(result.current.crossMatchState.active).toBe(true);
      expect(result.current.crossMatchState.hoveredPlayerId).toBe(null);
      expect(result.current.crossMatchState.isEligible).toBe(false);
    });
  });

  describe('Eligibility Checks', () => {
    it('should mark as ineligible when dragged player is unavailable in target match', () => {
      const props = {
        ...defaultProps,
        unavailablePlayersByMatch: {
          'match-2': ['p1'] // p1 is unavailable in match-2
        }
      };

      const { result } = renderHook(() => useCrossMatchDrag(props));

      const containerB = createMockContainer('match-2', ['p4', 'p5'], {
        top: 0, left: 250, right: 450, bottom: 100, width: 200, height: 100
      });

      act(() => {
        result.current.registerContainer('match-2', containerB);
      });

      act(() => {
        result.current.handleDragMove(
          { itemId: 'p1', clientX: 300, clientY: 20 },
          'match-1'
        );
      });

      expect(result.current.crossMatchState.isEligible).toBe(false);
    });

    it('should mark as ineligible when hovered player is unavailable in source match', () => {
      const props = {
        ...defaultProps,
        unavailablePlayersByMatch: {
          'match-1': ['p4'] // p4 is unavailable in match-1
        }
      };

      const { result } = renderHook(() => useCrossMatchDrag(props));

      const containerB = createMockContainer('match-2', ['p4', 'p5'], {
        top: 0, left: 250, right: 450, bottom: 100, width: 200, height: 100
      });

      act(() => {
        result.current.registerContainer('match-2', containerB);
      });

      act(() => {
        result.current.handleDragMove(
          { itemId: 'p1', clientX: 300, clientY: 20 },
          'match-1'
        );
      });

      // Hovering over p4 which is unavailable in match-1
      expect(result.current.crossMatchState.hoveredPlayerId).toBe('p4');
      expect(result.current.crossMatchState.isEligible).toBe(false);
    });

    it('should mark as ineligible when hovered player is already selected in source match', () => {
      const props = {
        ...defaultProps,
        selectedPlayersByMatch: {
          'match-1': ['p1', 'p2', 'p4'], // p4 is also selected in match-1
          'match-2': ['p4', 'p5', 'p6']
        }
      };

      const { result } = renderHook(() => useCrossMatchDrag(props));

      const containerB = createMockContainer('match-2', ['p4', 'p5'], {
        top: 0, left: 250, right: 450, bottom: 100, width: 200, height: 100
      });

      act(() => {
        result.current.registerContainer('match-2', containerB);
      });

      act(() => {
        result.current.handleDragMove(
          { itemId: 'p1', clientX: 300, clientY: 20 },
          'match-1'
        );
      });

      expect(result.current.crossMatchState.hoveredPlayerId).toBe('p4');
      expect(result.current.crossMatchState.isEligible).toBe(false);
    });

    it('should mark as ineligible when dragged player is already selected in target match', () => {
      const props = {
        ...defaultProps,
        selectedPlayersByMatch: {
          'match-1': ['p1', 'p2', 'p3'],
          'match-2': ['p1', 'p4', 'p5'] // p1 is also selected in match-2
        }
      };

      const { result } = renderHook(() => useCrossMatchDrag(props));

      const containerB = createMockContainer('match-2', ['p4', 'p5'], {
        top: 0, left: 250, right: 450, bottom: 100, width: 200, height: 100
      });

      act(() => {
        result.current.registerContainer('match-2', containerB);
      });

      act(() => {
        result.current.handleDragMove(
          { itemId: 'p1', clientX: 300, clientY: 20 },
          'match-1'
        );
      });

      expect(result.current.crossMatchState.hoveredPlayerId).toBe('p4');
      expect(result.current.crossMatchState.isEligible).toBe(false);
    });

    it('should mark as eligible when both players are available', () => {
      const { result } = renderHook(() => useCrossMatchDrag(defaultProps));

      const containerB = createMockContainer('match-2', ['p4'], {
        top: 0, left: 250, right: 450, bottom: 100, width: 200, height: 100
      });

      act(() => {
        result.current.registerContainer('match-2', containerB);
      });

      act(() => {
        result.current.handleDragMove(
          { itemId: 'p1', clientX: 300, clientY: 20 },
          'match-1'
        );
      });

      expect(result.current.crossMatchState.isEligible).toBe(true);
    });
  });

  describe('Drag End - Swap Execution', () => {
    it('should call onSwapPlayers on valid drop', () => {
      const { result } = renderHook(() => useCrossMatchDrag(defaultProps));

      const containerB = createMockContainer('match-2', ['p4'], {
        top: 0, left: 250, right: 450, bottom: 100, width: 200, height: 100
      });

      act(() => {
        result.current.registerContainer('match-2', containerB);
      });

      act(() => {
        result.current.handleDragMove(
          { itemId: 'p1', clientX: 300, clientY: 20 },
          'match-1'
        );
      });

      act(() => {
        result.current.handleDragEnd({ cancelled: false }, 'match-1');
      });

      expect(mockOnSwapPlayers).toHaveBeenCalledWith('match-1', 'p1', 'match-2', 'p4');
    });

    it('should not call onSwapPlayers when cancelled', () => {
      const { result } = renderHook(() => useCrossMatchDrag(defaultProps));

      const containerB = createMockContainer('match-2', ['p4'], {
        top: 0, left: 250, right: 450, bottom: 100, width: 200, height: 100
      });

      act(() => {
        result.current.registerContainer('match-2', containerB);
      });

      act(() => {
        result.current.handleDragMove(
          { itemId: 'p1', clientX: 300, clientY: 20 },
          'match-1'
        );
      });

      act(() => {
        result.current.handleDragEnd({ cancelled: true }, 'match-1');
      });

      expect(mockOnSwapPlayers).not.toHaveBeenCalled();
    });

    it('should not call onSwapPlayers when not eligible', () => {
      const props = {
        ...defaultProps,
        unavailablePlayersByMatch: {
          'match-2': ['p1']
        }
      };

      const { result } = renderHook(() => useCrossMatchDrag(props));

      const containerB = createMockContainer('match-2', ['p4'], {
        top: 0, left: 250, right: 450, bottom: 100, width: 200, height: 100
      });

      act(() => {
        result.current.registerContainer('match-2', containerB);
      });

      act(() => {
        result.current.handleDragMove(
          { itemId: 'p1', clientX: 300, clientY: 20 },
          'match-1'
        );
      });

      act(() => {
        result.current.handleDragEnd({ cancelled: false }, 'match-1');
      });

      expect(mockOnSwapPlayers).not.toHaveBeenCalled();
    });

    it('should reset state after drag end', () => {
      const { result } = renderHook(() => useCrossMatchDrag(defaultProps));

      const containerB = createMockContainer('match-2', ['p4'], {
        top: 0, left: 250, right: 450, bottom: 100, width: 200, height: 100
      });

      act(() => {
        result.current.registerContainer('match-2', containerB);
      });

      act(() => {
        result.current.handleDragMove(
          { itemId: 'p1', clientX: 300, clientY: 20 },
          'match-1'
        );
      });

      expect(result.current.crossMatchState.active).toBe(true);

      act(() => {
        result.current.handleDragEnd({ cancelled: false }, 'match-1');
      });

      expect(result.current.crossMatchState).toEqual({
        active: false,
        sourceMatchId: null,
        sourcePlayerId: null,
        targetMatchId: null,
        hoveredPlayerId: null,
        isEligible: false
      });
    });

    it('should reset state on cancelled drag end', () => {
      const { result } = renderHook(() => useCrossMatchDrag(defaultProps));

      const containerB = createMockContainer('match-2', ['p4'], {
        top: 0, left: 250, right: 450, bottom: 100, width: 200, height: 100
      });

      act(() => {
        result.current.registerContainer('match-2', containerB);
      });

      act(() => {
        result.current.handleDragMove(
          { itemId: 'p1', clientX: 300, clientY: 20 },
          'match-1'
        );
      });

      act(() => {
        result.current.handleDragEnd({ cancelled: true }, 'match-1');
      });

      expect(result.current.crossMatchState.active).toBe(false);
    });
  });

  describe('State Update Optimization', () => {
    it('should not update state when hovered player has not changed', () => {
      const { result } = renderHook(() => useCrossMatchDrag(defaultProps));

      const containerB = createMockContainer('match-2', ['p4'], {
        top: 0, left: 250, right: 450, bottom: 40, width: 200, height: 40
      });

      act(() => {
        result.current.registerContainer('match-2', containerB);
      });

      // First move - over p4
      act(() => {
        result.current.handleDragMove(
          { itemId: 'p1', clientX: 300, clientY: 20 },
          'match-1'
        );
      });

      const stateAfterFirst = result.current.crossMatchState;

      // Second move - still over p4 (slightly different position)
      act(() => {
        result.current.handleDragMove(
          { itemId: 'p1', clientX: 310, clientY: 25 },
          'match-1'
        );
      });

      // Should be the same reference (no re-render)
      expect(result.current.crossMatchState).toBe(stateAfterFirst);
    });
  });

  describe('No-op Behavior', () => {
    it('should be a no-op when no containers are registered', () => {
      const { result } = renderHook(() => useCrossMatchDrag(defaultProps));

      act(() => {
        result.current.handleDragMove(
          { itemId: 'p1', clientX: 100, clientY: 100 },
          'match-1'
        );
      });

      expect(result.current.crossMatchState.active).toBe(false);
    });

    it('should handle drag end when not active gracefully', () => {
      const { result } = renderHook(() => useCrossMatchDrag(defaultProps));

      act(() => {
        result.current.handleDragEnd({ cancelled: false }, 'match-1');
      });

      expect(mockOnSwapPlayers).not.toHaveBeenCalled();
    });
  });

  describe('Swap Animation', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should set swapAnimation with correct data after valid swap', () => {
      const { result } = renderHook(() => useCrossMatchDrag(defaultProps));

      const containerB = createMockContainer('match-2', ['p4'], {
        top: 0, left: 250, right: 450, bottom: 100, width: 200, height: 100
      });

      act(() => {
        result.current.registerContainer('match-2', containerB);
      });

      act(() => {
        result.current.handleDragMove(
          { itemId: 'p1', clientX: 300, clientY: 20 },
          'match-1'
        );
      });

      act(() => {
        result.current.handleDragEnd({ cancelled: false }, 'match-1');
      });

      expect(result.current.swapAnimation).toEqual({
        playerId: 'p4',
        fromRect: expect.objectContaining({ top: 0, left: 250 }),
        toMatchId: 'match-1',
        sourcePlayerId: 'p1',
        sourceNewMatchId: 'match-2'
      });
    });

    it('should be null when swap is cancelled', () => {
      const { result } = renderHook(() => useCrossMatchDrag(defaultProps));

      const containerB = createMockContainer('match-2', ['p4'], {
        top: 0, left: 250, right: 450, bottom: 100, width: 200, height: 100
      });

      act(() => {
        result.current.registerContainer('match-2', containerB);
      });

      act(() => {
        result.current.handleDragMove(
          { itemId: 'p1', clientX: 300, clientY: 20 },
          'match-1'
        );
      });

      act(() => {
        result.current.handleDragEnd({ cancelled: true }, 'match-1');
      });

      expect(result.current.swapAnimation).toBeNull();
    });

    it('should clear swapAnimation after timeout', () => {
      const { result } = renderHook(() => useCrossMatchDrag(defaultProps));

      const containerB = createMockContainer('match-2', ['p4'], {
        top: 0, left: 250, right: 450, bottom: 100, width: 200, height: 100
      });

      act(() => {
        result.current.registerContainer('match-2', containerB);
      });

      act(() => {
        result.current.handleDragMove(
          { itemId: 'p1', clientX: 300, clientY: 20 },
          'match-1'
        );
      });

      act(() => {
        result.current.handleDragEnd({ cancelled: false }, 'match-1');
      });

      expect(result.current.swapAnimation).not.toBeNull();

      act(() => {
        jest.advanceTimersByTime(700);
      });

      expect(result.current.swapAnimation).toBeNull();
    });

    it('should be null for ineligible swaps', () => {
      const props = {
        ...defaultProps,
        unavailablePlayersByMatch: {
          'match-2': ['p1']
        }
      };

      const { result } = renderHook(() => useCrossMatchDrag(props));

      const containerB = createMockContainer('match-2', ['p4'], {
        top: 0, left: 250, right: 450, bottom: 100, width: 200, height: 100
      });

      act(() => {
        result.current.registerContainer('match-2', containerB);
      });

      act(() => {
        result.current.handleDragMove(
          { itemId: 'p1', clientX: 300, clientY: 20 },
          'match-1'
        );
      });

      act(() => {
        result.current.handleDragEnd({ cancelled: false }, 'match-1');
      });

      expect(result.current.swapAnimation).toBeNull();
    });
  });
});
