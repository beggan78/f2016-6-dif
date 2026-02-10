import React from 'react';
import { COLUMN_SHIFT_PX } from '../../../hooks/useColumnDragDrop';
import { Card } from '../../shared/Card';

/**
 * SortableStatsTable Component
 *
 * Fully-featured statistics table with:
 * - Column sorting with visual indicators
 * - Drag-and-drop column reordering with animations
 * - Visual drop indicators (blue vertical bar with glow)
 * - Cell animations during reordering
 * - Accessibility attributes
 * - Alternating row colors
 * - Hover effects
 *
 * @param {Object} props
 * @param {Array} props.data - Array of data items to display
 * @param {Array} props.orderedColumns - Ordered array of column definitions
 * @param {string} props.sortBy - Current sort column key
 * @param {Object} props.dragDropHandlers - Handlers from useColumnOrderPersistence
 * @param {Function} props.onSort - Function to handle column sorting
 * @param {Function} props.renderSortIndicator - Function to render sort indicators
 * @param {React.Component} props.headerIcon - Icon for table header
 * @param {string} props.headerTitle - Title for table header
 * @param {string} [props.headerSubtitle] - Optional subtitle for table header
 * @param {string} [props.idKey='id'] - Key to use for row IDs (default: 'id')
 */
export function SortableStatsTable({
  data,
  orderedColumns,
  sortBy,
  dragDropHandlers,
  onSort,
  renderSortIndicator,
  headerIcon: HeaderIcon,
  headerTitle,
  headerSubtitle,
  idKey = 'id'
}) {
  const {
    headerRowRef,
    draggingColumn,
    dragOverColumn,
    dropIndicator,
    handlePointerDown
  } = dragDropHandlers;

  return (
    <Card padding="sm" className="overflow-hidden">
      {/* Table Header */}
      <div className="p-4 border-b border-slate-600">
        <h3 className="text-lg font-semibold text-sky-400 flex items-center space-x-2">
          <HeaderIcon className="h-5 w-5" />
          <span>{headerTitle}</span>
        </h3>
        {headerSubtitle && (
          <p className="text-slate-400 text-sm mt-1">{headerSubtitle}</p>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-800">
            <tr ref={headerRowRef}>
              {orderedColumns.map((column, columnIndex) => {
                const indicator =
                  dropIndicator?.columnKey === column.key ? dropIndicator.position : null;
                const transformValue =
                  indicator === 'before'
                    ? `translateX(${COLUMN_SHIFT_PX}px)`
                    : indicator === 'after'
                    ? `translateX(-${COLUMN_SHIFT_PX}px)`
                    : undefined;
                const headerStyle = {
                  transform: transformValue,
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  boxShadow:
                    indicator && draggingColumn !== column.key
                      ? '0 0 0 2px rgba(56, 189, 248, 0.3)'
                      : undefined
                };

                // First column should be sticky
                const isFirstColumn = columnIndex === 0;

                return (
                  <th
                    key={column.key}
                    scope="col"
                    data-column-key={column.key}
                    className={`relative px-3 py-2 text-xs font-medium text-sky-200 tracking-wider select-none touch-none ${
                      column.className || ''
                    } ${
                      isFirstColumn ? 'sticky left-0 z-10 bg-slate-800' : ''
                    } ${
                      column.sortable && !isFirstColumn ? 'cursor-grab active:cursor-grabbing hover:bg-slate-700 transition-colors' : ''
                    } ${
                      column.sortable && isFirstColumn ? 'cursor-pointer hover:bg-slate-700 transition-colors' : ''
                    } ${sortBy === column.key ? 'bg-slate-700' : ''} ${
                      draggingColumn === column.key ? 'opacity-60' : ''
                    } ${
                      dragOverColumn === column.key && draggingColumn !== column.key
                        ? 'ring-1 ring-sky-400 ring-inset'
                        : ''
                    }`}
                    style={headerStyle}
                    onClick={column.sortable ? () => onSort(column.key) : undefined}
                    onPointerDown={(event) => handlePointerDown(event, column.key)}
                  >
                    <div className="relative flex w-full items-center justify-center gap-1">
                      {/* Visual drop indicator */}
                      {indicator && draggingColumn !== column.key && (
                        <span
                          className="pointer-events-none absolute top-1/2 h-8 w-1 rounded-full bg-sky-400/80 -translate-y-1/2"
                          style={{
                            left: indicator === 'before' ? '-0.4rem' : undefined,
                            right: indicator === 'after' ? '-0.4rem' : undefined,
                            boxShadow: '0 0 12px rgba(56, 189, 248, 0.6)'
                          }}
                          aria-hidden="true"
                        />
                      )}
                      <span>{column.label}</span>
                      {column.sortable && renderSortIndicator(column.key)}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-600">
            {data.map((item, index) => (
              <tr
                key={item[idKey]}
                className={`${
                  index % 2 === 0 ? 'bg-slate-700' : 'bg-slate-800'
                } hover:bg-slate-600 transition-colors`}
              >
                {orderedColumns.map((column, columnIndex) => {
                  const indicator =
                    dropIndicator?.columnKey === column.key ? dropIndicator.position : null;
                  const transformValue =
                    indicator === 'before'
                      ? `translateX(${COLUMN_SHIFT_PX}px)`
                      : indicator === 'after'
                      ? `translateX(-${COLUMN_SHIFT_PX}px)`
                      : undefined;
                  const cellStyle = {
                    transform: transformValue,
                    transition: 'transform 0.15s ease'
                  };

                  // First column should be sticky with background color matching the row
                  const isFirstColumn = columnIndex === 0;
                  const stickyBgClass = isFirstColumn
                    ? index % 2 === 0
                      ? 'bg-slate-700'
                      : 'bg-slate-800'
                    : '';

                  return (
                    <td
                      key={column.key}
                      className={`px-3 py-2 whitespace-nowrap text-sm ${column.className} ${
                        isFirstColumn ? 'sticky left-0 z-10' : ''
                      } ${stickyBgClass}`}
                      style={cellStyle}
                    >
                      {column.render(item)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
