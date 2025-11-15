import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SortableStatsTable } from '../SortableStatsTable';
import { Calendar, ChevronUp, ChevronDown } from 'lucide-react';

describe('SortableStatsTable', () => {
  const mockData = [
    { id: '1', name: 'Alice', score: 90 },
    { id: '2', name: 'Bob', score: 85 },
    { id: '3', name: 'Charlie', score: 95 }
  ];

  const mockColumns = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      className: 'text-left',
      render: (item) => <span>{item.name}</span>
    },
    {
      key: 'score',
      label: 'Score',
      sortable: true,
      className: 'text-center',
      render: (item) => <span>{item.score}</span>
    }
  ];

  const mockDragDropHandlers = {
    headerRowRef: { current: null },
    draggingColumn: null,
    dragOverColumn: null,
    dropIndicator: null,
    handlePointerDown: jest.fn()
  };

  const mockOnSort = jest.fn();
  const mockRenderSortIndicator = jest.fn(() => null);

  const defaultProps = {
    data: mockData,
    orderedColumns: mockColumns,
    sortBy: 'name',
    dragDropHandlers: mockDragDropHandlers,
    onSort: mockOnSort,
    renderSortIndicator: mockRenderSortIndicator,
    headerIcon: Calendar,
    headerTitle: 'Test Statistics',
    idKey: 'id'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render table header', () => {
      render(<SortableStatsTable {...defaultProps} />);

      expect(screen.getByText('Test Statistics')).toBeInTheDocument();
    });

    it('should render header icon', () => {
      const { container } = render(<SortableStatsTable {...defaultProps} />);

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should render header subtitle when provided', () => {
      render(<SortableStatsTable {...defaultProps} headerSubtitle="Click to sort" />);

      expect(screen.getByText('Click to sort')).toBeInTheDocument();
    });

    it('should not render subtitle when not provided', () => {
      render(<SortableStatsTable {...defaultProps} />);

      const subtitle = screen.queryByText(/Click to sort/i);
      expect(subtitle).not.toBeInTheDocument();
    });

    it('should render column headers', () => {
      render(<SortableStatsTable {...defaultProps} />);

      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Score')).toBeInTheDocument();
    });

    it('should render all data rows', () => {
      render(<SortableStatsTable {...defaultProps} />);

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
    });

    it('should render data values correctly', () => {
      render(<SortableStatsTable {...defaultProps} />);

      expect(screen.getByText('90')).toBeInTheDocument();
      expect(screen.getByText('85')).toBeInTheDocument();
      expect(screen.getByText('95')).toBeInTheDocument();
    });
  });

  describe('Column Sorting', () => {
    it('should call onSort when clicking sortable column header', () => {
      render(<SortableStatsTable {...defaultProps} />);

      const nameHeader = screen.getByText('Name');
      fireEvent.click(nameHeader);

      expect(mockOnSort).toHaveBeenCalledWith('name');
    });

    it('should not call onSort when clicking non-sortable column header', () => {
      const nonSortableColumns = [
        { ...mockColumns[0], sortable: false }
      ];

      render(
        <SortableStatsTable
          {...defaultProps}
          orderedColumns={nonSortableColumns}
        />
      );

      const nameHeader = screen.getByText('Name');
      fireEvent.click(nameHeader);

      expect(mockOnSort).not.toHaveBeenCalled();
    });

    it('should call renderSortIndicator for each sortable column', () => {
      render(<SortableStatsTable {...defaultProps} />);

      expect(mockRenderSortIndicator).toHaveBeenCalledWith('name');
      expect(mockRenderSortIndicator).toHaveBeenCalledWith('score');
    });

    it('should render sort indicators', () => {
      mockRenderSortIndicator.mockImplementation((columnKey) => {
        if (columnKey === 'name') {
          return <ChevronUp data-testid="sort-indicator" />;
        }
        return null;
      });

      render(<SortableStatsTable {...defaultProps} />);

      expect(screen.getByTestId('sort-indicator')).toBeInTheDocument();
    });
  });

  describe('Column Drag and Drop', () => {
    it('should call handlePointerDown on column header pointer down', () => {
      render(<SortableStatsTable {...defaultProps} />);

      const nameHeader = screen.getByText('Name').closest('th');
      fireEvent.pointerDown(nameHeader);

      expect(mockDragDropHandlers.handlePointerDown).toHaveBeenCalled();
    });

    it('should apply dragging opacity when column is being dragged', () => {
      const draggingHandlers = {
        ...mockDragDropHandlers,
        draggingColumn: 'name'
      };

      render(
        <SortableStatsTable
          {...defaultProps}
          dragDropHandlers={draggingHandlers}
        />
      );

      const nameHeader = screen.getByText('Name').closest('th');
      expect(nameHeader).toHaveClass('opacity-60');
    });

    it('should apply ring style when column is drag target', () => {
      const dragOverHandlers = {
        ...mockDragDropHandlers,
        draggingColumn: 'score',
        dragOverColumn: 'name'
      };

      render(
        <SortableStatsTable
          {...defaultProps}
          dragDropHandlers={dragOverHandlers}
        />
      );

      const nameHeader = screen.getByText('Name').closest('th');
      expect(nameHeader).toHaveClass('ring-1', 'ring-sky-400', 'ring-inset');
    });

    it('should not apply drag styles to non-dragging columns', () => {
      const draggingHandlers = {
        ...mockDragDropHandlers,
        draggingColumn: 'name'
      };

      render(
        <SortableStatsTable
          {...defaultProps}
          dragDropHandlers={draggingHandlers}
        />
      );

      const scoreHeader = screen.getByText('Score').closest('th');
      expect(scoreHeader).not.toHaveClass('opacity-60');
    });
  });

  describe('First Column Sticky Behavior', () => {
    it('should apply sticky styles to first column header', () => {
      render(<SortableStatsTable {...defaultProps} />);

      const firstHeader = screen.getByText('Name').closest('th');
      expect(firstHeader).toHaveClass('sticky', 'left-0', 'z-10', 'bg-slate-800');
    });

    it('should apply sticky styles to first column cells', () => {
      const { container } = render(<SortableStatsTable {...defaultProps} />);

      const firstCells = container.querySelectorAll('tbody tr td:first-child');
      firstCells.forEach(cell => {
        expect(cell).toHaveClass('sticky', 'left-0', 'z-10');
      });
    });

    it('should not apply sticky styles to non-first column headers', () => {
      render(<SortableStatsTable {...defaultProps} />);

      const secondHeader = screen.getByText('Score').closest('th');
      expect(secondHeader).not.toHaveClass('sticky');
    });

    it('should apply different cursor styles for first column', () => {
      render(<SortableStatsTable {...defaultProps} />);

      const firstHeader = screen.getByText('Name').closest('th');
      const secondHeader = screen.getByText('Score').closest('th');

      expect(firstHeader).toHaveClass('cursor-pointer');
      expect(secondHeader).toHaveClass('cursor-grab');
    });
  });

  describe('Row Styling', () => {
    it('should apply alternating row colors', () => {
      const { container } = render(<SortableStatsTable {...defaultProps} />);

      const rows = container.querySelectorAll('tbody tr');
      expect(rows[0]).toHaveClass('bg-slate-700');
      expect(rows[1]).toHaveClass('bg-slate-800');
      expect(rows[2]).toHaveClass('bg-slate-700');
    });

    it('should apply hover styles to rows', () => {
      const { container } = render(<SortableStatsTable {...defaultProps} />);

      const rows = container.querySelectorAll('tbody tr');
      rows.forEach(row => {
        expect(row).toHaveClass('hover:bg-slate-600', 'transition-colors');
      });
    });

    it('should match sticky cell background to row color', () => {
      const { container } = render(<SortableStatsTable {...defaultProps} />);

      const firstRow = container.querySelectorAll('tbody tr')[0];
      const firstCell = firstRow.querySelector('td:first-child');
      expect(firstCell).toHaveClass('bg-slate-700');

      const secondRow = container.querySelectorAll('tbody tr')[1];
      const secondCell = secondRow.querySelector('td:first-child');
      expect(secondCell).toHaveClass('bg-slate-800');
    });
  });

  describe('Drop Indicator', () => {
    it('should render drop indicator when provided', () => {
      const dropIndicatorHandlers = {
        ...mockDragDropHandlers,
        draggingColumn: 'score',
        dropIndicator: { columnKey: 'name', position: 'before' }
      };

      const { container } = render(
        <SortableStatsTable
          {...defaultProps}
          dragDropHandlers={dropIndicatorHandlers}
        />
      );

      const indicator = container.querySelector('.bg-sky-400\\/80');
      expect(indicator).toBeInTheDocument();
    });

    it('should not render drop indicator for dragging column', () => {
      const dropIndicatorHandlers = {
        ...mockDragDropHandlers,
        draggingColumn: 'name',
        dropIndicator: { columnKey: 'name', position: 'before' }
      };

      const { container } = render(
        <SortableStatsTable
          {...defaultProps}
          dragDropHandlers={dropIndicatorHandlers}
        />
      );

      const indicators = container.querySelectorAll('.bg-sky-400\\/80');
      expect(indicators).toHaveLength(0);
    });

    it('should position indicator before when position is before', () => {
      const dropIndicatorHandlers = {
        ...mockDragDropHandlers,
        draggingColumn: 'score',
        dropIndicator: { columnKey: 'name', position: 'before' }
      };

      const { container } = render(
        <SortableStatsTable
          {...defaultProps}
          dragDropHandlers={dropIndicatorHandlers}
        />
      );

      const indicator = container.querySelector('.bg-sky-400\\/80');
      expect(indicator?.style.left).toBe('-0.4rem');
    });

    it('should position indicator after when position is after', () => {
      const dropIndicatorHandlers = {
        ...mockDragDropHandlers,
        draggingColumn: 'score',
        dropIndicator: { columnKey: 'name', position: 'after' }
      };

      const { container } = render(
        <SortableStatsTable
          {...defaultProps}
          dragDropHandlers={dropIndicatorHandlers}
        />
      );

      const indicator = container.querySelector('.bg-sky-400\\/80');
      expect(indicator?.style.right).toBe('-0.4rem');
    });
  });

  describe('Column Animations', () => {
    it('should apply transform when drop indicator position is before', () => {
      const dropIndicatorHandlers = {
        ...mockDragDropHandlers,
        draggingColumn: 'score',
        dropIndicator: { columnKey: 'name', position: 'before' }
      };

      render(
        <SortableStatsTable
          {...defaultProps}
          dragDropHandlers={dropIndicatorHandlers}
        />
      );

      const nameHeader = screen.getByText('Name').closest('th');
      expect(nameHeader?.style.transform).toBe('translateX(12px)');
    });

    it('should apply transform when drop indicator position is after', () => {
      const dropIndicatorHandlers = {
        ...mockDragDropHandlers,
        draggingColumn: 'score',
        dropIndicator: { columnKey: 'name', position: 'after' }
      };

      render(
        <SortableStatsTable
          {...defaultProps}
          dragDropHandlers={dropIndicatorHandlers}
        />
      );

      const nameHeader = screen.getByText('Name').closest('th');
      expect(nameHeader?.style.transform).toBe('translateX(-12px)');
    });

    it('should apply transform to cells when column is drag target', () => {
      const dropIndicatorHandlers = {
        ...mockDragDropHandlers,
        draggingColumn: 'score',
        dropIndicator: { columnKey: 'name', position: 'before' }
      };

      const { container } = render(
        <SortableStatsTable
          {...defaultProps}
          dragDropHandlers={dropIndicatorHandlers}
        />
      );

      const nameCells = container.querySelectorAll('tbody tr td:first-child');
      nameCells.forEach(cell => {
        expect(cell.style.transform).toBe('translateX(12px)');
      });
    });
  });

  describe('Custom ID Key', () => {
    it('should use custom idKey for row keys', () => {
      const dataWithCustomId = [
        { customId: 'a1', name: 'Alice', score: 90 },
        { customId: 'b2', name: 'Bob', score: 85 }
      ];

      const { container } = render(
        <SortableStatsTable
          {...defaultProps}
          data={dataWithCustomId}
          idKey="customId"
        />
      );

      const rows = container.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(2);
    });

    it('should default to "id" when idKey not provided', () => {
      const { idKey, ...propsWithoutIdKey } = defaultProps;

      const { container } = render(
        <SortableStatsTable {...propsWithoutIdKey} />
      );

      const rows = container.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(3);
    });
  });

  describe('Column Class Names', () => {
    it('should apply column className to headers', () => {
      render(<SortableStatsTable {...defaultProps} />);

      const nameHeader = screen.getByText('Name').closest('th');
      expect(nameHeader).toHaveClass('text-left');

      const scoreHeader = screen.getByText('Score').closest('th');
      expect(scoreHeader).toHaveClass('text-center');
    });

    it('should apply column className to cells', () => {
      const { container } = render(<SortableStatsTable {...defaultProps} />);

      const firstRowCells = container.querySelectorAll('tbody tr:first-child td');
      expect(firstRowCells[0]).toHaveClass('text-left');
      expect(firstRowCells[1]).toHaveClass('text-center');
    });
  });

  describe('Active Sort Highlighting', () => {
    it('should highlight active sort column header', () => {
      render(<SortableStatsTable {...defaultProps} sortBy="name" />);

      const nameHeader = screen.getByText('Name').closest('th');
      expect(nameHeader).toHaveClass('bg-slate-700');
    });

    it('should not highlight non-active sort columns', () => {
      render(<SortableStatsTable {...defaultProps} sortBy="name" />);

      const scoreHeader = screen.getByText('Score').closest('th');
      expect(scoreHeader).not.toHaveClass('bg-slate-700');
    });
  });

  describe('Empty State', () => {
    it('should render empty table when no data', () => {
      render(<SortableStatsTable {...defaultProps} data={[]} />);

      expect(screen.getByText('Test Statistics')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Score')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should use semantic table elements', () => {
      const { container } = render(<SortableStatsTable {...defaultProps} />);

      expect(container.querySelector('table')).toBeInTheDocument();
      expect(container.querySelector('thead')).toBeInTheDocument();
      expect(container.querySelector('tbody')).toBeInTheDocument();
      expect(container.querySelectorAll('th')).toHaveLength(2);
      expect(container.querySelectorAll('tr')).toHaveLength(4); // 1 header + 3 data rows
    });

    it('should use scope attribute on header cells', () => {
      const { container } = render(<SortableStatsTable {...defaultProps} />);

      const headers = container.querySelectorAll('th');
      headers.forEach(header => {
        expect(header).toHaveAttribute('scope', 'col');
      });
    });

    it('should have data-column-key attributes for drag and drop', () => {
      const { container } = render(<SortableStatsTable {...defaultProps} />);

      const nameHeader = container.querySelector('th[data-column-key="name"]');
      expect(nameHeader).toBeInTheDocument();

      const scoreHeader = container.querySelector('th[data-column-key="score"]');
      expect(scoreHeader).toBeInTheDocument();
    });
  });
});
