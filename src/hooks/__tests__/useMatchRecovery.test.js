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
import * as pendingMatchService from '../../services/pendingMatchService';

// Mock the services
jest.mock('../../services/matchRecoveryService', () => ({
  checkForRecoverableMatch: jest.fn(),
  deleteAbandonedMatch: jest.fn(),
  getRecoveryMatchData: jest.fn(),
  validateRecoveryData: jest.fn(),
  checkForPendingMatches: jest.fn()
}));

jest.mock('../../services/matchStateManager', () => ({
  updateMatchToConfirmed: jest.fn(),
  updatePlayerMatchStatsOnFinish: jest.fn()
}));

jest.mock('../../services/pendingMatchService', () => ({
  resumePendingMatch: jest.fn(),
  deletePendingMatch: jest.fn()
}));

describe('useMatchRecovery', () => {
  // Mock parameters
  const mockParams = {
    user: { id: 'user-123', email: 'test@example.com' },
    currentTeam: { id: 'team-123', name: 'Test Team' },
    invitationParams: null,
    needsProfileCompletion: false,
    gameState: { 
      clearStoredState: jest.fn(),
      setTeamConfig: jest.fn(),
      setSelectedFormation: jest.fn(),
      setSelectedSquadIds: jest.fn(),
      setNumPeriods: jest.fn(),
      setPeriodDurationMinutes: jest.fn(),
      setOpponentTeam: jest.fn(),
      setCaptainId: jest.fn(),
      setMatchType: jest.fn(),
      setCurrentMatchId: jest.fn()
    },
    setSuccessMessage: jest.fn(),
    navigateToView: jest.fn()
  };

  const mockRecoveryMatch = {
    id: 'match-123',
    team_id: 'team-123',
    state: 'finished',
    opponent: 'Test Opponents',
    format: '5v5',
    formation: '2-2'
  };

  const mockLocalData = {
    allPlayers: [
      { 
        id: 'player-1',
        name: 'Player One',
        stats: { timeOnFieldSeconds: 1200 }
      }
    ],
    goalScorers: { 'event-1': 'player-1' },
    matchEvents: [{ id: 'event-1', type: 'goal' }]
  };

  const mockPendingMatches = [
    {
      id: 'pending-match-1',
      opponent: 'Test Opponents A',
      created_at: '2024-03-01T10:00:00Z',
      formation: '2-2',
      substitution_config: { type: 'individual' }
    },
    {
      id: 'pending-match-2',
      opponent: 'Test Opponents B',
      created_at: '2024-03-01T11:00:00Z',
      formation: '1-2-1',
      substitution_config: { type: 'pairs', pairRoleRotation: 'swap_every_rotation' }
    }
  ];

  const mockReconstructedGameState = {
    teamConfig: {
      format: '5v5',
      formation: '2-2',
      substitutionType: 'individual'
    },
    selectedFormation: '2-2',
    selectedSquadIds: ['player-1', 'player-2'],
    periods: 3,
    periodDurationMinutes: 15,
    opponentTeam: 'Test Opponents A',
    captainId: 'player-1',
    matchType: 'friendly',
    currentMatchId: 'pending-match-1'
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
    matchRecoveryService.checkForPendingMatches.mockResolvedValue({
      success: false,
      matches: []
    });
    matchRecoveryService.getRecoveryMatchData.mockReturnValue(null);
    matchRecoveryService.validateRecoveryData.mockReturnValue(false);
    matchRecoveryService.deleteAbandonedMatch.mockResolvedValue({ success: true });
    matchStateManager.updateMatchToConfirmed.mockResolvedValue({ success: true });
    matchStateManager.updatePlayerMatchStatsOnFinish.mockResolvedValue({ 
      success: true, 
      updated: 1 
    });
    pendingMatchService.resumePendingMatch.mockResolvedValue({
      success: true,
      gameState: mockReconstructedGameState
    });
    pendingMatchService.deletePendingMatch.mockResolvedValue({ success: true });
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
      matchRecoveryService.getRecoveryMatchData.mockReturnValue(mockLocalData);
      matchRecoveryService.validateRecoveryData.mockReturnValue(true);

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

    it('should not show modal if validation fails', async () => {
      // Mock detection but validation failure
      matchRecoveryService.checkForRecoverableMatch.mockResolvedValue({
        success: true,
        match: mockRecoveryMatch
      });
      matchRecoveryService.getRecoveryMatchData.mockReturnValue(mockLocalData);
      matchRecoveryService.validateRecoveryData.mockReturnValue(false);

      const { result } = renderHook(() => useMatchRecovery(mockParams));

      act(() => {
        jest.advanceTimersByTime(1000);
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
        jest.advanceTimersByTime(1000);
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
      
      // Mock data retrieval
      matchRecoveryService.getRecoveryMatchData.mockReturnValue(mockLocalData);

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
        jest.advanceTimersByTime(1000);
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
        jest.advanceTimersByTime(1000);
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

  describe('pending match functionality', () => {
    it('should include pending match state in return value', () => {
      const { result } = renderHook(() => useMatchRecovery(mockParams));

      // Check that new pending match state is included
      expect(result.current.showPendingMatchesModal).toBe(false);
      expect(result.current.pendingMatches).toEqual([]);
      expect(result.current.isLoadingPendingMatches).toBe(false);
      expect(result.current.pendingMatchError).toBe('');
    });

    it('should include pending match handlers in return value', () => {
      const { result } = renderHook(() => useMatchRecovery(mockParams));

      // Check that all new handlers are functions
      expect(typeof result.current.handleResumePendingMatch).toBe('function');
      expect(typeof result.current.handleDeletePendingMatch).toBe('function');
      expect(typeof result.current.handleClosePendingModal).toBe('function');
      expect(typeof result.current.handleConfigureNewMatch).toBe('function');
    });

    it('should handle missing parameters gracefully in pending match handlers', async () => {
      const { result } = renderHook(() => useMatchRecovery(mockParams));

      // Test handlers with invalid parameters
      await act(async () => {
        await result.current.handleResumePendingMatch(null);
        await result.current.handleDeletePendingMatch(null);
      });

      // Should not crash and maintain stable state
      expect(result.current.isLoadingPendingMatches).toBe(false);
      expect(result.current.showPendingMatchesModal).toBe(false);
    });

    it('should handle configureNewMatch navigation', () => {
      const { result } = renderHook(() => useMatchRecovery(mockParams));

      act(() => {
        result.current.handleConfigureNewMatch();
      });

      expect(mockParams.navigateToView).toHaveBeenCalledWith('CONFIG');
    });
  });

  describe('pending match detection and display', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should detect and show pending matches when no finished match found', async () => {
      // Mock no finished matches but pending matches available
      matchRecoveryService.checkForRecoverableMatch.mockResolvedValue({
        success: false,
        match: null
      });
      matchRecoveryService.checkForPendingMatches.mockResolvedValue({
        success: true,
        matches: mockPendingMatches
      });

      const { result } = renderHook(() => useMatchRecovery(mockParams));

      // Fast-forward timers and wait for async operations
      act(() => {
        jest.advanceTimersByTime(1500);
      });

      await waitFor(() => {
        expect(result.current.showPendingMatchesModal).toBe(true);
        expect(result.current.pendingMatches).toEqual(mockPendingMatches);
      });

      expect(matchRecoveryService.checkForRecoverableMatch).toHaveBeenCalled();
      expect(matchRecoveryService.checkForPendingMatches).toHaveBeenCalledWith('team-123');
    });

    it('should prioritize finished match over pending matches', async () => {
      // Mock both finished and pending matches available
      matchRecoveryService.checkForRecoverableMatch.mockResolvedValue({
        success: true,
        match: mockRecoveryMatch
      });
      matchRecoveryService.getRecoveryMatchData.mockReturnValue(mockLocalData);
      matchRecoveryService.validateRecoveryData.mockReturnValue(true);
      matchRecoveryService.checkForPendingMatches.mockResolvedValue({
        success: true,
        matches: mockPendingMatches
      });

      const { result } = renderHook(() => useMatchRecovery(mockParams));

      act(() => {
        jest.advanceTimersByTime(1500);
      });

      await waitFor(() => {
        expect(result.current.showRecoveryModal).toBe(true);
        expect(result.current.showPendingMatchesModal).toBe(false);
      });

      // Should not check for pending matches when finished match is found
      expect(matchRecoveryService.checkForPendingMatches).not.toHaveBeenCalled();
    });

    it('should not show pending matches modal when no matches found', async () => {
      matchRecoveryService.checkForRecoverableMatch.mockResolvedValue({
        success: false,
        match: null
      });
      matchRecoveryService.checkForPendingMatches.mockResolvedValue({
        success: true,
        matches: []
      });

      const { result } = renderHook(() => useMatchRecovery(mockParams));

      act(() => {
        jest.advanceTimersByTime(1500);
      });

      await waitFor(() => {
        expect(matchRecoveryService.checkForPendingMatches).toHaveBeenCalled();
      });

      expect(result.current.showPendingMatchesModal).toBe(false);
      expect(result.current.pendingMatches).toEqual([]);
    });

    it('should handle pending match service errors gracefully', async () => {
      matchRecoveryService.checkForRecoverableMatch.mockResolvedValue({
        success: false,
        match: null
      });
      matchRecoveryService.checkForPendingMatches.mockRejectedValue(
        new Error('Pending match service error')
      );

      const { result } = renderHook(() => useMatchRecovery(mockParams));

      act(() => {
        jest.advanceTimersByTime(1500);
      });

      await waitFor(() => {
        expect(matchRecoveryService.checkForPendingMatches).toHaveBeenCalled();
      });

      expect(result.current.showPendingMatchesModal).toBe(false);
      expect(result.current.pendingMatchError).toBe('Failed to check for pending matches');
    });
  });

  describe('handleResumePendingMatch', () => {
    it('should successfully resume pending match and load game state', async () => {
      const { result } = renderHook(() => useMatchRecovery(mockParams));

      await act(async () => {
        await result.current.handleResumePendingMatch('pending-match-1');
      });

      expect(pendingMatchService.resumePendingMatch).toHaveBeenCalledWith('pending-match-1');
      expect(mockParams.gameState.clearStoredState).toHaveBeenCalled();
      expect(mockParams.gameState.setTeamConfig).toHaveBeenCalledWith(mockReconstructedGameState.teamConfig);
      expect(mockParams.gameState.setSelectedFormation).toHaveBeenCalledWith(mockReconstructedGameState.selectedFormation);
      expect(mockParams.gameState.setSelectedSquadIds).toHaveBeenCalledWith(mockReconstructedGameState.selectedSquadIds);
      expect(mockParams.gameState.setOpponentTeam).toHaveBeenCalledWith(mockReconstructedGameState.opponentTeam);
      expect(mockParams.gameState.setCurrentMatchId).toHaveBeenCalledWith(mockReconstructedGameState.currentMatchId);
      expect(mockParams.navigateToView).toHaveBeenCalledWith('CONFIG');
      expect(mockParams.setSuccessMessage).toHaveBeenCalledWith('Match resumed successfully! Configure any final settings and click "Enter Game".');
    });

    it('should handle missing match ID gracefully', async () => {
      const { result } = renderHook(() => useMatchRecovery(mockParams));

      await act(async () => {
        await result.current.handleResumePendingMatch(null);
      });

      expect(pendingMatchService.resumePendingMatch).not.toHaveBeenCalled();
      expect(result.current.isLoadingPendingMatches).toBe(false);
    });

    it('should handle resume service errors', async () => {
      pendingMatchService.resumePendingMatch.mockResolvedValue({
        success: false,
        error: 'Match not found'
      });

      const { result } = renderHook(() => useMatchRecovery(mockParams));

      await act(async () => {
        await result.current.handleResumePendingMatch('pending-match-1');
      });

      expect(result.current.pendingMatchError).toBe('Failed to resume match: Match not found');
      expect(result.current.isLoadingPendingMatches).toBe(false);
    });

    it('should handle loading state during resume operation', async () => {
      const { result } = renderHook(() => useMatchRecovery(mockParams));

      await act(async () => {
        await result.current.handleResumePendingMatch('pending-match-1');
      });

      // Check loading state is cleared after operation
      expect(result.current.isLoadingPendingMatches).toBe(false);
    });
  });

  describe('handleDeletePendingMatch', () => {
    it('should have delete handler function available', () => {
      const { result } = renderHook(() => useMatchRecovery(mockParams));

      expect(typeof result.current.handleDeletePendingMatch).toBe('function');
    });

    it('should call delete service when valid match ID provided', async () => {
      const { result } = renderHook(() => useMatchRecovery(mockParams));

      await act(async () => {
        await result.current.handleDeletePendingMatch('pending-match-1');
      });

      expect(pendingMatchService.deletePendingMatch).toHaveBeenCalledWith('pending-match-1');
    });
  });

  describe('handleClosePendingModal', () => {
    it('should be available as function', () => {
      const { result } = renderHook(() => useMatchRecovery(mockParams));

      expect(typeof result.current.handleClosePendingModal).toBe('function');
    });
  
    it('should close modal when called', () => {
      const { result } = renderHook(() => useMatchRecovery(mockParams));

      act(() => {
        result.current.handleClosePendingModal();
      });

      expect(result.current.showPendingMatchesModal).toBe(false);
    });

  });

  describe('comprehensive state verification', () => {
    it('should return all expected properties and functions', () => {
      const { result } = renderHook(() => useMatchRecovery(mockParams));

      // Finished match recovery properties
      expect(typeof result.current.showRecoveryModal).toBe('boolean');
      expect(result.current.recoveryMatch).toBeNull();
      expect(typeof result.current.isProcessingRecovery).toBe('boolean');
      expect(typeof result.current.handleSaveRecovery).toBe('function');
      expect(typeof result.current.handleAbandonRecovery).toBe('function');
      expect(typeof result.current.handleCloseRecovery).toBe('function');

      // Pending match properties
      expect(typeof result.current.showPendingMatchesModal).toBe('boolean');
      expect(Array.isArray(result.current.pendingMatches)).toBe(true);
      expect(typeof result.current.isLoadingPendingMatches).toBe('boolean');
      expect(typeof result.current.pendingMatchError).toBe('string');
      expect(typeof result.current.handleResumePendingMatch).toBe('function');
      expect(typeof result.current.handleDeletePendingMatch).toBe('function');
      expect(typeof result.current.handleClosePendingModal).toBe('function');
      expect(typeof result.current.handleConfigureNewMatch).toBe('function');
    });

    it('should maintain consistent initial state', () => {
      const { result } = renderHook(() => useMatchRecovery(mockParams));

      expect(result.current.showRecoveryModal).toBe(false);
      expect(result.current.showPendingMatchesModal).toBe(false);
      expect(result.current.isProcessingRecovery).toBe(false);
      expect(result.current.isLoadingPendingMatches).toBe(false);
      expect(result.current.pendingMatches).toEqual([]);
      expect(result.current.pendingMatchError).toBe('');
      expect(result.current.recoveryMatch).toBeNull();
    });
  });
});