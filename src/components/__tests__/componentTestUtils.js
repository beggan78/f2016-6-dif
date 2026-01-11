/**
 * Shared testing utilities for React components
 * Provides common rendering utilities, mocks, and helpers for component testing
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PLAYER_ROLES, PLAYER_STATUS } from '../../constants/playerConstants';
import { TEAM_CONFIGS } from '../../game/testUtils';
import { getModeDefinition } from '../../constants/gameModes';

/**
 * Create mock props for GameScreen component
 */
export const createMockGameScreenProps = (overrides = {}) => {
  const teamConfig = overrides.teamConfig || {
    format: '5v5',
    squadSize: 7,
    formation: '2-2'
  };
  const formation = overrides.formation || createMockFormation(teamConfig);
  const allPlayers = overrides.allPlayers || createMockPlayers(teamConfig.squadSize || 7, teamConfig);
  
  return {
    currentPeriodNumber: 1,
    formation,
    setFormation: jest.fn(),
    allPlayers,
    setAllPlayers: jest.fn(),
    matchTimerSeconds: 900, // 15 minutes
    subTimerSeconds: 120,   // 2 minutes
    isSubTimerPaused: false,
    pauseSubTimer: jest.fn(),
    resumeSubTimer: jest.fn(),
    formatTime: jest.fn((seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }),
    resetSubTimer: jest.fn(),
    handleUndoSubstitution: jest.fn(),
    handleEndPeriod: jest.fn(),
    nextPlayerToSubOut: 'leftDefender',
    nextPlayerIdToSubOut: '1',
    nextNextPlayerIdToSubOut: '2',
    setNextNextPlayerIdToSubOut: jest.fn(),
    selectedSquadPlayers: allPlayers,
    setNextPlayerToSubOut: jest.fn(),
    setNextPlayerIdToSubOut: jest.fn(),
    teamConfig,
    selectedFormation: teamConfig?.formation || '2-2',
    alertMinutes: 2,
    pushNavigationState: jest.fn(),
    removeFromNavigationStack: jest.fn(),
    onNavigateBack: jest.fn(),
    onNavigateTo: jest.fn(),
    ownScore: 0,
    opponentScore: 0,
    opponentTeam: 'Test Opponent',
    addGoalScored: jest.fn(),
    addGoalConceded: jest.fn(),
    setScore: jest.fn(),
    rotationQueue: ['1', '2', '3', '4', '5', '6'],
    setRotationQueue: jest.fn(),
    trackGoalScorer: true,
    ...overrides
  };
};

/**
 * Create mock players for component testing
 * @param {number} count - Number of players to create
 * @param {Object} teamConfig - Team config object to use for player structure
 */
