import React from 'react';
import { render, screen } from '@testing-library/react';
import { Avatar } from '../Avatar';

describe('Avatar', () => {
  it('should render children', () => {
    render(<Avatar>AB</Avatar>);
    expect(screen.getByText('AB')).toBeInTheDocument();
  });

  describe('Sizes', () => {
    it('should apply default md size', () => {
      const { container } = render(<Avatar>A</Avatar>);
      expect(container.firstChild).toHaveClass('w-8', 'h-8', 'text-sm');
    });

    it('should apply sm size', () => {
      const { container } = render(<Avatar size="sm">A</Avatar>);
      expect(container.firstChild).toHaveClass('w-6', 'h-6', 'text-xs');
    });

    it('should apply lg size', () => {
      const { container } = render(<Avatar size="lg">A</Avatar>);
      expect(container.firstChild).toHaveClass('w-10', 'h-10', 'text-base');
    });

    it('should apply xl size', () => {
      const { container } = render(<Avatar size="xl">A</Avatar>);
      expect(container.firstChild).toHaveClass('w-12', 'h-12', 'text-lg');
    });
  });

  describe('Colors', () => {
    it('should apply default sky color', () => {
      const { container } = render(<Avatar>A</Avatar>);
      expect(container.firstChild).toHaveClass('bg-sky-600');
    });

    it('should apply emerald color', () => {
      const { container } = render(<Avatar color="emerald">A</Avatar>);
      expect(container.firstChild).toHaveClass('bg-emerald-600');
    });

    it('should apply slate color', () => {
      const { container } = render(<Avatar color="slate">A</Avatar>);
      expect(container.firstChild).toHaveClass('bg-slate-600');
    });
  });

  describe('Custom className', () => {
    it('should merge custom className', () => {
      const { container } = render(<Avatar className="mr-3">A</Avatar>);
      expect(container.firstChild).toHaveClass('mr-3', 'rounded-full');
    });
  });

  describe('Structure', () => {
    it('should always have base styling classes', () => {
      const { container } = render(<Avatar>A</Avatar>);
      expect(container.firstChild).toHaveClass('rounded-full', 'flex', 'items-center', 'justify-center', 'shrink-0', 'text-white', 'font-medium');
    });

    it('should render icon children', () => {
      const { container } = render(
        <Avatar size="sm">
          <svg data-testid="test-icon" />
        </Avatar>
      );
      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
      expect(container.firstChild).toHaveClass('w-6', 'h-6');
    });
  });
});
