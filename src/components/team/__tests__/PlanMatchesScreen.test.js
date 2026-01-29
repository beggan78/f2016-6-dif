/**
 * PlanMatchesScreen Component Tests
 *
 * Focused test suite for core rendering and interaction flows.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PlanMatchesScreen } from '../PlanMatchesScreen';

jest.mock('../../../contexts/TeamContext', () => ({
  useTeam: jest.fn()
}));

jest.mock('../../../hooks/useAttendanceStats', () => ({
  useAttendanceStats: jest.fn()
}));

jest.mock('../../../hooks/usePlanningDefaults', () => ({
  usePlanningDefaults: jest.fn()
}));

jest.mock('../../../services/matchPlanningService', () => ({
  planUpcomingMatch: jest.fn()
}));

describe('PlanMatchesScreen', () => {
  let defaultProps;
  let mockUseTeam;
  let mockUseAttendanceStats;
  let mockUsePlanningDefaults;
  let mockPlanUpcomingMatch;

  const mockTeam = {
    id: 'team-1',
    name: 'Test Team',
    club: { name: 'Test Club' }
  };

  const rosterPlayers = [
    {
      id: 'p1',
      display_name: 'Alex Player',
      first_name: 'Alex',
      last_name: 'Player',
      jersey_number: 9,
      on_roster: true
    },
    {
      id: 'p2',
      display_name: 'Bree Player',
      first_name: 'Bree',
      last_name: 'Player',
      jersey_number: 12,
      on_roster: true
    }
  ];

  const matchesToPlan = [
    {
      id: 'match-1',
      opponent: 'Opponent FC',
      matchDate: '2030-01-01',
      matchTime: '18:00:00'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    mockUseTeam = require('../../../contexts/TeamContext').useTeam;
    mockUseAttendanceStats = require('../../../hooks/useAttendanceStats').useAttendanceStats;
    mockUsePlanningDefaults = require('../../../hooks/usePlanningDefaults').usePlanningDefaults;
    mockPlanUpcomingMatch = require('../../../services/matchPlanningService').planUpcomingMatch;

    mockUseTeam.mockReturnValue({
      currentTeam: mockTeam,
      teamPlayers: rosterPlayers,
      loadTeamPreferences: jest.fn()
    });

    mockUseAttendanceStats.mockReturnValue({
      attendanceStats: [
        { playerId: 'p1', practicesPerMatch: 1.5, attendanceRate: 75 },
        { playerId: 'p2', practicesPerMatch: 2.1, attendanceRate: 85 }
      ],
      statsLoading: false,
      statsError: null
    });

    mockUsePlanningDefaults.mockReturnValue({
      defaults: { format: '5v5' },
      defaultsError: null
    });

    mockPlanUpcomingMatch.mockResolvedValue({ success: true });

    defaultProps = {
      onNavigateBack: jest.fn(),
      pushNavigationState: jest.fn(),
      removeFromNavigationStack: jest.fn(),
      matchesToPlan
    };
  });

  it('should render team required message when no team', () => {
    mockUseTeam.mockReturnValue({
      currentTeam: null,
      teamPlayers: [],
      loadTeamPreferences: jest.fn()
    });

    render(<PlanMatchesScreen {...defaultProps} />);

    expect(screen.getByText('Team context required.')).toBeInTheDocument();
  });

  it('should render no matches selected when matches list is empty', () => {
    render(<PlanMatchesScreen {...defaultProps} matchesToPlan={[]} />);

    expect(screen.getByText('No matches selected.')).toBeInTheDocument();
  });

  it('should allow selecting a player from the roster', () => {
    render(<PlanMatchesScreen {...defaultProps} />);

    const rosterPlayer = screen.getByText('Alex Player');
    expect(screen.getAllByText('Alex Player').length).toBe(1);

    fireEvent.click(rosterPlayer);

    expect(screen.getAllByText('Alex Player').length).toBe(2);
  });

  it('should prevent selecting unavailable players', () => {
    render(<PlanMatchesScreen {...defaultProps} />);

    const unavailableButton = screen.getByLabelText('Mark unavailable');
    fireEvent.click(unavailableButton);

    fireEvent.click(screen.getByText('Alex Player'));

    expect(screen.getAllByText('Alex Player').length).toBe(1);
  });

  it('should open and close the auto select modal', () => {
    render(<PlanMatchesScreen {...defaultProps} />);

    fireEvent.click(screen.getByText('Recommend'));
    expect(screen.getByText('Auto Select')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Auto Select')).not.toBeInTheDocument();
  });

  it('should call planUpcomingMatch when saving selected players', async () => {
    render(<PlanMatchesScreen {...defaultProps} />);

    fireEvent.click(screen.getByText('Alex Player'));
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockPlanUpcomingMatch).toHaveBeenCalled();
    });

    const callArgs = mockPlanUpcomingMatch.mock.calls[0][0];
    expect(callArgs).toEqual(expect.objectContaining({
      teamId: 'team-1',
      selectedSquadIds: ['p1'],
      upcomingMatch: matchesToPlan[0]
    }));
  });
});
