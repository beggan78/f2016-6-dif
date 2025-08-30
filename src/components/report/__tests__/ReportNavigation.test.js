import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReportNavigation } from '../ReportNavigation';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  BarChart3: ({ className }) => <div data-testid="bar-chart3-icon" className={className} />,
  ArrowLeft: ({ className }) => <div data-testid="arrow-left-icon" className={className} />
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
      onNavigateToStats: jest.fn(),
      onNavigateBack: jest.fn()
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

    it('returns null when both callbacks are null', () => {
      const { container } = render(
        <ReportNavigation 
          onNavigateToStats={null}
          onNavigateBack={null}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('returns null when both callbacks are undefined', () => {
      const { container } = render(
        <ReportNavigation 
          onNavigateToStats={undefined}
          onNavigateBack={undefined}
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
      expect(screen.queryByTestId('button-back')).not.toBeInTheDocument();
    });

    it('shows only Back button when only onNavigateBack provided', () => {
      render(<ReportNavigation onNavigateBack={mockHandlers.onNavigateBack} />);

      expect(screen.getByTestId('button-back')).toBeInTheDocument();
      expect(screen.queryByTestId('button-quick-stats')).not.toBeInTheDocument();
    });

    it('shows both buttons when both callbacks provided', () => {
      render(
        <ReportNavigation 
          onNavigateToStats={mockHandlers.onNavigateToStats}
          onNavigateBack={mockHandlers.onNavigateBack}
        />
      );

      expect(screen.getByTestId('button-back')).toBeInTheDocument();
      expect(screen.getByTestId('button-quick-stats')).toBeInTheDocument();
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

    it('Back button calls onNavigateBack without parameters when clicked', () => {
      render(<ReportNavigation onNavigateBack={mockHandlers.onNavigateBack} />);

      const backButton = screen.getByTestId('button-back');
      fireEvent.click(backButton);

      // The critical test: onNavigateBack should be called with no arguments (not with the event object)
      expect(mockHandlers.onNavigateBack).toHaveBeenCalledTimes(1);
      expect(mockHandlers.onNavigateBack).toHaveBeenCalledWith();
    });

    it('handles multiple clicks properly on Back button', () => {
      render(<ReportNavigation onNavigateBack={mockHandlers.onNavigateBack} />);

      const backButton = screen.getByTestId('button-back');
      fireEvent.click(backButton);
      fireEvent.click(backButton);

      expect(mockHandlers.onNavigateBack).toHaveBeenCalledTimes(2);
      // Each call should be made without arguments
      expect(mockHandlers.onNavigateBack).toHaveBeenNthCalledWith(1);
      expect(mockHandlers.onNavigateBack).toHaveBeenNthCalledWith(2);
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

    it('Back button has correct variant and size', () => {
      render(<ReportNavigation onNavigateBack={mockHandlers.onNavigateBack} />);

      const backButton = screen.getByTestId('button-back');
      expect(backButton).toHaveAttribute('data-variant', 'secondary');
      expect(backButton).toHaveAttribute('data-size', 'sm');
    });

    it('Back button renders ArrowLeft icon', () => {
      render(<ReportNavigation onNavigateBack={mockHandlers.onNavigateBack} />);

      expect(screen.getByTestId('arrow-left-icon')).toBeInTheDocument();
    });

    it('Back button has correct text content', () => {
      render(<ReportNavigation onNavigateBack={mockHandlers.onNavigateBack} />);

      const backButton = screen.getByTestId('button-back');
      expect(backButton).toHaveTextContent('Back');
    });

    
  });

  describe('Props Validation Tests', () => {
    it('handles undefined callbacks gracefully', () => {
      const { container } = render(
        <ReportNavigation 
          onNavigateToStats={undefined}
          onNavigateBack={undefined}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('handles null callbacks gracefully', () => {
      const { container } = render(
        <ReportNavigation 
          onNavigateToStats={null}
          onNavigateBack={null}
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

    it('maintains layout integrity with both buttons', () => {
      render(
        <ReportNavigation 
          onNavigateToStats={mockHandlers.onNavigateToStats}
          onNavigateBack={mockHandlers.onNavigateBack}
        />
      );

      const container = screen.getByTestId('button-back').closest('div');
      const buttons = container.querySelectorAll('button');
      
      expect(buttons).toHaveLength(2);
      expect(container).toHaveClass('flex', 'flex-wrap', 'gap-2', 'mb-4');
      
      // Verify both buttons are present
      expect(screen.getByTestId('button-back')).toBeInTheDocument();
      expect(screen.getByTestId('button-quick-stats')).toBeInTheDocument();
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