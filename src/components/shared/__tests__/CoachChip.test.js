import React from 'react';
import { render, screen } from '@testing-library/react';
import { CoachChip } from '../CoachChip';

describe('CoachChip', () => {
  it('should render initials from a full name', () => {
    render(<CoachChip name="John Doe" />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('should render single initial for a single name', () => {
    render(<CoachChip name="John" />);
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('should render nothing when name is null', () => {
    const { container } = render(<CoachChip name={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('should render nothing when name is not provided', () => {
    const { container } = render(<CoachChip />);
    expect(container).toBeEmptyDOMElement();
  });

  it('should show full name as tooltip', () => {
    render(<CoachChip name="Jane Smith" />);
    expect(screen.getByTitle('Jane Smith')).toBeInTheDocument();
  });

  describe('Sizes', () => {
    it('should apply default md size', () => {
      const { container } = render(<CoachChip name="AB" />);
      expect(container.firstChild).toHaveClass('w-7', 'h-7', 'text-xs');
    });

    it('should apply sm size', () => {
      const { container } = render(<CoachChip name="AB" size="sm" />);
      expect(container.firstChild).toHaveClass('w-5', 'h-5');
    });
  });
});