export const createMockPlayers = (count = 7, teamConfig = TEAM_CONFIGS.INDIVIDUAL_7) => {
  const players = [];
  
  for (let i = 1; i <= count; i++) {
    let status, role, positionKey;

    const modeDefinition = getModeDefinition(teamConfig);
    const fieldPositions = modeDefinition?.fieldPositions || [];
    const substitutePositions = modeDefinition?.substitutePositions || [];
    const totalOutfield = fieldPositions.length + substitutePositions.length;

    if (i <= fieldPositions.length) {
      status = PLAYER_STATUS.ON_FIELD;
      positionKey = fieldPositions[i - 1];
      role = modeDefinition?.positions?.[positionKey]?.role || PLAYER_ROLES.FIELD_PLAYER;
    } else if (i <= totalOutfield) {
      status = PLAYER_STATUS.SUBSTITUTE;
      const subIndex = i - fieldPositions.length - 1;
      positionKey = substitutePositions[subIndex];
      role = modeDefinition?.positions?.[positionKey]?.role || PLAYER_ROLES.SUBSTITUTE;
    } else {
      status = PLAYER_STATUS.GOALIE;
      role = PLAYER_ROLES.GOALIE;
      positionKey = 'goalie';
    }
    
    const displayName = `Player ${i}`;

    players.push({
      id: `${i}`,
      displayName,
      firstName: displayName,
      lastName: null,
      stats: {
        isInactive: false,
        currentStatus: status,
        currentRole: role,
        currentPositionKey: positionKey,
        lastStintStartTimeEpoch: Date.now() - (i * 30000),
        timeOnFieldSeconds: i * 30,
        timeAsAttackerSeconds: role === PLAYER_ROLES.ATTACKER ? i * 15 : 0,
        timeAsMidfielderSeconds: role === PLAYER_ROLES.MIDFIELDER ? i * 15 : 0,
        timeAsDefenderSeconds: role === PLAYER_ROLES.DEFENDER ? i * 15 : 0,
        timeAsSubSeconds: status === PLAYER_STATUS.SUBSTITUTE ? i * 10 : 0,
        timeAsGoalieSeconds: status === PLAYER_STATUS.GOALIE ? i * 30 : 0,
        startedMatchAs: status === PLAYER_STATUS.ON_FIELD ? PLAYER_ROLES.FIELD_PLAYER :
                       status === PLAYER_STATUS.GOALIE ? PLAYER_ROLES.GOALIE : PLAYER_ROLES.SUBSTITUTE,
        startedAtRole: role,
        startedAtPosition: positionKey,
        startLocked: false,
        periodsAsGoalie: status === PLAYER_STATUS.GOALIE ? 1 : 0,
        periodsAsDefender: role === PLAYER_ROLES.DEFENDER ? 1 : 0,
        periodsAsAttacker: role === PLAYER_ROLES.ATTACKER ? 1 : 0,
        periodsAsMidfielder: role === PLAYER_ROLES.MIDFIELDER ? 1 : 0
      }
    });
  }
  
  return players;
};

/**
 * Create mock formation for different team configs
 */
export const createMockFormation = (teamConfig = TEAM_CONFIGS.INDIVIDUAL_7) => {
  const squadSize = teamConfig.squadSize || 7;
  const goalieId = squadSize.toString();

  const modeDefinition = getModeDefinition(teamConfig);

  if (!modeDefinition) {
    throw new Error(`Unable to build formation for teamConfig: ${JSON.stringify(teamConfig)}`);
  }

  const formation = { goalie: goalieId };
  let playerId = 1;

  modeDefinition.fieldPositions.forEach(position => {
    formation[position] = playerId.toString();
    playerId += 1;
  });

  modeDefinition.substitutePositions.forEach(position => {
    formation[position] = playerId.toString();
    playerId += 1;
  });

  return formation;
};

/**
 * Mock React hooks used in components
 */
export const createMockHooks = () => ({
  useGameModals: jest.fn(() => ({
    modals: {
      fieldPlayer: {
        isOpen: false,
        type: null,
        target: null,
        playerName: '',
        sourcePlayerId: null,
        availablePlayers: [],
        showPositionOptions: false
      },
      substitute: {
        isOpen: false,
        playerId: null,
        playerName: '',
        isCurrentlyInactive: false,
        canSetAsNextToGoIn: false
      },
      goalie: {
        isOpen: false,
        currentGoalieName: '',
        availablePlayers: []
      },
      scoreEdit: {
        isOpen: false
      },
      undoConfirm: {
        isOpen: false
      },
      goalScorer: {
        isOpen: false,
        eventId: null,
        team: 'own',
        mode: 'new',
        matchTime: '00:00',
        periodNumber: 1,
        existingGoalData: null
      }
    },
    openModal: jest.fn(),
    closeModal: jest.fn(),
    closeModalWithNavigation: jest.fn(),
    closeAllModals: jest.fn(),
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
    closeGoalScorerModal: jest.fn(),
    showFieldPlayerModal: jest.fn(),
    showSubstitutePlayerModal: jest.fn(),
    showGoalieModal: jest.fn(),
    showScoreEditModal: jest.fn(),
    showConfirmationModal: jest.fn(),
    closeModal: jest.fn()
  })),
  
  useGameUIState: jest.fn(() => ({
    selectedPlayerId: null,
    setSelectedPlayerId: jest.fn(),
    animationState: 'idle',
    setAnimationState: jest.fn(),
    uiDisabled: false,
    setUiDisabled: jest.fn()
  })),
  
  useTeamNameAbbreviation: jest.fn(() => ({
    scoreRowRef: { current: null },
    displayOwnTeam: 'Own Team',
    displayOpponentTeam: 'Test Opponent'
  })),
  
  useFieldPositionHandlers: jest.fn(() => ({
    handleFieldPlayerClick: jest.fn(),
    handleFieldPlayerQuickTap: jest.fn()
  })),
  
  useQuickTapWithScrollDetection: jest.fn(() => ({
    onTouchStart: jest.fn(),
    onTouchEnd: jest.fn(),
    onMouseDown: jest.fn(),
    onMouseUp: jest.fn(),
    onMouseLeave: jest.fn()
  })),
  
  // Keep legacy mock for backward compatibility
  useLongPressWithScrollDetection: jest.fn(() => ({
    onTouchStart: jest.fn(),
    onTouchEnd: jest.fn(),
    onMouseDown: jest.fn(),
    onMouseUp: jest.fn(),
    onMouseLeave: jest.fn()
  }))
});

