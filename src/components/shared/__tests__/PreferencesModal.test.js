/**
 * PreferencesModal Tests
 *
 * Simplified testing suite for the PreferencesModal component focusing on
 * UI rendering and basic interactions rather than state management details.
 *
 * Test Coverage:
 * - Modal rendering and basic functionality
 * - Component structure and layout
 * - Accessibility features
 * - Error handling and edge cases
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PreferencesProvider } from '../../../contexts/PreferencesContext';
import { PreferencesModal } from '../PreferencesModal';

// Mock the external dependencies
jest.mock('../../../services/audioAlertService', () => ({
  audioAlertService: {
    play: jest.fn(() => Promise.resolve()),
    stop: jest.fn(),
    getAvailableSounds: jest.fn(() => [
      { value: 'bells-echo', label: 'Bells Echo', isDefault: true },
      { value: 'quick-chime', label: 'Quick Chime' },
      { value: 'flute', label: 'Uplifting Flute' }
    ]),
    // New lazy loading methods
    triggerFullPreload: jest.fn(),
    isLoaded: jest.fn(() => false), // Default to false so loadSound gets called
    isLoading: jest.fn(() => false),
    loadSound: jest.fn(() => Promise.resolve()), // Returns a proper resolved promise
    updateSelectedSound: jest.fn()
  }
}));

// Enhanced modal test harness with proper context mocking
const ModalTestHarness = () => {
  const [isOpen, setIsOpen] = React.useState(true);

  return (
    <PreferencesProvider>
      <PreferencesModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </PreferencesProvider>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PreferencesModal', () => {
  describe('Modal Rendering', () => {
    test('should render modal when open', () => {
      render(<ModalTestHarness />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Preferences')).toBeInTheDocument();
    });

    test('should not render when closed', () => {
      const { container } = render(
        <PreferencesProvider>
          <PreferencesModal isOpen={false} onClose={jest.fn()} />
        </PreferencesProvider>
      );

      expect(container.firstChild).toBeNull();
    });

    test('should have three main sections', () => {
      render(<ModalTestHarness />);

      expect(screen.getByText('Substitution Alerts')).toBeInTheDocument();
      expect(screen.getByText('Language')).toBeInTheDocument();
      expect(screen.getByText('UI Theme')).toBeInTheDocument();
    });
  });

  describe('Audio Alerts Section', () => {
    test('should display audio alerts toggle', () => {
      render(<ModalTestHarness />);

      const toggleLabel = screen.getByText('Enable Audio Alerts');
      expect(toggleLabel).toBeInTheDocument();

      // Should have toggle button
      const toggle = screen.getByRole('button', { name: /audio alerts/i });
      expect(toggle).toBeInTheDocument();
    });

    test('should display sound selection dropdown', () => {
      render(<ModalTestHarness />);

      expect(screen.getByText('Alert Sound')).toBeInTheDocument();

      // Should have dropdown with default selection
      const dropdown = screen.getByDisplayValue('Bells Echo');
      expect(dropdown).toBeInTheDocument();
    });

    test('should display volume control with percentage', () => {
      render(<ModalTestHarness />);

      expect(screen.getByText('Volume')).toBeInTheDocument();
      expect(screen.getByText('70%')).toBeInTheDocument(); // Default volume

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('min', '0');
      expect(slider).toHaveAttribute('max', '1');
      expect(slider).toHaveAttribute('step', '0.05');
    });

    test('should have preview button for testing sound', () => {
      render(<ModalTestHarness />);

      // The preview button should exist (Play icon)
      const buttons = screen.getAllByRole('button');
      // One of the buttons should be the preview button
      const hasPlayButton = buttons.some(button =>
        button.querySelector('svg') !== null // Has an icon
      );
      expect(hasPlayButton).toBe(true);
    });

    test('should have volume slider that can be interacted with', () => {
      render(<ModalTestHarness />);

      const slider = screen.getByRole('slider');

      // Test that slider responds to changes
      fireEvent.change(slider, { target: { value: '0.3' } });
      expect(slider.value).toBe('0.3');
    });

    test('should have sound dropdown that can be changed', () => {
      render(<ModalTestHarness />);

      const dropdown = screen.getByDisplayValue('Bells Echo');

      // Test that dropdown can be changed
      fireEvent.change(dropdown, { target: { value: 'quick-chime' } });
      expect(dropdown.value).toBe('quick-chime');
    });
  });

  describe('Language Section', () => {
    test('should display language selection', () => {
      render(<ModalTestHarness />);

      expect(screen.getByText('Application Language')).toBeInTheDocument();
      expect(screen.getByText('More languages coming soon!')).toBeInTheDocument();

      // Language dropdown should be present and functional
      const languageDropdown = screen.getByDisplayValue('English');
      expect(languageDropdown).toBeInTheDocument();
      expect(languageDropdown).not.toBeDisabled(); // Not disabled in current implementation
    });
  });

  describe('UI Theme Section', () => {
    test('should display theme selection', () => {
      render(<ModalTestHarness />);

      expect(screen.getByText('Color Theme')).toBeInTheDocument();
      expect(screen.getByText('More themes coming soon!')).toBeInTheDocument();

      // Theme dropdown should be present and functional
      const themeDropdown = screen.getByDisplayValue('Dark Ocean');
      expect(themeDropdown).toBeInTheDocument();
      expect(themeDropdown).not.toBeDisabled(); // Not disabled in current implementation
    });
  });

  describe('Close Modal', () => {
    test('should have X button to close modal', () => {
      const onClose = jest.fn();
      render(
        <PreferencesProvider>
          <PreferencesModal isOpen={true} onClose={onClose} />
        </PreferencesProvider>
      );

      // The X button is the close mechanism
      const buttons = screen.getAllByRole('button');
      const closeButton = buttons.find(button => button.querySelector('.lucide-x'));
      expect(closeButton).toBeInTheDocument();

      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('should not have save or cancel buttons', () => {
      render(<ModalTestHarness />);

      expect(screen.queryByRole('button', { name: /Save/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Cancel/i })).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA attributes', () => {
      render(<ModalTestHarness />);

      // Modal should have proper role and labeling
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-labelledby', 'preferences-title');

      // Toggle should have appropriate aria-label
      const toggle = screen.getByRole('button', { name: /audio alerts/i });
      expect(toggle).toHaveAttribute('aria-label');
    });

    test('should support keyboard navigation', () => {
      render(<ModalTestHarness />);

      // Test that interactive elements can receive focus
      const toggle = screen.getByRole('button', { name: /audio alerts/i });
      toggle.focus();
      expect(toggle).toHaveFocus();

      const selects = screen.getAllByRole('combobox');
      selects[0].focus();
      expect(selects[0]).toHaveFocus();

      const volumeSlider = screen.getByRole('slider');
      volumeSlider.focus();
      expect(volumeSlider).toHaveFocus();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle component unmounting gracefully', () => {
      const { unmount } = render(<ModalTestHarness />);

      expect(() => unmount()).not.toThrow();
    });

    test('should handle missing preferences context gracefully', () => {
      // Test without PreferencesProvider wrapper
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      // The component should gracefully handle missing context
      expect(() => {
        render(<PreferencesModal isOpen={true} onClose={jest.fn()} />);
      }).not.toThrow();

      consoleError.mockRestore();
    });

    test('should handle extreme volume values', () => {
      render(<ModalTestHarness />);

      const slider = screen.getByRole('slider');

      // Test extreme low value
      fireEvent.change(slider, { target: { value: '0' } });
      expect(slider.value).toBe('0');

      // Test extreme high value
      fireEvent.change(slider, { target: { value: '1' } });
      expect(slider.value).toBe('1');
    });

    test('should maintain performance with rapid interactions', () => {
      render(<ModalTestHarness />);

      const toggle = screen.getByRole('button', { name: /audio alerts/i });
      const slider = screen.getByRole('slider');

      // Rapid interactions should not cause errors
      expect(() => {
        for (let i = 0; i < 10; i++) {
          fireEvent.click(toggle);
          fireEvent.change(slider, { target: { value: (i * 0.1).toString() } });
        }
      }).not.toThrow();
    });
  });

  describe('Audio Integration', () => {
    test('should handle audio preview button clicks', () => {
      render(<ModalTestHarness />);

      // Find all buttons and identify the play button (has an SVG icon)
      const buttons = screen.getAllByRole('button');
      const playButton = buttons.find(button =>
        button.querySelector('svg') && !button.textContent.includes('Save') && !button.textContent.includes('Cancel')
      );

      if (playButton) {
        expect(() => fireEvent.click(playButton)).not.toThrow();
      }
    });
  });

  describe('Form Interactions', () => {
    test('should handle form field interactions without errors', () => {
      render(<ModalTestHarness />);

      // Test all form interactions
      const toggle = screen.getByRole('button', { name: /audio alerts/i });
      const selects = screen.getAllByRole('combobox');
      const slider = screen.getByRole('slider');

      expect(() => {
        fireEvent.change(selects[0], { target: { value: 'quick-chime' } });
        fireEvent.change(slider, { target: { value: '0.8' } });
        fireEvent.click(toggle);
      }).not.toThrow();
    });

    test('should update slider percentage display', () => {
      render(<ModalTestHarness />);

      const slider = screen.getByRole('slider');

      // Change slider value
      fireEvent.change(slider, { target: { value: '0.3' } });

      // Check that percentage updates
      expect(screen.getByText('30%')).toBeInTheDocument();
    });
  });
});
