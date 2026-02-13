/**
 * Match Lifecycle Integration Test Utilities
 *
 * Shared helpers for integration tests covering the Configuration → PeriodSetup → Game
 * lifecycle. Builds on existing utilities from componentTestUtils and game/testUtils
 * while adding lifecycle-specific mock builders.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createTestI18n } from '../test-utils/i18nTestSetup';
import {
  createMockPlayers,
  createMockFormation,
  createMockGameScreenProps
} from '../components/__tests__/componentTestUtils';
import { TEAM_CONFIGS } from '../game/testUtils';
import { FORMATS, FORMATIONS } from '../constants/teamConfiguration';
import { VENUE_TYPES } from '../constants/matchVenues';
import { getModeDefinition } from '../constants/gameModes';

// ===================================================================
// SHARED I18N SETUP
// ===================================================================

export const testI18n = createTestI18n();

/**
 * Render a component wrapped in I18nextProvider for integration tests
 */
export const renderWithI18n = (component) => {
  return render(
    <I18nextProvider i18n={testI18n}>
      {component}
    </I18nextProvider>
  );
};

// ===================================================================
// FORMATION TEST MATRIX
// ===================================================================

/**
 * Parameterized test configurations for describe.each tests.
 * Each entry describes a valid team configuration with expected slot counts.
 */
export const FORMATION_TEST_MATRIX = [
  // 5v5 2-2: 3 squad sizes
  {
    name: '5v5 2-2 6p',
    teamConfig: TEAM_CONFIGS.INDIVIDUAL_6,
    expectedFieldSlots: 4,
    expectedSubSlots: 1,
    expectedTotalOutfield: 5
  },
  {
    name: '5v5 2-2 7p',
    teamConfig: TEAM_CONFIGS.INDIVIDUAL_7,
    expectedFieldSlots: 4,
    expectedSubSlots: 2,
    expectedTotalOutfield: 6
  },
  {
    name: '5v5 2-2 9p',
    teamConfig: TEAM_CONFIGS.INDIVIDUAL_9,
    expectedFieldSlots: 4,
    expectedSubSlots: 4,
    expectedTotalOutfield: 8
  },
  // 5v5 1-2-1: 3 squad sizes
  {
    name: '5v5 1-2-1 6p',
    teamConfig: TEAM_CONFIGS.INDIVIDUAL_6_1_2_1,
    expectedFieldSlots: 4,
    expectedSubSlots: 1,
    expectedTotalOutfield: 5
  },
  {
    name: '5v5 1-2-1 7p',
    teamConfig: TEAM_CONFIGS.INDIVIDUAL_7_1_2_1,
    expectedFieldSlots: 4,
    expectedSubSlots: 2,
    expectedTotalOutfield: 6
  },
  {
    name: '5v5 1-2-1 9p',
    teamConfig: TEAM_CONFIGS.INDIVIDUAL_9_1_2_1,
    expectedFieldSlots: 4,
    expectedSubSlots: 4,
    expectedTotalOutfield: 8
  },
  // 7v7 2-2-2: 3 squad sizes
  {
    name: '7v7 2-2-2 7p (min)',
    teamConfig: TEAM_CONFIGS.INDIVIDUAL_7V7_MIN,
    expectedFieldSlots: 6,
    expectedSubSlots: 0,
    expectedTotalOutfield: 6
  },
  {
    name: '7v7 2-2-2 9p',
    teamConfig: TEAM_CONFIGS.INDIVIDUAL_7V7_222,
    expectedFieldSlots: 6,
    expectedSubSlots: 2,
    expectedTotalOutfield: 8
  },
  {
    name: '7v7 2-2-2 10p',
    teamConfig: TEAM_CONFIGS.INDIVIDUAL_7V7_222_10,
    expectedFieldSlots: 6,
    expectedSubSlots: 3,
    expectedTotalOutfield: 9
  },
  // 7v7 2-3-1: 2 squad sizes
  {
    name: '7v7 2-3-1 8p',
    teamConfig: TEAM_CONFIGS.INDIVIDUAL_7V7_231_8,
    expectedFieldSlots: 6,
    expectedSubSlots: 1,
    expectedTotalOutfield: 7
  },
  {
    name: '7v7 2-3-1 10p',
    teamConfig: TEAM_CONFIGS.INDIVIDUAL_7V7_231,
    expectedFieldSlots: 6,
    expectedSubSlots: 3,
    expectedTotalOutfield: 9
  }
];

