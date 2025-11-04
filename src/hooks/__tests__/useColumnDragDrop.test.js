import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useColumnDragDrop } from '../useColumnDragDrop';

// Test component to wrap the hook
function TestComponent({ columns, options = {} }) {
  const {
    headerRowRef,
    orderedColumns,
    columnOrder,
    draggingColumn,
    dragOverColumn,
    dropIndicator,
    isReordering,
    handlePointerDown
  } = useColumnDragDrop(columns, options);

  return (
    <div>
      <table>
        <thead>
          <tr ref={headerRowRef}>
            {orderedColumns.map((column) => (
              <th
                key={column.key}
                data-column-key={column.key}
                data-testid={`header-${column.key}`}
                onPointerDown={(e) => handlePointerDown(e, column.key)}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
      </table>
      <div data-testid="state-info">
        <div data-testid="dragging-column">{draggingColumn || 'none'}</div>
        <div data-testid="drag-over-column">{dragOverColumn || 'none'}</div>
        <div data-testid="is-reordering">{isReordering ? 'true' : 'false'}</div>
        <div data-testid="column-order">{columnOrder.join(',')}</div>
        <div data-testid="drop-indicator">
          {dropIndicator ? `${dropIndicator.columnKey}:${dropIndicator.position}` : 'none'}
        </div>
      </div>
    </div>
  );
}

describe('useColumnDragDrop', () => {
  let defaultColumns;
  let mockOnReorder;

  beforeEach(() => {
    defaultColumns = [
      { key: 'name', label: 'Name', sortable: true },
      { key: 'age', label: 'Age', sortable: true },
      { key: 'email', label: 'Email', sortable: true },
      { key: 'status', label: 'Status', sortable: true }
    ];

    mockOnReorder = jest.fn();
    jest.clearAllMocks();
  });

  describe('Hook Initialization', () => {
    it('should initialize with default column order', () => {
      const { getByTestId } = render(<TestComponent columns={defaultColumns} />);

      expect(getByTestId('column-order').textContent).toBe('name,age,email,status');
      expect(getByTestId('is-reordering').textContent).toBe('false');
      expect(getByTestId('dragging-column').textContent).toBe('none');
    });

    it('should initialize with custom initial order', () => {
      const initialOrder = ['email', 'name', 'status', 'age'];
      const { getByTestId } = render(
        <TestComponent columns={defaultColumns} options={{ initialOrder }} />
      );

      expect(getByTestId('column-order').textContent).toBe('email,name,status,age');
    });

    it('should render columns in the correct order', () => {
      const { getByTestId } = render(<TestComponent columns={defaultColumns} />);

      const headers = document.querySelectorAll('th');
      expect(headers[0]).toHaveTextContent('Name');
      expect(headers[1]).toHaveTextContent('Age');
      expect(headers[2]).toHaveTextContent('Email');
      expect(headers[3]).toHaveTextContent('Status');
    });

    it('should handle partial initial order by appending missing columns', () => {
      const initialOrder = ['email', 'name']; // Missing 'age' and 'status'
      const { getByTestId } = render(
        <TestComponent columns={defaultColumns} options={{ initialOrder }} />
      );

      const order = getByTestId('column-order').textContent;
      expect(order).toContain('email');
      expect(order).toContain('name');
      expect(order).toContain('age');
      expect(order).toContain('status');
    });

    it('should filter out invalid column keys from initial order', () => {
      const initialOrder = ['email', 'invalid', 'name', 'nonexistent'];
      const { getByTestId } = render(
        <TestComponent columns={defaultColumns} options={{ initialOrder }} />
      );

      const order = getByTestId('column-order').textContent;
      expect(order).not.toContain('invalid');
      expect(order).not.toContain('nonexistent');
    });
  });

  describe('Drag Interaction', () => {
    it('should start drag session on pointer down with mouse', () => {
      const { getByTestId } = render(<TestComponent columns={defaultColumns} />);

      const header = getByTestId('header-age');

      // Start drag
      fireEvent.pointerDown(header, {
        button: 0,
        pointerId: 1,
        pointerType: 'mouse',
        clientX: 100,
        clientY: 50
      });

      // Move to trigger drag activation
      fireEvent.pointerMove(window, {
        pointerId: 1,
        clientX: 110,
        clientY: 50
      });

      // Should be in dragging state
      expect(getByTestId('is-reordering').textContent).toBe('true');
      expect(getByTestId('dragging-column').textContent).toBe('age');
    });

    it('should not start drag with non-left mouse button', () => {
      const { getByTestId } = render(<TestComponent columns={defaultColumns} />);

      const header = getByTestId('header-age');

      // Right-click should be ignored
      fireEvent.pointerDown(header, {
        button: 2,
        pointerId: 1,
        pointerType: 'mouse',
        clientX: 100,
        clientY: 50
      });

      expect(getByTestId('is-reordering').textContent).toBe('false');
    });

    it('should cleanup drag state on pointer up', () => {
      const { getByTestId } = render(<TestComponent columns={defaultColumns} />);

      const header = getByTestId('header-age');

      // Start drag
      fireEvent.pointerDown(header, {
        button: 0,
        pointerId: 1,
        pointerType: 'mouse',
        clientX: 100,
        clientY: 50
      });

      fireEvent.pointerMove(window, {
        pointerId: 1,
        clientX: 110,
        clientY: 50
      });

      // End drag
      fireEvent.pointerUp(window, {
        pointerId: 1,
        clientX: 110,
        clientY: 50
      });

      expect(getByTestId('is-reordering').textContent).toBe('false');
      expect(getByTestId('dragging-column').textContent).toBe('none');
    });

    it('should cancel drag on pointer cancel', () => {
      const { getByTestId } = render(<TestComponent columns={defaultColumns} />);

      const header = getByTestId('header-age');

      // Start drag
      fireEvent.pointerDown(header, {
        button: 0,
        pointerId: 1,
        pointerType: 'mouse',
        clientX: 100,
        clientY: 50
      });

      fireEvent.pointerMove(window, {
        pointerId: 1,
        clientX: 110,
        clientY: 50
      });

      // Cancel drag
      fireEvent.pointerCancel(window, {
        pointerId: 1
      });

      expect(getByTestId('is-reordering').textContent).toBe('false');
      expect(getByTestId('dragging-column').textContent).toBe('none');
    });
  });

  describe('Fixed Columns', () => {
    it('should not allow dragging fixed columns', () => {
      const fixedColumns = ['name'];
      const { getByTestId } = render(
        <TestComponent
          columns={defaultColumns}
          options={{ fixedColumns }}
        />
      );

      const nameHeader = getByTestId('header-name');

      // Try to drag the fixed column
      fireEvent.pointerDown(nameHeader, {
        button: 0,
        pointerId: 1,
        pointerType: 'mouse',
        clientX: 100,
        clientY: 50
      });

      fireEvent.pointerMove(window, {
        pointerId: 1,
        clientX: 110,
        clientY: 50
      });

      // Should not be in dragging state
      expect(getByTestId('is-reordering').textContent).toBe('false');
      expect(getByTestId('dragging-column').textContent).toBe('none');
    });

    it('should allow dragging non-fixed columns', () => {
      const fixedColumns = ['name'];
      const { getByTestId } = render(
        <TestComponent
          columns={defaultColumns}
          options={{ fixedColumns }}
        />
      );

      const ageHeader = getByTestId('header-age');

      // Drag a non-fixed column
      fireEvent.pointerDown(ageHeader, {
        button: 0,
        pointerId: 1,
        pointerType: 'mouse',
        clientX: 100,
        clientY: 50
      });

      fireEvent.pointerMove(window, {
        pointerId: 1,
        clientX: 110,
        clientY: 50
      });

      // Should be in dragging state
      expect(getByTestId('is-reordering').textContent).toBe('true');
      expect(getByTestId('dragging-column').textContent).toBe('age');
    });

    it('should not allow dropping before a fixed column', () => {
      const fixedColumns = ['name'];
      const { getByTestId } = render(
        <TestComponent
          columns={defaultColumns}
          options={{
            fixedColumns,
            onReorder: mockOnReorder
          }}
        />
      );

      // Initial order: name, age, email, status
      // Try to drag 'email' before 'name' (fixed)
      const emailHeader = getByTestId('header-email');

      fireEvent.pointerDown(emailHeader, {
        button: 0,
        pointerId: 1,
        pointerType: 'touch',
        clientX: 200,
        clientY: 50
      });

      fireEvent.pointerUp(window, {
        pointerId: 1,
        clientX: 50, // Try to drop at the beginning
        clientY: 50
      });

      // Order should remain unchanged
      expect(getByTestId('column-order').textContent).toBe('name,age,email,status');
      expect(mockOnReorder).not.toHaveBeenCalled();
    });

    it('should maintain fixed column at the start after reorder', () => {
      const fixedColumns = ['name'];
      const { getByTestId } = render(
        <TestComponent
          columns={defaultColumns}
          options={{ fixedColumns }}
        />
      );

      // Verify 'name' stays first
      const order = getByTestId('column-order').textContent.split(',');
      expect(order[0]).toBe('name');
    });
  });

  describe('Column Reordering', () => {
    it('should call onReorder callback when columns are reordered', () => {
      const { getByTestId } = render(
        <TestComponent
          columns={defaultColumns}
          options={{ onReorder: mockOnReorder }}
        />
      );

      const ageHeader = getByTestId('header-age');

      // Start drag
      fireEvent.pointerDown(ageHeader, {
        button: 0,
        pointerId: 1,
        pointerType: 'touch',
        clientX: 150,
        clientY: 50
      });

      // Complete drag (drop at a different position)
      fireEvent.pointerUp(window, {
        pointerId: 1,
        clientX: 300,
        clientY: 50
      });

      // onReorder should be called
      expect(mockOnReorder).toHaveBeenCalled();
    });

    it('should not reorder if dropped on the same column', () => {
      const { getByTestId } = render(
        <TestComponent
          columns={defaultColumns}
          options={{ onReorder: mockOnReorder }}
        />
      );

      const ageHeader = getByTestId('header-age');

      // Start and end drag on same column
      fireEvent.pointerDown(ageHeader, {
        button: 0,
        pointerId: 1,
        pointerType: 'touch',
        clientX: 150,
        clientY: 50
      });

      fireEvent.pointerUp(window, {
        pointerId: 1,
        clientX: 150,
        clientY: 50
      });

      // Should not call onReorder
      expect(mockOnReorder).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty columns array', () => {
      const { getByTestId } = render(<TestComponent columns={[]} />);

      expect(getByTestId('column-order').textContent).toBe('');
    });

    it('should handle single column', () => {
      const singleColumn = [{ key: 'name', label: 'Name', sortable: true }];
      const { getByTestId } = render(<TestComponent columns={singleColumn} />);

      expect(getByTestId('column-order').textContent).toBe('name');
    });

    it('should handle all columns as fixed', () => {
      const fixedColumns = ['name', 'age', 'email', 'status'];
      const { getByTestId } = render(
        <TestComponent
          columns={defaultColumns}
          options={{ fixedColumns }}
        />
      );

      const nameHeader = getByTestId('header-name');

      // Try to drag any column
      fireEvent.pointerDown(nameHeader, {
        button: 0,
        pointerId: 1,
        pointerType: 'mouse',
        clientX: 100,
        clientY: 50
      });

      fireEvent.pointerMove(window, {
        pointerId: 1,
        clientX: 110,
        clientY: 50
      });

      // Should not be in dragging state
      expect(getByTestId('is-reordering').textContent).toBe('false');
    });

    it('should handle columns being added dynamically', () => {
      const { getByTestId, rerender } = render(
        <TestComponent columns={defaultColumns.slice(0, 2)} />
      );

      expect(getByTestId('column-order').textContent).toBe('name,age');

      // Add more columns
      rerender(<TestComponent columns={defaultColumns} />);

      expect(getByTestId('column-order').textContent).toBe('name,age,email,status');
    });
  });

  describe('Cleanup and Memory', () => {
    it('should cleanup event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      const { unmount } = render(<TestComponent columns={defaultColumns} />);

      unmount();

      // Should clean up event listeners
      expect(removeEventListenerSpy).toHaveBeenCalled();

      removeEventListenerSpy.mockRestore();
    });

    it('should not have memory leaks with repeated drag operations', () => {
      const { getByTestId } = render(<TestComponent columns={defaultColumns} />);

      const ageHeader = getByTestId('header-age');

      // Perform multiple drag operations
      for (let i = 0; i < 10; i++) {
        fireEvent.pointerDown(ageHeader, {
          button: 0,
          pointerId: i,
          pointerType: 'mouse',
          clientX: 100,
          clientY: 50
        });

        fireEvent.pointerMove(window, {
          pointerId: i,
          clientX: 110,
          clientY: 50
        });

        fireEvent.pointerUp(window, {
          pointerId: i,
          clientX: 110,
          clientY: 50
        });
      }

      // Should end in clean state
      expect(getByTestId('is-reordering').textContent).toBe('false');
      expect(getByTestId('dragging-column').textContent).toBe('none');
    });
  });
});
