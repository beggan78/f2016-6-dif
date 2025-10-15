import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, Clock, ChevronDown, Check } from 'lucide-react';
import { Button, Input } from '../shared/UI';

const TIME_PRESETS = [
  {
    id: 'last-30-days',
    label: 'Last 30 days',
    getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      return { start, end };
    }
  },
  {
    id: 'last-3-months',
    label: 'Last 3 months',
    getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setMonth(start.getMonth() - 3);
      return { start, end };
    }
  },
  {
    id: 'last-6-months',
    label: 'Last 6 months',
    getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setMonth(start.getMonth() - 6);
      return { start, end };
    }
  },
  {
    id: 'last-12-months',
    label: 'Last 12 months',
    getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setFullYear(start.getFullYear() - 1);
      return { start, end };
    }
  },
  {
    id: 'year-to-date',
    label: 'Year to Date',
    getValue: () => {
      const end = new Date();
      const start = new Date(end.getFullYear(), 0, 1);
      return { start, end };
    }
  },
  {
    id: 'all-time',
    label: 'All time',
    getValue: () => {
      return { start: null, end: null };
    }
  }
];

const formatDateForDisplay = (date) => {
  if (!date) return '';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const formatDateForInput = (date) => {
  if (!date) return '';
  return date.toISOString().split('T')[0];
};

const formatTimeRangeLabel = (start, end, presetLabel) => {
  if (presetLabel && presetLabel !== 'Custom') {
    return presetLabel;
  }

  if (!start && !end) {
    return 'All time';
  }

  if (start && end) {
    return `${formatDateForDisplay(start)} - ${formatDateForDisplay(end)}`;
  }

  if (start) {
    return `From ${formatDateForDisplay(start)}`;
  }

  if (end) {
    return `Until ${formatDateForDisplay(end)}`;
  }

  return 'All time';
};

export function TimeFilter({
  startDate,
  endDate,
  onTimeRangeChange,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('all-time');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomRange, setShowCustomRange] = useState(false);

  const dropdownRef = useRef(null);

  // Initialize preset based on current time range
  useEffect(() => {
    if (!startDate && !endDate) {
      setSelectedPreset('all-time');
      return;
    }

    // Try to match current range to a preset
    const matchingPreset = TIME_PRESETS.find(preset => {
      const presetRange = preset.getValue();
      if (!presetRange.start && !presetRange.end && !startDate && !endDate) {
        return true;
      }
      if (!presetRange.start || !presetRange.end || !startDate || !endDate) {
        return false;
      }

      // Allow some tolerance (1 day) for matching dates
      const startDiff = Math.abs(presetRange.start.getTime() - startDate.getTime());
      const endDiff = Math.abs(presetRange.end.getTime() - endDate.getTime());
      return startDiff < 24 * 60 * 60 * 1000 && endDiff < 24 * 60 * 60 * 1000;
    });

    if (matchingPreset) {
      setSelectedPreset(matchingPreset.id);
      setShowCustomRange(false);
    } else {
      setSelectedPreset('custom');
      setShowCustomRange(true);
      setCustomStartDate(formatDateForInput(startDate));
      setCustomEndDate(formatDateForInput(endDate));
    }
  }, [startDate, endDate]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const currentPresetLabel = useMemo(() => {
    if (selectedPreset === 'custom') {
      return 'Custom';
    }
    const preset = TIME_PRESETS.find(p => p.id === selectedPreset);
    return preset ? preset.label : 'All time';
  }, [selectedPreset]);

  const displayLabel = useMemo(() => {
    return formatTimeRangeLabel(startDate, endDate, currentPresetLabel);
  }, [startDate, endDate, currentPresetLabel]);

  const hasActiveRange = useMemo(() => Boolean(startDate || endDate), [startDate, endDate]);

  const handlePresetSelect = (presetId) => {
    setSelectedPreset(presetId);
    setShowCustomRange(false);

    if (presetId === 'custom') {
      setShowCustomRange(true);
      setCustomStartDate(formatDateForInput(startDate));
      setCustomEndDate(formatDateForInput(endDate));
      return;
    }

    const preset = TIME_PRESETS.find(p => p.id === presetId);
    if (preset) {
      const range = preset.getValue();
      onTimeRangeChange(range.start, range.end);
      setIsOpen(false);
    }
  };

  const handleCustomRangeApply = () => {
    let start = null;
    let end = null;

    // Parse and validate start date
    if (customStartDate) {
      start = new Date(customStartDate);
      if (isNaN(start.getTime())) {
        alert('Invalid start date');
        return;
      }
    }

    // Parse and validate end date
    if (customEndDate) {
      end = new Date(customEndDate);
      if (isNaN(end.getTime())) {
        alert('Invalid end date');
        return;
      }
    }

    // Validate date range
    if (start && end && start > end) {
      alert('Start date must be before end date');
      return;
    }

    // Validate dates are not in the future beyond reasonable bounds
    const now = new Date();
    const maxFutureDate = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 year in future

    if (start && start > maxFutureDate) {
      alert('Start date cannot be more than a year in the future');
      return;
    }

    if (end && end > maxFutureDate) {
      alert('End date cannot be more than a year in the future');
      return;
    }

    onTimeRangeChange(start, end);
    setIsOpen(false);
  };

  const handleCustomRangeCancel = () => {
    setShowCustomRange(false);
    // Reset to current values
    setCustomStartDate(formatDateForInput(startDate));
    setCustomEndDate(formatDateForInput(endDate));

    // If we have a current range that matches a preset, select it
    const matchingPreset = TIME_PRESETS.find(preset => {
      const presetRange = preset.getValue();
      if (!presetRange.start && !presetRange.end && !startDate && !endDate) {
        return true;
      }
      return false;
    });

    if (matchingPreset) {
      setSelectedPreset(matchingPreset.id);
    } else {
      setSelectedPreset('custom');
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Time Picker Control */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={[
          'cursor-pointer select-none bg-slate-700 border rounded-lg px-4 py-2.5 flex items-center space-x-3 transition-all duration-200 ease-in-out min-w-0',
          isOpen ? 'border-sky-500 bg-slate-600' : 'border-slate-600 hover:border-slate-500 hover:bg-slate-600',
          hasActiveRange ? 'shadow-[0_0_16px_rgba(125,211,252,0.65),0_0_32px_rgba(56,189,248,0.4)] ring-2 ring-sky-300/80 ring-offset-2 ring-offset-slate-800 border-sky-300' : '',
          'focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-800'
        ].join(' ')}
        role="button"
        tabIndex={0}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
      >
        <Clock className="h-4 w-4 text-sky-400 flex-shrink-0" />
        <span className="text-slate-100 text-sm font-medium truncate max-w-[200px] whitespace-nowrap">
          {displayLabel}
        </span>
        <ChevronDown className={`h-4 w-4 text-sky-400 flex-shrink-0 transition-transform duration-200 ${
          isOpen ? 'rotate-180' : ''
        }`} />
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50">
          <div className="p-3">
            <div className="flex items-center space-x-2 mb-3">
              <Calendar className="h-4 w-4 text-sky-400" />
              <h3 className="text-sm font-medium text-sky-400">Select Time Range</h3>
            </div>

            {/* Preset Options */}
            <div className="space-y-1 mb-4">
              {TIME_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset.id)}
                  className={`w-full px-3 py-2 text-left text-sm rounded-md transition-colors flex items-center justify-between ${
                    selectedPreset === preset.id
                      ? 'bg-sky-900/50 text-sky-300 border border-sky-600'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span>{preset.label}</span>
                  {selectedPreset === preset.id && (
                    <Check className="h-4 w-4" />
                  )}
                </button>
              ))}

              <button
                onClick={() => handlePresetSelect('custom')}
                className={`w-full px-3 py-2 text-left text-sm rounded-md transition-colors flex items-center justify-between ${
                  selectedPreset === 'custom'
                    ? 'bg-sky-900/50 text-sky-300 border border-sky-600'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-slate-200'
                }`}
              >
                <span>Custom range...</span>
                {selectedPreset === 'custom' && (
                  <Check className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Custom Date Range */}
            {showCustomRange && (
              <div className="border-t border-slate-600 pt-3">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Start Date
                    </label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      End Date
                    </label>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="text-sm"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={handleCustomRangeApply}
                      variant="primary"
                      size="sm"
                      className="flex-1"
                    >
                      Apply
                    </Button>
                    <Button
                      onClick={handleCustomRangeCancel}
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
