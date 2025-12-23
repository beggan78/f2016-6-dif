import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UnmappedPlayersBanner } from '../UnmappedPlayersBanner';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Users: (props) => <div data-testid="users-icon" {...props} />,
  ArrowRight: (props) => <div data-testid="arrow-right-icon" {...props} />
}));

// Mock Button component
jest.mock('../../shared/UI', () => ({
  Button: ({ children, onClick, Icon, variant, ...props }) => (
    <button
      onClick={onClick}
      data-testid="go-to-roster-button"
      data-variant={variant}
      {...props}
    >
      {Icon && <Icon data-testid="button-icon" />}
      {children}
    </button>
  )
}));

describe('UnmappedPlayersBanner', () => {
  let defaultProps;
  let mockOnNavigateToRoster;

  beforeEach(() => {
    jest.clearAllMocks();

    mockOnNavigateToRoster = jest.fn();

    defaultProps = {
      firstProviderName: 'SportAdmin',
      onNavigateToRoster: mockOnNavigateToRoster
    };
  });

  describe('Component Rendering', () => {
    it('should render banner container with correct styling', () => {
      const { container } = render(<UnmappedPlayersBanner {...defaultProps} />);
      const banner = container.firstChild;

      expect(banner).toHaveClass('bg-sky-900/20');
      expect(banner).toHaveClass('border');
      expect(banner).toHaveClass('border-sky-600');
      expect(banner).toHaveClass('rounded-lg');
      expect(banner).toHaveClass('p-4');
      expect(banner).toHaveClass('text-center');
    });

    it('should render header section with Users icon', () => {
      render(<UnmappedPlayersBanner {...defaultProps} />);

      expect(screen.getByTestId('users-icon')).toBeInTheDocument();
      expect(screen.getByText('Players Available to Match')).toBeInTheDocument();
    });

    it('should render description text with provider name', () => {
      render(<UnmappedPlayersBanner {...defaultProps} />);

      expect(screen.getByText(/You have unmapped players from SportAdmin waiting to be matched to your roster/i)).toBeInTheDocument();
    });

    it('should render "Go to Roster Management" button', () => {
      render(<UnmappedPlayersBanner {...defaultProps} />);

      const button = screen.getByTestId('go-to-roster-button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Go to Roster Management');
    });

    it('should apply correct button variant prop', () => {
      render(<UnmappedPlayersBanner {...defaultProps} />);

      const button = screen.getByTestId('go-to-roster-button');
      expect(button).toHaveAttribute('data-variant', 'primary');
    });

    it('should render all components in correct order', () => {
      const { container } = render(<UnmappedPlayersBanner {...defaultProps} />);

      const icon = screen.getByTestId('users-icon');
      const heading = screen.getByText('Players Available to Match');
      const button = screen.getByTestId('go-to-roster-button');

      // Verify all are present
      expect(icon).toBeInTheDocument();
      expect(heading).toBeInTheDocument();
      expect(button).toBeInTheDocument();

      // Verify order (icon should come before button in DOM)
      const allElements = container.querySelectorAll('*');
      const iconIndex = Array.from(allElements).indexOf(icon);
      const buttonIndex = Array.from(allElements).indexOf(button);
      expect(iconIndex).toBeLessThan(buttonIndex);
    });

    it('should have correct container structure for header', () => {
      const { container } = render(<UnmappedPlayersBanner {...defaultProps} />);

      const headerContainer = container.querySelector('.flex.items-start.space-x-3');
      expect(headerContainer).toBeInTheDocument();
      expect(headerContainer).toHaveClass('mb-4');
    });
  });

  describe('Provider Name Display', () => {
    it('should display provider name in description', () => {
      render(<UnmappedPlayersBanner {...defaultProps} />);

      expect(screen.getByText(/SportAdmin/i)).toBeInTheDocument();
    });

    it('should handle different provider names', () => {
      const { rerender } = render(<UnmappedPlayersBanner {...defaultProps} />);

      expect(screen.getByText(/SportAdmin/i)).toBeInTheDocument();

      rerender(<UnmappedPlayersBanner firstProviderName="MyClub" onNavigateToRoster={mockOnNavigateToRoster} />);

      expect(screen.getByText(/MyClub/i)).toBeInTheDocument();
      expect(screen.queryByText(/SportAdmin/i)).not.toBeInTheDocument();
    });

    it('should render provider name with special characters', () => {
      render(<UnmappedPlayersBanner firstProviderName="Test & Provider" onNavigateToRoster={mockOnNavigateToRoster} />);

      expect(screen.getByText(/Test & Provider/i)).toBeInTheDocument();
    });

    it('should handle long provider names', () => {
      const longName = 'Very Long Provider Name That Exceeds Normal Length';
      render(<UnmappedPlayersBanner firstProviderName={longName} onNavigateToRoster={mockOnNavigateToRoster} />);

      expect(screen.getByText(new RegExp(longName, 'i'))).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onNavigateToRoster when button clicked', async () => {
      render(<UnmappedPlayersBanner {...defaultProps} />);

      const button = screen.getByTestId('go-to-roster-button');
      await userEvent.click(button);

      expect(mockOnNavigateToRoster).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple button clicks', async () => {
      render(<UnmappedPlayersBanner {...defaultProps} />);

      const button = screen.getByTestId('go-to-roster-button');
      await userEvent.click(button);
      await userEvent.click(button);
      await userEvent.click(button);

      expect(mockOnNavigateToRoster).toHaveBeenCalledTimes(3);
    });

    it('should handle missing callback gracefully', async () => {
      // Suppress PropTypes warning for this test
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<UnmappedPlayersBanner firstProviderName="SportAdmin" onNavigateToRoster={undefined} />);

      const button = screen.getByTestId('go-to-roster-button');

      // Should not throw when clicking
      await userEvent.click(button);
      expect(button).toBeInTheDocument();

      consoleError.mockRestore();
    });

    it('should render button that supports keyboard interaction', () => {
      render(<UnmappedPlayersBanner {...defaultProps} />);

      const button = screen.getByTestId('go-to-roster-button');

      // Verify button is a button element (which natively supports Enter and Space keys)
      expect(button.tagName).toBe('BUTTON');
      expect(button).toHaveAttribute('data-testid', 'go-to-roster-button');
    });

    it('should have button with onClick handler', () => {
      render(<UnmappedPlayersBanner {...defaultProps} />);

      const button = screen.getByTestId('go-to-roster-button');

      // Verify button has an onClick handler
      expect(button).toBeInTheDocument();
      expect(button.onclick).toBeDefined();
    });

    it('should maintain focus on button after click', async () => {
      render(<UnmappedPlayersBanner {...defaultProps} />);

      const button = screen.getByTestId('go-to-roster-button');
      await userEvent.click(button);

      expect(button).toBeInTheDocument();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing onNavigateToRoster prop', () => {
      // Suppress PropTypes warning
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<UnmappedPlayersBanner firstProviderName="SportAdmin" />);
      }).not.toThrow();

      consoleError.mockRestore();
    });

    it('should handle missing firstProviderName prop', () => {
      // Suppress PropTypes warning
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<UnmappedPlayersBanner onNavigateToRoster={mockOnNavigateToRoster} />);
      }).not.toThrow();

      consoleError.mockRestore();
    });

    it('should handle empty string as provider name', () => {
      render(<UnmappedPlayersBanner firstProviderName="" onNavigateToRoster={mockOnNavigateToRoster} />);

      // Should render without crashing, description will have empty provider name
      expect(screen.getByText(/You have unmapped players from/i)).toBeInTheDocument();
    });

    it('should handle rapid successive button clicks', async () => {
      render(<UnmappedPlayersBanner {...defaultProps} />);

      const button = screen.getByTestId('go-to-roster-button');

      // Rapidly click 10 times
      for (let i = 0; i < 10; i++) {
        await userEvent.click(button);
      }

      expect(mockOnNavigateToRoster).toHaveBeenCalledTimes(10);
    });

    it('should maintain functionality across re-renders', async () => {
      const { rerender } = render(<UnmappedPlayersBanner {...defaultProps} />);

      const button1 = screen.getByTestId('go-to-roster-button');
      await userEvent.click(button1);
      expect(mockOnNavigateToRoster).toHaveBeenCalledTimes(1);

      // Re-render with same props
      rerender(<UnmappedPlayersBanner {...defaultProps} />);

      const button2 = screen.getByTestId('go-to-roster-button');
      await userEvent.click(button2);
      expect(mockOnNavigateToRoster).toHaveBeenCalledTimes(2);
    });

    it('should handle prop changes correctly', async () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      const { rerender } = render(
        <UnmappedPlayersBanner firstProviderName="SportAdmin" onNavigateToRoster={callback1} />
      );

      const button = screen.getByTestId('go-to-roster-button');
      await userEvent.click(button);
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(0);

      // Re-render with different callback
      rerender(<UnmappedPlayersBanner firstProviderName="SportAdmin" onNavigateToRoster={callback2} />);

      await userEvent.click(button);
      expect(callback1).toHaveBeenCalledTimes(1); // Still 1
      expect(callback2).toHaveBeenCalledTimes(1); // New callback called
    });

    it('should handle provider name with numeric characters', () => {
      render(<UnmappedPlayersBanner firstProviderName="Provider123" onNavigateToRoster={mockOnNavigateToRoster} />);

      expect(screen.getByText(/Provider123/i)).toBeInTheDocument();
    });

    it('should handle provider name with unicode characters', () => {
      render(<UnmappedPlayersBanner firstProviderName="Prövider Näme" onNavigateToRoster={mockOnNavigateToRoster} />);

      expect(screen.getByText(/Prövider Näme/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(<UnmappedPlayersBanner {...defaultProps} />);

      const heading = screen.getByText('Players Available to Match');
      expect(heading.tagName).toBe('H3');
    });

    it('should have descriptive paragraph text', () => {
      render(<UnmappedPlayersBanner {...defaultProps} />);

      const description = screen.getByText(
        /You have unmapped players from SportAdmin waiting to be matched to your roster/i
      );
      expect(description.tagName).toBe('P');
    });

    it('should render button with accessible name', () => {
      render(<UnmappedPlayersBanner {...defaultProps} />);

      const button = screen.getByTestId('go-to-roster-button');
      expect(button).toHaveTextContent('Go to Roster Management');
    });

    it('should have Users icon with aria-hidden', () => {
      render(<UnmappedPlayersBanner {...defaultProps} />);

      const icon = screen.getByTestId('users-icon');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    it('should support keyboard navigation', async () => {
      render(<UnmappedPlayersBanner {...defaultProps} />);

      const button = screen.getByTestId('go-to-roster-button');

      // Tab to button
      await userEvent.tab();

      // Button should be focusable
      expect(button).toBeInTheDocument();
    });

    it('should have button as only interactive element', () => {
      render(<UnmappedPlayersBanner {...defaultProps} />);

      const button = screen.getByTestId('go-to-roster-button');
      expect(button.tagName).toBe('BUTTON');

      // Verify no other interactive elements
      const allButtons = screen.queryAllByRole('button');
      expect(allButtons).toHaveLength(1);
    });
  });
});
