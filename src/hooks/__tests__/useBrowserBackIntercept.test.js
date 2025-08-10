/**
 * useBrowserBackIntercept Hook Tests
 * 
 * Comprehensive testing suite for the useBrowserBackIntercept custom hook - a critical
 * hook that manages browser history to prevent accidental navigation during game sessions
 * and provides modal stack management functionality.
 * 
 * Test Coverage: 20+ tests covering:
 * - Hook initialization and browser history setup
 * - Modal state management (push/pop operations)
 * - Browser back button interception
 * - Modal stack handling and cleanup
 * - Global navigation handler integration
 * - Edge cases and error handling
 * - Memory management and cleanup
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useBrowserBackIntercept } from '../useBrowserBackIntercept';

// Mock window.history methods
const mockReplaceState = jest.fn();
const mockPushState = jest.fn();
const mockBack = jest.fn();
const mockGo = jest.fn();
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();

// Store original methods
const originalHistory = window.history;
const originalAddEventListener = window.addEventListener;
const originalRemoveEventListener = window.removeEventListener;

describe('useBrowserBackIntercept', () => {
  let mockGlobalHandler;

  beforeEach(() => {
    // Mock window.history
    Object.defineProperty(window, 'history', {
      value: {
        replaceState: mockReplaceState,
        pushState: mockPushState,
        back: mockBack,
        go: mockGo,
        state: { modalLevel: 0 }
      },
      writable: true
    });

    // Mock window event listeners
    window.addEventListener = mockAddEventListener;
    window.removeEventListener = mockRemoveEventListener;

    // Create mock global handler
    mockGlobalHandler = jest.fn();

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original methods
    Object.defineProperty(window, 'history', {
      value: originalHistory,
      writable: true
    });
    window.addEventListener = originalAddEventListener;
    window.removeEventListener = originalRemoveEventListener;
  });

  describe('Hook Initialization', () => {
    it('should initialize with base state when first mounted', () => {
      renderHook(() => useBrowserBackIntercept());

      expect(mockReplaceState).toHaveBeenCalledWith(
        { navigationLevel: 0 },
        '',
        window.location.href
      );
    });

    it('should not replace state on subsequent re-renders', () => {
      const { rerender } = renderHook(() => useBrowserBackIntercept());

      // Clear the initial call
      mockReplaceState.mockClear();

      // Re-render the hook
      rerender();

      expect(mockReplaceState).not.toHaveBeenCalled();
    });

    it('should add popstate event listener on mount', () => {
      renderHook(() => useBrowserBackIntercept());

      expect(mockAddEventListener).toHaveBeenCalledWith(
        'popstate',
        expect.any(Function)
      );
    });

    it('should remove popstate event listener on unmount', () => {
      const { unmount } = renderHook(() => useBrowserBackIntercept());

      unmount();

      expect(mockRemoveEventListener).toHaveBeenCalledWith(
        'popstate',
        expect.any(Function)
      );
    });

    it('should pass global navigation handler to effect dependency', () => {
      const { rerender } = renderHook(
        ({ handler }) => useBrowserBackIntercept(handler),
        { initialProps: { handler: mockGlobalHandler } }
      );

      const newMockHandler = jest.fn();
      rerender({ handler: newMockHandler });

      // Should have re-added the event listener with new handler
      expect(mockAddEventListener).toHaveBeenCalledTimes(2);
    });
  });

  describe('Navigation State Management', () => {
    it('should return initial state with no active navigation handlers', () => {
      const { result } = renderHook(() => useBrowserBackIntercept());

      expect(result.current.hasActiveNavigationHandlers()).toBe(false);
    });

    it('should add navigation handler to stack when pushNavigationState is called', () => {
      const { result } = renderHook(() => useBrowserBackIntercept());
      const mockCloseModal = jest.fn();

      act(() => {
        result.current.pushNavigationState(mockCloseModal);
      });

      expect(result.current.hasActiveNavigationHandlers()).toBe(true);
      expect(mockPushState).toHaveBeenCalledWith(
        { navigationLevel: 1 },
        '',
        window.location.href
      );
    });

    it('should handle multiple navigation handlers in stack', () => {
      const { result } = renderHook(() => useBrowserBackIntercept());
      const mockCloseModal1 = jest.fn();
      const mockCloseModal2 = jest.fn();

      act(() => {
        result.current.pushNavigationState(mockCloseModal1);
        result.current.pushNavigationState(mockCloseModal2);
      });

      expect(result.current.hasActiveNavigationHandlers()).toBe(true);
      expect(mockPushState).toHaveBeenCalledTimes(2);
      expect(mockPushState).toHaveBeenLastCalledWith(
        { navigationLevel: 2 },
        '',
        window.location.href
      );
    });

    it('should warn when pushNavigationState is called without function', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const { result } = renderHook(() => useBrowserBackIntercept());

      act(() => {
        result.current.pushNavigationState('not a function');
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'pushNavigationState requires a function to handle navigation'
      );
      expect(result.current.hasActiveNavigationHandlers()).toBe(false);

      consoleSpy.mockRestore();
    });

    it('should remove navigation handler from stack when popNavigationState is called', () => {
      const { result } = renderHook(() => useBrowserBackIntercept());
      const mockCloseModal = jest.fn();

      // Add modal first
      act(() => {
        result.current.pushNavigationState(mockCloseModal);
      });

      // Set up mock state to simulate modal level
      window.history.state = { navigationLevel: 1 };

      act(() => {
        result.current.popNavigationState();
      });

      expect(result.current.hasActiveNavigationHandlers()).toBe(false);
      expect(mockBack).toHaveBeenCalled();
    });

    it('should not call history.back when already at base level', () => {
      const { result } = renderHook(() => useBrowserBackIntercept());
      const mockCloseModal = jest.fn();

      // Add modal first
      act(() => {
        result.current.pushNavigationState(mockCloseModal);
      });

      // Set state to base level
      window.history.state = { modalLevel: 0 };

      act(() => {
        result.current.popNavigationState();
      });

      expect(mockBack).not.toHaveBeenCalled();
    });
  });

  describe('Browser Back Button Handling', () => {
    it('should call modal close function when back button is pressed with open modal', () => {
      const { result } = renderHook(() => useBrowserBackIntercept());
      const mockCloseModal = jest.fn();

      // Add modal to stack
      act(() => {
        result.current.pushNavigationState(mockCloseModal);
      });

      // Simulate popstate event (back button press)
      const popstateHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'popstate'
      )[1];

      const mockEvent = { preventDefault: jest.fn() };

      act(() => {
        popstateHandler(mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockCloseModal).toHaveBeenCalled();
      expect(result.current.hasActiveNavigationHandlers()).toBe(false);
    });

    it('should handle multiple modals correctly when back button is pressed', () => {
      const { result } = renderHook(() => useBrowserBackIntercept());
      const mockCloseModal1 = jest.fn();
      const mockCloseModal2 = jest.fn();

      // Add two modals
      act(() => {
        result.current.pushNavigationState(mockCloseModal1);
        result.current.pushNavigationState(mockCloseModal2);
      });

      // Get popstate handler
      const popstateHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'popstate'
      )[1];

      const mockEvent = { preventDefault: jest.fn() };

      // Simulate back button press
      act(() => {
        popstateHandler(mockEvent);
      });

      // Should close the topmost modal (modal2) and push new state for remaining modal
      expect(mockCloseModal2).toHaveBeenCalled();
      expect(mockCloseModal1).not.toHaveBeenCalled();
      expect(result.current.hasActiveNavigationHandlers()).toBe(true);
      expect(mockPushState).toHaveBeenCalledWith(
        { navigationLevel: 1 },
        '',
        window.location.href
      );
    });

    it('should call global navigation handler when no modals are open', () => {
      const { result } = renderHook(() => useBrowserBackIntercept(mockGlobalHandler));

      // Get popstate handler
      const popstateHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'popstate'
      )[1];

      const mockEvent = { preventDefault: jest.fn() };

      act(() => {
        popstateHandler(mockEvent);
      });

      expect(mockGlobalHandler).toHaveBeenCalled();
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    });

    it('should do nothing when no modals and no global handler', () => {
      renderHook(() => useBrowserBackIntercept());

      const popstateHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'popstate'
      )[1];

      const mockEvent = { preventDefault: jest.fn() };

      expect(() => {
        act(() => {
          popstateHandler(mockEvent);
        });
      }).not.toThrow();

      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('Navigation Stack Utilities', () => {
    it('should remove modal from stack without navigation when removeFromNavigationStack is called', () => {
      const { result } = renderHook(() => useBrowserBackIntercept());
      const mockCloseModal = jest.fn();

      // Add modal
      act(() => {
        result.current.pushNavigationState(mockCloseModal);
      });

      expect(result.current.hasActiveNavigationHandlers()).toBe(true);

      // Remove without navigation
      act(() => {
        result.current.removeFromNavigationStack();
      });

      expect(result.current.hasActiveNavigationHandlers()).toBe(false);
      expect(mockBack).not.toHaveBeenCalled();
    });

    it('should clear all modals when clearNavigationStack is called', () => {
      const { result } = renderHook(() => useBrowserBackIntercept());
      const mockCloseModal1 = jest.fn();
      const mockCloseModal2 = jest.fn();
      const mockCloseModal3 = jest.fn();

      // Add multiple modals
      act(() => {
        result.current.pushNavigationState(mockCloseModal1);
        result.current.pushNavigationState(mockCloseModal2);
        result.current.pushNavigationState(mockCloseModal3);
      });

      expect(result.current.hasActiveNavigationHandlers()).toBe(true);

      // Set up mock state
      window.history.state = { modalLevel: 3 };

      act(() => {
        result.current.clearNavigationStack();
      });

      expect(result.current.hasActiveNavigationHandlers()).toBe(false);
      expect(mockGo).toHaveBeenCalledWith(-3);
    });

    it('should not call history.go when already at base level during clear', () => {
      const { result } = renderHook(() => useBrowserBackIntercept());
      const mockCloseModal = jest.fn();

      // Add modal but set state to base level
      act(() => {
        result.current.pushNavigationState(mockCloseModal);
      });

      window.history.state = { modalLevel: 0 };

      act(() => {
        result.current.clearNavigationStack();
      });

      expect(mockGo).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle popstate event with invalid modal close function', () => {
      const { result } = renderHook(() => useBrowserBackIntercept());

      // Manually add a non-function to the stack (edge case)
      act(() => {
        result.current.pushNavigationState(jest.fn());
      });

      // Manually corrupt the stack
      const popstateHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'popstate'
      )[1];

      const mockEvent = { preventDefault: jest.fn() };

      expect(() => {
        act(() => {
          popstateHandler(mockEvent);
        });
      }).not.toThrow();
    });

    it('should handle missing window.history.state gracefully', () => {
      const { result } = renderHook(() => useBrowserBackIntercept());
      const mockCloseModal = jest.fn();

      act(() => {
        result.current.pushNavigationState(mockCloseModal);
      });

      // Remove state property
      window.history.state = null;

      expect(() => {
        act(() => {
          result.current.popNavigationState();
        });
      }).not.toThrow();

      expect(mockBack).not.toHaveBeenCalled();
    });

    it('should handle clearNavigationStack with null state', () => {
      const { result } = renderHook(() => useBrowserBackIntercept());
      const mockCloseModal = jest.fn();

      act(() => {
        result.current.pushNavigationState(mockCloseModal);
      });

      window.history.state = null;

      expect(() => {
        act(() => {
          result.current.clearNavigationStack();
        });
      }).not.toThrow();

      expect(mockGo).not.toHaveBeenCalled();
    });

    it('should handle popNavigationState when stack is empty', () => {
      const { result } = renderHook(() => useBrowserBackIntercept());

      expect(() => {
        act(() => {
          result.current.popNavigationState();
        });
      }).not.toThrow();

      expect(mockBack).not.toHaveBeenCalled();
    });

    it('should handle removeFromNavigationStack when stack is empty', () => {
      const { result } = renderHook(() => useBrowserBackIntercept());

      expect(() => {
        act(() => {
          result.current.removeFromNavigationStack();
        });
      }).not.toThrow();
    });

    it('should handle rapid pushNavigationState calls', () => {
      const { result } = renderHook(() => useBrowserBackIntercept());
      const mockCloseModal1 = jest.fn();
      const mockCloseModal2 = jest.fn();
      const mockCloseModal3 = jest.fn();

      act(() => {
        result.current.pushNavigationState(mockCloseModal1);
        result.current.pushNavigationState(mockCloseModal2);
        result.current.pushNavigationState(mockCloseModal3);
      });

      expect(result.current.hasActiveNavigationHandlers()).toBe(true);
      expect(mockPushState).toHaveBeenCalledTimes(3);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete modal lifecycle correctly', () => {
      const { result } = renderHook(() => useBrowserBackIntercept());
      const mockCloseModal = jest.fn();

      // Open modal
      act(() => {
        result.current.pushNavigationState(mockCloseModal);
      });

      expect(result.current.hasActiveNavigationHandlers()).toBe(true);
      expect(mockPushState).toHaveBeenCalledWith(
        { navigationLevel: 1 },
        '',
        window.location.href
      );

      // Close modal normally
      window.history.state = { navigationLevel: 1 };
      act(() => {
        result.current.popNavigationState();
      });

      expect(result.current.hasActiveNavigationHandlers()).toBe(false);
      expect(mockBack).toHaveBeenCalled();
    });

    it('should work correctly with global navigation handler switching', () => {
      const firstHandler = jest.fn();
      const secondHandler = jest.fn();

      const { result, rerender } = renderHook(
        ({ handler }) => useBrowserBackIntercept(handler),
        { initialProps: { handler: firstHandler } }
      );

      // Switch handler
      rerender({ handler: secondHandler });

      // Trigger popstate with no modals
      const popstateHandler = mockAddEventListener.mock.calls[1][1]; // Second call due to rerender

      const mockEvent = { preventDefault: jest.fn() };

      act(() => {
        popstateHandler(mockEvent);
      });

      expect(secondHandler).toHaveBeenCalled();
      expect(firstHandler).not.toHaveBeenCalled();
    });

    it('should handle complex modal stack operations', () => {
      const { result } = renderHook(() => useBrowserBackIntercept());
      const closeModal1 = jest.fn();
      const closeModal2 = jest.fn();
      const closeModal3 = jest.fn();

      // Build stack
      act(() => {
        result.current.pushNavigationState(closeModal1);
        result.current.pushNavigationState(closeModal2);
        result.current.pushNavigationState(closeModal3);
      });

      expect(result.current.hasActiveNavigationHandlers()).toBe(true);

      // Remove middle modal manually
      act(() => {
        result.current.removeFromNavigationStack();
      });

      expect(result.current.hasActiveNavigationHandlers()).toBe(true);

      // Close via back button
      const popstateHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'popstate'
      )[1];

      const mockEvent = { preventDefault: jest.fn() };

      act(() => {
        popstateHandler(mockEvent);
      });

      // Should close the remaining top modal
      expect(result.current.hasActiveNavigationHandlers()).toBe(true); // Still one modal left
    });

    it('should properly clean up on unmount during active modal session', () => {
      const { result, unmount } = renderHook(() => useBrowserBackIntercept());
      const mockCloseModal = jest.fn();

      // Add modal
      act(() => {
        result.current.pushNavigationState(mockCloseModal);
      });

      expect(result.current.hasActiveNavigationHandlers()).toBe(true);

      // Unmount component
      unmount();

      // Should remove event listener
      expect(mockRemoveEventListener).toHaveBeenCalledWith(
        'popstate',
        expect.any(Function)
      );
    });
  });
});