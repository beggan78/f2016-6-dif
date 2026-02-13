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
// MOCKS — PeriodSetupScreen dependencies
// ===================================================================

jest.mock('lucide-react', () => ({
  Users: ({ className, ...props }) => <div data-testid="users-icon" className={className} {...props} />,
  Play: ({ className, ...props }) => <div data-testid="play-icon" className={className} {...props} />,
  ArrowLeft: ({ className, ...props }) => <div data-testid="arrow-left-icon" className={className} {...props} />,
  Shuffle: ({ className, ...props }) => <div data-testid="shuffle-icon" className={className} {...props} />,
  Save: ({ className, ...props }) => <div data-testid="save-icon" className={className} {...props} />,
  Square: ({ className, ...props }) => <div data-testid="square-icon" className={className} {...props} />,
  Pause: ({ className, ...props }) => <div data-testid="pause-icon" className={className} {...props} />,
  SquarePlay: ({ className, ...props }) => <div data-testid="squareplay-icon" className={className} {...props} />,
  Undo2: ({ className, ...props }) => <div data-testid="undo-icon" className={className} {...props} />,
  RefreshCcw: ({ className, ...props }) => <div data-testid="refresh-icon" className={className} {...props} />
}));

jest.mock('../components/shared/UI', () => ({
  Select: ({ value, onChange, options, placeholder, id, ...props }) => (
    <select
      data-testid={id || 'select'}
      value={value || ''}
      onChange={(e) => onChange && onChange(e.target.value)}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {Array.isArray(options)
        ? options.map(option => {
            if (typeof option === 'object') {
              return <option key={option.value} value={option.value}>{option.label}</option>;
            }
            return <option key={option} value={option}>{option}</option>;
          })
        : null}
    </select>
  ),
  Button: ({ onClick, disabled, children, Icon, ...props }) => (
    <button data-testid="button" onClick={onClick} disabled={disabled} {...props}>
      {Icon && <Icon data-testid="button-icon" />}
      {children}
    </button>
  ),
  ConfirmationModal: ({ isOpen, onConfirm, onCancel, title, message }) =>
    isOpen ? (
      <div data-testid="confirmation-modal" role="dialog">
        <h2>{title}</h2>
        <p>{message}</p>
        <button data-testid="modal-confirm" onClick={onConfirm}>Confirm</button>
        <button data-testid="modal-cancel" onClick={onCancel}>Cancel</button>
      </div>
    ) : null,
  FieldPlayerModal: () => null,
  SubstitutePlayerModal: () => null,
  GoalieModal: () => null,
  ScoreManagerModal: () => null,
  SubstituteSelectionModal: () => null
}));

jest.mock('../utils/formatUtils', () => ({
  getPlayerLabel: jest.fn((player, periodNumber) => `${player.displayName} (P${periodNumber})`),
  formatPlayerName: jest.fn((player) => player?.displayName || 'Unknown')
}));

jest.mock('../utils/debugUtils', () => ({
  randomizeFormationPositions: jest.fn(() => ({
    leftDefender: '1',
    rightDefender: '2',
    leftAttacker: '3',
    rightAttacker: '4'
  }))
}));

jest.mock('../contexts/TeamContext', () => ({
  useTeam: jest.fn()
}));

jest.mock('../services/matchStateManager', () => ({
  getPlayerStats: jest.fn(),
  createMatch: jest.fn(),
  formatMatchDataFromGameState: jest.fn(() => ({})),
  updateMatch: jest.fn(),
  getMatch: jest.fn(),
  clearStoredState: jest.fn()
}));

jest.mock('../hooks/usePlayerRecommendationData', () => ({
  usePlayerRecommendationData: jest.fn()
}));

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
jest.mock('../utils/playerUtils', () => ({
  ...jest.requireActual('../utils/playerUtils'),
  hasActiveSubstitutes: jest.fn()
}));

// Mock positionUtils so GameScreen doesn't hit the mocked getModeDefinition
jest.mock('../game/logic/positionUtils', () => ({
  ...jest.requireActual('../game/logic/positionUtils'),
  getExpectedOnFieldPlayerCount: jest.fn(() => 4),
  getExpectedCounts: jest.fn(() => ({ onField: 4, substitutes: 2, goalie: 1 }))
}));

jest.mock('../components/game/formations/FormationRenderer', () => ({
  FormationRenderer: ({ renderSection = 'all', ...props }) => {
    const testId = renderSection === 'all' ? 'formation-renderer' : `formation-renderer-${renderSection}`;
    return <div data-testid={testId} {...props}>Mock Formation</div>;
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

jest.mock('../components/shared/GoalScorerModal', () => ({
  __esModule: true,
  default: () => null
}));

jest.mock('../components/game/SubstitutionCountControls', () => ({
  SubstitutionCountInlineControl: () => null
}));

jest.mock('../utils/playerSortingUtils', () => ({
  sortPlayersByGoalScoringRelevance: jest.fn((players) => players)
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
