import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReportNavigation } from '../ReportNavigation';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  BarChart3: ({ className }) => <div data-testid="bar-chart3-icon" className={className} />
}));

// Mock the shared UI components
jest.mock('../../shared/UI', () => ({
  Button: ({ children, onClick, variant, size, Icon, ...props }) => (
    <button 
      onClick={onClick}
      data-testid={`button-${children.toLowerCase().replace(/\s+/g, '-')}`}
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {Icon && <Icon />}
      <span>{children}</span>
    </button>
  )
}));

describe('ReportNavigation', () => {
  let mockHandlers;

  beforeEach(() => {
    // Mock handlers
    mockHandlers = {
      onNavigateToStats: jest.fn()
    };

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Conditional Rendering Tests', () => {
    it('returns null when no navigation callbacks provided', () => {
      const { container } = render(<ReportNavigation />);
      expect(container.firstChild).toBeNull();
    });

    it('returns null when onNavigateToStats is null', () => {
      const { container } = render(
        <ReportNavigation 
          onNavigateToStats={null}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('returns null when onNavigateToStats is undefined', () => {
      const { container } = render(
        <ReportNavigation 
          onNavigateToStats={undefined}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders container when at least one callback provided - onNavigateToStats only', () => {
      render(<ReportNavigation onNavigateToStats={mockHandlers.onNavigateToStats} />);
      
      const container = screen.getByTestId('button-quick-stats').closest('div');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('flex', 'flex-wrap', 'gap-2', 'mb-4');
    });

    

    it('shows only Quick Stats button when only onNavigateToStats provided', () => {
      render(<ReportNavigation onNavigateToStats={mockHandlers.onNavigateToStats} />);

      expect(screen.getByTestId('button-quick-stats')).toBeInTheDocument();
      expect(screen.queryByTestId('button-back-to-game')).not.toBeInTheDocument();
    });

    

    
  });

  describe('Button Interaction Tests', () => {
    it('Quick Stats button calls onNavigateToStats when clicked', () => {
      render(<ReportNavigation onNavigateToStats={mockHandlers.onNavigateToStats} />);

      const statsButton = screen.getByTestId('button-quick-stats');
      fireEvent.click(statsButton);

      expect(mockHandlers.onNavigateToStats).toHaveBeenCalledTimes(1);
    });

    

    it('handles multiple clicks properly on Quick Stats button', () => {
      render(<ReportNavigation onNavigateToStats={mockHandlers.onNavigateToStats} />);

      const statsButton = screen.getByTestId('button-quick-stats');
      fireEvent.click(statsButton);
      fireEvent.click(statsButton);
      fireEvent.click(statsButton);

      expect(mockHandlers.onNavigateToStats).toHaveBeenCalledTimes(3);
    });

    

    
  });

  describe('Styling and Layout Tests', () => {
    it('applies correct CSS classes on container', () => {
      render(<ReportNavigation onNavigateToStats={mockHandlers.onNavigateToStats} />);

      const container = screen.getByTestId('button-quick-stats').closest('div');
      expect(container).toHaveClass('flex', 'flex-wrap', 'gap-2', 'mb-4');
    });

    it('handles custom className prop', () => {
      const customClass = 'custom-navigation-class';
      render(
        <ReportNavigation 
          onNavigateToStats={mockHandlers.onNavigateToStats}
          className={customClass}
        />
      );

      const container = screen.getByTestId('button-quick-stats').closest('div');
      expect(container).toHaveClass('flex', 'flex-wrap', 'gap-2', 'mb-4', customClass);
    });

    it('handles empty custom className prop', () => {
      render(
        <ReportNavigation 
          onNavigateToStats={mockHandlers.onNavigateToStats}
          className=""
        />
      );

      const container = screen.getByTestId('button-quick-stats').closest('div');
      expect(container).toHaveClass('flex', 'flex-wrap', 'gap-2', 'mb-4');
      expect(container.className).not.toContain('undefined');
      expect(container.className).not.toContain('null');
    });

    it('Quick Stats button has correct variant and size', () => {
      render(<ReportNavigation onNavigateToStats={mockHandlers.onNavigateToStats} />);

      const statsButton = screen.getByTestId('button-quick-stats');
      expect(statsButton).toHaveAttribute('data-variant', 'secondary');
      expect(statsButton).toHaveAttribute('data-size', 'sm');
    });

    

    it('Quick Stats button renders BarChart3 icon', () => {
      render(<ReportNavigation onNavigateToStats={mockHandlers.onNavigateToStats} />);

      expect(screen.getByTestId('bar-chart3-icon')).toBeInTheDocument();
    });

    
  });

  describe('Props Validation Tests', () => {
    it('handles undefined callback gracefully', () => {
      const { container } = render(
        <ReportNavigation 
          onNavigateToStats={undefined}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('handles null callback gracefully', () => {
      const { container } = render(
        <ReportNavigation 
          onNavigateToStats={null}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('works with custom className', () => {
      const testClass = 'test-class-name';
      render(
        <ReportNavigation 
          onNavigateToStats={mockHandlers.onNavigateToStats}
          className={testClass}
        />
      );

      const container = screen.getByTestId('button-quick-stats').closest('div');
      expect(container).toHaveClass(testClass);
    });

    it('renders proper button text for Quick Stats', () => {
      render(<ReportNavigation onNavigateToStats={mockHandlers.onNavigateToStats} />);

      const statsButton = screen.getByTestId('button-quick-stats');
      expect(statsButton).toHaveTextContent('Quick Stats');
    });

    

    it('handles string className prop correctly', () => {
      const className = 'my-custom-class another-class';
      render(
        <ReportNavigation 
          onNavigateToStats={mockHandlers.onNavigateToStats}
          className={className}
        />
      );

      const container = screen.getByTestId('button-quick-stats').closest('div');
      expect(container).toHaveClass('my-custom-class', 'another-class');
    });
  });

  describe('Integration Tests', () => {
    

    

    

    it('maintains layout integrity with single button', () => {
      render(<ReportNavigation onNavigateToStats={mockHandlers.onNavigateToStats} />);

      const container = screen.getByTestId('button-quick-stats').closest('div');
      const buttons = container.querySelectorAll('button');
      
      expect(buttons).toHaveLength(1);
      expect(container).toHaveClass('flex', 'flex-wrap', 'gap-2', 'mb-4');
    });

    

    it('trimmed className prevents extra whitespace', () => {
      const classNameWithSpaces = '  extra-class  ';
      render(
        <ReportNavigation 
          onNavigateToStats={mockHandlers.onNavigateToStats}
          className={classNameWithSpaces}
        />
      );

      const container = screen.getByTestId('button-quick-stats').closest('div');
      expect(container.className).not.toMatch(/^\s+|\s+$/); // No leading/trailing spaces
      expect(container).toHaveClass('extra-class');
    });
  });
});