/**
 * Formation Variations Integration Tests
 *
 * Parameterized integration tests covering all supported team configurations.
 * Uses describe.each with FORMATION_TEST_MATRIX to verify that PeriodSetupScreen,
 * GameScreen, and pure utility functions work correctly across every formation and
 * squad-size combination (5v5 2-2, 5v5 1-2-1, 7v7 2-2-2, 7v7 2-3-1).
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

import { PeriodSetupScreen } from '../components/setup/PeriodSetupScreen';
import { GameScreen } from '../components/game/GameScreen';

import {
  FORMATION_TEST_MATRIX,
  setupPeriodSetupMocks,
  createPeriodSetupProps,
  buildCompleteFormation,
  buildDefinition,
  setupGameScreenHooks,
  createGameScreenProps,
  renderWithI18n
} from './matchLifecycleUtils';

import {
  setupComponentTestEnvironment
} from '../components/__tests__/componentTestUtils';

import { TEAM_CONFIGS } from '../game/testUtils';
import { FORMAT_CONFIGS, FORMATS } from '../constants/teamConfiguration';

// ---------------------------------------------------------------------------
// Mocks for PeriodSetupScreen
// ---------------------------------------------------------------------------

jest.mock('lucide-react', () => ({
  Users: (props) => <div data-testid="users-icon" {...props} />,
  Play: (props) => <div data-testid="play-icon" {...props} />,
  ArrowLeft: (props) => <div data-testid="arrow-left-icon" {...props} />,
  Shuffle: (props) => <div data-testid="shuffle-icon" {...props} />,
  Save: (props) => <div data-testid="save-icon" {...props} />,
  Square: (props) => <div data-testid="square-icon" {...props} />,
  Pause: (props) => <div data-testid="pause-icon" {...props} />,
  SquarePlay: (props) => <div data-testid="square-play-icon" {...props} />,
  Undo2: (props) => <div data-testid="undo2-icon" {...props} />,
  RefreshCcw: (props) => <div data-testid="refresh-icon" {...props} />
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
        ? options.map((option) =>
            typeof option === 'object' ? (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ) : (
              <option key={option} value={option}>
                {option}
              </option>
            )
          )
        : null}
    </select>
  ),
  Button: ({ onClick, disabled, children, Icon, ...props }) => (
    <button data-testid="button" onClick={onClick} disabled={disabled} {...props}>
      {Icon && <Icon />}
      {children}
    </button>
  ),
  ConfirmationModal: ({ isOpen }) =>
    isOpen ? <div data-testid="confirmation-modal" /> : null,
  FieldPlayerModal: ({ isOpen }) =>
    isOpen ? <div data-testid="field-player-modal" /> : null,
  SubstitutePlayerModal: ({ isOpen }) =>
    isOpen ? <div data-testid="substitute-player-modal" /> : null,
  GoalieModal: ({ isOpen }) =>
    isOpen ? <div data-testid="goalie-modal" /> : null,
  ScoreManagerModal: ({ isOpen }) =>
    isOpen ? <div data-testid="score-manager-modal" /> : null,
  SubstituteSelectionModal: ({ isOpen }) =>
    isOpen ? <div data-testid="substitute-selection-modal" /> : null
}));

jest.mock('../utils/formatUtils', () => ({
  getPlayerLabel: jest.fn(
    (player, periodNumber) => `${player.displayName} (P${periodNumber})`
  ),
  formatPlayerName: jest.fn((player) => player?.displayName || '')
}));

jest.mock('../utils/debugUtils', () => ({
  randomizeFormationPositions: jest.fn(() => ({}))
}));

jest.mock('../constants/gameModes', () => ({
  getOutfieldPositions: jest.fn(),
  getModeDefinition: jest.fn()
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

// ---------------------------------------------------------------------------
// Mocks for GameScreen
// ---------------------------------------------------------------------------

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
    const testId =
      renderSection === 'all'
        ? 'formation-renderer'
        : `formation-renderer-${renderSection}`;
    return (
      <div data-testid={testId} {...props}>
        Mock Formation
      </div>
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

// Additional GameScreen dependency mocks
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

// Mock positionUtils so GameScreen doesn't hit the mocked getModeDefinition
jest.mock('../game/logic/positionUtils', () => ({
  ...jest.requireActual('../game/logic/positionUtils'),
  getExpectedOnFieldPlayerCount: jest.fn(),
  getExpectedCounts: jest.fn()
}));

// ---------------------------------------------------------------------------
// Helper: compute expected on-field count from teamConfig
// ---------------------------------------------------------------------------
const getFieldPlayerCount = (teamConfig) => {
  const formatConfig = FORMAT_CONFIGS[teamConfig.format] || FORMAT_CONFIGS[FORMATS.FORMAT_5V5];
  return formatConfig.fieldPlayers;
};

/**
 * Build mock players array using buildDefinition (avoids mocked getModeDefinition).
 * Mirrors the role-distribution logic of createMockPlayers from game/testUtils.
 */
