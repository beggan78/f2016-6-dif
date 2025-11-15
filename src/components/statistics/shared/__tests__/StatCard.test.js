import React from 'react';
import { render, screen } from '@testing-library/react';
import { StatCard } from '../StatCard';
import { Calendar } from 'lucide-react';

describe('StatCard', () => {
  const mockIcon = Calendar;
  const defaultProps = {
    icon: mockIcon,
    title: 'Total Matches',
    value: 42
  };

  describe('Component Rendering', () => {
    it('should render with all required props', () => {
      render(<StatCard {...defaultProps} />);

      expect(screen.getByText('Total Matches')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('should render icon component', () => {
      const { container } = render(<StatCard {...defaultProps} />);

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should apply correct styling to icon', () => {
      const { container } = render(<StatCard {...defaultProps} />);

      const icon = container.querySelector('svg');
      expect(icon).toHaveClass('h-5', 'w-5', 'text-sky-400');
    });

    it('should display title with correct styling', () => {
      render(<StatCard {...defaultProps} />);

      const title = screen.getByText('Total Matches');
      expect(title).toHaveClass('text-slate-400', 'text-sm');
    });

    it('should display value with correct styling', () => {
      render(<StatCard {...defaultProps} />);

      const value = screen.getByText('42');
      expect(value).toHaveClass('text-slate-100', 'text-xl', 'font-semibold');
    });
  });

  describe('Subtitle Support', () => {
    it('should render subtitle when provided', () => {
      render(<StatCard {...defaultProps} subtitle="In selected period" />);

      expect(screen.getByText('In selected period')).toBeInTheDocument();
    });

    it('should not render subtitle when not provided', () => {
      const { container } = render(<StatCard {...defaultProps} />);

      const subtitles = container.querySelectorAll('.text-xs');
      expect(subtitles).toHaveLength(0);
    });

    it('should apply correct styling to subtitle', () => {
      render(<StatCard {...defaultProps} subtitle="Tracked players" />);

      const subtitle = screen.getByText('Tracked players');
      expect(subtitle).toHaveClass('text-slate-400', 'text-xs');
    });
  });

  describe('Value Types', () => {
    it('should render numeric values', () => {
      render(<StatCard {...defaultProps} value={123} />);

      expect(screen.getByText('123')).toBeInTheDocument();
    });

    it('should render string values', () => {
      render(<StatCard {...defaultProps} value="85%" />);

      expect(screen.getByText('85%')).toBeInTheDocument();
    });

    it('should render zero values', () => {
      render(<StatCard {...defaultProps} value={0} />);

      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should render N/A string', () => {
      render(<StatCard {...defaultProps} value="N/A" />);

      expect(screen.getByText('N/A')).toBeInTheDocument();
    });

    it('should render player name values', () => {
      render(<StatCard {...defaultProps} value="Alice Johnson" />);

      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });
  });

  describe('Card Styling', () => {
    it('should apply correct background and border styling', () => {
      const { container } = render(<StatCard {...defaultProps} />);

      const card = container.firstChild;
      expect(card).toHaveClass('bg-slate-700', 'border', 'border-slate-600');
    });

    it('should apply correct padding and border radius', () => {
      const { container } = render(<StatCard {...defaultProps} />);

      const card = container.firstChild;
      expect(card).toHaveClass('p-4', 'rounded-lg');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible structure', () => {
      render(<StatCard {...defaultProps} subtitle="Test subtitle" />);

      // Should be able to find all text elements
      expect(screen.getByText('Total Matches')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('Test subtitle')).toBeInTheDocument();
    });

    it('should render icon with proper attributes', () => {
      const { container } = render(<StatCard {...defaultProps} />);

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long titles', () => {
      const longTitle = 'This is a very long title that should still render correctly';
      render(<StatCard {...defaultProps} title={longTitle} />);

      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('should handle very long values', () => {
      const longValue = '9,999,999,999';
      render(<StatCard {...defaultProps} value={longValue} />);

      expect(screen.getByText(longValue)).toBeInTheDocument();
    });

    it('should handle very long subtitles', () => {
      const longSubtitle = 'This is a very long subtitle with lots of information';
      render(<StatCard {...defaultProps} subtitle={longSubtitle} />);

      expect(screen.getByText(longSubtitle)).toBeInTheDocument();
    });

    it('should handle empty string values', () => {
      render(<StatCard {...defaultProps} value="" />);

      // Empty value should render but be empty
      const valueElement = screen.getByText((content, element) => {
        return element?.classList?.contains('text-xl');
      });
      expect(valueElement).toBeInTheDocument();
    });
  });

  describe('Different Icons', () => {
    it('should accept different icon components', () => {
      const DifferentIcon = ({ className }) => (
        <svg className={className} data-testid="different-icon" />
      );

      render(<StatCard {...defaultProps} icon={DifferentIcon} />);

      expect(screen.getByTestId('different-icon')).toBeInTheDocument();
    });
  });
});
