import { useMemo, useEffect } from 'react';
import { PersistenceManager } from '../utils/persistenceManager';
import { useColumnDragDrop } from './useColumnDragDrop';

/**
 * useColumnOrderPersistence Hook
 *
 * Manages column order with localStorage persistence and drag-drop functionality.
 * Combines useColumnDragDrop hook with PersistenceManager for seamless column reordering.
 *
 * @param {Array} baseColumns - Array of column definitions
 * @param {string} storageKey - localStorage key for persisting column order
 * @returns {Object} Column drag-drop state and handlers
 */
export function useColumnOrderPersistence(baseColumns, storageKey) {
  // Calculate default column order
  const defaultColumnOrder = useMemo(
    () => baseColumns.map((column) => column.key),
    [baseColumns]
  );

  // Create persistence manager
  const columnOrderManager = useMemo(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    return new PersistenceManager(storageKey, {
      order: defaultColumnOrder
    });
  }, [storageKey, defaultColumnOrder]);

  // Load saved column order from localStorage
  const savedColumnOrder = useMemo(() => {
    if (!columnOrderManager) {
      return null;
    }

    const savedState = columnOrderManager.loadState();
    return Array.isArray(savedState?.order) ? savedState.order : null;
  }, [columnOrderManager]);

  // Initialize column drag-drop with saved order
  const columnDragDrop = useColumnDragDrop(baseColumns, {
    initialOrder: savedColumnOrder
  });

  // Save column order to localStorage whenever it changes
  useEffect(() => {
    if (!columnOrderManager || !columnDragDrop.columnOrder) {
      return;
    }

    columnOrderManager.saveState({ order: columnDragDrop.columnOrder });
  }, [columnOrderManager, columnDragDrop.columnOrder]);

  return columnDragDrop;
}
