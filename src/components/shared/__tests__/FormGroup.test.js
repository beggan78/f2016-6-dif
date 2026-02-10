import React from 'react';
import { render, screen } from '@testing-library/react';
import { FormGroup } from '../FormGroup';

describe('FormGroup', () => {
  it('should render children', () => {
    render(
      <FormGroup label="Name">
        <input data-testid="input" />
      </FormGroup>
    );
    expect(screen.getByTestId('input')).toBeInTheDocument();
  });

  describe('Label', () => {
    it('should render label when provided', () => {
      render(
        <FormGroup label="Email Address">
          <input />
        </FormGroup>
      );
      expect(screen.getByText('Email Address')).toBeInTheDocument();
    });

    it('should not render label when not provided', () => {
      const { container } = render(
        <FormGroup>
          <input />
        </FormGroup>
      );
      const label = container.querySelector('label');
      expect(label).not.toBeInTheDocument();
    });

    it('should apply correct label styling', () => {
      render(
        <FormGroup label="Field">
          <input />
        </FormGroup>
      );
      const label = screen.getByText('Field');
      expect(label).toHaveClass('block', 'text-sm', 'font-medium', 'text-slate-300', 'mb-2');
    });

    it('should set htmlFor on label', () => {
      render(
        <FormGroup label="Email" htmlFor="email-input">
          <input id="email-input" />
        </FormGroup>
      );
      const label = screen.getByText('Email');
      expect(label).toHaveAttribute('for', 'email-input');
    });
  });

  describe('Required', () => {
    it('should show required indicator when required', () => {
      render(
        <FormGroup label="Name" required>
          <input />
        </FormGroup>
      );
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('should not show required indicator by default', () => {
      render(
        <FormGroup label="Name">
          <input />
        </FormGroup>
      );
      expect(screen.queryByText('*')).not.toBeInTheDocument();
    });
  });

  describe('Error', () => {
    it('should render error message when provided', () => {
      render(
        <FormGroup label="Email" error="Invalid email address">
          <input />
        </FormGroup>
      );
      expect(screen.getByText('Invalid email address')).toBeInTheDocument();
    });

    it('should apply correct error styling', () => {
      render(
        <FormGroup label="Email" error="Required field">
          <input />
        </FormGroup>
      );
      const error = screen.getByText('Required field');
      expect(error).toHaveClass('text-rose-400', 'text-sm', 'mt-1');
    });

    it('should not render error when not provided', () => {
      const { container } = render(
        <FormGroup label="Email">
          <input />
        </FormGroup>
      );
      const error = container.querySelector('.text-rose-400');
      expect(error).not.toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('should merge custom className', () => {
      const { container } = render(
        <FormGroup label="Field" className="mb-4">
          <input />
        </FormGroup>
      );
      expect(container.firstChild).toHaveClass('mb-4');
    });
  });
});
