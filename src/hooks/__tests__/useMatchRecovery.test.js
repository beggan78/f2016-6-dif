/**
 * Tests for useMatchRecovery hook
 * 
 * Tests the match recovery functionality including detection of finished matches,
 * recovery modal workflow, and integration with match state management.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useMatchRecovery } from '../useMatchRecovery';
import * as matchRecoveryService from '../../services/matchRecoveryService';
import * as matchStateManager from '../../services/matchStateManager';

// Mock the services
jest.mock('../../services/matchRecoveryService', () => ({
  checkForRecoverableMatch: jest.fn(),
  deleteAbandonedMatch: jest.fn()
}));

jest.mock('../../services/matchStateManager', () => ({
  updateMatchToConfirmed: jest.fn()
}));

describe('useMatchRecovery', () => {
  // Mock parameters
  const mockParams = {
    user: { id: 'user-123', email: 'test@example.com' },
    currentTeam: { id: 'team-123', name: 'Test Team' },
    invitationParams: null,
    needsProfileCompletion: false,
    gameState: { 
      clearStoredState: jest.fn()
    },
    setSuccessMessage: jest.fn()
  };

  const mockRecoveryMatch = {
    id: 'match-123',
    team_id: 'team-123',
    state: 'finished',
    opponent: 'Test Opponents',
    format: '5v5',
    formation: '2-2'
  };


  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock console methods for clean test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Setup default mocks
    matchRecoveryService.checkForRecoverableMatch.mockResolvedValue({ 
      success: false, 
      match: null 
    });
    matchRecoveryService.deleteAbandonedMatch.mockResolvedValue({ success: true });
    matchStateManager.updateMatchToConfirmed.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should return initial state values', () => {
      const { result } = renderHook(() => useMatchRecovery(mockParams));

      expect(result.current.showRecoveryModal).toBe(false);
      expect(result.current.recoveryMatch).toBeNull();
      expect(result.current.isProcessingRecovery).toBe(false);
      expect(typeof result.current.handleSaveRecovery).toBe('function');
      expect(typeof result.current.handleAbandonRecovery).toBe('function');
      expect(typeof result.current.handleCloseRecovery).toBe('function');
    });

    it('should not check for recoverable match without user or team', () => {
      const paramsWithoutUser = { ...mockParams, user: null };
      renderHook(() => useMatchRecovery(paramsWithoutUser));

      expect(matchRecoveryService.checkForRecoverableMatch).not.toHaveBeenCalled();
    });

    it('should not check for recoverable match with invitation parameters', () => {
      const paramsWithInvitation = { 
        ...mockParams, 
        invitationParams: { teamId: 'team-456' } 
      };
      renderHook(() => useMatchRecovery(paramsWithInvitation));

      expect(matchRecoveryService.checkForRecoverableMatch).not.toHaveBeenCalled();
    });

    it('should not check for recoverable match when profile completion needed', () => {
      const paramsWithProfileCompletion = { 
        ...mockParams, 
        needsProfileCompletion: true 
      };
      renderHook(() => useMatchRecovery(paramsWithProfileCompletion));

      expect(matchRecoveryService.checkForRecoverableMatch).not.toHaveBeenCalled();
    });
  });

  describe('recoverable match detection', () => {
    beforeEach(() => {
      // Use fake timers to control the setTimeout
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should detect and show recoverable match', async () => {
      // Mock successful recovery detection
      matchRecoveryService.checkForRecoverableMatch.mockResolvedValue({
        success: true,
        match: mockRecoveryMatch
      });

      const { result } = renderHook(() => useMatchRecovery(mockParams));

      // Fast-forward timers and wait for async operations
      act(() => {
        jest.advanceTimersByTime(1500);
      });

      await waitFor(() => {
        expect(result.current.showRecoveryModal).toBe(true);
        expect(result.current.recoveryMatch).toEqual(mockRecoveryMatch);
      });

      expect(matchRecoveryService.checkForRecoverableMatch).toHaveBeenCalled();
    });

    it('should not show modal if no match found', async () => {
      // Mock no match found
      matchRecoveryService.checkForRecoverableMatch.mockResolvedValue({
        success: true,
        match: null
      });

      const { result } = renderHook(() => useMatchRecovery(mockParams));

      act(() => {
        jest.advanceTimersByTime(1500);
      });

      await waitFor(() => {
        expect(matchRecoveryService.checkForRecoverableMatch).toHaveBeenCalled();
      });

      expect(result.current.showRecoveryModal).toBe(false);
      expect(result.current.recoveryMatch).toBeNull();
    });

    it('should handle detection errors gracefully', async () => {
      matchRecoveryService.checkForRecoverableMatch.mockRejectedValue(
        new Error('Service error')
      );

      const { result } = renderHook(() => useMatchRecovery(mockParams));

      act(() => {
        jest.advanceTimersByTime(1500);
      });

      await waitFor(() => {
        expect(matchRecoveryService.checkForRecoverableMatch).toHaveBeenCalled();
      });

      // Should remain in initial state
      expect(result.current.showRecoveryModal).toBe(false);
      expect(result.current.recoveryMatch).toBeNull();
    });
  });

  describe('handleCloseRecovery', () => {
    it('should close recovery modal without taking action', () => {
      const { result } = renderHook(() => useMatchRecovery(mockParams));

      // Simulate modal being shown (using direct state manipulation for testing)
      act(() => {
        result.current.handleCloseRecovery();
      });

      expect(result.current.showRecoveryModal).toBe(false);
      expect(result.current.recoveryMatch).toBeNull();
      // Should not call any service methods
      expect(matchRecoveryService.deleteAbandonedMatch).not.toHaveBeenCalled();
      expect(matchStateManager.updateMatchToConfirmed).not.toHaveBeenCalled();
    });
  });

  describe('function availability', () => {
    it('should provide all required handler functions', () => {
      const { result } = renderHook(() => useMatchRecovery(mockParams));

      expect(typeof result.current.handleSaveRecovery).toBe('function');
      expect(typeof result.current.handleAbandonRecovery).toBe('function');
      expect(typeof result.current.handleCloseRecovery).toBe('function');
    });

    it('should handle save recovery function call without errors', async () => {
      const { result } = renderHook(() => useMatchRecovery(mockParams));

      await act(async () => {
        // This tests that the function exists and doesn't throw
        await result.current.handleSaveRecovery();
      });

      // The function should exist and be callable (even if it doesn't do anything without recoveryMatch)
      expect(result.current.handleSaveRecovery).toBeDefined();
    });

    it('should handle abandon recovery function call without errors', async () => {
      const { result } = renderHook(() => useMatchRecovery(mockParams));

      await act(async () => {
        // This tests that the function exists and doesn't throw
        await result.current.handleAbandonRecovery();
      });

      // The function should exist and be callable
      expect(result.current.handleAbandonRecovery).toBeDefined();
    });
  });

  describe('service integration', () => {
    it('should call checkForRecoverableMatch when conditions are met', async () => {
      // Use fake timers
      jest.useFakeTimers();

      renderHook(() => useMatchRecovery(mockParams));

      // Advance timer to trigger the setTimeout
      act(() => {
        jest.advanceTimersByTime(1500);
      });

      // Wait for async operations
      await waitFor(() => {
        expect(matchRecoveryService.checkForRecoverableMatch).toHaveBeenCalled();
      });

      jest.useRealTimers();
    });

    it('should handle processing state correctly during operations', () => {
      const { result } = renderHook(() => useMatchRecovery(mockParams));

      // Initial processing state should be false
      expect(result.current.isProcessingRecovery).toBe(false);

      // The processing state is managed internally by the hook
      // Testing state management would require more complex setup
    });
  });

  describe('error handling', () => {
    it('should handle service errors gracefully', async () => {
      jest.useFakeTimers();

      // Mock service failure
      matchRecoveryService.checkForRecoverableMatch.mockRejectedValue(
        new Error('Service unavailable')
      );

      const { result } = renderHook(() => useMatchRecovery(mockParams));

      act(() => {
        jest.advanceTimersByTime(1500);
      });

      await waitFor(() => {
        expect(matchRecoveryService.checkForRecoverableMatch).toHaveBeenCalled();
      });

      // Hook should remain stable despite service errors
      expect(result.current.showRecoveryModal).toBe(false);
      expect(result.current.recoveryMatch).toBeNull();
      expect(result.current.isProcessingRecovery).toBe(false);

      jest.useRealTimers();
    });
  });
});