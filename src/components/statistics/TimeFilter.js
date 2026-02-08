import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Clock, ChevronDown, Check } from 'lucide-react';
import { Button, Input } from '../shared/UI';
import { TIME_PRESETS, getTimePresets } from '../../constants/timePresets';

const formatDateForInput = (date) => {
  if (!date) return '';
  return date.toISOString().split('T')[0];
};

export function TimeFilter({
  startDate,
  endDate,
  selectedPresetId = 'all-time',
  onTimeRangeChange,
  className = ''
}) {
  const { t, i18n } = useTranslation('statistics');
  const translatedPresets = useMemo(() => getTimePresets(t), [t]);

  const formatDateForDisplay = useCallback((date) => {
    if (!date) return '';
    const locale = i18n.language === 'sv' ? 'sv-SE' : 'en-US';
    return date.toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }, [i18n.language]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(selectedPresetId);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomRange, setShowCustomRange] = useState(false);

  const dropdownRef = useRef(null);

  // Update internal state when parent changes the preset
  useEffect(() => {
    setSelectedPreset(selectedPresetId);

    // Handle custom range UI
    if (selectedPresetId === 'custom') {
      setShowCustomRange(true);
      setCustomStartDate(formatDateForInput(startDate));
      setCustomEndDate(formatDateForInput(endDate));
    } else {
      setShowCustomRange(false);
    }
  }, [selectedPresetId, startDate, endDate]);

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
      return t('timeFilter.custom');
    }
    const preset = translatedPresets.find(p => p.id === selectedPreset);
    return preset ? preset.label : t('timeFilter.allTime');
  }, [selectedPreset, t, translatedPresets]);

  const displayLabel = useMemo(() => {
    if (currentPresetLabel && selectedPreset !== 'custom') {
      return currentPresetLabel;
    }

    if (!startDate && !endDate) {
      return t('timeFilter.allTime');
    }

    if (startDate && endDate) {
      return t('timeFilter.dateRange', {
        start: formatDateForDisplay(startDate),
        end: formatDateForDisplay(endDate)
      });
    }

    if (startDate) {
      return t('timeFilter.from', { date: formatDateForDisplay(startDate) });
    }

    if (endDate) {
      return t('timeFilter.until', { date: formatDateForDisplay(endDate) });
    }

    return t('timeFilter.allTime');
  }, [startDate, endDate, currentPresetLabel, selectedPreset, t, formatDateForDisplay]);

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
      onTimeRangeChange(range.start, range.end, presetId);
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
        alert(t('timeFilter.invalidStartDate'));
        return;
      }
    }

    // Parse and validate end date
    if (customEndDate) {
      end = new Date(customEndDate);
      if (isNaN(end.getTime())) {
        alert(t('timeFilter.invalidEndDate'));
        return;
      }
    }

    // Validate date range
    if (start && end && start > end) {
      alert(t('timeFilter.startBeforeEnd'));
      return;
    }

    // Validate dates are not in the future beyond reasonable bounds
    const now = new Date();
    const maxFutureDate = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 year in future

    if (start && start > maxFutureDate) {
      alert(t('timeFilter.startDateTooFar'));
      return;
    }

    if (end && end > maxFutureDate) {
      alert(t('timeFilter.endDateTooFar'));
      return;
    }

    onTimeRangeChange(start, end, 'custom');
    setIsOpen(false);
  };

  const handleCustomRangeCancel = () => {
    setShowCustomRange(false);
    setIsOpen(false);
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
          'cursor-pointer select-none bg-slate-700 border rounded-lg px-4 py-2.5 flex items-center space-x-3 transition-all duration-200 ease-in-out min-w-0 h-[38px]',
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
        <span className={`text-sm font-medium truncate max-w-[200px] whitespace-nowrap ${hasActiveRange ? 'text-sky-300' : 'text-slate-100'}`}>
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
              <h3 className="text-sm font-medium text-sky-400">{t('timeFilter.selectTimeRange')}</h3>
            </div>

            {/* Preset Options */}
            <div className="space-y-1 mb-4">
              {translatedPresets.map((preset) => (
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
                <span>{t('timeFilter.customRange')}</span>
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
                      {t('timeFilter.startDate')}
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
                      {t('timeFilter.endDate')}
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
                      {t('timeFilter.apply')}
                    </Button>
                    <Button
                      onClick={handleCustomRangeCancel}
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                    >
                      {t('timeFilter.cancel')}
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
