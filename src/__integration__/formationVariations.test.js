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
  setupGameScreenHooks,
  createGameScreenProps,
  renderWithI18n
} from './matchLifecycleUtils';

import { getModeDefinition } from '../constants/gameModes';

import {
  setupComponentTestEnvironment
} from '../components/__tests__/componentTestUtils';

import { TEAM_CONFIGS } from '../game/testUtils';
import { FORMAT_CONFIGS, FORMATS } from '../constants/teamConfiguration';

// ---------------------------------------------------------------------------
// Mocks — shared factories from setup/sharedMockFactories.js
// ---------------------------------------------------------------------------

// PeriodSetupScreen dependencies
jest.mock('lucide-react', () => require('./setup/sharedMockFactories').lucideReact);
jest.mock('../components/shared/UI', () => require('./setup/sharedMockFactories').sharedUI);
jest.mock('../utils/formatUtils', () => require('./setup/sharedMockFactories').formatUtils);
jest.mock('../utils/debugUtils', () => require('./setup/sharedMockFactories').debugUtils);
jest.mock('../contexts/TeamContext', () => require('./setup/sharedMockFactories').teamContext);
jest.mock('../services/matchStateManager', () => require('./setup/sharedMockFactories').matchStateManager);
jest.mock('../hooks/usePlayerRecommendationData', () => require('./setup/sharedMockFactories').playerRecommendationData);

// GameScreen dependencies
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

// Additional GameScreen dependency mocks
jest.mock('../components/shared/GoalScorerModal', () => require('./setup/sharedMockFactories').goalScorerModal);
jest.mock('../components/game/SubstitutionCountControls', () => require('./setup/sharedMockFactories').substitutionCountControls);
jest.mock('../utils/playerSortingUtils', () => require('./setup/sharedMockFactories').playerSortingUtils);

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
 * Build mock players array using real getModeDefinition.
 * Mirrors the role-distribution logic of createMockPlayers from game/testUtils.
 */
const buildMockPlayers = (teamConfig) => {
  const definition = getModeDefinition(teamConfig);
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
 * Build mock formation using real getModeDefinition.
 * Mirrors the formation-building logic of createMockFormation from game/testUtils.
 */
const buildMockFormation = (teamConfig) => {
  const definition = getModeDefinition(teamConfig);
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
