import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AttendanceStatsView } from '../AttendanceStatsView';
import { useTeam } from '../../../contexts/TeamContext';
import { getAttendanceStats, getTeamConnectors } from '../../../services/connectorService';
import { useNavigationHistory } from '../../../hooks/useNavigationHistory';
import { VIEWS } from '../../../constants/viewConstants';

// Mock dependencies
jest.mock('../../../contexts/TeamContext');
jest.mock('../../../services/connectorService');
jest.mock('../../../hooks/useNavigationHistory');
jest.mock('../../../hooks/useTableSort');
jest.mock('../../../hooks/useColumnOrderPersistence');

// Mock the hooks with default values
const mockUseTableSort = require('../../../hooks/useTableSort');
const mockUseColumnOrderPersistence = require('../../../hooks/useColumnOrderPersistence');

describe('AttendanceStatsView', () => {
  const mockNavigateTo = jest.fn();
  const mockHandleSort = jest.fn();
  const mockRenderSortIndicator = jest.fn(() => null);

  const mockAttendanceData = [
    {
      playerId: 'player-1',
      playerName: 'Alice Johnson',
      totalPractices: 20,
      totalAttendance: 18,
      attendanceRate: 90.0,
      matchesPlayed: 8,
      practicesPerMatch: 2.25,
      monthlyRecords: []
    },
    {
      playerId: 'player-2',
      playerName: 'Bob Smith',
      totalPractices: 20,
      totalAttendance: 15,
      attendanceRate: 75.0,
      matchesPlayed: 7,
      practicesPerMatch: 2.14,
      monthlyRecords: []
    },
    {
      playerId: 'player-3',
      playerName: 'Charlie Brown',
      totalPractices: 20,
      totalAttendance: 12,
      attendanceRate: 60.0,
      matchesPlayed: 6,
      practicesPerMatch: 2.0,
      monthlyRecords: []
    }
  ];

  const mockConnectors = [
    {
      id: 'connector-1',
      provider: 'sportadmin',
      status: 'connected',
      team_id: 'team-123'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock useTeam
    useTeam.mockReturnValue({
      currentTeam: { id: 'team-123', name: 'Test Team' }
    });

    // Mock useNavigationHistory
    useNavigationHistory.mockReturnValue({
      navigateTo: mockNavigateTo
    });

    // Mock useTableSort
    mockUseTableSort.useTableSort = jest.fn((data) => ({
      sortedData: data || [],
      sortBy: 'playerName',
      sortOrder: 'asc',
      handleSort: mockHandleSort,
      renderSortIndicator: mockRenderSortIndicator
    }));

    // Mock useColumnOrderPersistence
    mockUseColumnOrderPersistence.useColumnOrderPersistence = jest.fn((columns) => ({
      orderedColumns: columns,
      columnOrder: columns.map(c => c.key),
      isReordering: jest.fn(() => false),
      headerRowRef: { current: null },
      draggingColumn: null,
      dragOverColumn: null,
      dropIndicator: null,
      handlePointerDown: jest.fn()
    }));

    // Mock service calls - default to success
    getTeamConnectors.mockResolvedValue(mockConnectors);
    getAttendanceStats.mockResolvedValue(mockAttendanceData);
  });

  describe('Component Rendering', () => {
    it('should render loading state initially', () => {
      render(<AttendanceStatsView startDate={null} endDate={null} />);

      expect(screen.getByText('Loading attendance statistics...')).toBeInTheDocument();
    });

    it('should render summary statistics after loading', async () => {
      render(<AttendanceStatsView startDate={null} endDate={null} />);

      await waitFor(() => {
        expect(screen.getByText('Total Players')).toBeInTheDocument();
      });

      expect(screen.getByText('3')).toBeInTheDocument(); // Total players
      expect(screen.getAllByText('20').length).toBeGreaterThan(0); // Total practices
      expect(screen.getAllByText('75%').length).toBeGreaterThan(0); // Average attendance rate
      expect(screen.getAllByText('Alice Johnson').length).toBeGreaterThan(0); // Top attendee
    });

    it('should render attendance statistics table', async () => {
      render(<AttendanceStatsView startDate={null} endDate={null} />);

      await waitFor(() => {
        expect(screen.getByText('Attendance Statistics')).toBeInTheDocument();
      });

      expect(screen.getAllByText('Alice Johnson').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Bob Smith').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Charlie Brown').length).toBeGreaterThan(0);
    });

    it('should render table subtitle with instructions', async () => {
      render(<AttendanceStatsView startDate={null} endDate={null} />);

      await waitFor(() => {
        expect(screen.getByText(/Click column headers to sort or drag to reorder/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state while fetching connectors', () => {
      getTeamConnectors.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<AttendanceStatsView startDate={null} endDate={null} />);

      expect(screen.getByText('Loading attendance statistics...')).toBeInTheDocument();
    });

    it('should show loading state while fetching attendance data', async () => {
      getAttendanceStats.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<AttendanceStatsView startDate={null} endDate={null} />);

      await waitFor(() => {
        expect(screen.getByText('Loading attendance statistics...')).toBeInTheDocument();
      });
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no connectors are connected', async () => {
      getTeamConnectors.mockResolvedValue([
        {
          id: 'connector-1',
          provider: 'sportadmin',
          status: 'error',
          team_id: 'team-123'
        }
      ]);

      render(<AttendanceStatsView startDate={null} endDate={null} />);

      await waitFor(() => {
        expect(screen.getByText('No attendance data available')).toBeInTheDocument();
      });

      expect(screen.getByText(/Set up a Connector in Team Preferences/i)).toBeInTheDocument();
      expect(screen.getByText('SportAdmin')).toBeInTheDocument();
      expect(screen.getByText('Svenska Lag')).toBeInTheDocument();
      expect(screen.getByText('MyClub')).toBeInTheDocument();
    });

    it('should show Connect Now button when no connectors', async () => {
      getTeamConnectors.mockResolvedValue([]);

      render(<AttendanceStatsView startDate={null} endDate={null} />);

      await waitFor(() => {
        expect(screen.getByText('Connect Now')).toBeInTheDocument();
      });
    });

    it('should navigate to team preferences when Connect Now is clicked', async () => {
      getTeamConnectors.mockResolvedValue([]);

      render(<AttendanceStatsView startDate={null} endDate={null} />);

      const connectButton = await screen.findByText('Connect Now');
      connectButton.click();

      expect(mockNavigateTo).toHaveBeenCalledWith(VIEWS.TEAM_MANAGEMENT, { openToTab: 'preferences' });
    });

    it('should show empty state when no attendance data for date range', async () => {
      getAttendanceStats.mockResolvedValue([]);

      render(<AttendanceStatsView startDate={null} endDate={null} />);

      await waitFor(() => {
        expect(screen.getByText('No attendance data available for the selected time range')).toBeInTheDocument();
      });

      expect(screen.getByText(/Try adjusting the time filter or wait for the next sync/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error state when fetching attendance data fails', async () => {
      getAttendanceStats.mockRejectedValue(new Error('Network error'));

      render(<AttendanceStatsView startDate={null} endDate={null} />);

      await waitFor(() => {
        expect(screen.getByText('Error loading attendance statistics')).toBeInTheDocument();
      });

      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    it('should handle error without message gracefully', async () => {
      getAttendanceStats.mockRejectedValue(new Error());

      render(<AttendanceStatsView startDate={null} endDate={null} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load attendance statistics')).toBeInTheDocument();
      });
    });

    it('should not show error when connector fetch fails', async () => {
      getTeamConnectors.mockRejectedValue(new Error('Connector error'));

      render(<AttendanceStatsView startDate={null} endDate={null} />);

      await waitFor(() => {
        // Should show empty state instead of error
        expect(screen.getByText('No attendance data available')).toBeInTheDocument();
      });
    });
  });

  describe('Summary Statistics Calculation', () => {
    it('should calculate total players correctly', async () => {
      render(<AttendanceStatsView startDate={null} endDate={null} />);

      await waitFor(() => {
        expect(screen.getByText('Total Players')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
      });
    });

    it('should calculate total practices correctly', async () => {
      render(<AttendanceStatsView startDate={null} endDate={null} />);

      await waitFor(() => {
        expect(screen.getByText('Total Practices')).toBeInTheDocument();
        expect(screen.getAllByText('20').length).toBeGreaterThan(0);
      });
    });

    it('should calculate average attendance rate correctly', async () => {
      render(<AttendanceStatsView startDate={null} endDate={null} />);

      await waitFor(() => {
        // (90 + 75 + 60) / 3 = 75
        expect(screen.getByText('Avg. Attendance Rate')).toBeInTheDocument();
        expect(screen.getAllByText('75%').length).toBeGreaterThan(0);
      });
    });

    it('should identify top attendee by total attendance', async () => {
      render(<AttendanceStatsView startDate={null} endDate={null} />);

      await waitFor(() => {
        expect(screen.getByText('Top Attendee')).toBeInTheDocument();
        expect(screen.getAllByText('Alice Johnson').length).toBeGreaterThan(0);
        expect(screen.getAllByText('90%').length).toBeGreaterThan(0);
      });
    });

    it('should use attendance rate as tiebreaker for top attendee', async () => {
      const tieData = [
        {
          playerId: 'player-1',
          playerName: 'Alice Johnson',
          totalAttendance: 15,
          attendanceRate: 85.0,
          totalPractices: 20,
          matchesPlayed: 7,
          practicesPerMatch: 2.14
        },
        {
          playerId: 'player-2',
          playerName: 'Bob Smith',
          totalAttendance: 15,
          attendanceRate: 90.0,
          totalPractices: 20,
          matchesPlayed: 7,
          practicesPerMatch: 2.14
        }
      ];

      getAttendanceStats.mockResolvedValue(tieData);

      render(<AttendanceStatsView startDate={null} endDate={null} />);

      await waitFor(() => {
        // Bob has same attendance count but higher rate
        expect(screen.getByText('Top Attendee')).toBeInTheDocument();
        expect(screen.getAllByText('Bob Smith').length).toBeGreaterThan(0);
        expect(screen.getAllByText('90%').length).toBeGreaterThan(0);
      });
    });

    it('should show N/A when no attendance data', async () => {
      getAttendanceStats.mockResolvedValue([]);

      render(<AttendanceStatsView startDate={null} endDate={null} />);

      await waitFor(() => {
        // Should show empty state, not summary
        expect(screen.queryByText('Total Players')).not.toBeInTheDocument();
      });
    });
  });

  describe('Data Fetching', () => {
    it('should fetch connectors with team id', async () => {
      render(<AttendanceStatsView startDate={null} endDate={null} />);

      await waitFor(() => {
        expect(getTeamConnectors).toHaveBeenCalledWith('team-123');
      });
    });

    it('should fetch attendance stats with team id and date filters', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      render(<AttendanceStatsView startDate={startDate} endDate={endDate} />);

      await waitFor(() => {
        expect(getAttendanceStats).toHaveBeenCalledWith('team-123', startDate, endDate);
      });
    });

    it('should refetch when date filters change', async () => {
      const { rerender } = render(<AttendanceStatsView startDate={null} endDate={null} />);

      await waitFor(() => {
        expect(getAttendanceStats).toHaveBeenCalledWith('team-123', null, null);
      });

      const newStartDate = new Date('2025-01-01');
      const newEndDate = new Date('2025-01-31');

      rerender(<AttendanceStatsView startDate={newStartDate} endDate={newEndDate} />);

      await waitFor(() => {
        expect(getAttendanceStats).toHaveBeenCalledWith('team-123', newStartDate, newEndDate);
      });
    });

    it('should not fetch when team is not selected', async () => {
      useTeam.mockReturnValue({ currentTeam: null });

      render(<AttendanceStatsView startDate={null} endDate={null} />);

      await waitFor(() => {
        expect(getTeamConnectors).not.toHaveBeenCalled();
        expect(getAttendanceStats).not.toHaveBeenCalled();
      });
    });
  });

  describe('Sorting Integration', () => {
    it('should pass sorted data to table', async () => {
      const sortedData = [...mockAttendanceData].reverse();

      mockUseTableSort.useTableSort.mockReturnValue({
        sortedData,
        sortBy: 'playerName',
        sortOrder: 'desc',
        handleSort: mockHandleSort,
        renderSortIndicator: mockRenderSortIndicator
      });

      render(<AttendanceStatsView startDate={null} endDate={null} />);

      await waitFor(() => {
        expect(screen.getByText('Attendance Statistics')).toBeInTheDocument();
      });

      // Verify sorting hook was called with correct data
      expect(mockUseTableSort.useTableSort).toHaveBeenCalledWith(
        mockAttendanceData,
        'playerName',
        'asc',
        expect.any(Function)
      );
    });
  });

  describe('Column Order Persistence', () => {
    it('should initialize column order persistence', async () => {
      render(<AttendanceStatsView startDate={null} endDate={null} />);

      await waitFor(() => {
        expect(mockUseColumnOrderPersistence.useColumnOrderPersistence).toHaveBeenCalled();
      });

      const callArgs = mockUseColumnOrderPersistence.useColumnOrderPersistence.mock.calls[0];
      expect(callArgs[0]).toHaveLength(6); // 6 columns
      expect(callArgs[1]).toBe('sport-wizard-stats-attendance-column-order');
    });
  });
});