const buildMockPlayers = (teamConfig) => {
  const definition = buildDefinition(teamConfig);
  const { fieldPositions, substitutePositions } = definition;
  const count = teamConfig.squadSize;
  const players = [];

  for (let i = 1; i <= count; i++) {
    let status, role, positionKey;

    if (i <= fieldPositions.length) {
      status = 'onField';
      positionKey = fieldPositions[i - 1];
      role = 'field_player';
    } else if (i <= fieldPositions.length + substitutePositions.length) {
      status = 'substitute';
      positionKey = substitutePositions[i - fieldPositions.length - 1];
      role = 'substitute';
    } else {
      status = 'goalie';
      positionKey = 'goalie';
      role = 'goalie';
    }

    players.push({
      id: String(i),
      displayName: `Player ${i}`,
      firstName: `Player ${i}`,
      lastName: null,
      stats: {
        isInactive: false,
        currentStatus: status,
        currentRole: role,
        currentPositionKey: positionKey,
        lastStintStartTimeEpoch: Date.now(),
        timeOnFieldSeconds: 0,
        timeAsAttackerSeconds: 0,
        timeAsDefenderSeconds: 0,
        timeAsMidfielderSeconds: 0,
        timeAsSubSeconds: 0,
        timeAsGoalieSeconds: 0,
        startedMatchAs: status === 'onField' ? 'field_player' : role,
        startedAtRole: role,
        startedAtPosition: positionKey,
        startLocked: false
      }
    });
  }

  return players;
};

/**
 * Build mock formation using buildDefinition (avoids mocked getModeDefinition).
 * Mirrors the formation-building logic of createMockFormation from game/testUtils.
 */
const buildMockFormation = (teamConfig) => {
  const definition = buildDefinition(teamConfig);
  const { fieldPositions, substitutePositions } = definition;
  const formation = {};
  let playerId = 1;

  fieldPositions.forEach((pos) => {
    formation[pos] = String(playerId++);
  });
  substitutePositions.forEach((pos) => {
    formation[pos] = String(playerId++);
  });
  formation.goalie = String(playerId);

  return formation;
};

// ---------------------------------------------------------------------------
// Parameterized tests
// ---------------------------------------------------------------------------

const originalConsoleError = console.error;

