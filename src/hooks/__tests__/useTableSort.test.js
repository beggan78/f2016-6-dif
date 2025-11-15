import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { useTableSort } from '../useTableSort';

// Test component to wrap the hook
function TestComponent({ data, initialSortBy, initialSortOrder, isReordering }) {
  const {
    sortedData,
    sortBy,
    sortOrder,
    handleSort,
    renderSortIndicator,
    setSortBy,
    setSortOrder
  } = useTableSort(data, initialSortBy, initialSortOrder, isReordering);

  return (
    <div>
      <div data-testid="sorted-data">{JSON.stringify(sortedData)}</div>
      <div data-testid="sort-by">{sortBy}</div>
      <div data-testid="sort-order">{sortOrder}</div>
      <button data-testid="sort-name" onClick={() => handleSort('name')}>
        Sort by name
      </button>
      <button data-testid="sort-age" onClick={() => handleSort('age')}>
        Sort by age
      </button>
      <button data-testid="set-sort-by" onClick={() => setSortBy('age')}>
        Set sort by
      </button>
      <button data-testid="set-sort-order" onClick={() => setSortOrder('asc')}>
        Set sort order
      </button>
      <div data-testid="name-indicator">
        {renderSortIndicator('name')}
      </div>
      <div data-testid="age-indicator">
        {renderSortIndicator('age')}
      </div>
    </div>
  );
}

