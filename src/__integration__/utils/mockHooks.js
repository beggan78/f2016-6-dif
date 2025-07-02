/**
 * Mock Hooks for Integration Testing
 * 
 * Mock implementations of custom React hooks for integration testing.
 * These mocks provide controlled, predictable behavior for testing
 * hook interactions with components.
 */

import { jest } from '@jest/globals';
import { TEAM_MODES } from '../../constants/playerConstants';
import { gameStateScenarios, playerDataScenarios } from '../fixtures/mockGameData';

// ===================================================================
// MOCK GAME STATE HOOK
// ===================================================================

/**
 * Creates a mock implementation of useGameState hook
 */
export const createMockUseGameState = (initialState = {}) => {
  const defaultState = {
    // Game configuration
    view: 'config',
    selectedSquadIds: [],
    teamMode: TEAM_MODES.INDIVIDUAL_7,
    numPeriods: 3,
    periodDurationMinutes: 15,
    alertMinutes: 2,
    opponentTeamName: 'Test Opponent',
    
    // Game state
    currentPeriodNumber: 1,
    periodFormation: {},
    allPlayers: [],
    rotationQueue: [],
    nextPlayerIdToSubOut: null,
    nextNextPlayerIdToSubOut: null,
    playersToHighlight: [],
    
    // Scores
    homeScore: 0,
    awayScore: 0,
    
    // Game history
    gameLog: [],
    
    // Loading states
    isLoading: false,
    hasError: false,
    errorMessage: null,
    
    ...initialState
  };
  
  const mockState = { ...defaultState };
  const stateUpdaters = {};
  
  // Create mock state setters
  Object.keys(mockState).forEach(key => {
    const setterName = `set${key.charAt(0).toUpperCase()}${key.slice(1)}`;
    stateUpdaters[setterName] = jest.fn((newValue) => {
      if (typeof newValue === 'function') {
        mockState[key] = newValue(mockState[key]);
      } else {
        mockState[key] = newValue;
      }
    });
  });
  
  // Additional action handlers
  const actionHandlers = {
    addHomeGoal: jest.fn(() => {
      mockState.homeScore++;
    }),
    addAwayGoal: jest.fn(() => {
      mockState.awayScore++;
    }),
    setScore: jest.fn((home, away) => {
      mockState.homeScore = home;
      mockState.awayScore = away;
    }),
    resetGame: jest.fn(() => {
      Object.assign(mockState, defaultState);
    }),
    loadGameState: jest.fn((gameState) => {
      Object.assign(mockState, gameState);
    }),
    saveGameState: jest.fn(() => {
      // Mock save operation
      return Promise.resolve(mockState);
    }),
    setLastSubstitutionTimestamp: jest.fn((timestamp) => {
      mockState.lastSubstitutionTimestamp = timestamp;
    })
  };
  
  const gameStateReturn = {
    // State values
    ...mockState,
    
    // State setters
    ...stateUpdaters,
    
    // Action handlers
    ...actionHandlers,
    
    // Test utilities
    _getMockState: () => ({ ...mockState }),
    _updateMockState: (updates) => Object.assign(mockState, updates),
    _resetMockState: () => Object.assign(mockState, defaultState),
    _triggerError: (errorMessage) => {
      mockState.hasError = true;
      mockState.errorMessage = errorMessage;
    },
    _clearError: () => {
      mockState.hasError = false;
      mockState.errorMessage = null;
    },
    
    // localStorage coordination utilities for game state
    _mockGameLocalStorageState: {
      data: {},
      quotaExceeded: false,
      saveFailure: false,
      loadFailure: false,
      backupFailure: false
    },
    
    _simulateGameStateStorageFailure: function(failureType) {
      if (failureType === 'saveFailure') {
        this._mockGameLocalStorageState.saveFailure = true;
      } else if (failureType === 'loadFailure') {
        this._mockGameLocalStorageState.loadFailure = true;
      } else if (failureType === 'quotaExceeded') {
        this._mockGameLocalStorageState.quotaExceeded = true;
      } else if (failureType === 'backupFailure') {
        this._mockGameLocalStorageState.backupFailure = true;
      }
    },
    
    _mockSaveGameStateToLocalStorage: function(state) {
      if (this._mockGameLocalStorageState.saveFailure) {
        throw new Error('Mock game state localStorage save failure');
      }
      if (this._mockGameLocalStorageState.quotaExceeded) {
        const error = new Error('Storage quota exceeded');
        error.name = 'QuotaExceededError';
        throw error;
      }
      this._mockGameLocalStorageState.data.gameState = JSON.stringify(state);
      return true;
    },
    
    _mockLoadGameStateFromLocalStorage: function() {
      if (this._mockGameLocalStorageState.loadFailure) {
        throw new Error('Mock game state localStorage load failure');
      }
      const stored = this._mockGameLocalStorageState.data.gameState;
      return stored ? JSON.parse(stored) : null;
    },
    
    _mockCreateBackup: function() {
      if (this._mockGameLocalStorageState.backupFailure) {
        return null;
      }
      const backupKey = `backup_${Date.now()}`;
      const currentState = mockState;
      this._mockGameLocalStorageState.data[backupKey] = JSON.stringify(currentState);
      return backupKey;
    },
    
    _clearMockGameLocalStorage: function() {
      this._mockGameLocalStorageState.data = {};
      this._mockGameLocalStorageState.quotaExceeded = false;
      this._mockGameLocalStorageState.saveFailure = false;
      this._mockGameLocalStorageState.loadFailure = false;
      this._mockGameLocalStorageState.backupFailure = false;
    }
  };
  
  return gameStateReturn;
};

