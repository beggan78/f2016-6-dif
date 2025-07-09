import { createScoreHandlers } from './scoreHandlers';
import { createMockDependencies } from '../testUtils';
import { logEvent, EVENT_TYPES, calculateMatchTime, getEventById, removeEvent } from '../../utils/gameEventLogger';

// Mock the gameEventLogger module
jest.mock('../../utils/gameEventLogger', () => ({
  logEvent: jest.fn(),
  EVENT_TYPES: {
    GOAL_HOME: 'goal_home',
    GOAL_AWAY: 'goal_away',
    GOAL_CORRECTED: 'goal_corrected',
    GOAL_UNDONE: 'goal_undone'
  },
  calculateMatchTime: jest.fn(),
  getEventById: jest.fn(),
  removeEvent: jest.fn()
}));

describe('createScoreHandlers', () => {
  let mockDependencies;
  let mockStateUpdaters;
  let mockModalHandlers;

  beforeEach(() => {
    mockDependencies = createMockDependencies();
    
    // Add score-specific state updaters
    mockStateUpdaters = {
      ...mockDependencies.stateUpdaters,
      setScore: jest.fn(),
      addHomeGoal: jest.fn(),
      addAwayGoal: jest.fn()
    };

    // Add score-specific modal handlers
    mockModalHandlers = {
      ...mockDependencies.modalHandlers,
      openScoreEditModal: jest.fn(),
      closeScoreEditModal: jest.fn(),
      openGoalScorerModal: jest.fn(),
      closeGoalScorerModal: jest.fn(),
      setPendingGoalData: jest.fn(),
      getPendingGoalData: jest.fn(),
      clearPendingGoal: jest.fn()
    };

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('handler creation', () => {
    it('should create all required handler functions', () => {
      const handlers = createScoreHandlers(
        mockStateUpdaters,
        mockModalHandlers
      );

      expect(handlers.handleAddHomeGoal).toBeDefined();
      expect(handlers.handleAddAwayGoal).toBeDefined();
      expect(handlers.handleSelectGoalScorer).toBeDefined();
      expect(handlers.handleCorrectGoalScorer).toBeDefined();
      expect(handlers.handleScoreEdit).toBeDefined();
      expect(handlers.handleOpenScoreEdit).toBeDefined();
      expect(handlers.handleCancelGoalScorer).toBeDefined();
      expect(handlers.scoreCallback).toBeDefined();
      expect(typeof handlers.handleAddHomeGoal).toBe('function');
      expect(typeof handlers.handleAddAwayGoal).toBe('function');
      expect(typeof handlers.handleSelectGoalScorer).toBe('function');
      expect(typeof handlers.handleCorrectGoalScorer).toBe('function');
      expect(typeof handlers.handleCancelGoalScorer).toBe('function');
      expect(typeof handlers.scoreCallback).toBe('function');
    });
  });

  describe('handleAddHomeGoal', () => {
    it('should call addHomeGoal state updater', () => {
      const handlers = createScoreHandlers(
        mockStateUpdaters,
        mockModalHandlers
      );

      handlers.handleAddHomeGoal();

      expect(mockStateUpdaters.addHomeGoal).toHaveBeenCalledTimes(1);
      expect(mockStateUpdaters.addHomeGoal).toHaveBeenCalledWith();
    });

    it('should not call other score updaters', () => {
      const handlers = createScoreHandlers(
        mockStateUpdaters,
        mockModalHandlers
      );

      handlers.handleAddHomeGoal();

      expect(mockStateUpdaters.addAwayGoal).not.toHaveBeenCalled();
      expect(mockStateUpdaters.setScore).not.toHaveBeenCalled();
    });

    it('should handle goal with event logging when gameState provided', () => {
      const mockGameState = {
        homeScore: 1,
        awayScore: 2,
        currentPeriodNumber: 1
      };
      
      calculateMatchTime.mockReturnValue('05:30');
      
      const handlers = createScoreHandlers(
        mockStateUpdaters,
        mockModalHandlers
      );

      handlers.handleAddHomeGoal(mockGameState);

      // With new implementation, goal is stored as pending, not added immediately
      expect(mockStateUpdaters.addHomeGoal).not.toHaveBeenCalled();
      expect(logEvent).not.toHaveBeenCalled();
      
      // Should store pending goal data
      expect(mockModalHandlers.setPendingGoalData).toHaveBeenCalledWith(expect.objectContaining({
        type: EVENT_TYPES.GOAL_HOME,
        periodNumber: 1,
        homeScore: 2,
        awayScore: 2,
        teamName: 'home'
      }));
      
      // Should open goal scorer modal
      expect(mockModalHandlers.openGoalScorerModal).toHaveBeenCalledWith(expect.objectContaining({
        team: 'home',
        mode: 'new',
        matchTime: '05:30',
        periodNumber: 1
      }));
    });

    it('should not call event logging when gameState not provided', () => {
      const handlers = createScoreHandlers(
        mockStateUpdaters,
        mockModalHandlers
      );

      handlers.handleAddHomeGoal();

      expect(mockStateUpdaters.addHomeGoal).toHaveBeenCalledTimes(1);
      expect(logEvent).not.toHaveBeenCalled();
      expect(mockModalHandlers.openGoalScorerModal).not.toHaveBeenCalled();
    });
  });

  describe('handleAddAwayGoal', () => {
    it('should call addAwayGoal state updater', () => {
      const handlers = createScoreHandlers(
        mockStateUpdaters,
        mockModalHandlers
      );

      handlers.handleAddAwayGoal();

      expect(mockStateUpdaters.addAwayGoal).toHaveBeenCalledTimes(1);
      expect(mockStateUpdaters.addAwayGoal).toHaveBeenCalledWith();
    });

    it('should not call other score updaters', () => {
      const handlers = createScoreHandlers(
        mockStateUpdaters,
        mockModalHandlers
      );

      handlers.handleAddAwayGoal();

      expect(mockStateUpdaters.addHomeGoal).not.toHaveBeenCalled();
      expect(mockStateUpdaters.setScore).not.toHaveBeenCalled();
    });

    it('should handle goal with event logging when gameState provided', () => {
      const mockGameState = {
        homeScore: 0,
        awayScore: 1,
        currentPeriodNumber: 2
      };
      
      const handlers = createScoreHandlers(
        mockStateUpdaters,
        mockModalHandlers
      );

      handlers.handleAddAwayGoal(mockGameState);

      expect(mockStateUpdaters.addAwayGoal).toHaveBeenCalledTimes(1);
      expect(logEvent).toHaveBeenCalledWith(EVENT_TYPES.GOAL_AWAY, expect.objectContaining({
        periodNumber: 2,
        homeScore: 0,
        awayScore: 2,
        teamName: 'away'
      }));
      // Away goals don't open modal for now
      expect(mockModalHandlers.openGoalScorerModal).not.toHaveBeenCalled();
    });

    it('should not call event logging when gameState not provided', () => {
      const handlers = createScoreHandlers(
        mockStateUpdaters,
        mockModalHandlers
      );

      handlers.handleAddAwayGoal();

      expect(mockStateUpdaters.addAwayGoal).toHaveBeenCalledTimes(1);
      expect(logEvent).not.toHaveBeenCalled();
      expect(mockModalHandlers.openGoalScorerModal).not.toHaveBeenCalled();
    });
  });

  describe('handleScoreEdit', () => {
    it('should update score with provided values', () => {
      const handlers = createScoreHandlers(
        mockStateUpdaters,
        mockModalHandlers
      );

      handlers.handleScoreEdit(3, 2);

      expect(mockStateUpdaters.setScore).toHaveBeenCalledTimes(1);
      expect(mockStateUpdaters.setScore).toHaveBeenCalledWith(3, 2);
    });

    it('should close score edit modal after updating', () => {
      const handlers = createScoreHandlers(
        mockStateUpdaters,
        mockModalHandlers
      );

      handlers.handleScoreEdit(1, 4);

      expect(mockModalHandlers.closeScoreEditModal).toHaveBeenCalledTimes(1);
      expect(mockModalHandlers.closeScoreEditModal).toHaveBeenCalledWith();
    });

    it('should handle zero scores', () => {
      const handlers = createScoreHandlers(
        mockStateUpdaters,
        mockModalHandlers
      );

      handlers.handleScoreEdit(0, 0);

      expect(mockStateUpdaters.setScore).toHaveBeenCalledWith(0, 0);
      expect(mockModalHandlers.closeScoreEditModal).toHaveBeenCalled();
    });

    it('should handle large scores', () => {
      const handlers = createScoreHandlers(
        mockStateUpdaters,
        mockModalHandlers
      );

      handlers.handleScoreEdit(15, 12);

      expect(mockStateUpdaters.setScore).toHaveBeenCalledWith(15, 12);
      expect(mockModalHandlers.closeScoreEditModal).toHaveBeenCalled();
    });

    it('should handle negative scores', () => {
      const handlers = createScoreHandlers(
        mockStateUpdaters,
        mockModalHandlers
      );

      handlers.handleScoreEdit(-1, 5);

      expect(mockStateUpdaters.setScore).toHaveBeenCalledWith(-1, 5);
      expect(mockModalHandlers.closeScoreEditModal).toHaveBeenCalled();
    });
  });

  describe('handleOpenScoreEdit', () => {
    it('should open score edit modal', () => {
      const handlers = createScoreHandlers(
        mockStateUpdaters,
        mockModalHandlers
      );

      handlers.handleOpenScoreEdit();

      expect(mockModalHandlers.openScoreEditModal).toHaveBeenCalledTimes(1);
      expect(mockModalHandlers.openScoreEditModal).toHaveBeenCalledWith();
    });

    it('should not affect other modals', () => {
      const handlers = createScoreHandlers(
        mockStateUpdaters,
        mockModalHandlers
      );

      handlers.handleOpenScoreEdit();

      expect(mockModalHandlers.closeScoreEditModal).not.toHaveBeenCalled();
      expect(mockModalHandlers.openFieldPlayerModal).not.toHaveBeenCalled();
      expect(mockModalHandlers.openSubstituteModal).not.toHaveBeenCalled();
    });
  });

  describe('scoreCallback', () => {
    it('should call handleOpenScoreEdit', () => {
      const handlers = createScoreHandlers(
        mockStateUpdaters,
        mockModalHandlers
      );

      handlers.scoreCallback();

      // Verify that the same effect as handleOpenScoreEdit occurred
      expect(mockModalHandlers.openScoreEditModal).toHaveBeenCalledTimes(1);
      expect(mockModalHandlers.openScoreEditModal).toHaveBeenCalledWith();
    });

    it('should open score edit modal through callback', () => {
      const handlers = createScoreHandlers(
        mockStateUpdaters,
        mockModalHandlers
      );

      handlers.scoreCallback();

      expect(mockModalHandlers.openScoreEditModal).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleSelectGoalScorer', () => {
    it('should confirm pending goal and log events when scorerId provided', () => {
      const mockPendingGoal = {
        eventId: 'evt_123',
        type: EVENT_TYPES.GOAL_HOME,
        periodNumber: 1,
        homeScore: 1,
        awayScore: 0,
        teamName: 'home',
        timestamp: Date.now()
      };
      
      mockModalHandlers.getPendingGoalData.mockReturnValue(mockPendingGoal);
      
      const handlers = createScoreHandlers(
        mockStateUpdaters,
        mockModalHandlers
      );

      handlers.handleSelectGoalScorer('evt_123', 'player_5');

      expect(mockModalHandlers.getPendingGoalData).toHaveBeenCalledTimes(1);
      expect(mockStateUpdaters.addHomeGoal).toHaveBeenCalledTimes(1);
      expect(logEvent).toHaveBeenCalledWith(EVENT_TYPES.GOAL_HOME, {
        eventId: 'evt_123',
        periodNumber: 1,
        homeScore: 1,
        awayScore: 0,
        scorerId: 'player_5',
        teamName: 'home'
      });
      expect(logEvent).toHaveBeenCalledWith(EVENT_TYPES.GOAL_CORRECTED, {
        originalEventId: 'evt_123',
        scorerId: 'player_5',
        correctionType: 'initial_attribution'
      });
      expect(mockModalHandlers.clearPendingGoal).toHaveBeenCalledTimes(1);
      expect(mockModalHandlers.closeGoalScorerModal).toHaveBeenCalledTimes(1);
    });

    it('should confirm pending goal without scorer attribution when scorerId not provided', () => {
      const mockPendingGoal = {
        eventId: 'evt_123',
        type: EVENT_TYPES.GOAL_HOME,
        periodNumber: 1,
        homeScore: 1,
        awayScore: 0,
        teamName: 'home',
        timestamp: Date.now()
      };
      
      mockModalHandlers.getPendingGoalData.mockReturnValue(mockPendingGoal);
      
      const handlers = createScoreHandlers(
        mockStateUpdaters,
        mockModalHandlers
      );

      handlers.handleSelectGoalScorer('evt_123', null);

      expect(mockModalHandlers.getPendingGoalData).toHaveBeenCalledTimes(1);
      expect(mockStateUpdaters.addHomeGoal).toHaveBeenCalledTimes(1);
      expect(logEvent).toHaveBeenCalledWith(EVENT_TYPES.GOAL_HOME, {
        eventId: 'evt_123',
        periodNumber: 1,
        homeScore: 1,
        awayScore: 0,
        scorerId: null,
        teamName: 'home'
      });
      expect(logEvent).not.toHaveBeenCalledWith(EVENT_TYPES.GOAL_CORRECTED, expect.any(Object));
      expect(mockModalHandlers.clearPendingGoal).toHaveBeenCalledTimes(1);
      expect(mockModalHandlers.closeGoalScorerModal).toHaveBeenCalledTimes(1);
    });

    it('should handle empty scorerId similar to null', () => {
      const mockPendingGoal = {
        eventId: 'evt_123',
        type: EVENT_TYPES.GOAL_HOME,
        periodNumber: 1,
        homeScore: 1,
        awayScore: 0,
        teamName: 'home',
        timestamp: Date.now()
      };
      
      mockModalHandlers.getPendingGoalData.mockReturnValue(mockPendingGoal);
      
      const handlers = createScoreHandlers(
        mockStateUpdaters,
        mockModalHandlers
      );

      handlers.handleSelectGoalScorer('evt_123', '');

      expect(mockModalHandlers.getPendingGoalData).toHaveBeenCalledTimes(1);
      expect(mockStateUpdaters.addHomeGoal).toHaveBeenCalledTimes(1);
      expect(logEvent).toHaveBeenCalledWith(EVENT_TYPES.GOAL_HOME, {
        eventId: 'evt_123',
        periodNumber: 1,
        homeScore: 1,
        awayScore: 0,
        scorerId: null,
        teamName: 'home'
      });
      expect(logEvent).not.toHaveBeenCalledWith(EVENT_TYPES.GOAL_CORRECTED, expect.any(Object));
      expect(mockModalHandlers.clearPendingGoal).toHaveBeenCalledTimes(1);
      expect(mockModalHandlers.closeGoalScorerModal).toHaveBeenCalledTimes(1);
    });

    it('should handle existing goal correction when no pending goal', () => {
      mockModalHandlers.getPendingGoalData.mockReturnValue(null);
      
      const handlers = createScoreHandlers(
        mockStateUpdaters,
        mockModalHandlers
      );

      handlers.handleSelectGoalScorer('evt_123', 'player_5');

      expect(mockModalHandlers.getPendingGoalData).toHaveBeenCalledTimes(1);
      expect(mockStateUpdaters.addHomeGoal).not.toHaveBeenCalled();
      expect(logEvent).toHaveBeenCalledWith(EVENT_TYPES.GOAL_CORRECTED, {
        originalEventId: 'evt_123',
        scorerId: 'player_5',
        correctionType: 'initial_attribution'
      });
      expect(mockModalHandlers.clearPendingGoal).not.toHaveBeenCalled();
      expect(mockModalHandlers.closeGoalScorerModal).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleCorrectGoalScorer', () => {
    it('should log correction event', () => {
      const handlers = createScoreHandlers(
        mockStateUpdaters,
        mockModalHandlers
      );

      handlers.handleCorrectGoalScorer('evt_456', 'player_3');

      expect(logEvent).toHaveBeenCalledWith(EVENT_TYPES.GOAL_CORRECTED, {
        originalEventId: 'evt_456',
        scorerId: 'player_3',
        correctionType: 'scorer_correction'
      });
      expect(mockModalHandlers.closeGoalScorerModal).toHaveBeenCalledTimes(1);
    });

    it('should handle null scorerId', () => {
      const handlers = createScoreHandlers(
        mockStateUpdaters,
        mockModalHandlers
      );

      handlers.handleCorrectGoalScorer('evt_456', null);

      expect(logEvent).toHaveBeenCalledWith(EVENT_TYPES.GOAL_CORRECTED, {
        originalEventId: 'evt_456',
        scorerId: null,
        correctionType: 'scorer_correction'
      });
      expect(mockModalHandlers.closeGoalScorerModal).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleCancelGoalScorer', () => {
    it('should clear pending goal data and close modal', () => {
      const mockPendingGoal = {
        eventId: 'evt_123',
        type: EVENT_TYPES.GOAL_HOME,
        periodNumber: 1,
        homeScore: 1,
        awayScore: 0,
        teamName: 'home',
        timestamp: Date.now()
      };
      
      mockModalHandlers.getPendingGoalData.mockReturnValue(mockPendingGoal);
      
      const handlers = createScoreHandlers(
        mockStateUpdaters,
        mockModalHandlers
      );

      handlers.handleCancelGoalScorer();

      expect(mockModalHandlers.getPendingGoalData).toHaveBeenCalledTimes(1);
      expect(mockModalHandlers.clearPendingGoal).toHaveBeenCalledTimes(1);
      expect(mockModalHandlers.closeGoalScorerModal).toHaveBeenCalledTimes(1);
    });

    it('should handle no pending goal gracefully', () => {
      mockModalHandlers.getPendingGoalData.mockReturnValue(null);
      
      const handlers = createScoreHandlers(
        mockStateUpdaters,
        mockModalHandlers
      );

      handlers.handleCancelGoalScorer();

      expect(mockModalHandlers.getPendingGoalData).toHaveBeenCalledTimes(1);
      expect(mockModalHandlers.clearPendingGoal).not.toHaveBeenCalled();
      expect(mockModalHandlers.closeGoalScorerModal).toHaveBeenCalledTimes(1);
    });
  });

  describe('integration', () => {
    it('should work with complete score flow', () => {
      const handlers = createScoreHandlers(
        mockStateUpdaters,
        mockModalHandlers
      );

      // Add some goals
      handlers.handleAddHomeGoal();
      handlers.handleAddAwayGoal();
      handlers.handleAddHomeGoal();

      expect(mockStateUpdaters.addHomeGoal).toHaveBeenCalledTimes(2);
      expect(mockStateUpdaters.addAwayGoal).toHaveBeenCalledTimes(1);

      // Open score edit modal
      handlers.handleOpenScoreEdit();
      expect(mockModalHandlers.openScoreEditModal).toHaveBeenCalled();

      // Edit score directly
      handlers.handleScoreEdit(5, 3);
      expect(mockStateUpdaters.setScore).toHaveBeenCalledWith(5, 3);
      expect(mockModalHandlers.closeScoreEditModal).toHaveBeenCalled();
    });

    it('should handle rapid score changes', () => {
      const handlers = createScoreHandlers(
        mockStateUpdaters,
        mockModalHandlers
      );

      // Rapid scoring
      handlers.handleAddHomeGoal();
      handlers.handleAddHomeGoal();
      handlers.handleAddAwayGoal();
      handlers.handleAddHomeGoal();
      handlers.handleAddAwayGoal();

      expect(mockStateUpdaters.addHomeGoal).toHaveBeenCalledTimes(3);
      expect(mockStateUpdaters.addAwayGoal).toHaveBeenCalledTimes(2);
    });

    it('should handle modal operations correctly', () => {
      const handlers = createScoreHandlers(
        mockStateUpdaters,
        mockModalHandlers
      );

      // Open and close modal cycle
      handlers.handleOpenScoreEdit();
      handlers.handleScoreEdit(2, 1);

      expect(mockModalHandlers.openScoreEditModal).toHaveBeenCalledTimes(1);
      expect(mockModalHandlers.closeScoreEditModal).toHaveBeenCalledTimes(1);

      // Second cycle
      handlers.scoreCallback();
      handlers.handleScoreEdit(3, 2);

      expect(mockModalHandlers.openScoreEditModal).toHaveBeenCalledTimes(2);
      expect(mockModalHandlers.closeScoreEditModal).toHaveBeenCalledTimes(2);
    });

    it('should work with complete goal scorer workflow', () => {
      const mockGameState = {
        homeScore: 0,
        awayScore: 1,
        currentPeriodNumber: 1
      };
      
      const mockPendingGoal = {
        eventId: 'evt_123',
        type: EVENT_TYPES.GOAL_HOME,
        periodNumber: 1,
        homeScore: 1,
        awayScore: 1,
        teamName: 'home',
        timestamp: Date.now()
      };
      
      calculateMatchTime.mockReturnValue('12:45');
      mockModalHandlers.getPendingGoalData.mockReturnValue(mockPendingGoal);
      
      const handlers = createScoreHandlers(
        mockStateUpdaters,
        mockModalHandlers
      );

      // Add home goal with event logging
      handlers.handleAddHomeGoal(mockGameState);
      expect(mockModalHandlers.setPendingGoalData).toHaveBeenCalledTimes(1);
      expect(mockModalHandlers.openGoalScorerModal).toHaveBeenCalledWith(expect.objectContaining({
        team: 'home',
        mode: 'new',
        matchTime: '12:45',
        periodNumber: 1
      }));

      // Select goal scorer
      handlers.handleSelectGoalScorer('evt_123', 'player_7');
      expect(mockModalHandlers.getPendingGoalData).toHaveBeenCalledTimes(1);
      expect(mockStateUpdaters.addHomeGoal).toHaveBeenCalledTimes(1);
      expect(logEvent).toHaveBeenCalledWith(EVENT_TYPES.GOAL_HOME, expect.objectContaining({
        eventId: 'evt_123',
        scorerId: 'player_7'
      }));
      expect(logEvent).toHaveBeenCalledWith(EVENT_TYPES.GOAL_CORRECTED, {
        originalEventId: 'evt_123',
        scorerId: 'player_7',
        correctionType: 'initial_attribution'
      });
      expect(mockModalHandlers.clearPendingGoal).toHaveBeenCalledTimes(1);
      expect(mockModalHandlers.closeGoalScorerModal).toHaveBeenCalledTimes(1);

      // Correct goal scorer
      handlers.handleCorrectGoalScorer('evt_123', 'player_9');
      expect(logEvent).toHaveBeenCalledWith(EVENT_TYPES.GOAL_CORRECTED, {
        originalEventId: 'evt_123',
        scorerId: 'player_9',
        correctionType: 'scorer_correction'
      });
      expect(mockModalHandlers.closeGoalScorerModal).toHaveBeenCalledTimes(2);

      // Cancel goal scorer
      handlers.handleCancelGoalScorer();
      expect(mockModalHandlers.getPendingGoalData).toHaveBeenCalledTimes(2);
      expect(mockModalHandlers.closeGoalScorerModal).toHaveBeenCalledTimes(3);
    });
  });

  describe('error handling', () => {
    it('should handle missing state updaters gracefully', () => {
      const incompleteStateUpdaters = {
        setScore: jest.fn()
        // Missing addHomeGoal and addAwayGoal
      };

      const handlers = createScoreHandlers(
        incompleteStateUpdaters,
        mockModalHandlers
      );

      expect(() => handlers.handleScoreEdit(1, 1)).not.toThrow();
      expect(incompleteStateUpdaters.setScore).toHaveBeenCalledWith(1, 1);
    });

    it('should handle missing modal handlers gracefully', () => {
      const incompleteModalHandlers = {
        openScoreEditModal: jest.fn()
        // Missing closeScoreEditModal
      };

      const handlers = createScoreHandlers(
        mockStateUpdaters,
        incompleteModalHandlers
      );

      expect(() => handlers.handleOpenScoreEdit()).not.toThrow();
      expect(incompleteModalHandlers.openScoreEditModal).toHaveBeenCalled();
    });

    it('should handle undefined score values', () => {
      const handlers = createScoreHandlers(
        mockStateUpdaters,
        mockModalHandlers
      );

      handlers.handleScoreEdit(undefined, undefined);

      expect(mockStateUpdaters.setScore).toHaveBeenCalledWith(undefined, undefined);
    });

    it('should handle null score values', () => {
      const handlers = createScoreHandlers(
        mockStateUpdaters,
        mockModalHandlers
      );

      handlers.handleScoreEdit(null, null);

      expect(mockStateUpdaters.setScore).toHaveBeenCalledWith(null, null);
    });

    it('should handle string score values', () => {
      const handlers = createScoreHandlers(
        mockStateUpdaters,
        mockModalHandlers
      );

      handlers.handleScoreEdit('3', '2');

      expect(mockStateUpdaters.setScore).toHaveBeenCalledWith('3', '2');
    });
  });

  describe('handler independence', () => {
    it('should not interfere with each other when called simultaneously', () => {
      const handlers = createScoreHandlers(
        mockStateUpdaters,
        mockModalHandlers
      );

      handlers.handleAddHomeGoal();
      handlers.handleOpenScoreEdit();
      handlers.handleAddAwayGoal();

      expect(mockStateUpdaters.addHomeGoal).toHaveBeenCalledTimes(1);
      expect(mockStateUpdaters.addAwayGoal).toHaveBeenCalledTimes(1);
      expect(mockModalHandlers.openScoreEditModal).toHaveBeenCalledTimes(1);
    });

    it('should maintain handler state independence', () => {
      const handlers1 = createScoreHandlers(
        mockStateUpdaters,
        mockModalHandlers
      );

      const handlers2 = createScoreHandlers(
        mockStateUpdaters,
        mockModalHandlers
      );

      handlers1.handleAddHomeGoal();
      handlers2.handleAddAwayGoal();

      expect(mockStateUpdaters.addHomeGoal).toHaveBeenCalledTimes(1);
      expect(mockStateUpdaters.addAwayGoal).toHaveBeenCalledTimes(1);
    });
  });
});