import React from 'react';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('should render spinner element', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  describe('Sizes', () => {
    it('should apply default lg size', () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('h-12', 'w-12');
    });

    it('should apply sm size', () => {
      const { container } = render(<LoadingSpinner size="sm" />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('h-4', 'w-4');
    });

    it('should apply md size', () => {
      const { container } = render(<LoadingSpinner size="md" />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('h-8', 'w-8');
    });
  });

  describe('Message', () => {
    it('should display message when provided', () => {
      render(<LoadingSpinner message="Loading data..." />);
      expect(screen.getByText('Loading data...')).toBeInTheDocument();
    });

    it('should not display message when not provided', () => {
      const { container } = render(<LoadingSpinner />);
      const message = container.querySelector('p');
      expect(message).not.toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('should merge custom className', () => {
      const { container } = render(<LoadingSpinner className="py-8" />);
      expect(container.firstChild).toHaveClass('py-8');
    });
  });
});