describe('useTableSort', () => {
  const mockData = [
    { name: 'Charlie', age: 30 },
    { name: 'Alice', age: 25 },
    { name: 'Bob', age: 35 }
  ];

  describe('Hook Initialization', () => {
    it('should initialize with provided initial sort column', () => {
      const { getByTestId } = render(
        <TestComponent data={mockData} initialSortBy="name" />
      );

      expect(getByTestId('sort-by')).toHaveTextContent('name');
    });

    it('should initialize with provided initial sort order', () => {
      const { getByTestId } = render(
        <TestComponent data={mockData} initialSortBy="name" initialSortOrder="desc" />
      );

      expect(getByTestId('sort-order')).toHaveTextContent('desc');
    });

    it('should default to asc order when not provided', () => {
      const { getByTestId } = render(
        <TestComponent data={mockData} initialSortBy="name" />
      );

      expect(getByTestId('sort-order')).toHaveTextContent('asc');
    });
  });

  describe('String Sorting', () => {
    it('should sort strings in ascending order', () => {
      const { getByTestId } = render(
        <TestComponent data={mockData} initialSortBy="name" initialSortOrder="asc" />
      );

      const sortedData = JSON.parse(getByTestId('sorted-data').textContent);

      expect(sortedData[0].name).toBe('Alice');
      expect(sortedData[1].name).toBe('Bob');
      expect(sortedData[2].name).toBe('Charlie');
    });

    it('should sort strings in descending order', () => {
      const { getByTestId } = render(
        <TestComponent data={mockData} initialSortBy="name" initialSortOrder="desc" />
      );

      const sortedData = JSON.parse(getByTestId('sorted-data').textContent);

      expect(sortedData[0].name).toBe('Charlie');
      expect(sortedData[1].name).toBe('Bob');
      expect(sortedData[2].name).toBe('Alice');
    });
  });

  describe('Numeric Sorting', () => {
    it('should sort numbers in ascending order', () => {
      const { getByTestId } = render(
        <TestComponent data={mockData} initialSortBy="age" initialSortOrder="asc" />
      );

      const sortedData = JSON.parse(getByTestId('sorted-data').textContent);

      expect(sortedData[0].age).toBe(25);
      expect(sortedData[1].age).toBe(30);
      expect(sortedData[2].age).toBe(35);
    });

    it('should sort numbers in descending order', () => {
      const { getByTestId } = render(
        <TestComponent data={mockData} initialSortBy="age" initialSortOrder="desc" />
      );

      const sortedData = JSON.parse(getByTestId('sorted-data').textContent);

      expect(sortedData[0].age).toBe(35);
      expect(sortedData[1].age).toBe(30);
      expect(sortedData[2].age).toBe(25);
    });
  });

  describe('Sort Toggling', () => {
    it('should toggle sort order when clicking same column', () => {
      const { getByTestId } = render(
        <TestComponent data={mockData} initialSortBy="name" initialSortOrder="asc" />
      );

      expect(getByTestId('sort-order')).toHaveTextContent('asc');

      fireEvent.click(getByTestId('sort-name'));

      expect(getByTestId('sort-order')).toHaveTextContent('desc');

      fireEvent.click(getByTestId('sort-name'));

      expect(getByTestId('sort-order')).toHaveTextContent('asc');
    });

    it('should change column and default to desc when clicking different column', () => {
      const { getByTestId } = render(
        <TestComponent data={mockData} initialSortBy="name" initialSortOrder="asc" />
      );

      expect(getByTestId('sort-by')).toHaveTextContent('name');

      fireEvent.click(getByTestId('sort-age'));

      expect(getByTestId('sort-by')).toHaveTextContent('age');
      expect(getByTestId('sort-order')).toHaveTextContent('desc');
    });
  });

  describe('Sort Indicators', () => {
    it('should render ChevronUp for ascending sort', () => {
      const { getByTestId } = render(
        <TestComponent data={mockData} initialSortBy="name" initialSortOrder="asc" />
      );

      const indicator = getByTestId('name-indicator');
      expect(indicator.querySelector('svg')).toBeInTheDocument();
    });

    it('should render ChevronDown for descending sort', () => {
      const { getByTestId } = render(
        <TestComponent data={mockData} initialSortBy="name" initialSortOrder="desc" />
      );

      const indicator = getByTestId('name-indicator');
      expect(indicator.querySelector('svg')).toBeInTheDocument();
    });

    it('should not render indicator for non-sorted column', () => {
      const { getByTestId } = render(
        <TestComponent data={mockData} initialSortBy="name" initialSortOrder="asc" />
      );

      const indicator = getByTestId('age-indicator');
      expect(indicator).toBeEmptyDOMElement();
    });
  });

  describe('Reordering Prevention', () => {
    it('should not sort when column reordering is in progress', () => {
      const isReordering = jest.fn(() => true);

      const { getByTestId } = render(
        <TestComponent
          data={mockData}
          initialSortBy="name"
          initialSortOrder="asc"
          isReordering={isReordering}
        />
      );

      expect(getByTestId('sort-by')).toHaveTextContent('name');

      fireEvent.click(getByTestId('sort-age'));

      expect(isReordering).toHaveBeenCalled();
      expect(getByTestId('sort-by')).toHaveTextContent('name'); // Should not change
    });

    it('should sort when column reordering is not in progress', () => {
      const isReordering = jest.fn(() => false);

      const { getByTestId } = render(
        <TestComponent
          data={mockData}
          initialSortBy="name"
          initialSortOrder="asc"
          isReordering={isReordering}
        />
      );

      fireEvent.click(getByTestId('sort-age'));

      expect(isReordering).toHaveBeenCalled();
      expect(getByTestId('sort-by')).toHaveTextContent('age'); // Should change
    });

    it('should work when isReordering is not provided', () => {
      const { getByTestId } = render(
        <TestComponent data={mockData} initialSortBy="name" initialSortOrder="asc" />
      );

      fireEvent.click(getByTestId('sort-age'));

      expect(getByTestId('sort-by')).toHaveTextContent('age');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data array', () => {
      const { getByTestId } = render(
        <TestComponent data={[]} initialSortBy="name" />
      );

      const sortedData = JSON.parse(getByTestId('sorted-data').textContent);
      expect(sortedData).toEqual([]);
    });

    it('should handle null data', () => {
      const { getByTestId } = render(
        <TestComponent data={null} initialSortBy="name" />
      );

      const sortedData = JSON.parse(getByTestId('sorted-data').textContent);
      expect(sortedData).toEqual([]);
    });

    it('should handle undefined data', () => {
      const { getByTestId } = render(
        <TestComponent data={undefined} initialSortBy="name" />
      );

      const sortedData = JSON.parse(getByTestId('sorted-data').textContent);
      expect(sortedData).toEqual([]);
    });

    it('should handle single item array', () => {
      const singleItem = [{ name: 'Alice', age: 25 }];

      const { getByTestId } = render(
        <TestComponent data={singleItem} initialSortBy="name" />
      );

      const sortedData = JSON.parse(getByTestId('sorted-data').textContent);
      expect(sortedData).toEqual(singleItem);
    });

    it('should not mutate original data array', () => {
      const originalData = [...mockData];

      render(
        <TestComponent data={mockData} initialSortBy="name" initialSortOrder="asc" />
      );

      expect(mockData).toEqual(originalData);
    });
  });

  describe('State Management', () => {
    it('should expose setSortBy function', () => {
      const { getByTestId } = render(
        <TestComponent data={mockData} initialSortBy="name" />
      );

      expect(getByTestId('sort-by')).toHaveTextContent('name');

      fireEvent.click(getByTestId('set-sort-by'));

      expect(getByTestId('sort-by')).toHaveTextContent('age');
    });

    it('should expose setSortOrder function', () => {
      const { getByTestId } = render(
        <TestComponent data={mockData} initialSortBy="name" initialSortOrder="desc" />
      );

      expect(getByTestId('sort-order')).toHaveTextContent('desc');

      fireEvent.click(getByTestId('set-sort-order'));

      expect(getByTestId('sort-order')).toHaveTextContent('asc');
    });
  });

  describe('Data Updates', () => {
    it('should re-sort when data changes', () => {
      const { getByTestId, rerender } = render(
        <TestComponent data={mockData} initialSortBy="name" initialSortOrder="asc" />
      );

      let sortedData = JSON.parse(getByTestId('sorted-data').textContent);
      expect(sortedData[0].name).toBe('Alice');

      const newData = [
        { name: 'Zack', age: 40 },
        { name: 'Alice', age: 25 }
      ];

      rerender(
        <TestComponent data={newData} initialSortBy="name" initialSortOrder="asc" />
      );

      sortedData = JSON.parse(getByTestId('sorted-data').textContent);
      expect(sortedData[0].name).toBe('Alice');
      expect(sortedData[1].name).toBe('Zack');
    });
  });
});