/**
 * Mock external handler functions
 */
export const createMockHandlers = () => ({
  createSubstitutionHandlers: jest.fn(() => ({
    handleSubstitution: jest.fn(),
    handleUndoSubstitution: jest.fn()
  })),
  
  createFieldPositionHandlers: jest.fn(() => ({
    handleFieldPlayerClick: jest.fn(),
    handleFieldPlayerQuickTap: jest.fn(),
    handleSubstituteClick: jest.fn(),
    handleGoalieClick: jest.fn()
  })),
  
  createTimerHandlers: jest.fn(() => ({
    handlePauseTimer: jest.fn(),
    handleResumeTimer: jest.fn(),
    handleResetTimer: jest.fn()
  })),
  
  createScoreHandlers: jest.fn(() => ({
    handleAddGoalScored: jest.fn(),
    handleAddGoalConceded: jest.fn(),
    handleSelectGoalScorer: jest.fn(),
    handleCorrectGoalScorer: jest.fn(),
    handleScoreEdit: jest.fn(),
    handleOpenScoreEdit: jest.fn(),
    scoreCallback: jest.fn()
  })),
  
  createGoalieHandlers: jest.fn(() => ({
    handleGoalieSwitch: jest.fn(),
    handleGoalieClick: jest.fn()
  }))
});

/**
 * Setup component test environment with all necessary mocks
 */
export const setupComponentTestEnvironment = () => {
  const mockHooks = createMockHooks();
  const mockHandlers = createMockHandlers();
  
  // Mock all the React hooks
  jest.mock('../../hooks/useGameModals', () => ({
    useGameModals: mockHooks.useGameModals
  }));
  
  jest.mock('../../hooks/useGameUIState', () => ({
    useGameUIState: mockHooks.useGameUIState
  }));
  
  jest.mock('../../hooks/useTeamNameAbbreviation', () => ({
    useTeamNameAbbreviation: mockHooks.useTeamNameAbbreviation
  }));
  
  jest.mock('../../hooks/useFieldPositionHandlers', () => ({
    useFieldPositionHandlers: mockHooks.useFieldPositionHandlers
  }));
  
  jest.mock('../../hooks/useQuickTapWithScrollDetection', () => ({
    useQuickTapWithScrollDetection: mockHooks.useQuickTapWithScrollDetection
  }));
  
  // Legacy mock for backward compatibility
  jest.mock('../../hooks/useLongPressWithScrollDetection', () => ({
    useLongPressWithScrollDetection: mockHooks.useLongPressWithScrollDetection
  }));
  
  // Mock handler creators
  jest.mock('../../game/handlers/substitutionHandlers', () => ({
    createSubstitutionHandlers: mockHandlers.createSubstitutionHandlers
  }));
  
  jest.mock('../../game/handlers/fieldPositionHandlers', () => ({
    createFieldPositionHandlers: mockHandlers.createFieldPositionHandlers
  }));
  
  jest.mock('../../game/handlers/timerHandlers', () => ({
    createTimerHandlers: mockHandlers.createTimerHandlers
  }));
  
  jest.mock('../../game/handlers/scoreHandlers', () => ({
    createScoreHandlers: mockHandlers.createScoreHandlers
  }));
  
  jest.mock('../../game/handlers/goalieHandlers', () => ({
    createGoalieHandlers: mockHandlers.createGoalieHandlers
  }));
  
  return {
    mockHooks,
    mockHandlers,
    cleanup: () => {
      jest.clearAllMocks();
      jest.restoreAllMocks();
    }
  };
};

