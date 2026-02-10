import React from 'react';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '../EmptyState';
import { Calendar } from 'lucide-react';

describe('EmptyState', () => {
  it('should render title', () => {
    render(<EmptyState title="No data available" />);
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  describe('Icon', () => {
    it('should render icon when provided', () => {
      const { container } = render(<EmptyState icon={Calendar} title="Empty" />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('h-12', 'w-12', 'text-slate-500');
    });

    it('should not render icon when not provided', () => {
      const { container } = render(<EmptyState title="Empty" />);
      const icon = container.querySelector('svg');
      expect(icon).not.toBeInTheDocument();
    });
  });

  describe('Message', () => {
    it('should render string message', () => {
      render(<EmptyState title="Empty" message="Try adding some items" />);
      expect(screen.getByText('Try adding some items')).toBeInTheDocument();
    });

    it('should render React node message', () => {
      const message = <span data-testid="custom-message">Custom content</span>;
      render(<EmptyState title="Empty" message={message} />);
      expect(screen.getByTestId('custom-message')).toBeInTheDocument();
    });

    it('should not render message when not provided', () => {
      render(<EmptyState title="Empty" />);
      const paragraphs = screen.queryAllByRole('paragraph');
      expect(paragraphs).toHaveLength(0);
    });
  });

  describe('Actions', () => {
    it('should render actions when provided', () => {
      const actions = <button>Add item</button>;
      render(<EmptyState title="Empty" actions={actions} />);
      expect(screen.getByText('Add item')).toBeInTheDocument();
    });

    it('should not render actions container when not provided', () => {
      const { container } = render(<EmptyState title="Empty" />);
      const actionContainer = container.querySelector('.mt-4');
      expect(actionContainer).not.toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply correct card styling', () => {
      const { container } = render(<EmptyState title="Empty" />);
      expect(container.firstChild).toHaveClass('bg-slate-700', 'p-8', 'rounded-lg', 'border', 'border-slate-600', 'text-center');
    });

    it('should merge custom className', () => {
      const { container } = render(<EmptyState title="Empty" className="mt-4" />);
      expect(container.firstChild).toHaveClass('mt-4');
    });
  });
});