// ===================================================================
// MOCK TIMERS HOOK
// ===================================================================

/**
 * Creates a mock implementation of useTimers hook
 */
export const createMockUseTimers = (initialTimerState = {}) => {
  const defaultTimerState = {
    matchTimerSeconds: 900, // 15 minutes
    subTimerSeconds: 0,
    isSubTimerPaused: false,
    isMatchTimerRunning: false,
    ...initialTimerState
  };
  
  const mockTimerState = { ...defaultTimerState };
  
  const timerActions = {
    startMatchTimer: jest.fn(() => {
      mockTimerState.isMatchTimerRunning = true;
    }),
    stopMatchTimer: jest.fn(() => {
      mockTimerState.isMatchTimerRunning = false;
    }),
    pauseSubTimer: jest.fn(() => {
      mockTimerState.isSubTimerPaused = true;
    }),
    resumeSubTimer: jest.fn(() => {
      mockTimerState.isSubTimerPaused = false;
    }),
    resetSubTimer: jest.fn(() => {
      mockTimerState.subTimerSeconds = 0;
    }),
    resetMatchTimer: jest.fn((newTime = 900) => {
      mockTimerState.matchTimerSeconds = newTime;
    }),
    setSubTimerSeconds: jest.fn((seconds) => {
      mockTimerState.subTimerSeconds = seconds;
    }),
    setMatchTimerSeconds: jest.fn((seconds) => {
      mockTimerState.matchTimerSeconds = seconds;
    }),
    formatTime: jest.fn((seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    })
  };
  
  const timerReturn = {
    // Timer values
    ...mockTimerState,
    
    // Timer actions
    ...timerActions,
    
    // Test utilities
    _getMockTimerState: () => ({ ...mockTimerState }),
    _updateMockTimerState: (updates) => Object.assign(mockTimerState, updates),
    _advanceTimer: (seconds, timerType = 'sub') => {
      if (timerType === 'sub') {
        mockTimerState.subTimerSeconds += seconds;
      } else if (timerType === 'match') {
        mockTimerState.matchTimerSeconds = Math.max(0, mockTimerState.matchTimerSeconds - seconds);
      }
    },
    _simulateTimerTick: () => {
      if (mockTimerState.isMatchTimerRunning) {
        mockTimerState.matchTimerSeconds = Math.max(0, mockTimerState.matchTimerSeconds - 1);
      }
      if (!mockTimerState.isSubTimerPaused) {
        mockTimerState.subTimerSeconds++;
      }
    },
    _simulateTimerFailure: (failureType) => {
      // Mock timer failure scenarios
      if (failureType === 'resetFailure') {
        // Simulate failure to reset timer
        console.warn('Mock timer failure: resetFailure');
      }
      // Other failure types can be added here
    },
    
    // localStorage coordination utilities
    _mockLocalStorageState: {
      data: {},
      quotaExceeded: false,
      saveFailure: false,
      loadFailure: false
    },
    
    _simulateLocalStorageFailure: function(failureType) {
      if (failureType === 'saveFailure') {
        this._mockLocalStorageState.saveFailure = true;
      } else if (failureType === 'loadFailure') {
        this._mockLocalStorageState.loadFailure = true;
      } else if (failureType === 'quotaExceeded') {
        this._mockLocalStorageState.quotaExceeded = true;
      }
    },
    
    _mockSaveToLocalStorage: function(state) {
      if (this._mockLocalStorageState.saveFailure) {
        throw new Error('Mock localStorage save failure');
      }
      if (this._mockLocalStorageState.quotaExceeded) {
        const error = new Error('Storage quota exceeded');
        error.name = 'QuotaExceededError';
        throw error;
      }
      this._mockLocalStorageState.data.timerState = JSON.stringify(state);
      return true;
    },
    
    _mockLoadFromLocalStorage: function() {
      if (this._mockLocalStorageState.loadFailure) {
        throw new Error('Mock localStorage load failure');
      }
      const stored = this._mockLocalStorageState.data.timerState;
      return stored ? JSON.parse(stored) : null;
    },
    
    _clearMockLocalStorage: function() {
      this._mockLocalStorageState.data = {};
      this._mockLocalStorageState.quotaExceeded = false;
      this._mockLocalStorageState.saveFailure = false;
      this._mockLocalStorageState.loadFailure = false;
    }
  };
  
  return timerReturn;
};

