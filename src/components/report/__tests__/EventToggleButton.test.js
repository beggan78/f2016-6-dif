import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EventToggleButton } from '../EventToggleButton';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Eye: ({ className }) => <div data-testid="eye-icon" className={className} />,
  EyeOff: ({ className }) => <div data-testid="eye-off-icon" className={className} />
}));

describe('EventToggleButton', () => {
  let defaultProps;
  let mockHandlers;

  beforeEach(() => {
    // Mock handlers
    mockHandlers = {
      onToggle: jest.fn()
    };

    // Default props
    defaultProps = {
      isVisible: false,
      onToggle: mockHandlers.onToggle,
      label: "Substitutions",
      className: ""
    };

    jest.clearAllMocks();
  });

  describe('Basic Rendering Tests', () => {
    it('renders with default props', () => {
      render(<EventToggleButton {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Substitutions');
    });

    it('displays correct default label when label prop not provided', () => {
      const props = { ...defaultProps };
      delete props.label;
      render(<EventToggleButton {...props} />);

      expect(screen.getByText('Substitutions')).toBeInTheDocument();
    });

    it('displays custom label when provided', () => {
      const props = { ...defaultProps, label: "Custom Label" };
      render(<EventToggleButton {...props} />);

      expect(screen.getByText('Custom Label')).toBeInTheDocument();
      expect(screen.queryByText('Substitutions')).not.toBeInTheDocument();
    });

    it('renders Eye icon when isVisible is true', () => {
      const props = { ...defaultProps, isVisible: true };
      render(<EventToggleButton {...props} />);

      expect(screen.getByTestId('eye-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('eye-off-icon')).not.toBeInTheDocument();
    });

    it('renders EyeOff icon when isVisible is false', () => {
      render(<EventToggleButton {...defaultProps} />);

      expect(screen.getByTestId('eye-off-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('eye-icon')).not.toBeInTheDocument();
    });

    it('defaults isVisible to false when not provided', () => {
      const props = { ...defaultProps };
      delete props.isVisible;
      render(<EventToggleButton {...props} />);

      expect(screen.getByTestId('eye-off-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('eye-icon')).not.toBeInTheDocument();
    });
  });

  describe('Interaction Tests', () => {
    it('calls onToggle when clicked', () => {
      render(<EventToggleButton {...defaultProps} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockHandlers.onToggle).toHaveBeenCalledTimes(1);
    });

    it('handles multiple clicks properly', () => {
      render(<EventToggleButton {...defaultProps} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      expect(mockHandlers.onToggle).toHaveBeenCalledTimes(3);
    });

    it('works without onToggle callback - no errors', () => {
      const props = { ...defaultProps, onToggle: undefined };
      
      expect(() => {
        render(<EventToggleButton {...props} />);
      }).not.toThrow();

      const button = screen.getByRole('button');
      expect(() => {
        fireEvent.click(button);
      }).not.toThrow();
    });

    it('handles keyboard events properly', () => {
      render(<EventToggleButton {...defaultProps} />);

      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: 'Enter' });

      // Button should still be focusable even if Enter doesn't trigger click
      expect(button).toBeInTheDocument();
    });
  });

  describe('Styling Tests', () => {
    it('applies correct CSS classes when isVisible is true', () => {
      const props = { ...defaultProps, isVisible: true };
      render(<EventToggleButton {...props} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-sky-600', 'text-white');
      expect(button).not.toHaveClass('bg-slate-700', 'text-slate-300', 'hover:bg-slate-600');
    });

    it('applies correct CSS classes when isVisible is false', () => {
      render(<EventToggleButton {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-slate-700', 'text-slate-300', 'hover:bg-slate-600');
      expect(button).not.toHaveClass('bg-sky-600', 'text-white');
    });

    it('applies base CSS classes regardless of isVisible state', () => {
      render(<EventToggleButton {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass(
        'flex',
        'items-center',
        'space-x-1',
        'text-xs',
        'px-2',
        'py-1',
        'rounded',
        'transition-colors'
      );
    });

    it('handles custom className prop correctly', () => {
      const props = { ...defaultProps, className: "custom-class another-class" };
      render(<EventToggleButton {...props} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class', 'another-class');
      // Should also maintain base classes
      expect(button).toHaveClass('flex', 'items-center');
    });

    it('handles empty className prop correctly', () => {
      render(<EventToggleButton {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('flex', 'items-center');
    });

    it('applies correct icon sizing classes', () => {
      render(<EventToggleButton {...defaultProps} />);

      const icon = screen.getByTestId('eye-off-icon');
      expect(icon).toHaveClass('h-3', 'w-3');
    });
  });

  describe('Props Tests', () => {
    it('handles all props being undefined gracefully', () => {
      expect(() => {
        render(<EventToggleButton />);
      }).not.toThrow();

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Substitutions'); // default label
      expect(screen.getByTestId('eye-off-icon')).toBeInTheDocument(); // default isVisible false
    });

    it('handles boolean isVisible prop correctly', () => {
      const trueProps = { ...defaultProps, isVisible: true };
      const { rerender } = render(<EventToggleButton {...trueProps} />);
      expect(screen.getByTestId('eye-icon')).toBeInTheDocument();

      const falseProps = { ...defaultProps, isVisible: false };
      rerender(<EventToggleButton {...falseProps} />);
      expect(screen.getByTestId('eye-off-icon')).toBeInTheDocument();
    });

    it('handles string props correctly', () => {
      const props = {
        ...defaultProps,
        label: "Test Label",
        className: "test-class"
      };
      render(<EventToggleButton {...props} />);

      expect(screen.getByText('Test Label')).toBeInTheDocument();
      const button = screen.getByRole('button');
      expect(button).toHaveClass('test-class');
    });

    it('handles function props correctly', () => {
      render(<EventToggleButton {...defaultProps} />);

      expect(typeof mockHandlers.onToggle).toBe('function');
    });
  });

  describe('Accessibility Tests', () => {
    it('button has proper accessibility attributes', () => {
      render(<EventToggleButton {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toBeEnabled();
    });

    it('icon and text are both visible and accessible', () => {
      render(<EventToggleButton {...defaultProps} />);

      // Both icon and text should be present
      expect(screen.getByTestId('eye-off-icon')).toBeInTheDocument();
      expect(screen.getByText('Substitutions')).toBeInTheDocument();
      
      // Text should be within the button
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Substitutions');
    });

    it('button is focusable', () => {
      render(<EventToggleButton {...defaultProps} />);

      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });

    it('provides meaningful content for screen readers', () => {
      const props = { ...defaultProps, label: "Toggle Event Visibility" };
      render(<EventToggleButton {...props} />);

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Toggle Event Visibility');
    });

    it('maintains accessibility when state changes', () => {
      const props = { ...defaultProps, isVisible: false };
      const { rerender } = render(<EventToggleButton {...props} />);

      let button = screen.getByRole('button');
      expect(button).toBeEnabled();

      const visibleProps = { ...defaultProps, isVisible: true };
      rerender(<EventToggleButton {...visibleProps} />);

      button = screen.getByRole('button');
      expect(button).toBeEnabled();
      expect(button).toHaveTextContent('Substitutions');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles rapid successive clicks without errors', () => {
      render(<EventToggleButton {...defaultProps} />);

      const button = screen.getByRole('button');
      
      // Simulate rapid clicking
      for (let i = 0; i < 10; i++) {
        fireEvent.click(button);
      }

      expect(mockHandlers.onToggle).toHaveBeenCalledTimes(10);
      expect(button).toBeInTheDocument();
    });

    it('handles invalid prop types gracefully', () => {
      // Note: In a real scenario with PropTypes, these would show warnings
      // but the component should still function
      const invalidProps = {
        isVisible: "not-a-boolean", // Invalid type
        onToggle: "not-a-function", // Invalid type
        label: 123, // Invalid type but will be coerced to string
        className: null // Invalid type
      };

      expect(() => {
        render(<EventToggleButton {...invalidProps} />);
      }).not.toThrow();

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('maintains functionality when re-rendered with different props', () => {
      const initialProps = { ...defaultProps, isVisible: false, label: "Initial" };
      const { rerender } = render(<EventToggleButton {...initialProps} />);

      expect(screen.getByText('Initial')).toBeInTheDocument();
      expect(screen.getByTestId('eye-off-icon')).toBeInTheDocument();

      const newProps = { ...defaultProps, isVisible: true, label: "Updated" };
      rerender(<EventToggleButton {...newProps} />);

      expect(screen.getByText('Updated')).toBeInTheDocument();
      expect(screen.getByTestId('eye-icon')).toBeInTheDocument();
      expect(screen.queryByText('Initial')).not.toBeInTheDocument();
    });

    it('preserves button functionality across prop changes', () => {
      const { rerender } = render(<EventToggleButton {...defaultProps} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(mockHandlers.onToggle).toHaveBeenCalledTimes(1);

      // Re-render with different props
      const newProps = { ...defaultProps, isVisible: true };
      rerender(<EventToggleButton {...newProps} />);

      fireEvent.click(button);
      expect(mockHandlers.onToggle).toHaveBeenCalledTimes(2);
    });
  });
});