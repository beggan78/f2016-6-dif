/**
 * Tests for useInvitationNotifications hook
 * 
 * Tests pending invitation notifications, modal state management,
 * accept/decline actions, and user state reset functionality.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useInvitationNotifications } from '../useInvitationNotifications';
import { useAuth } from '../../contexts/AuthContext';
import { useTeam } from '../../contexts/TeamContext';
import { VIEWS } from '../../constants/viewConstants';

// Mock the dependencies
jest.mock('../../contexts/AuthContext');
jest.mock('../../contexts/TeamContext');

// Mock setTimeout for navigation delay testing
jest.useFakeTimers({ shouldClearNativeTimers: true });

describe('useInvitationNotifications', () => {
  // Mock callback functions
  const mockOnSuccess = jest.fn();
  const mockOnNavigate = jest.fn();
  const mockGetUserPendingInvitations = jest.fn();

  const defaultOptions = {
    onSuccess: mockOnSuccess,
    onNavigate: mockOnNavigate
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com'
  };

  const mockInvitations = [
    {
      id: 'inv-1',
      team: { id: 'team-1', name: 'Team Alpha' },
      role: 'player',
      invited_by: 'coach@example.com'
    },
    {
      id: 'inv-2',
      team: { id: 'team-2', name: 'Team Beta' },
      role: 'coach',
      invited_by: 'admin@example.com'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock console methods for clean test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock auth context
    useAuth.mockReturnValue({
      user: mockUser
    });

    // Mock team context
    useTeam.mockReturnValue({
      getUserPendingInvitations: mockGetUserPendingInvitations
    });

    // Default mock implementation
    mockGetUserPendingInvitations.mockResolvedValue([]);
  });

  afterEach(() => {
    console.log.mockRestore();
    console.error.mockRestore();
    jest.runOnlyPendingTimers();
    jest.clearAllTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('initial state', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useInvitationNotifications(defaultOptions));

      expect(result.current.showInvitationNotifications).toBe(false);
      expect(result.current.pendingInvitations).toEqual([]);
      expect(result.current.hasCheckedInvitations).toBe(false);
      expect(typeof result.current.checkPendingInvitationNotifications).toBe('function');
      expect(typeof result.current.handleInvitationNotificationProcessed).toBe('function');
      expect(typeof result.current.resetNotificationState).toBe('function');
    });

    it('should work with default options when none provided', () => {
      const { result } = renderHook(() => useInvitationNotifications({}));

      expect(result.current.showInvitationNotifications).toBe(false);
      expect(result.current.pendingInvitations).toEqual([]);
      expect(result.current.hasCheckedInvitations).toBe(false);
    });
  });

  describe('checkPendingInvitationNotifications', () => {
    it('should fetch and display pending invitations', async () => {
      mockGetUserPendingInvitations.mockResolvedValue(mockInvitations);

      const { result } = renderHook(() => useInvitationNotifications(defaultOptions));

      await act(async () => {
        await result.current.checkPendingInvitationNotifications();
      });

      expect(mockGetUserPendingInvitations).toHaveBeenCalledTimes(1);
      expect(result.current.pendingInvitations).toEqual(mockInvitations);
      expect(result.current.showInvitationNotifications).toBe(true);
      expect(result.current.hasCheckedInvitations).toBe(true);
      expect(console.log).toHaveBeenCalledWith('Checking for pending invitation notifications...');
      expect(console.log).toHaveBeenCalledWith('Found 2 pending invitation(s)');
    });

    it('should handle no pending invitations', async () => {
      mockGetUserPendingInvitations.mockResolvedValue([]);

      const { result } = renderHook(() => useInvitationNotifications(defaultOptions));

      await act(async () => {
        await result.current.checkPendingInvitationNotifications();
      });

      expect(result.current.pendingInvitations).toEqual([]);
      expect(result.current.showInvitationNotifications).toBe(false);
      expect(result.current.hasCheckedInvitations).toBe(true);
      expect(console.log).toHaveBeenCalledWith('No pending invitations found');
    });

    it('should handle null response from getUserPendingInvitations', async () => {
      mockGetUserPendingInvitations.mockResolvedValue(null);

      const { result } = renderHook(() => useInvitationNotifications(defaultOptions));

      await act(async () => {
        await result.current.checkPendingInvitationNotifications();
      });

      expect(result.current.pendingInvitations).toEqual([]);
      expect(result.current.showInvitationNotifications).toBe(false);
      expect(result.current.hasCheckedInvitations).toBe(true);
      expect(console.log).toHaveBeenCalledWith('No pending invitations found');
    });

    it('should handle errors when fetching invitations', async () => {
      const error = new Error('Network error');
      mockGetUserPendingInvitations.mockRejectedValue(error);

      const { result } = renderHook(() => useInvitationNotifications(defaultOptions));

      await act(async () => {
        await result.current.checkPendingInvitationNotifications();
      });

      expect(result.current.pendingInvitations).toEqual([]);
      expect(result.current.showInvitationNotifications).toBe(false);
      expect(result.current.hasCheckedInvitations).toBe(true);
      expect(console.error).toHaveBeenCalledWith('Error checking pending invitations:', error);
    });

    it('should not check if no user', async () => {
      useAuth.mockReturnValue({ user: null });

      const { result } = renderHook(() => useInvitationNotifications(defaultOptions));

      await act(async () => {
        await result.current.checkPendingInvitationNotifications();
      });

      expect(mockGetUserPendingInvitations).not.toHaveBeenCalled();
      expect(result.current.hasCheckedInvitations).toBe(false);
    });

    it('should not check if already checked', async () => {
      const { result } = renderHook(() => useInvitationNotifications(defaultOptions));

      // First check
      await act(async () => {
        await result.current.checkPendingInvitationNotifications();
      });

      expect(mockGetUserPendingInvitations).toHaveBeenCalledTimes(1);
      expect(result.current.hasCheckedInvitations).toBe(true);

      // Second check should not call the API
      await act(async () => {
        await result.current.checkPendingInvitationNotifications();
      });

      expect(mockGetUserPendingInvitations).toHaveBeenCalledTimes(1);
    });

    it('should skip checks while on GameScreen during active match', async () => {
      const { result } = renderHook(() =>
        useInvitationNotifications({
          ...defaultOptions,
          currentView: VIEWS.GAME,
          currentMatchState: 'running'
        })
      );

      await act(async () => {
        await result.current.checkPendingInvitationNotifications();
      });

      expect(mockGetUserPendingInvitations).not.toHaveBeenCalled();
      expect(result.current.hasCheckedInvitations).toBe(false);
    });

    it('should reset check status when manually set', async () => {
      const { result } = renderHook(() => useInvitationNotifications(defaultOptions));

      // First check
      await act(async () => {
        await result.current.checkPendingInvitationNotifications();
      });

      expect(result.current.hasCheckedInvitations).toBe(true);

      // Manually reset
      act(() => {
        result.current.setHasCheckedInvitations(false);
      });

      expect(result.current.hasCheckedInvitations).toBe(false);

      // Should be able to check again
      await act(async () => {
        await result.current.checkPendingInvitationNotifications();
      });

      expect(mockGetUserPendingInvitations).toHaveBeenCalledTimes(2);
    });
  });

  describe('handleInvitationNotificationProcessed', () => {
    beforeEach(() => {
      // Setup hook with pending invitations
      mockGetUserPendingInvitations.mockResolvedValue(mockInvitations);
    });

    it('should handle accepted invitation', async () => {
      const { result } = renderHook(() => useInvitationNotifications(defaultOptions));

      // Setup pending invitations
      await act(async () => {
        await result.current.checkPendingInvitationNotifications();
      });

      expect(result.current.pendingInvitations).toHaveLength(2);

      // Process first invitation as accepted
      act(() => {
        result.current.handleInvitationNotificationProcessed(mockInvitations[0], 'accepted');
      });

      expect(result.current.pendingInvitations).toHaveLength(1);
      expect(result.current.pendingInvitations[0].id).toBe('inv-2');
      expect(result.current.showInvitationNotifications).toBe(false); // Modal closes when <= 1 invitation
      expect(mockOnSuccess).toHaveBeenCalledWith('Successfully joined Team Alpha!');

      // Fast-forward timer for navigation
      jest.advanceTimersByTime(1000);
      expect(mockOnNavigate).toHaveBeenCalledWith(VIEWS.TEAM_MANAGEMENT);
    });

    it('should handle declined invitation', async () => {
      const { result } = renderHook(() => useInvitationNotifications(defaultOptions));

      // Setup pending invitations
      await act(async () => {
        await result.current.checkPendingInvitationNotifications();
      });

      // Process first invitation as declined
      act(() => {
        result.current.handleInvitationNotificationProcessed(mockInvitations[0], 'declined');
      });

      expect(result.current.pendingInvitations).toHaveLength(1);
      expect(mockOnSuccess).toHaveBeenCalledWith('Invitation declined');
      expect(mockOnNavigate).not.toHaveBeenCalled();
    });

    it('should close modal when last invitation is processed', async () => {
      // Setup with single invitation
      const singleInvitation = [mockInvitations[0]];
      mockGetUserPendingInvitations.mockResolvedValue(singleInvitation);

      const { result } = renderHook(() => useInvitationNotifications(defaultOptions));

      await act(async () => {
        await result.current.checkPendingInvitationNotifications();
      });

      expect(result.current.showInvitationNotifications).toBe(true);

      // Process the only invitation
      act(() => {
        result.current.handleInvitationNotificationProcessed(singleInvitation[0], 'accepted');
      });

      expect(result.current.pendingInvitations).toHaveLength(0);
      expect(result.current.showInvitationNotifications).toBe(false);
    });

    it('should handle unknown action types', async () => {
      const { result } = renderHook(() => useInvitationNotifications(defaultOptions));

      await act(async () => {
        await result.current.checkPendingInvitationNotifications();
      });

      // Process with unknown action
      act(() => {
        result.current.handleInvitationNotificationProcessed(mockInvitations[0], 'unknown');
      });

      expect(result.current.pendingInvitations).toHaveLength(1);
      expect(mockOnSuccess).not.toHaveBeenCalled();
      expect(mockOnNavigate).not.toHaveBeenCalled();
    });

    it('should handle processing invitation not in list', async () => {
      const { result } = renderHook(() => useInvitationNotifications(defaultOptions));

      await act(async () => {
        await result.current.checkPendingInvitationNotifications();
      });

      const unknownInvitation = {
        id: 'inv-unknown',
        team: { name: 'Unknown Team' }
      };

      // Process invitation that's not in the list
      act(() => {
        result.current.handleInvitationNotificationProcessed(unknownInvitation, 'accepted');
      });

      // List should remain unchanged
      expect(result.current.pendingInvitations).toHaveLength(2);
      expect(mockOnSuccess).toHaveBeenCalledWith('Successfully joined Unknown Team!');
    });
  });

  describe('resetNotificationState', () => {
    it('should reset state when user becomes null', async () => {
      const { result, rerender } = renderHook(() => useInvitationNotifications(defaultOptions));

      // Setup some state
      await act(async () => {
        await result.current.checkPendingInvitationNotifications();
      });

      act(() => {
        result.current.setShowInvitationNotifications(true);
        result.current.setPendingInvitations(mockInvitations);
      });

      expect(result.current.hasCheckedInvitations).toBe(true);
      expect(result.current.showInvitationNotifications).toBe(true);
      expect(result.current.pendingInvitations).toHaveLength(2);

      // Change user to null
      useAuth.mockReturnValue({ user: null });
      rerender();

      // State should be reset
      await waitFor(() => {
        expect(result.current.hasCheckedInvitations).toBe(false);
        expect(result.current.showInvitationNotifications).toBe(false);
        expect(result.current.pendingInvitations).toEqual([]);
      });
    });

    it('should not reset state when user remains truthy', async () => {
      const { result, rerender } = renderHook(() => useInvitationNotifications(defaultOptions));

      // Setup some state
      await act(async () => {
        await result.current.checkPendingInvitationNotifications();
      });

      act(() => {
        result.current.setShowInvitationNotifications(true);
        result.current.setPendingInvitations(mockInvitations);
      });

      // Change user but keep it truthy
      const newUser = { id: 'user-456', email: 'new@example.com' };
      useAuth.mockReturnValue({ user: newUser });
      rerender();

      // State should remain
      expect(result.current.hasCheckedInvitations).toBe(true);
      expect(result.current.showInvitationNotifications).toBe(true);
      expect(result.current.pendingInvitations).toHaveLength(2);
    });

    it('should allow manual reset call when user is null', async () => {
      const { result, rerender } = renderHook(() => useInvitationNotifications(defaultOptions));

      // Setup some state
      await act(async () => {
        await result.current.checkPendingInvitationNotifications();
      });

      act(() => {
        result.current.setShowInvitationNotifications(true);
        result.current.setPendingInvitations(mockInvitations);
      });

      expect(result.current.hasCheckedInvitations).toBe(true);
      expect(result.current.showInvitationNotifications).toBe(true);

      // Set user to null and rerender to update the hook
      useAuth.mockReturnValue({ user: null });
      rerender();

      // Now manually call reset - should work since user is null
      act(() => {
        result.current.resetNotificationState();
      });

      expect(result.current.hasCheckedInvitations).toBe(false);
      expect(result.current.showInvitationNotifications).toBe(false);
      expect(result.current.pendingInvitations).toEqual([]);
    });

    it('should not reset when user is still present', async () => {
      const { result } = renderHook(() => useInvitationNotifications(defaultOptions));

      // Setup some state
      await act(async () => {
        await result.current.checkPendingInvitationNotifications();
      });

      act(() => {
        result.current.setShowInvitationNotifications(true);
        result.current.setPendingInvitations(mockInvitations);
      });

      expect(result.current.hasCheckedInvitations).toBe(true);
      expect(result.current.showInvitationNotifications).toBe(true);

      // Keep user truthy and manually call reset - should not reset
      act(() => {
        result.current.resetNotificationState();
      });

      expect(result.current.hasCheckedInvitations).toBe(true);
      expect(result.current.showInvitationNotifications).toBe(true);
      expect(result.current.pendingInvitations).toEqual(mockInvitations);
    });
  });

  describe('manual state setters', () => {
    it('should provide manual control over showInvitationNotifications', () => {
      const { result } = renderHook(() => useInvitationNotifications(defaultOptions));

      expect(result.current.showInvitationNotifications).toBe(false);

      act(() => {
        result.current.setShowInvitationNotifications(true);
      });

      expect(result.current.showInvitationNotifications).toBe(true);

      act(() => {
        result.current.setShowInvitationNotifications(false);
      });

      expect(result.current.showInvitationNotifications).toBe(false);
    });

    it('should provide manual control over pendingInvitations', () => {
      const { result } = renderHook(() => useInvitationNotifications(defaultOptions));

      expect(result.current.pendingInvitations).toEqual([]);

      act(() => {
        result.current.setPendingInvitations(mockInvitations);
      });

      expect(result.current.pendingInvitations).toEqual(mockInvitations);

      act(() => {
        result.current.setPendingInvitations([]);
      });

      expect(result.current.pendingInvitations).toEqual([]);
    });

    it('should provide manual control over hasCheckedInvitations', () => {
      const { result } = renderHook(() => useInvitationNotifications(defaultOptions));

      expect(result.current.hasCheckedInvitations).toBe(false);

      act(() => {
        result.current.setHasCheckedInvitations(true);
      });

      expect(result.current.hasCheckedInvitations).toBe(true);

      act(() => {
        result.current.setHasCheckedInvitations(false);
      });

      expect(result.current.hasCheckedInvitations).toBe(false);
    });
  });

  describe('callback dependencies', () => {
    it('should update callbacks when dependencies change', () => {
      const { result, rerender } = renderHook(
        (props) => useInvitationNotifications(props),
        { initialProps: defaultOptions }
      );

      const initialCallback = result.current.handleInvitationNotificationProcessed;

      // Change one of the dependencies
      const newOptions = {
        ...defaultOptions,
        onSuccess: jest.fn()
      };

      rerender(newOptions);

      // Callback should be different due to dependency change
      expect(result.current.handleInvitationNotificationProcessed).not.toBe(initialCallback);
    });
  });

  describe('edge cases', () => {
    it('should handle multiple rapid state changes', async () => {
      const { result } = renderHook(() => useInvitationNotifications(defaultOptions));

      await act(async () => {
        await result.current.checkPendingInvitationNotifications();
      });

      // Rapid state changes
      act(() => {
        result.current.setPendingInvitations(mockInvitations);
        result.current.setShowInvitationNotifications(true);
        result.current.setPendingInvitations([mockInvitations[0]]);
        result.current.setShowInvitationNotifications(false);
      });

      expect(result.current.pendingInvitations).toEqual([mockInvitations[0]]);
      expect(result.current.showInvitationNotifications).toBe(false);
    });

    it('should handle navigation timing correctly', async () => {
      const { result } = renderHook(() => useInvitationNotifications(defaultOptions));

      await act(async () => {
        await result.current.checkPendingInvitationNotifications();
      });

      act(() => {
        result.current.setPendingInvitations(mockInvitations);
      });

      act(() => {
        result.current.handleInvitationNotificationProcessed(mockInvitations[0], 'accepted');
      });

      // Navigation should not have happened yet
      expect(mockOnNavigate).not.toHaveBeenCalled();

      // Fast-forward to exactly 1000ms
      jest.advanceTimersByTime(1000);
      expect(mockOnNavigate).toHaveBeenCalledWith(VIEWS.TEAM_MANAGEMENT);

      // Ensure no additional calls after more time
      jest.advanceTimersByTime(1000);
      expect(mockOnNavigate).toHaveBeenCalledTimes(1);
    });
  });
});