// ===================================================================
// MOCK GAME MODALS HOOK
// ===================================================================

/**
 * Creates a mock implementation of useGameModals hook
 */
export const createMockUseGameModals = (initialModalState = {}) => {
  const defaultModalState = {
    modalStack: [],
    currentModal: null,
    modalData: null,
    ...initialModalState
  };
  
  const mockModalState = { ...defaultModalState };
  
  const modalActions = {
    pushModalState: jest.fn((modal, data = null) => {
      // Only push to stack if there's currently a modal open
      if (mockModalState.currentModal) {
        mockModalState.modalStack.push(mockModalState.currentModal);
      }
      mockModalState.currentModal = modal;
      mockModalState.modalData = data;
    }),
    popModalState: jest.fn(() => {
      const previousModal = mockModalState.modalStack.pop();
      mockModalState.currentModal = previousModal || null;
      if (!previousModal) {
        mockModalState.modalData = null;
      }
    }),
    removeModalFromStack: jest.fn(() => {
      const previousModal = mockModalState.modalStack.pop();
      mockModalState.currentModal = previousModal || null;
      if (!previousModal) {
        mockModalState.modalData = null;
      }
    }),
    closeAllModals: jest.fn(() => {
      mockModalState.modalStack = [];
      mockModalState.currentModal = null;
      mockModalState.modalData = null;
    }),
    replaceCurrentModal: jest.fn((modal, data = null) => {
      mockModalState.currentModal = modal;
      mockModalState.modalData = data;
    })
  };
  
  return {
    // Modal state
    ...mockModalState,
    
    // Modal structure expected by GameScreen
    modals: {
      fieldPlayer: {
        isOpen: false,
        position: null,
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
      }
    },
    
    // Modal actions
    ...modalActions,
    
    // Test utilities
    _getMockModalState: () => ({ ...mockModalState }),
    _updateMockModalState: (updates) => Object.assign(mockModalState, updates),
    _clearModalStack: () => {
      mockModalState.modalStack = [];
      mockModalState.currentModal = null;
      mockModalState.modalData = null;
    },
    _hasModal: (modalName) => mockModalState.currentModal === modalName,
    _getModalStackDepth: () => mockModalState.modalStack.length
  };
};

