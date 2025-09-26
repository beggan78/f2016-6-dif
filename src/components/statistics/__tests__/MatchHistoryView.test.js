import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MatchHistoryView } from '../MatchHistoryView';

describe('MatchHistoryView', () => {
  const mockOnMatchSelect = jest.fn();

  beforeEach(() => {
    mockOnMatchSelect.mockClear();
  });

  test('shows format filter when multiple formats exist in matches', () => {
    render(<MatchHistoryView onMatchSelect={mockOnMatchSelect} />);

    // The format filter should be visible since mock data has both 5v5 and 7v7
    expect(screen.getByText('Format')).toBeInTheDocument();
  });

  test('filters matches by format correctly', () => {
    render(<MatchHistoryView onMatchSelect={mockOnMatchSelect} />);

    // Initially should show all 10 matches
    expect(screen.getByText(/10 matches found/i)).toBeInTheDocument();

    // Find the format filter by looking for the label
    const formatLabel = screen.getByText('Format');
    const formatSelect = formatLabel.closest('.flex')?.querySelector('select');

    expect(formatSelect).toBeInTheDocument();

    if (formatSelect) {
      // Change to 5v5 filter
      fireEvent.change(formatSelect, { target: { value: '5v5' } });

      // Should now show fewer matches (6 matches have 5v5 format in mock data)
      expect(screen.getByText(/6 matches found/i)).toBeInTheDocument();
    }
  });

  test('format filter shows all format options from matches', () => {
    render(<MatchHistoryView onMatchSelect={mockOnMatchSelect} />);

    // Find the format filter select
    const formatLabel = screen.getByText('Format');
    const formatSelect = formatLabel.closest('.flex')?.querySelector('select');

    expect(formatSelect).toBeInTheDocument();

    if (formatSelect) {
      // The select should have All, 5v5, and 7v7 options based on mock data
      expect(formatSelect.children).toHaveLength(3); // All + 5v5 + 7v7

      const options = Array.from(formatSelect.children).map(option => option.textContent);
      expect(options).toContain('All');
      expect(options).toContain('5v5');
      expect(options).toContain('7v7');
    }
  });

  test('format filter visibility changes based on available formats', () => {
    render(<MatchHistoryView onMatchSelect={mockOnMatchSelect} />);

    // Since our mock data has both 5v5 and 7v7 formats, the filter should be visible
    expect(screen.getByText('Format')).toBeInTheDocument();

    // Format dropdown should exist
    const formatLabel = screen.getByText('Format');
    const formatSelect = formatLabel.closest('.flex')?.querySelector('select');
    expect(formatSelect).toBeInTheDocument();

    // Test that 7v7 filter works too
    if (formatSelect) {
      fireEvent.change(formatSelect, { target: { value: '7v7' } });
      expect(screen.getByText(/4 matches found/i)).toBeInTheDocument();
    }
  });

  test('component renders without errors', () => {
    render(<MatchHistoryView onMatchSelect={mockOnMatchSelect} />);

    // Check basic elements are present
    expect(screen.getByText('Filter')).toBeInTheDocument();
    expect(screen.getByText('Match History')).toBeInTheDocument();
    expect(screen.getByText(/matches found/i)).toBeInTheDocument();
  });
});