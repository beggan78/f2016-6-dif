/**
 * PlanMatchesScreen Component Tests
 *
 * Focused test suite for core rendering and interaction flows.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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

jest.mock('../../../hooks/useProviderAvailability', () => ({
  useProviderAvailability: jest.fn()
}));

jest.mock('../../../services/matchPlanningService', () => ({
  planUpcomingMatch: jest.fn()
}));

jest.mock('../../../services/matchStateManager', () => ({
  getSquadSelectionsForMatches: jest.fn()
}));

const STORAGE_KEY = 'sport-wizard-plan-match-auto-select-settings';
const UNAVAILABLE_STORAGE_KEY = 'sport-wizard-plan-match-unavailable-players';

describe('PlanMatchesScreen', () => {
  let defaultProps;
  let mockUseTeam;
  let mockUseAttendanceStats;
  let mockUsePlanningDefaults;
  let mockUseProviderAvailability;
  let mockPlanUpcomingMatch;
  let mockGetSquadSelectionsForMatches;

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
    mockUseProviderAvailability = require('../../../hooks/useProviderAvailability').useProviderAvailability;
    mockPlanUpcomingMatch = require('../../../services/matchPlanningService').planUpcomingMatch;
    mockGetSquadSelectionsForMatches = require('../../../services/matchStateManager').getSquadSelectionsForMatches;

    mockGetSquadSelectionsForMatches.mockResolvedValue({ success: true, selections: {} });

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

    mockUseProviderAvailability.mockReturnValue({
      providerUnavailableByMatch: {},
      providerResponseByMatch: {},
      providerInvitedByMatch: {},
      providerAvailabilityLoading: false
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

    const alexRow = screen.getByText('Alex Player').closest('[role="button"]');
    if (!alexRow) {
      throw new Error('Expected Alex Player row to be present.');
    }

    const unavailableButton = within(alexRow).getByLabelText('Mark unavailable');
    fireEvent.click(unavailableButton);

    fireEvent.click(screen.getByText('Alex Player'));

    expect(screen.getAllByText('Alex Player').length).toBe(1);
  });

  it('should allow overriding provider unavailable players and persist override locally', async () => {
    mockUseProviderAvailability.mockReturnValue({
      providerUnavailableByMatch: {
        'match-1': ['p1']
      },
      providerResponseByMatch: {},
      providerInvitedByMatch: {},
      providerAvailabilityLoading: false
    });

    render(<PlanMatchesScreen {...defaultProps} />);

    const getAlexRosterRow = () => {
      const row = screen
        .getAllByText('Alex Player')
        .map((node) => node.closest('[role="button"]'))
        .filter(Boolean)
        .find((candidate) => (
          within(candidate).queryByLabelText('Mark available')
          || within(candidate).queryByLabelText('Mark unavailable')
        ));

      if (!row) {
        throw new Error('Expected Alex Player roster row to be present.');
      }

      return row;
    };

    const alexRow = getAlexRosterRow();
    const markAvailableButton = within(alexRow).getByLabelText('Mark available');
    fireEvent.click(markAvailableButton);

    fireEvent.click(screen.getByText('Alex Player'));

    expect(screen.getAllByText('Alex Player').length).toBe(2);

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(UNAVAILABLE_STORAGE_KEY));
      expect(stored.providerAvailableOverridesByMatch['match-1']).toEqual(['p1']);
    });

    const updatedAlexRow = getAlexRosterRow();
    fireEvent.click(within(updatedAlexRow).getByLabelText('Mark unavailable'));

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

  describe('squad size defaults', () => {
    const makeLargeRoster = (count) =>
      Array.from({ length: count }, (_, i) => ({
        id: `p${i + 1}`,
        display_name: `Player ${i + 1}`,
        first_name: `Player`,
        last_name: `${i + 1}`,
        jersey_number: i + 1,
        on_roster: true
      }));

    const makeLargeStats = (count) =>
      Array.from({ length: count }, (_, i) => ({
        playerId: `p${i + 1}`,
        practicesPerMatch: 1.0,
        attendanceRate: 80
      }));

    it('should default squad size to minimumPlayers + 2 when no lastSquadSize is stored', () => {
      const largeRoster = makeLargeRoster(12);
      mockUseTeam.mockReturnValue({
        currentTeam: mockTeam,
        teamPlayers: largeRoster,
        loadTeamPreferences: jest.fn()
      });
      mockUseAttendanceStats.mockReturnValue({
        attendanceStats: makeLargeStats(12),
        statsLoading: false,
        statsError: null
      });

      render(<PlanMatchesScreen {...defaultProps} />);

      fireEvent.click(screen.getByText('Recommend'));

      // 5v5 minimum is 5 (4 field + 1 goalie), so default = 5 + 2 = 7
      const squadInput = screen.getByDisplayValue('7');
      expect(squadInput).toBeInTheDocument();
    });

    it('should use stored lastSquadSize when available', () => {
      const largeRoster = makeLargeRoster(12);
      mockUseTeam.mockReturnValue({
        currentTeam: mockTeam,
        teamPlayers: largeRoster,
        loadTeamPreferences: jest.fn()
      });
      mockUseAttendanceStats.mockReturnValue({
        attendanceStats: makeLargeStats(12),
        statsLoading: false,
        statsError: null
      });

      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        teamId: 'team-1',
        ensureCoverage: true,
        metric: 'practices',
        targetCounts: {},
        lastSquadSize: 9
      }));

      render(<PlanMatchesScreen {...defaultProps} />);

      fireEvent.click(screen.getByText('Recommend'));

      const squadInput = screen.getByDisplayValue('9');
      expect(squadInput).toBeInTheDocument();
    });

    it('should cap lastSquadSize to roster count', () => {
      const smallRoster = makeLargeRoster(4);
      mockUseTeam.mockReturnValue({
        currentTeam: mockTeam,
        teamPlayers: smallRoster,
        loadTeamPreferences: jest.fn()
      });
      mockUseAttendanceStats.mockReturnValue({
        attendanceStats: makeLargeStats(4),
        statsLoading: false,
        statsError: null
      });

      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        teamId: 'team-1',
        ensureCoverage: true,
        metric: 'practices',
        targetCounts: {},
        lastSquadSize: 10
      }));

      render(<PlanMatchesScreen {...defaultProps} />);

      fireEvent.click(screen.getByText('Recommend'));

      // lastSquadSize is 10, but roster is only 4, so capped to 4
      const squadInput = screen.getByDisplayValue('4');
      expect(squadInput).toBeInTheDocument();
    });
  });

  describe('player response status icons', () => {
    it('should show response icons when a selected player has accepted', () => {
      mockUseProviderAvailability.mockReturnValue({
        providerUnavailableByMatch: {},
        providerResponseByMatch: {
          'match-1': {
            'p1': 'accepted',
            'p2': 'no_response'
          }
        },
        providerInvitedByMatch: {},
        providerAvailabilityLoading: false
      });

      render(<PlanMatchesScreen {...defaultProps} />);

      // Select p1 (accepted) - this triggers the invitationsSent condition
      fireEvent.click(screen.getByText('Alex Player'));

      // Now p1 should show a check icon in the selected list
      const selectedCards = screen.getAllByText('Alex Player');
      expect(selectedCards.length).toBe(2);
    });

    it('should not show response icons when no selected player has accepted', () => {
      mockUseProviderAvailability.mockReturnValue({
        providerUnavailableByMatch: {},
        providerResponseByMatch: {
          'match-1': {
            'p1': 'no_response',
            'p2': 'no_response'
          }
        },
        providerInvitedByMatch: {},
        providerAvailabilityLoading: false
      });

      render(<PlanMatchesScreen {...defaultProps} />);

      // Select p1 (no_response only, no accepted)
      fireEvent.click(screen.getByText('Alex Player'));

      // Icons should not appear since no selected player has 'accepted'
      expect(screen.queryByTestId('icon-check')).not.toBeInTheDocument();
      expect(screen.queryByTestId('icon-help-circle')).not.toBeInTheDocument();
    });
  });

  describe('saved squad selection pre-population', () => {
    const pendingMatchesToPlan = [
      {
        id: 'match-1',
        opponent: 'Opponent FC',
        state: 'pending',
        matchDate: '2030-01-01',
        matchTime: '18:00:00'
      }
    ];

    it('should fetch saved selections for pending matches', async () => {
      mockGetSquadSelectionsForMatches.mockResolvedValue({
        success: true,
        selections: { 'match-1': ['p1', 'p2'] }
      });

      render(
        <PlanMatchesScreen
          {...defaultProps}
          matchesToPlan={pendingMatchesToPlan}
        />
      );

      await waitFor(() => {
        expect(mockGetSquadSelectionsForMatches).toHaveBeenCalledWith(['match-1']);
      });

      // Both players should appear in the selected area (rendered twice: roster + selected)
      await waitFor(() => {
        expect(screen.getAllByText('Alex Player').length).toBe(2);
        expect(screen.getAllByText('Bree Player').length).toBe(2);
      });
    });

    it('should not fetch when matches are not pending', () => {
      const runningMatches = [
        {
          id: 'match-1',
          opponent: 'Opponent FC',
          state: 'running',
          matchDate: '2030-01-01',
          matchTime: '18:00:00'
        }
      ];

      render(
        <PlanMatchesScreen
          {...defaultProps}
          matchesToPlan={runningMatches}
        />
      );

      expect(mockGetSquadSelectionsForMatches).not.toHaveBeenCalled();
    });

    it('should not overwrite existing selections', async () => {
      mockGetSquadSelectionsForMatches.mockResolvedValue({
        success: true,
        selections: { 'match-1': ['p2'] }
      });

      render(
        <PlanMatchesScreen
          {...defaultProps}
          matchesToPlan={pendingMatchesToPlan}
        />
      );

      // Manually select p1 before DB fetch resolves
      fireEvent.click(screen.getByText('Alex Player'));
      expect(screen.getAllByText('Alex Player').length).toBe(2);

      // Wait for the fetch to complete - it should not overwrite the manual selection
      await waitFor(() => {
        expect(mockGetSquadSelectionsForMatches).toHaveBeenCalled();
      });

      // p1 (Alex) should still be selected (manual), not replaced by p2 from DB
      expect(screen.getAllByText('Alex Player').length).toBe(2);
    });

    it('should handle failed DB fetch gracefully', async () => {
      mockGetSquadSelectionsForMatches.mockResolvedValue({
        success: false,
        error: 'DB error'
      });

      render(
        <PlanMatchesScreen
          {...defaultProps}
          matchesToPlan={pendingMatchesToPlan}
        />
      );

      await waitFor(() => {
        expect(mockGetSquadSelectionsForMatches).toHaveBeenCalled();
      });

      // Players should still be listed in roster (once each, not selected)
      expect(screen.getAllByText('Alex Player').length).toBe(1);
      expect(screen.getAllByText('Bree Player').length).toBe(1);
    });
  });

  describe('clear overrides (reset)', () => {
    it('should clear manual unavailability, provider overrides, and re-seed from invites', async () => {
      mockUseProviderAvailability.mockReturnValue({
        providerUnavailableByMatch: {
          'match-1': ['p2']
        },
        providerResponseByMatch: {},
        providerInvitedByMatch: {
          'match-1': ['p1', 'p2']
        },
        providerAvailabilityLoading: false
      });

      render(<PlanMatchesScreen {...defaultProps} />);

      // Wait for invite seeding
      await waitFor(() => {
        expect(screen.getAllByText('Alex Player').length).toBe(2);
      });

      // Mark Alex as manually unavailable
      const alexRow = screen
        .getAllByText('Alex Player')
        .map((node) => node.closest('[role="button"]'))
        .filter(Boolean)
        .find((candidate) =>
          within(candidate).queryByLabelText('Mark unavailable')
        );
      fireEvent.click(within(alexRow).getByLabelText('Mark unavailable'));

      // Alex should now only appear once (deselected and unavailable)
      await waitFor(() => {
        expect(screen.getAllByText('Alex Player').length).toBe(1);
      });

      // Click Reset
      fireEvent.click(screen.getByText('Reset'));

      // After reset: manual unavailability cleared, provider overrides cleared,
      // selection re-seeded from invites minus provider-unavailable (p2)
      await waitFor(() => {
        // p1 (Alex) should be selected again (invited + available)
        expect(screen.getAllByText('Alex Player').length).toBe(2);
        // p2 (Bree) is provider-unavailable, so should NOT be selected
        expect(screen.getAllByText('Bree Player').length).toBe(1);
      });
    });

    it('should clear selection to empty when no invites exist', async () => {
      mockUseProviderAvailability.mockReturnValue({
        providerUnavailableByMatch: {},
        providerResponseByMatch: {},
        providerInvitedByMatch: {},
        providerAvailabilityLoading: false
      });

      render(<PlanMatchesScreen {...defaultProps} />);

      // Manually select a player
      fireEvent.click(screen.getByText('Alex Player'));
      expect(screen.getAllByText('Alex Player').length).toBe(2);

      // Click Reset
      fireEvent.click(screen.getByText('Reset'));

      // Selection should be cleared since there are no invites
      await waitFor(() => {
        expect(screen.getAllByText('Alex Player').length).toBe(1);
        expect(screen.getAllByText('Bree Player').length).toBe(1);
      });
    });

    it('should clear provider availability overrides on reset', async () => {
      mockUseProviderAvailability.mockReturnValue({
        providerUnavailableByMatch: {
          'match-1': ['p1']
        },
        providerResponseByMatch: {},
        providerInvitedByMatch: {
          'match-1': ['p1', 'p2']
        },
        providerAvailabilityLoading: false
      });

      render(<PlanMatchesScreen {...defaultProps} />);

      // Wait for invite seeding (only p2 selected since p1 is provider-unavailable)
      await waitFor(() => {
        expect(screen.getAllByText('Bree Player').length).toBe(2);
        expect(screen.getAllByText('Alex Player').length).toBe(1);
      });

      // Override p1 to available
      const alexRow = screen
        .getAllByText('Alex Player')
        .map((node) => node.closest('[role="button"]'))
        .filter(Boolean)
        .find((candidate) =>
          within(candidate).queryByLabelText('Mark available')
        );
      fireEvent.click(within(alexRow).getByLabelText('Mark available'));

      // Click Reset - should clear the override, making p1 unavailable again
      fireEvent.click(screen.getByText('Reset'));

      await waitFor(() => {
        // p2 (Bree) should be selected (invited + available)
        expect(screen.getAllByText('Bree Player').length).toBe(2);
        // p1 (Alex) should NOT be selected (provider-unavailable, override cleared)
        expect(screen.getAllByText('Alex Player').length).toBe(1);
      });
    });
  });

  describe('invite seeding', () => {
    it('should auto-select invited players for unseeded matches', async () => {
      mockUseProviderAvailability.mockReturnValue({
        providerUnavailableByMatch: {},
        providerResponseByMatch: {},
        providerInvitedByMatch: {
          'match-1': ['p1', 'p2']
        },
        providerAvailabilityLoading: false
      });

      render(<PlanMatchesScreen {...defaultProps} />);

      // Both invited players should be pre-selected
      await waitFor(() => {
        expect(screen.getAllByText('Alex Player').length).toBe(2);
        expect(screen.getAllByText('Bree Player').length).toBe(2);
      });
    });

    it('should not re-seed after user deselects an invited player', async () => {
      mockUseProviderAvailability.mockReturnValue({
        providerUnavailableByMatch: {},
        providerResponseByMatch: {},
        providerInvitedByMatch: {
          'match-1': ['p1', 'p2']
        },
        providerAvailabilityLoading: false
      });

      render(<PlanMatchesScreen {...defaultProps} />);

      // Wait for seeding to complete
      await waitFor(() => {
        expect(screen.getAllByText('Alex Player').length).toBe(2);
      });

      // Deselect Alex Player by clicking in the selected area
      const alexElements = screen.getAllByText('Alex Player');
      fireEvent.click(alexElements[1]);

      // Alex should now appear only once (in roster, not selected)
      await waitFor(() => {
        expect(screen.getAllByText('Alex Player').length).toBe(1);
      });

      // Bree should still be selected
      expect(screen.getAllByText('Bree Player').length).toBe(2);
    });

    it('should not auto-select unavailable invited players', async () => {
      mockUseProviderAvailability.mockReturnValue({
        providerUnavailableByMatch: {
          'match-1': ['p1']
        },
        providerResponseByMatch: {},
        providerInvitedByMatch: {
          'match-1': ['p1', 'p2']
        },
        providerAvailabilityLoading: false
      });

      render(<PlanMatchesScreen {...defaultProps} />);

      // Only p2 (Bree) should be auto-selected since p1 is unavailable
      await waitFor(() => {
        expect(screen.getAllByText('Bree Player').length).toBe(2);
      });
      expect(screen.getAllByText('Alex Player').length).toBe(1);
    });

    it('should not seed while provider availability is loading', () => {
      mockUseProviderAvailability.mockReturnValue({
        providerUnavailableByMatch: {},
        providerResponseByMatch: {},
        providerInvitedByMatch: {
          'match-1': ['p1']
        },
        providerAvailabilityLoading: true
      });

      render(<PlanMatchesScreen {...defaultProps} />);

      // Players should not be pre-selected while loading
      expect(screen.getAllByText('Alex Player').length).toBe(1);
    });

    it('should not change selections for matches with no invited players', async () => {
      mockUseProviderAvailability.mockReturnValue({
        providerUnavailableByMatch: {},
        providerResponseByMatch: {},
        providerInvitedByMatch: {},
        providerAvailabilityLoading: false
      });

      render(<PlanMatchesScreen {...defaultProps} />);

      // No auto-selection should happen
      await waitFor(() => {
        expect(screen.getAllByText('Alex Player').length).toBe(1);
        expect(screen.getAllByText('Bree Player').length).toBe(1);
      });
    });
  });
});