// ===================================================================
// TEST CONVENTIONS
// ===================================================================

/**
 * Return the default goalie player ID for a given teamConfig.
 *
 * Convention: mock players are numbered 1..squadSize and the *last*
 * player (squadSize) is always assigned as goalie.  Extracting
 * this into a helper makes the assumption explicit and easy to change.
 */
export const defaultGoalieId = (teamConfig) => String(teamConfig.squadSize);

// ===================================================================
// PERIOD SETUP SCREEN HELPERS
// ===================================================================

/**
 * Get field positions from production getModeDefinition.
 */
const getFieldPositions = (teamConfig) => {
  const definition = getModeDefinition(teamConfig);
  return definition ? definition.fieldPositions : [];
};

/**
 * Get substitute positions from production getModeDefinition.
 */
const getSubstitutePositions = (teamConfig) => {
  const definition = getModeDefinition(teamConfig);
  return definition ? definition.substitutePositions : [];
};

/**
 * Configure all mocks required by PeriodSetupScreen:
 * - useTeam (TeamContext)
 * - usePlayerRecommendationData
 * - matchStateManager.getPlayerStats
 */
export const setupPeriodSetupMocks = (teamConfig) => {
  const { useTeam } = require('../contexts/TeamContext');
  const { getPlayerStats } = require('../services/matchStateManager');
  const { usePlayerRecommendationData } = require('../hooks/usePlayerRecommendationData');

  useTeam.mockReturnValue({
    currentTeam: { id: 'team-123' },
    loadTeamPreferences: jest.fn(() => Promise.resolve({ alternateRoles: true }))
  });

  getPlayerStats.mockImplementation(() => new Promise(() => {}));

  usePlayerRecommendationData.mockReturnValue({
    playerStats: null,
    loading: false,
    error: null
  });
};

/**
 * Build a complete empty formation object for a given teamConfig.
 * Field and substitute positions are set to null; goalie uses the last player id.
 */
export const buildEmptyFormation = (teamConfig, goalieId = null) => {
  const fieldPositions = getFieldPositions(teamConfig);
  const substitutePositions = getSubstitutePositions(teamConfig);

  const formation = {};
  fieldPositions.forEach(pos => { formation[pos] = null; });
  substitutePositions.forEach(pos => { formation[pos] = null; });
  formation.goalie = goalieId;

  return formation;
};

/**
 * Build a complete (filled) formation for PeriodSetupScreen tests.
 * Players are numbered 1..N with goalie assigned to squadSize.
 */
export const buildCompleteFormation = (teamConfig) => {
  const fieldPositions = getFieldPositions(teamConfig);
  const substitutePositions = getSubstitutePositions(teamConfig);
  const goalieId = defaultGoalieId(teamConfig);

  const formation = {};
  let playerId = 1;

  fieldPositions.forEach(pos => {
    formation[pos] = String(playerId++);
  });
  substitutePositions.forEach(pos => {
    formation[pos] = String(playerId++);
  });
  formation.goalie = goalieId;

  return formation;
};

/**
 * Create standard PeriodSetupScreen props for a given teamConfig.
 */
export const createPeriodSetupProps = (teamConfig, overrides = {}) => {
  const players = createMockPlayers(teamConfig.squadSize, teamConfig);
  const goalieId = defaultGoalieId(teamConfig);
  const formation = overrides.formation || buildEmptyFormation(teamConfig, goalieId);
  const fieldPositions = getFieldPositions(teamConfig);
  const substitutePositions = getSubstitutePositions(teamConfig);
  const outfieldCount = fieldPositions.length + substitutePositions.length;

  return {
    currentPeriodNumber: 1,
    formation,
    setFormation: jest.fn(),
    availableForAssignment: players.slice(0, outfieldCount),
    allPlayers: players,
    setAllPlayers: jest.fn(),
    handleStartGame: jest.fn(),
    gameLog: [],
    selectedSquadPlayers: players,
    periodGoalieIds: { 1: goalieId },
    setPeriodGoalieIds: jest.fn(),
    numPeriods: 2,
    teamConfig,
    selectedFormation: teamConfig.formation,
    setView: jest.fn(),
    onNavigateBack: jest.fn(),
    onNavigateTo: jest.fn(),
    pushNavigationState: jest.fn(),
    removeFromNavigationStack: jest.fn(),
    ownScore: 0,
    opponentScore: 0,
    opponentTeam: 'Test Opponent',
    rotationQueue: Array.from({ length: outfieldCount }, (_, i) => String(i + 1)),
    setRotationQueue: jest.fn(),
    preparePeriodWithGameLog: jest.fn(),
    matchState: 'not_started',
    debugMode: false,
    ...overrides
  };
};

