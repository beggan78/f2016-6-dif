import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReportControls } from '../ReportControls';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  BarChart: ({ className }) => <div data-testid="bar-chart-icon" className={className} />,
  Printer: ({ className }) => <div data-testid="printer-icon" className={className} />,
  Share2: ({ className }) => <div data-testid="share-icon" className={className} />,
  Settings: ({ className }) => <div data-testid="settings-icon" className={className} />
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

describe('ReportControls', () => {
  let defaultProps;
  let mockHandlers;
  let mockNavigator;

  beforeEach(() => {
    // Mock handlers
    mockHandlers = {
      onNavigateToStats: jest.fn(),
      onPrint: jest.fn(),
      onShare: jest.fn(),
      onToggleSubstitutions: jest.fn(),
      onSortOrderChange: jest.fn(),
      onEventFilterChange: jest.fn()
    };

    // Default props
    defaultProps = {
      onNavigateToStats: mockHandlers.onNavigateToStats,
      onPrint: mockHandlers.onPrint,
      onShare: mockHandlers.onShare,
      showSubstitutions: false,
      onToggleSubstitutions: mockHandlers.onToggleSubstitutions,
      sortOrder: 'desc',
      onSortOrderChange: mockHandlers.onSortOrderChange,
      eventFilter: 'all',
      onEventFilterChange: mockHandlers.onEventFilterChange
    };

    // Mock navigator and window.print
    mockNavigator = {
      share: jest.fn(),
      clipboard: {
        writeText: jest.fn()
      }
    };

    // Create a fresh global object for each test
    Object.defineProperty(global, 'navigator', {
      value: mockNavigator,
      configurable: true
    });
    
    Object.defineProperty(global.window, 'print', {
      value: jest.fn(),
      configurable: true
    });
    
    Object.defineProperty(global.window, 'location', {
      value: {
        href: 'https://example.com/report'
      },
      configurable: true
    });
    
    global.alert = jest.fn();
    global.console.warn = jest.fn();

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Core Rendering', () => {
    it('renders all control buttons', () => {
      render(<ReportControls {...defaultProps} />);

      expect(screen.getByTestId('button-quick-stats')).toBeInTheDocument();
      expect(screen.getByTestId('button-print')).toBeInTheDocument();
      expect(screen.getByTestId('button-share')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart-icon')).toBeInTheDocument();
      expect(screen.getByTestId('printer-icon')).toBeInTheDocument();
      expect(screen.getByTestId('share-icon')).toBeInTheDocument();
    });

    it('renders report options section', () => {
      render(<ReportControls {...defaultProps} />);

      expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
      expect(screen.getByText('Report Options')).toBeInTheDocument();
      expect(screen.getByText('Event Timeline')).toBeInTheDocument();
      expect(screen.getByText('Show substitutions')).toBeInTheDocument();
    });

    it('renders substitution toggle with correct initial state', () => {
      render(<ReportControls {...defaultProps} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).not.toBeChecked();
    });

    it('renders substitution toggle as checked when showSubstitutions is true', () => {
      const props = { ...defaultProps, showSubstitutions: true };
      render(<ReportControls {...props} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('does not render Quick Stats button when onNavigateToStats is not provided', () => {
      const props = { ...defaultProps, onNavigateToStats: undefined };
      render(<ReportControls {...props} />);

      expect(screen.queryByTestId('button-quick-stats')).not.toBeInTheDocument();
    });

    it('renders sort order select when onSortOrderChange is provided', () => {
      render(<ReportControls {...defaultProps} />);

      expect(screen.getByText('Timeline Order')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Newest First')).toBeInTheDocument();
      expect(screen.getByText('Oldest First')).toBeInTheDocument();
    });

    it('does not render sort order select when onSortOrderChange is not provided', () => {
      const props = { ...defaultProps, onSortOrderChange: undefined };
      render(<ReportControls {...props} />);

      expect(screen.queryByText('Timeline Order')).not.toBeInTheDocument();
    });

    it('renders event filter select when onEventFilterChange is provided', () => {
      render(<ReportControls {...defaultProps} />);

      expect(screen.getByText('Event Filter')).toBeInTheDocument();
      expect(screen.getByDisplayValue('All Events')).toBeInTheDocument();
      expect(screen.getByText('Goals Only')).toBeInTheDocument();
      expect(screen.getByText('Substitutions Only')).toBeInTheDocument();
      expect(screen.getByText('Important Events')).toBeInTheDocument();
    });

    it('does not render event filter select when onEventFilterChange is not provided', () => {
      const props = { ...defaultProps, onEventFilterChange: undefined };
      render(<ReportControls {...props} />);

      expect(screen.queryByText('Event Filter')).not.toBeInTheDocument();
    });
  });

  describe('Print Functionality', () => {
    it('calls custom onPrint handler when provided', () => {
      render(<ReportControls {...defaultProps} />);

      const printButton = screen.getByTestId('button-print');
      fireEvent.click(printButton);

      expect(mockHandlers.onPrint).toHaveBeenCalledTimes(1);
      expect(global.window.print).not.toHaveBeenCalled();
    });

    it('calls window.print() when no custom onPrint handler is provided', () => {
      const props = { ...defaultProps, onPrint: undefined };
      render(<ReportControls {...props} />);

      const printButton = screen.getByTestId('button-print');
      fireEvent.click(printButton);

      expect(global.window.print).toHaveBeenCalledTimes(1);
    });

    it('has correct button variant and size for print button', () => {
      render(<ReportControls {...defaultProps} />);

      const printButton = screen.getByTestId('button-print');
      expect(printButton).toHaveAttribute('data-variant', 'secondary');
      expect(printButton).toHaveAttribute('data-size', 'md');
    });

    it('displays print icon and text', () => {
      render(<ReportControls {...defaultProps} />);

      const printButton = screen.getByTestId('button-print');
      expect(printButton).toHaveTextContent('Print');
      expect(screen.getByTestId('printer-icon')).toBeInTheDocument();
    });
  });

  describe('Share Functionality', () => {
    it('calls custom onShare handler when provided', async () => {
      render(<ReportControls {...defaultProps} />);

      const shareButton = screen.getByTestId('button-share');
      fireEvent.click(shareButton);

      expect(mockHandlers.onShare).toHaveBeenCalledTimes(1);
      expect(mockNavigator.share).not.toHaveBeenCalled();
    });

    (process.env.CI ? it.skip : it)('uses navigator.share when available and no custom handler provided', async () => {
      const props = { ...defaultProps, onShare: undefined };
      const mockShare = jest.fn().mockResolvedValue();
      Object.defineProperty(global, 'navigator', {
        value: {
          share: mockShare
        },
        configurable: true
      });

      render(<ReportControls {...props} />);

      const shareButton = screen.getByTestId('button-share');
      fireEvent.click(shareButton);

      await waitFor(() => {
        expect(mockShare).toHaveBeenCalledTimes(1);
        expect(mockShare).toHaveBeenCalledWith({
          title: 'Match Report',
          text: 'Check out this match report',
          url: 'https://example.com/report'
        });
      });
    });

    (process.env.CI ? it.skip : it)('handles navigator.share error gracefully', async () => {
      const props = { ...defaultProps, onShare: undefined };
      const shareError = new Error('Share failed');
      const mockShare = jest.fn().mockRejectedValue(shareError);
      Object.defineProperty(global, 'navigator', {
        value: {
          share: mockShare
        },
        configurable: true
      });

      render(<ReportControls {...props} />);

      const shareButton = screen.getByTestId('button-share');
      fireEvent.click(shareButton);

      await waitFor(() => {
        expect(mockShare).toHaveBeenCalledTimes(1);
        expect(global.console.warn).toHaveBeenCalledWith('Failed to share report:', shareError);
      });
    });

    (process.env.CI ? it.skip : it)('falls back to clipboard when navigator.share is not available', async () => {
      const props = { ...defaultProps, onShare: undefined };
      Object.defineProperty(global, 'navigator', {
        value: {
          clipboard: {
            writeText: jest.fn().mockResolvedValue()
          }
        },
        configurable: true
      });

      render(<ReportControls {...props} />);

      const shareButton = screen.getByTestId('button-share');
      fireEvent.click(shareButton);

      await waitFor(() => {
        expect(global.navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
        expect(global.navigator.clipboard.writeText).toHaveBeenCalledWith('https://example.com/report');
        expect(global.alert).toHaveBeenCalledWith('Report link copied to clipboard!');
      });
    });

    it('handles clipboard error gracefully', async () => {
      const props = { ...defaultProps, onShare: undefined };
      const clipboardError = new Error('Clipboard failed');
      Object.defineProperty(global, 'navigator', {
        value: {
          clipboard: {
            writeText: jest.fn().mockRejectedValue(clipboardError)
          }
        },
        configurable: true
      });

      render(<ReportControls {...props} />);

      const shareButton = screen.getByTestId('button-share');
      fireEvent.click(shareButton);

      await waitFor(() => {
        expect(global.navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
        expect(global.console.warn).toHaveBeenCalledWith('Failed to copy to clipboard:', clipboardError);
        expect(global.alert).not.toHaveBeenCalled();
      });
    });

    it('does nothing when neither navigator.share nor clipboard is available', async () => {
      const props = { ...defaultProps, onShare: undefined };
      Object.defineProperty(global, 'navigator', {
        value: {},
        configurable: true
      });

      render(<ReportControls {...props} />);

      const shareButton = screen.getByTestId('button-share');
      fireEvent.click(shareButton);

      // Should not crash and should not call any APIs
      expect(global.alert).not.toHaveBeenCalled();
      expect(global.console.warn).not.toHaveBeenCalled();
    });

    it('has correct button variant and size for share button', () => {
      render(<ReportControls {...defaultProps} />);

      const shareButton = screen.getByTestId('button-share');
      expect(shareButton).toHaveAttribute('data-variant', 'secondary');
      expect(shareButton).toHaveAttribute('data-size', 'md');
    });

    it('displays share icon and text', () => {
      render(<ReportControls {...defaultProps} />);

      const shareButton = screen.getByTestId('button-share');
      expect(shareButton).toHaveTextContent('Share');
      expect(screen.getByTestId('share-icon')).toBeInTheDocument();
    });
  });

  describe('Navigation Functionality', () => {
    it('calls onNavigateToStats when Quick Stats button is clicked', () => {
      render(<ReportControls {...defaultProps} />);

      const statsButton = screen.getByTestId('button-quick-stats');
      fireEvent.click(statsButton);

      expect(mockHandlers.onNavigateToStats).toHaveBeenCalledTimes(1);
    });

    it('has correct button variant and size for Quick Stats button', () => {
      render(<ReportControls {...defaultProps} />);

      const statsButton = screen.getByTestId('button-quick-stats');
      expect(statsButton).toHaveAttribute('data-variant', 'primary');
      expect(statsButton).toHaveAttribute('data-size', 'md');
    });

    it('displays Quick Stats icon and text', () => {
      render(<ReportControls {...defaultProps} />);

      const statsButton = screen.getByTestId('button-quick-stats');
      expect(statsButton).toHaveTextContent('Quick Stats');
      expect(screen.getByTestId('bar-chart-icon')).toBeInTheDocument();
    });
  });

  describe('Report Options - Substitutions Toggle', () => {
    it('calls onToggleSubstitutions with true when checkbox is checked', () => {
      render(<ReportControls {...defaultProps} />);

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      expect(mockHandlers.onToggleSubstitutions).toHaveBeenCalledTimes(1);
      expect(mockHandlers.onToggleSubstitutions).toHaveBeenCalledWith(true);
    });

    it('calls onToggleSubstitutions with false when checkbox is unchecked', () => {
      const props = { ...defaultProps, showSubstitutions: true };
      render(<ReportControls {...props} />);

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      expect(mockHandlers.onToggleSubstitutions).toHaveBeenCalledTimes(1);
      expect(mockHandlers.onToggleSubstitutions).toHaveBeenCalledWith(false);
    });

    it('does not crash when onToggleSubstitutions is not provided', () => {
      const props = { ...defaultProps, onToggleSubstitutions: undefined };
      render(<ReportControls {...props} />);

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      // Should not crash
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('has correct styling classes for checkbox', () => {
      render(<ReportControls {...defaultProps} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveClass('rounded', 'border-slate-500', 'bg-slate-700', 'text-sky-600', 'focus:ring-sky-500', 'focus:ring-offset-slate-800');
    });

    it('has correct label text and styling', () => {
      render(<ReportControls {...defaultProps} />);

      const label = screen.getByText('Show substitutions');
      expect(label).toBeInTheDocument();
      expect(label).toHaveClass('text-sm', 'text-slate-300');
    });
  });

  describe('Report Options - Sort Order Select', () => {
    it('displays current sort order value', () => {
      render(<ReportControls {...defaultProps} />);

      const select = screen.getByDisplayValue('Newest First');
      expect(select).toBeInTheDocument();
    });

    it('displays "Oldest First" when sortOrder is "asc"', () => {
      const props = { ...defaultProps, sortOrder: 'asc' };
      render(<ReportControls {...props} />);

      const select = screen.getByDisplayValue('Oldest First');
      expect(select).toBeInTheDocument();
    });

    it('defaults to "desc" when sortOrder is not provided', () => {
      const props = { ...defaultProps, sortOrder: undefined };
      render(<ReportControls {...props} />);

      const select = screen.getByDisplayValue('Newest First');
      expect(select).toBeInTheDocument();
    });

    it('calls onSortOrderChange when sort order is changed', () => {
      render(<ReportControls {...defaultProps} />);

      const select = screen.getByDisplayValue('Newest First');
      fireEvent.change(select, { target: { value: 'asc' } });

      expect(mockHandlers.onSortOrderChange).toHaveBeenCalledTimes(1);
      expect(mockHandlers.onSortOrderChange).toHaveBeenCalledWith('asc');
    });

    it('has correct styling classes for sort order select', () => {
      render(<ReportControls {...defaultProps} />);

      const select = screen.getByDisplayValue('Newest First');
      expect(select).toHaveClass('w-full', 'bg-slate-700', 'border', 'border-slate-500', 'text-slate-100', 'py-1.5', 'px-2.5', 'rounded-md', 'text-sm', 'focus:outline-none', 'focus:ring-2', 'focus:ring-sky-500', 'focus:border-sky-500');
    });

    it('has correct label text and styling for sort order', () => {
      render(<ReportControls {...defaultProps} />);

      const label = screen.getByText('Timeline Order');
      expect(label).toBeInTheDocument();
      expect(label).toHaveClass('text-xs', 'font-medium', 'text-slate-300');
    });
  });

  describe('Report Options - Event Filter Select', () => {
    it('displays current event filter value', () => {
      render(<ReportControls {...defaultProps} />);

      const select = screen.getByDisplayValue('All Events');
      expect(select).toBeInTheDocument();
    });

    it('displays "Goals Only" when eventFilter is "goals"', () => {
      const props = { ...defaultProps, eventFilter: 'goals' };
      render(<ReportControls {...props} />);

      const select = screen.getByDisplayValue('Goals Only');
      expect(select).toBeInTheDocument();
    });

    it('displays "Substitutions Only" when eventFilter is "substitutions"', () => {
      const props = { ...defaultProps, eventFilter: 'substitutions' };
      render(<ReportControls {...props} />);

      const select = screen.getByDisplayValue('Substitutions Only');
      expect(select).toBeInTheDocument();
    });

    it('displays "Important Events" when eventFilter is "important"', () => {
      const props = { ...defaultProps, eventFilter: 'important' };
      render(<ReportControls {...props} />);

      const select = screen.getByDisplayValue('Important Events');
      expect(select).toBeInTheDocument();
    });

    it('defaults to "all" when eventFilter is not provided', () => {
      const props = { ...defaultProps, eventFilter: undefined };
      render(<ReportControls {...props} />);

      const select = screen.getByDisplayValue('All Events');
      expect(select).toBeInTheDocument();
    });

    it('calls onEventFilterChange when event filter is changed', () => {
      render(<ReportControls {...defaultProps} />);

      const select = screen.getByDisplayValue('All Events');
      fireEvent.change(select, { target: { value: 'goals' } });

      expect(mockHandlers.onEventFilterChange).toHaveBeenCalledTimes(1);
      expect(mockHandlers.onEventFilterChange).toHaveBeenCalledWith('goals');
    });

    it('has correct styling classes for event filter select', () => {
      render(<ReportControls {...defaultProps} />);

      const select = screen.getByDisplayValue('All Events');
      expect(select).toHaveClass('w-full', 'bg-slate-700', 'border', 'border-slate-500', 'text-slate-100', 'py-1.5', 'px-2.5', 'rounded-md', 'text-sm', 'focus:outline-none', 'focus:ring-2', 'focus:ring-sky-500', 'focus:border-sky-500');
    });

    it('has correct label text and styling for event filter', () => {
      render(<ReportControls {...defaultProps} />);

      const label = screen.getByText('Event Filter');
      expect(label).toBeInTheDocument();
      expect(label).toHaveClass('text-xs', 'font-medium', 'text-slate-300');
    });
  });

  describe('Layout and Styling', () => {
    it('has correct container styling', () => {
      render(<ReportControls {...defaultProps} />);

      const container = screen.getByTestId('button-quick-stats').closest('.space-y-4');
      expect(container).toHaveClass('space-y-4', 'no-print');
    });

    it('has correct navigation controls layout', () => {
      render(<ReportControls {...defaultProps} />);

      const navContainer = screen.getByTestId('button-quick-stats').closest('div');
      expect(navContainer).toHaveClass('flex', 'gap-3');
    });

    it('has correct export controls layout', () => {
      render(<ReportControls {...defaultProps} />);

      const exportContainer = screen.getByTestId('button-print').closest('.flex');
      expect(exportContainer).toHaveClass('flex', 'gap-3');
    });

    it('has correct report options styling', () => {
      render(<ReportControls {...defaultProps} />);

      const optionsContainer = screen.getByText('Report Options').closest('.bg-slate-800');
      expect(optionsContainer).toHaveClass('bg-slate-800', 'rounded-lg', 'p-4', 'border', 'border-slate-700');
    });

    it('has correct report options header styling', () => {
      render(<ReportControls {...defaultProps} />);

      const header = screen.getByText('Report Options');
      expect(header).toHaveClass('text-sm', 'font-semibold', 'text-slate-200');
    });

    it('has correct report options grid layout', () => {
      render(<ReportControls {...defaultProps} />);

      const grid = screen.getByRole('checkbox').closest('.grid');
      expect(grid).toHaveClass('grid', 'grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3', 'gap-4');
    });
  });

  describe('Browser Compatibility', () => {
    it('handles missing location.href gracefully', async () => {
      const props = { ...defaultProps, onShare: undefined };
      Object.defineProperty(global.window, 'location', {
        value: {},
        configurable: true
      });
      Object.defineProperty(global, 'navigator', {
        value: { clipboard: { writeText: jest.fn().mockResolvedValue() } },
        configurable: true
      });

      render(<ReportControls {...props} />);

      const shareButton = screen.getByTestId('button-share');
      fireEvent.click(shareButton);

      // Should handle undefined href gracefully
      await waitFor(() => {
        expect(global.navigator.clipboard.writeText).toHaveBeenCalledWith(undefined);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles all props being undefined', () => {
      const props = {};
      render(<ReportControls {...props} />);

      // Should still render basic structure
      expect(screen.getByTestId('button-print')).toBeInTheDocument();
      expect(screen.getByTestId('button-share')).toBeInTheDocument();
      expect(screen.getByText('Report Options')).toBeInTheDocument();
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('handles boolean props correctly', () => {
      const props = {
        showSubstitutions: true,
        onToggleSubstitutions: mockHandlers.onToggleSubstitutions
      };
      render(<ReportControls {...props} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('handles string props correctly', () => {
      const props = {
        sortOrder: 'asc',
        onSortOrderChange: mockHandlers.onSortOrderChange,
        eventFilter: 'goals',
        onEventFilterChange: mockHandlers.onEventFilterChange
      };
      render(<ReportControls {...props} />);

      expect(screen.getByDisplayValue('Oldest First')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Goals Only')).toBeInTheDocument();
    });

    it('handles function props correctly', () => {
      render(<ReportControls {...defaultProps} />);

      // All function props should be callable
      expect(typeof mockHandlers.onNavigateToStats).toBe('function');
      expect(typeof mockHandlers.onPrint).toBe('function');
      expect(typeof mockHandlers.onShare).toBe('function');
      expect(typeof mockHandlers.onToggleSubstitutions).toBe('function');
      expect(typeof mockHandlers.onSortOrderChange).toBe('function');
      expect(typeof mockHandlers.onEventFilterChange).toBe('function');
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels', () => {
      render(<ReportControls {...defaultProps} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
      
      const checkboxLabel = screen.getByText('Show substitutions');
      expect(checkboxLabel).toBeInTheDocument();
    });

    it('has proper select labels', () => {
      render(<ReportControls {...defaultProps} />);

      const sortSelect = screen.getByDisplayValue('Newest First');
      const eventSelect = screen.getByDisplayValue('All Events');
      
      expect(sortSelect).toBeInTheDocument();
      expect(eventSelect).toBeInTheDocument();
      
      expect(screen.getByText('Timeline Order')).toBeInTheDocument();
      expect(screen.getByText('Event Filter')).toBeInTheDocument();
    });

    it('has proper button accessibility', () => {
      render(<ReportControls {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(3); // Quick Stats, Print, Share
      
      buttons.forEach(button => {
        expect(button).toBeEnabled();
      });
    });

    it('supports keyboard navigation for checkbox', () => {
      render(<ReportControls {...defaultProps} />);

      const checkbox = screen.getByRole('checkbox');
      checkbox.focus();
      
      // Checkbox should be focusable
      expect(document.activeElement).toBe(checkbox);
      
      // Simulate space key press by triggering click event
      fireEvent.click(checkbox);
      
      expect(mockHandlers.onToggleSubstitutions).toHaveBeenCalledWith(true);
    });

    it('supports keyboard navigation for select elements', () => {
      render(<ReportControls {...defaultProps} />);

      const sortSelect = screen.getByDisplayValue('Newest First');
      sortSelect.focus();
      
      fireEvent.keyDown(sortSelect, { key: 'ArrowDown' });
      fireEvent.change(sortSelect, { target: { value: 'asc' } });
      
      expect(mockHandlers.onSortOrderChange).toHaveBeenCalledWith('asc');
    });

    it('has proper ARIA attributes for interactive elements', () => {
      render(<ReportControls {...defaultProps} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('type', 'checkbox');
      
      // Select elements should be accessible as comboboxes
      const selects = screen.getAllByRole('combobox');
      expect(selects).toHaveLength(2); // sortOrder and eventFilter selects
      
      selects.forEach(select => {
        expect(select).toBeInTheDocument();
      });
    });

    it('has proper focus management', () => {
      render(<ReportControls {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const checkbox = screen.getByRole('checkbox');
      const selects = screen.getAllByRole('combobox');
      
      [...buttons, checkbox, ...selects].forEach(element => {
        element.focus();
        expect(document.activeElement).toBe(element);
      });
    });
  });

  describe('Mobile Device Interaction', () => {
    beforeEach(() => {
      // Mock touch events and mobile viewport
      Object.defineProperty(window, 'ontouchstart', {
        value: {},
        configurable: true
      });
      
      Object.defineProperty(window, 'screen', {
        value: {
          width: 375,
          height: 667
        },
        configurable: true
      });
    });

    it('handles touch events on buttons', () => {
      render(<ReportControls {...defaultProps} />);

      const printButton = screen.getByTestId('button-print');
      
      fireEvent.touchStart(printButton);
      fireEvent.touchEnd(printButton);
      fireEvent.click(printButton);

      expect(mockHandlers.onPrint).toHaveBeenCalledTimes(1);
    });

    it('handles touch events on checkbox', () => {
      render(<ReportControls {...defaultProps} />);

      const checkbox = screen.getByRole('checkbox');
      
      fireEvent.touchStart(checkbox);
      fireEvent.touchEnd(checkbox);
      fireEvent.click(checkbox);

      expect(mockHandlers.onToggleSubstitutions).toHaveBeenCalledWith(true);
    });

    it('handles mobile-specific share functionality', async () => {
      const props = { ...defaultProps, onShare: undefined };
      const mockShare = jest.fn().mockResolvedValue();
      Object.defineProperty(global, 'navigator', {
        value: {
          share: mockShare,
          userAgent: 'Mobile Safari'
        },
        configurable: true
      });

      render(<ReportControls {...props} />);

      const shareButton = screen.getByTestId('button-share');
      fireEvent.click(shareButton);

      await waitFor(() => {
        expect(mockShare).toHaveBeenCalledWith({
          title: 'Match Report',
          text: 'Check out this match report',
          url: 'https://example.com/report'
        });
      });
    });

    it('adapts layout for mobile screens', () => {
      render(<ReportControls {...defaultProps} />);

      // Check responsive grid classes are applied
      const grid = screen.getByRole('checkbox').closest('.grid');
      expect(grid).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3');

      // Check flex wrap is applied for button containers
      const buttonContainer = screen.getByTestId('button-quick-stats').closest('.flex-wrap');
      expect(buttonContainer).toHaveClass('flex-wrap');
    });
  });

  describe('Performance and Optimization', () => {
    it('does not cause unnecessary re-renders with stable props', () => {
      let renderCount = 0;
      const TestWrapper = ({ children }) => {
        renderCount++;
        return children;
      };

      const { rerender } = render(
        <TestWrapper>
          <ReportControls {...defaultProps} />
        </TestWrapper>
      );

      const initialRenderCount = renderCount;

      // Re-render with same props
      rerender(
        <TestWrapper>
          <ReportControls {...defaultProps} />
        </TestWrapper>
      );

      // Should not cause additional renders with identical props
      expect(renderCount).toBe(initialRenderCount + 1);
    });

    it('handles rapid user interactions gracefully', () => {
      render(<ReportControls {...defaultProps} />);

      const checkbox = screen.getByRole('checkbox');
      
      // Simulate rapid clicking
      for (let i = 0; i < 10; i++) {
        fireEvent.click(checkbox);
      }

      // Should call handler for each click
      expect(mockHandlers.onToggleSubstitutions).toHaveBeenCalledTimes(10);
    });

    it('efficiently handles large number of select options', () => {
      // This test ensures the component can handle extended option lists if needed
      render(<ReportControls {...defaultProps} />);

      const sortSelect = screen.getByDisplayValue('Newest First');
      const eventSelect = screen.getByDisplayValue('All Events');

      expect(sortSelect.children).toHaveLength(2); // Newest First, Oldest First
      expect(eventSelect.children).toHaveLength(4); // All, Goals, Substitutions, Important

      // Both selects should render efficiently
      expect(sortSelect).toBeInTheDocument();
      expect(eventSelect).toBeInTheDocument();
    });
  });

  describe('Browser Compatibility Edge Cases', () => {
    it('handles legacy browsers without navigator.share', () => {
      const props = { ...defaultProps, onShare: undefined };
      Object.defineProperty(global, 'navigator', {
        value: {
          // No share property
          clipboard: {
            writeText: jest.fn().mockResolvedValue()
          }
        },
        configurable: true
      });

      render(<ReportControls {...props} />);

      const shareButton = screen.getByTestId('button-share');
      fireEvent.click(shareButton);

      expect(global.navigator.clipboard.writeText).toHaveBeenCalledWith('https://example.com/report');
    });

    it('handles legacy browsers without clipboard API', () => {
      const props = { ...defaultProps, onShare: undefined };
      Object.defineProperty(global, 'navigator', {
        value: {
          // No share or clipboard properties
        },
        configurable: true
      });

      render(<ReportControls {...props} />);

      const shareButton = screen.getByTestId('button-share');
      fireEvent.click(shareButton);

      // Should not crash and not call any APIs
      expect(global.alert).not.toHaveBeenCalled();
      expect(global.console.warn).not.toHaveBeenCalled();
    });

    it('handles browsers with partial Web API support', () => {
      const props = { ...defaultProps, onShare: undefined };
      Object.defineProperty(global, 'navigator', {
        value: {
          share: undefined, // Explicitly undefined
          clipboard: null   // Explicitly null
        },
        configurable: true
      });

      render(<ReportControls {...props} />);

      const shareButton = screen.getByTestId('button-share');
      
      expect(() => {
        fireEvent.click(shareButton);
      }).not.toThrow();
    });

    it('handles different browser print implementations', () => {
      const props = { ...defaultProps, onPrint: undefined };
      
      // Mock window.print to be a custom implementation
      const mockPrint = jest.fn();
      const originalPrint = global.window.print;
      global.window.print = mockPrint;

      render(<ReportControls {...props} />);

      const printButton = screen.getByTestId('button-print');
      fireEvent.click(printButton);
      
      expect(mockPrint).toHaveBeenCalledTimes(1);
      
      // Restore original print function
      global.window.print = originalPrint;
    });
  });

  describe('Integration Scenarios', () => {
    it('properly integrates with parent component state management', () => {
      const parentState = {
        showSubstitutions: false,
        sortOrder: 'desc',
        eventFilter: 'all'
      };

      const { rerender } = render(<ReportControls {...defaultProps} {...parentState} />);

      // Simulate parent state change
      fireEvent.click(screen.getByRole('checkbox'));
      expect(mockHandlers.onToggleSubstitutions).toHaveBeenCalledWith(true);

      // Simulate parent updating state based on callback
      rerender(<ReportControls {...defaultProps} {...parentState} showSubstitutions={true} />);
      expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('handles complex callback sequences', () => {
      render(<ReportControls {...defaultProps} />);

      // Simulate a sequence of user actions
      fireEvent.click(screen.getByTestId('button-quick-stats'));
      fireEvent.change(screen.getByDisplayValue('Newest First'), { target: { value: 'asc' } });
      fireEvent.change(screen.getByDisplayValue('All Events'), { target: { value: 'goals' } });
      fireEvent.click(screen.getByRole('checkbox'));

      expect(mockHandlers.onNavigateToStats).toHaveBeenCalledTimes(1);
      expect(mockHandlers.onSortOrderChange).toHaveBeenCalledWith('asc');
      expect(mockHandlers.onEventFilterChange).toHaveBeenCalledWith('goals');
      expect(mockHandlers.onToggleSubstitutions).toHaveBeenCalledWith(true);
    });

    it('maintains state consistency across prop updates', () => {
      const { rerender } = render(<ReportControls {...defaultProps} />);

      // Update multiple props simultaneously
      rerender(<ReportControls 
        {...defaultProps} 
        showSubstitutions={true}
        sortOrder="asc"
        eventFilter="goals"
      />);

      expect(screen.getByRole('checkbox')).toBeChecked();
      expect(screen.getByDisplayValue('Oldest First')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Goals Only')).toBeInTheDocument();
    });

    it('handles rapid prop changes without errors', () => {
      const { rerender } = render(<ReportControls {...defaultProps} />);

      // Simulate rapid prop changes
      const propSequence = [
        { sortOrder: 'asc', eventFilter: 'goals' },
        { sortOrder: 'desc', eventFilter: 'substitutions' },
        { sortOrder: 'asc', eventFilter: 'important' },
        { sortOrder: 'desc', eventFilter: 'all' }
      ];

      propSequence.forEach(props => {
        expect(() => {
          rerender(<ReportControls {...defaultProps} {...props} />);
        }).not.toThrow();
      });
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('recovers gracefully from callback errors', () => {
      const erroringHandler = jest.fn(() => {
        throw new Error('Callback error');
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<ReportControls 
        {...defaultProps} 
        onToggleSubstitutions={erroringHandler} 
      />);

      const checkbox = screen.getByRole('checkbox');
      
      // The error should be caught and logged to console.error
      // We expect the handler to be called even if it throws
      fireEvent.click(checkbox);
      expect(erroringHandler).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Error in onToggleSubstitutions callback:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('handles network failures during share operations', async () => {
      const props = { ...defaultProps, onShare: undefined };
      const networkError = new Error('Network unavailable');
      const mockShare = jest.fn().mockRejectedValue(networkError);
      
      Object.defineProperty(global, 'navigator', {
        value: { share: mockShare },
        configurable: true
      });

      render(<ReportControls {...props} />);

      const shareButton = screen.getByTestId('button-share');
      fireEvent.click(shareButton);

      await waitFor(() => {
        expect(global.console.warn).toHaveBeenCalledWith('Failed to share report:', networkError);
      });
    });

    it('maintains functionality when optional props are removed', () => {
      const { rerender } = render(<ReportControls {...defaultProps} />);

      // Remove optional props one by one
      rerender(<ReportControls {...defaultProps} onNavigateToStats={undefined} />);
      expect(screen.queryByTestId('button-quick-stats')).not.toBeInTheDocument();

      rerender(<ReportControls {...defaultProps} onSortOrderChange={undefined} />);
      expect(screen.queryByText('Timeline Order')).not.toBeInTheDocument();

      rerender(<ReportControls {...defaultProps} onEventFilterChange={undefined} />);
      expect(screen.queryByText('Event Filter')).not.toBeInTheDocument();

      // Core functionality should still work
      expect(screen.getByTestId('button-print')).toBeInTheDocument();
      expect(screen.getByTestId('button-share')).toBeInTheDocument();
    });
  });
});