/**
 * Custom render function with common providers and mocks
 */
export const renderWithProviders = (component, options = {}) => {
  const { 
    initialProps = {},
    mockEnvironment = setupComponentTestEnvironment(),
    ...renderOptions 
  } = options;
  
  const AllTheProviders = ({ children }) => {
    return children; // Add providers here if needed (Context, Router, etc.)
  };
  
  return {
    ...render(component, { wrapper: AllTheProviders, ...renderOptions }),
    mockEnvironment
  };
};

/**
 * User interaction helpers
 */
export const userInteractions = {
  clickElement: async (element) => {
    await userEvent.click(element);
  },
  
  shortTapElement: async (element, duration = 150) => {
    fireEvent.touchStart(element);
    await waitFor(() => new Promise(resolve => setTimeout(resolve, duration)));
    fireEvent.touchEnd(element);
  },
  
  // Keep legacy method for backward compatibility in tests
  longPressElement: async (element, duration = 150) => {
    fireEvent.touchStart(element);
    await waitFor(() => new Promise(resolve => setTimeout(resolve, duration)));
    fireEvent.touchEnd(element);
  },
  
  typeInInput: async (input, text) => {
    await userEvent.clear(input);
    await userEvent.type(input, text);
  },
  
  selectOption: async (select, option) => {
    await userEvent.selectOptions(select, option);
  }
};

/**
 * Assertion helpers for component testing
 */
export const componentAssertions = {
  expectElementToBeVisible: (element) => {
    expect(element).toBeInTheDocument();
    expect(element).toBeVisible();
  },
  
  expectButtonToBeEnabled: (button) => {
    expect(button).toBeInTheDocument();
    expect(button).toBeEnabled();
  },
  
  expectButtonToBeDisabled: (button) => {
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  },
  
  expectModalToBeOpen: () => {
    const modal = screen.getByRole('dialog');
    expect(modal).toBeInTheDocument();
  },
  
  expectModalToBeClosed: () => {
    const modal = screen.queryByRole('dialog');
    expect(modal).not.toBeInTheDocument();
  },
  
  expectTextContent: (element, expectedText) => {
    expect(element).toHaveTextContent(expectedText);
  },
  
  expectFormationToBeRendered: (teamConfig) => {
    // Formation-specific assertions based on team config
    expect(screen.getByText(/defender|attacker|midfielder/i)).toBeInTheDocument();
  }
};

/**
 * Wait for async operations in components
 */
export const waitForComponent = {
  forElement: (selector) => waitFor(() => screen.getByTestId(selector)),
  forText: (text) => waitFor(() => screen.getByText(text)),
  forElementToDisappear: (element) => waitFor(() => expect(element).not.toBeInTheDocument()),
  forSeconds: (seconds) => waitFor(() => new Promise(resolve => setTimeout(resolve, seconds * 1000)))
};

export default {
  createMockGameScreenProps,
  createMockPlayers,
  createMockFormation,
  createMockHooks,
  createMockHandlers,
  setupComponentTestEnvironment,
  renderWithProviders,
  userInteractions,
  componentAssertions,
  waitForComponent
};

// Simple validation test to prevent Jest from failing on this utilities file  
describe('Component Test Utilities', () => {
  it('should export all required utilities', () => {
    expect(createMockGameScreenProps).toBeInstanceOf(Function);
    expect(createMockPlayers).toBeInstanceOf(Function);
    expect(createMockFormation).toBeInstanceOf(Function);
    expect(setupComponentTestEnvironment).toBeInstanceOf(Function);
    expect(userInteractions).toBeInstanceOf(Object);
    expect(componentAssertions).toBeInstanceOf(Object);
  });
});
