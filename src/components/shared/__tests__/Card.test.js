import React from 'react';
import { render, screen } from '@testing-library/react';
import { Card } from '../Card';

describe('Card', () => {
  it('should render children', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  describe('Variants', () => {
    it('should apply default variant styling', () => {
      const { container } = render(<Card>content</Card>);
      expect(container.firstChild).toHaveClass('bg-slate-700', 'border-slate-600');
    });

    it('should apply dark variant styling', () => {
      const { container } = render(<Card variant="dark">content</Card>);
      expect(container.firstChild).toHaveClass('bg-slate-800', 'border-slate-600');
    });

    it('should apply highlighted variant styling', () => {
      const { container } = render(<Card variant="highlighted">content</Card>);
      expect(container.firstChild).toHaveClass('border');
    });

    it('should apply subtle variant styling', () => {
      const { container } = render(<Card variant="subtle">content</Card>);
      expect(container.firstChild).toHaveClass('border');
    });
  });

  describe('Padding', () => {
    it('should apply default md padding', () => {
      const { container } = render(<Card>content</Card>);
      expect(container.firstChild).toHaveClass('p-4');
    });

    it('should apply sm padding', () => {
      const { container } = render(<Card padding="sm">content</Card>);
      expect(container.firstChild).toHaveClass('p-3');
    });

    it('should apply lg padding', () => {
      const { container } = render(<Card padding="lg">content</Card>);
      expect(container.firstChild).toHaveClass('p-6');
    });
  });

  describe('Custom className', () => {
    it('should merge custom className', () => {
      const { container } = render(<Card className="mt-4">content</Card>);
      expect(container.firstChild).toHaveClass('mt-4', 'rounded-lg', 'border');
    });
  });

  describe('Structure', () => {
    it('should always have rounded-lg and border classes', () => {
      const { container } = render(<Card>content</Card>);
      expect(container.firstChild).toHaveClass('rounded-lg', 'border');
    });
  });
});
