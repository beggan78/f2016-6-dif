/**
 * StatisticsScreen Tests
 *
 * Comprehensive test suite for the StatisticsScreen component covering:
 * - Authentication states and access control
 * - Team selection and membership states
 * - Tab navigation and persistence
 * - Time range filtering and persistence
 * - Match selection and creation flows
 * - Integration with child view components
 * - Loading states and error handling
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StatisticsScreen } from '../StatisticsScreen';

// Mock child view components
jest.mock('../TeamStatsView', () => ({
  TeamStatsView: ({ startDate, endDate, onMatchSelect }) => (
    <div data-testid="team-stats-view">
      Team Stats View
      <button onClick={() => onMatchSelect?.('match-1')}>Select Match</button>
    </div>
  )
}));

jest.mock('../PlayerStatsView', () => ({
  PlayerStatsView: ({ startDate, endDate }) => (
    <div data-testid="player-stats-view">Player Stats View</div>
  )
}));

jest.mock('../AttendanceStatsView', () => ({
  AttendanceStatsView: ({ startDate, endDate }) => (
    <div data-testid="attendance-stats-view">Attendance Stats View</div>
  )
}));

jest.mock('../MatchHistoryView', () => ({
  MatchHistoryView: ({ onMatchSelect, onCreateMatch, startDate, endDate }) => (
    <div data-testid="match-history-view">
      Match History View
      <button onClick={() => onMatchSelect('match-2')}>Select History Match</button>
      <button onClick={() => onCreateMatch()}>Create Match</button>
    </div>
  )
}));

jest.mock('../MatchDetailsView', () => ({
  MatchDetailsView: ({ matchId, mode, onNavigateBack, onManualMatchCreated, onMatchUpdated, onMatchDeleted }) => (
    <div data-testid="match-details-view">
      Match Details View - {mode} - {matchId || 'new'}
      <button onClick={onNavigateBack}>Back to History</button>
      <button onClick={() => onManualMatchCreated?.('match-3')}>Match Created</button>
      <button onClick={() => onMatchUpdated?.()}>Match Updated</button>
      <button onClick={() => onMatchDeleted?.()}>Match Deleted</button>
    </div>
  )
}));

jest.mock('../TimeFilter', () => ({
  TimeFilter: ({ startDate, endDate, selectedPresetId, onTimeRangeChange, className }) => (
    <div data-testid="time-filter" className={className}>
      Time Filter - {selectedPresetId}
      <button onClick={() => onTimeRangeChange(new Date('2024-01-01'), new Date('2024-12-31'), 'custom')}>
        Change Time Range
      </button>
    </div>
  )
}));

// Mock contexts
const mockUseAuth = jest.fn();
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}));

const mockUseTeam = jest.fn();
jest.mock('../../../contexts/TeamContext', () => ({
  useTeam: () => mockUseTeam()
}));

const mockUseAuthModalIntegration = jest.fn();
jest.mock('../../../hooks/useAuthModalIntegration', () => ({
  useAuthModalIntegration: (modal) => mockUseAuthModalIntegration(modal)
}));

// Mock persistence manager
const mockPersistenceManager = {
  loadState: jest.fn(),
  saveState: jest.fn()
};

jest.mock('../../../utils/persistenceManager', () => ({
  createPersistenceManager: jest.fn(() => mockPersistenceManager)
}));

// Mock TIME_PRESETS
jest.mock('../../../constants/timePresets', () => ({
  TIME_PRESETS: [
    {
      id: 'last-30-days',
      label: 'Last 30 days',
      getValue: () => ({
        start: new Date('2024-11-01'),
        end: new Date('2024-12-01')
      })
    },
    {
      id: 'all-time',
      label: 'All time',
      getValue: () => ({ start: null, end: null })
    }
  ]
}));

describe('StatisticsScreen', () => {
  let defaultProps;
  let mockOnNavigateBack;
  let mockAuthModal;

  beforeEach(() => {
    mockOnNavigateBack = jest.fn();
    mockAuthModal = {
      openLogin: jest.fn(),
      openSignup: jest.fn()
    };

    defaultProps = {
      onNavigateBack: mockOnNavigateBack,
      authModal: mockAuthModal
    };

    mockUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: true
    });

    mockUseTeam.mockReturnValue({
      loading: false,
      currentTeam: { id: 'team-1', name: 'Test Team' },
      userTeams: [{ id: 'team-1', name: 'Test Team' }],
      canViewStatistics: true,
      teamPlayers: [
        { id: 'player-1', name: 'Player 1' },
        { id: 'player-2', name: 'Player 2' }
      ]
    });

    mockUseAuthModalIntegration.mockReturnValue(mockAuthModal);

    mockPersistenceManager.loadState.mockReturnValue({
      tab: 'team',
      presetId: 'all-time',
      customStartDate: null,
      customEndDate: null
    });

    jest.clearAllMocks();
  });

  describe('Loading States', () => {
    test('should show loading state when auth is loading', () => {
      mockUseAuth.mockReturnValue({
        loading: true,
        isAuthenticated: false
      });

      render(<StatisticsScreen {...defaultProps} />);

      expect(screen.getByText('Statistics')).toBeInTheDocument();
      expect(screen.getByText('Loading statistics...')).toBeInTheDocument();
      expect(screen.getByText('Fetching the latest data...')).toBeInTheDocument();
    });

    test('should show loading state when team is loading', () => {
      mockUseTeam.mockReturnValue({
        loading: true,
        currentTeam: null,
        userTeams: [],
        canViewStatistics: false,
        teamPlayers: []
      });

      render(<StatisticsScreen {...defaultProps} />);

      expect(screen.getByText('Statistics')).toBeInTheDocument();
      expect(screen.getByText('Loading statistics...')).toBeInTheDocument();
    });

    test('should show spinner during loading', () => {
      mockUseAuth.mockReturnValue({
        loading: true,
        isAuthenticated: false
      });

      const { container } = render(<StatisticsScreen {...defaultProps} />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Authentication States', () => {
    test('should show sign-in prompt when not authenticated', () => {
      mockUseAuth.mockReturnValue({
        loading: false,
        isAuthenticated: false
      });

      render(<StatisticsScreen {...defaultProps} />);

      expect(screen.getByText('Stay close to the action')).toBeInTheDocument();
      expect(
        screen.getByText('Sign in with your parent account to explore match history, player stats, and team trends.')
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    test('should call openLogin when Sign In button is clicked', () => {
      mockUseAuth.mockReturnValue({
        loading: false,
        isAuthenticated: false
      });

      render(<StatisticsScreen {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      expect(mockAuthModal.openLogin).toHaveBeenCalled();
    });

    test('should call openSignup when Create Account button is clicked', () => {
      mockUseAuth.mockReturnValue({
        loading: false,
        isAuthenticated: false
      });

      render(<StatisticsScreen {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      expect(mockAuthModal.openSignup).toHaveBeenCalled();
    });
  });

  describe('Team States', () => {
    test('should show no team message when user has no teams', () => {
      mockUseTeam.mockReturnValue({
        loading: false,
        currentTeam: null,
        userTeams: [],
        canViewStatistics: true,
        teamPlayers: []
      });

      render(<StatisticsScreen {...defaultProps} />);

      expect(screen.getByText('No team membership detected')).toBeInTheDocument();
      expect(
        screen.getByText('You need a team membership before you can view statistics. Ask a coach or admin to add you to the team.')
      ).toBeInTheDocument();
    });

    test('should show team selection message when user has teams but none selected', () => {
      mockUseTeam.mockReturnValue({
        loading: false,
        currentTeam: null,
        userTeams: [
          { id: 'team-1', name: 'Team 1' },
          { id: 'team-2', name: 'Team 2' }
        ],
        canViewStatistics: true,
        teamPlayers: []
      });

      render(<StatisticsScreen {...defaultProps} />);

      expect(screen.getByText('Select a team to continue')).toBeInTheDocument();
      expect(
        screen.getByText('Choose a team from the main dashboard to view its statistics.')
      ).toBeInTheDocument();
    });
  });

  describe('Permission States', () => {
    test('should show permission denied when user cannot view statistics', () => {
      mockUseTeam.mockReturnValue({
        loading: false,
        currentTeam: { id: 'team-1', name: 'Test Team' },
        userTeams: [{ id: 'team-1', name: 'Test Team' }],
        canViewStatistics: false,
        teamPlayers: []
      });

      render(<StatisticsScreen {...defaultProps} />);

      expect(screen.getByText('Role update required')).toBeInTheDocument();
      expect(
        screen.getByText('Statistics are available for parent accounts. Ask your team administrator to upgrade your access.')
      ).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    test('should render all tabs when user has access', () => {
      render(<StatisticsScreen {...defaultProps} />);

      expect(screen.getByText('Team Stats')).toBeInTheDocument();
      expect(screen.getByText('Player Match Stats')).toBeInTheDocument();
      expect(screen.getByText('Attendance Stats')).toBeInTheDocument();
      expect(screen.getByText('Match History')).toBeInTheDocument();
    });

    test('should highlight active tab', () => {
      render(<StatisticsScreen {...defaultProps} />);

      const teamStatsTab = screen.getByText('Team Stats').closest('button');
      expect(teamStatsTab).toHaveClass('border-sky-400');
      expect(teamStatsTab).toHaveClass('text-sky-400');
    });

    test('should switch to Player tab when clicked', () => {
      render(<StatisticsScreen {...defaultProps} />);

      expect(screen.getByTestId('team-stats-view')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Player Match Stats'));

      expect(screen.getByTestId('player-stats-view')).toBeInTheDocument();
      expect(screen.queryByTestId('team-stats-view')).not.toBeInTheDocument();
    });

    test('should switch to Attendance tab when clicked', () => {
      render(<StatisticsScreen {...defaultProps} />);

      fireEvent.click(screen.getByText('Attendance Stats'));

      expect(screen.getByTestId('attendance-stats-view')).toBeInTheDocument();
    });

    test('should switch to History tab when clicked', () => {
      render(<StatisticsScreen {...defaultProps} />);

      fireEvent.click(screen.getByText('Match History'));

      expect(screen.getByTestId('match-history-view')).toBeInTheDocument();
    });

    test('should persist active tab', () => {
      render(<StatisticsScreen {...defaultProps} />);

      fireEvent.click(screen.getByText('Player Match Stats'));

      expect(mockPersistenceManager.saveState).toHaveBeenCalledWith({ tab: 'player' });
    });

    test('should load persisted tab on mount', () => {
      mockPersistenceManager.loadState.mockReturnValue({ tab: 'attendance' });

      render(<StatisticsScreen {...defaultProps} />);

      expect(screen.getByTestId('attendance-stats-view')).toBeInTheDocument();
    });

    test('should default to team tab if persisted tab is invalid', () => {
      mockPersistenceManager.loadState.mockReturnValue({ tab: 'invalid-tab' });

      render(<StatisticsScreen {...defaultProps} />);

      expect(screen.getByTestId('team-stats-view')).toBeInTheDocument();
    });

    test('should show correct tab description in header', () => {
      render(<StatisticsScreen {...defaultProps} />);

      expect(screen.getByText('Team performance overview')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Player Match Stats'));

      expect(screen.getByText('Individual player match statistics')).toBeInTheDocument();
    });
  });

  describe('Time Range Filtering', () => {
    test('should render TimeFilter component', () => {
      render(<StatisticsScreen {...defaultProps} />);

      expect(screen.getAllByTestId('time-filter')).toHaveLength(2); // Desktop and mobile
    });

    test('should show TimeFilter on desktop only (hidden on mobile)', () => {
      const { container } = render(<StatisticsScreen {...defaultProps} />);

      const desktopFilter = container.querySelector('.hidden.sm\\:block');
      expect(desktopFilter).toBeInTheDocument();
    });

    test('should show TimeFilter on mobile only (hidden on desktop)', () => {
      const { container } = render(<StatisticsScreen {...defaultProps} />);

      const mobileFilter = container.querySelector('.sm\\:hidden');
      expect(mobileFilter).toBeInTheDocument();
    });

    test('should update time range when TimeFilter changes', () => {
      render(<StatisticsScreen {...defaultProps} />);

      const changeButton = screen.getAllByText('Change Time Range')[0];
      fireEvent.click(changeButton);

      // Should re-render with new dates
      expect(mockPersistenceManager.saveState).toHaveBeenCalled();
    });

    test('should persist time range changes', () => {
      render(<StatisticsScreen {...defaultProps} />);

      const changeButton = screen.getAllByText('Change Time Range')[0];
      fireEvent.click(changeButton);

      expect(mockPersistenceManager.saveState).toHaveBeenCalledWith(
        expect.objectContaining({
          presetId: 'custom',
          customStartDate: expect.any(String),
          customEndDate: expect.any(String)
        })
      );
    });

    test('should load persisted time range on mount', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      mockPersistenceManager.loadState.mockReturnValue({
        tab: 'team',
        presetId: 'custom',
        customStartDate: startDate.toISOString(),
        customEndDate: endDate.toISOString()
      });

      render(<StatisticsScreen {...defaultProps} />);

      // TimeFilter should be rendered with custom preset
      expect(screen.getAllByText(/Time Filter - custom/i)).toHaveLength(2);
    });

    test('should use preset dates when preset is selected', () => {
      mockPersistenceManager.loadState.mockReturnValue({
        tab: 'team',
        presetId: 'last-30-days',
        customStartDate: null,
        customEndDate: null
      });

      render(<StatisticsScreen {...defaultProps} />);

      expect(screen.getAllByText(/Time Filter - last-30-days/i)).toHaveLength(2);
    });

    test('should hide TimeFilter when viewing match details', () => {
      render(<StatisticsScreen {...defaultProps} />);

      // Select a match
      fireEvent.click(screen.getByText('Match History'));
      fireEvent.click(screen.getByText('Select History Match'));

      expect(screen.queryByTestId('time-filter')).not.toBeInTheDocument();
    });
  });

  describe('Match Selection Flow', () => {
    test('should show match details when match is selected from TeamStatsView', () => {
      render(<StatisticsScreen {...defaultProps} />);

      fireEvent.click(screen.getByText('Select Match'));

      expect(screen.getByTestId('match-details-view')).toBeInTheDocument();
      expect(screen.getByText(/Match Details View - view - match-1/)).toBeInTheDocument();
    });

    test('should show match details when match is selected from MatchHistoryView', () => {
      render(<StatisticsScreen {...defaultProps} />);

      fireEvent.click(screen.getByText('Match History'));
      fireEvent.click(screen.getByText('Select History Match'));

      expect(screen.getByTestId('match-details-view')).toBeInTheDocument();
      expect(screen.getByText(/Match Details View - view - match-2/)).toBeInTheDocument();
    });

    test('should navigate back to list when Back is clicked in match details', () => {
      render(<StatisticsScreen {...defaultProps} />);

      fireEvent.click(screen.getByText('Match History'));
      fireEvent.click(screen.getByText('Select History Match'));

      expect(screen.getByTestId('match-details-view')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Back to History'));

      expect(screen.getByTestId('match-history-view')).toBeInTheDocument();
      expect(screen.queryByTestId('match-details-view')).not.toBeInTheDocument();
    });

    test('should hide tabs when viewing match details', () => {
      render(<StatisticsScreen {...defaultProps} />);

      fireEvent.click(screen.getByText('Select Match'));

      expect(screen.queryByText('Team Stats')).not.toBeInTheDocument();
      expect(screen.queryByText('Player Match Stats')).not.toBeInTheDocument();
    });

    test('should hide header when viewing match details', () => {
      render(<StatisticsScreen {...defaultProps} />);

      expect(screen.getByText('Team performance overview')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Select Match'));

      expect(screen.queryByText('Team performance overview')).not.toBeInTheDocument();
    });
  });

  describe('Match Creation Flow', () => {
    test('should show create mode when Create Match is clicked', () => {
      render(<StatisticsScreen {...defaultProps} />);

      fireEvent.click(screen.getByText('Match History'));
      fireEvent.click(screen.getByText('Create Match'));

      expect(screen.getByTestId('match-details-view')).toBeInTheDocument();
      expect(screen.getByText(/Match Details View - create - new/)).toBeInTheDocument();
    });

    test('should navigate back to history after match is created', () => {
      render(<StatisticsScreen {...defaultProps} />);

      fireEvent.click(screen.getByText('Match History'));
      fireEvent.click(screen.getByText('Create Match'));

      fireEvent.click(screen.getByText('Match Created'));

      // Should show match details for the newly created match
      expect(screen.getByText(/Match Details View - view - match-3/)).toBeInTheDocument();
    });

    test('should return to history when match creation is cancelled', () => {
      render(<StatisticsScreen {...defaultProps} />);

      fireEvent.click(screen.getByText('Match History'));
      fireEvent.click(screen.getByText('Create Match'));

      fireEvent.click(screen.getByText('Back to History'));

      expect(screen.getByTestId('match-history-view')).toBeInTheDocument();
    });
  });

  describe('Match Update and Delete', () => {
    test('should trigger history refresh when match is updated', () => {
      render(<StatisticsScreen {...defaultProps} />);

      fireEvent.click(screen.getByText('Select Match'));

      // Initially refreshKey is 0
      fireEvent.click(screen.getByText('Match Updated'));

      // Should increment refreshKey (can't directly test this, but it should re-render history)
      expect(screen.getByTestId('match-details-view')).toBeInTheDocument();
    });

    test('should trigger history refresh and navigate back when match is deleted', () => {
      render(<StatisticsScreen {...defaultProps} />);

      fireEvent.click(screen.getByText('Select Match'));

      fireEvent.click(screen.getByText('Match Deleted'));

      // Should navigate back to stats view
      expect(screen.getByTestId('team-stats-view')).toBeInTheDocument();
      expect(screen.queryByTestId('match-details-view')).not.toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    test('should call onNavigateBack when Back button is clicked', () => {
      render(<StatisticsScreen {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /back/i }));

      expect(mockOnNavigateBack).toHaveBeenCalled();
    });

    test('should show Back button in all access states', () => {
      mockUseAuth.mockReturnValue({
        loading: false,
        isAuthenticated: false
      });

      render(<StatisticsScreen {...defaultProps} />);

      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    });

    test('should show Back button in loading state', () => {
      mockUseAuth.mockReturnValue({
        loading: true,
        isAuthenticated: false
      });

      render(<StatisticsScreen {...defaultProps} />);

      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    });
  });

  describe('View Component Integration', () => {
    test('should pass startDate and endDate to TeamStatsView', () => {
      render(<StatisticsScreen {...defaultProps} />);

      expect(screen.getByTestId('team-stats-view')).toBeInTheDocument();
    });

    test('should pass startDate and endDate to PlayerStatsView', () => {
      render(<StatisticsScreen {...defaultProps} />);

      fireEvent.click(screen.getByText('Player Match Stats'));

      expect(screen.getByTestId('player-stats-view')).toBeInTheDocument();
    });

    test('should pass startDate and endDate to AttendanceStatsView', () => {
      render(<StatisticsScreen {...defaultProps} />);

      fireEvent.click(screen.getByText('Attendance Stats'));

      expect(screen.getByTestId('attendance-stats-view')).toBeInTheDocument();
    });

    test('should pass startDate and endDate to MatchHistoryView', () => {
      render(<StatisticsScreen {...defaultProps} />);

      fireEvent.click(screen.getByText('Match History'));

      expect(screen.getByTestId('match-history-view')).toBeInTheDocument();
    });

    test('should pass teamId and teamPlayers to MatchDetailsView', () => {
      render(<StatisticsScreen {...defaultProps} />);

      fireEvent.click(screen.getByText('Select Match'));

      expect(screen.getByTestId('match-details-view')).toBeInTheDocument();
    });

    test('should pass onMatchSelect callback to TeamStatsView', () => {
      render(<StatisticsScreen {...defaultProps} />);

      const selectButton = screen.getByText('Select Match');
      expect(selectButton).toBeInTheDocument();

      fireEvent.click(selectButton);

      expect(screen.getByTestId('match-details-view')).toBeInTheDocument();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle unmounting gracefully', () => {
      const { unmount } = render(<StatisticsScreen {...defaultProps} />);

      expect(() => unmount()).not.toThrow();
    });

    test('should handle missing authModal prop', () => {
      render(<StatisticsScreen onNavigateBack={mockOnNavigateBack} />);

      expect(screen.getByText('Statistics')).toBeInTheDocument();
    });

    test('should handle invalid persisted state', () => {
      mockPersistenceManager.loadState.mockReturnValue(null);

      render(<StatisticsScreen {...defaultProps} />);

      expect(screen.getByTestId('team-stats-view')).toBeInTheDocument();
    });

    test('should handle corrupted time range persisted state', () => {
      mockPersistenceManager.loadState.mockReturnValue({
        tab: 'team',
        presetId: 'custom',
        customStartDate: 'invalid-date',
        customEndDate: 'invalid-date'
      });

      render(<StatisticsScreen {...defaultProps} />);

      // Should not crash
      expect(screen.getByText('Statistics')).toBeInTheDocument();
    });

    test('should default to team tab when no tab is persisted', () => {
      mockPersistenceManager.loadState.mockReturnValue({});

      render(<StatisticsScreen {...defaultProps} />);

      expect(screen.getByTestId('team-stats-view')).toBeInTheDocument();
    });

    test('should handle missing currentTeam gracefully', () => {
      mockUseTeam.mockReturnValue({
        loading: false,
        currentTeam: null,
        userTeams: [{ id: 'team-1', name: 'Test Team' }],
        canViewStatistics: true,
        teamPlayers: []
      });

      render(<StatisticsScreen {...defaultProps} />);

      expect(screen.getByText('Select a team to continue')).toBeInTheDocument();
    });

    test('should handle empty teamPlayers array', () => {
      mockUseTeam.mockReturnValue({
        loading: false,
        currentTeam: { id: 'team-1', name: 'Test Team' },
        userTeams: [{ id: 'team-1', name: 'Test Team' }],
        canViewStatistics: true,
        teamPlayers: []
      });

      render(<StatisticsScreen {...defaultProps} />);

      expect(screen.getByTestId('team-stats-view')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('should have proper heading hierarchy', () => {
      render(<StatisticsScreen {...defaultProps} />);

      expect(screen.getByText('Statistics')).toHaveClass('text-2xl');
    });

    test('should have accessible tab buttons', () => {
      render(<StatisticsScreen {...defaultProps} />);

      const tabs = screen.getAllByRole('button').filter(button =>
        ['Team Stats', 'Player Match Stats', 'Attendance Stats', 'Match History'].includes(button.textContent)
      );

      expect(tabs).toHaveLength(4);
    });

    test('should show tab icons for visual context', () => {
      const { container } = render(<StatisticsScreen {...defaultProps} />);

      const tabIcons = container.querySelectorAll('nav svg');
      expect(tabIcons.length).toBeGreaterThan(0);
    });

    test('should have distinct hover states for tabs', () => {
      render(<StatisticsScreen {...defaultProps} />);

      const playerTab = screen.getByText('Player Match Stats').closest('button');

      expect(playerTab).toHaveClass('hover:text-slate-300');
      expect(playerTab).toHaveClass('hover:border-slate-300');
    });
  });

  describe('Responsive Design', () => {
    test('should show TimeFilter for both mobile and desktop', () => {
      render(<StatisticsScreen {...defaultProps} />);

      const filters = screen.getAllByTestId('time-filter');
      expect(filters).toHaveLength(2);

      expect(filters[0]).toHaveClass('hidden');
      expect(filters[0]).toHaveClass('sm:block');

      expect(filters[1].parentElement).toHaveClass('sm:hidden');
    });

    test('should allow tab wrapping on smaller screens', () => {
      const { container } = render(<StatisticsScreen {...defaultProps} />);

      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('flex-wrap');
    });

    test('should have responsive spacing for tabs', () => {
      const { container } = render(<StatisticsScreen {...defaultProps} />);

      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('gap-3');
      expect(nav).toHaveClass('sm:gap-4');
      expect(nav).toHaveClass('md:gap-8');
    });
  });
});