// ===================================================================
// MOCK BROWSER BACK INTERCEPT HOOK
// ===================================================================

/**
 * Creates a mock implementation of useBrowserBackIntercept hook
 */
export const createMockUseBrowserBackIntercept = (initialConfig = {}) => {
  const defaultConfig = {
    isIntercepting: false,
    hasUnsavedChanges: false,
    ...initialConfig
  };
  
  const mockInterceptState = { ...defaultConfig };
  
  const interceptActions = {
    enableIntercept: jest.fn(() => {
      mockInterceptState.isIntercepting = true;
    }),
    disableIntercept: jest.fn(() => {
      mockInterceptState.isIntercepting = false;
    }),
    setUnsavedChanges: jest.fn((hasChanges) => {
      mockInterceptState.hasUnsavedChanges = hasChanges;
    }),
    handleBrowserBack: jest.fn(() => {
      // Mock browser back handling
      return mockInterceptState.isIntercepting;
    })
  };
  
  return {
    // Intercept state
    ...mockInterceptState,
    
    // Intercept actions
    ...interceptActions,
    
    // Test utilities
    _getMockInterceptState: () => ({ ...mockInterceptState }),
    _simulateBrowserBack: () => {
      return interceptActions.handleBrowserBack();
    },
    _setInterceptState: (state) => Object.assign(mockInterceptState, state)
  };
};

// ===================================================================
// MOCK GAME UI STATE HOOK
// ===================================================================

/**
 * Creates a mock implementation of useGameUIState hook
 */
export const createMockUseGameUIState = (initialUIState = {}) => {
  const defaultUIState = {
    animationState: {},
    hideNextOffIndicator: false,
    recentlySubstitutedPlayers: new Set(),
    glowPlayers: [],
    isTransitioning: false,
    lastSubstitution: null,
    shouldSubstituteNow: false,
    isAnimating: false,
    ...initialUIState
  };
  
  const mockUIState = { ...defaultUIState };
  
  const uiActions = {
    setAnimationState: jest.fn((animationState) => {
      mockUIState.animationState = animationState;
    }),
    setHideNextOffIndicator: jest.fn((hide) => {
      mockUIState.hideNextOffIndicator = hide;
    }),
    setRecentlySubstitutedPlayers: jest.fn((players) => {
      mockUIState.recentlySubstitutedPlayers = players instanceof Set ? players : new Set(players);
    }),
    setGlowPlayers: jest.fn((players) => {
      mockUIState.glowPlayers = players;
    }),
    setIsTransitioning: jest.fn((transitioning) => {
      mockUIState.isTransitioning = transitioning;
    }),
    setLastSubstitution: jest.fn((substitution) => {
      mockUIState.lastSubstitution = substitution;
    }),
    setShouldSubstituteNow: jest.fn((should) => {
      mockUIState.shouldSubstituteNow = should;
    }),
    setIsAnimating: jest.fn((animating) => {
      mockUIState.isAnimating = animating;
    }),
    clearAllAnimations: jest.fn(() => {
      mockUIState.animationState = {};
      mockUIState.hideNextOffIndicator = false;
      mockUIState.recentlySubstitutedPlayers = new Set();
      mockUIState.glowPlayers = [];
      mockUIState.isTransitioning = false;
      mockUIState.isAnimating = false;
    })
  };
  
  return {
    // UI state
    ...mockUIState,
    
    // UI actions
    ...uiActions,
    
    // Test utilities
    _getMockUIState: () => ({ ...mockUIState }),
    _updateMockUIState: (updates) => Object.assign(mockUIState, updates),
    _triggerAnimation: (playerId, animationType = 'move') => {
      mockUIState.animationState[playerId] = {
        type: animationType,
        startTime: Date.now()
      };
    },
    _completeAnimation: (playerId) => {
      delete mockUIState.animationState[playerId];
    }
  };
};

