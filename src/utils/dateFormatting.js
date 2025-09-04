/**
 * Date formatting utilities for consistent date display
 * across the pending match resume feature
 */

import { UI_DEFAULTS } from '../constants/matchDefaults';

/**
 * Formats a date string for match display with relative time descriptions
 * @param {string|Date} dateInput - Date string or Date object to format
 * @returns {string} Formatted date string with relative time context
 */
export const formatMatchDate = (dateInput) => {
  if (!dateInput) return UI_DEFAULTS.UNKNOWN_DATE;
  
  try {
    const date = new Date(dateInput);
    const now = new Date();
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return UI_DEFAULTS.UNKNOWN_DATE;
    }
    
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Today - show time
    if (diffDays === 0) {
      return formatTodayTime(date);
    }
    
    // Yesterday - show "Yesterday at time"
    if (diffDays === 1) {
      return formatYesterdayTime(date);
    }
    
    // This week - show "X days ago"  
    if (diffDays < 7) {
      return formatRecentDays(diffDays);
    }
    
    // Older - show abbreviated date
    return formatAbsoluteDate(date, now);
    
  } catch {
    return UI_DEFAULTS.UNKNOWN_DATE;
  }
};

/**
 * Formats time for matches created today
 * @param {Date} date - Date to format
 * @returns {string} Time with "today" context
 */
const formatTodayTime = (date) => {
  const timeString = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
  return `${timeString} (today)`;
};

/**
 * Formats time for matches created yesterday
 * @param {Date} date - Date to format
 * @returns {string} Time with "yesterday" context
 */
const formatYesterdayTime = (date) => {
  const timeString = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
  return `Yesterday at ${timeString}`;
};

/**
 * Formats recent dates as "X days ago"
 * @param {number} diffDays - Number of days ago
 * @returns {string} Relative days description
 */
const formatRecentDays = (diffDays) => {
  return `${diffDays} days ago`;
};

/**
 * Formats absolute dates for older matches
 * @param {Date} date - Date to format  
 * @param {Date} now - Current date for year comparison
 * @returns {string} Abbreviated date string
 */
const formatAbsoluteDate = (date, now) => {
  const options = {
    month: 'short',
    day: 'numeric'
  };
  
  // Include year if different from current year
  if (date.getFullYear() !== now.getFullYear()) {
    options.year = 'numeric';
  }
  
  return date.toLocaleDateString('en-US', options);
};

/**
 * Gets a relative time description for sorting/display purposes
 * @param {string|Date} dateInput - Date to analyze
 * @returns {{category: string, sortValue: number, display: string}} Date info object
 */
export const getDateInfo = (dateInput) => {
  if (!dateInput) {
    return {
      category: 'unknown',
      sortValue: 0,
      display: UI_DEFAULTS.UNKNOWN_DATE
    };
  }
  
  try {
    const date = new Date(dateInput);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    let category, sortValue;
    
    if (diffDays === 0) {
      category = 'today';
      sortValue = date.getTime(); // Sort by time for today's matches
    } else if (diffDays === 1) {
      category = 'yesterday';
      sortValue = date.getTime();
    } else if (diffDays < 7) {
      category = 'recent';
      sortValue = date.getTime();
    } else {
      category = 'older';
      sortValue = date.getTime();
    }
    
    return {
      category,
      sortValue,
      display: formatMatchDate(dateInput)
    };
  } catch {
    return {
      category: 'unknown',
      sortValue: 0,
      display: UI_DEFAULTS.UNKNOWN_DATE
    };
  }
};