// ===================================================================
// GAME SCREEN HELPERS
// ===================================================================

/**
 * Configure all mocks required by GameScreen, following the pattern
 * from GameScreenNavigationFlows.test.js setupGameScreenHooks.
 */
export const setupGameScreenHooks = () => {
  require('../hooks/useGameModals').useGameModals.mockReturnValue({
    modals: {
      fieldPlayer: { isOpen: false, type: null, target: null, playerName: '', sourcePlayerId: null, availablePlayers: [], showPositionOptions: false },
      substitute: { isOpen: false, playerId: null, playerName: '', isCurrentlyInactive: false, canSetAsNextToGoIn: false },
      substituteSelection: { isOpen: false, fieldPlayerName: '', fieldPlayerId: null, availableSubstitutes: [] },
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
    resetAnimationState: jest.fn(),
    substitutionCountOverride: null,
    setSubstitutionCountOverride: jest.fn(),
    clearSubstitutionCountOverride: jest.fn(),
    substitutionOverride: null,
    setSubstitutionOverride: jest.fn(),
    clearSubstitutionOverride: jest.fn(),
    shouldResetSubTimerOnNextSub: true,
    setShouldResetSubTimerOnNextSub: jest.fn()
  });

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

  const substitutionHandlersMock = {
    handleSubstitution: jest.fn(),
    handleSubstitutionWithHighlight: jest.fn(),
    handleUndo: jest.fn(),
    handleSetNextSubstitution: jest.fn(),
    handleRemoveFromNextSubstitution: jest.fn(),
    handleSubstituteNow: jest.fn(),
    handleCancelFieldPlayerModal: jest.fn(),
    handleChangePosition: jest.fn(),
    handleInactivatePlayer: jest.fn(),
    handleActivatePlayer: jest.fn(),
    handleCancelSubstituteModal: jest.fn(),
    handleSetAsNextToGoIn: jest.fn(),
    handleChangeNextPosition: jest.fn(),
    handleSelectSubstituteForImmediate: jest.fn(),
    handleCancelSubstituteSelection: jest.fn()
  };
  require('../game/handlers/substitutionHandlers').createSubstitutionHandlers.mockReturnValue(substitutionHandlersMock);

  const fieldPositionHandlersMock = {
    handleFieldPlayerClick: jest.fn(),
    handleFieldPlayerQuickTap: jest.fn(),
    handleSubstituteClick: jest.fn(),
    handleGoalieClick: jest.fn()
  };
  require('../game/handlers/fieldPositionHandlers').createFieldPositionHandlers.mockReturnValue(fieldPositionHandlersMock);

  const timerHandlersMock = {
    handlePauseTimer: jest.fn(),
    handleResumeTimer: jest.fn(),
    handleResetTimer: jest.fn()
  };
  require('../game/handlers/timerHandlers').createTimerHandlers.mockReturnValue(timerHandlersMock);

  const scoreHandlersMock = {
    handleAddGoalScored: jest.fn(),
    handleAddGoalConceded: jest.fn(),
    handleSelectGoalScorer: jest.fn(),
    handleCorrectGoalScorer: jest.fn(),
    handleEditGoalScorer: jest.fn(),
    handleDeleteGoal: jest.fn(),
    handleCancelGoalScorer: jest.fn(),
    handleScoreEdit: jest.fn(),
    handleOpenScoreEdit: jest.fn(),
    scoreCallback: jest.fn()
  };
  require('../game/handlers/scoreHandlers').createScoreHandlers.mockReturnValue(scoreHandlersMock);

  const goalieHandlersMock = {
    goalieCallback: jest.fn(),
    handleCancelGoalieModal: jest.fn(),
    handleSelectNewGoalie: jest.fn()
  };
  require('../game/handlers/goalieHandlers').createGoalieHandlers.mockReturnValue(goalieHandlersMock);

  require('../utils/playerUtils').hasActiveSubstitutes.mockReturnValue(true);

  return {
    substitutionHandlers: substitutionHandlersMock,
    fieldPositionHandlers: fieldPositionHandlersMock,
    timerHandlers: timerHandlersMock,
    scoreHandlers: scoreHandlersMock,
    goalieHandlers: goalieHandlersMock
  };
};

/**
 * Create GameScreen props for a given teamConfig with all required fields.
 */
export const createGameScreenProps = (teamConfig, overrides = {}) => {
  const formation = overrides.formation || createMockFormation(teamConfig);
  const allPlayers = overrides.allPlayers || createMockPlayers(teamConfig.squadSize, teamConfig);

  return {
    ...createMockGameScreenProps({
      teamConfig,
      formation,
      allPlayers,
      selectedSquadPlayers: allPlayers,
      selectedFormation: teamConfig.formation,
      matchState: 'pending',
      matchTimerSeconds: 0,
      subTimerSeconds: 120,
      ownScore: 0,
      opponentScore: 0,
      opponentTeam: 'Test Opponent',
      currentPeriodNumber: 1,
      handleActualMatchStart: jest.fn(),
      handleEndPeriod: jest.fn(),
      matchEvents: [],
      goalScorers: [],
      matchStartTime: null,
      currentMatchId: null,
      periodDurationMinutes: 15,
      trackGoalScorer: true,
      getPlayerName: jest.fn((id) => `Player ${id}`),
      setShowNewGameModal: jest.fn(),
      ownTeamName: 'Test Team',
      ...overrides
    })
  };
};

// ===================================================================
// CONFIGURATION SCREEN HELPERS
// ===================================================================

/**
 * Create ConfigurationScreen props following the buildProps pattern
 * from ConfigurationScreen.test.js.
 */
export const createConfigurationProps = (overrides = {}) => ({
  allPlayers: [],
  setAllPlayers: jest.fn(),
  selectedSquadIds: [],
  setSelectedSquadIds: jest.fn(),
  numPeriods: 2,
  setNumPeriods: jest.fn(),
  periodDurationMinutes: 15,
  setPeriodDurationMinutes: jest.fn(),
  periodGoalieIds: {},
  setPeriodGoalieIds: jest.fn(),
  teamConfig: {
    format: FORMATS.FORMAT_5V5,
    squadSize: 7,
    formation: FORMATIONS.FORMATION_2_2
  },
  updateTeamConfig: jest.fn(),
  selectedFormation: FORMATIONS.FORMATION_2_2,
  setSelectedFormation: jest.fn(),
  updateFormationSelection: jest.fn(),
  createTeamConfigFromSquadSize: jest.fn(),
  formation: { goalie: null },
  setFormation: jest.fn(),
  alertMinutes: 2,
  setAlertMinutes: jest.fn(),
  handleStartPeriodSetup: jest.fn(),
  handleSaveConfiguration: jest.fn(),
  selectedSquadPlayers: [],
  opponentTeam: '',
  setOpponentTeam: jest.fn(),
  matchType: 'league',
  setMatchType: jest.fn(),
  venueType: VENUE_TYPES.HOME,
  setVenueType: jest.fn(),
  captainId: null,
  setCaptain: jest.fn(),
  debugMode: false,
  authModal: { open: jest.fn() },
  setView: jest.fn(),
  syncPlayersFromTeamRoster: jest.fn(),
  setCurrentMatchId: jest.fn(),
  currentMatchId: null,
  setMatchCreated: jest.fn(),
  hasActiveConfiguration: false,
  setHasActiveConfiguration: jest.fn(),
  clearStoredState: jest.fn(),
  configurationSessionId: 0,
  onNavigateBack: jest.fn(),
  onNavigateTo: jest.fn(),
  pushNavigationState: jest.fn(),
  removeFromNavigationStack: jest.fn(),
  ...overrides
});

// ===================================================================
// GAME SCREEN HOOKS — REAL HANDLERS (no handler factory mocks)
// ===================================================================

/**
 * Configure hook mocks for GameScreen WITHOUT mocking handler factories.
 *
 * When handler factories (createSubstitutionHandlers, createScoreHandlers, etc.)
 * are NOT mocked, GameScreen calls the real factories which produce real handlers.
 * Those handlers use mock state updaters (jest.fn() from props + hooks) so we can
 * verify actual state transformations.
 *
 * Returns references to all mock functions grouped by category for assertion.
 */
export const setupGameScreenHooksWithRealHandlers = () => {
  const modalMocks = {
    modals: {
      fieldPlayer: { isOpen: false, type: null, target: null, playerName: '', sourcePlayerId: null, availablePlayers: [], showPositionOptions: false },
      substitute: { isOpen: false, playerId: null, playerName: '', isCurrentlyInactive: false, canSetAsNextToGoIn: false },
      substituteSelection: { isOpen: false, fieldPlayerName: '', fieldPlayerId: null, availableSubstitutes: [] },
      goalie: { isOpen: false, currentGoalieName: '', availablePlayers: [] },
      scoreEdit: { isOpen: false },
      undoConfirm: { isOpen: false },
      goalScorer: { isOpen: false, eventId: null, team: 'own', mode: 'new', matchTime: '00:00', periodNumber: 1, existingGoalData: null }
    },
    openFieldPlayerModal: jest.fn(),
    closeFieldPlayerModal: jest.fn(),
    openSubstituteModal: jest.fn(),
    closeSubstituteModal: jest.fn(),
    openSubstituteSelectionModal: jest.fn(),
    closeSubstituteSelectionModal: jest.fn(),
    openGoalieModal: jest.fn(),
    closeGoalieModal: jest.fn(),
    openScoreEditModal: jest.fn(),
    closeScoreEditModal: jest.fn(),
    openUndoConfirmModal: jest.fn(),
    closeUndoConfirmModal: jest.fn(),
    openGoalScorerModal: jest.fn(),
    closeGoalScorerModal: jest.fn(),
    // Pending goal operations (needed by real createScoreHandlers)
    setPendingGoalData: jest.fn(),
    getPendingGoalData: jest.fn(() => null),
    clearPendingGoal: jest.fn(),
    // Generic operations
    openModal: jest.fn(),
    closeModal: jest.fn(),
    closeModalWithNavigation: jest.fn(),
    closeAllModals: jest.fn()
  };
  require('../hooks/useGameModals').useGameModals.mockReturnValue(modalMocks);

  const uiStateMocks = {
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
    resetAnimationState: jest.fn(),
    substitutionCountOverride: null,
    setSubstitutionCountOverride: jest.fn(),
    clearSubstitutionCountOverride: jest.fn(),
    substitutionOverride: null,
    setSubstitutionOverride: jest.fn(),
    clearSubstitutionOverride: jest.fn(),
    shouldResetSubTimerOnNextSub: true,
    setShouldResetSubTimerOnNextSub: jest.fn()
  };
  require('../hooks/useGameUIState').useGameUIState.mockReturnValue(uiStateMocks);

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

  require('../utils/playerUtils').hasActiveSubstitutes.mockReturnValue(true);

  return { modalMocks, uiStateMocks };
};

// ===================================================================
// MODAL STATE HELPERS
// ===================================================================

/**
 * Default modal state (all modals closed).
 */
const DEFAULT_MODAL_STATE = {
  fieldPlayer: { isOpen: false, type: null, target: null, playerName: '', sourcePlayerId: null, availablePlayers: [], showPositionOptions: false, isPlayerAboutToSubOff: false },
  substitute: { isOpen: false, playerId: null, playerName: '', isCurrentlyInactive: false, canSetAsNextToGoIn: false, canChangeNextPosition: false, availableNextPositions: [], showPositionSelection: false },
  substituteSelection: { isOpen: false, fieldPlayerName: '', fieldPlayerId: null, availableSubstitutes: [] },
  goalie: { isOpen: false, currentGoalieName: '', availablePlayers: [] },
  scoreEdit: { isOpen: false },
  undoConfirm: { isOpen: false },
  goalScorer: { isOpen: false, eventId: null, team: 'own', mode: 'new', matchTime: '00:00', periodNumber: 1, existingGoalData: null }
};

/**
 * Reconfigure the useGameModals mock with a specific modal state.
 * Only the specified modal overrides are applied; all other modals remain closed.
 *
 * @param {Object} modalOverrides - Object with modal keys and their state overrides.
 *   Example: { fieldPlayer: { isOpen: true, playerName: 'Alice', type: 'player' } }
 */
export const configureGameModals = (modalOverrides = {}) => {
  const modals = { ...DEFAULT_MODAL_STATE };
  for (const [key, overrides] of Object.entries(modalOverrides)) {
    if (modals[key]) {
      modals[key] = { ...modals[key], ...overrides };
    }
  }

  require('../hooks/useGameModals').useGameModals.mockReturnValue({
    modals,
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
};
