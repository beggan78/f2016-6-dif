/**
 * GameScreen Navigation Integration Tests
 * 
 * End-to-end testing suite for critical user workflows involving GameScreen back navigation
 * and data loss prevention. These tests ensure that users cannot accidentally lose match 
 * progress and that the complete user experience flows work correctly.
 * 
 * CRITICAL IMPORTANCE: These tests protect against data loss scenarios that would 
 * severely impact user experience and trust in the application.
 * 
 * Test Coverage:
 * - Complete user workflows from setup → game → back navigation
 * - Data loss prevention across match state transitions
 * - Browser back button integration with modal hierarchy
 * - Error scenarios and edge cases in real usage patterns
 * - Performance under rapid user interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Import components for integration testing
import { GameScreen } from '../components/game/GameScreen';

// Import test utilities and helpers
import {
  createMockGameScreenProps,
  createMockPlayers,
  createMockFormation,
  setupComponentTestEnvironment,
  userInteractions,
  componentAssertions,
  waitForComponent
} from '../components/__tests__/componentTestUtils';

import { VIEWS } from '../constants/viewConstants';
import { TEAM_CONFIGS } from '../game/testUtils';

const originalConsoleError = console.error;

// Mock GameScreen dependencies
jest.mock('../hooks/useGameModals');
jest.mock('../hooks/useGameUIState');  
jest.mock('../hooks/useTeamNameAbbreviation');
jest.mock('../hooks/useFieldPositionHandlers');
jest.mock('../hooks/useQuickTapWithScrollDetection');
jest.mock('../game/handlers/substitutionHandlers');
jest.mock('../game/handlers/fieldPositionHandlers');
jest.mock('../game/handlers/timerHandlers');
jest.mock('../game/handlers/scoreHandlers');
jest.mock('../game/handlers/goalieHandlers');
jest.mock('../utils/playerUtils', () => ({
  ...jest.requireActual('../utils/playerUtils'),
  hasActiveSubstitutes: jest.fn()
}));

jest.mock('../components/game/formations/FormationRenderer', () => ({
  FormationRenderer: ({ renderSection = 'all', ...props }) => {
    const testId = renderSection === 'all' ? 'formation-renderer' : `formation-renderer-${renderSection}`;
    return (
      <div data-testid={testId} {...props}>Mock Formation</div>
    );
  }
}));

// Mock external dependencies that aren't part of the integration test
jest.mock('../services/audioAlertService', () => ({
  playSound: jest.fn(),
  preloadSounds: jest.fn()
}));

jest.mock('../utils/gameEventLogger', () => ({
  ...jest.requireActual('../utils/gameEventLogger'),
  initializeEventLogger: jest.fn(),
  logEvent: jest.fn(),
  getGameEvents: jest.fn(() => []),
  calculateMatchTime: jest.fn(() => '00:00')
}));

// Mock match services
jest.mock('../services/matchStateManager', () => ({
  createMatch: jest.fn(),
  updateMatch: jest.fn(),
  getMatch: jest.fn(),
  clearStoredState: jest.fn()
}));

describe('GameScreen Navigation Integration Tests', () => {
  let mockEnvironment;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockEnvironment = setupComponentTestEnvironment();
    
    // Setup GameScreen hook mocks
    setupGameScreenHooks();
    
    // Suppress console warnings for testing
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation((message, ...args) => {
      if (typeof message === 'string' && message.includes('React does not recognize')) {
        return;
      }
      originalConsoleError(message, ...args);
    });
  });

  function setupGameScreenHooks() {
    // Setup game modals hook
    require('../hooks/useGameModals').useGameModals.mockReturnValue({
      modals: {
        fieldPlayer: { isOpen: false, type: null, target: null, playerName: '', sourcePlayerId: null, availablePlayers: [], showPositionOptions: false },
        substitute: { isOpen: false, playerId: null, playerName: '', isCurrentlyInactive: false, canSetAsNextToGoIn: false },
        substituteSelection: {
          isOpen: false,
          fieldPlayerName: '',
          fieldPlayerId: null,
          availableSubstitutes: []
        },
        goalie: { isOpen: false, currentGoalieName: '', availablePlayers: [] },
        scoreEdit: { isOpen: false },
        undoConfirm: { isOpen: false },
        goalScorer: { isOpen: false, eventId: null, team: 'own', mode: 'new', matchTime: '00:00', periodNumber: 1, existingGoalData: null }
      },
      openFieldPlayerModal: jest.fn(),
      closeFieldPlayerModal: jest.fn(),
      openSubstituteModal: jest.fn(),
      closeSubstituteModal: jest.fn(),
      openGoalieModal: jest.fn(),
      closeGoalieModal: jest.fn(),
      openScoreEditModal: jest.fn(),
      closeScoreEditModal: jest.fn(),
      openUndoConfirmModal: jest.fn(),
      closeUndoConfirmModal: jest.fn(),
      openGoalScorerModal: jest.fn(),
      closeGoalScorerModal: jest.fn()
    });
    
    // Setup game UI state hook
    require('../hooks/useGameUIState').useGameUIState.mockReturnValue({
      animationState: { type: 'none', phase: 'idle', data: {} },
      setAnimationState: jest.fn(),
      recentlySubstitutedPlayers: new Set(),
      setRecentlySubstitutedPlayers: jest.fn(),
      addRecentlySubstitutedPlayer: jest.fn(),
      removeRecentlySubstitutedPlayer: jest.fn(),
      clearRecentlySubstitutedPlayers: jest.fn(),
      hideNextOffIndicator: false,
      setHideNextOffIndicator: jest.fn(),
      lastSubstitution: null,
      setLastSubstitution: jest.fn(),
      updateLastSubstitution: jest.fn(),
      clearLastSubstitution: jest.fn(),
      shouldSubstituteNow: false,
      setShouldSubstituteNow: jest.fn(),
      resetAnimationState: jest.fn()
    });
    
    // Setup other hooks
    require('../hooks/useTeamNameAbbreviation').useTeamNameAbbreviation.mockReturnValue({
      scoreRowRef: { current: null },
      displayOwnTeam: 'Test Team',
      displayOpponentTeam: 'Test Opponent'
    });
    
    require('../hooks/useFieldPositionHandlers').useFieldPositionHandlers.mockReturnValue({
      handleFieldPlayerClick: jest.fn(),
      handleFieldPlayerQuickTap: jest.fn()
    });
    
    require('../hooks/useQuickTapWithScrollDetection').useQuickTapWithScrollDetection.mockReturnValue({
      onTouchStart: jest.fn(),
      onTouchEnd: jest.fn(),
      onMouseDown: jest.fn(),
      onMouseUp: jest.fn(),
      onMouseLeave: jest.fn()
    });

    // Setup handler creators
    require('../game/handlers/substitutionHandlers').createSubstitutionHandlers.mockReturnValue({
      handleSubstitution: jest.fn(),
      handleSubstitutionWithHighlight: jest.fn(),
      handleUndo: jest.fn(),
      handleSetNextSubstitution: jest.fn(),
      handleSubstituteNow: jest.fn(),
      handleCancelFieldPlayerModal: jest.fn(),
      handleChangePosition: jest.fn(),
      handleInactivatePlayer: jest.fn(),
      handleActivatePlayer: jest.fn(),
      handleCancelSubstituteModal: jest.fn(),
      handleSetAsNextToGoIn: jest.fn()
    });

    require('../game/handlers/fieldPositionHandlers').createFieldPositionHandlers.mockReturnValue({
      handleFieldPlayerClick: jest.fn(),
      handleFieldPlayerQuickTap: jest.fn(),
      handleSubstituteClick: jest.fn(),
      handleGoalieClick: jest.fn()
    });

    require('../game/handlers/timerHandlers').createTimerHandlers.mockReturnValue({
      handlePauseTimer: jest.fn(),
      handleResumeTimer: jest.fn(),
      handleResetTimer: jest.fn()
    });

    require('../game/handlers/scoreHandlers').createScoreHandlers.mockReturnValue({
      handleAddGoalScored: jest.fn(),
      handleAddGoalConceded: jest.fn(),
      handleSelectGoalScorer: jest.fn(),
      handleCorrectGoalScorer: jest.fn(),
      handleScoreEdit: jest.fn(),
      handleOpenScoreEdit: jest.fn(),
      scoreCallback: jest.fn()
    });

    require('../game/handlers/goalieHandlers').createGoalieHandlers.mockReturnValue({
      goalieCallback: jest.fn(),
      handleCancelGoalieModal: jest.fn(),
      handleSelectNewGoalie: jest.fn()
    });

    require('../utils/playerUtils').hasActiveSubstitutes.mockReturnValue(true);
  }

  afterEach(() => {
    mockEnvironment.cleanup();
    jest.restoreAllMocks();
  });

  describe('Critical Data Loss Prevention Workflows', () => {
    describe('User starts match → presses back → sees modal → cancels → continues playing', () => {
      it('should protect running match data when user cancels abandonment', async () => {
        // Mock browser navigation functions
        const mockPushNavigationState = jest.fn();
        const mockRemoveFromNavigationStack = jest.fn();
        const mockOnNavigateBack = jest.fn();
        const mockSetShowNewGameModal = jest.fn();

        // Create props for a running match with active data
        const props = {
          ...createMockGameScreenProps(),
          matchState: 'running',
          matchTimerSeconds: 600,  // 10 minutes of progress
          subTimerSeconds: 90,     // Active substitution timer
          ownScore: 2,             // Goals scored
          opponentScore: 1,        // Match in progress
          onNavigateBack: mockOnNavigateBack,
          onNavigateTo: jest.fn(),
          setShowNewGameModal: mockSetShowNewGameModal,
          pushNavigationState: mockPushNavigationState,
          removeFromNavigationStack: mockRemoveFromNavigationStack,
          allPlayers: createMockPlayers().map(player => ({
            ...player,
            timeOnFieldSeconds: Math.random() * 300 // Players have playing time
          }))
        };

        render(<GameScreen {...props} />);

        // Step 1: User presses back button (simulated via registered handler)
        const backHandler = mockPushNavigationState.mock.calls[0][0];
        act(() => {
          backHandler();
        });

        // Step 2: Should show abandonment warning modal
        expect(mockSetShowNewGameModal).toHaveBeenCalledWith(true);
        expect(mockOnNavigateBack).not.toHaveBeenCalled(); // Should NOT navigate yet

        // Step 3: Modal registers close handler
        expect(mockPushNavigationState).toHaveBeenCalledTimes(2);
        expect(mockPushNavigationState).toHaveBeenNthCalledWith(2,
          expect.any(Function),
          'GameScreen-CloseAbandonmentModal'
        );

        // Step 4: User cancels (closes modal via back button)
        const modalCloseHandler = mockPushNavigationState.mock.calls[1][0];
        act(() => {
          modalCloseHandler();
        });

        // Step 5: Modal should be closed, match continues
        expect(mockSetShowNewGameModal).toHaveBeenCalledWith(false);
        expect(mockOnNavigateBack).not.toHaveBeenCalled(); // Still no navigation

        // Step 6: Game should continue normally
        expect(screen.getByTestId('formation-renderer-field')).toBeInTheDocument();
        expect(screen.getByTestId('formation-renderer-substitutes')).toBeInTheDocument();
        
        // Verify match data is preserved
        const scoreDisplay = screen.getByText('2 - 1');
        expect(scoreDisplay).toBeInTheDocument();
      });

      it('should handle multiple cancellation cycles correctly', async () => {
        const mockPushNavigationState = jest.fn();
        const mockOnNavigateBack = jest.fn();
        const mockSetShowNewGameModal = jest.fn();

        const props = {
          ...createMockGameScreenProps(),
          matchState: 'running',
          matchTimerSeconds: 900,
          onNavigateBack: mockOnNavigateBack,
          onNavigateTo: jest.fn(),
          setShowNewGameModal: mockSetShowNewGameModal,
          pushNavigationState: mockPushNavigationState,
          removeFromNavigationStack: jest.fn()
        };

        render(<GameScreen {...props} />);

        // Cycle 1: Back → Modal → Cancel
        const backHandler = mockPushNavigationState.mock.calls[0][0];
        act(() => { backHandler(); });
        expect(mockSetShowNewGameModal).toHaveBeenCalledWith(true);

        const modalCloseHandler1 = mockPushNavigationState.mock.calls[1][0];
        act(() => { modalCloseHandler1(); });
        expect(mockSetShowNewGameModal).toHaveBeenCalledWith(false);

        // Clear mock for next cycle
        mockSetShowNewGameModal.mockClear();

        // Cycle 2: Back → Modal → Cancel (user tries again)
        act(() => { backHandler(); });
        expect(mockSetShowNewGameModal).toHaveBeenCalledWith(true);

        // Find the latest modal close handler (should be the last call)
        const latestModalCloseHandler = mockPushNavigationState.mock.calls[mockPushNavigationState.mock.calls.length - 1][0];
        act(() => { latestModalCloseHandler(); });
        expect(mockSetShowNewGameModal).toHaveBeenCalledWith(false);

        // Should never navigate
        expect(mockOnNavigateBack).not.toHaveBeenCalled();
      });
    });

    describe('User starts match → presses back → sees modal → confirms → returns to setup', () => {
      it('should allow navigation after user confirms abandonment', async () => {
        // This test simulates the complete abandonment flow
        // Note: The actual abandonment is handled by App.js modal, but we test the trigger

        const mockPushNavigationState = jest.fn();
        const mockOnNavigateBack = jest.fn();
        const mockSetShowNewGameModal = jest.fn();

        const props = {
          ...createMockGameScreenProps(),
          matchState: 'running',
          matchTimerSeconds: 300,
          ownScore: 1,
          onNavigateBack: mockOnNavigateBack,
          onNavigateTo: jest.fn(),
          setShowNewGameModal: mockSetShowNewGameModal,
          pushNavigationState: mockPushNavigationState,
          removeFromNavigationStack: jest.fn()
        };

        render(<GameScreen {...props} />);

        // Step 1: User presses back
        const backHandler = mockPushNavigationState.mock.calls[0][0];
        act(() => {
          backHandler();
        });

        // Step 2: Should trigger abandonment modal
        expect(mockSetShowNewGameModal).toHaveBeenCalledWith(true);
        expect(mockOnNavigateBack).not.toHaveBeenCalled();

        // Step 3: Verify modal hierarchy is set up for further back button handling
        expect(mockPushNavigationState).toHaveBeenCalledTimes(2);
        expect(mockPushNavigationState).toHaveBeenNthCalledWith(2,
          expect.any(Function),
          'GameScreen-CloseAbandonmentModal'
        );

        // Note: The actual confirmation and navigation to setup would be handled
        // by the modal component in App.js, which is outside this component's scope
        // This test verifies GameScreen correctly triggers the warning system
      });
    });

    describe('User in pending match → presses back → directly returns to setup', () => {
      it('should allow safe direct navigation for pending matches', async () => {
        const mockPushNavigationState = jest.fn();
        const mockOnNavigateBack = jest.fn();
        const mockSetShowNewGameModal = jest.fn();

        const props = {
          ...createMockGameScreenProps(),
          matchState: 'pending', // No match data to lose
          matchTimerSeconds: 0,   // No time elapsed
          ownScore: 0,
          opponentScore: 0,
          onNavigateBack: mockOnNavigateBack,
          onNavigateTo: jest.fn(),
          setShowNewGameModal: mockSetShowNewGameModal,
          pushNavigationState: mockPushNavigationState,
          removeFromNavigationStack: jest.fn()
        };

        render(<GameScreen {...props} />);

        // Step 1: User presses back
        const backHandler = mockPushNavigationState.mock.calls[0][0];
        act(() => {
          backHandler();
        });

        // Step 2: Should navigate directly to setup (no modal)
        expect(mockOnNavigateBack).toHaveBeenCalled();
        expect(mockSetShowNewGameModal).not.toHaveBeenCalled();

        // Step 3: Should not set up modal close handlers
        expect(mockPushNavigationState).toHaveBeenCalledTimes(1);
        expect(mockPushNavigationState).toHaveBeenCalledWith(
          expect.any(Function),
          'GameScreen-BackToSetup'
        );
      });

      it('should transition correctly from pending to running state navigation', async () => {
        const mockPushNavigationState = jest.fn();
        const mockOnNavigateBack = jest.fn();
        const mockSetShowNewGameModal = jest.fn();
        const mockRemoveFromNavigationStack = jest.fn();

        const props = {
          ...createMockGameScreenProps(),
          matchState: 'pending',
          onNavigateBack: mockOnNavigateBack,
          onNavigateTo: jest.fn(),
          setShowNewGameModal: mockSetShowNewGameModal,
          pushNavigationState: mockPushNavigationState,
          removeFromNavigationStack: mockRemoveFromNavigationStack
        };

        const { rerender } = render(<GameScreen {...props} />);

        // Test pending state navigation
        let backHandler = mockPushNavigationState.mock.calls[0][0];
        act(() => { backHandler(); });
        expect(mockOnNavigateBack).toHaveBeenCalled();

        // Reset mocks
        mockOnNavigateBack.mockClear();
        mockSetShowNewGameModal.mockClear();
        mockPushNavigationState.mockClear();

        // Transition to running state
        rerender(<GameScreen {...props} matchState="running" />);

        // Test running state navigation
        backHandler = mockPushNavigationState.mock.calls[0][0];
        act(() => { backHandler(); });
        expect(mockOnNavigateBack).not.toHaveBeenCalled(); // Should not navigate directly
        expect(mockSetShowNewGameModal).toHaveBeenCalledWith(true); // Should show modal

        // Cleanup should have been called during transition
        expect(mockRemoveFromNavigationStack).toHaveBeenCalled();
      });
    });

    describe('Modal hierarchy: back closes modal → back again shows modal', () => {
      it('should handle modal hierarchy correctly with browser back button', async () => {
        const mockPushNavigationState = jest.fn();
        const mockOnNavigateBack = jest.fn();
        const mockSetShowNewGameModal = jest.fn();

        const props = {
          ...createMockGameScreenProps(),
          matchState: 'running',
          onNavigateBack: mockOnNavigateBack,
          onNavigateTo: jest.fn(),
          setShowNewGameModal: mockSetShowNewGameModal,
          pushNavigationState: mockPushNavigationState,
          removeFromNavigationStack: jest.fn()
        };

        render(<GameScreen {...props} />);

        // Step 1: Back button shows modal
        const backHandler = mockPushNavigationState.mock.calls[0][0];
        act(() => { backHandler(); });
        expect(mockSetShowNewGameModal).toHaveBeenCalledWith(true);

        // Step 2: Back button closes modal
        const modalCloseHandler = mockPushNavigationState.mock.calls[1][0];
        act(() => { modalCloseHandler(); });
        expect(mockSetShowNewGameModal).toHaveBeenCalledWith(false);

        // Clear mock to track next modal show
        mockSetShowNewGameModal.mockClear();

        // Step 3: Back button shows modal again
        act(() => { backHandler(); });
        expect(mockSetShowNewGameModal).toHaveBeenCalledWith(true);

        // Should never navigate directly
        expect(mockOnNavigateBack).not.toHaveBeenCalled();
      });
    });
  });

  describe('Browser Back Button Integration', () => {
    it('should register and cleanup browser back handlers correctly', async () => {
      const mockPushNavigationState = jest.fn();
      const mockRemoveFromNavigationStack = jest.fn();

      const props = {
        ...createMockGameScreenProps(),
        matchState: 'running',
        pushNavigationState: mockPushNavigationState,
        removeFromNavigationStack: mockRemoveFromNavigationStack
      };

      const { unmount } = render(<GameScreen {...props} />);

      // Should register handler on mount
      expect(mockPushNavigationState).toHaveBeenCalledWith(
        expect.any(Function),
        'GameScreen-MatchAbandonment'
      );

      // Should cleanup on unmount
      unmount();
      expect(mockRemoveFromNavigationStack).toHaveBeenCalled();
    });

    it('should handle navigation stack cleanup during state transitions', async () => {
      const mockPushNavigationState = jest.fn();
      const mockRemoveFromNavigationStack = jest.fn();

      const props = {
        ...createMockGameScreenProps(),
        matchState: 'pending',
        pushNavigationState: mockPushNavigationState,
        removeFromNavigationStack: mockRemoveFromNavigationStack
      };

      const { rerender } = render(<GameScreen {...props} />);

      // Should register pending handler
      expect(mockPushNavigationState).toHaveBeenCalledWith(
        expect.any(Function),
        'GameScreen-BackToSetup'
      );

      // Transition to running
      rerender(<GameScreen {...props} matchState="running" />);

      // Should cleanup old handler and register new one
      expect(mockRemoveFromNavigationStack).toHaveBeenCalled();
      expect(mockPushNavigationState).toHaveBeenCalledWith(
        expect.any(Function),
        'GameScreen-MatchAbandonment'
      );

      // Transition to finished (no handler)
      rerender(<GameScreen {...props} matchState="finished" />);

      // Should cleanup handler
      expect(mockRemoveFromNavigationStack).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Cases & Error Scenarios', () => {
    it('should handle missing props gracefully without crashing', async () => {
      const minimalProps = {
        ...createMockGameScreenProps(),
        matchState: 'running',
        // Missing pushNavigationState and other optional props
        pushNavigationState: null,
        removeFromNavigationStack: null,
        onNavigateBack: null,
        onNavigateTo: null,
        setShowNewGameModal: null
      };

      expect(() => render(<GameScreen {...minimalProps} />)).not.toThrow();
    });

    it('should handle rapid user interactions without breaking state', async () => {
      const mockPushNavigationState = jest.fn();
      const mockSetShowNewGameModal = jest.fn();

      const props = {
        ...createMockGameScreenProps(),
        matchState: 'running',
        pushNavigationState: mockPushNavigationState,
        setShowNewGameModal: mockSetShowNewGameModal,
        removeFromNavigationStack: jest.fn()
      };

      render(<GameScreen {...props} />);

      const backHandler = mockPushNavigationState.mock.calls[0][0];

      // Simulate rapid back button presses
      act(() => {
        backHandler();
        backHandler();
        backHandler();
      });

      // Should handle multiple calls gracefully
      expect(mockSetShowNewGameModal).toHaveBeenCalledWith(true);
      expect(() => backHandler()).not.toThrow();
    });

    it('should maintain data integrity during match state changes', async () => {
      const mockPushNavigationState = jest.fn();
      const mockOnNavigateBack = jest.fn();
      const mockSetShowNewGameModal = jest.fn();

      const initialProps = {
        ...createMockGameScreenProps(),
        matchState: 'pending',
        matchTimerSeconds: 0,
        ownScore: 0,
        pushNavigationState: mockPushNavigationState,
        onNavigateBack: mockOnNavigateBack,
        onNavigateTo: jest.fn(),
        setShowNewGameModal: mockSetShowNewGameModal,
        removeFromNavigationStack: jest.fn()
      };

      const { rerender } = render(<GameScreen {...initialProps} />);

      // Start with pending - should allow direct navigation
      let backHandler = mockPushNavigationState.mock.calls[0][0];
      act(() => { backHandler(); });
      expect(mockOnNavigateBack).toHaveBeenCalled();

      // Reset mocks
      mockOnNavigateBack.mockClear();
      mockPushNavigationState.mockClear();

      // Update to running state with active data
      const runningProps = {
        ...initialProps,
        matchState: 'running',
        matchTimerSeconds: 300,
        ownScore: 1
      };

      rerender(<GameScreen {...runningProps} />);

      // Now should require confirmation
      backHandler = mockPushNavigationState.mock.calls[0][0];
      act(() => { backHandler(); });
      expect(mockOnNavigateBack).not.toHaveBeenCalled();
      expect(mockSetShowNewGameModal).toHaveBeenCalledWith(true);
    });

    it('should handle component re-renders during navigation flow', async () => {
      const mockPushNavigationState = jest.fn();
      const mockSetShowNewGameModal = jest.fn();

      const props = {
        ...createMockGameScreenProps(),
        matchState: 'running',
        pushNavigationState: mockPushNavigationState,
        setShowNewGameModal: mockSetShowNewGameModal,
        removeFromNavigationStack: jest.fn()
      };

      const { rerender } = render(<GameScreen {...props} />);

      // Trigger back navigation
      const backHandler = mockPushNavigationState.mock.calls[0][0];
      act(() => { backHandler(); });
      expect(mockSetShowNewGameModal).toHaveBeenCalledWith(true);

      // Simulate re-render (common during state updates)
      rerender(<GameScreen {...props} />);

      // Navigation should still work correctly
      expect(() => backHandler()).not.toThrow();
      
      // Modal close handler should still be accessible
      const modalCloseHandler = mockPushNavigationState.mock.calls[1][0];
      expect(() => modalCloseHandler()).not.toThrow();
    });
  });

  describe('Performance and Memory Management', () => {
    it('should not leak memory with repeated mount/unmount cycles', async () => {
      const mockPushNavigationState = jest.fn();
      const mockRemoveFromNavigationStack = jest.fn();

      const props = {
        ...createMockGameScreenProps(),
        matchState: 'running',
        pushNavigationState: mockPushNavigationState,
        removeFromNavigationStack: mockRemoveFromNavigationStack
      };

      // Mount and unmount multiple times
      for (let i = 0; i < 5; i++) {
        const { unmount } = render(<GameScreen {...props} />);
        unmount();
      }

      // Should register and cleanup handlers for each cycle
      expect(mockPushNavigationState).toHaveBeenCalledTimes(5);
      expect(mockRemoveFromNavigationStack).toHaveBeenCalledTimes(5);
    });

    it('should handle handler cleanup during rapid state changes', async () => {
      const mockPushNavigationState = jest.fn();
      const mockRemoveFromNavigationStack = jest.fn();

      const props = {
        ...createMockGameScreenProps(),
        matchState: 'pending',
        pushNavigationState: mockPushNavigationState,
        removeFromNavigationStack: mockRemoveFromNavigationStack
      };

      const { rerender } = render(<GameScreen {...props} />);

      // Rapid state transitions
      const states = ['running', 'finished', 'pending'];
      states.forEach(state => {
        rerender(<GameScreen {...props} matchState={state} />);
      });

      // Should handle all transitions without memory leaks
      expect(mockRemoveFromNavigationStack.mock.calls.length).toBeGreaterThan(0);
      expect(mockRemoveFromNavigationStack.mock.calls.length).toBeLessThanOrEqual(states.length);
    });
  });
});
