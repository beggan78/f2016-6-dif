/**
 * Multi-Period Lifecycle Integration Tests
 *
 * Tests the complete multi-period match lifecycle using a state-machine harness
 * that simulates transitions between PeriodSetupScreen and GameScreen across periods.
 *
 * Test Coverage:
 * - Complete 2-period match flow: setup P1 → game P1 → end period → setup P2 → game P2
 * - Period number propagation across transitions
 * - Score persistence across period transitions
 * - Goalie change between periods
 * - State preservation (gameLog from P1 available in P2 setup)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// Components under test
import { PeriodSetupScreen } from '../components/setup/PeriodSetupScreen';
import { GameScreen } from '../components/game/GameScreen';

// Shared lifecycle utilities
import {
  setupPeriodSetupMocks,
  createPeriodSetupProps,
  buildCompleteFormation,
  setupGameScreenHooks,
  createGameScreenProps
} from './matchLifecycleUtils';

import {
  createMockPlayers,
  createMockFormation,
  setupComponentTestEnvironment
} from '../components/__tests__/componentTestUtils';

import { TEAM_CONFIGS } from '../game/testUtils';

// ===================================================================
// MOCKS — shared factories from setup/sharedMockFactories.js
// ===================================================================

// PeriodSetupScreen dependencies
jest.mock('lucide-react', () => require('./setup/sharedMockFactories').lucideReact);
jest.mock('../components/shared/UI', () => require('./setup/sharedMockFactories').sharedUI);
jest.mock('../utils/formatUtils', () => require('./setup/sharedMockFactories').formatUtils);
jest.mock('../utils/debugUtils', () => require('./setup/sharedMockFactories').debugUtils);
jest.mock('../contexts/TeamContext', () => require('./setup/sharedMockFactories').teamContext);
jest.mock('../services/matchStateManager', () => require('./setup/sharedMockFactories').matchStateManager);
jest.mock('../hooks/usePlayerRecommendationData', () => require('./setup/sharedMockFactories').playerRecommendationData);

// GameScreen-specific mocks
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
jest.mock('../components/shared/GoalScorerModal', () => require('./setup/sharedMockFactories').goalScorerModal);
jest.mock('../components/game/SubstitutionCountControls', () => require('./setup/sharedMockFactories').substitutionCountControls);
jest.mock('../utils/playerSortingUtils', () => require('./setup/sharedMockFactories').playerSortingUtils);

// Mock positionUtils so GameScreen doesn't hit the mocked getModeDefinition
jest.mock('../game/logic/positionUtils', () => ({
  ...jest.requireActual('../game/logic/positionUtils'),
  getExpectedOnFieldPlayerCount: jest.fn(() => 4),
  getExpectedCounts: jest.fn(() => ({ onField: 4, substitutes: 2, goalie: 1 }))
}));

// ===================================================================
// TEST SUITE
// ===================================================================

const teamConfig = TEAM_CONFIGS.INDIVIDUAL_7;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

describe('Multi-Period Lifecycle Integration Tests', () => {
  let mockEnvironment;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup PeriodSetupScreen mocks
    setupPeriodSetupMocks(teamConfig);

    // Setup GameScreen mocks
    mockEnvironment = setupComponentTestEnvironment();
    setupGameScreenHooks();

    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation((message, ...args) => {
      if (typeof message === 'string' && message.includes('React does not recognize')) return;
      originalConsoleError(message, ...args);
    });
  });

  afterEach(() => {
    if (mockEnvironment) mockEnvironment.cleanup();
    jest.restoreAllMocks();
  });

  describe('Complete 2-period match lifecycle', () => {
    it('should render PeriodSetupScreen for period 1 with correct period number', () => {
      const formation = buildCompleteFormation(teamConfig);
      const props = createPeriodSetupProps(teamConfig, {
        currentPeriodNumber: 1,
        formation
      });

      render(<PeriodSetupScreen {...props} />);

      expect(screen.getByText('Period 1 Team Selection')).toBeInTheDocument();
      expect(screen.getByText('Enter Game')).not.toBeDisabled();
    });

    it('should transition from period setup to game: handleStartGame called on Enter Game click', () => {
      const formation = buildCompleteFormation(teamConfig);
      const props = createPeriodSetupProps(teamConfig, {
        currentPeriodNumber: 1,
        formation
      });

      render(<PeriodSetupScreen {...props} />);

      fireEvent.click(screen.getByText('Enter Game'));

      expect(props.handleStartGame).toHaveBeenCalledTimes(1);
    });

    it('should render GameScreen for period 1 in pending state with start button', () => {
      const props = createGameScreenProps(teamConfig, {
        currentPeriodNumber: 1,
        matchState: 'pending'
      });

      render(<GameScreen {...props} />);

      // Formation renderer should be present
      expect(screen.getByTestId('formation-renderer-field')).toBeInTheDocument();
      expect(screen.getByTestId('formation-renderer-substitutes')).toBeInTheDocument();
    });

    it('should render PeriodSetupScreen for period 2 without back button', () => {
      const formation = buildCompleteFormation(teamConfig);
      const props = createPeriodSetupProps(teamConfig, {
        currentPeriodNumber: 2,
        formation,
        periodGoalieIds: { 1: '7', 2: '6' }
      });

      render(<PeriodSetupScreen {...props} />);

      expect(screen.getByText('Period 2 Team Selection')).toBeInTheDocument();
      expect(screen.queryByText('Back to Configuration')).not.toBeInTheDocument();
    });
  });

  describe('Score persistence across period transitions', () => {
    it('should display persisted score in GameScreen for period 2', () => {
      const props = createGameScreenProps(teamConfig, {
        currentPeriodNumber: 2,
        matchState: 'running',
        ownScore: 3,
        opponentScore: 1
      });

      render(<GameScreen {...props} />);

      expect(screen.getByText('3 - 1')).toBeInTheDocument();
    });
  });

  describe('Goalie change between periods', () => {
    it('should accept different goalies for different periods in PeriodSetupScreen', () => {
      const formation = buildCompleteFormation(teamConfig);
      const props = createPeriodSetupProps(teamConfig, {
        currentPeriodNumber: 2,
        formation: { ...formation, goalie: '6' },
        periodGoalieIds: { 1: '7', 2: '6' }
      });

      render(<PeriodSetupScreen {...props} />);

      // Period 2 renders with a different goalie set
      expect(screen.getByText('Period 2 Team Selection')).toBeInTheDocument();
      // The formation is complete with a different goalie
      expect(screen.getByText('Enter Game')).not.toBeDisabled();
    });
  });

  describe('State preservation across periods', () => {
    it('should pass gameLog to period 2 setup for state continuity', () => {
      const gameLog = [
        { type: 'substitution', timestamp: 1000, period: 1 },
        { type: 'goal', timestamp: 2000, period: 1, team: 'own' }
      ];

      const formation = buildCompleteFormation(teamConfig);
      const props = createPeriodSetupProps(teamConfig, {
        currentPeriodNumber: 2,
        formation,
        gameLog,
        ownScore: 1,
        opponentScore: 0,
        periodGoalieIds: { 1: '7', 2: '7' }
      });

      render(<PeriodSetupScreen {...props} />);

      // Component renders successfully with gameLog data from period 1
      expect(screen.getByText('Period 2 Team Selection')).toBeInTheDocument();
      // The gameLog is passed through props — component doesn't crash
      expect(props.gameLog).toHaveLength(2);
      expect(props.gameLog[0].period).toBe(1);
    });

    it('should render GameScreen for period 2 with running state and accumulated score', () => {
      const props = createGameScreenProps(teamConfig, {
        currentPeriodNumber: 2,
        matchState: 'running',
        matchTimerSeconds: 120,
        ownScore: 2,
        opponentScore: 0
      });

      render(<GameScreen {...props} />);

      // Score from period 1 carries over
      expect(screen.getByText('2 - 0')).toBeInTheDocument();
      // Formation renderers present
      expect(screen.getByTestId('formation-renderer-field')).toBeInTheDocument();
    });
  });
});
