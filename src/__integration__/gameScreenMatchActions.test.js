/**
 * GameScreen Match Actions Integration Tests
 *
 * True integration tests: clicking UI elements triggers REAL handler logic
 * (substitution, score, timer, goalie, field position handlers) and we verify
 * actual state transformations via mock state updaters.
 *
 * Handler factories are NOT mocked — only hooks, side-effect services, and
 * DOM-heavy components (FormationRenderer) are mocked.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createTestI18n } from '../test-utils/i18nTestSetup';

// Component under test
import { GameScreen } from '../components/game/GameScreen';

// Test utilities
import {
  createMockPlayers,
  createMockFormation,
  createMockGameScreenProps
} from '../components/__tests__/componentTestUtils';
import { setupGameScreenHooksWithRealHandlers, createGameScreenProps } from './matchLifecycleUtils';
import { TEAM_CONFIGS } from '../game/testUtils';
import { ANIMATION_DURATION, GLOW_DURATION } from '../game/animation/animationSupport';
import { getModeDefinition } from '../constants/gameModes';

const testI18n = createTestI18n();

// ===================================================================
// MOCKS — hooks + side effects only (handler factories are REAL)
// ===================================================================

jest.mock('../hooks/useGameModals');
jest.mock('../hooks/useGameUIState');
jest.mock('../hooks/useTeamNameAbbreviation');
jest.mock('../hooks/useFieldPositionHandlers');
jest.mock('../hooks/useQuickTapWithScrollDetection');

// Side-effect mocks
jest.mock('../utils/timeUtils', () => ({
  getCurrentTimestamp: jest.fn(() => 5000)
}));
jest.mock('../utils/playerUtils', () =>
  require('./setup/sharedMockFactories').createPlayerUtilsMock(
    jest.requireActual('../utils/playerUtils')
  )
);
jest.mock('../components/game/formations/FormationRenderer', () =>
  require('./setup/sharedMockFactories').formationRenderer
);
jest.mock('../services/audioAlertService', () =>
  require('./setup/sharedMockFactories').audioAlertService
);
jest.mock('../utils/gameEventLogger', () =>
  require('./setup/sharedMockFactories').createGameEventLoggerMock(
    jest.requireActual('../utils/gameEventLogger')
  )
);
jest.mock('../services/matchStateManager', () =>
  require('./setup/sharedMockFactories').matchStateManager
);

// ===================================================================
// HELPERS
// ===================================================================

const originalConsoleError = console.error;

const renderWithI18n = (ui) =>
  render(<I18nextProvider i18n={testI18n}>{ui}</I18nextProvider>);

// ===================================================================
// TEST SUITE
// ===================================================================

describe('GameScreen Match Actions', () => {
  let modalMocks, uiStateMocks;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    ({ modalMocks, uiStateMocks } = setupGameScreenHooksWithRealHandlers());

    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation((message, ...args) => {
      if (typeof message === 'string' && message.includes('React does not recognize')) {
        return;
      }
      originalConsoleError(message, ...args);
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  // -----------------------------------------------------------------
  // Substitutions — real handler logic
  // -----------------------------------------------------------------

  describe('Substitutions', () => {
    it('should execute real substitution when clicking SUB button', () => {
      const props = createGameScreenProps(TEAM_CONFIGS.INDIVIDUAL_7, {
        matchState: 'running'
      });

      renderWithI18n(<GameScreen {...props} />);

      const subButton = screen.getByText('SUB 1 PLAYER');
      expect(subButton).toBeInTheDocument();

      fireEvent.click(subButton);

      // Advance past animation duration to flush setTimeout in animateStateChange
      act(() => {
        jest.advanceTimersByTime(ANIMATION_DURATION + GLOW_DURATION);
      });

      // Real substitution handler ran — verify state transformations
      expect(props.setFormation).toHaveBeenCalled();
      const newFormation = props.setFormation.mock.calls[0][0];

      // Default state: nextPlayerIdToSubOut='1' at leftDefender,
      // first substitute is player '5' at substitute_1.
      // After substitution: player 5 takes leftDefender, player 1 goes to substitute
      expect(newFormation.leftDefender).toBe('5');

      // Player stats updated
      expect(props.setAllPlayers).toHaveBeenCalled();
      const updatedPlayers = props.setAllPlayers.mock.calls[0][0];
      const playerMovedToField = updatedPlayers.find(p => p.id === '5');
      expect(playerMovedToField.stats.currentPositionKey).toBe('leftDefender');

      // Rotation queue updated
      expect(props.setRotationQueue).toHaveBeenCalled();

      // Last substitution stored for undo
      expect(uiStateMocks.setLastSubstitution).toHaveBeenCalled();

      // Sub timer reset
      expect(props.resetSubTimer).toHaveBeenCalled();
    });

    it('should execute substitution correctly with 1-2-1 formation', () => {
      const teamConfig = TEAM_CONFIGS.INDIVIDUAL_7_1_2_1;
      const definition = getModeDefinition(teamConfig);
      const firstFieldPos = definition.fieldPositions[0];

      const formation = createMockFormation(teamConfig);
      const allPlayers = createMockPlayers(teamConfig.squadSize, teamConfig);
      const firstFieldPlayerId = formation[firstFieldPos];
      const firstSubId = formation[definition.substitutePositions[0]];

      const props = createGameScreenProps(teamConfig, {
        matchState: 'running',
        formation,
        allPlayers,
        nextPlayerToSubOut: firstFieldPos,
        nextPlayerIdToSubOut: firstFieldPlayerId,
        rotationQueue: allPlayers.filter(p => p.id !== formation.goalie).map(p => p.id)
      });

      renderWithI18n(<GameScreen {...props} />);

      fireEvent.click(screen.getByText('SUB 1 PLAYER'));

      act(() => {
        jest.advanceTimersByTime(ANIMATION_DURATION + GLOW_DURATION);
      });

      expect(props.setFormation).toHaveBeenCalled();
      const newFormation = props.setFormation.mock.calls[0][0];
      // First substitute takes the field position
      expect(newFormation[firstFieldPos]).toBe(firstSubId);
    });

    it('should create field position handlers with correct arguments', () => {
      const { createFieldPositionHandlers } = require('../game/handlers/fieldPositionHandlers');
      const spy = jest.spyOn(
        require('../game/handlers/fieldPositionHandlers'),
        'createFieldPositionHandlers'
      );

      const props = createGameScreenProps(TEAM_CONFIGS.INDIVIDUAL_7, {
        matchState: 'running'
      });

      renderWithI18n(<GameScreen {...props} />);

      expect(spy).toHaveBeenCalled();
      const callArgs = spy.mock.calls[0];
      // Verify factory receives correct formation/players/config
      expect(callArgs[0]).toBe(props.teamConfig); // teamConfig
      expect(callArgs[1]).toBe(props.formation);  // formation
      expect(callArgs[2]).toBe(props.allPlayers);  // allPlayers

      spy.mockRestore();
    });
  });

  // -----------------------------------------------------------------
  // Goal registration — real score handler logic
  // -----------------------------------------------------------------

  describe('Goal registration', () => {
    it('should open goal scorer modal when clicking own team (trackGoalScorer=true)', () => {
      const props = createGameScreenProps(TEAM_CONFIGS.INDIVIDUAL_7, {
        matchState: 'running',
        trackGoalScorer: true
      });

      renderWithI18n(<GameScreen {...props} />);

      const ownTeamButton = screen.getByText('Test Team');
      fireEvent.click(ownTeamButton);

      // Real handleAddGoalScored ran with trackGoalScorer=true →
      // opens goal scorer modal instead of incrementing score directly
      expect(modalMocks.openGoalScorerModal).toHaveBeenCalled();
      const modalCall = modalMocks.openGoalScorerModal.mock.calls[0][0];
      expect(modalCall.team).toBe('scored');
      expect(modalCall.mode).toBe('new');

      // Pending goal data stored
      expect(modalMocks.setPendingGoalData).toHaveBeenCalled();
    });

    it('should increment score directly when clicking own team (trackGoalScorer=false)', () => {
      const props = createGameScreenProps(TEAM_CONFIGS.INDIVIDUAL_7, {
        matchState: 'running',
        trackGoalScorer: false
      });

      renderWithI18n(<GameScreen {...props} />);

      fireEvent.click(screen.getByText('Test Team'));

      // Real handleAddGoalScored ran with trackGoalScorer=false →
      // directly increments score without modal
      expect(props.addGoalScored).toHaveBeenCalled();
      expect(modalMocks.openGoalScorerModal).not.toHaveBeenCalled();
    });

    it('should increment opponent score directly when clicking opponent team', () => {
      const props = createGameScreenProps(TEAM_CONFIGS.INDIVIDUAL_7, {
        matchState: 'running'
      });

      renderWithI18n(<GameScreen {...props} />);

      fireEvent.click(screen.getByText('Test Opponent'));

      // Real handleAddGoalConceded ran → always increments directly (no modal)
      expect(props.addGoalConceded).toHaveBeenCalled();
      expect(modalMocks.openGoalScorerModal).not.toHaveBeenCalled();
    });

    it('should display the correct score', () => {
      const props = createGameScreenProps(TEAM_CONFIGS.INDIVIDUAL_7, {
        matchState: 'running',
        ownScore: 2,
        opponentScore: 1
      });

      renderWithI18n(<GameScreen {...props} />);

      expect(screen.getByText('2 - 1')).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------
  // Match lifecycle (prop callbacks — unchanged)
  // -----------------------------------------------------------------

  describe('Match lifecycle', () => {
    it('should show Start Match button in pending state and call handleActualMatchStart on click', () => {
      const mockStart = jest.fn();
      const props = createGameScreenProps(TEAM_CONFIGS.INDIVIDUAL_7, {
        matchState: 'pending',
        currentPeriodNumber: 1,
        handleActualMatchStart: mockStart
      });

      renderWithI18n(<GameScreen {...props} />);

      const startText = screen.getByText('Start Match');
      expect(startText).toBeInTheDocument();

      const clickableIcon = startText.closest('[class*="relative z-10"]').querySelector('[class*="inline-block"]');
      fireEvent.click(clickableIcon);

      expect(mockStart).toHaveBeenCalled();
    });

    it('should show timer controls and sub timer in running state', () => {
      const props = createGameScreenProps(TEAM_CONFIGS.INDIVIDUAL_7, {
        matchState: 'running',
        matchTimerSeconds: 600,
        subTimerSeconds: 90
      });

      renderWithI18n(<GameScreen {...props} />);

      expect(screen.getByText('Match Clock')).toBeInTheDocument();
      expect(screen.getByText('Substitution Timer')).toBeInTheDocument();
      expect(screen.getByText('10:00')).toBeInTheDocument(); // 600 seconds
      expect(screen.getByText('01:30')).toBeInTheDocument(); // 90 seconds
    });

    it('should render End Period button in running state and call handleEndPeriod on click', () => {
      const mockEnd = jest.fn();
      const props = createGameScreenProps(TEAM_CONFIGS.INDIVIDUAL_7, {
        matchState: 'running',
        handleEndPeriod: mockEnd
      });

      renderWithI18n(<GameScreen {...props} />);

      const endButton = screen.getByText('End Period');
      expect(endButton).toBeInTheDocument();

      fireEvent.click(endButton);

      expect(mockEnd).toHaveBeenCalled();
    });

    it('should navigate back directly when pressing back on a pending match', () => {
      const mockPush = jest.fn();
      const mockBack = jest.fn();
      const mockSetShowNewGameModal = jest.fn();

      const props = createGameScreenProps(TEAM_CONFIGS.INDIVIDUAL_7, {
        matchState: 'pending',
        pushNavigationState: mockPush,
        onNavigateBack: mockBack,
        setShowNewGameModal: mockSetShowNewGameModal
      });

      renderWithI18n(<GameScreen {...props} />);

      expect(mockPush).toHaveBeenCalledWith(
        expect.any(Function),
        'GameScreen-BackToSetup'
      );

      const backHandler = mockPush.mock.calls[0][0];
      act(() => { backHandler(); });

      expect(mockBack).toHaveBeenCalled();
      expect(mockSetShowNewGameModal).not.toHaveBeenCalled();
    });

    it('should show abandonment modal when pressing back on a running match', () => {
      const mockPush = jest.fn();
      const mockBack = jest.fn();
      const mockSetShowNewGameModal = jest.fn();

      const props = createGameScreenProps(TEAM_CONFIGS.INDIVIDUAL_7, {
        matchState: 'running',
        pushNavigationState: mockPush,
        onNavigateBack: mockBack,
        setShowNewGameModal: mockSetShowNewGameModal
      });

      renderWithI18n(<GameScreen {...props} />);

      expect(mockPush).toHaveBeenCalledWith(
        expect.any(Function),
        'GameScreen-MatchAbandonment'
      );

      const backHandler = mockPush.mock.calls[0][0];
      act(() => { backHandler(); });

      expect(mockSetShowNewGameModal).toHaveBeenCalledWith(true);
      expect(mockBack).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------
  // Formation variations — render + real handler compatibility
  // -----------------------------------------------------------------

  describe('Formation variations', () => {
    it('should render correctly with 1-2-1 formation', () => {
      const teamConfig = TEAM_CONFIGS.INDIVIDUAL_7_1_2_1;
      const props = createGameScreenProps(teamConfig, {
        matchState: 'running'
      });

      renderWithI18n(<GameScreen {...props} />);

      expect(screen.getByTestId('formation-renderer-field')).toBeInTheDocument();
      expect(screen.getByTestId('formation-renderer-substitutes')).toBeInTheDocument();
      expect(screen.getByText('0 - 0')).toBeInTheDocument();
    });

    it('should render 6-player squad without multi-sub controls visible', () => {
      const teamConfig = TEAM_CONFIGS.INDIVIDUAL_6;
      const props = createGameScreenProps(teamConfig, {
        matchState: 'running'
      });

      renderWithI18n(<GameScreen {...props} />);

      const decreaseButton = screen.getByLabelText('Decrease number of players to substitute');
      const increaseButton = screen.getByLabelText('Increase number of players to substitute');
      expect(decreaseButton).toBeDisabled();
      expect(increaseButton).toBeDisabled();
    });

    it('should render 9-player squad with multi-sub controls enabled', () => {
      const teamConfig = TEAM_CONFIGS.INDIVIDUAL_9;
      const props = createGameScreenProps(teamConfig, {
        matchState: 'running'
      });

      renderWithI18n(<GameScreen {...props} />);

      const increaseButton = screen.getByLabelText('Increase number of players to substitute');
      expect(increaseButton).toBeEnabled();
    });

    it('should render correctly with 7v7 2-2-2 formation', () => {
      const teamConfig = TEAM_CONFIGS.INDIVIDUAL_7V7_222;
      const props = createGameScreenProps(teamConfig, {
        matchState: 'running'
      });

      renderWithI18n(<GameScreen {...props} />);

      expect(screen.getByTestId('formation-renderer-field')).toBeInTheDocument();
      expect(screen.getByTestId('formation-renderer-substitutes')).toBeInTheDocument();
      expect(screen.getByText('0 - 0')).toBeInTheDocument();
    });

    it('should render correctly with 7v7 2-3-1 formation', () => {
      const teamConfig = TEAM_CONFIGS.INDIVIDUAL_7V7_231;
      const props = createGameScreenProps(teamConfig, {
        matchState: 'running'
      });

      renderWithI18n(<GameScreen {...props} />);

      expect(screen.getByTestId('formation-renderer-field')).toBeInTheDocument();
      expect(screen.getByTestId('formation-renderer-substitutes')).toBeInTheDocument();
      expect(screen.getByText('0 - 0')).toBeInTheDocument();
    });

    it('should render 7v7 2-3-1 with 8 players (1 sub, controls disabled)', () => {
      const teamConfig = TEAM_CONFIGS.INDIVIDUAL_7V7_231_8;
      const props = createGameScreenProps(teamConfig, {
        matchState: 'running'
      });

      renderWithI18n(<GameScreen {...props} />);

      const decreaseButton = screen.getByLabelText('Decrease number of players to substitute');
      const increaseButton = screen.getByLabelText('Increase number of players to substitute');
      expect(decreaseButton).toBeDisabled();
      expect(increaseButton).toBeDisabled();
    });

    it.each([
      ['5v5 2-2 7p', TEAM_CONFIGS.INDIVIDUAL_7],
      ['5v5 1-2-1 7p', TEAM_CONFIGS.INDIVIDUAL_7_1_2_1],
      ['7v7 2-2-2 9p', TEAM_CONFIGS.INDIVIDUAL_7V7_222],
      ['7v7 2-3-1 10p', TEAM_CONFIGS.INDIVIDUAL_7V7_231]
    ])('should execute substitution without errors for %s formation', (name, teamConfig) => {
      const definition = getModeDefinition(teamConfig);
      const firstFieldPos = definition.fieldPositions[0];
      const formation = createMockFormation(teamConfig);
      const allPlayers = createMockPlayers(teamConfig.squadSize, teamConfig);
      const firstFieldPlayerId = formation[firstFieldPos];

      const props = createGameScreenProps(teamConfig, {
        matchState: 'running',
        formation,
        allPlayers,
        nextPlayerToSubOut: firstFieldPos,
        nextPlayerIdToSubOut: firstFieldPlayerId,
        rotationQueue: allPlayers.filter(p => p.id !== formation.goalie).map(p => p.id)
      });

      renderWithI18n(<GameScreen {...props} />);

      fireEvent.click(screen.getByText('SUB 1 PLAYER'));

      act(() => {
        jest.advanceTimersByTime(ANIMATION_DURATION + GLOW_DURATION);
      });

      // Real handler ran successfully for this formation
      expect(props.setFormation).toHaveBeenCalled();
      expect(props.setAllPlayers).toHaveBeenCalled();
    });
  });
});
