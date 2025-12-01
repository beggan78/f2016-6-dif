/**
 * Time range presets for filtering statistics and match data.
 * Each preset includes a unique ID, display label, and a getValue function
 * that returns the start and end dates for the time range.
 */
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
