import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModalShell } from '../ModalShell';
import { AlertTriangle } from 'lucide-react';

describe('ModalShell', () => {
  describe('Simple variant (no icon)', () => {
    it('should render title in simple header', () => {
      render(<ModalShell title="My Title"><p>content</p></ModalShell>);
      expect(screen.getByText('My Title')).toBeInTheDocument();
    });

    it('should render children content', () => {
      render(<ModalShell title="Title"><p>Body content</p></ModalShell>);
      expect(screen.getByText('Body content')).toBeInTheDocument();
    });

    it('should use sky-300 title color in simple variant', () => {
      render(<ModalShell title="Title"><p>content</p></ModalShell>);
      const title = screen.getByText('Title');
      expect(title).toHaveClass('text-sky-300');
    });

    it('should render border-b separator in simple header', () => {
      const { container } = render(<ModalShell title="Title"><p>content</p></ModalShell>);
      const headerDiv = container.querySelector('.border-b');
      expect(headerDiv).toBeInTheDocument();
    });
  });

  describe('Rich variant (with icon)', () => {
    it('should render icon when provided', () => {
      const { container } = render(
        <ModalShell title="Warning" icon={AlertTriangle}><p>content</p></ModalShell>
      );
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render title in rich variant', () => {
      render(
        <ModalShell title="Warning" icon={AlertTriangle}><p>content</p></ModalShell>
      );
      expect(screen.getByText('Warning')).toBeInTheDocument();
    });

    it('should use slate-100 title color in rich variant', () => {
      render(
        <ModalShell title="Warning" icon={AlertTriangle}><p>content</p></ModalShell>
      );
      const title = screen.getByText('Warning');
      expect(title).toHaveClass('text-slate-100');
    });

    it('should render subtitle when provided', () => {
      render(
        <ModalShell title="Title" subtitle="Subtitle text" icon={AlertTriangle}><p>content</p></ModalShell>
      );
      expect(screen.getByText('Subtitle text')).toBeInTheDocument();
    });

    it('should not render subtitle when not provided', () => {
      render(
        <ModalShell title="Title" icon={AlertTriangle}><p>content</p></ModalShell>
      );
      const subtitle = screen.queryByText('Subtitle text');
      expect(subtitle).not.toBeInTheDocument();
    });
  });

  describe('Close button', () => {
    it('should show close button when onClose is provided', () => {
      const onClose = jest.fn();
      const { container } = render(
        <ModalShell title="Title" onClose={onClose}><p>content</p></ModalShell>
      );
      const closeButtons = container.querySelectorAll('button');
      expect(closeButtons.length).toBeGreaterThan(0);
    });

    it('should call onClose when close button is clicked', () => {
      const onClose = jest.fn();
      const { container } = render(
        <ModalShell title="Title" onClose={onClose}><p>content</p></ModalShell>
      );
      const closeButton = container.querySelector('button');
      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not show close button when onClose is not provided', () => {
      const { container } = render(
        <ModalShell title="Title"><p>content</p></ModalShell>
      );
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(0);
    });
  });

  describe('Backdrop click', () => {
    it('should call onClose when backdrop is clicked', () => {
      const onClose = jest.fn();
      render(
        <ModalShell title="Title" onClose={onClose}><p>content</p></ModalShell>
      );
      // The backdrop is the outermost fixed div
      const backdrop = screen.getByRole('dialog').parentElement;
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when card is clicked', () => {
      const onClose = jest.fn();
      render(
        <ModalShell title="Title" onClose={onClose}><p>content</p></ModalShell>
      );
      const dialog = screen.getByRole('dialog');
      fireEvent.click(dialog);
      expect(onClose).not.toHaveBeenCalled();
    });

    it('should not call onClose on backdrop click when no onClose provided', () => {
      // Should not throw
      render(
        <ModalShell title="Title"><p>content</p></ModalShell>
      );
      const backdrop = screen.getByRole('dialog').parentElement;
      fireEvent.click(backdrop);
    });
  });

  describe('maxWidth', () => {
    it('should apply default max-w-md', () => {
      render(<ModalShell title="Title"><p>content</p></ModalShell>);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('max-w-md');
    });

    it('should apply max-w-sm for sm', () => {
      render(<ModalShell title="Title" maxWidth="sm"><p>content</p></ModalShell>);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('max-w-sm');
    });

    it('should apply max-w-lg for lg', () => {
      render(<ModalShell title="Title" maxWidth="lg"><p>content</p></ModalShell>);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('max-w-lg');
    });

    it('should apply max-w-2xl for 2xl', () => {
      render(<ModalShell title="Title" maxWidth="2xl"><p>content</p></ModalShell>);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('max-w-2xl');
    });
  });

  describe('Accessibility', () => {
    it('should have role="dialog"', () => {
      render(<ModalShell title="Title"><p>content</p></ModalShell>);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have aria-modal="true"', () => {
      render(<ModalShell title="Title"><p>content</p></ModalShell>);
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('should have aria-labelledby pointing to title', () => {
      render(<ModalShell title="Title"><p>content</p></ModalShell>);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
    });
  });

  describe('iconColor', () => {
    it('should apply sky color by default', () => {
      const { container } = render(
        <ModalShell title="Title" icon={AlertTriangle}><p>content</p></ModalShell>
      );
      const iconCircle = container.querySelector('.bg-sky-500\\/20');
      expect(iconCircle).toBeInTheDocument();
    });

    it('should apply rose color', () => {
      const { container } = render(
        <ModalShell title="Title" icon={AlertTriangle} iconColor="rose"><p>content</p></ModalShell>
      );
      const iconCircle = container.querySelector('.bg-rose-500\\/20');
      expect(iconCircle).toBeInTheDocument();
    });

    it('should apply emerald color', () => {
      const { container } = render(
        <ModalShell title="Title" icon={AlertTriangle} iconColor="emerald"><p>content</p></ModalShell>
      );
      const iconCircle = container.querySelector('.bg-emerald-500\\/20');
      expect(iconCircle).toBeInTheDocument();
    });

    it('should apply amber color', () => {
      const { container } = render(
        <ModalShell title="Title" icon={AlertTriangle} iconColor="amber"><p>content</p></ModalShell>
      );
      const iconCircle = container.querySelector('.bg-amber-500\\/20');
      expect(iconCircle).toBeInTheDocument();
    });

    it('should apply blue color', () => {
      const { container } = render(
        <ModalShell title="Title" icon={AlertTriangle} iconColor="blue"><p>content</p></ModalShell>
      );
      const iconCircle = container.querySelector('.bg-blue-500\\/20');
      expect(iconCircle).toBeInTheDocument();
    });
  });

  describe('Focus management', () => {
    it('should call onClose on Escape keydown', () => {
      const onClose = jest.fn();
      render(
        <ModalShell title="Title" onClose={onClose}><p>content</p></ModalShell>
      );
      const dialog = screen.getByRole('dialog');
      fireEvent.keyDown(dialog, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not throw when Escape is pressed without onClose', () => {
      render(
        <ModalShell title="Title"><p>content</p></ModalShell>
      );
      const dialog = screen.getByRole('dialog');
      expect(() => {
        fireEvent.keyDown(dialog, { key: 'Escape' });
      }).not.toThrow();
    });

    it('should trap focus: Tab from last focusable wraps to first', () => {
      render(
        <ModalShell title="Title" onClose={jest.fn()}>
          <button>First</button>
          <button>Last</button>
        </ModalShell>
      );
      const lastButton = screen.getByText('Last');
      lastButton.focus();

      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab' });

      // First focusable is the close (X) button
      const dialog = screen.getByRole('dialog');
      const focusable = dialog.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      expect(document.activeElement).toBe(focusable[0]);
    });

    it('should trap focus: Shift+Tab from first focusable wraps to last', () => {
      render(
        <ModalShell title="Title" onClose={jest.fn()}>
          <button>First</button>
          <button>Last</button>
        </ModalShell>
      );
      const dialog = screen.getByRole('dialog');
      const focusable = dialog.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable[0].focus();

      fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });

      expect(document.activeElement).toBe(focusable[focusable.length - 1]);
    });

    it('should restore focus to previously focused element on unmount', () => {
      const outerButton = document.createElement('button');
      outerButton.textContent = 'Outer';
      document.body.appendChild(outerButton);
      outerButton.focus();

      const { unmount } = render(
        <ModalShell title="Title"><p>content</p></ModalShell>
      );

      // Dialog should have focus now
      expect(document.activeElement).toBe(screen.getByRole('dialog'));

      unmount();

      expect(document.activeElement).toBe(outerButton);
      document.body.removeChild(outerButton);
    });

    it('should auto-focus the dialog container on mount', () => {
      render(
        <ModalShell title="Title"><p>content</p></ModalShell>
      );
      expect(document.activeElement).toBe(screen.getByRole('dialog'));
    });

    it('should not steal focus from autoFocus elements inside the dialog', () => {
      render(
        <ModalShell title="Title">
          <input data-testid="auto-input" autoFocus />
        </ModalShell>
      );
      expect(document.activeElement).toBe(screen.getByTestId('auto-input'));
    });
  });

  describe('className merging', () => {
    it('should merge custom className into the card element', () => {
      render(
        <ModalShell title="Title" className="max-h-[90vh] overflow-y-auto"><p>content</p></ModalShell>
      );
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('max-h-[90vh]', 'overflow-y-auto');
    });
  });
});
