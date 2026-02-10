import React from 'react';
import { render, screen } from '@testing-library/react';
import { Alert } from '../Alert';
import { AlertCircle } from 'lucide-react';

describe('Alert', () => {
  it('should render children content', () => {
    render(<Alert>Something went wrong</Alert>);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  describe('Variants', () => {
    it('should apply error variant by default', () => {
      const { container } = render(<Alert>Error</Alert>);
      expect(container.firstChild).toHaveClass('border');
    });

    it('should apply error variant styling', () => {
      const { container } = render(<Alert variant="error">Error</Alert>);
      expect(container.firstChild).toHaveClass('text-rose-300');
    });

    it('should apply success variant styling', () => {
      const { container } = render(<Alert variant="success">Success</Alert>);
      expect(container.firstChild).toHaveClass('text-emerald-300');
    });

    it('should apply info variant styling', () => {
      const { container } = render(<Alert variant="info">Info</Alert>);
      expect(container.firstChild).toHaveClass('text-sky-300');
    });

    it('should apply warning variant styling', () => {
      const { container } = render(<Alert variant="warning">Warning</Alert>);
      expect(container.firstChild).toHaveClass('text-amber-300');
    });
  });

  describe('Icon', () => {
    it('should render icon when provided', () => {
      const { container } = render(<Alert icon={AlertCircle}>With icon</Alert>);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should not render icon when not provided', () => {
      const { container } = render(<Alert>No icon</Alert>);
      const icon = container.querySelector('svg');
      expect(icon).not.toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('should merge custom className', () => {
      const { container } = render(<Alert className="mb-4">content</Alert>);
      expect(container.firstChild).toHaveClass('mb-4', 'rounded-lg', 'border');
    });
  });
});
