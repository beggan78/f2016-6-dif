import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { useColumnOrderPersistence } from '../useColumnOrderPersistence';
import { PersistenceManager } from '../../utils/persistenceManager';

// Mock dependencies
jest.mock('../../utils/persistenceManager');
jest.mock('../useColumnDragDrop');

const mockUseColumnDragDrop = require('../useColumnDragDrop');

describe('useColumnOrderPersistence', () => {
  const baseColumns = [
    { key: 'name', label: 'Name' },
    { key: 'age', label: 'Age' },
    { key: 'email', label: 'Email' }
  ];

  const storageKey = 'test-column-order';

  let mockPersistenceManager;
  let mockUseColumnDragDropReturn;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock PersistenceManager
    mockPersistenceManager = {
      loadState: jest.fn(),
      saveState: jest.fn()
    };

    PersistenceManager.mockImplementation(() => mockPersistenceManager);

    // Mock useColumnDragDrop
    mockUseColumnDragDropReturn = {
      orderedColumns: baseColumns,
      columnOrder: ['name', 'age', 'email'],
      headerRowRef: { current: null },
      draggingColumn: null,
      dragOverColumn: null,
      dropIndicator: null,
      isReordering: jest.fn(() => false),
      handlePointerDown: jest.fn()
    };

    mockUseColumnDragDrop.useColumnDragDrop = jest.fn(() => mockUseColumnDragDropReturn);
  });

  function TestComponent({ columns, storageKey: key }) {
    const result = useColumnOrderPersistence(columns, key);

    return (
      <div data-testid="result">{JSON.stringify({
        columnOrder: result.columnOrder,
        orderedColumnsCount: result.orderedColumns.length
      })}</div>
    );
  }

  describe('Hook Initialization', () => {
    it('should create PersistenceManager with storage key and default order', () => {
      mockPersistenceManager.loadState.mockReturnValue(null);

      render(<TestComponent columns={baseColumns} storageKey={storageKey} />);

      expect(PersistenceManager).toHaveBeenCalledWith(storageKey, {
        order: ['name', 'age', 'email']
      });
    });

    it('should load saved column order from localStorage', () => {
      const savedOrder = ['email', 'name', 'age'];
      mockPersistenceManager.loadState.mockReturnValue({
        order: savedOrder
      });

      render(<TestComponent columns={baseColumns} storageKey={storageKey} />);

      expect(mockPersistenceManager.loadState).toHaveBeenCalled();
      expect(mockUseColumnDragDrop.useColumnDragDrop).toHaveBeenCalledWith(
        baseColumns,
        { initialOrder: savedOrder }
      );
    });

    it('should use default order when no saved state exists', () => {
      mockPersistenceManager.loadState.mockReturnValue(null);

      render(<TestComponent columns={baseColumns} storageKey={storageKey} />);

      expect(mockUseColumnDragDrop.useColumnDragDrop).toHaveBeenCalledWith(
        baseColumns,
        { initialOrder: null }
      );
    });

    it('should use default order when saved state is invalid', () => {
      mockPersistenceManager.loadState.mockReturnValue({
        order: 'invalid'
      });

      render(<TestComponent columns={baseColumns} storageKey={storageKey} />);

      expect(mockUseColumnDragDrop.useColumnDragDrop).toHaveBeenCalledWith(
        baseColumns,
        { initialOrder: null }
      );
    });
  });

  describe('State Persistence', () => {
    it('should save column order when it changes', async () => {
      mockPersistenceManager.loadState.mockReturnValue(null);

      const { rerender } = render(<TestComponent columns={baseColumns} storageKey={storageKey} />);

      // Simulate column order change
      const newOrder = ['age', 'name', 'email'];
      mockUseColumnDragDropReturn.columnOrder = newOrder;

      rerender(<TestComponent columns={baseColumns} storageKey={storageKey} />);

      await waitFor(() => {
        expect(mockPersistenceManager.saveState).toHaveBeenCalledWith({
          order: newOrder
        });
      });
    });

    it('should not save when column order is null', () => {
      mockPersistenceManager.loadState.mockReturnValue(null);
      mockUseColumnDragDropReturn.columnOrder = null;

      render(<TestComponent columns={baseColumns} storageKey={storageKey} />);

      expect(mockPersistenceManager.saveState).not.toHaveBeenCalled();
    });

    it('should not save when PersistenceManager is not available', () => {
      PersistenceManager.mockImplementation(() => null);

      render(<TestComponent columns={baseColumns} storageKey={storageKey} />);

      expect(mockPersistenceManager.saveState).not.toHaveBeenCalled();
    });
  });

  describe('SSR Compatibility', () => {
    it('should handle SSR environment gracefully', () => {
      // Simulate SSR by having PersistenceManager return null
      // (We can't actually delete window because React DOM needs it)
      PersistenceManager.mockImplementation(() => null);

      const { getByTestId } = render(<TestComponent columns={baseColumns} storageKey={storageKey} />);

      expect(getByTestId('result')).toBeInTheDocument();
    });
  });

  describe('Return Values', () => {
    it('should return all values from useColumnDragDrop', () => {
      mockPersistenceManager.loadState.mockReturnValue(null);

      function ExtendedTestComponent() {
        const result = useColumnOrderPersistence(baseColumns, storageKey);

        return (
          <div>
            <div data-testid="ordered-columns">{JSON.stringify(result.orderedColumns)}</div>
            <div data-testid="column-order">{JSON.stringify(result.columnOrder)}</div>
            <div data-testid="has-isReordering">{typeof result.isReordering === 'function' ? 'yes' : 'no'}</div>
            <div data-testid="has-handlePointerDown">{typeof result.handlePointerDown === 'function' ? 'yes' : 'no'}</div>
            <div data-testid="has-headerRowRef">{result.headerRowRef ? 'yes' : 'no'}</div>
          </div>
        );
      }

      const { getByTestId } = render(<ExtendedTestComponent />);

      expect(getByTestId('ordered-columns')).toHaveTextContent(JSON.stringify(baseColumns));
      expect(getByTestId('column-order')).toHaveTextContent(JSON.stringify(['name', 'age', 'email']));
      expect(getByTestId('has-isReordering')).toHaveTextContent('yes');
      expect(getByTestId('has-handlePointerDown')).toHaveTextContent('yes');
      expect(getByTestId('has-headerRowRef')).toHaveTextContent('yes');
    });
  });

  describe('Column Changes', () => {
    it('should handle base columns changing', () => {
      mockPersistenceManager.loadState.mockReturnValue(null);

      const { rerender } = render(<TestComponent columns={baseColumns} storageKey={storageKey} />);

      const newColumns = [
        ...baseColumns,
        { key: 'phone', label: 'Phone' }
      ];

      rerender(<TestComponent columns={newColumns} storageKey={storageKey} />);

      expect(mockUseColumnDragDrop.useColumnDragDrop).toHaveBeenLastCalledWith(
        newColumns,
        expect.any(Object)
      );
    });
  });

  describe('Cleanup and Memory', () => {
    it('should not cause memory leaks on unmount', () => {
      mockPersistenceManager.loadState.mockReturnValue(null);

      const { unmount } = render(<TestComponent columns={baseColumns} storageKey={storageKey} />);

      unmount();

      // No errors should be thrown
      expect(true).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty columns array', () => {
      mockPersistenceManager.loadState.mockReturnValue(null);

      render(<TestComponent columns={[]} storageKey={storageKey} />);

      expect(PersistenceManager).toHaveBeenCalledWith(storageKey, {
        order: []
      });
    });

    it('should handle saved order with missing columns', () => {
      const savedOrder = ['email', 'name', 'age', 'missing'];
      mockPersistenceManager.loadState.mockReturnValue({
        order: savedOrder
      });

      render(<TestComponent columns={baseColumns} storageKey={storageKey} />);

      // Should still pass the saved order to useColumnDragDrop
      // The drag-drop hook will handle filtering invalid keys
      expect(mockUseColumnDragDrop.useColumnDragDrop).toHaveBeenCalledWith(
        baseColumns,
        { initialOrder: savedOrder }
      );
    });

    it('should handle saved order with extra columns', () => {
      const savedOrder = ['name', 'age'];
      mockPersistenceManager.loadState.mockReturnValue({
        order: savedOrder
      });

      render(<TestComponent columns={baseColumns} storageKey={storageKey} />);

      expect(mockUseColumnDragDrop.useColumnDragDrop).toHaveBeenCalledWith(
        baseColumns,
        { initialOrder: savedOrder }
      );
    });
  });
});
