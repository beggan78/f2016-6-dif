import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReportSection } from '../ReportSection';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Users: ({ className, ...props }) => (
    <div data-testid="users-icon" className={className} {...props} />
  ),
  Trophy: ({ className, ...props }) => (
    <div data-testid="trophy-icon" className={className} {...props} />
  ),
  Clock: ({ className, ...props }) => (
    <div data-testid="clock-icon" className={className} {...props} />
  ),
  Activity: ({ className, ...props }) => (
    <div data-testid="activity-icon" className={className} {...props} />
  ),
  Settings: ({ className, ...props }) => (
    <div data-testid="settings-icon" className={className} {...props} />
  )
}));

describe('ReportSection', () => {
  let defaultProps;

  beforeEach(() => {
    defaultProps = {
      title: 'Test Section',
      children: <div data-testid="test-children">Test content</div>
    };
    
    jest.clearAllMocks();
  });

  describe('Basic Rendering Tests', () => {
    it('renders with required props (title and children)', () => {
      render(<ReportSection {...defaultProps} />);
      
      expect(screen.getByText('Test Section')).toBeInTheDocument();
      expect(screen.getByTestId('test-children')).toBeInTheDocument();
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('displays title text correctly', () => {
      const customTitle = 'Player Statistics Section';
      render(
        <ReportSection 
          {...defaultProps} 
          title={customTitle} 
        />
      );
      
      expect(screen.getByText(customTitle)).toBeInTheDocument();
      
      // Check title styling
      const titleElement = screen.getByText(customTitle);
      expect(titleElement).toHaveClass('text-xl', 'font-semibold', 'text-sky-300');
    });

    it('renders children content', () => {
      const complexChildren = (
        <div>
          <p data-testid="paragraph">Complex paragraph content</p>
          <button data-testid="child-button">Child Button</button>
          <span data-testid="child-span">Child Span</span>
        </div>
      );
      
      render(
        <ReportSection 
          {...defaultProps} 
          children={complexChildren}
        />
      );
      
      expect(screen.getByTestId('paragraph')).toBeInTheDocument();
      expect(screen.getByTestId('child-button')).toBeInTheDocument();
      expect(screen.getByTestId('child-span')).toBeInTheDocument();
      expect(screen.getByText('Complex paragraph content')).toBeInTheDocument();
    });

    it('creates section element with proper CSS classes', () => {
      const { container } = render(<ReportSection {...defaultProps} />);
      
      const sectionElement = container.querySelector('section');
      expect(sectionElement).toBeInTheDocument();
      expect(sectionElement).toHaveClass(
        'bg-slate-800',
        'rounded-lg', 
        'p-6',
        'border',
        'border-slate-700'
      );
    });
  });

  describe('Icon Handling Tests', () => {
    it('renders icon when provided', () => {
      const { Users } = require('lucide-react');
      
      render(
        <ReportSection 
          {...defaultProps} 
          icon={Users}
        />
      );
      
      const iconElement = screen.getByTestId('users-icon');
      expect(iconElement).toBeInTheDocument();
    });

    it('handles missing icon gracefully', () => {
      render(<ReportSection {...defaultProps} />);
      
      // Should not render any icon
      expect(screen.queryByTestId('users-icon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('trophy-icon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('clock-icon')).not.toBeInTheDocument();
      
      // But should still render title and content
      expect(screen.getByText('Test Section')).toBeInTheDocument();
      expect(screen.getByTestId('test-children')).toBeInTheDocument();
    });

    it('icon has correct CSS classes and positioning', () => {
      const { Trophy } = require('lucide-react');
      
      render(
        <ReportSection 
          {...defaultProps} 
          icon={Trophy}
        />
      );
      
      const iconElement = screen.getByTestId('trophy-icon');
      expect(iconElement).toHaveClass('h-5', 'w-5', 'text-sky-400', 'mr-2');
    });

    it('works with different Lucide icon components', () => {
      const { Clock, Activity, Settings } = require('lucide-react');
      
      // Test Clock icon
      const { rerender } = render(
        <ReportSection 
          {...defaultProps} 
          icon={Clock}
          title="Clock Section"
        />
      );
      
      expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
      expect(screen.getByText('Clock Section')).toBeInTheDocument();
      
      // Test Activity icon
      rerender(
        <ReportSection 
          {...defaultProps} 
          icon={Activity}
          title="Activity Section"
        />
      );
      
      expect(screen.getByTestId('activity-icon')).toBeInTheDocument();
      expect(screen.getByText('Activity Section')).toBeInTheDocument();
      
      // Test Settings icon
      rerender(
        <ReportSection 
          {...defaultProps} 
          icon={Settings}
          title="Settings Section"
        />
      );
      
      expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
      expect(screen.getByText('Settings Section')).toBeInTheDocument();
    });
  });

  describe('Header Layout Tests', () => {
    it('header layout without headerExtra (left-aligned)', () => {
      render(<ReportSection {...defaultProps} />);
      
      // Find the header div
      const titleElement = screen.getByText('Test Section');
      const headerDiv = titleElement.closest('div').parentElement;
      
      expect(headerDiv).toHaveClass('flex', 'items-center', 'mb-4');
      expect(headerDiv).not.toHaveClass('justify-between');
    });

    it('header layout with headerExtra (space-between)', () => {
      const headerExtra = (
        <button data-testid="header-button">Toggle View</button>
      );
      
      render(
        <ReportSection 
          {...defaultProps} 
          headerExtra={headerExtra}
        />
      );
      
      // Find the header div
      const titleElement = screen.getByText('Test Section');
      const headerDiv = titleElement.closest('div').parentElement;
      
      expect(headerDiv).toHaveClass('flex', 'items-center', 'mb-4', 'justify-between');
      expect(screen.getByTestId('header-button')).toBeInTheDocument();
    });

    it('headerExtra content renders in correct position', () => {
      const headerExtra = (
        <div data-testid="header-extra-content">
          <span>Extra Content</span>
          <button>Action</button>
        </div>
      );
      
      render(
        <ReportSection 
          {...defaultProps} 
          headerExtra={headerExtra}
        />
      );
      
      const headerExtraDiv = screen.getByTestId('header-extra-content');
      expect(headerExtraDiv).toBeInTheDocument();
      
      // Check that headerExtra is wrapped in correct div
      const headerExtraWrapper = headerExtraDiv.parentElement;
      expect(headerExtraWrapper).toHaveClass('flex', 'items-center');
    });

    it('multiple headerExtra elements handled properly', () => {
      const headerExtra = (
        <>
          <button data-testid="button-1">Button 1</button>
          <span data-testid="separator">|</span>
          <button data-testid="button-2">Button 2</button>
        </>
      );
      
      render(
        <ReportSection 
          {...defaultProps} 
          headerExtra={headerExtra}
        />
      );
      
      expect(screen.getByTestId('button-1')).toBeInTheDocument();
      expect(screen.getByTestId('separator')).toBeInTheDocument();
      expect(screen.getByTestId('button-2')).toBeInTheDocument();
    });
  });

  describe('Styling Tests', () => {
    it('default CSS classes applied correctly', () => {
      const { container } = render(<ReportSection {...defaultProps} />);
      
      const sectionElement = container.querySelector('section');
      expect(sectionElement).toHaveClass(
        'bg-slate-800',
        'rounded-lg',
        'p-6',
        'border',
        'border-slate-700'
      );
    });

    it('custom className prop merged with defaults', () => {
      const customClassName = 'custom-class another-class';
      const { container } = render(
        <ReportSection 
          {...defaultProps} 
          className={customClassName}
        />
      );
      
      const sectionElement = container.querySelector('section');
      expect(sectionElement).toHaveClass(
        'bg-slate-800',
        'rounded-lg',
        'p-6',
        'border',
        'border-slate-700',
        'custom-class',
        'another-class'
      );
    });

    it('background and border styling correct', () => {
      const { container } = render(<ReportSection {...defaultProps} />);
      
      const sectionElement = container.querySelector('section');
      expect(sectionElement).toHaveClass('bg-slate-800');
      expect(sectionElement).toHaveClass('border', 'border-slate-700');
      expect(sectionElement).toHaveClass('rounded-lg');
      expect(sectionElement).toHaveClass('p-6');
    });

    it('icon and title styling correct', () => {
      const { Users } = require('lucide-react');
      
      render(
        <ReportSection 
          {...defaultProps} 
          icon={Users}
          title="Styled Section"
        />
      );
      
      // Check icon styling
      const iconElement = screen.getByTestId('users-icon');
      expect(iconElement).toHaveClass('h-5', 'w-5', 'text-sky-400', 'mr-2');
      
      // Check title styling
      const titleElement = screen.getByText('Styled Section');
      expect(titleElement).toHaveClass('text-xl', 'font-semibold', 'text-sky-300');
    });
  });

  describe('Props Validation Tests', () => {
    it('required props validation (title, children)', () => {
      // Test with minimum required props
      render(
        <ReportSection 
          title="Required Title"
          children={<div>Required Children</div>}
        />
      );
      
      expect(screen.getByText('Required Title')).toBeInTheDocument();
      expect(screen.getByText('Required Children')).toBeInTheDocument();
    });

    it('optional props handled gracefully', () => {
      // Test without optional props
      render(
        <ReportSection 
          title="No Optional Props"
          children={<div>Content</div>}
        />
      );
      
      expect(screen.getByText('No Optional Props')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
      
      // Should not have icon or headerExtra
      expect(screen.queryByTestId('users-icon')).not.toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('complex children content (nested components)', () => {
      const complexChildren = (
        <div data-testid="complex-content">
          <header>
            <h3>Nested Header</h3>
          </header>
          <main>
            <table data-testid="nested-table">
              <thead>
                <tr>
                  <th>Column 1</th>
                  <th>Column 2</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Data 1</td>
                  <td>Data 2</td>
                </tr>
              </tbody>
            </table>
          </main>
          <footer>
            <button data-testid="nested-button">Nested Action</button>
          </footer>
        </div>
      );
      
      render(
        <ReportSection 
          title="Complex Content Section"
          children={complexChildren}
        />
      );
      
      expect(screen.getByTestId('complex-content')).toBeInTheDocument();
      expect(screen.getByText('Nested Header')).toBeInTheDocument();
      expect(screen.getByTestId('nested-table')).toBeInTheDocument();
      expect(screen.getByTestId('nested-button')).toBeInTheDocument();
      expect(screen.getByText('Column 1')).toBeInTheDocument();
      expect(screen.getByText('Data 1')).toBeInTheDocument();
    });

    it('React components as children', () => {
      const ChildComponent = ({ name }) => (
        <div data-testid="child-component">
          Hello, {name}!
        </div>
      );
      
      const children = (
        <div>
          <ChildComponent name="Test User" />
          <ChildComponent name="Another User" />
        </div>
      );
      
      render(
        <ReportSection 
          title="Component Children"
          children={children}
        />
      );
      
      expect(screen.getByText('Hello, Test User!')).toBeInTheDocument();
      expect(screen.getByText('Hello, Another User!')).toBeInTheDocument();
      expect(screen.getAllByTestId('child-component')).toHaveLength(2);
    });
  });

  describe('Edge Cases', () => {
    it('empty title string', () => {
      render(
        <ReportSection 
          title=""
          children={<div>Content with empty title</div>}
        />
      );
      
      const titleElement = screen.getByRole('heading', { level: 2 });
      expect(titleElement).toBeInTheDocument();
      expect(titleElement).toHaveTextContent('');
      expect(screen.getByText('Content with empty title')).toBeInTheDocument();
    });

    it('null/undefined headerExtra', () => {
      // Test with null headerExtra
      const { rerender } = render(
        <ReportSection 
          {...defaultProps} 
          headerExtra={null}
        />
      );
      
      const titleElement = screen.getByText('Test Section');
      const headerDiv = titleElement.closest('div').parentElement;
      expect(headerDiv).not.toHaveClass('justify-between');
      
      // Test with undefined headerExtra
      rerender(
        <ReportSection 
          {...defaultProps} 
          headerExtra={undefined}
        />
      );
      
      const titleElement2 = screen.getByText('Test Section');
      const headerDiv2 = titleElement2.closest('div').parentElement;
      expect(headerDiv2).not.toHaveClass('justify-between');
    });

    it('empty children', () => {
      render(
        <ReportSection 
          title="Empty Children Section"
          children={<></>}
        />
      );
      
      expect(screen.getByText('Empty Children Section')).toBeInTheDocument();
      
      // Should still render section structure
      const { container } = render(
        <ReportSection 
          title="Empty Children Section 2"
          children={null}
        />
      );
      
      expect(container.querySelector('section')).toBeInTheDocument();
    });

    it('complex headerExtra with multiple elements', () => {
      const complexHeaderExtra = (
        <div data-testid="complex-header-extra">
          <div className="flex space-x-2">
            <button className="btn-primary">Action 1</button>
            <select className="form-select">
              <option>Option 1</option>
              <option>Option 2</option>
            </select>
            <div className="status-indicator">
              <span className="status-dot"></span>
              <span>Status: Active</span>
            </div>
          </div>
        </div>
      );
      
      render(
        <ReportSection 
          title="Complex Header"
          headerExtra={complexHeaderExtra}
          children={<div>Content</div>}
        />
      );
      
      expect(screen.getByTestId('complex-header-extra')).toBeInTheDocument();
      expect(screen.getByText('Action 1')).toBeInTheDocument();
      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.getByText('Status: Active')).toBeInTheDocument();
      
      // Check that layout is still correct
      const headerDiv = screen.getByText('Complex Header').closest('div').parentElement;
      expect(headerDiv).toHaveClass('justify-between');
    });

    it('handles className edge cases', () => {
      // Test with empty className
      const { container, rerender } = render(
        <ReportSection 
          {...defaultProps} 
          className=""
        />
      );
      
      let sectionElement = container.querySelector('section');
      expect(sectionElement).toHaveClass('bg-slate-800', 'rounded-lg', 'p-6', 'border', 'border-slate-700');
      
      // Test with whitespace-only className
      rerender(
        <ReportSection 
          {...defaultProps} 
          className="   "
        />
      );
      
      sectionElement = container.querySelector('section');
      expect(sectionElement).toHaveClass('bg-slate-800', 'rounded-lg', 'p-6', 'border', 'border-slate-700');
      
      // Test with undefined className (should use default empty string)
      rerender(
        <ReportSection 
          title="Test"
          children={<div>Content</div>}
        />
      );
      
      sectionElement = container.querySelector('section');
      expect(sectionElement).toHaveClass('bg-slate-800', 'rounded-lg', 'p-6', 'border', 'border-slate-700');
    });

    it('handles very long title text', () => {
      const longTitle = 'This is an extremely long title that might cause layout issues or truncation problems in the component rendering and should be handled gracefully by the system';
      
      render(
        <ReportSection 
          title={longTitle}
          children={<div>Content</div>}
        />
      );
      
      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('handles special characters in title', () => {
      const specialTitle = 'Section with åäö & €£$ symbols and "quotes" and <tags>';
      
      render(
        <ReportSection 
          title={specialTitle}
          children={<div>Content</div>}
        />
      );
      
      expect(screen.getByText(specialTitle)).toBeInTheDocument();
    });
  });

  describe('Accessibility and Semantic HTML', () => {
    it('uses semantic section element', () => {
      const { container } = render(<ReportSection {...defaultProps} />);
      
      const sectionElement = container.querySelector('section');
      expect(sectionElement).toBeInTheDocument();
    });

    it('uses proper heading hierarchy', () => {
      render(<ReportSection {...defaultProps} />);
      
      const headingElement = screen.getByRole('heading', { level: 2 });
      expect(headingElement).toBeInTheDocument();
      expect(headingElement).toHaveTextContent('Test Section');
    });

    it('maintains proper DOM structure', () => {
      const { Users } = require('lucide-react');
      
      render(
        <ReportSection 
          title="Structured Section"
          icon={Users}
          headerExtra={<button>Extra</button>}
          children={<div>Main Content</div>}
        />
      );
      
      // Check DOM hierarchy
      const section = screen.getByText('Structured Section').closest('section');
      expect(section).toBeInTheDocument();
      
      // Header should be first child
      const header = section.firstChild;
      expect(header).toHaveClass('flex', 'items-center', 'mb-4');
      
      // Children should follow header
      const content = section.children[1];
      expect(content).toHaveTextContent('Main Content');
    });
  });
});