describe.each(FORMATION_TEST_MATRIX)(
  '$name',
  ({ teamConfig, expectedFieldSlots, expectedSubSlots, expectedTotalOutfield }) => {
    beforeEach(() => {
      jest.clearAllMocks();

      // PeriodSetupScreen mocks
      setupPeriodSetupMocks(teamConfig);

      // GameScreen mocks
      setupComponentTestEnvironment();
      setupGameScreenHooks();

      // Provide realistic return values for mocked positionUtils
      const { getExpectedOnFieldPlayerCount, getExpectedCounts } =
        require('../game/logic/positionUtils');
      getExpectedOnFieldPlayerCount.mockReturnValue(getFieldPlayerCount(teamConfig));
      getExpectedCounts.mockReturnValue({
        outfield: expectedTotalOutfield,
        onField: expectedFieldSlots
      });

      // Suppress noisy console output during tests
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

    // -----------------------------------------------------------------------
    // 1. PeriodSetupScreen renders correct number of selects
    // -----------------------------------------------------------------------
    it('PeriodSetupScreen renders correct number of selects', () => {
      const props = createPeriodSetupProps(teamConfig);

      renderWithI18n(<PeriodSetupScreen {...props} />);

      const expectedSelectCount = 1 + expectedFieldSlots + expectedSubSlots;
      const selects = screen.getAllByTestId('select');
      expect(selects).toHaveLength(expectedSelectCount);
    });

    // -----------------------------------------------------------------------
    // 2. Complete formation enables Enter Game button
    // -----------------------------------------------------------------------
    it('complete formation enables Enter Game button', () => {
      const formation = buildCompleteFormation(teamConfig);
      const props = createPeriodSetupProps(teamConfig, { formation });

      renderWithI18n(<PeriodSetupScreen {...props} />);

      const enterGameButton = screen.getByText('Enter Game');
      expect(enterGameButton).not.toBeDisabled();
    });

    // -----------------------------------------------------------------------
    // 3. GameScreen renders with correct teamConfig
    // -----------------------------------------------------------------------
    it('GameScreen renders with correct teamConfig', () => {
      const formation = buildMockFormation(teamConfig);
      const allPlayers = buildMockPlayers(teamConfig);
      const props = createGameScreenProps(teamConfig, {
        matchState: 'running',
        formation,
        allPlayers
      });

      expect(() => render(<GameScreen {...props} />)).not.toThrow();

      expect(screen.getByTestId('formation-renderer-field')).toBeInTheDocument();
      expect(screen.getByTestId('formation-renderer-substitutes')).toBeInTheDocument();
    });

    // -----------------------------------------------------------------------
    // 4. createMockPlayers produces correct count and role distribution
    // -----------------------------------------------------------------------
    it('createMockPlayers produces correct count', () => {
      const players = buildMockPlayers(teamConfig);

      expect(players).toHaveLength(teamConfig.squadSize);

      const goalies = players.filter((p) => p.stats.currentStatus === 'goalie');
      const onField = players.filter((p) => p.stats.currentStatus === 'onField');
      const subs = players.filter((p) => p.stats.currentStatus === 'substitute');

      expect(goalies).toHaveLength(1);
      expect(onField).toHaveLength(expectedFieldSlots);
      expect(subs).toHaveLength(expectedSubSlots);
    });

    // -----------------------------------------------------------------------
    // 5. createMockFormation produces valid formation
    // -----------------------------------------------------------------------
    it('createMockFormation produces valid formation', () => {
      const formation = buildMockFormation(teamConfig);

      // Must have a goalie
      expect(formation.goalie).toBeDefined();
      expect(formation.goalie).not.toBeNull();

      // All position keys should be filled (no nulls)
      const positionValues = Object.values(formation);
      positionValues.forEach((val) => {
        expect(val).not.toBeNull();
        expect(val).toBeDefined();
      });

      // No duplicate player IDs
      const ids = Object.values(formation);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    // -----------------------------------------------------------------------
    // 6. buildCompleteFormation produces valid formation
    // -----------------------------------------------------------------------
    it('buildCompleteFormation produces valid formation', () => {
      const formation = buildCompleteFormation(teamConfig);

      // Goalie should be assigned
      expect(formation.goalie).toBeDefined();
      expect(formation.goalie).not.toBeNull();

      // Total assigned positions: field + sub + goalie
      const allKeys = Object.keys(formation);
      const expectedTotalPositions = 1 + expectedFieldSlots + expectedSubSlots;
      expect(allKeys).toHaveLength(expectedTotalPositions);

      // All positions filled with unique IDs
      const ids = Object.values(formation);
      ids.forEach((id) => {
        expect(id).toBeDefined();
        expect(id).not.toBeNull();
      });

      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  }
);
