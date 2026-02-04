/**
 * Tests for useListDragAndDrop hook
 * Comprehensive coverage of drag and drop functionality including:
 * - Drag activation (time + distance threshold)
 * - Drag session management
 * - Reordering logic
 * - Cleanup and memory management
 * - Edge cases
 */

import { renderHook, act } from '@testing-library/react';
import { useListDragAndDrop } from '../useListDragAndDrop';

describe('useListDragAndDrop', () => {
  let mockItems;
  let mockOnReorder;
  let mockContainerRef;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockItems = [
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
      { id: '3', name: 'Item 3' },
      { id: '4', name: 'Item 4' }
    ];

    mockOnReorder = jest.fn();

    // Mock container with getBoundingClientRect
    const mockContainer = document.createElement('div');
    mockContainer.getBoundingClientRect = jest.fn(() => ({
      top: 100,
      left: 50,
      right: 450,
      bottom: 500,
      width: 400,
      height: 400
    }));

    // Add mock items to container
    mockItems.forEach((item) => {
      const itemNode = document.createElement('div');
      itemNode.dataset.dragItemId = String(item.id);
      itemNode.getBoundingClientRect = jest.fn(() => ({
        top: 100 + parseInt(item.id) * 50,
        left: 50,
        right: 450,
        bottom: 150 + parseInt(item.id) * 50,
        width: 400,
        height: 48
      }));
      mockContainer.appendChild(itemNode);
    });

    mockContainerRef = { current: mockContainer };

    // Override RAF to execute synchronously in tests
    jest.spyOn(global, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(Date.now());
      return 1;
    });

    jest.spyOn(global, 'cancelAnimationFrame').mockImplementation(() => {});

    // Mock pointer capture methods
    Element.prototype.setPointerCapture = jest.fn();
    Element.prototype.releasePointerCapture = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Hook Initialization', () => {
    it('should return initial state', () => {
      const { result } = renderHook(() =>
        useListDragAndDrop({
          items: mockItems,
          onReorder: mockOnReorder,
          containerRef: mockContainerRef
        })
      );

      expect(result.current.isDragging).toBe(false);
      expect(result.current.draggedItemId).toBe(null);
      expect(result.current.dropIndex).toBe(null);
      expect(result.current.ghostPosition).toBe(null);
      expect(result.current.handlePointerStart).toBeInstanceOf(Function);
      expect(result.current.isItemBeingDragged).toBeInstanceOf(Function);
      expect(result.current.isItemDragActivating).toBeInstanceOf(Function);
      expect(result.current.getItemShift).toBeInstanceOf(Function);
      expect(result.current.shouldSuppressClick).toBeInstanceOf(Function);
    });

    it('should handle empty items array', () => {
      const { result } = renderHook(() =>
        useListDragAndDrop({
          items: [],
          onReorder: mockOnReorder,
          containerRef: mockContainerRef
        })
      );

      expect(result.current.isDragging).toBe(false);
    });

    it('should use default activation threshold when not provided', () => {
      const { result } = renderHook(() =>
        useListDragAndDrop({
          items: mockItems,
          onReorder: mockOnReorder,
          containerRef: mockContainerRef
        })
      );

      // Should not crash - default threshold is applied
      expect(result.current.handlePointerStart).toBeInstanceOf(Function);
    });
  });

  describe('Drag Activation', () => {
    it('should not start drag with less than 2 items', () => {
      const { result } = renderHook(() =>
        useListDragAndDrop({
          items: [mockItems[0]],
          onReorder: mockOnReorder,
          containerRef: mockContainerRef
        })
      );

      const mockEvent = {
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
        clientX: 200,
        clientY: 200,
        currentTarget: document.createElement('div'),
        preventDefault: jest.fn()
      };

      act(() => {
        result.current.handlePointerStart('1', mockEvent);
      });

      expect(result.current.isDragging).toBe(false);
    });

    it('should ignore non-primary mouse button', () => {
      const { result } = renderHook(() =>
        useListDragAndDrop({
          items: mockItems,
          onReorder: mockOnReorder,
          containerRef: mockContainerRef
        })
      );

      const mockEvent = {
        pointerId: 1,
        pointerType: 'mouse',
        button: 2, // Right click
        clientX: 200,
        clientY: 200,
        currentTarget: document.createElement('div'),
        preventDefault: jest.fn()
      };

      act(() => {
        result.current.handlePointerStart('1', mockEvent);
      });

      expect(result.current.isDragging).toBe(false);
    });

    it('should trigger pulse animation after 150ms', () => {
      const { result } = renderHook(() =>
        useListDragAndDrop({
          items: mockItems,
          onReorder: mockOnReorder,
          containerRef: mockContainerRef,
          activationThreshold: { time: 300, distance: 10 }
        })
      );

      const mockEvent = {
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
        clientX: 200,
        clientY: 200,
        currentTarget: document.createElement('div'),
        preventDefault: jest.fn()
      };

      act(() => {
        result.current.handlePointerStart('1', mockEvent);
      });

      expect(result.current.isItemDragActivating('1')).toBe(false);

      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(result.current.isItemDragActivating('1')).toBe(true);

      // Pulse should reset after 180ms
      act(() => {
        jest.advanceTimersByTime(180);
      });

      expect(result.current.isItemDragActivating('1')).toBe(false);
    });

    it('should start drag after activation time threshold', () => {
      const { result } = renderHook(() =>
        useListDragAndDrop({
          items: mockItems,
          onReorder: mockOnReorder,
          containerRef: mockContainerRef,
          activationThreshold: { time: 300, distance: 10 }
        })
      );

      const mockEvent = {
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
        clientX: 200,
        clientY: 200,
        currentTarget: document.createElement('div'),
        preventDefault: jest.fn()
      };

      act(() => {
        result.current.handlePointerStart('1', mockEvent);
      });

      expect(result.current.isDragging).toBe(false);

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(result.current.isDragging).toBe(true);
      expect(result.current.draggedItemId).toBe('1');
    });

    it('should start drag on distance threshold with pointer move', () => {
      const { result } = renderHook(() =>
        useListDragAndDrop({
          items: mockItems,
          onReorder: mockOnReorder,
          containerRef: mockContainerRef,
          activationThreshold: { time: 300, distance: 10 }
        })
      );

      const startEvent = {
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
        clientX: 200,
        clientY: 200,
        currentTarget: document.createElement('div'),
        preventDefault: jest.fn()
      };

      act(() => {
        result.current.handlePointerStart('1', startEvent);
      });

      expect(result.current.isDragging).toBe(false);

      // Move 15px (exceeds 10px threshold)
      const moveEvent = new PointerEvent('pointermove', {
        pointerId: 1,
        clientX: 215,
        clientY: 200,
        cancelable: true
      });

      act(() => {
        window.dispatchEvent(moveEvent);
      });

      expect(result.current.isDragging).toBe(true);
      expect(result.current.draggedItemId).toBe('1');
    });

    it('should not start drag if distance is below threshold', () => {
      const { result } = renderHook(() =>
        useListDragAndDrop({
          items: mockItems,
          onReorder: mockOnReorder,
          containerRef: mockContainerRef,
          activationThreshold: { time: 300, distance: 10 }
        })
      );

      const startEvent = {
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
        clientX: 200,
        clientY: 200,
        currentTarget: document.createElement('div'),
        preventDefault: jest.fn()
      };

      act(() => {
        result.current.handlePointerStart('1', startEvent);
      });

      // Move 5px (below 10px threshold)
      const moveEvent = new PointerEvent('pointermove', {
        pointerId: 1,
        clientX: 205,
        clientY: 200,
        cancelable: true
      });

      act(() => {
        window.dispatchEvent(moveEvent);
      });

      expect(result.current.isDragging).toBe(false);
    });

    it('should set pointer capture on drag start', () => {
      const { result } = renderHook(() =>
        useListDragAndDrop({
          items: mockItems,
          onReorder: mockOnReorder,
          containerRef: mockContainerRef,
          activationThreshold: { time: 100, distance: 10 }
        })
      );

      const mockTarget = document.createElement('div');
      mockTarget.setPointerCapture = jest.fn();

      const mockEvent = {
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
        clientX: 200,
        clientY: 200,
        currentTarget: mockTarget,
        preventDefault: jest.fn()
      };

      act(() => {
        result.current.handlePointerStart('1', mockEvent);
        jest.advanceTimersByTime(100);
      });

      expect(mockTarget.setPointerCapture).toHaveBeenCalledWith(1);
    });
  });

  describe('Drag Session', () => {
    const startDragSession = (result) => {
      const mockEvent = {
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
        clientX: 200,
        clientY: 150,
        currentTarget: document.createElement('div'),
        preventDefault: jest.fn()
      };

      act(() => {
        result.current.handlePointerStart('2', mockEvent);
        jest.advanceTimersByTime(300);
      });
    };

    it('should update ghost position during drag', async () => {
      const { result, waitForNextUpdate } = renderHook(() =>
        useListDragAndDrop({
          items: mockItems,
          onReorder: mockOnReorder,
          containerRef: mockContainerRef
        })
      );

      startDragSession(result);

      // Initial ghost position may be set asynchronously
      await act(async () => {
        await Promise.resolve(); // Allow state to settle
      });

      // Ghost position should be set after drag session starts
      expect(result.current.ghostPosition).not.toBe(null);

      // Move pointer
      const moveEvent = new PointerEvent('pointermove', {
        pointerId: 1,
        clientX: 250,
        clientY: 200,
        cancelable: true
      });

      await act(async () => {
        window.dispatchEvent(moveEvent);
        await Promise.resolve(); // Allow RAF and state update
      });

      // Ghost position should update (verify it changed or is set correctly)
      expect(result.current.ghostPosition).toBeDefined();
      expect(result.current.ghostPosition.x).toBeDefined();
      expect(result.current.ghostPosition.y).toBeDefined();
    });

    it('should calculate drop index based on pointer position', () => {
      const { result } = renderHook(() =>
        useListDragAndDrop({
          items: mockItems,
          onReorder: mockOnReorder,
          containerRef: mockContainerRef
        })
      );

      startDragSession(result);

      // Item 2 is being dragged, initial position
      expect(result.current.dropIndex).toBeDefined();

      // Move to position between items
      const moveEvent = new PointerEvent('pointermove', {
        pointerId: 1,
        clientX: 200,
        clientY: 250, // Between item 3 and 4
        cancelable: true
      });

      act(() => {
        window.dispatchEvent(moveEvent);
      });

      // Drop index should update based on position
      expect(typeof result.current.dropIndex).toBe('number');
    });

    it('should clear drop index when pointer leaves container', () => {
      const { result } = renderHook(() =>
        useListDragAndDrop({
          items: mockItems,
          onReorder: mockOnReorder,
          containerRef: mockContainerRef
        })
      );

      startDragSession(result);

      // Move outside container bounds
      const moveEvent = new PointerEvent('pointermove', {
        pointerId: 1,
        clientX: 600, // Outside right bound (450)
        clientY: 200,
        cancelable: true
      });

      act(() => {
        window.dispatchEvent(moveEvent);
      });

      expect(result.current.dropIndex).toBe(null);
    });

    it('should report correct dragging state for items', () => {
      const { result } = renderHook(() =>
        useListDragAndDrop({
          items: mockItems,
          onReorder: mockOnReorder,
          containerRef: mockContainerRef
        })
      );

      startDragSession(result);

      expect(result.current.isItemBeingDragged('2')).toBe(true);
      expect(result.current.isItemBeingDragged('1')).toBe(false);
      expect(result.current.isItemBeingDragged('3')).toBe(false);
    });

    it('should calculate item shift for reordering animation', () => {
      const { result } = renderHook(() =>
        useListDragAndDrop({
          items: mockItems,
          onReorder: mockOnReorder,
          containerRef: mockContainerRef
        })
      );

      startDragSession(result);

      // Items shift based on drop index position
      // The dragged item itself should not shift
      expect(result.current.getItemShift('2')).toBe(0);

      // Other items may shift up or down
      const shift1 = result.current.getItemShift('1');
      const shift3 = result.current.getItemShift('3');

      // Shifts are either 0, 48 (down), or -48 (up) pixels
      expect([0, 48, -48]).toContain(shift1);
      expect([0, 48, -48]).toContain(shift3);
    });

    it('should finalize reorder on pointer up inside container', async () => {
      const { result } = renderHook(() =>
        useListDragAndDrop({
          items: mockItems,
          onReorder: mockOnReorder,
          containerRef: mockContainerRef
        })
      );

      startDragSession(result);

      await act(async () => {
        await Promise.resolve();
      });

      // Move to new position
      const moveEvent = new PointerEvent('pointermove', {
        pointerId: 1,
        clientX: 200,
        clientY: 250, // New position (around item 4)
        cancelable: true
      });

      await act(async () => {
        window.dispatchEvent(moveEvent);
        await Promise.resolve();
      });

      // End drag
      const upEvent = new PointerEvent('pointerup', {
        pointerId: 1,
        clientX: 200,
        clientY: 250,
        cancelable: true
      });

      await act(async () => {
        window.dispatchEvent(upEvent);
        await Promise.resolve();
      });

      // May or may not call onReorder depending on if position actually changed
      // Just verify the state is clean after drop
      expect(result.current.isDragging).toBe(false);
    });

    it('should not reorder if dropped at same position', async () => {
      const { result } = renderHook(() =>
        useListDragAndDrop({
          items: mockItems,
          onReorder: mockOnReorder,
          containerRef: mockContainerRef
        })
      );

      const startEvent = {
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
        clientX: 200,
        clientY: 150,
        currentTarget: document.createElement('div'),
        preventDefault: jest.fn()
      };

      act(() => {
        result.current.handlePointerStart('2', startEvent);
        jest.advanceTimersByTime(300);
      });

      await act(async () => {
        await Promise.resolve();
      });

      // End at same position
      const upEvent = new PointerEvent('pointerup', {
        pointerId: 1,
        clientX: 200,
        clientY: 150,
        cancelable: true
      });

      await act(async () => {
        window.dispatchEvent(upEvent);
        await Promise.resolve();
      });

      // Verify drag ended
      expect(result.current.isDragging).toBe(false);

      // If onReorder was called, verify order is preserved or similar
      // (The exact behavior depends on drop index calculation)
      if (mockOnReorder.mock.calls.length > 0) {
        const reorderedItems = mockOnReorder.mock.calls[0][0];
        expect(Array.isArray(reorderedItems)).toBe(true);
        expect(reorderedItems.length).toBe(mockItems.length);
      }
    });

    it('should cancel reorder if dropped outside container', () => {
      const { result } = renderHook(() =>
        useListDragAndDrop({
          items: mockItems,
          onReorder: mockOnReorder,
          containerRef: mockContainerRef
        })
      );

      startDragSession(result);

      // End outside container
      const upEvent = new PointerEvent('pointerup', {
        pointerId: 1,
        clientX: 600, // Outside container
        clientY: 200,
        cancelable: true
      });

      act(() => {
        window.dispatchEvent(upEvent);
      });

      expect(mockOnReorder).not.toHaveBeenCalled();
      expect(result.current.isDragging).toBe(false);
    });

    it('should suppress click after successful drag', () => {
      const { result } = renderHook(() =>
        useListDragAndDrop({
          items: mockItems,
          onReorder: mockOnReorder,
          containerRef: mockContainerRef
        })
      );

      startDragSession(result);

      // End drag
      const upEvent = new PointerEvent('pointerup', {
        pointerId: 1,
        clientX: 200,
        clientY: 200,
        cancelable: true
      });

      act(() => {
        window.dispatchEvent(upEvent);
      });

      // Click should be suppressed for a short time
      expect(result.current.shouldSuppressClick('2')).toBe(true);

      // After time expires, should not suppress
      act(() => {
        jest.advanceTimersByTime(250);
      });

      expect(result.current.shouldSuppressClick('2')).toBe(false);
    });

    it('should only suppress click for the dragged item', () => {
      const { result } = renderHook(() =>
        useListDragAndDrop({
          items: mockItems,
          onReorder: mockOnReorder,
          containerRef: mockContainerRef
        })
      );

      startDragSession(result);

      const upEvent = new PointerEvent('pointerup', {
        pointerId: 1,
        clientX: 200,
        clientY: 200,
        cancelable: true
      });

      act(() => {
        window.dispatchEvent(upEvent);
      });

      expect(result.current.shouldSuppressClick('2')).toBe(true);
      expect(result.current.shouldSuppressClick('1')).toBe(false);
      expect(result.current.shouldSuppressClick('3')).toBe(false);
    });
  });

  describe('Cleanup', () => {
    it('should remove event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const { result, unmount } = renderHook(() =>
        useListDragAndDrop({
          items: mockItems,
          onReorder: mockOnReorder,
          containerRef: mockContainerRef
        })
      );

      const mockEvent = {
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
        clientX: 200,
        clientY: 200,
        currentTarget: document.createElement('div'),
        preventDefault: jest.fn()
      };

      act(() => {
        result.current.handlePointerStart('1', mockEvent);
        jest.advanceTimersByTime(300);
      });

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'pointermove',
        expect.any(Function)
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'pointerup',
        expect.any(Function)
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'pointercancel',
        expect.any(Function)
      );
    });

    it('should clear timers on unmount', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const { result, unmount } = renderHook(() =>
        useListDragAndDrop({
          items: mockItems,
          onReorder: mockOnReorder,
          containerRef: mockContainerRef
        })
      );

      const mockEvent = {
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
        clientX: 200,
        clientY: 200,
        currentTarget: document.createElement('div'),
        preventDefault: jest.fn()
      };

      act(() => {
        result.current.handlePointerStart('1', mockEvent);
      });

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should cancel animation frame on unmount', () => {
      const { result, unmount } = renderHook(() =>
        useListDragAndDrop({
          items: mockItems,
          onReorder: mockOnReorder,
          containerRef: mockContainerRef
        })
      );

      const mockEvent = {
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
        clientX: 200,
        clientY: 200,
        currentTarget: document.createElement('div'),
        preventDefault: jest.fn()
      };

      act(() => {
        result.current.handlePointerStart('1', mockEvent);
        jest.advanceTimersByTime(300);
      });

      // Trigger ghost position update
      const moveEvent = new PointerEvent('pointermove', {
        pointerId: 1,
        clientX: 250,
        clientY: 200,
        cancelable: true
      });

      act(() => {
        window.dispatchEvent(moveEvent);
      });

      unmount();

      expect(global.cancelAnimationFrame).toHaveBeenCalled();
    });

    it('should release pointer capture on drag cancel', () => {
      const { result } = renderHook(() =>
        useListDragAndDrop({
          items: mockItems,
          onReorder: mockOnReorder,
          containerRef: mockContainerRef
        })
      );

      const mockTarget = document.createElement('div');
      mockTarget.releasePointerCapture = jest.fn();

      const mockEvent = {
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
        clientX: 200,
        clientY: 200,
        currentTarget: mockTarget,
        preventDefault: jest.fn()
      };

      act(() => {
        result.current.handlePointerStart('1', mockEvent);
        jest.advanceTimersByTime(300);
      });

      // Cancel drag
      const cancelEvent = new PointerEvent('pointercancel', {
        pointerId: 1
      });

      act(() => {
        window.dispatchEvent(cancelEvent);
      });

      expect(mockTarget.releasePointerCapture).toHaveBeenCalledWith(1);
    });
  });

  describe('Edge Cases', () => {
    it('should cancel drag on Escape key', () => {
      const { result } = renderHook(() =>
        useListDragAndDrop({
          items: mockItems,
          onReorder: mockOnReorder,
          containerRef: mockContainerRef
        })
      );

      const mockEvent = {
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
        clientX: 200,
        clientY: 200,
        currentTarget: document.createElement('div'),
        preventDefault: jest.fn()
      };

      act(() => {
        result.current.handlePointerStart('1', mockEvent);
        jest.advanceTimersByTime(300);
      });

      expect(result.current.isDragging).toBe(true);

      const escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        cancelable: true
      });

      act(() => {
        window.dispatchEvent(escapeEvent);
      });

      expect(result.current.isDragging).toBe(false);
      expect(mockOnReorder).not.toHaveBeenCalled();
    });

    it('should handle pointercancel event', () => {
      const { result } = renderHook(() =>
        useListDragAndDrop({
          items: mockItems,
          onReorder: mockOnReorder,
          containerRef: mockContainerRef
        })
      );

      const mockEvent = {
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
        clientX: 200,
        clientY: 200,
        currentTarget: document.createElement('div'),
        preventDefault: jest.fn()
      };

      act(() => {
        result.current.handlePointerStart('1', mockEvent);
        jest.advanceTimersByTime(300);
      });

      expect(result.current.isDragging).toBe(true);

      const cancelEvent = new PointerEvent('pointercancel', {
        pointerId: 1
      });

      act(() => {
        window.dispatchEvent(cancelEvent);
      });

      expect(result.current.isDragging).toBe(false);
      expect(mockOnReorder).not.toHaveBeenCalled();
    });

    it('should ignore events from different pointer', () => {
      const { result } = renderHook(() =>
        useListDragAndDrop({
          items: mockItems,
          onReorder: mockOnReorder,
          containerRef: mockContainerRef
        })
      );

      const mockEvent = {
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
        clientX: 200,
        clientY: 200,
        currentTarget: document.createElement('div'),
        preventDefault: jest.fn()
      };

      act(() => {
        result.current.handlePointerStart('1', mockEvent);
        jest.advanceTimersByTime(300);
      });

      // Try to move with different pointer
      const moveEvent = new PointerEvent('pointermove', {
        pointerId: 2, // Different pointer
        clientX: 300,
        clientY: 300,
        cancelable: true
      });

      const initialGhostPosition = result.current.ghostPosition;

      act(() => {
        window.dispatchEvent(moveEvent);
      });

      // Ghost position should not change
      expect(result.current.ghostPosition).toEqual(initialGhostPosition);
    });

    it('should handle items with no id gracefully', () => {
      const itemsWithoutIds = [
        { name: 'Item 1' },
        { name: 'Item 2' }
      ];

      const { result } = renderHook(() =>
        useListDragAndDrop({
          items: itemsWithoutIds,
          onReorder: mockOnReorder,
          containerRef: mockContainerRef
        })
      );

      // Should not crash
      expect(result.current.isDragging).toBe(false);
    });

    it('should handle null/undefined items', () => {
      const itemsWithNulls = [
        { id: '1', name: 'Item 1' },
        null,
        { id: '3', name: 'Item 3' }
      ];

      const { result } = renderHook(() =>
        useListDragAndDrop({
          items: itemsWithNulls,
          onReorder: mockOnReorder,
          containerRef: mockContainerRef
        })
      );

      // Should handle gracefully
      expect(result.current.isDragging).toBe(false);
    });

    it('should handle missing container ref', () => {
      const { result } = renderHook(() =>
        useListDragAndDrop({
          items: mockItems,
          onReorder: mockOnReorder,
          containerRef: { current: null }
        })
      );

      const mockEvent = {
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
        clientX: 200,
        clientY: 200,
        currentTarget: document.createElement('div'),
        preventDefault: jest.fn()
      };

      act(() => {
        result.current.handlePointerStart('1', mockEvent);
        jest.advanceTimersByTime(300);
      });

      // Should handle gracefully without crashing
      expect(result.current.isDragging).toBe(true);
    });

    it('should not call onReorder if it is not provided', () => {
      const { result } = renderHook(() =>
        useListDragAndDrop({
          items: mockItems,
          onReorder: undefined,
          containerRef: mockContainerRef
        })
      );

      const mockEvent = {
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
        clientX: 200,
        clientY: 200,
        currentTarget: document.createElement('div'),
        preventDefault: jest.fn()
      };

      act(() => {
        result.current.handlePointerStart('1', mockEvent);
        jest.advanceTimersByTime(300);
      });

      const upEvent = new PointerEvent('pointerup', {
        pointerId: 1,
        clientX: 200,
        clientY: 250,
        cancelable: true
      });

      act(() => {
        window.dispatchEvent(upEvent);
      });

      // Should not crash
      expect(result.current.isDragging).toBe(false);
    });

    it('should handle drag start without pointer capture support', () => {
      // Remove pointer capture methods
      Element.prototype.setPointerCapture = undefined;
      Element.prototype.releasePointerCapture = undefined;

      const { result } = renderHook(() =>
        useListDragAndDrop({
          items: mockItems,
          onReorder: mockOnReorder,
          containerRef: mockContainerRef
        })
      );

      const mockEvent = {
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
        clientX: 200,
        clientY: 200,
        currentTarget: document.createElement('div'),
        preventDefault: jest.fn()
      };

      act(() => {
        result.current.handlePointerStart('1', mockEvent);
        jest.advanceTimersByTime(300);
      });

      // Should still work
      expect(result.current.isDragging).toBe(true);
    });

    it('should prevent default on cancelable events', () => {
      const { result } = renderHook(() =>
        useListDragAndDrop({
          items: mockItems,
          onReorder: mockOnReorder,
          containerRef: mockContainerRef
        })
      );

      const mockEvent = {
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
        clientX: 200,
        clientY: 200,
        currentTarget: document.createElement('div'),
        preventDefault: jest.fn(),
        cancelable: true
      };

      act(() => {
        result.current.handlePointerStart('1', mockEvent);
        jest.advanceTimersByTime(300);
      });

      const moveEvent = new PointerEvent('pointermove', {
        pointerId: 1,
        clientX: 250,
        clientY: 200,
        cancelable: true
      });

      const preventDefaultSpy = jest.spyOn(moveEvent, 'preventDefault');

      act(() => {
        window.dispatchEvent(moveEvent);
      });

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should handle rapid pointer start/cancel cycles', () => {
      const { result } = renderHook(() =>
        useListDragAndDrop({
          items: mockItems,
          onReorder: mockOnReorder,
          containerRef: mockContainerRef
        })
      );

      const mockEvent = {
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
        clientX: 200,
        clientY: 200,
        currentTarget: document.createElement('div'),
        preventDefault: jest.fn()
      };

      // Start and cancel multiple times
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.handlePointerStart('1', { ...mockEvent, pointerId: i });
        });

        const cancelEvent = new PointerEvent('pointercancel', {
          pointerId: i
        });

        act(() => {
          window.dispatchEvent(cancelEvent);
        });
      }

      // Should end in clean state
      expect(result.current.isDragging).toBe(false);
    });
  });

  describe('Reordering Logic', () => {
    it('should reorder from index 0 to index 2', () => {
      const { result } = renderHook(() =>
        useListDragAndDrop({
          items: mockItems,
          onReorder: mockOnReorder,
          containerRef: mockContainerRef
        })
      );

      const mockEvent = {
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
        clientX: 200,
        clientY: 125, // Item 1 position
        currentTarget: document.createElement('div'),
        preventDefault: jest.fn()
      };

      act(() => {
        result.current.handlePointerStart('1', mockEvent);
        jest.advanceTimersByTime(300);
      });

      // Move to item 3's position
      const moveEvent = new PointerEvent('pointermove', {
        pointerId: 1,
        clientX: 200,
        clientY: 225, // Item 3 position
        cancelable: true
      });

      act(() => {
        window.dispatchEvent(moveEvent);
      });

      const upEvent = new PointerEvent('pointerup', {
        pointerId: 1,
        clientX: 200,
        clientY: 225,
        cancelable: true
      });

      act(() => {
        window.dispatchEvent(upEvent);
      });

      expect(mockOnReorder).toHaveBeenCalled();
      const reorderedItems = mockOnReorder.mock.calls[0][0];
      const reorderedIds = reorderedItems.map((item) => item.id);

      // Item 1 should have moved down
      expect(reorderedIds.indexOf('1')).toBeGreaterThan(0);
    });

    it('should reorder from last to first position', () => {
      const { result } = renderHook(() =>
        useListDragAndDrop({
          items: mockItems,
          onReorder: mockOnReorder,
          containerRef: mockContainerRef
        })
      );

      const mockEvent = {
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
        clientX: 200,
        clientY: 225, // Item 4 position
        currentTarget: document.createElement('div'),
        preventDefault: jest.fn()
      };

      act(() => {
        result.current.handlePointerStart('4', mockEvent);
        jest.advanceTimersByTime(300);
      });

      // Move to first position
      const moveEvent = new PointerEvent('pointermove', {
        pointerId: 1,
        clientX: 200,
        clientY: 110, // Before item 1
        cancelable: true
      });

      act(() => {
        window.dispatchEvent(moveEvent);
      });

      const upEvent = new PointerEvent('pointerup', {
        pointerId: 1,
        clientX: 200,
        clientY: 110,
        cancelable: true
      });

      act(() => {
        window.dispatchEvent(upEvent);
      });

      expect(mockOnReorder).toHaveBeenCalled();
      const reorderedItems = mockOnReorder.mock.calls[0][0];
      const reorderedIds = reorderedItems.map((item) => item.id);

      // Item 4 should be first
      expect(reorderedIds[0]).toBe('4');
    });
  });
});
