/**
 * GameScreen Match Actions Integration Tests
 *
 * Tests for core match actions: substitutions, goals, lifecycle controls,
 * and formation variations. Verifies that GameScreen correctly wires
 * handler factories and renders interactive elements for each match state.
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
  createMockGameScreenProps,
  setupComponentTestEnvironment
} from '../components/__tests__/componentTestUtils';
import { setupGameScreenHooks, createGameScreenProps } from './matchLifecycleUtils';
import { TEAM_CONFIGS } from '../game/testUtils';
import { FORMATS, FORMATIONS } from '../constants/teamConfiguration';

const testI18n = createTestI18n();

// ===================================================================
// MOCKS — follow the exact pattern from GameScreenNavigationFlows
// ===================================================================

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

jest.mock('../services/matchStateManager', () => ({
  createMatch: jest.fn(),
  formatMatchDataFromGameState: jest.fn(() => ({})),
  updateMatch: jest.fn(),
  getMatch: jest.fn(),
  clearStoredState: jest.fn()
}));

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
  let handlers;

  beforeEach(() => {
    jest.clearAllMocks();
    setupComponentTestEnvironment();
    handlers = setupGameScreenHooks();

    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation((message, ...args) => {
      if (typeof message === 'string' && message.includes('React does not recognize')) {
        return;
      }
      originalConsoleError(message, ...args);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // -----------------------------------------------------------------
  // Substitutions
  // -----------------------------------------------------------------

  describe('Substitutions', () => {
    it('should render SUB button and call handleSubstitutionWithHighlight when clicked', () => {
      const props = createGameScreenProps(TEAM_CONFIGS.INDIVIDUAL_7, {
        matchState: 'running'
      });

      renderWithI18n(<GameScreen {...props} />);

      // The button text is "SUB 1 PLAYER" for substitutionCount=1
      const subButton = screen.getByText('SUB 1 PLAYER');
      expect(subButton).toBeInTheDocument();

      fireEvent.click(subButton);

      expect(handlers.substitutionHandlers.handleSubstitutionWithHighlight).toHaveBeenCalled();
    });

    it('should pass handleSubstituteClick via fieldPositionHandlers', () => {
      const props = createGameScreenProps(TEAM_CONFIGS.INDIVIDUAL_7, {
        matchState: 'running'
      });

      renderWithI18n(<GameScreen {...props} />);

      // The createFieldPositionHandlers factory was called and its mock is wired in
      const { createFieldPositionHandlers } = require('../game/handlers/fieldPositionHandlers');
      expect(createFieldPositionHandlers).toHaveBeenCalled();

      // The returned handler object contains handleSubstituteClick
      expect(handlers.fieldPositionHandlers.handleSubstituteClick).toBeDefined();
      expect(typeof handlers.fieldPositionHandlers.handleSubstituteClick).toBe('function');
    });
  });

  // -----------------------------------------------------------------
  // Position changes
  // -----------------------------------------------------------------

  describe('Position changes', () => {
    it('should wire handleFieldPlayerClick from fieldPositionHandlers', () => {
      const props = createGameScreenProps(TEAM_CONFIGS.INDIVIDUAL_7, {
        matchState: 'running'
      });

      renderWithI18n(<GameScreen {...props} />);

      const { createFieldPositionHandlers } = require('../game/handlers/fieldPositionHandlers');
      expect(createFieldPositionHandlers).toHaveBeenCalled();
      expect(handlers.fieldPositionHandlers.handleFieldPlayerClick).toBeDefined();
    });
  });

  // -----------------------------------------------------------------
  // Rotation order
  // -----------------------------------------------------------------

  describe('Rotation order', () => {
    it('should provide setNextPlayerToSubOut and setNextPlayerIdToSubOut props', () => {
      const mockSetNext = jest.fn();
      const mockSetNextId = jest.fn();

      const props = createGameScreenProps(TEAM_CONFIGS.INDIVIDUAL_7, {
        matchState: 'running',
        setNextPlayerToSubOut: mockSetNext,
        setNextPlayerIdToSubOut: mockSetNextId,
        nextPlayerToSubOut: 'leftDefender',
        nextPlayerIdToSubOut: '1'
      });

      renderWithI18n(<GameScreen {...props} />);

      // The component receives and uses these props — verify they are passed to
      // the substitutionHandlers factory via stateUpdaters
      const { createSubstitutionHandlers } = require('../game/handlers/substitutionHandlers');
      expect(createSubstitutionHandlers).toHaveBeenCalled();

      // The factory receives stateUpdaters that include our setters
      const callArgs = createSubstitutionHandlers.mock.calls[0];
      // stateUpdaters is the second argument
      const stateUpdaters = callArgs[1];
      expect(stateUpdaters.setNextPlayerToSubOut).toBe(mockSetNext);
      expect(stateUpdaters.setNextPlayerIdToSubOut).toBe(mockSetNextId);
    });
  });

  // -----------------------------------------------------------------
  // Goal registration
  // -----------------------------------------------------------------

  describe('Goal registration', () => {
    it('should render own team goal button and trigger handleAddGoalScored', () => {
      const props = createGameScreenProps(TEAM_CONFIGS.INDIVIDUAL_7, {
        matchState: 'running'
      });

      renderWithI18n(<GameScreen {...props} />);

      // The own team button shows the displayOwnTeam name
      const ownTeamButton = screen.getByText('Test Team');
      expect(ownTeamButton).toBeInTheDocument();

      fireEvent.click(ownTeamButton);

      expect(handlers.scoreHandlers.handleAddGoalScored).toHaveBeenCalled();
    });

    it('should render opponent goal button and trigger handleAddGoalConceded', () => {
      const props = createGameScreenProps(TEAM_CONFIGS.INDIVIDUAL_7, {
        matchState: 'running'
      });

      renderWithI18n(<GameScreen {...props} />);

      // The opponent team button shows the displayOpponentTeam name
      const opponentButton = screen.getByText('Test Opponent');
      expect(opponentButton).toBeInTheDocument();

      fireEvent.click(opponentButton);

      expect(handlers.scoreHandlers.handleAddGoalConceded).toHaveBeenCalled();
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
  // Match lifecycle
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

      // The pending overlay shows "Start Match" for period 1
      const startText = screen.getByText('Start Match');
      expect(startText).toBeInTheDocument();

      // The click handler (handleAnimatedMatchStart) is on the wrapper div
      // that contains the SquarePlay icon. It has class "group relative inline-block select-none".
      // Click on the clickable icon wrapper which is above the text.
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

      // Match clock and substitution timer labels are rendered
      expect(screen.getByText('Match Clock')).toBeInTheDocument();
      expect(screen.getByText('Substitution Timer')).toBeInTheDocument();

      // Timer values are rendered via formatTime
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

      // The component registers a back handler on mount
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
  // Formation variations
  // -----------------------------------------------------------------

  describe('Formation variations', () => {
    it('should render correctly with 1-2-1 formation', () => {
      const teamConfig = TEAM_CONFIGS.INDIVIDUAL_7_1_2_1;
      const props = createGameScreenProps(teamConfig, {
        matchState: 'running'
      });

      renderWithI18n(<GameScreen {...props} />);

      // The component renders both field and substitute sections
      expect(screen.getByTestId('formation-renderer-field')).toBeInTheDocument();
      expect(screen.getByTestId('formation-renderer-substitutes')).toBeInTheDocument();

      // Score display still works
      expect(screen.getByText('0 - 0')).toBeInTheDocument();
    });

    it('should render 6-player squad without multi-sub controls visible', () => {
      const teamConfig = TEAM_CONFIGS.INDIVIDUAL_6;
      const props = createGameScreenProps(teamConfig, {
        matchState: 'running'
      });

      renderWithI18n(<GameScreen {...props} />);

      // With only 1 substitute, the stepper min and max both = 1, so
      // the +/- buttons should be disabled
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

      // With 4 substitutes, the increase button should be enabled
      const increaseButton = screen.getByLabelText('Increase number of players to substitute');
      expect(increaseButton).toBeEnabled();
    });
  });
});
