import { useState, useMemo, useCallback } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

/**
 * useTableSort Hook
 *
 * Provides sorting functionality for table data with state management.
 * Handles both string and numeric sorting with ascending/descending order.
 *
 * @param {Array} data - The data array to sort
 * @param {string} initialSortBy - Initial sort column key
 * @param {string} [initialSortOrder='asc'] - Initial sort order ('asc' or 'desc')
 * @param {Function} [isReordering] - Optional function to check if column reordering is in progress
 * @returns {Object} Sorting state and functions
 */
export function useTableSort(data, initialSortBy, initialSortOrder = 'asc', isReordering) {
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [sortOrder, setSortOrder] = useState(initialSortOrder);

  // Sort the data based on current sort state
  const sortedData = useMemo(() => {
    if (!data || data.length === 0) {
      return [];
    }

    const sorted = [...data].sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // Handle string comparison
      if (typeof aValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortOrder === 'asc' ? comparison : -comparison;
      }

      // Handle numeric comparison
      const comparison = aValue - bValue;
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [data, sortBy, sortOrder]);

  // Handle column header click for sorting
  const handleSort = useCallback((columnKey) => {
    // Don't sort if column reordering is in progress
    if (isReordering && isReordering()) {
      return;
    }

    if (sortBy === columnKey) {
      // Toggle sort order if same column
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort column with default desc order (better for numeric columns)
      setSortBy(columnKey);
      setSortOrder('desc');
    }
  }, [sortBy, sortOrder, isReordering]);

  // Render sort indicator for column headers
  const renderSortIndicator = useCallback((columnKey) => {
    if (sortBy !== columnKey) return null;

    return sortOrder === 'asc' ? (
      <ChevronUp className="h-4 w-4 inline-block ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 inline-block ml-1" />
    );
  }, [sortBy, sortOrder]);

  return {
    sortedData,
    sortBy,
    sortOrder,
    handleSort,
    renderSortIndicator,
    setSortBy,
    setSortOrder
  };
}
