import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReportNavigation } from '../ReportNavigation';

jest.mock('lucide-react', () => ({
  ArrowLeft: ({ className }) => <div data-testid="arrow-left-icon" className={className} />
}));

jest.mock('../../shared/UI', () => ({
  Button: ({ children, onClick, variant, size, Icon, ...props }) => (
    <button
      onClick={onClick}
      data-testid={`button-${children.toLowerCase()}`}
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {Icon && <Icon />}
      <span>{children}</span>
    </button>
  )
}));

describe('ReportNavigation', () => {
  it('returns null when no back handler is provided', () => {
    const { container } = render(<ReportNavigation />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a back button when handler is provided', () => {
    const onNavigateBack = jest.fn();
    render(<ReportNavigation onNavigateBack={onNavigateBack} />);

    expect(screen.getByTestId('button-back')).toBeInTheDocument();
    expect(screen.getByTestId('arrow-left-icon')).toBeInTheDocument();
  });

  it('invokes onNavigateBack when clicking Back', () => {
    const onNavigateBack = jest.fn();
    render(<ReportNavigation onNavigateBack={onNavigateBack} />);

    fireEvent.click(screen.getByTestId('button-back'));
    expect(onNavigateBack).toHaveBeenCalledTimes(1);
  });

  it('applies custom className to container', () => {
    const onNavigateBack = jest.fn();
    const { container } = render(
      <ReportNavigation onNavigateBack={onNavigateBack} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('flex', 'flex-wrap', 'gap-2', 'mb-4', 'custom-class');
  });
});
