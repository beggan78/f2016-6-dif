import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TabBar } from '../TabBar';

// Simple mock icon component
const MockIcon = ({ className }) => <svg data-testid="mock-icon" className={className} />;
const MockIcon2 = ({ className }) => <svg data-testid="mock-icon-2" className={className} />;

const defaultTabs = [
  { id: 'tab1', label: 'First Tab', icon: MockIcon },
  { id: 'tab2', label: 'Second Tab', icon: MockIcon2 },
  { id: 'tab3', label: 'Third Tab' },
];

describe('TabBar', () => {
  it('should render all tab labels', () => {
    render(<TabBar tabs={defaultTabs} activeTab="tab1" onTabChange={() => {}} />);

    expect(screen.getByText('First Tab')).toBeInTheDocument();
    expect(screen.getByText('Second Tab')).toBeInTheDocument();
    expect(screen.getByText('Third Tab')).toBeInTheDocument();
  });

  it('should render tab icons when provided', () => {
    render(<TabBar tabs={defaultTabs} activeTab="tab1" onTabChange={() => {}} />);

    expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
    expect(screen.getByTestId('mock-icon-2')).toBeInTheDocument();
  });

  it('should render tab without icon correctly', () => {
    const tabsWithoutIcons = [{ id: 'noicon', label: 'No Icon Tab' }];
    render(<TabBar tabs={tabsWithoutIcons} activeTab="noicon" onTabChange={() => {}} />);

    expect(screen.getByText('No Icon Tab')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-icon')).not.toBeInTheDocument();
  });

  it('should call onTabChange with tab id on click', () => {
    const onTabChange = jest.fn();
    render(<TabBar tabs={defaultTabs} activeTab="tab1" onTabChange={onTabChange} />);

    fireEvent.click(screen.getByText('Second Tab'));
    expect(onTabChange).toHaveBeenCalledWith('tab2');

    fireEvent.click(screen.getByText('Third Tab'));
    expect(onTabChange).toHaveBeenCalledWith('tab3');
  });

  describe('scroll variant', () => {
    it('should apply scroll variant container class', () => {
      const { container } = render(
        <TabBar tabs={defaultTabs} activeTab="tab1" onTabChange={() => {}} variant="scroll" />
      );

      expect(container.firstChild).toHaveClass('overflow-x-auto');
    });

    it('should apply active styling for active tab', () => {
      render(<TabBar tabs={defaultTabs} activeTab="tab1" onTabChange={() => {}} variant="scroll" />);

      const activeButton = screen.getByText('First Tab').closest('button');
      expect(activeButton).toHaveClass('border-sky-400', 'text-sky-300', 'bg-slate-600/50');
    });

    it('should apply inactive styling for non-active tabs', () => {
      render(<TabBar tabs={defaultTabs} activeTab="tab1" onTabChange={() => {}} variant="scroll" />);

      const inactiveButton = screen.getByText('Second Tab').closest('button');
      expect(inactiveButton).toHaveClass('border-transparent', 'text-slate-400');
    });

    it('should apply w-4 h-4 icon size', () => {
      render(<TabBar tabs={defaultTabs} activeTab="tab1" onTabChange={() => {}} variant="scroll" />);

      expect(screen.getByTestId('mock-icon')).toHaveClass('w-4', 'h-4');
    });
  });

  describe('wrap variant', () => {
    it('should apply wrap variant nav class', () => {
      const { container } = render(
        <TabBar tabs={defaultTabs} activeTab="tab1" onTabChange={() => {}} variant="wrap" />
      );

      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('flex', 'flex-wrap');
    });

    it('should not have overflow-x-auto container class', () => {
      const { container } = render(
        <TabBar tabs={defaultTabs} activeTab="tab1" onTabChange={() => {}} variant="wrap" />
      );

      expect(container.firstChild).not.toHaveClass('overflow-x-auto');
    });

    it('should apply active styling for active tab', () => {
      render(<TabBar tabs={defaultTabs} activeTab="tab1" onTabChange={() => {}} variant="wrap" />);

      const activeButton = screen.getByText('First Tab').closest('button');
      expect(activeButton).toHaveClass('border-sky-400', 'text-sky-400');
    });

    it('should apply inactive styling for non-active tabs', () => {
      render(<TabBar tabs={defaultTabs} activeTab="tab1" onTabChange={() => {}} variant="wrap" />);

      const inactiveButton = screen.getByText('Second Tab').closest('button');
      expect(inactiveButton).toHaveClass('border-transparent', 'text-slate-400');
    });

    it('should apply h-5 w-5 icon size', () => {
      render(<TabBar tabs={defaultTabs} activeTab="tab1" onTabChange={() => {}} variant="wrap" />);

      expect(screen.getByTestId('mock-icon')).toHaveClass('h-5', 'w-5');
    });
  });

  describe('badge rendering', () => {
    it('should render badge when tab has a badge value', () => {
      const tabsWithBadge = [
        { id: 'badged', label: 'Badged Tab', icon: MockIcon, badge: 3 },
      ];
      render(<TabBar tabs={tabsWithBadge} activeTab="badged" onTabChange={() => {}} />);

      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('3')).toHaveClass('bg-red-600');
    });

    it('should render badge with value 0', () => {
      const tabsWithZeroBadge = [
        { id: 'zero', label: 'Zero Badge', badge: 0 },
      ];
      render(<TabBar tabs={tabsWithZeroBadge} activeTab="zero" onTabChange={() => {}} />);

      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should not render badge when badge is null', () => {
      const tabsNoBadge = [
        { id: 'nobadge', label: 'No Badge', badge: null },
      ];
      render(<TabBar tabs={tabsNoBadge} activeTab="nobadge" onTabChange={() => {}} />);

      const button = screen.getByText('No Badge').closest('button');
      expect(button.querySelector('.bg-red-600')).toBeNull();
    });

    it('should not render badge when badge is undefined', () => {
      const tabsNoBadge = [{ id: 'nobadge', label: 'No Badge' }];
      render(<TabBar tabs={tabsNoBadge} activeTab="nobadge" onTabChange={() => {}} />);

      const button = screen.getByText('No Badge').closest('button');
      expect(button.querySelector('.bg-red-600')).toBeNull();
    });
  });

  describe('className merging', () => {
    it('should merge custom className', () => {
      const { container } = render(
        <TabBar tabs={defaultTabs} activeTab="tab1" onTabChange={() => {}} className="mt-4" />
      );

      expect(container.firstChild).toHaveClass('mt-4');
    });

    it('should work without custom className', () => {
      const { container } = render(
        <TabBar tabs={defaultTabs} activeTab="tab1" onTabChange={() => {}} />
      );

      expect(container.firstChild).toHaveClass('overflow-x-auto');
    });
  });

  describe('defaults', () => {
    it('should default to scroll variant', () => {
      const { container } = render(
        <TabBar tabs={defaultTabs} activeTab="tab1" onTabChange={() => {}} />
      );

      expect(container.firstChild).toHaveClass('overflow-x-auto');
    });

    it('should fall back to scroll variant for unknown variant', () => {
      const { container } = render(
        <TabBar tabs={defaultTabs} activeTab="tab1" onTabChange={() => {}} variant="unknown" />
      );

      expect(container.firstChild).toHaveClass('overflow-x-auto');
    });
  });
});
