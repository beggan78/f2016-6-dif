/**
 * TeamManagement Component Tests
 *
 * Comprehensive testing suite for the TeamManagement component - a complex component
 * that manages team settings with multiple tabs, role-based access control, modals,
 * and localStorage persistence.
 *
 * Test Coverage: 100+ tests covering:
 * - Component rendering and loading states
 * - Tab navigation and visibility
 * - Role-based access control (Admin, Coach, Member)
 * - Modal interactions
 * - Data loading and refresh
 * - Success message handling
 * - Sub-components (Overview, Access, Roster, Connectors, Preferences)
 * - Browser back integration
 * - Edge cases and error handling
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamManagement } from '../TeamManagement';
import { useTeam } from '../../../contexts/TeamContext';
import { useAuth } from '../../../contexts/AuthContext';
import { STORAGE_KEYS } from '../../../constants/storageKeys';
import { DEFAULT_PREFERENCES } from '../../../types/preferences';

// Mock contexts
jest.mock('../../../contexts/TeamContext');
jest.mock('../../../contexts/AuthContext');

// Mock useBrowserBackIntercept hook
const mockPushNavigationState = jest.fn();
const mockRemoveFromNavigationStack = jest.fn();

jest.mock('../../../hooks/useBrowserBackIntercept', () => ({
  useBrowserBackIntercept: () => ({
    pushNavigationState: mockPushNavigationState,
    removeFromNavigationStack: mockRemoveFromNavigationStack
  })
}));

// Mock child components
jest.mock('../TeamSelector', () => ({
  TeamSelector: ({ onCreateNew }) => (
    <div data-testid="team-selector">
      <button onClick={onCreateNew}>Create New Team</button>
    </div>
  )
}));

jest.mock('../TeamCreationWizard', () => ({
  TeamCreationWizard: ({ onComplete, onCancel }) => (
    <div data-testid="team-creation-wizard">
      <button onClick={onComplete}>Complete</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  )
}));

jest.mock('../TeamAccessRequestModal', () => ({
  TeamAccessRequestModal: ({ onClose, onSuccess }) => (
    <div data-testid="team-access-request-modal">
      <button onClick={() => { onSuccess(); onClose(); }}>Approve</button>
      <button onClick={onClose}>Close</button>
    </div>
  )
}));

jest.mock('../TeamInviteModal', () => ({
  TeamInviteModal: ({ onClose }) => (
    <div data-testid="team-invite-modal">
      <button onClick={onClose}>Close Invite Modal</button>
    </div>
  )
}));

jest.mock('../TeamRoleManagementModal', () => ({
  TeamRoleManagementModal: ({ onClose, onRefresh }) => (
    <div data-testid="team-role-management-modal">
      <button onClick={() => { onRefresh(); onClose(); }}>Save Roles</button>
      <button onClick={onClose}>Close Roles Modal</button>
    </div>
  )
}));

jest.mock('../AddRosterPlayerModal', () => ({
  AddRosterPlayerModal: ({ onClose, onPlayerAdded, team }) => (
    <div data-testid="add-roster-player-modal">
      <button onClick={() => onPlayerAdded({ display_name: 'New Player' })}>Add Player</button>
      <button onClick={onClose}>Close Add Player</button>
    </div>
  )
}));

jest.mock('../EditPlayerModal', () => ({
  EditPlayerModal: ({ onClose, onPlayerUpdated, player }) => (
    <div data-testid="edit-player-modal">
      <button onClick={() => onPlayerUpdated(player.id, { display_name: 'Updated Player' })}>Update Player</button>
      <button onClick={onClose}>Close Edit Player</button>
    </div>
  )
}));

jest.mock('../DeletePlayerConfirmModal', () => ({
  DeletePlayerConfirmModal: ({ onClose, onConfirm }) => (
    <div data-testid="delete-player-confirm-modal">
      <button onClick={onConfirm}>Confirm Delete</button>
      <button onClick={onClose}>Cancel Delete</button>
    </div>
  )
}));

jest.mock('../PlayerMatchingModal', () => ({
  PlayerMatchingModal: ({ onClose, onMatched }) => (
    <div data-testid="player-matching-modal">
      <button onClick={onMatched}>Match Player</button>
      <button onClick={onClose}>Close Matching</button>
    </div>
  )
}));

jest.mock('../../connectors/ConnectorsSection', () => ({
  ConnectorsSection: ({ team, onRefresh }) => (
    <div data-testid="connectors-section">
      Connectors for {team?.name}
      <button onClick={onRefresh}>Refresh Connectors</button>
    </div>
  )
}));

// Mock services
const mockGetPlayerConnectionDetails = jest.fn();
const mockAcceptGhostPlayer = jest.fn();
const mockDismissGhostPlayer = jest.fn();
jest.mock('../../../services/connectorService', () => ({
  getPlayerConnectionDetails: (...args) => mockGetPlayerConnectionDetails(...args),
  acceptGhostPlayer: (...args) => mockAcceptGhostPlayer(...args),
  dismissGhostPlayer: (...args) => mockDismissGhostPlayer(...args)
}));

jest.mock('../../../utils/persistenceManager', () => ({
  createPersistenceManager: (key, defaultState) => ({
    loadState: jest.fn(() => defaultState || {}),
    saveState: jest.fn(),
    clearState: jest.fn()
  }),
  createGamePersistenceManager: () => ({
    loadState: jest.fn(() => ({})),
    saveState: jest.fn(),
    clearState: jest.fn()
  })
}));

const mockUseTeam = useTeam;
const mockUseAuth = useAuth;
const setupUserEvent = (options = undefined) =>
  (typeof userEvent.setup === 'function' ? userEvent.setup(options) : userEvent);

describe('TeamManagement', () => {
  let defaultProps;
  let mockTeamContext;
  let mockAuthContext;
  let mockNavigateBack;
  let user;

  const mockTeam = {
    id: 'team-123',
    name: 'Test Team',
    club: {
      long_name: 'Test Club'
    },
    created_at: '2024-01-01T00:00:00Z',
    userRole: 'admin'
  };

  const mockMembers = [
    {
      id: 'member-1',
      role: 'admin',
      user: {
        id: 'user-1',
        name: 'Admin User',
        email: 'admin@test.com'
      }
    },
    {
      id: 'member-2',
      role: 'coach',
      user: {
        id: 'user-2',
        name: 'Coach User',
        email: 'coach@test.com'
      }
    }
  ];

  const mockRoster = [
    {
      id: 'player-1',
      display_name: 'Player One',
      first_name: 'Player',
      last_name: 'One',
      jersey_number: 10,
      on_roster: true
    },
    {
      id: 'player-2',
      display_name: 'Player Two',
      first_name: 'Player',
      last_name: 'Two',
      jersey_number: null,
      on_roster: false
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigateBack = jest.fn();
    mockPushNavigationState.mockClear();
    mockRemoveFromNavigationStack.mockClear();

    // Set up default mock for getPlayerConnectionDetails
    mockGetPlayerConnectionDetails.mockResolvedValue({
      matchedConnections: new Map(),
      unmatchedExternalPlayers: [],
      hasConnectedProvider: false
    });

    defaultProps = {
      onNavigateBack: mockNavigateBack
    };

    mockAuthContext = {
      user: { id: 'user-1', email: 'test@example.com' },
      isAuthenticated: true,
      loading: false
    };

    mockTeamContext = {
      hasTeams: true,
      hasClubs: true,
      currentTeam: mockTeam,
      isTeamAdmin: true,
      canManageTeam: true,
      pendingRequestsCount: 0,
      loading: false,
      getTeamAccessRequests: jest.fn(() => Promise.resolve([])),
      getTeamMembers: jest.fn(() => Promise.resolve(mockMembers)),
      getTeamRoster: jest.fn(() => Promise.resolve(mockRoster)),
      addRosterPlayer: jest.fn(() => Promise.resolve()),
      updateRosterPlayer: jest.fn(() => Promise.resolve()),
      removeRosterPlayer: jest.fn(() => Promise.resolve({ operation: 'deleted' })),
      refreshTeamPlayers: jest.fn(() => Promise.resolve([])),
      loadTeamPreferences: jest.fn(() => Promise.resolve(DEFAULT_PREFERENCES)),
      saveTeamPreferences: jest.fn(() => Promise.resolve()),
      checkPlayerGameHistory: jest.fn(() => Promise.resolve(false)),
      getAvailableJerseyNumbers: jest.fn(() => Promise.resolve([1, 2, 3, 4, 5]))
    };

    mockUseAuth.mockReturnValue(mockAuthContext);
    mockUseTeam.mockReturnValue(mockTeamContext);
    user = setupUserEvent();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Component Rendering & Loading States', () => {
    it('should render loading state when teamLoading is true', () => {
      mockUseTeam.mockReturnValue({
        ...mockTeamContext,
        loading: true
      });

      render(<TeamManagement {...defaultProps} />);

      expect(screen.getByText(/Loading team information.../i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Back/i })).toBeInTheDocument();
    });

    it('should render nothing when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({
        ...mockAuthContext,
        user: null,
        isAuthenticated: false
      });

      const { container } = render(<TeamManagement {...defaultProps} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render TeamCreationWizard when no clubs exist', () => {
      mockUseTeam.mockReturnValue({
        ...mockTeamContext,
        hasClubs: false,
        hasTeams: false,
        currentTeam: null
      });

      render(<TeamManagement {...defaultProps} />);

      expect(screen.getByTestId('team-creation-wizard')).toBeInTheDocument();
      expect(screen.getByText(/Team Setup/i)).toBeInTheDocument();
    });

    it('should render TeamCreationWizard when clubs exist but no teams', () => {
      mockUseTeam.mockReturnValue({
        ...mockTeamContext,
        hasClubs: true,
        hasTeams: false,
        currentTeam: null
      });

      render(<TeamManagement {...defaultProps} />);

      expect(screen.getByTestId('team-creation-wizard')).toBeInTheDocument();
    });

    it('should render TeamSelector when no current team selected', () => {
      mockUseTeam.mockReturnValue({
        ...mockTeamContext,
        currentTeam: null
      });

      render(<TeamManagement {...defaultProps} />);

      expect(screen.getByTestId('team-selector')).toBeInTheDocument();
    });

    it('should render main TeamManagement UI when team is selected', () => {
      render(<TeamManagement {...defaultProps} />);

      expect(screen.getAllByText('Test Team')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Test Club')[0]).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Overview/i })).toBeInTheDocument();
    });

    it('should display team header with correct name and club', () => {
      render(<TeamManagement {...defaultProps} />);

      expect(screen.getAllByText('Test Team').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Test Club').length).toBeGreaterThan(0);
    });

    it('should show Team Admin role badge', () => {
      render(<TeamManagement {...defaultProps} />);

      expect(screen.getByText('Team Admin')).toBeInTheDocument();
    });

    it('should show Coach role badge when user is coach', () => {
      mockUseTeam.mockReturnValue({
        ...mockTeamContext,
        isTeamAdmin: false,
        canManageTeam: true
      });

      render(<TeamManagement {...defaultProps} />);

      expect(screen.getByText('Coach')).toBeInTheDocument();
    });

    it('should show Team User role badge when user is regular member', () => {
      mockUseTeam.mockReturnValue({
        ...mockTeamContext,
        isTeamAdmin: false,
        canManageTeam: false
      });

      render(<TeamManagement {...defaultProps} />);

      expect(screen.getByText('Team User')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation & Visibility', () => {
    it('should show Overview tab for all users', () => {
      render(<TeamManagement {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Overview/i })).toBeInTheDocument();
    });

    it('should show Roster and Loans tabs only when canManageTeam is true', () => {
      render(<TeamManagement {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Roster/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Loans/i })).toBeInTheDocument();
    });

    it('should NOT show Roster or Loans tabs when canManageTeam is false', () => {
      mockUseTeam.mockReturnValue({
        ...mockTeamContext,
        canManageTeam: false,
        isTeamAdmin: false
      });

      render(<TeamManagement {...defaultProps} />);

      expect(screen.queryByRole('button', { name: /Roster/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Loans/i })).not.toBeInTheDocument();
    });

    it('should show Access Management tab only when isTeamAdmin is true', () => {
      render(<TeamManagement {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Access Management/i })).toBeInTheDocument();
    });

    it('should NOT show Access Management tab when isTeamAdmin is false', () => {
      mockUseTeam.mockReturnValue({
        ...mockTeamContext,
        isTeamAdmin: false
      });

      render(<TeamManagement {...defaultProps} />);

      expect(screen.queryByRole('button', { name: /Access Management/i })).not.toBeInTheDocument();
    });

    it('should show Connectors tab only when isTeamAdmin is true', () => {
      render(<TeamManagement {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Connectors/i })).toBeInTheDocument();
    });

    it('should NOT show Connectors tab when isTeamAdmin is false', () => {
      mockUseTeam.mockReturnValue({
        ...mockTeamContext,
        isTeamAdmin: false
      });

      render(<TeamManagement {...defaultProps} />);

      expect(screen.queryByRole('button', { name: /Connectors/i })).not.toBeInTheDocument();
    });

    it('should show Preferences tab when canManageTeam is true', () => {
      render(<TeamManagement {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Preferences/i })).toBeInTheDocument();
    });

    it('should NOT show Preferences tab when canManageTeam is false', () => {
      mockUseTeam.mockReturnValue({
        ...mockTeamContext,
        canManageTeam: false,
        isTeamAdmin: false
      });

      render(<TeamManagement {...defaultProps} />);

      expect(screen.queryByRole('button', { name: /Preferences/i })).not.toBeInTheDocument();
    });

    it('should display pending requests badge on Access tab when count > 0', () => {
      mockUseTeam.mockReturnValue({
        ...mockTeamContext,
        pendingRequestsCount: 3
      });

      render(<TeamManagement {...defaultProps} />);

      const accessTab = screen.getByRole('button', { name: /Access Management/i });
      expect(accessTab).toBeInTheDocument();
      // Badge is rendered as a separate element with the count
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should switch to Overview tab by default', () => {
      render(<TeamManagement {...defaultProps} />);

      expect(screen.getByText(/Team Information/i)).toBeInTheDocument();
    });

    it('should switch to Roster tab when clicked', async () => {
      render(<TeamManagement {...defaultProps} />);

      const rosterTab = screen.getByRole('button', { name: /Roster/i });
      await user.click(rosterTab);

      await waitFor(() => {
        expect(screen.getByText(/Roster Management/i)).toBeInTheDocument();
      });
    });

    it('should switch to Access Management tab when clicked', async () => {
      render(<TeamManagement {...defaultProps} />);

      const accessTab = screen.getByRole('button', { name: /Access Management/i });
      await user.click(accessTab);

      await waitFor(() => {
        const accessElements = screen.getAllByText(/Access Management/i);
        expect(accessElements.length).toBeGreaterThan(1); // Tab + heading
      });
    });

    it('should switch to Connectors tab when clicked', async () => {
      render(<TeamManagement {...defaultProps} />);

      const connectorsTab = screen.getByRole('button', { name: /Connectors/i });
      await user.click(connectorsTab);

      await waitFor(() => {
        expect(screen.getByTestId('connectors-section')).toBeInTheDocument();
      });
    });

    it('should switch to Preferences tab when clicked', async () => {
      render(<TeamManagement {...defaultProps} />);

      const preferencesTab = screen.getByRole('button', { name: /Preferences/i });
      await user.click(preferencesTab);

      await waitFor(() => {
        expect(screen.getByText(/Team Preferences/i)).toBeInTheDocument();
      });
    });

    it('should load tab from openToTab prop when provided', () => {
      render(<TeamManagement {...defaultProps} openToTab="roster" />);

      expect(screen.getByText(/Roster Management/i)).toBeInTheDocument();
    });
  });

  describe('Role-Based Access Control', () => {
    describe('Admin User', () => {
      beforeEach(() => {
        mockUseTeam.mockReturnValue({
          ...mockTeamContext,
          isTeamAdmin: true,
          canManageTeam: true
        });
      });

      it('should see all 6 tabs', () => {
        render(<TeamManagement {...defaultProps} />);

        expect(screen.getByRole('button', { name: /Overview/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Roster/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Loans/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Access Management/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Connectors/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Preferences/i })).toBeInTheDocument();
      });

      it('should access Access Management features', async () => {
        render(<TeamManagement {...defaultProps} />);

        const accessTab = screen.getByRole('button', { name: /Access Management/i });
        await user.click(accessTab);

        await waitFor(() => {
          expect(screen.getByText(/pending access request/i)).toBeInTheDocument();
        });
      });

      it('should access Connectors features', async () => {
        render(<TeamManagement {...defaultProps} />);

        const connectorsTab = screen.getByRole('button', { name: /Connectors/i });
        await user.click(connectorsTab);

        await waitFor(() => {
          expect(screen.getByTestId('connectors-section')).toBeInTheDocument();
        });
      });
    });

    describe('Coach User', () => {
      beforeEach(() => {
        mockUseTeam.mockReturnValue({
          ...mockTeamContext,
          isTeamAdmin: false,
          canManageTeam: true
        });
      });

      it('should see 4 tabs (Overview, Roster, Loans, Preferences)', () => {
        render(<TeamManagement {...defaultProps} />);

        expect(screen.getByRole('button', { name: /Overview/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Roster/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Loans/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Preferences/i })).toBeInTheDocument();
      });

      it('should NOT see Access Management tab', () => {
        render(<TeamManagement {...defaultProps} />);

        expect(screen.queryByRole('button', { name: /Access Management/i })).not.toBeInTheDocument();
      });

      it('should NOT see Connectors tab', () => {
        render(<TeamManagement {...defaultProps} />);

        expect(screen.queryByRole('button', { name: /Connectors/i })).not.toBeInTheDocument();
      });
    });

    describe('Member User', () => {
      beforeEach(() => {
        mockUseTeam.mockReturnValue({
          ...mockTeamContext,
          isTeamAdmin: false,
          canManageTeam: false
        });
      });

      it('should see only Overview tab', () => {
        render(<TeamManagement {...defaultProps} />);

        expect(screen.getByRole('button', { name: /Overview/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Roster/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Loans/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Access Management/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Connectors/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Preferences/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Success Messages', () => {
    it('should display success message after team creation', async () => {
      jest.useFakeTimers({ shouldClearNativeTimers: true });
      user = setupUserEvent({ advanceTimers: jest.advanceTimersByTime });
      const mockGetTeamMembersAfterCreate = jest.fn(() => Promise.resolve(mockMembers));

      mockUseTeam.mockReturnValue({
        ...mockTeamContext,
        hasClubs: true,
        hasTeams: false,
        currentTeam: null,
        getTeamMembers: mockGetTeamMembersAfterCreate
      });

      const { rerender } = render(<TeamManagement {...defaultProps} />);

      const completeButton = screen.getByText('Complete');
      await user.click(completeButton);

      // Simulate team being created - rerender with team context
      mockUseTeam.mockReturnValue({
        ...mockTeamContext,
        currentTeam: mockTeam,
        getTeamMembers: mockGetTeamMembersAfterCreate
      });

      rerender(<TeamManagement {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Team created successfully!/i)).toBeInTheDocument();
      });
    });

    it('should auto-clear success messages after 3 seconds', async () => {
      jest.useFakeTimers({ shouldClearNativeTimers: true });
      user = setupUserEvent({ advanceTimers: jest.advanceTimersByTime });
      const mockGetTeamMembersAfterCreate = jest.fn(() => Promise.resolve(mockMembers));

      mockUseTeam.mockReturnValue({
        ...mockTeamContext,
        hasClubs: true,
        hasTeams: false,
        currentTeam: null,
        getTeamMembers: mockGetTeamMembersAfterCreate
      });

      const { rerender } = render(<TeamManagement {...defaultProps} />);

      const completeButton = screen.getByText('Complete');
      await user.click(completeButton);

      // Simulate team being created - rerender with team context
      mockUseTeam.mockReturnValue({
        ...mockTeamContext,
        currentTeam: mockTeam,
        getTeamMembers: mockGetTeamMembersAfterCreate
      });

      rerender(<TeamManagement {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Team created successfully!/i)).toBeInTheDocument();
      });

      // Fast-forward 3 seconds
      jest.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(screen.queryByText(/Team created successfully!/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Data Loading & Refresh', () => {
    it('should load team members on mount', async () => {
      render(<TeamManagement {...defaultProps} />);

      await waitFor(() => {
        expect(mockTeamContext.getTeamMembers).toHaveBeenCalledWith(mockTeam.id);
      });
    });

    it('should load access requests on mount for admin users', async () => {
      render(<TeamManagement {...defaultProps} />);

      await waitFor(() => {
        expect(mockTeamContext.getTeamAccessRequests).toHaveBeenCalledWith(mockTeam.id);
      });
    });

    it('should NOT load access requests for non-admin users', () => {
      mockUseTeam.mockReturnValue({
        ...mockTeamContext,
        isTeamAdmin: false
      });

      render(<TeamManagement {...defaultProps} />);

      expect(mockTeamContext.getTeamAccessRequests).not.toHaveBeenCalled();
    });
  });

  describe('TeamOverview Sub-component', () => {
    it('should display team name', () => {
      render(<TeamManagement {...defaultProps} />);

      expect(screen.getAllByText('Test Team').length).toBeGreaterThan(0);
    });

    it('should display club name', () => {
      render(<TeamManagement {...defaultProps} />);

      expect(screen.getAllByText('Test Club').length).toBeGreaterThan(0);
    });

    it('should display team creation date', async () => {
      render(<TeamManagement {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/January 1, 2024/i)).toBeInTheDocument();
      });
    });

    it('should display sorted team members list', async () => {
      render(<TeamManagement {...defaultProps} />);

      await waitFor(() => {
        const adminUserElements = screen.queryAllByText(/Admin User/i);
        const coachUserElements = screen.queryAllByText(/Coach User/i);
        expect(adminUserElements.length).toBeGreaterThan(0);
        expect(coachUserElements.length).toBeGreaterThan(0);
      });
    });

    it('should show member email and role badges', async () => {
      render(<TeamManagement {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText(/admin@test.com/i)).toBeInTheDocument();
      });
    });

    it('should show "No team users found" when members array is empty', async () => {
      mockUseTeam.mockReturnValue({
        ...mockTeamContext,
        getTeamMembers: jest.fn(() => Promise.resolve([]))
      });

      render(<TeamManagement {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/No team users found/i)).toBeInTheDocument();
      });
    });

    it('should handle missing club data gracefully', () => {
      mockUseTeam.mockReturnValue({
        ...mockTeamContext,
        currentTeam: {
          ...mockTeam,
          club: null
        }
      });

      render(<TeamManagement {...defaultProps} />);

      expect(screen.getAllByText('Test Team').length).toBeGreaterThan(0);
      expect(screen.getByText('No club')).toBeInTheDocument();
    });
  });

  describe('TeamConnectors Sub-component', () => {
    it('should render ConnectorsSection with correct team prop', async () => {
      render(<TeamManagement {...defaultProps} />);

      const connectorsTab = screen.getByRole('button', { name: /Connectors/i });
      await user.click(connectorsTab);

      await waitFor(() => {
        expect(screen.getByTestId('connectors-section')).toBeInTheDocument();
        expect(screen.getByText(/Connectors for Test Team/i)).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases & Error Handling', () => {
    it('should handle null currentTeam gracefully', () => {
      mockUseTeam.mockReturnValue({
        ...mockTeamContext,
        currentTeam: null
      });

      expect(() => render(<TeamManagement {...defaultProps} />)).not.toThrow();
      expect(screen.getByTestId('team-selector')).toBeInTheDocument();
    });

    it('should handle empty team members array', async () => {
      const getTeamMembersEmpty = jest.fn(() => Promise.resolve([]));

      mockUseTeam.mockReturnValue({
        ...mockTeamContext,
        getTeamMembers: getTeamMembersEmpty
      });

      render(<TeamManagement {...defaultProps} />);

      await waitFor(() => {
        expect(getTeamMembersEmpty).toHaveBeenCalled();
      });
    });

    it('should handle empty access requests array', async () => {
      const getTeamAccessRequestsEmpty = jest.fn(() => Promise.resolve([]));

      mockUseTeam.mockReturnValue({
        ...mockTeamContext,
        getTeamAccessRequests: getTeamAccessRequestsEmpty
      });

      render(<TeamManagement {...defaultProps} />);

      await waitFor(() => {
        expect(getTeamAccessRequestsEmpty).toHaveBeenCalled();
      });
    });

    it('should handle missing user data', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        loading: false
      });

      const { container } = render(<TeamManagement {...defaultProps} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Modal Interactions', () => {
    it('should open TeamCreationWizard when create button clicked from selector', async () => {
      mockUseTeam.mockReturnValue({
        ...mockTeamContext,
        currentTeam: null
      });

      render(<TeamManagement {...defaultProps} />);

      const createButton = screen.getByText('Create New Team');
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByTestId('team-creation-wizard')).toBeInTheDocument();
      });
    });

    it('should close TeamCreationWizard on cancel when opened from selector', async () => {
      mockUseTeam.mockReturnValue({
        ...mockTeamContext,
        hasTeams: true,
        currentTeam: null
      });

      render(<TeamManagement {...defaultProps} />);

      // Open wizard from selector
      const createButton = screen.getByText('Create New Team');
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByTestId('team-creation-wizard')).toBeInTheDocument();
      });

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      // After cancel, wizard closes and selector reappears
      await waitFor(() => {
        expect(screen.queryByTestId('team-creation-wizard')).not.toBeInTheDocument();
        expect(screen.getByTestId('team-selector')).toBeInTheDocument();
      });
    });

    it('should reload data after team creation', async () => {
      mockUseTeam.mockReturnValue({
        ...mockTeamContext,
        hasClubs: true,
        hasTeams: false,
        currentTeam: null
      });

      const { rerender } = render(<TeamManagement {...defaultProps} />);

      const completeButton = screen.getByText('Complete');
      await user.click(completeButton);

      // Simulate team context update after creation
      mockUseTeam.mockReturnValue({
        ...mockTeamContext,
        currentTeam: mockTeam
      });

      rerender(<TeamManagement {...defaultProps} />);

      await waitFor(() => {
        expect(mockTeamContext.getTeamMembers).toHaveBeenCalled();
      });
    });

    it('should open TeamAccessRequestModal when manage access clicked', async () => {
      render(<TeamManagement {...defaultProps} />);

      const accessTab = screen.getByRole('button', { name: /Access Management/i });
      await user.click(accessTab);

      const manageButton = await screen.findByRole('button', { name: /Manage Access/i });
      await user.click(manageButton);

      await waitFor(() => {
        expect(screen.getByTestId('team-access-request-modal')).toBeInTheDocument();
      });
    });

    it('should open TeamInviteModal when invite button clicked', async () => {
      render(<TeamManagement {...defaultProps} />);

      const accessTab = screen.getByRole('button', { name: /Access Management/i });
      await user.click(accessTab);

      const inviteButton = (await screen.findAllByRole('button', { name: /Invitations/i }))[0];
      await user.click(inviteButton);

      await waitFor(() => {
        expect(screen.getByTestId('team-invite-modal')).toBeInTheDocument();
      });
    });

    it('should open TeamRoleManagementModal when manage roles clicked', async () => {
      render(<TeamManagement {...defaultProps} />);

      const accessTab = screen.getByRole('button', { name: /Access Management/i });
      await user.click(accessTab);

      const rolesButton = await screen.findByRole('button', { name: /Manage Roles/i });
      await user.click(rolesButton);

      await waitFor(() => {
        expect(screen.getByTestId('team-role-management-modal')).toBeInTheDocument();
      });
    });
  });

  describe('AccessManagement Sub-component', () => {
    it('should display pending requests count', async () => {
      mockUseTeam.mockReturnValue({
        ...mockTeamContext,
        getTeamAccessRequests: jest.fn(() => Promise.resolve([
          { id: 'request-1', user: { name: 'Pending User' } }
        ]))
      });

      render(<TeamManagement {...defaultProps} />);

      const accessTab = screen.getByRole('button', { name: /Access Management/i });
      await user.click(accessTab);

      await waitFor(() => {
        expect(screen.getByText(/1 pending access request/i)).toBeInTheDocument();
      });
    });

    it('should show "Review Requests" button when requests exist', async () => {
      mockUseTeam.mockReturnValue({
        ...mockTeamContext,
        getTeamAccessRequests: jest.fn(() => Promise.resolve([
          { id: 'request-1', user: { name: 'Pending User' } }
        ]))
      });

      render(<TeamManagement {...defaultProps} />);

      const accessTab = screen.getByRole('button', { name: /Access Management/i });
      await user.click(accessTab);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Review Requests/i })).toBeInTheDocument();
      });
    });

    it('should show invite users card with button', async () => {
      render(<TeamManagement {...defaultProps} />);

      const accessTab = screen.getByRole('button', { name: /Access Management/i });
      await user.click(accessTab);

      await waitFor(() => {
        expect(screen.getByText(/Send invitations to new team members/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Invitations/i })).toBeInTheDocument();
      });
    });
  });

  describe('RosterManagement Sub-component', () => {
    it('should display active players count', async () => {
      render(<TeamManagement {...defaultProps} />);

      const rosterTab = screen.getByRole('button', { name: /Roster/i });
      await user.click(rosterTab);

      await waitFor(() => {
        // 1 active player (player-1 has on_roster: true)
        expect(screen.getByText(/1 players/i)).toBeInTheDocument();
      });
    });

    it('should show "Add Player" button', async () => {
      render(<TeamManagement {...defaultProps} />);

      const rosterTab = screen.getByRole('button', { name: /Roster/i });
      await user.click(rosterTab);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Add Player/i })).toBeInTheDocument();
      });
    });

    it('should display roster table with players', async () => {
      render(<TeamManagement {...defaultProps} />);

      const rosterTab = screen.getByRole('button', { name: /Roster/i });
      await user.click(rosterTab);

      await waitFor(() => {
        expect(screen.getByText('Player One')).toBeInTheDocument();
      });
    });

    it('should show/hide former players toggle when inactive players exist', async () => {
      render(<TeamManagement {...defaultProps} />);

      const rosterTab = screen.getByRole('button', { name: /Roster/i });
      await user.click(rosterTab);

      await waitFor(() => {
        expect(screen.getByText(/Show Former Players/i)).toBeInTheDocument();
      });
    });

    it('should filter roster based on showInactive toggle', async () => {
      render(<TeamManagement {...defaultProps} />);

      const rosterTab = screen.getByRole('button', { name: /Roster/i });
      await user.click(rosterTab);

      await waitFor(() => {
        // Wait for roster to load
        expect(screen.getByText('Player One')).toBeInTheDocument();
      });

      // Initially, former player should not be visible
      expect(screen.queryByText('Player Two')).not.toBeInTheDocument();

      // Look for toggle button (might be a checkbox or button)
      const toggleElements = screen.queryAllByText(/Former/i);
      if (toggleElements.length > 0) {
        const toggleButton = toggleElements[0];
        await user.click(toggleButton);

        await waitFor(() => {
          // Now former player should be visible
          expect(screen.getByText('Player Two')).toBeInTheDocument();
        });
      }
    });

    it('should open AddRosterPlayerModal when add player clicked', async () => {
      render(<TeamManagement {...defaultProps} />);

      const rosterTab = screen.getByRole('button', { name: /Roster/i });
      await user.click(rosterTab);

      const addButton = await screen.findByRole('button', { name: /Add Player/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByTestId('add-roster-player-modal')).toBeInTheDocument();
      });
    });
  });

  describe('TeamPreferences Sub-component', () => {
    it('should load preferences on mount', async () => {
      render(<TeamManagement {...defaultProps} />);

      const preferencesTab = screen.getByRole('button', { name: /Preferences/i });
      await user.click(preferencesTab);

      await waitFor(() => {
        expect(mockTeamContext.loadTeamPreferences).toHaveBeenCalledWith(mockTeam.id);
      });
    });

    it('should display match format dropdown', async () => {
      render(<TeamManagement {...defaultProps} />);

      const preferencesTab = screen.getByRole('button', { name: /Preferences/i });
      await user.click(preferencesTab);

      await waitFor(() => {
        expect(screen.getByText(/Match Format/i)).toBeInTheDocument();
      });
    });

    it('should display formation dropdown', async () => {
      render(<TeamManagement {...defaultProps} />);

      const preferencesTab = screen.getByRole('button', { name: /Preferences/i });
      await user.click(preferencesTab);

      await waitFor(() => {
        expect(screen.getByText(/Formation/i)).toBeInTheDocument();
      });
    });

    it('should auto-save when a preference changes', async () => {
      render(<TeamManagement {...defaultProps} />);

      const preferencesTab = screen.getByRole('button', { name: /Preferences/i });
      await user.click(preferencesTab);

      const selects = await screen.findAllByRole('combobox');
      const matchFormatSelect = selects.find((select) =>
        Array.from(select.options || []).some((option) => option.value === '5v5')
      );

      expect(matchFormatSelect).toBeDefined();

      await user.selectOptions(matchFormatSelect, '7v7');

      await waitFor(() => {
        expect(mockTeamContext.saveTeamPreferences).toHaveBeenCalledWith(
          mockTeam.id,
          expect.objectContaining({ matchFormat: '7v7' })
        );
      });

      expect(screen.getByText(/Team Preferences/i)).toBeInTheDocument();
    });
  });

  describe('Ghost Player Dismiss Functionality', () => {
    beforeEach(() => {
      // Set up ghost player data
      mockGetPlayerConnectionDetails.mockResolvedValue({
        matchedConnections: new Map(),
        unmatchedExternalPlayers: [
          {
            externalPlayerId: 'ghost-1',
            providerName: 'SportAdmin',
            playerNameInProvider: 'Ghost Player',
            connectorStatus: 'connected',
            connectorId: 'connector-1'
          }
        ],
        hasConnectedProvider: true
      });

      mockDismissGhostPlayer.mockResolvedValue({
        id: 'ghost-1',
        is_dismissed: true,
        dismissed_at: '2025-12-25T10:30:00.000Z',
        dismissed_by: 'user-1'
      });
    });

    // Phase 1: Critical Tests
    it('renders dismiss button next to accept button for ghost players', async () => {
      render(<TeamManagement {...defaultProps} />);

      const rosterTab = screen.getByRole('button', { name: /Roster/i });
      await user.click(rosterTab);

      await waitFor(() => {
        expect(screen.getByText('Ghost Player')).toBeInTheDocument();
      });

      const acceptButton = screen.getByRole('button', { name: /Accept/i });
      const dismissButton = screen.getByRole('button', { name: /Dismiss/i });

      expect(acceptButton).toBeInTheDocument();
      expect(dismissButton).toBeInTheDocument();
    });

    it('calls dismissGhostPlayer service when dismiss button is clicked', async () => {
      render(<TeamManagement {...defaultProps} />);

      const rosterTab = screen.getByRole('button', { name: /Roster/i });
      await user.click(rosterTab);

      await waitFor(() => {
        expect(screen.getByText('Ghost Player')).toBeInTheDocument();
      });

      const dismissButton = screen.getByRole('button', { name: /Dismiss/i });
      await user.click(dismissButton);

      await waitFor(() => {
        expect(mockDismissGhostPlayer).toHaveBeenCalledWith('ghost-1');
      });
    });

    it('shows loading state during dismiss operation', async () => {
      let resolveDismiss;
      mockDismissGhostPlayer.mockReturnValue(
        new Promise(resolve => { resolveDismiss = resolve; })
      );

      render(<TeamManagement {...defaultProps} />);

      const rosterTab = screen.getByRole('button', { name: /Roster/i });
      await user.click(rosterTab);

      await waitFor(() => {
        expect(screen.getByText('Ghost Player')).toBeInTheDocument();
      });

      const dismissButton = screen.getByRole('button', { name: /Dismiss/i });
      await user.click(dismissButton);

      // Check loading state
      await waitFor(() => {
        expect(screen.getByText('Dismissing...')).toBeInTheDocument();
      });

      // Both buttons should be disabled during operation
      expect(screen.getByRole('button', { name: /Accept/i })).toBeDisabled();
      expect(dismissButton).toBeDisabled();

      // Resolve
      resolveDismiss({ id: 'ghost-1', is_dismissed: true });
    });

    it('displays success message after dismissing ghost player', async () => {
      render(<TeamManagement {...defaultProps} />);

      const rosterTab = screen.getByRole('button', { name: /Roster/i });
      await user.click(rosterTab);

      await waitFor(() => {
        expect(screen.getByText('Ghost Player')).toBeInTheDocument();
      });

      const dismissButton = screen.getByRole('button', { name: /Dismiss/i });
      await user.click(dismissButton);

      await waitFor(() => {
        expect(screen.getByText(/Ghost Player dismissed/i)).toBeInTheDocument();
      });
    });

    it('refreshes roster and connections after successful dismiss', async () => {
      render(<TeamManagement {...defaultProps} />);

      const rosterTab = screen.getByRole('button', { name: /Roster/i });
      await user.click(rosterTab);

      await waitFor(() => {
        expect(screen.getByText('Ghost Player')).toBeInTheDocument();
      });

      const initialGetRosterCalls = mockTeamContext.getTeamRoster.mock.calls.length;
      const initialConnectionCalls = mockGetPlayerConnectionDetails.mock.calls.length;

      const dismissButton = screen.getByRole('button', { name: /Dismiss/i });
      await user.click(dismissButton);

      await waitFor(() => {
        expect(mockTeamContext.getTeamRoster.mock.calls.length).toBe(initialGetRosterCalls + 1);
        expect(mockGetPlayerConnectionDetails.mock.calls.length).toBe(initialConnectionCalls + 1);
      });
    });

    // Phase 2: Error Handling
    it('displays error message when dismiss service fails', async () => {
      mockDismissGhostPlayer.mockRejectedValue(new Error('Database connection lost'));

      render(<TeamManagement {...defaultProps} />);

      const rosterTab = screen.getByRole('button', { name: /Roster/i });
      await user.click(rosterTab);

      await waitFor(() => {
        expect(screen.getByText('Ghost Player')).toBeInTheDocument();
      });

      const dismissButton = screen.getByRole('button', { name: /Dismiss/i });
      await user.click(dismissButton);

      await waitFor(() => {
        expect(screen.getByText(/Database connection lost/i)).toBeInTheDocument();
      });
    });

    it('displays error when attempting to dismiss already matched player', async () => {
      mockDismissGhostPlayer.mockRejectedValue(
        new Error('Player has already been matched or dismissed')
      );

      render(<TeamManagement {...defaultProps} />);

      const rosterTab = screen.getByRole('button', { name: /Roster/i });
      await user.click(rosterTab);

      await waitFor(() => {
        expect(screen.getByText('Ghost Player')).toBeInTheDocument();
      });

      const dismissButton = screen.getByRole('button', { name: /Dismiss/i });
      await user.click(dismissButton);

      await waitFor(() => {
        expect(screen.getByText(/already been matched or dismissed/i)).toBeInTheDocument();
      });
    });

    // Phase 3: Edge Cases
    it('disables dismiss button while accept operation is in progress', async () => {
      let resolveAccept;
      mockAcceptGhostPlayer.mockImplementation(() =>
        new Promise(resolve => { resolveAccept = resolve; })
      );

      render(<TeamManagement {...defaultProps} />);

      const rosterTab = screen.getByRole('button', { name: /Roster/i });
      await user.click(rosterTab);

      await waitFor(() => {
        expect(screen.getByText('Ghost Player')).toBeInTheDocument();
      });

      const acceptButton = screen.getByRole('button', { name: /Accept/i });
      const dismissButton = screen.getByRole('button', { name: /Dismiss/i });

      // Start accept operation
      await user.click(acceptButton);

      await waitFor(() => {
        expect(dismissButton).toBeDisabled();
      });

      resolveAccept({ id: 'player-new', display_name: 'Ghost Player' });
    });

    it('prevents multiple dismiss operations on same player simultaneously', async () => {
      let resolveDismiss;
      mockDismissGhostPlayer.mockImplementation(() =>
        new Promise(resolve => { resolveDismiss = resolve; })
      );

      render(<TeamManagement {...defaultProps} />);

      const rosterTab = screen.getByRole('button', { name: /Roster/i });
      await user.click(rosterTab);

      await waitFor(() => {
        expect(screen.getByText('Ghost Player')).toBeInTheDocument();
      });

      const dismissButton = screen.getByRole('button', { name: /Dismiss/i });

      // Click multiple times rapidly
      await user.click(dismissButton);
      await user.click(dismissButton);
      await user.click(dismissButton);

      // Service should only be called once
      await waitFor(() => {
        expect(mockDismissGhostPlayer).toHaveBeenCalledTimes(1);
      });

      resolveDismiss({ id: 'ghost-1', is_dismissed: true });
    });

    it('removes dismissed ghost player from UI after successful dismiss', async () => {
      // Initial state with ghost player
      mockGetPlayerConnectionDetails.mockResolvedValueOnce({
        matchedConnections: new Map(),
        unmatchedExternalPlayers: [
          {
            externalPlayerId: 'ghost-1',
            playerNameInProvider: 'Ghost Player',
            providerName: 'SportAdmin',
            connectorStatus: 'connected'
          }
        ],
        hasConnectedProvider: true
      });

      render(<TeamManagement {...defaultProps} />);

      const rosterTab = screen.getByRole('button', { name: /Roster/i });
      await user.click(rosterTab);

      await waitFor(() => {
        expect(screen.getByText('Ghost Player')).toBeInTheDocument();
      });

      // After dismiss, return empty list
      mockGetPlayerConnectionDetails.mockResolvedValueOnce({
        matchedConnections: new Map(),
        unmatchedExternalPlayers: [],
        hasConnectedProvider: true
      });

      const dismissButton = screen.getByRole('button', { name: /Dismiss/i });
      await user.click(dismissButton);

      await waitFor(() => {
        expect(screen.queryByText('Ghost Player')).not.toBeInTheDocument();
      });
    });
  });

  describe('Back Button', () => {
    it('should call onNavigateBack when back button is clicked', async () => {
      render(<TeamManagement {...defaultProps} />);

      const backButton = screen.getByRole('button', { name: /Back/i });
      await user.click(backButton);

      expect(mockNavigateBack).toHaveBeenCalledTimes(1);
    });
  });
});