// ===================================================================
// MOCK LONG PRESS HOOK
// ===================================================================

/**
 * Creates a mock implementation of useLongPressWithScrollDetection hook
 */
export const createMockUseLongPressWithScrollDetection = (callback = jest.fn(), delay = 500) => {
  const mockLongPressState = {
    isPressed: false,
    isScrolling: false,
    startTime: null,
    callback,
    delay
  };
  
  const longPressHandlers = {
    onMouseDown: jest.fn((event) => {
      mockLongPressState.isPressed = true;
      mockLongPressState.startTime = Date.now();
      mockLongPressState.isScrolling = false;
    }),
    onMouseUp: jest.fn((event) => {
      if (mockLongPressState.isPressed && !mockLongPressState.isScrolling) {
        const duration = Date.now() - mockLongPressState.startTime;
        if (duration >= mockLongPressState.delay) {
          mockLongPressState.callback();
        }
      }
      mockLongPressState.isPressed = false;
      mockLongPressState.startTime = null;
    }),
    onTouchStart: jest.fn((event) => {
      longPressHandlers.onMouseDown(event);
    }),
    onTouchEnd: jest.fn((event) => {
      longPressHandlers.onMouseUp(event);
    }),
    onMouseLeave: jest.fn(() => {
      mockLongPressState.isPressed = false;
      mockLongPressState.startTime = null;
    }),
    onContextMenu: jest.fn((event) => {
      event.preventDefault();
    })
  };
  
  return {
    // Long press handlers
    ...longPressHandlers,
    
    // Test utilities
    _getMockLongPressState: () => ({ ...mockLongPressState }),
    _simulateLongPress: () => {
      longPressHandlers.onMouseDown({});
      setTimeout(() => {
        longPressHandlers.onMouseUp({});
      }, mockLongPressState.delay + 100);
    },
    _simulateScroll: () => {
      mockLongPressState.isScrolling = true;
    },
    _setCallback: (newCallback) => {
      mockLongPressState.callback = newCallback;
    }
  };
};

// ===================================================================
// HOOK FACTORY FUNCTIONS
// ===================================================================

/**
 * Creates a complete set of mocked hooks for integration testing
 */
export const createMockHookSet = (config = {}) => {
  const {
    gameStateConfig = {},
    timerConfig = {},
    modalConfig = {},
    uiStateConfig = {},
    interceptConfig = {}
  } = config;
  
  return {
    useGameState: createMockUseGameState(gameStateConfig),
    useTimers: createMockUseTimers(timerConfig),
    useGameModals: createMockUseGameModals(modalConfig),
    useGameUIState: createMockUseGameUIState(uiStateConfig),
    useBrowserBackIntercept: createMockUseBrowserBackIntercept(interceptConfig),
    useLongPressWithScrollDetection: createMockUseLongPressWithScrollDetection()
  };
};

/**
 * Creates mocked hooks for specific game scenarios
 */
