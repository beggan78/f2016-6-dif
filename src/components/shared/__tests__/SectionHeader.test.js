import React from 'react';
import { render, screen } from '@testing-library/react';
import { SectionHeader } from '../SectionHeader';
import { Settings } from 'lucide-react';

describe('SectionHeader', () => {
  it('should render title', () => {
    render(<SectionHeader title="Player Statistics" />);
    expect(screen.getByText('Player Statistics')).toBeInTheDocument();
  });

  describe('Title Styling', () => {
    it('should apply correct title classes', () => {
      render(<SectionHeader title="Test" />);
      const heading = screen.getByText('Test');
      expect(heading).toHaveClass('text-lg', 'font-semibold', 'text-sky-300');
    });
  });

  describe('Icon', () => {
    it('should render icon when provided', () => {
      const { container } = render(<SectionHeader title="Settings" icon={Settings} />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('h-5', 'w-5');
    });

    it('should not render icon when not provided', () => {
      const { container } = render(<SectionHeader title="No Icon" />);
      const icon = container.querySelector('svg');
      expect(icon).not.toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should render actions when provided', () => {
      const actions = <button>Edit</button>;
      render(<SectionHeader title="Header" actions={actions} />);
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    it('should not render actions container when not provided', () => {
      const { container } = render(<SectionHeader title="Header" />);
      // Only the heading should be a direct child
      const children = container.firstChild.children;
      expect(children).toHaveLength(1);
    });
  });

  describe('Border', () => {
    it('should not have border by default', () => {
      const { container } = render(<SectionHeader title="Test" />);
      expect(container.firstChild).not.toHaveClass('border-b');
    });

    it('should have border when border prop is true', () => {
      const { container } = render(<SectionHeader title="Test" border />);
      expect(container.firstChild).toHaveClass('border-b', 'border-slate-600', 'pb-3');
    });
  });

  describe('Custom className', () => {
    it('should merge custom className', () => {
      const { container } = render(<SectionHeader title="Test" className="mb-4" />);
      expect(container.firstChild).toHaveClass('mb-4');
    });
  });
});
