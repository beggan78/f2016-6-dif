/**
 * Shared testing utilities for React components
 * Provides common rendering utilities, mocks, and helpers for component testing
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TEAM_MODES, PLAYER_ROLES, PLAYER_STATUS } from '../../constants/playerConstants';

/**
 * Create mock props for GameScreen component
 */
export const createMockGameScreenProps = (overrides = {}) => {
  const teamConfig = overrides.teamConfig || {
    format: '5v5',
    squadSize: 7,
    formation: '2-2',
    substitutionType: 'individual'
  };
  const formation = overrides.formation || createMockFormation(TEAM_MODES.INDIVIDUAL_7);
  const allPlayers = overrides.allPlayers || createMockPlayers(7, TEAM_MODES.INDIVIDUAL_7);
  
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
    nextPhysicalPairToSubOut: teamConfig?.substitutionType === 'pairs' ? 'leftPair' : 'leftDefender',
    nextPlayerToSubOut: 'leftDefender',
    nextPlayerIdToSubOut: '1',
    nextNextPlayerIdToSubOut: '2',
    setNextNextPlayerIdToSubOut: jest.fn(),
    selectedSquadPlayers: allPlayers,
    setNextPhysicalPairToSubOut: jest.fn(),
    setNextPlayerToSubOut: jest.fn(),
    setNextPlayerIdToSubOut: jest.fn(),
    teamConfig,
    selectedFormation: teamConfig?.formation || '2-2',
    alertMinutes: 2,
    pushModalState: jest.fn(),
    removeModalFromStack: jest.fn(),
    homeScore: 0,
    awayScore: 0,
    opponentTeamName: 'Test Opponent',
    addHomeGoal: jest.fn(),
    addAwayGoal: jest.fn(),
    setScore: jest.fn(),
    rotationQueue: ['1', '2', '3', '4', '5', '6'],
    setRotationQueue: jest.fn(),
    ...overrides
  };
};

/**
 * Create mock players for component testing
 * @param {number} count - Number of players to create
 * @param {string} teamMode - Team mode to use for player structure (defaults to INDIVIDUAL_7)
 */
export const createMockPlayers = (count = 7, teamMode = TEAM_MODES.INDIVIDUAL_7) => {
  const players = [];
  
  for (let i = 1; i <= count; i++) {
    let status, role, pairKey;
    
    if (teamMode === TEAM_MODES.PAIRS_7) {
      // PAIRS_7 mode structure
      if (i <= 4) {
        status = PLAYER_STATUS.ON_FIELD;
        role = i % 2 === 1 ? PLAYER_ROLES.DEFENDER : PLAYER_ROLES.ATTACKER;
        pairKey = i <= 2 ? 'leftPair' : 'rightPair';
      } else if (i <= 6) {
        status = PLAYER_STATUS.SUBSTITUTE;
        role = i % 2 === 1 ? PLAYER_ROLES.DEFENDER : PLAYER_ROLES.ATTACKER;
        pairKey = 'subPair';
      } else {
        status = PLAYER_STATUS.GOALIE;
        role = PLAYER_ROLES.GOALIE;
        pairKey = 'goalie';
      }
    } else {
      // Individual modes structure (INDIVIDUAL_6, INDIVIDUAL_7, INDIVIDUAL_8)
      if (i <= 4) {
        status = PLAYER_STATUS.ON_FIELD;
        role = i <= 2 ? PLAYER_ROLES.DEFENDER : PLAYER_ROLES.ATTACKER;
        pairKey = i <= 2 ? (i === 1 ? 'leftDefender' : 'rightDefender') :
                          (i === 3 ? 'leftAttacker' : 'rightAttacker');
      } else if (i < count) {
        status = PLAYER_STATUS.SUBSTITUTE;
        role = PLAYER_ROLES.SUBSTITUTE;
        pairKey = `substitute_${i - 4}`;
      } else {
        status = PLAYER_STATUS.GOALIE;
        role = PLAYER_ROLES.GOALIE;
        pairKey = 'goalie';
      }
    }
    
    players.push({
      id: `${i}`,
      name: `Player ${i}`,
      stats: {
        isInactive: false,
        currentStatus: status,
        currentRole: role,
        currentPairKey: pairKey,
        lastStintStartTimeEpoch: Date.now() - (i * 30000),
        timeOnFieldSeconds: i * 30,
        timeAsAttackerSeconds: role === PLAYER_ROLES.ATTACKER ? i * 15 : 0,
        timeAsDefenderSeconds: role === PLAYER_ROLES.DEFENDER ? i * 15 : 0,
        timeAsSubSeconds: status === PLAYER_STATUS.SUBSTITUTE ? i * 10 : 0,
        timeAsGoalieSeconds: status === PLAYER_STATUS.GOALIE ? i * 30 : 0,
        startedMatchAs: status === PLAYER_STATUS.ON_FIELD ? PLAYER_ROLES.ON_FIELD :
                       status === PLAYER_STATUS.GOALIE ? PLAYER_ROLES.GOALIE : PLAYER_ROLES.SUBSTITUTE,
        periodsAsGoalie: status === PLAYER_STATUS.GOALIE ? 1 : 0,
        periodsAsDefender: role === PLAYER_ROLES.DEFENDER ? 1 : 0,
        periodsAsAttacker: role === PLAYER_ROLES.ATTACKER ? 1 : 0
      }
    });
  }
  
  return players;
};

