/**
 * Tests for useInvitationProcessing hook
 * 
 * Tests invitation acceptance workflow, navigation, error handling,
 * and pending invitation processing functionality.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useInvitationProcessing } from '../useInvitationProcessing';
import { useAuth } from '../../contexts/AuthContext';
import { useTeam } from '../../contexts/TeamContext';
import { VIEWS } from '../../constants/viewConstants';
import * as invitationUtils from '../../utils/invitationUtils';

// Mock the dependencies
jest.mock('../../contexts/AuthContext');
jest.mock('../../contexts/TeamContext');
jest.mock('../../utils/invitationUtils', () => ({
  shouldProcessInvitation: jest.fn(),
  needsAccountCompletion: jest.fn(),
  retrievePendingInvitation: jest.fn(),
  hasPendingInvitation: jest.fn()
}));

describe('useInvitationProcessing', () => {
  // Mock callback functions
  const mockOnSuccess = jest.fn();
  const mockOnNavigate = jest.fn();
  const mockClearInvitationParams = jest.fn();
  const mockAcceptTeamInvitation = jest.fn();

  const defaultOptions = {
    onSuccess: mockOnSuccess,
    onNavigate: mockOnNavigate,
    clearInvitationParams: mockClearInvitationParams
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    confirmed_at: '2023-12-01T10:00:00.000Z'
  };

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
      acceptTeamInvitation: mockAcceptTeamInvitation
    });

    // Mock invitation utils with default returns
    invitationUtils.shouldProcessInvitation.mockReturnValue(true);
    invitationUtils.needsAccountCompletion.mockReturnValue(false);
    invitationUtils.hasPendingInvitation.mockReturnValue(false);
    invitationUtils.retrievePendingInvitation.mockReturnValue(null);
  });

  afterEach(() => {
    console.log.mockRestore();
    console.error.mockRestore();
  });

  describe('initial state', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useInvitationProcessing(defaultOptions));

      expect(result.current.isProcessing).toBe(false);
      expect(typeof result.current.handleInvitationAcceptance).toBe('function');
      expect(typeof result.current.handleInvitationProcessed).toBe('function');
      expect(typeof result.current.processInvitationForUser).toBe('function');
      expect(typeof result.current.processPendingInvitationForUser).toBe('function');
    });

    it('should work with default options when none provided', () => {
      const { result } = renderHook(() => useInvitationProcessing({}));

      expect(result.current.isProcessing).toBe(false);
      expect(typeof result.current.handleInvitationAcceptance).toBe('function');
    });
  });

  describe('handleInvitationAcceptance', () => {
    it('should successfully process invitation acceptance', async () => {
      const mockResult = {
        success: true,
        message: 'Successfully joined the team!'
      };
      mockAcceptTeamInvitation.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useInvitationProcessing(defaultOptions));

      const invitationParams = { invitationId: 'inv-123' };

      await act(async () => {
        const response = await result.current.handleInvitationAcceptance(invitationParams);
        expect(response).toEqual(mockResult);
      });

      expect(mockAcceptTeamInvitation).toHaveBeenCalledWith('inv-123');
      expect(mockClearInvitationParams).toHaveBeenCalledTimes(1);
      expect(mockOnSuccess).toHaveBeenCalledWith('Successfully joined the team!');
      expect(mockOnNavigate).toHaveBeenCalledWith(VIEWS.TEAM_MANAGEMENT);
      expect(result.current.isProcessing).toBe(false);
    });

    it('should handle successful invitation with default message', async () => {
      const mockResult = { success: true };
      mockAcceptTeamInvitation.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useInvitationProcessing(defaultOptions));

      const invitationParams = { invitationId: 'inv-123' };

      await act(async () => {
        await result.current.handleInvitationAcceptance(invitationParams);
      });

      expect(mockOnSuccess).toHaveBeenCalledWith('Welcome to the team!');
    });

    it('should handle failed invitation acceptance', async () => {
      const mockResult = {
        success: false,
        error: 'Invitation not found'
      };
      mockAcceptTeamInvitation.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useInvitationProcessing(defaultOptions));

      const invitationParams = { invitationId: 'inv-invalid' };

      await act(async () => {
        const response = await result.current.handleInvitationAcceptance(invitationParams);
        expect(response).toEqual(mockResult);
      });

      expect(mockAcceptTeamInvitation).toHaveBeenCalledWith('inv-invalid');
      expect(mockClearInvitationParams).not.toHaveBeenCalled();
      expect(mockOnSuccess).not.toHaveBeenCalled();
      expect(mockOnNavigate).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith('Failed to accept invitation:', 'Invitation not found');
    });

    it('should handle invitation acceptance errors', async () => {
      const error = new Error('Network error');
      mockAcceptTeamInvitation.mockRejectedValue(error);

      const { result } = renderHook(() => useInvitationProcessing(defaultOptions));

      const invitationParams = { invitationId: 'inv-123' };

      await act(async () => {
        const response = await result.current.handleInvitationAcceptance(invitationParams);
        expect(response).toEqual({
          success: false,
          error: 'Network error'
        });
      });

      expect(console.error).toHaveBeenCalledWith('Error processing invitation:', error);
      expect(result.current.isProcessing).toBe(false);
    });

    it('should return early if no invitation ID provided', async () => {
      const { result } = renderHook(() => useInvitationProcessing(defaultOptions));

      await act(async () => {
        const response = await result.current.handleInvitationAcceptance({});
        expect(response).toBeUndefined();
      });

      expect(mockAcceptTeamInvitation).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith('No invitation ID provided');
    });

    it('should skip processing if already processing', async () => {
      mockAcceptTeamInvitation.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      const { result } = renderHook(() => useInvitationProcessing(defaultOptions));

      const invitationParams = { invitationId: 'inv-123' };

      // Start first processing
      act(() => {
        result.current.handleInvitationAcceptance(invitationParams);
      });

      expect(result.current.isProcessing).toBe(true);

      // Try to process again while first is still running
      await act(async () => {
        const response = await result.current.handleInvitationAcceptance(invitationParams);
        expect(response).toBeUndefined();
      });

      expect(console.log).toHaveBeenCalledWith('Invitation already being processed, skipping');
      expect(mockAcceptTeamInvitation).toHaveBeenCalledTimes(1);
    });

    it('should set and clear isProcessing state correctly', async () => {
      // Create a promise that we can control
      let resolvePromise;
      const controlledPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      
      mockAcceptTeamInvitation.mockReturnValue(controlledPromise);

      const { result } = renderHook(() => useInvitationProcessing(defaultOptions));

      expect(result.current.isProcessing).toBe(false);

      // Start the async operation
      let promise;
      act(() => {
        promise = result.current.handleInvitationAcceptance({ invitationId: 'inv-123' });
      });

      // Check that isProcessing is now true
      expect(result.current.isProcessing).toBe(true);

      // Resolve the mock promise and wait for completion
      act(() => {
        resolvePromise({ success: true });
      });

      await act(async () => {
        await promise;
      });

      expect(result.current.isProcessing).toBe(false);
    });
  });

  describe('handleInvitationProcessed', () => {
    it('should handle successful invitation processed callback', () => {
      const { result } = renderHook(() => useInvitationProcessing(defaultOptions));

      const mockResult = {
        success: true,
        message: 'Team joined successfully!'
      };

      act(() => {
        result.current.handleInvitationProcessed(mockResult);
      });

      expect(mockClearInvitationParams).toHaveBeenCalledTimes(1);
      expect(mockOnSuccess).toHaveBeenCalledWith('Team joined successfully!');
      expect(mockOnNavigate).toHaveBeenCalledWith(VIEWS.TEAM_MANAGEMENT);
    });

    it('should handle successful callback with default message', () => {
      const { result } = renderHook(() => useInvitationProcessing(defaultOptions));

      const mockResult = { success: true };

      act(() => {
        result.current.handleInvitationProcessed(mockResult);
      });

      expect(mockOnSuccess).toHaveBeenCalledWith('Welcome to the team!');
    });

    it('should not process unsuccessful results', () => {
      const { result } = renderHook(() => useInvitationProcessing(defaultOptions));

      const mockResult = { success: false, error: 'Failed' };

      act(() => {
        result.current.handleInvitationProcessed(mockResult);
      });

      expect(mockClearInvitationParams).not.toHaveBeenCalled();
      expect(mockOnSuccess).not.toHaveBeenCalled();
      expect(mockOnNavigate).not.toHaveBeenCalled();
    });

    it('should handle null or undefined results', () => {
      const { result } = renderHook(() => useInvitationProcessing(defaultOptions));

      act(() => {
        result.current.handleInvitationProcessed(null);
      });

      act(() => {
        result.current.handleInvitationProcessed(undefined);
      });

      expect(mockClearInvitationParams).not.toHaveBeenCalled();
      expect(mockOnSuccess).not.toHaveBeenCalled();
      expect(mockOnNavigate).not.toHaveBeenCalled();
    });
  });

  describe('processInvitationForUser', () => {
    const mockInvitationParams = {
      hasInvitation: true,
      invitationId: 'inv-123',
      teamId: 'team-123',
      role: 'player'
    };

    it('should process invitation for authenticated user', async () => {
      invitationUtils.shouldProcessInvitation.mockReturnValue(true);
      invitationUtils.needsAccountCompletion.mockReturnValue(false);
      mockAcceptTeamInvitation.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useInvitationProcessing(defaultOptions));

      await act(async () => {
        result.current.processInvitationForUser(mockInvitationParams);
      });

      expect(invitationUtils.shouldProcessInvitation).toHaveBeenCalledWith(mockUser, mockInvitationParams);
      expect(invitationUtils.needsAccountCompletion).toHaveBeenCalledWith(mockInvitationParams, mockUser);
      expect(console.log).toHaveBeenCalledWith('User is ready to process invitation');
      expect(mockAcceptTeamInvitation).toHaveBeenCalledWith('inv-123');
    });

    it('should not process if user needs account completion', () => {
      invitationUtils.shouldProcessInvitation.mockReturnValue(true);
      invitationUtils.needsAccountCompletion.mockReturnValue(true);

      const { result } = renderHook(() => useInvitationProcessing(defaultOptions));

      act(() => {
        result.current.processInvitationForUser(mockInvitationParams);
      });

      expect(console.log).toHaveBeenCalledWith('User needs to complete account setup before processing invitation');
      expect(mockAcceptTeamInvitation).not.toHaveBeenCalled();
    });

    it('should not process if shouldProcessInvitation returns false', () => {
      invitationUtils.shouldProcessInvitation.mockReturnValue(false);

      const { result } = renderHook(() => useInvitationProcessing(defaultOptions));

      act(() => {
        result.current.processInvitationForUser(mockInvitationParams);
      });

      expect(mockAcceptTeamInvitation).not.toHaveBeenCalled();
    });

    it('should not process if no user', () => {
      useAuth.mockReturnValue({ user: null });

      const { result } = renderHook(() => useInvitationProcessing(defaultOptions));

      act(() => {
        result.current.processInvitationForUser(mockInvitationParams);
      });

      expect(mockAcceptTeamInvitation).not.toHaveBeenCalled();
    });

    it('should not process if no invitation params', () => {
      const { result } = renderHook(() => useInvitationProcessing(defaultOptions));

      act(() => {
        result.current.processInvitationForUser(null);
      });

      expect(mockAcceptTeamInvitation).not.toHaveBeenCalled();
    });
  });

  describe('processPendingInvitationForUser', () => {
    it('should process pending invitation when user signs in', async () => {
      const mockPendingInvitation = {
        invitationId: 'inv-pending',
        teamName: 'Test Team',
        role: 'coach',
        email: 'test@example.com'
      };

      invitationUtils.hasPendingInvitation.mockReturnValue(true);
      invitationUtils.retrievePendingInvitation.mockReturnValue(mockPendingInvitation);
      mockAcceptTeamInvitation.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useInvitationProcessing(defaultOptions));

      await act(async () => {
        result.current.processPendingInvitationForUser(null);
      });

      expect(console.log).toHaveBeenCalledWith('User signed in, checking for pending invitation...');
      expect(console.log).toHaveBeenCalledWith('Processing pending invitation:', mockPendingInvitation);
      expect(mockAcceptTeamInvitation).toHaveBeenCalledWith('inv-pending');
      expect(mockOnSuccess).toHaveBeenCalledWith('Successfully joined as coach. Welcome to Test Team!');
    });

    it('should handle pending invitation without team name', async () => {
      const mockPendingInvitation = {
        invitationId: 'inv-pending',
        role: 'player'
      };

      invitationUtils.hasPendingInvitation.mockReturnValue(true);
      invitationUtils.retrievePendingInvitation.mockReturnValue(mockPendingInvitation);
      mockAcceptTeamInvitation.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useInvitationProcessing(defaultOptions));

      await act(async () => {
        result.current.processPendingInvitationForUser(null);
      });

      expect(mockOnSuccess).toHaveBeenCalledWith('Successfully joined as player. Welcome to the team!');
    });

    it('should handle pending invitation without role', async () => {
      const mockPendingInvitation = {
        invitationId: 'inv-pending',
        teamName: 'Test Team'
      };

      invitationUtils.hasPendingInvitation.mockReturnValue(true);
      invitationUtils.retrievePendingInvitation.mockReturnValue(mockPendingInvitation);
      mockAcceptTeamInvitation.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useInvitationProcessing(defaultOptions));

      await act(async () => {
        result.current.processPendingInvitationForUser(null);
      });

      expect(mockOnSuccess).toHaveBeenCalledWith('Successfully joined as member. Welcome to Test Team!');
    });

    it('should not process if no pending invitation exists', () => {
      invitationUtils.hasPendingInvitation.mockReturnValue(false);

      const { result } = renderHook(() => useInvitationProcessing(defaultOptions));

      act(() => {
        result.current.processPendingInvitationForUser(null);
      });

      expect(invitationUtils.retrievePendingInvitation).not.toHaveBeenCalled();
      expect(mockAcceptTeamInvitation).not.toHaveBeenCalled();
    });

    it('should not process if invitation params are provided', () => {
      const { result } = renderHook(() => useInvitationProcessing(defaultOptions));

      act(() => {
        result.current.processPendingInvitationForUser({ hasInvitation: true });
      });

      expect(invitationUtils.hasPendingInvitation).not.toHaveBeenCalled();
    });

    it('should not process if no user', () => {
      useAuth.mockReturnValue({ user: null });

      const { result } = renderHook(() => useInvitationProcessing(defaultOptions));

      act(() => {
        result.current.processPendingInvitationForUser(null);
      });

      expect(invitationUtils.hasPendingInvitation).not.toHaveBeenCalled();
    });

    it('should handle retrieved invitation without invitationId', () => {
      const mockPendingInvitation = {
        teamName: 'Test Team',
        role: 'player'
        // Missing invitationId
      };

      invitationUtils.hasPendingInvitation.mockReturnValue(true);
      invitationUtils.retrievePendingInvitation.mockReturnValue(mockPendingInvitation);

      const { result } = renderHook(() => useInvitationProcessing(defaultOptions));

      act(() => {
        result.current.processPendingInvitationForUser(null);
      });

      expect(mockAcceptTeamInvitation).not.toHaveBeenCalled();
    });
  });

  describe('dependency updates', () => {
    it('should update callbacks when dependencies change', () => {
      const { result, rerender } = renderHook(
        (props) => useInvitationProcessing(props),
        { initialProps: defaultOptions }
      );

      const initialCallback = result.current.handleInvitationAcceptance;

      // Change one of the dependencies
      const newOptions = {
        ...defaultOptions,
        onSuccess: jest.fn()
      };

      rerender(newOptions);

      // Callback should be different due to dependency change
      expect(result.current.handleInvitationAcceptance).not.toBe(initialCallback);
    });
  });
});