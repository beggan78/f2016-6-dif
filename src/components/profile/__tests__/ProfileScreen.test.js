/**
 * ProfileScreen Tests
 *
 * Test suite for the ProfileScreen component covering:
 * - Browser back integration
 * - Navigation functionality
 * - Basic rendering and user interactions
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProfileScreen } from '../ProfileScreen';
import { VIEWS } from '../../../constants/viewConstants';

// Mock contexts
const mockUseAuth = jest.fn();
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}));

const mockUseTeam = jest.fn();
jest.mock('../../../contexts/TeamContext', () => ({
  useTeam: () => mockUseTeam()
}));

// Mock ChangePassword component
jest.mock('../../auth/ChangePassword', () => ({
  ChangePassword: ({ isOpen, onClose }) =>
    isOpen ? <div data-testid="change-password-modal">Change Password Modal</div> : null
}));

describe('ProfileScreen', () => {
  let defaultProps;
  let mockOnNavigateBack;
  let mockOnNavigateTo;
  let mockPushNavigationState;
  let mockRemoveFromNavigationStack;

  beforeEach(() => {
    mockOnNavigateBack = jest.fn();
    mockOnNavigateTo = jest.fn();
    mockPushNavigationState = jest.fn();
    mockRemoveFromNavigationStack = jest.fn();

    defaultProps = {
      onNavigateBack: mockOnNavigateBack,
      onNavigateTo: mockOnNavigateTo,
      pushNavigationState: mockPushNavigationState,
      removeFromNavigationStack: mockRemoveFromNavigationStack
    };

    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z',
        email_confirmed_at: '2024-01-01T00:00:00Z'
      },
      userProfile: {
        id: 'profile-1',
        name: 'Test User',
        updated_at: '2024-01-15T00:00:00Z'
      },
      updateProfile: jest.fn(),
      loading: false,
      authError: null,
      clearAuthError: jest.fn(),
      profileName: 'Test User',
      markProfileCompleted: jest.fn()
    });

    mockUseTeam.mockReturnValue({
      currentTeam: {
        id: 'team-1',
        name: 'Test Team',
        userRole: 'admin'
      },
      userTeams: [
        {
          id: 'team-1',
          name: 'Test Team',
          userRole: 'admin'
        }
      ],
      userClubs: [
        {
          id: 'club-user-1',
          role: 'member',
          club: {
            id: 'club-1',
            name: 'Arsenal',
            long_name: 'Arsenal'
          }
        }
      ],
      loading: false,
      leaveClub: jest.fn(),
      leaveTeam: jest.fn()
    });

    jest.clearAllMocks();
  });

  describe('Browser Back Integration', () => {
    test('should register browser back handler on mount', () => {
      render(<ProfileScreen {...defaultProps} />);

      expect(mockPushNavigationState).toHaveBeenCalled();
      expect(mockPushNavigationState).toHaveBeenCalledWith(expect.any(Function));
    });

    test('should call onNavigateBack when browser back handler is invoked', () => {
      render(<ProfileScreen {...defaultProps} />);

      // Get the callback that was registered
      const backHandler = mockPushNavigationState.mock.calls[0][0];

      // Invoke it
      backHandler();

      expect(mockOnNavigateBack).toHaveBeenCalled();
    });

    test('should cleanup browser back handler on unmount', () => {
      const { unmount } = render(<ProfileScreen {...defaultProps} />);

      unmount();

      expect(mockRemoveFromNavigationStack).toHaveBeenCalled();
    });

    test('should not crash if pushNavigationState is not provided', () => {
      const propsWithoutBrowserBack = {
        ...defaultProps,
        pushNavigationState: undefined,
        removeFromNavigationStack: undefined
      };

      expect(() => {
        render(<ProfileScreen {...propsWithoutBrowserBack} />);
      }).not.toThrow();
    });
  });

  describe('Navigation', () => {
    test('should call onNavigateBack when Back button is clicked', () => {
      render(<ProfileScreen {...defaultProps} />);

      const backButton = screen.getByRole('button', { name: /back/i });
      fireEvent.click(backButton);

      expect(mockOnNavigateBack).toHaveBeenCalled();
    });

    test('should navigate to team management when clicking current team card', () => {
      render(<ProfileScreen {...defaultProps} />);

      const teamCard = screen.getByText('Current Team').closest('button');
      fireEvent.click(teamCard);

      expect(mockOnNavigateTo).toHaveBeenCalledWith(VIEWS.TEAM_MANAGEMENT);
    });

    test('should navigate to team management when user has no clubs', () => {
      mockUseTeam.mockReturnValue({
        currentTeam: null,
        userTeams: [],
        userClubs: [],
        loading: false,
        leaveClub: jest.fn()
      });

      render(<ProfileScreen {...defaultProps} />);

      const createClubButton = screen.getByRole('button', { name: /create or join a club/i });
      fireEvent.click(createClubButton);

      expect(mockOnNavigateTo).toHaveBeenCalledWith(VIEWS.TEAM_MANAGEMENT);
    });
  });

  describe('Rendering', () => {
    test('should render profile header with user information', () => {
      render(<ProfileScreen {...defaultProps} />);

      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getAllByText('Test User').length).toBeGreaterThan(0);
      expect(screen.getAllByText('test@example.com').length).toBeGreaterThan(0);
    });

    test('should show email verified badge when email is confirmed', () => {
      render(<ProfileScreen {...defaultProps} />);

      expect(screen.getByText('Email verified')).toBeInTheDocument();
    });

    test('should display user teams when available', () => {
      render(<ProfileScreen {...defaultProps} />);

      expect(screen.getByText('Club: Arsenal')).toBeInTheDocument();
      expect(screen.getByText('Your Teams (1)')).toBeInTheDocument();
      expect(screen.getAllByText('Test Team').length).toBeGreaterThan(0);
    });

    test('should show no clubs message when user has no clubs', () => {
      mockUseTeam.mockReturnValue({
        currentTeam: null,
        userTeams: [],
        userClubs: [],
        loading: false,
        leaveClub: jest.fn()
      });

      render(<ProfileScreen {...defaultProps} />);

      expect(screen.getByText('No clubs yet')).toBeInTheDocument();
      expect(screen.getByText(/You haven't joined any clubs yet/i)).toBeInTheDocument();
    });

    test('should show no teams message when user has clubs but no teams', () => {
      mockUseTeam.mockReturnValue({
        currentTeam: null,
        userTeams: [],
        userClubs: [
          {
            id: 'club-user-1',
            role: 'member',
            club: {
              id: 'club-1',
              name: 'Arsenal',
              long_name: 'Arsenal'
            }
          }
        ],
        loading: false,
        leaveClub: jest.fn()
      });

      render(<ProfileScreen {...defaultProps} />);

      expect(screen.getByText('Club: Arsenal')).toBeInTheDocument();
      expect(screen.getByText('No Teams Yet')).toBeInTheDocument();
      expect(screen.getByText(/You haven't joined any teams yet/i)).toBeInTheDocument();
    });

    test('should show loading state when teams are loading', () => {
      mockUseTeam.mockReturnValue({
        currentTeam: null,
        userTeams: null,
        userClubs: null,
        loading: true,
        leaveClub: jest.fn()
      });

      render(<ProfileScreen {...defaultProps} />);

      expect(screen.getByText('Loading your clubs and teams...')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    test('should enter edit mode when Edit button is clicked', () => {
      render(<ProfileScreen {...defaultProps} />);

      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);

      expect(screen.getByPlaceholderText('Enter your full name')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    test('should open change password modal when button is clicked', () => {
      render(<ProfileScreen {...defaultProps} />);

      const changePasswordButton = screen.getByRole('button', { name: /change password/i });
      fireEvent.click(changePasswordButton);

      expect(screen.getByTestId('change-password-modal')).toBeInTheDocument();
    });

    test('should toggle account information section when clicked', () => {
      render(<ProfileScreen {...defaultProps} />);

      const accountInfoButton = screen.getByText('Account Information').closest('button');

      // Initially not visible
      expect(screen.queryByText('Account Created')).not.toBeInTheDocument();

      // Click to expand
      fireEvent.click(accountInfoButton);

      expect(screen.getByText('Account Created')).toBeInTheDocument();
      expect(screen.getByText('User ID')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    test('should handle unmounting gracefully', () => {
      const { unmount } = render(<ProfileScreen {...defaultProps} />);

      expect(() => unmount()).not.toThrow();
    });

    test('should handle missing user profile gracefully', () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 'user-1',
          email: 'test@example.com'
        },
        userProfile: null,
        updateProfile: jest.fn(),
        loading: false,
        authError: null,
        clearAuthError: jest.fn(),
        profileName: 'Not set',
        markProfileCompleted: jest.fn()
      });

      render(<ProfileScreen {...defaultProps} />);

      expect(screen.getByText('Not set')).toBeInTheDocument();
    });

    test('should use email as fallback when name is not available', () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 'user-1',
          email: 'testuser@example.com'
        },
        userProfile: {
          id: 'profile-1',
          name: null
        },
        updateProfile: jest.fn(),
        loading: false,
        authError: null,
        clearAuthError: jest.fn(),
        profileName: 'Not set',
        markProfileCompleted: jest.fn()
      });

      render(<ProfileScreen {...defaultProps} />);

      // Should show email username as display name
      expect(screen.getAllByText('testuser@example.com').length).toBeGreaterThan(0);
    });
  });
});
