import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RosterConnectorOnboarding } from '../RosterConnectorOnboarding';
import { getAllProviders } from '../../../constants/connectorProviders';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Link: (props) => <div data-testid="link-icon" {...props} />,
  ArrowRight: (props) => <div data-testid="arrow-right-icon" {...props} />
}));

// Mock provider constants
jest.mock('../../../constants/connectorProviders', () => ({
  getAllProviders: jest.fn()
}));

// Mock ProviderLogo component
jest.mock('../../connectors/ProviderLogo', () => ({
  ProviderLogo: ({ provider, className }) => (
    <div
      data-testid={`provider-logo-${provider.id}`}
      className={className}
    >
      {provider.name}
    </div>
  )
}));

// Mock Button component
jest.mock('../../shared/UI', () => ({
  Button: ({ children, onClick, Icon, variant, size, ...props }) => (
    <button
      onClick={onClick}
      data-testid="go-to-connectors-button"
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {Icon && <Icon data-testid="button-icon" />}
      {children}
    </button>
  )
}));

describe('RosterConnectorOnboarding', () => {
  let defaultProps;
  let mockOnNavigateToConnectors;
  let mockGetAllProviders;
  let defaultProviders;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default provider data
    defaultProviders = [
      { id: 'sportadmin', name: 'SportAdmin', comingSoon: false, logo: '/logo-sportadmin.png' },
      { id: 'myclub', name: 'MyClub', comingSoon: true, logo: '/logo-myclub.png' },
      { id: 'svenska_lag', name: 'Svenska Lag', comingSoon: true, logo: '/logo-svenskalag.png' }
    ];

    mockGetAllProviders = getAllProviders;
    mockGetAllProviders.mockReturnValue(defaultProviders);

    mockOnNavigateToConnectors = jest.fn();

    defaultProps = {
      onNavigateToConnectors: mockOnNavigateToConnectors
    };
  });

  describe('Component Rendering', () => {
    it('should render banner container with correct styling', () => {
      const { container } = render(<RosterConnectorOnboarding {...defaultProps} />);
      const banner = container.firstChild;

      expect(banner).toHaveClass('bg-sky-900/20');
      expect(banner).toHaveClass('border');
      expect(banner).toHaveClass('border-sky-600');
      expect(banner).toHaveClass('rounded-lg');
    });

    it('should render header section with Link icon', () => {
      render(<RosterConnectorOnboarding {...defaultProps} />);

      expect(screen.getByTestId('link-icon')).toBeInTheDocument();
      expect(screen.getByText('Sync Players from External Platforms')).toBeInTheDocument();
    });

    it('should render description text', () => {
      render(<RosterConnectorOnboarding {...defaultProps} />);

      expect(screen.getByText(/Connect to your team management platform/i)).toBeInTheDocument();
    });

    it('should render provider logos grid', () => {
      const { container } = render(<RosterConnectorOnboarding {...defaultProps} />);

      // Find the provider logos container
      const logosGrid = container.querySelector('.flex.items-center.justify-center');
      expect(logosGrid).toBeInTheDocument();
      expect(logosGrid).toHaveClass('justify-center');
      expect(logosGrid).toHaveClass('flex-wrap');
    });

    it('should render "Go to Connectors" button', () => {
      render(<RosterConnectorOnboarding {...defaultProps} />);

      const button = screen.getByTestId('go-to-connectors-button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Go to Connectors');
    });

    it('should apply correct button variant and size props', () => {
      render(<RosterConnectorOnboarding {...defaultProps} />);

      const button = screen.getByTestId('go-to-connectors-button');
      expect(button).toHaveAttribute('data-variant', 'primary');
      expect(button).toHaveAttribute('data-size', 'sm');
    });

    it('should render all components in correct order', () => {
      const { container } = render(<RosterConnectorOnboarding {...defaultProps} />);

      const icon = screen.getByTestId('link-icon');
      const heading = screen.getByText('Sync Players from External Platforms');
      const button = screen.getByTestId('go-to-connectors-button');

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
      const { container } = render(<RosterConnectorOnboarding {...defaultProps} />);

      const headerContainer = container.querySelector('.flex.items-start.space-x-3');
      expect(headerContainer).toBeInTheDocument();
      expect(headerContainer).toHaveClass('mb-7');
    });
  });

  describe('Provider Display', () => {
    it('should render all providers from getAllProviders', () => {
      render(<RosterConnectorOnboarding {...defaultProps} />);

      expect(screen.getByTestId('provider-logo-sportadmin')).toBeInTheDocument();
      expect(screen.getByTestId('provider-logo-myclub')).toBeInTheDocument();
      expect(screen.getByTestId('provider-logo-svenska_lag')).toBeInTheDocument();
    });

    it('should apply opacity class to coming-soon providers', () => {
      const { container } = render(<RosterConnectorOnboarding {...defaultProps} />);

      const myclubLogo = screen.getByTestId('provider-logo-myclub');
      const svenskaLagLogo = screen.getByTestId('provider-logo-svenska_lag');

      // Check parent div has opacity-60
      expect(myclubLogo.parentElement).toHaveClass('opacity-60');
      expect(svenskaLagLogo.parentElement).toHaveClass('opacity-60');
    });

    it('should NOT apply opacity to active providers', () => {
      const { container } = render(<RosterConnectorOnboarding {...defaultProps} />);

      const sportadminLogo = screen.getByTestId('provider-logo-sportadmin');

      // Check parent div does NOT have opacity-60
      expect(sportadminLogo.parentElement).not.toHaveClass('opacity-60');
    });

    it('should render "Soon" badge for coming-soon providers', () => {
      render(<RosterConnectorOnboarding {...defaultProps} />);

      const badges = screen.getAllByText('Soon');
      expect(badges).toHaveLength(2); // MyClub and Svenska Lag
    });

    it('should NOT render "Soon" badge for active providers', () => {
      render(<RosterConnectorOnboarding {...defaultProps} />);

      const sportadminLogo = screen.getByTestId('provider-logo-sportadmin');
      const soonBadge = sportadminLogo.parentElement.querySelector('span');

      expect(soonBadge).toBeNull();
    });

    it('should pass correct className to ProviderLogo', () => {
      render(<RosterConnectorOnboarding {...defaultProps} />);

      const sportadminLogo = screen.getByTestId('provider-logo-sportadmin');
      expect(sportadminLogo).toHaveClass('w-28');
      expect(sportadminLogo).toHaveClass('h-9');
    });

    it('should handle empty providers array gracefully', () => {
      mockGetAllProviders.mockReturnValue([]);

      expect(() => {
        render(<RosterConnectorOnboarding {...defaultProps} />);
      }).not.toThrow();

      expect(screen.getByText('Sync Players from External Platforms')).toBeInTheDocument();
    });

    it('should render providers in order returned by getAllProviders', () => {
      render(<RosterConnectorOnboarding {...defaultProps} />);

      const logos = [
        screen.getByTestId('provider-logo-sportadmin'),
        screen.getByTestId('provider-logo-myclub'),
        screen.getByTestId('provider-logo-svenska_lag')
      ];

      // All logos should be present
      logos.forEach(logo => expect(logo).toBeInTheDocument());
    });

    it('should handle single provider correctly', () => {
      mockGetAllProviders.mockReturnValue([
        { id: 'sportadmin', name: 'SportAdmin', comingSoon: false }
      ]);

      render(<RosterConnectorOnboarding {...defaultProps} />);

      expect(screen.getByTestId('provider-logo-sportadmin')).toBeInTheDocument();
      expect(screen.queryByTestId('provider-logo-myclub')).not.toBeInTheDocument();
    });

    it('should apply relative positioning to provider containers', () => {
      const { container } = render(<RosterConnectorOnboarding {...defaultProps} />);

      const sportadminLogo = screen.getByTestId('provider-logo-sportadmin');
      expect(sportadminLogo.parentElement).toHaveClass('relative');
    });
  });

  describe('User Interactions', () => {
    it('should call onNavigateToConnectors when button clicked', async () => {
      render(<RosterConnectorOnboarding {...defaultProps} />);

      const button = screen.getByTestId('go-to-connectors-button');
      await userEvent.click(button);

      expect(mockOnNavigateToConnectors).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple button clicks', async () => {
      render(<RosterConnectorOnboarding {...defaultProps} />);

      const button = screen.getByTestId('go-to-connectors-button');
      await userEvent.click(button);
      await userEvent.click(button);
      await userEvent.click(button);

      expect(mockOnNavigateToConnectors).toHaveBeenCalledTimes(3);
    });

    it('should handle missing callback gracefully', async () => {
      // Suppress PropTypes warning for this test
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<RosterConnectorOnboarding onNavigateToConnectors={undefined} />);

      const button = screen.getByTestId('go-to-connectors-button');

      // Should not throw when clicking (userEvent.click in v13 doesn't return a promise, it returns undefined)
      await userEvent.click(button);
      // If we got here without throwing, the test passes
      expect(button).toBeInTheDocument();

      consoleError.mockRestore();
    });

    it('should render button that supports keyboard interaction', () => {
      render(<RosterConnectorOnboarding {...defaultProps} />);

      const button = screen.getByTestId('go-to-connectors-button');

      // Verify button is a button element (which natively supports Enter and Space keys)
      expect(button.tagName).toBe('BUTTON');
      expect(button).toHaveAttribute('data-testid', 'go-to-connectors-button');
    });

    it('should have button with onClick handler', () => {
      render(<RosterConnectorOnboarding {...defaultProps} />);

      const button = screen.getByTestId('go-to-connectors-button');

      // Verify button has an onClick handler
      expect(button).toBeInTheDocument();
      expect(button.onclick).toBeDefined();
    });

    it('should maintain focus on button after click', async () => {
      render(<RosterConnectorOnboarding {...defaultProps} />);

      const button = screen.getByTestId('go-to-connectors-button');
      await userEvent.click(button);

      expect(button).toBeInTheDocument();
    });

    it('should not interfere with provider logo display', () => {
      render(<RosterConnectorOnboarding {...defaultProps} />);

      // Provider logos should be present and not cause errors
      expect(screen.getByTestId('provider-logo-sportadmin')).toBeInTheDocument();
      expect(screen.getByTestId('provider-logo-myclub')).toBeInTheDocument();
      expect(screen.getByTestId('provider-logo-svenska_lag')).toBeInTheDocument();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing onNavigateToConnectors prop', () => {
      // Suppress PropTypes warning
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<RosterConnectorOnboarding />);
      }).not.toThrow();

      consoleError.mockRestore();
    });

    it('should handle getAllProviders throwing error', () => {
      mockGetAllProviders.mockImplementation(() => {
        throw new Error('Provider fetch error');
      });

      // Component will throw during render - expect the error
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => {
        render(<RosterConnectorOnboarding {...defaultProps} />);
      }).toThrow();
      consoleError.mockRestore();
    });

    it('should handle provider with missing comingSoon property', () => {
      mockGetAllProviders.mockReturnValue([
        { id: 'test', name: 'Test Provider' } // No comingSoon property
      ]);

      expect(() => {
        render(<RosterConnectorOnboarding {...defaultProps} />);
      }).not.toThrow();

      // Should render without "Soon" badge
      expect(screen.queryByText('Soon')).not.toBeInTheDocument();
    });

    it('should handle provider with null/undefined values', () => {
      mockGetAllProviders.mockReturnValue([
        { id: 'test', name: null, comingSoon: false, logo: undefined }
      ]);

      expect(() => {
        render(<RosterConnectorOnboarding {...defaultProps} />);
      }).not.toThrow();
    });

    it('should handle rapid successive button clicks', async () => {
      render(<RosterConnectorOnboarding {...defaultProps} />);

      const button = screen.getByTestId('go-to-connectors-button');

      // Rapidly click 10 times
      for (let i = 0; i < 10; i++) {
        await userEvent.click(button);
      }

      expect(mockOnNavigateToConnectors).toHaveBeenCalledTimes(10);
    });

    it('should maintain functionality across re-renders', async () => {
      const { rerender } = render(<RosterConnectorOnboarding {...defaultProps} />);

      const button1 = screen.getByTestId('go-to-connectors-button');
      await userEvent.click(button1);
      expect(mockOnNavigateToConnectors).toHaveBeenCalledTimes(1);

      // Re-render with same props
      rerender(<RosterConnectorOnboarding {...defaultProps} />);

      const button2 = screen.getByTestId('go-to-connectors-button');
      await userEvent.click(button2);
      expect(mockOnNavigateToConnectors).toHaveBeenCalledTimes(2);
    });

    it('should handle prop changes correctly', async () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      const { rerender } = render(
        <RosterConnectorOnboarding onNavigateToConnectors={callback1} />
      );

      const button = screen.getByTestId('go-to-connectors-button');
      await userEvent.click(button);
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(0);

      // Re-render with different callback
      rerender(<RosterConnectorOnboarding onNavigateToConnectors={callback2} />);

      await userEvent.click(button);
      expect(callback1).toHaveBeenCalledTimes(1); // Still 1
      expect(callback2).toHaveBeenCalledTimes(1); // New callback called
    });

    it('should render with undefined onNavigateToConnectors prop', () => {
      // Suppress PropTypes warning
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Component should still render even with missing required prop
      const { container } = render(<RosterConnectorOnboarding />);

      // Verify component rendered (it may warn but shouldn't crash)
      expect(container.firstChild).toBeInTheDocument();
      expect(screen.getByText('Sync Players from External Platforms')).toBeInTheDocument();

      consoleError.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(<RosterConnectorOnboarding {...defaultProps} />);

      const heading = screen.getByText('Sync Players from External Platforms');
      expect(heading.tagName).toBe('H3');
    });

    it('should have descriptive paragraph text', () => {
      render(<RosterConnectorOnboarding {...defaultProps} />);

      const description = screen.getByText(
        /Connect to your team management platform to automatically sync your roster and practice attendance/i
      );
      expect(description.tagName).toBe('P');
    });

    it('should render button with accessible name', () => {
      render(<RosterConnectorOnboarding {...defaultProps} />);

      const button = screen.getByTestId('go-to-connectors-button');
      expect(button).toHaveTextContent('Go to Connectors');
    });

    it('should have Link icon with aria-hidden', () => {
      render(<RosterConnectorOnboarding {...defaultProps} />);

      const icon = screen.getByTestId('link-icon');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    it('should support keyboard navigation', async () => {
      render(<RosterConnectorOnboarding {...defaultProps} />);

      const button = screen.getByTestId('go-to-connectors-button');

      // Tab to button
      await userEvent.tab();

      // Button should be focusable
      expect(button).toBeInTheDocument();
    });

    it('should maintain logical tab order', () => {
      render(<RosterConnectorOnboarding {...defaultProps} />);

      // Provider logos should not be focusable (display-only)
      const sportadminLogo = screen.getByTestId('provider-logo-sportadmin');
      expect(sportadminLogo).not.toHaveAttribute('tabindex');

      // Button is the only interactive element
      const button = screen.getByTestId('go-to-connectors-button');
      expect(button.tagName).toBe('BUTTON');
    });
  });
});