export const createScenarioMockHooks = (scenario = 'freshGame') => {
  let gameStateConfig = {};
  let timerConfig = {};
  
  switch (scenario) {
    case 'freshGame':
      gameStateConfig = gameStateScenarios.freshGame();
      timerConfig = { matchTimerSeconds: 900, subTimerSeconds: 0 };
      break;
      
    case 'midGame':
      gameStateConfig = gameStateScenarios.midGame();
      timerConfig = { matchTimerSeconds: 450, subTimerSeconds: 120 };
      break;
      
    case 'endGame':
      gameStateConfig = gameStateScenarios.endGame();
      timerConfig = { matchTimerSeconds: 0, subTimerSeconds: 0, isSubTimerPaused: true };
      break;
      
    case 'withInactivePlayers':
      gameStateConfig = gameStateScenarios.withInactivePlayers();
      timerConfig = { matchTimerSeconds: 600, subTimerSeconds: 90 };
      break;
      
    default:
      gameStateConfig = gameStateScenarios.freshGame();
  }
  
  return createMockHookSet({
    gameStateConfig,
    timerConfig
  });
};

// ===================================================================
// HOOK TESTING UTILITIES
// ===================================================================

/**
 * Utilities for testing hook interactions
 */
export const hookTestUtils = {
  /**
   * Simulates a complete hook interaction cycle
   */
  simulateHookInteraction: async (mockHooks, interaction) => {
    const { type, payload, expectedChanges } = interaction;
    
    switch (type) {
      case 'state_change':
        const setter = mockHooks.useGameState[`set${payload.field.charAt(0).toUpperCase()}${payload.field.slice(1)}`];
        if (setter) {
          setter(payload.value);
        }
        break;
        
      case 'timer_action':
        const timerAction = mockHooks.useTimers[payload.action];
        if (timerAction) {
          timerAction(...(payload.args || []));
        }
        break;
        
      case 'modal_action':
        const modalAction = mockHooks.useGameModals[payload.action];
        if (modalAction) {
          modalAction(...(payload.args || []));
        }
        break;
        
      case 'ui_action':
        const uiAction = mockHooks.useGameUIState[payload.action];
        if (uiAction) {
          uiAction(...(payload.args || []));
        }
        break;
    }
    
    // Verify expected changes if provided
    if (expectedChanges) {
      Object.entries(expectedChanges).forEach(([hookName, changes]) => {
        const mockHook = mockHooks[hookName];
        Object.entries(changes).forEach(([field, expectedValue]) => {
          const actualValue = mockHook._getMockState ? mockHook._getMockState()[field] : mockHook[field];
          if (actualValue !== expectedValue) {
            throw new Error(`Expected ${hookName}.${field} to be ${expectedValue}, got ${actualValue}`);
          }
        });
      });
    }
  },
  
  /**
   * Validates hook call counts
   */
  validateHookCalls: (mockHooks, expectedCalls) => {
    Object.entries(expectedCalls).forEach(([hookName, calls]) => {
      const mockHook = mockHooks[hookName];
      Object.entries(calls).forEach(([methodName, expectedCount]) => {
        const method = mockHook[methodName];
        if (jest.isMockFunction(method)) {
          expect(method).toHaveBeenCalledTimes(expectedCount);
        }
      });
    });
  },
  
  /**
   * Resets all mock function calls
   */
  resetMockCalls: (mockHooks) => {
    Object.values(mockHooks).forEach(mockHook => {
      Object.values(mockHook).forEach(method => {
        if (jest.isMockFunction(method)) {
          method.mockClear();
        }
      });
    });
  },
  
  /**
   * Gets current state from all mocked hooks
   */
  getAllMockStates: (mockHooks) => {
    const states = {};
    Object.entries(mockHooks).forEach(([hookName, mockHook]) => {
      if (mockHook._getMockState) {
        states[hookName] = mockHook._getMockState();
      }
    });
    return states;
  }
};

export default {
  createMockUseGameState,
  createMockUseTimers,
  createMockUseGameModals,
  createMockUseBrowserBackIntercept,
  createMockUseGameUIState,
  createMockUseLongPressWithScrollDetection,
  createMockHookSet,
  createScenarioMockHooks,
  hookTestUtils
};