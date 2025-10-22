/**
 * GameScreen Back Navigation Tests
 * 
 * Comprehensive testing suite for GameScreen's critical back navigation and data loss prevention functionality.
 * These tests ensure users cannot accidentally lose match progress and that browser back integration works correctly.
 * 
 * Test Coverage:
 * - Pending match state: Safe direct navigation to setup
 * - Running match state: Data loss prevention with warning modal
 * - Browser back integration: Proper handler registration and cleanup
 * - Modal hierarchy: Back button closes modal before navigation
 * - Critical user flows: All scenarios that could result in data loss
 * 
 * CRITICAL: These tests protect against data loss scenarios that would severely impact user experience.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameScreen } from '../GameScreen';
import {
  createMockGameScreenProps,
  createMockPlayers,
  createMockFormation,
  setupComponentTestEnvironment,
  userInteractions,
  componentAssertions,
  waitForComponent
} from '../../__tests__/componentTestUtils';
import { VIEWS } from '../../../constants/viewConstants';
import { TEAM_CONFIGS } from '../../../game/testUtils';

// Mock external dependencies
jest.mock('../../../hooks/useGameModals');
jest.mock('../../../hooks/useGameUIState');
jest.mock('../../../hooks/useTeamNameAbbreviation');
jest.mock('../../../hooks/useFieldPositionHandlers');
jest.mock('../../../hooks/useQuickTapWithScrollDetection');
jest.mock('../../../game/handlers/substitutionHandlers');
jest.mock('../../../game/handlers/fieldPositionHandlers');
jest.mock('../../../game/handlers/timerHandlers');
jest.mock('../../../game/handlers/scoreHandlers');
jest.mock('../../../game/handlers/goalieHandlers');
jest.mock('../../../utils/playerUtils', () => ({
  ...jest.requireActual('../../../utils/playerUtils'),
  hasActiveSubstitutes: jest.fn()
}));

// Mock the FormationRenderer to avoid complex DOM structure
jest.mock('../formations/FormationRenderer', () => ({
  FormationRenderer: ({ renderSection = 'all', ...props }) => {
    const testId = renderSection === 'all' ? 'formation-renderer' : `formation-renderer-${renderSection}`;
    return (
      <div data-testid={testId} {...props}>Mock Formation</div>
    );
  }
}));

// Note: GameScreen receives pushNavigationState and removeFromNavigationStack as props
// rather than using the hook directly, so we don't need to mock the hook

describe('GameScreen Back Navigation Tests', () => {
  let mockEnvironment;
  let defaultProps;
  let mockPushNavigationState;
  let mockRemoveFromNavigationStack;
  let mockSetView;
  let mockSetShowNewGameModal;

  beforeEach(() => {
    jest.clearAllMocks();
    mockEnvironment = setupComponentTestEnvironment();
    
    // Create mock functions
    mockPushNavigationState = jest.fn();
    mockRemoveFromNavigationStack = jest.fn();
    mockSetView = jest.fn();
    mockSetShowNewGameModal = jest.fn();
    
    // Create default props with our mocked functions
    defaultProps = {
      ...createMockGameScreenProps(),
      setView: mockSetView,
      setShowNewGameModal: mockSetShowNewGameModal,
      pushNavigationState: mockPushNavigationState,
      removeFromNavigationStack: mockRemoveFromNavigationStack
    };
    
    // Setup default hook returns
    setupDefaultHookMocks();
  });

  afterEach(() => {
    mockEnvironment.cleanup();
    jest.restoreAllMocks();
  });

  function setupDefaultHookMocks() {
    // Setup game modals hook
    require('../../../hooks/useGameModals').useGameModals.mockReturnValue({
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
    require('../../../hooks/useGameUIState').useGameUIState.mockReturnValue({
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
      substitutionCountOverride: null,
      setSubstitutionCountOverride: jest.fn(),
      clearSubstitutionCountOverride: jest.fn(),
      shouldResetSubTimerOnNextSub: true,
      setShouldResetSubTimerOnNextSub: jest.fn(),
      resetAnimationState: jest.fn()
    });
    
    // Setup team name abbreviation hook
    require('../../../hooks/useTeamNameAbbreviation').useTeamNameAbbreviation.mockReturnValue({
      scoreRowRef: { current: null },
      displayOwnTeam: 'Test Team',
      displayOpponentTeam: 'Test Opponent'
    });
    
    // Setup field position handlers hook
    require('../../../hooks/useFieldPositionHandlers').useFieldPositionHandlers.mockReturnValue({
      handleFieldPlayerClick: jest.fn(),
      handleFieldPlayerQuickTap: jest.fn()
    });
    
    // Setup quick tap hook
    require('../../../hooks/useQuickTapWithScrollDetection').useQuickTapWithScrollDetection.mockReturnValue({
      onTouchStart: jest.fn(),
      onTouchEnd: jest.fn(),
      onMouseDown: jest.fn(),
      onMouseUp: jest.fn(),
      onMouseLeave: jest.fn()
    });

    // Setup handler creators
    require('../../../game/handlers/substitutionHandlers').createSubstitutionHandlers.mockReturnValue({
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

    require('../../../game/handlers/fieldPositionHandlers').createFieldPositionHandlers.mockReturnValue({
      handleFieldPlayerClick: jest.fn(),
      handleFieldPlayerQuickTap: jest.fn(),
      handleSubstituteClick: jest.fn(),
      handleGoalieClick: jest.fn()
    });

    require('../../../game/handlers/timerHandlers').createTimerHandlers.mockReturnValue({
      handlePauseTimer: jest.fn(),
      handleResumeTimer: jest.fn(),
      handleResetTimer: jest.fn()
    });

    require('../../../game/handlers/scoreHandlers').createScoreHandlers.mockReturnValue({
      handleAddGoalScored: jest.fn(),
      handleAddGoalConceded: jest.fn(),
      handleSelectGoalScorer: jest.fn(),
      handleCorrectGoalScorer: jest.fn(),
      handleScoreEdit: jest.fn(),
      handleOpenScoreEdit: jest.fn(),
      scoreCallback: jest.fn()
    });

    require('../../../game/handlers/goalieHandlers').createGoalieHandlers.mockReturnValue({
      goalieCallback: jest.fn(),
      handleCancelGoalieModal: jest.fn(),
      handleSelectNewGoalie: jest.fn()
    });

    require('../../../utils/playerUtils').hasActiveSubstitutes.mockReturnValue(true);
  }

  describe('Pending Match State - Safe Direct Navigation', () => {
    it('should register browser back handler for pending matches', () => {
      const props = {
        ...defaultProps,
        matchState: 'pending'
      };
      
      render(<GameScreen {...props} />);
      
      // Should register the back to setup handler
      expect(mockPushNavigationState).toHaveBeenCalledWith(
        expect.any(Function),
        'GameScreen-BackToSetup'
      );
      expect(mockPushNavigationState).toHaveBeenCalledTimes(1);
    });

    it('should navigate directly to setup when back handler is called (pending state)', () => {
      const props = {
        ...defaultProps,
        matchState: 'pending'
      };
      
      render(<GameScreen {...props} />);
      
      // Get the registered back handler
      const backHandler = mockPushNavigationState.mock.calls[0][0];
      
      // Execute the back handler
      act(() => {
        backHandler();
      });
      
      // Should navigate to PERIOD_SETUP
      expect(mockSetView).toHaveBeenCalledWith(VIEWS.PERIOD_SETUP);
      expect(mockSetShowNewGameModal).not.toHaveBeenCalled();
    });

    it('should not show warning modal for pending matches', () => {
      const props = {
        ...defaultProps,
        matchState: 'pending'
      };
      
      render(<GameScreen {...props} />);
      
      // Execute the registered back handler
      const backHandler = mockPushNavigationState.mock.calls[0][0];
      act(() => {
        backHandler();
      });
      
      // Should not trigger the warning modal
      expect(mockSetShowNewGameModal).not.toHaveBeenCalled();
    });

    it('should clean up browser back handler when leaving pending state', () => {
      const props = {
        ...defaultProps,
        matchState: 'pending'
      };
      
      const { rerender } = render(<GameScreen {...props} />);
      
      // Change to a different match state
      rerender(<GameScreen {...props} matchState="running" />);
      
      // Should clean up the previous handler
      expect(mockRemoveFromNavigationStack).toHaveBeenCalled();
    });

    it('should clean up browser back handler on component unmount', () => {
      const props = {
        ...defaultProps,
        matchState: 'pending'
      };
      
      const { unmount } = render(<GameScreen {...props} />);
      
      unmount();
      
      // Should clean up handler on unmount
      expect(mockRemoveFromNavigationStack).toHaveBeenCalled();
    });
  });

  describe('Running Match State - Data Loss Prevention', () => {
    it('should register browser back handler for running matches', () => {
      const props = {
        ...defaultProps,
        matchState: 'running'
      };
      
      render(<GameScreen {...props} />);
      
      // Should register the match abandonment handler
      expect(mockPushNavigationState).toHaveBeenCalledWith(
        expect.any(Function),
        'GameScreen-MatchAbandonment'
      );
      expect(mockPushNavigationState).toHaveBeenCalledTimes(1);
    });

    it('should show abandonment warning modal on back button (running state)', () => {
      const props = {
        ...defaultProps,
        matchState: 'running'
      };
      
      render(<GameScreen {...props} />);
      
      // Get the registered back handler
      const backHandler = mockPushNavigationState.mock.calls[0][0];
      
      // Execute the back handler
      act(() => {
        backHandler();
      });
      
      // Should show the new game modal
      expect(mockSetShowNewGameModal).toHaveBeenCalledWith(true);
      expect(mockSetView).not.toHaveBeenCalled();
    });

    it('should register modal close handler when showing abandonment warning', () => {
      const props = {
        ...defaultProps,
        matchState: 'running'
      };
      
      render(<GameScreen {...props} />);
      
      // Execute the back handler to show modal
      const backHandler = mockPushNavigationState.mock.calls[0][0];
      act(() => {
        backHandler();
      });
      
      // Should register modal close handler
      expect(mockPushNavigationState).toHaveBeenCalledTimes(2);
      expect(mockPushNavigationState).toHaveBeenNthCalledWith(2,
        expect.any(Function),
        'GameScreen-CloseAbandonmentModal'
      );
    });

    it('should allow modal closure via back button', () => {
      const props = {
        ...defaultProps,
        matchState: 'running'
      };
      
      render(<GameScreen {...props} />);
      
      // Execute the back handler to show modal
      const backHandler = mockPushNavigationState.mock.calls[0][0];
      act(() => {
        backHandler();
      });
      
      // Get the modal close handler
      const modalCloseHandler = mockPushNavigationState.mock.calls[1][0];
      
      // Execute the modal close handler
      act(() => {
        modalCloseHandler();
      });
      
      // Should close the modal
      expect(mockSetShowNewGameModal).toHaveBeenCalledWith(false);
    });

    it('should prevent navigation during active match without confirmation', () => {
      const props = {
        ...defaultProps,
        matchState: 'running'
      };
      
      render(<GameScreen {...props} />);
      
      // Execute the back handler
      const backHandler = mockPushNavigationState.mock.calls[0][0];
      act(() => {
        backHandler();
      });
      
      // Should NOT navigate immediately
      expect(mockSetView).not.toHaveBeenCalled();
      // Should show warning modal instead
      expect(mockSetShowNewGameModal).toHaveBeenCalledWith(true);
    });

    it('should clean up all handlers when leaving running state', () => {
      const props = {
        ...defaultProps,
        matchState: 'running'
      };
      
      const { rerender } = render(<GameScreen {...props} />);
      
      // Change to a different match state
      rerender(<GameScreen {...props} matchState="finished" />);
      
      // Should clean up the handlers
      expect(mockRemoveFromNavigationStack).toHaveBeenCalled();
    });
  });

  describe('Match State Transitions', () => {
    it('should handle transition from pending to running state', () => {
      const props = {
        ...defaultProps,
        matchState: 'pending'
      };
      
      const { rerender } = render(<GameScreen {...props} />);
      
      // Clear the mock to isolate the transition
      mockPushNavigationState.mockClear();
      mockRemoveFromNavigationStack.mockClear();
      
      // Transition to running state
      rerender(<GameScreen {...props} matchState="running" />);
      
      // Should clean up old handler and register new one
      expect(mockRemoveFromNavigationStack).toHaveBeenCalled();
      expect(mockPushNavigationState).toHaveBeenCalledWith(
        expect.any(Function),
        'GameScreen-MatchAbandonment'
      );
    });

    it('should handle transition from running to finished state', () => {
      const props = {
        ...defaultProps,
        matchState: 'running'
      };
      
      const { rerender } = render(<GameScreen {...props} />);
      
      // Clear the mock to isolate the transition
      mockRemoveFromNavigationStack.mockClear();
      mockPushNavigationState.mockClear();
      
      // Transition to finished state
      rerender(<GameScreen {...props} matchState="finished" />);
      
      // Should clean up handler and not register new one
      expect(mockRemoveFromNavigationStack).toHaveBeenCalled();
      expect(mockPushNavigationState).not.toHaveBeenCalled();
    });

    it('should handle multiple rapid state transitions', () => {
      const props = {
        ...defaultProps,
        matchState: 'pending'
      };
      
      const { rerender } = render(<GameScreen {...props} />);
      
      // Rapid transitions
      rerender(<GameScreen {...props} matchState="running" />);
      rerender(<GameScreen {...props} matchState="finished" />);
      rerender(<GameScreen {...props} matchState="confirmed" />);
      
      // Should handle all transitions without crashing
      expect(mockRemoveFromNavigationStack).toHaveBeenCalled();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing browser back integration gracefully', () => {
      const props = {
        ...defaultProps,
        matchState: 'running',
        pushNavigationState: null,
        removeFromNavigationStack: null
      };
      
      // Should not crash even without browser back integration
      expect(() => render(<GameScreen {...props} />)).not.toThrow();
    });

    it('should handle missing setView prop gracefully', () => {
      const props = {
        ...defaultProps,
        matchState: 'pending',
        setView: null
      };
      
      expect(() => render(<GameScreen {...props} />)).not.toThrow();
    });

    it('should handle missing setShowNewGameModal prop gracefully', () => {
      const props = {
        ...defaultProps,
        matchState: 'running',
        setShowNewGameModal: null
      };
      
      expect(() => render(<GameScreen {...props} />)).not.toThrow();
    });

    it('should handle rapid back button presses without crashing', () => {
      const props = {
        ...defaultProps,
        matchState: 'running'
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
    });
  });

  describe('Critical Data Protection Scenarios', () => {
    it('should never allow data loss without user confirmation', () => {
      const props = {
        ...defaultProps,
        matchState: 'running'
      };
      
      render(<GameScreen {...props} />);
      
      // Execute back handler multiple times
      const backHandler = mockPushNavigationState.mock.calls[0][0];
      act(() => {
        backHandler();
        backHandler();
      });
      
      // Should NEVER call setView directly for running matches
      expect(mockSetView).not.toHaveBeenCalled();
      // Should always show warning modal
      expect(mockSetShowNewGameModal).toHaveBeenCalledWith(true);
    });

    it('should preserve match data when user interaction is cancelled', () => {
      const props = {
        ...defaultProps,
        matchState: 'running',
        matchTimerSeconds: 600, // 10 minutes of match time
        subTimerSeconds: 90     // Some substitution timer progress
      };
      
      render(<GameScreen {...props} />);
      
      // Execute back handler to show modal
      const backHandler = mockPushNavigationState.mock.calls[0][0];
      act(() => {
        backHandler();
      });
      
      // Get modal close handler and close modal
      const modalCloseHandler = mockPushNavigationState.mock.calls[1][0];
      act(() => {
        modalCloseHandler();
      });
      
      // Match data should remain intact (component still mounted)
      expect(screen.getByTestId('formation-renderer-field')).toBeInTheDocument();
      expect(screen.getByTestId('formation-renderer-substitutes')).toBeInTheDocument();
      // Modal should be closed but match continues
      expect(mockSetShowNewGameModal).toHaveBeenCalledWith(false);
    });

    it('should distinguish between safe and unsafe navigation contexts', () => {
      const pendingProps = {
        ...defaultProps,
        matchState: 'pending'
      };
      
      const runningProps = {
        ...defaultProps,
        matchState: 'running'
      };
      
      const { rerender } = render(<GameScreen {...pendingProps} />);
      
      // Pending: Should allow direct navigation
      let backHandler = mockPushNavigationState.mock.calls[0][0];
      act(() => {
        backHandler();
      });
      expect(mockSetView).toHaveBeenCalledWith(VIEWS.PERIOD_SETUP);
      
      // Reset mocks
      mockSetView.mockClear();
      mockSetShowNewGameModal.mockClear();
      
      // Running: Should show warning
      rerender(<GameScreen {...runningProps} />);
      backHandler = mockPushNavigationState.mock.calls[mockPushNavigationState.mock.calls.length - 1][0];
      act(() => {
        backHandler();
      });
      expect(mockSetView).not.toHaveBeenCalled();
      expect(mockSetShowNewGameModal).toHaveBeenCalledWith(true);
    });
  });
});