/**
 * Create mock formation for different team modes
 */
export const createMockFormation = (teamMode = TEAM_MODES.INDIVIDUAL_7) => {
  switch (teamMode) {
    case TEAM_MODES.PAIRS_7:
      return {
        goalie: '7',
        leftPair: { defender: '1', attacker: '2' },
        rightPair: { defender: '3', attacker: '4' },
        subPair: { defender: '5', attacker: '6' }
      };
      
    case TEAM_MODES.INDIVIDUAL_6:
      return {
        goalie: '6',
        leftDefender: '1',
        rightDefender: '2',
        leftAttacker: '3',
        rightAttacker: '4',
        substitute_1: '5'
      };
      
    case TEAM_MODES.INDIVIDUAL_7:
      return {
        goalie: '7',
        leftDefender: '1',
        rightDefender: '2',
        leftAttacker: '3',
        rightAttacker: '4',
        substitute_1: '5',
        substitute_2: '6'
      };
      
    case TEAM_MODES.INDIVIDUAL_8:
      return {
        goalie: '8',
        leftDefender: '1',
        rightDefender: '2',
        leftAttacker: '3',
        rightAttacker: '4',
        substitute_1: '5',
        substitute_2: '6',
        substitute_3: '7'
      };
      
    default:
      return {
        goalie: '7',
        leftDefender: '1',
        rightDefender: '2',
        leftAttacker: '3',
        rightAttacker: '4',
        substitute_1: '5',
        substitute_2: '6'
      };
  }
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
        team: 'home',
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
    displayHomeTeam: 'Djurgården',
    displayAwayTeam: 'Test Opponent'
  })),
  
  useFieldPositionHandlers: jest.fn(() => ({
    handleFieldPlayerClick: jest.fn(),
    handleFieldPlayerLongPress: jest.fn()
  })),
  
  useLongPressWithScrollDetection: jest.fn(() => ({
    handleTouchStart: jest.fn(),
    handleTouchEnd: jest.fn(),
    handleTouchMove: jest.fn()
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
    handleFieldPlayerLongPress: jest.fn(),
    handleSubstituteClick: jest.fn(),
    handleGoalieClick: jest.fn()
  })),
  
  createTimerHandlers: jest.fn(() => ({
    handlePauseTimer: jest.fn(),
    handleResumeTimer: jest.fn(),
    handleResetTimer: jest.fn()
  })),
  
  createScoreHandlers: jest.fn(() => ({
    handleAddHomeGoal: jest.fn(),
    handleAddAwayGoal: jest.fn(),
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
  
  longPressElement: async (element, duration = 500) => {
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
  
  expectFormationToBeRendered: (teamMode) => {
    // Formation-specific assertions based on team mode
    switch (teamMode) {
      case TEAM_MODES.PAIRS_7:
        expect(screen.getByText(/pair/i)).toBeInTheDocument();
        break;
      case TEAM_MODES.INDIVIDUAL_6:
      case TEAM_MODES.INDIVIDUAL_7:
        expect(screen.getByText(/defender|attacker/i)).toBeInTheDocument();
        break;
    }
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