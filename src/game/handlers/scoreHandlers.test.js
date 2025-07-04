import { createScoreHandlers } from './scoreHandlers';
import { createMockDependencies } from '../testUtils';

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
      closeScoreEditModal: jest.fn()
    };
  });

  describe('handler creation', () => {
    it('should create all required handler functions', () => {
      const handlers = createScoreHandlers(
        mockStateUpdaters,
        mockModalHandlers
      );

      expect(handlers.handleAddHomeGoal).toBeDefined();
      expect(handlers.handleAddAwayGoal).toBeDefined();
      expect(handlers.handleScoreEdit).toBeDefined();
      expect(handlers.handleOpenScoreEdit).toBeDefined();
      expect(handlers.scoreCallback).toBeDefined();
      expect(typeof handlers.handleAddHomeGoal).toBe('function');
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