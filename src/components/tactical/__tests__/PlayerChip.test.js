import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PlayerChip } from '../PlayerChip';

describe('PlayerChip', () => {
  let defaultProps;
  let mockHandlers;

  beforeEach(() => {
    mockHandlers = {
      onPointerStart: jest.fn(),
      onDoubleClick: jest.fn()
    };

    defaultProps = {
      id: 'test-chip-1',
      color: 'red',
      number: 5,
      x: 50,
      y: 30,
      ...mockHandlers
    };

    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render player chip with correct styling', () => {
      render(<PlayerChip {...defaultProps} />);
      
      const chip = screen.getByText('5');
      expect(chip.parentElement).toHaveClass('w-7', 'h-7', 'rounded-full', 'bg-red-500');
    });

    it('should display the correct player number', () => {
      render(<PlayerChip {...defaultProps} />);
      
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should apply absolute positioning when not in palette', () => {
      render(<PlayerChip {...defaultProps} />);
      
      const chip = screen.getByText('5').parentElement;
      expect(chip).toHaveClass('absolute');
      expect(chip).toHaveStyle({ left: '50%', top: '30%' });
    });

    it('should apply relative positioning when in palette', () => {
      const props = { ...defaultProps, isInPalette: true };
      render(<PlayerChip {...props} />);
      
      const chip = screen.getByText('5').parentElement;
      expect(chip).toHaveClass('relative');
      expect(chip).not.toHaveStyle({ left: '50%', top: '30%' });
    });

    it('should apply touch-action none for mobile compatibility', () => {
      render(<PlayerChip {...defaultProps} />);
      
      const chip = screen.getByText('5').parentElement;
      expect(chip.style.touchAction).toBe('none');
    });
  });

  describe('Color Variations', () => {
    const colorTests = [
      { color: 'white', expectedClass: 'bg-white' },
      { color: 'red', expectedClass: 'bg-red-500' },
      { color: 'blue', expectedClass: 'bg-blue-500' },
      { color: 'yellow', expectedClass: 'bg-yellow-500' },
      { color: 'green', expectedClass: 'bg-green-500' },
      { color: 'orange', expectedClass: 'bg-orange-500' },
      { color: 'purple', expectedClass: 'bg-purple-500' },
      { color: 'black', expectedClass: 'bg-slate-800' }
    ];

    colorTests.forEach(({ color, expectedClass }) => {
      it(`should apply correct styling for ${color} color`, () => {
        const props = { ...defaultProps, color };
        render(<PlayerChip {...props} />);
        
        const chip = screen.getByText('5').parentElement;
        expect(chip).toHaveClass(expectedClass);
      });
    });

    it('should render striped pattern for djurgarden color', () => {
      const props = { ...defaultProps, color: 'djurgarden' };
      render(<PlayerChip {...props} />);
      
      const chip = screen.getByText('5').parentElement;
      expect(chip).toHaveClass('overflow-hidden');
      
      // Check that the striped pattern div exists
      const stripePattern = chip.querySelector('.bg-sky-400');
      expect(stripePattern).toBeInTheDocument();
      
      // Check that there are 3 dark blue stripes (l-d-l-d-l-d-l pattern)
      const stripes = chip.querySelectorAll('.bg-blue-800');
      expect(stripes).toHaveLength(3);
    });

    it('should fallback to white color for unknown colors', () => {
      const props = { ...defaultProps, color: 'unknown' };
      render(<PlayerChip {...props} />);
      
      const chip = screen.getByText('5').parentElement;
      expect(chip).toHaveClass('bg-white');
    });
  });

  describe('User Interactions', () => {
    it('should call onPointerStart when pointer down event occurs', () => {
      render(<PlayerChip {...defaultProps} />);
      
      fireEvent.pointerDown(screen.getByText('5').parentElement);
      
      expect(mockHandlers.onPointerStart).toHaveBeenCalledTimes(1);
      expect(mockHandlers.onPointerStart).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should call onDoubleClick when double clicked', () => {
      render(<PlayerChip {...defaultProps} />);
      
      fireEvent.doubleClick(screen.getByText('5').parentElement);
      
      expect(mockHandlers.onDoubleClick).toHaveBeenCalledTimes(1);
    });

    it('should handle touch-based double-tap for deletion', async () => {
      jest.useFakeTimers({ shouldClearNativeTimers: true });
      render(<PlayerChip {...defaultProps} />);
      
      const chip = screen.getByText('5').parentElement;
      
      // First touch
      fireEvent.touchStart(chip);
      
      // Advance time slightly but within the 300ms window
      jest.advanceTimersByTime(100);
      
      // Second touch (should trigger double-tap)
      fireEvent.touchStart(chip);
      
      expect(mockHandlers.onDoubleClick).toHaveBeenCalledTimes(1);
      
      jest.useRealTimers();
    });

    it('should not trigger double-tap with slow taps', async () => {
      jest.useFakeTimers({ shouldClearNativeTimers: true });
      render(<PlayerChip {...defaultProps} />);
      
      const chip = screen.getByText('5').parentElement;
      
      // First tap
      fireEvent.touchStart(chip);
      
      // Wait too long
      jest.advanceTimersByTime(400);
      
      // Second tap
      fireEvent.touchStart(chip);
      
      expect(mockHandlers.onDoubleClick).not.toHaveBeenCalled();
      
      jest.useRealTimers();
    });

    it('should handle missing onPointerStart prop gracefully', () => {
      const propsWithoutHandler = { ...defaultProps, onPointerStart: undefined };
      
      expect(() => {
        render(<PlayerChip {...propsWithoutHandler} />);
      }).not.toThrow();
      
      const mockEvent = {
        pointerId: 1,
        clientX: 100,
        clientY: 100,
        preventDefault: jest.fn()
      };
      
      expect(() => {
        fireEvent.pointerDown(screen.getByText('5').parentElement, mockEvent);
      }).not.toThrow();
    });

    it('should handle missing onDoubleClick prop gracefully', () => {
      const propsWithoutHandler = { ...defaultProps, onDoubleClick: undefined };
      
      expect(() => {
        render(<PlayerChip {...propsWithoutHandler} />);
      }).not.toThrow();
      
      expect(() => {
        fireEvent.doubleClick(screen.getByText('5').parentElement);
      }).not.toThrow();
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive size classes', () => {
      render(<PlayerChip {...defaultProps} />);
      
      const chip = screen.getByText('5').parentElement;
      expect(chip).toHaveClass('w-7', 'h-7', 'sm:w-8', 'sm:h-8');
    });

    it('should have responsive text size classes', () => {
      render(<PlayerChip {...defaultProps} />);
      
      const chip = screen.getByText('5').parentElement;
      expect(chip).toHaveClass('text-xs', 'sm:text-sm');
    });

    it('should have hover effects', () => {
      render(<PlayerChip {...defaultProps} />);
      
      const chip = screen.getByText('5').parentElement;
      expect(chip).toHaveClass('hover:shadow-xl', 'hover:scale-105');
    });
  });

  describe('Props and State', () => {
    it('should update when number changes', () => {
      const { rerender } = render(<PlayerChip {...defaultProps} number={5} />);
      
      expect(screen.getByText('5')).toBeInTheDocument();
      
      rerender(<PlayerChip {...defaultProps} number={10} />);
      
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.queryByText('5')).not.toBeInTheDocument();
    });

    it('should update when position changes', () => {
      const { rerender } = render(<PlayerChip {...defaultProps} x={50} y={30} />);
      
      let chip = screen.getByText('5').parentElement;
      expect(chip).toHaveStyle({ left: '50%', top: '30%' });
      
      rerender(<PlayerChip {...defaultProps} x={75} y={60} />);
      
      chip = screen.getByText('5').parentElement;
      expect(chip).toHaveStyle({ left: '75%', top: '60%' });
    });

    it('should update when color changes', () => {
      const { rerender } = render(<PlayerChip {...defaultProps} color="red" />);
      
      let chip = screen.getByText('5').parentElement;
      expect(chip).toHaveClass('bg-red-500');
      
      rerender(<PlayerChip {...defaultProps} color="blue" />);
      
      chip = screen.getByText('5').parentElement;
      expect(chip).toHaveClass('bg-blue-500');
      expect(chip).not.toHaveClass('bg-red-500');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle undefined number gracefully', () => {
      const props = { ...defaultProps, number: undefined };
      
      expect(() => {
        render(<PlayerChip {...props} />);
      }).not.toThrow();
    });

    it('should handle zero number', () => {
      const props = { ...defaultProps, number: 0 };
      render(<PlayerChip {...props} />);
      
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should handle large numbers', () => {
      const props = { ...defaultProps, number: 999 };
      render(<PlayerChip {...props} />);
      
      expect(screen.getByText('999')).toBeInTheDocument();
    });

    it('should handle edge position values', () => {
      const props = { ...defaultProps, x: 0, y: 0 };
      render(<PlayerChip {...props} />);
      
      const chip = screen.getByText('5').parentElement;
      expect(chip).toHaveStyle({ left: '0%', top: '0%' });
    });

    it('should handle maximum position values', () => {
      const props = { ...defaultProps, x: 100, y: 100 };
      render(<PlayerChip {...props} />);
      
      const chip = screen.getByText('5').parentElement;
      expect(chip).toHaveStyle({ left: '100%', top: '100%' });
    });

    it('should handle string numbers', () => {
      const props = { ...defaultProps, number: "5" };
      render(<PlayerChip {...props} />);
      
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });
});
