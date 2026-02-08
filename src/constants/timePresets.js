/**
 * Time range presets for filtering statistics and match data.
 * Each preset includes a unique ID, display label, and a getValue function
 * that returns the start and end dates for the time range.
 */

/* eslint-disable dot-notation */

// Translated time presets - use this in components with access to the t function
export const getTimePresets = (t) => [
  {
    id: 'last-30-days',
    label: t('statistics:timeFilter.presets.last-30-days'),
    getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      return { start, end };
    }
  },
  {
    id: 'last-3-months',
    label: t('statistics:timeFilter.presets.last-3-months'),
    getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setMonth(start.getMonth() - 3);
      return { start, end };
    }
  },
  {
    id: 'last-6-months',
    label: t('statistics:timeFilter.presets.last-6-months'),
    getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setMonth(start.getMonth() - 6);
      return { start, end };
    }
  },
  {
    id: 'last-12-months',
    label: t('statistics:timeFilter.presets.last-12-months'),
    getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setFullYear(start.getFullYear() - 1);
      return { start, end };
    }
  },
  {
    id: 'year-to-date',
    label: t('statistics:timeFilter.presets.year-to-date'),
    getValue: () => {
      const end = new Date();
      const start = new Date(end.getFullYear(), 0, 1);
      return { start, end };
    }
  },
  {
    id: 'all-time',
    label: t('statistics:timeFilter.presets.all-time'),
    getValue: () => {
      return { start: null, end: null };
    }
  }
];

/* eslint-enable dot-notation */

// Backward compatibility - static TIME_PRESETS for non-component code
export const TIME_PRESETS = [
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
