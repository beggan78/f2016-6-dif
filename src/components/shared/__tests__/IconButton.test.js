import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { IconButton } from '../IconButton';
import { Trash2, Settings } from 'lucide-react';

const noop = () => {};

describe('IconButton', () => {
  it('should render with icon', () => {
    const { container } = render(<IconButton icon={Settings} label="Settings" onClick={noop} />);
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<IconButton icon={Settings} label="Settings" onClick={handleClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  describe('Accessibility', () => {
    it('should have aria-label', () => {
      render(<IconButton icon={Settings} label="Settings" onClick={noop} />);
      expect(screen.getByLabelText('Settings')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('should apply default variant styling', () => {
      render(<IconButton icon={Settings} label="Settings" onClick={noop} />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-slate-400');
    });

    it('should apply danger variant styling', () => {
      render(<IconButton icon={Trash2} label="Delete" variant="danger" onClick={noop} />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-slate-400');
    });
  });

  describe('Sizes', () => {
    it('should apply default md size', () => {
      render(<IconButton icon={Settings} label="Settings" onClick={noop} />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('p-2');
    });

    it('should apply sm size', () => {
      render(<IconButton icon={Settings} label="Settings" size="sm" onClick={noop} />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('p-1');
    });
  });

  describe('Disabled', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<IconButton icon={Settings} label="Settings" disabled onClick={noop} />);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
    });

    it('should not be disabled by default', () => {
      render(<IconButton icon={Settings} label="Settings" onClick={noop} />);
      expect(screen.getByRole('button')).not.toBeDisabled();
    });
  });

  describe('Custom className', () => {
    it('should merge custom className', () => {
      render(<IconButton icon={Settings} label="Settings" className="ml-2" onClick={noop} />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('ml-2');
    });
  });
});
