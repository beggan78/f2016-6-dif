/**
 * TimeFilter Tests
 *
 * Comprehensive test suite for the TimeFilter component covering:
 * - Preset selection and persistence
 * - Custom range validation
 * - State synchronization between parent and child
 * - Edge cases (invalid dates, future dates, start > end)
 * - Dropdown behavior and interactions
 * - Keyboard accessibility
 * - Display labels and formatting
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TimeFilter } from '../TimeFilter';
import { TIME_PRESETS } from '../../../constants/timePresets';

describe('TimeFilter', () => {
  let defaultProps;
  let mockOnTimeRangeChange;

  beforeEach(() => {
    mockOnTimeRangeChange = jest.fn();
    defaultProps = {
      startDate: null,
      endDate: null,
      selectedPresetId: 'all-time',
      onTimeRangeChange: mockOnTimeRangeChange,
      className: ''
    };
    jest.clearAllMocks();
  });

  // Helper to get date inputs from custom range
  const getDateInputs = () => {
    const inputs = screen.queryAllByRole('textbox').length > 0
      ? screen.getAllByRole('textbox')
      : document.querySelectorAll('input[type="date"]');
    return Array.from(inputs);
  };

  const getStartDateInput = () => getDateInputs()[0];
  const getEndDateInput = () => getDateInputs()[1];

  describe('Component Rendering', () => {
    test('should render with default props', () => {
      render(<TimeFilter {...defaultProps} />);

      expect(screen.getByText('All time')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    test('should apply custom className', () => {
      const { container } = render(
        <TimeFilter {...defaultProps} className="custom-class" />
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('custom-class');
    });

    test('should display time filter icon', () => {
      render(<TimeFilter {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(button.querySelector('svg')).toBeInTheDocument();
    });

    test('should show chevron icon that rotates when open', () => {
      render(<TimeFilter {...defaultProps} />);

      const button = screen.getByRole('button');
      const chevron = button.querySelectorAll('svg')[1]; // Second SVG is the chevron

      // Initially not rotated
      expect(chevron).not.toHaveClass('rotate-180');

      // Click to open
      fireEvent.click(button);

      // Should rotate when open
      expect(chevron).toHaveClass('rotate-180');
    });
  });

  describe('Preset Selection', () => {
    test('should display all time presets', () => {
      render(<TimeFilter {...defaultProps} />);

      // Open dropdown
      fireEvent.click(screen.getByRole('button'));

      // Verify all presets are displayed in dropdown (use getAllByText for duplicates)
      TIME_PRESETS.forEach(preset => {
        const elements = screen.getAllByText(preset.label);
        expect(elements.length).toBeGreaterThan(0);
      });

      // Custom range option (unique text)
      expect(screen.getByText('Custom range...')).toBeInTheDocument();
    });

    test('should highlight selected preset', () => {
      render(<TimeFilter {...defaultProps} selectedPresetId="last-30-days" />);

      fireEvent.click(screen.getByRole('button'));

      // Find the button in dropdown (second occurrence)
      const presetButtons = screen.getAllByText('Last 30 days');
      const selectedButton = presetButtons.find(el => el.closest('button')?.className.includes('bg-sky-900/50'));

      expect(selectedButton).toBeTruthy();
      expect(selectedButton.closest('button')).toHaveClass('bg-sky-900/50');
      expect(selectedButton.closest('button').querySelector('svg')).toBeInTheDocument(); // Check icon
    });

    test('should call onTimeRangeChange when preset is selected', () => {
      render(<TimeFilter {...defaultProps} />);

      fireEvent.click(screen.getByRole('button'));

      // Click the preset button in the dropdown (find buttons within dropdown)
      const dropdownButtons = screen.getAllByRole('button').filter(btn =>
        btn.textContent.includes('Last 30 days') && btn.className.includes('w-full')
      );
      fireEvent.click(dropdownButtons[0]);

      expect(mockOnTimeRangeChange).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
        'last-30-days'
      );
    });

    test('should close dropdown after preset selection', async () => {
      render(<TimeFilter {...defaultProps} />);

      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByText('Select Time Range')).toBeInTheDocument();

      const dropdownButtons = screen.getAllByRole('button').filter(btn =>
        btn.textContent.includes('Last 30 days') && btn.className.includes('w-full')
      );
      fireEvent.click(dropdownButtons[0]);

      await waitFor(() => {
        expect(screen.queryByText('Select Time Range')).not.toBeInTheDocument();
      });
    });

    test('should display correct dates for Year to Date preset', () => {
      const preset = TIME_PRESETS.find(p => p.id === 'year-to-date');
      const range = preset.getValue();

      render(
        <TimeFilter
          {...defaultProps}
          selectedPresetId="year-to-date"
          startDate={range.start}
          endDate={range.end}
        />
      );

      expect(screen.getAllByText('Year to Date').length).toBeGreaterThan(0);
    });

    test('should handle all-time preset with null dates', () => {
      render(<TimeFilter {...defaultProps} selectedPresetId="all-time" />);

      expect(screen.getAllByText('All time').length).toBeGreaterThan(0);

      fireEvent.click(screen.getByRole('button'));

      const dropdownButtons = screen.getAllByRole('button').filter(btn =>
        btn.textContent === 'All time' && btn.className.includes('w-full')
      );
      fireEvent.click(dropdownButtons[0]);

      expect(mockOnTimeRangeChange).toHaveBeenCalledWith(null, null, 'all-time');
    });
  });

  describe('Custom Date Range', () => {
    test('should show custom date inputs when Custom range is selected', () => {
      render(<TimeFilter {...defaultProps} />);

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Custom range...'));

      const dateInputs = screen.getAllByDisplayValue('');
      expect(dateInputs).toHaveLength(2); // Start and End date
      expect(screen.getByText('Start Date')).toBeInTheDocument();
      expect(screen.getByText('End Date')).toBeInTheDocument();
    });

    test('should display Apply and Cancel buttons for custom range', () => {
      render(<TimeFilter {...defaultProps} />);

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Custom range...'));

      expect(screen.getByText('Apply')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    test('should populate custom dates from props when preset is custom', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      render(
        <TimeFilter
          {...defaultProps}
          selectedPresetId="custom"
          startDate={startDate}
          endDate={endDate}
        />
      );

      fireEvent.click(screen.getByRole('button'));

      const startInput = getStartDateInput();
      const endInput = getEndDateInput();

      expect(startInput.value).toBe('2024-01-01');
      expect(endInput.value).toBe('2024-12-31');
    });

    test('should validate and apply custom date range', () => {
      render(<TimeFilter {...defaultProps} />);

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Custom range...'));

      const startInput = getStartDateInput();
      const endInput = getEndDateInput();

      fireEvent.change(startInput, { target: { value: '2024-01-01' } });
      fireEvent.change(endInput, { target: { value: '2024-12-31' } });

      fireEvent.click(screen.getByText('Apply'));

      expect(mockOnTimeRangeChange).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
        'custom'
      );
    });

    test('should handle empty start and end dates (allowed)', () => {
      render(<TimeFilter {...defaultProps} />);

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Custom range...'));

      // Both dates empty
      fireEvent.click(screen.getByText('Apply'));

      // Should be called with null dates
      expect(mockOnTimeRangeChange).toHaveBeenCalledWith(null, null, 'custom');
    });

    test('should reject start date after end date', () => {
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

      render(<TimeFilter {...defaultProps} />);

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Custom range...'));

      const startInput = getStartDateInput();
      const endInput = getEndDateInput();

      fireEvent.change(startInput, { target: { value: '2024-12-31' } });
      fireEvent.change(endInput, { target: { value: '2024-01-01' } });

      fireEvent.click(screen.getByText('Apply'));

      expect(alertSpy).toHaveBeenCalledWith('Start date must be before end date');
      expect(mockOnTimeRangeChange).not.toHaveBeenCalled();

      alertSpy.mockRestore();
    });

    test('should reject start date more than a year in the future', () => {
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

      render(<TimeFilter {...defaultProps} />);

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Custom range...'));

      const startInput = getStartDateInput();

      // Set date 2 years in the future
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 2);
      const futureDateString = futureDate.toISOString().split('T')[0];

      fireEvent.change(startInput, { target: { value: futureDateString } });
      fireEvent.click(screen.getByText('Apply'));

      expect(alertSpy).toHaveBeenCalledWith('Start date cannot be more than a year in the future');
      expect(mockOnTimeRangeChange).not.toHaveBeenCalled();

      alertSpy.mockRestore();
    });

    test('should reject end date more than a year in the future', () => {
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

      render(<TimeFilter {...defaultProps} />);

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Custom range...'));

      const endInput = getEndDateInput();

      // Set date 2 years in the future
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 2);
      const futureDateString = futureDate.toISOString().split('T')[0];

      fireEvent.change(endInput, { target: { value: futureDateString } });
      fireEvent.click(screen.getByText('Apply'));

      expect(alertSpy).toHaveBeenCalledWith('End date cannot be more than a year in the future');
      expect(mockOnTimeRangeChange).not.toHaveBeenCalled();

      alertSpy.mockRestore();
    });

    test('should allow only start date to be set', () => {
      render(<TimeFilter {...defaultProps} />);

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Custom range...'));

      const startInput = getStartDateInput();

      fireEvent.change(startInput, { target: { value: '2024-01-01' } });
      fireEvent.click(screen.getByText('Apply'));

      const [[start, end, presetId]] = mockOnTimeRangeChange.mock.calls;
      expect(start).toBeInstanceOf(Date);
      expect(end).toBeNull();
      expect(presetId).toBe('custom');
    });

    test('should allow only end date to be set', () => {
      render(<TimeFilter {...defaultProps} />);

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Custom range...'));

      const endInput = getEndDateInput();

      fireEvent.change(endInput, { target: { value: '2024-12-31' } });
      fireEvent.click(screen.getByText('Apply'));

      const [[start, end, presetId]] = mockOnTimeRangeChange.mock.calls;
      expect(start).toBeNull();
      expect(end).toBeInstanceOf(Date);
      expect(presetId).toBe('custom');
    });

    test('should reset custom dates on cancel', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      render(
        <TimeFilter
          {...defaultProps}
          selectedPresetId="custom"
          startDate={startDate}
          endDate={endDate}
        />
      );

      fireEvent.click(screen.getByRole('button'));

      const startInput = getStartDateInput();
      const endInput = getEndDateInput();

      // Change values
      fireEvent.change(startInput, { target: { value: '2024-06-01' } });
      fireEvent.change(endInput, { target: { value: '2024-06-30' } });

      // Cancel
      fireEvent.click(screen.getByText('Cancel'));

      // Reopen - click main toggle button (not dropdown buttons)
      const mainToggle = document.querySelector('[aria-haspopup="listbox"]');
      fireEvent.click(mainToggle);

      // Wait for dropdown to open, then click Custom range
      await waitFor(() => {
        expect(screen.getByText('Custom range...')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Custom range...'));

      // Values should be reset to original
      expect(getStartDateInput().value).toBe('2024-01-01');
      expect(getEndDateInput().value).toBe('2024-12-31');
    });

    test('should not show custom inputs after canceling', () => {
      render(<TimeFilter {...defaultProps} />);

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Custom range...'));

      expect(getStartDateInput()).toBeInTheDocument();

      fireEvent.click(screen.getByText('Cancel'));

      // Custom inputs should be hidden
      const dateInputs = document.querySelectorAll('input[type="date"]');
      expect(dateInputs.length).toBe(0);
    });
  });

  describe('Dropdown Behavior', () => {
    test('should toggle dropdown on button click', () => {
      render(<TimeFilter {...defaultProps} />);

      const button = screen.getByRole('button');

      // Initially closed
      expect(screen.queryByText('Select Time Range')).not.toBeInTheDocument();

      // Open
      fireEvent.click(button);
      expect(screen.getByText('Select Time Range')).toBeInTheDocument();

      // Close
      fireEvent.click(button);
      expect(screen.queryByText('Select Time Range')).not.toBeInTheDocument();
    });

    test('should close dropdown when clicking outside', async () => {
      render(
        <div>
          <TimeFilter {...defaultProps} />
          <div data-testid="outside">Outside element</div>
        </div>
      );

      // Open dropdown
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByText('Select Time Range')).toBeInTheDocument();

      // Click outside
      fireEvent.mouseDown(screen.getByTestId('outside'));

      await waitFor(() => {
        expect(screen.queryByText('Select Time Range')).not.toBeInTheDocument();
      });
    });

    test('should not close dropdown when clicking inside', () => {
      render(<TimeFilter {...defaultProps} />);

      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByText('Select Time Range')).toBeInTheDocument();

      // Click inside dropdown
      fireEvent.mouseDown(screen.getByText('Select Time Range'));

      expect(screen.getByText('Select Time Range')).toBeInTheDocument();
    });

    test('should have proper ARIA attributes', () => {
      render(<TimeFilter {...defaultProps} />);

      const button = screen.getByRole('button');

      expect(button).toHaveAttribute('aria-haspopup', 'listbox');
      expect(button).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(button);

      expect(button).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Keyboard Accessibility', () => {
    test('should open dropdown with Enter key', () => {
      render(<TimeFilter {...defaultProps} />);

      const button = screen.getByRole('button');
      button.focus();

      fireEvent.keyDown(button, { key: 'Enter' });

      expect(screen.getByText('Select Time Range')).toBeInTheDocument();
    });

    test('should open dropdown with Space key', () => {
      render(<TimeFilter {...defaultProps} />);

      const button = screen.getByRole('button');
      button.focus();

      fireEvent.keyDown(button, { key: ' ' });

      expect(screen.getByText('Select Time Range')).toBeInTheDocument();
    });

    test('should prevent default on Space key', () => {
      render(<TimeFilter {...defaultProps} />);

      const button = screen.getByRole('button');
      button.focus();

      const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true });
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

      button.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    test('should be focusable', () => {
      render(<TimeFilter {...defaultProps} />);

      const button = screen.getByRole('button');
      button.focus();

      expect(button).toHaveFocus();
    });
  });

  describe('Display Labels', () => {
    test('should display "All time" when no dates are set', () => {
      render(<TimeFilter {...defaultProps} />);

      expect(screen.getByText('All time')).toBeInTheDocument();
    });

    test('should display preset label when preset is selected', () => {
      const preset = TIME_PRESETS.find(p => p.id === 'last-30-days');
      const range = preset.getValue();

      render(
        <TimeFilter
          {...defaultProps}
          selectedPresetId="last-30-days"
          startDate={range.start}
          endDate={range.end}
        />
      );

      expect(screen.getByText('Last 30 days')).toBeInTheDocument();
    });

    test('should display date range when custom range is set', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      render(
        <TimeFilter
          {...defaultProps}
          selectedPresetId="custom"
          startDate={startDate}
          endDate={endDate}
        />
      );

      const button = screen.getByRole('button');
      expect(button.textContent).toContain('Jan 1, 2024');
      expect(button.textContent).toContain('Dec 31, 2024');
    });

    test('should display "From [date]" when only start date is set', () => {
      const startDate = new Date('2024-01-01');

      render(
        <TimeFilter
          {...defaultProps}
          selectedPresetId="custom"
          startDate={startDate}
          endDate={null}
        />
      );

      const button = screen.getByRole('button');
      expect(button.textContent).toContain('From');
      expect(button.textContent).toContain('Jan 1, 2024');
    });

    test('should display "Until [date]" when only end date is set', () => {
      const endDate = new Date('2024-12-31');

      render(
        <TimeFilter
          {...defaultProps}
          selectedPresetId="custom"
          startDate={null}
          endDate={endDate}
        />
      );

      const button = screen.getByRole('button');
      expect(button.textContent).toContain('Until');
      expect(button.textContent).toContain('Dec 31, 2024');
    });
  });

  describe('State Synchronization', () => {
    test('should update internal state when props change', () => {
      const { rerender } = render(<TimeFilter {...defaultProps} />);

      expect(screen.getByText('All time')).toBeInTheDocument();

      const preset = TIME_PRESETS.find(p => p.id === 'last-30-days');
      const range = preset.getValue();

      rerender(
        <TimeFilter
          {...defaultProps}
          selectedPresetId="last-30-days"
          startDate={range.start}
          endDate={range.end}
        />
      );

      expect(screen.getByText('Last 30 days')).toBeInTheDocument();
    });

    test('should show custom range UI when preset changes to custom', () => {
      const { rerender } = render(<TimeFilter {...defaultProps} />);

      fireEvent.click(screen.getByRole('button'));
      expect(screen.queryByLabelText('Start Date')).not.toBeInTheDocument();

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      rerender(
        <TimeFilter
          {...defaultProps}
          selectedPresetId="custom"
          startDate={startDate}
          endDate={endDate}
        />
      );

      expect(getStartDateInput()).toBeInTheDocument();
    });

    test('should hide custom range UI when preset changes from custom', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const { rerender } = render(
        <TimeFilter
          {...defaultProps}
          selectedPresetId="custom"
          startDate={startDate}
          endDate={endDate}
        />
      );

      fireEvent.click(screen.getByRole('button'));
      expect(getStartDateInput()).toBeInTheDocument();

      const preset = TIME_PRESETS.find(p => p.id === 'last-30-days');
      const range = preset.getValue();

      rerender(
        <TimeFilter
          {...defaultProps}
          selectedPresetId="last-30-days"
          startDate={range.start}
          endDate={range.end}
        />
      );

      expect(screen.queryByLabelText('Start Date')).not.toBeInTheDocument();
    });
  });

  describe('Visual States', () => {
    test('should apply active styling when range is set', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      render(
        <TimeFilter
          {...defaultProps}
          selectedPresetId="custom"
          startDate={startDate}
          endDate={endDate}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('shadow-[0_0_16px_rgba(125,211,252,0.65),0_0_32px_rgba(56,189,248,0.4)]');
      expect(button).toHaveClass('ring-2');
      expect(button).toHaveClass('ring-sky-300/80');
    });

    test('should not apply active styling when no range is set', () => {
      render(<TimeFilter {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(button).not.toHaveClass('shadow-[0_0_16px_rgba(125,211,252,0.65),0_0_32px_rgba(56,189,248,0.4)]');
    });

    test('should change styling when dropdown is open', () => {
      render(<TimeFilter {...defaultProps} />);

      const button = screen.getByRole('button');

      expect(button).toHaveClass('border-slate-600');

      fireEvent.click(button);

      expect(button).toHaveClass('border-sky-500');
      expect(button).toHaveClass('bg-slate-600');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle unmounting gracefully', () => {
      const { unmount } = render(<TimeFilter {...defaultProps} />);

      expect(() => unmount()).not.toThrow();
    });

    test('should handle unmounting with open dropdown', () => {
      const { unmount } = render(<TimeFilter {...defaultProps} />);

      fireEvent.click(screen.getByRole('button'));

      expect(() => unmount()).not.toThrow();
    });

    test('should work with noop onTimeRangeChange', () => {
      const noopHandler = () => {}; // noop function

      render(
        <TimeFilter
          startDate={null}
          endDate={null}
          selectedPresetId="all-time"
          onTimeRangeChange={noopHandler}
        />
      );

      fireEvent.click(screen.getByRole('button'));

      // Should not crash when clicking preset with noop handler
      expect(() => {
        const dropdownButtons = screen.getAllByRole('button').filter(btn =>
          btn.textContent.includes('Last 30 days') && btn.className.includes('w-full')
        );
        fireEvent.click(dropdownButtons[0]);
      }).not.toThrow();
    });

    test('should handle null startDate prop', () => {
      render(
        <TimeFilter
          {...defaultProps}
          startDate={null}
          endDate={new Date('2024-12-31')}
        />
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    test('should handle null endDate prop', () => {
      render(
        <TimeFilter
          {...defaultProps}
          startDate={new Date('2024-01-01')}
          endDate={null}
        />
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    test('should handle rapid clicks without errors', () => {
      render(<TimeFilter {...defaultProps} />);

      const button = screen.getByRole('button');

      expect(() => {
        for (let i = 0; i < 10; i++) {
          fireEvent.click(button);
        }
      }).not.toThrow();
    });
  });
});
