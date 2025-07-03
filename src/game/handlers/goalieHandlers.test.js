import { createGoalieHandlers } from './goalieHandlers';
import { animateStateChange } from '../animation/animationSupport';
import { calculateGoalieSwitch } from '../logic/gameStateLogic';
import { getPlayerName, getOutfieldPlayers } from '../../utils/playerUtils';
import { 
  createMockPlayers, 
  createMockGameState,
  createMockDependencies
} from '../testUtils';
import { TEAM_MODES } from '../../constants/playerConstants';

jest.mock('../animation/animationSupport');
jest.mock('../logic/gameStateLogic');
jest.mock('../../utils/playerUtils');

describe('createGoalieHandlers', () => {
  let mockDependencies;
  let mockPlayers;
  let mockGameState;
  let mockGameStateFactory;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDependencies = createMockDependencies();
    mockPlayers = createMockPlayers(7, TEAM_MODES.INDIVIDUAL_7);
    mockGameState = createMockGameState(TEAM_MODES.INDIVIDUAL_7);
    mockGameStateFactory = jest.fn(() => mockGameState);

    // Mock utility functions
    getPlayerName.mockImplementation((players, id) => 
      players.find(p => p.id === id)?.name || `Player ${id}`
    );
    
    getOutfieldPlayers.mockImplementation((allPlayers, selectedSquadIds, goalieId) => 
      allPlayers.filter(p => 
        selectedSquadIds.includes(p.id) && p.id !== goalieId
      )
    );

    animateStateChange.mockImplementation((gameState, calculateFn, applyFn) => {
      const newState = calculateFn(gameState);
      applyFn(newState);
    });

    calculateGoalieSwitch.mockImplementation((gameState, newGoalieId) => ({
      ...gameState,
      periodFormation: { ...gameState.periodFormation, goalie: newGoalieId },
      allPlayers: gameState.allPlayers.map(p => 
        p.id === newGoalieId 
          ? { ...p, stats: { ...p.stats, currentPeriodStatus: 'GOALIE' }}
          : p
      )
    }));
  });

  describe('handler creation', () => {
    it('should create all required handler functions', () => {
      const handlers = createGoalieHandlers(
        mockGameStateFactory,
        mockDependencies.stateUpdaters,
        mockDependencies.animationHooks,
        mockDependencies.modalHandlers,
        mockPlayers,
        mockPlayers
      );

      expect(handlers.handleGoalieLongPress).toBeDefined();
      expect(handlers.handleSelectNewGoalie).toBeDefined();
      expect(handlers.handleCancelGoalieModal).toBeDefined();
      expect(handlers.goalieCallback).toBeDefined();
      expect(typeof handlers.goalieCallback).toBe('function');
    });
  });

  describe('handleGoalieLongPress', () => {
    it('should open goalie modal with current goalie and available players', () => {
      const handlers = createGoalieHandlers(
        mockGameStateFactory,
        mockDependencies.stateUpdaters,
        mockDependencies.animationHooks,
        mockDependencies.modalHandlers,
        mockPlayers,
        mockPlayers
      );

      const mockFormation = { goalie: '7' };
      handlers.handleGoalieLongPress(mockFormation);

      expect(getPlayerName).toHaveBeenCalledWith(mockPlayers, '7');
      expect(getOutfieldPlayers).toHaveBeenCalledWith(mockPlayers, expect.any(Array), '7');
      expect(mockDependencies.modalHandlers.openGoalieModal).toHaveBeenCalledWith({
        currentGoalieName: 'Player 7',
        availablePlayers: expect.arrayContaining([
          { id: expect.any(String), name: expect.any(String) }
        ])
      });
    });

    it('should handle missing goalie gracefully', () => {
      const handlers = createGoalieHandlers(
        mockGameStateFactory,
        mockDependencies.stateUpdaters,
        mockDependencies.animationHooks,
        mockDependencies.modalHandlers,
        mockPlayers,
        mockPlayers
      );

      const mockFormation = { goalie: undefined };
      handlers.handleGoalieLongPress(mockFormation);

      expect(mockDependencies.modalHandlers.openGoalieModal).toHaveBeenCalledWith({
        currentGoalieName: 'Player undefined',
        availablePlayers: expect.any(Array)
      });
    });

    it('should filter out non-outfield players from available options', () => {
      const playersWithGoalie = mockPlayers.map(p => 
        p.id === '7' ? { ...p, stats: { ...p.stats, currentPeriodStatus: 'GOALIE' }} : p
      );

      getOutfieldPlayers.mockReturnValue(playersWithGoalie.slice(0, 6));

      const handlers = createGoalieHandlers(
        mockGameStateFactory,
        mockDependencies.stateUpdaters,
        mockDependencies.animationHooks,
        mockDependencies.modalHandlers,
        playersWithGoalie,
        playersWithGoalie
      );

      const mockFormation = { goalie: '7' };
      handlers.handleGoalieLongPress(mockFormation);

      expect(mockDependencies.modalHandlers.openGoalieModal).toHaveBeenCalledWith({
        currentGoalieName: 'Player 7',
        availablePlayers: expect.arrayContaining([
          { id: '1', name: 'Player 1' },
          { id: '2', name: 'Player 2' },
          { id: '3', name: 'Player 3' },
          { id: '4', name: 'Player 4' },
          { id: '5', name: 'Player 5' },
          { id: '6', name: 'Player 6' }
        ])
      });
    });
  });

  describe('handleSelectNewGoalie', () => {
    it('should trigger goalie switch with animation', () => {
      const handlers = createGoalieHandlers(
        mockGameStateFactory,
        mockDependencies.stateUpdaters,
        mockDependencies.animationHooks,
        mockDependencies.modalHandlers,
        mockPlayers,
        mockPlayers
      );

      handlers.handleSelectNewGoalie('3');

      expect(animateStateChange).toHaveBeenCalledWith(
        mockGameState,
        expect.any(Function),
        expect.any(Function),
        mockDependencies.animationHooks.setAnimationState,
        mockDependencies.animationHooks.setHideNextOffIndicator,
        mockDependencies.animationHooks.setRecentlySubstitutedPlayers
      );
    });

    it('should call calculateGoalieSwitch with correct parameters', () => {
      const handlers = createGoalieHandlers(
        mockGameStateFactory,
        mockDependencies.stateUpdaters,
        mockDependencies.animationHooks,
        mockDependencies.modalHandlers,
        mockPlayers,
        mockPlayers
      );

      handlers.handleSelectNewGoalie('3');

      const calculateFn = animateStateChange.mock.calls[0][1];
      calculateFn(mockGameState);

      expect(calculateGoalieSwitch).toHaveBeenCalledWith(mockGameState, '3');
    });

    it('should update state with new game state', () => {
      const newGameState = {
        ...mockGameState,
        periodFormation: { ...mockGameState.periodFormation, goalie: '3' },
        allPlayers: mockGameState.allPlayers
      };

      calculateGoalieSwitch.mockReturnValue(newGameState);

      const handlers = createGoalieHandlers(
        mockGameStateFactory,
        mockDependencies.stateUpdaters,
        mockDependencies.animationHooks,
        mockDependencies.modalHandlers,
        mockPlayers,
        mockPlayers
      );

      handlers.handleSelectNewGoalie('3');

      const applyFn = animateStateChange.mock.calls[0][2];
      applyFn(newGameState);

      expect(mockDependencies.stateUpdaters.setPeriodFormation).toHaveBeenCalledWith(newGameState.periodFormation);
      expect(mockDependencies.stateUpdaters.setAllPlayers).toHaveBeenCalledWith(newGameState.allPlayers);
    });

    it('should close goalie modal after selection', () => {
      const handlers = createGoalieHandlers(
        mockGameStateFactory,
        mockDependencies.stateUpdaters,
        mockDependencies.animationHooks,
        mockDependencies.modalHandlers,
        mockPlayers,
        mockPlayers
      );

      handlers.handleSelectNewGoalie('3');

      expect(mockDependencies.modalHandlers.closeGoalieModal).toHaveBeenCalled();
    });
  });

  describe('handleCancelGoalieModal', () => {
    it('should close goalie modal', () => {
      const handlers = createGoalieHandlers(
        mockGameStateFactory,
        mockDependencies.stateUpdaters,
        mockDependencies.animationHooks,
        mockDependencies.modalHandlers,
        mockPlayers,
        mockPlayers
      );

      handlers.handleCancelGoalieModal();

      expect(mockDependencies.modalHandlers.closeGoalieModal).toHaveBeenCalled();
    });

    it('should remove modal from stack if removeModalFromStack is available', () => {
      const handlers = createGoalieHandlers(
        mockGameStateFactory,
        mockDependencies.stateUpdaters,
        mockDependencies.animationHooks,
        mockDependencies.modalHandlers,
        mockPlayers,
        mockPlayers
      );

      handlers.handleCancelGoalieModal();

      expect(mockDependencies.modalHandlers.removeModalFromStack).toHaveBeenCalled();
    });

    it('should handle missing removeModalFromStack gracefully', () => {
      const modalHandlersWithoutRemove = {
        ...mockDependencies.modalHandlers,
        removeModalFromStack: undefined
      };

      const handlers = createGoalieHandlers(
        mockGameStateFactory,
        mockDependencies.stateUpdaters,
        mockDependencies.animationHooks,
        modalHandlersWithoutRemove,
        mockPlayers,
        mockPlayers
      );

      expect(() => handlers.handleCancelGoalieModal()).not.toThrow();
      expect(modalHandlersWithoutRemove.closeGoalieModal).toHaveBeenCalled();
    });
  });

  describe('goalieCallback', () => {
    it('should get game state and call handleGoalieLongPress', () => {
      const handlers = createGoalieHandlers(
        mockGameStateFactory,
        mockDependencies.stateUpdaters,
        mockDependencies.animationHooks,
        mockDependencies.modalHandlers,
        mockPlayers,
        mockPlayers
      );

      handlers.goalieCallback();

      expect(mockGameStateFactory).toHaveBeenCalled();
      expect(mockDependencies.modalHandlers.openGoalieModal).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle missing players gracefully', () => {
      getPlayerName.mockReturnValue(undefined);
      getOutfieldPlayers.mockReturnValue([]);

      const handlers = createGoalieHandlers(
        mockGameStateFactory,
        mockDependencies.stateUpdaters,
        mockDependencies.animationHooks,
        mockDependencies.modalHandlers,
        [],
        []
      );

      const mockFormation = { goalie: '7' };
      handlers.handleGoalieLongPress(mockFormation);

      expect(mockDependencies.modalHandlers.openGoalieModal).toHaveBeenCalledWith({
        currentGoalieName: undefined,
        availablePlayers: []
      });
    });

    it('should handle calculateGoalieSwitch failure gracefully', () => {
      calculateGoalieSwitch.mockImplementation(() => {
        throw new Error('Calculation failed');
      });

      const handlers = createGoalieHandlers(
        mockGameStateFactory,
        mockDependencies.stateUpdaters,
        mockDependencies.animationHooks,
        mockDependencies.modalHandlers,
        mockPlayers,
        mockPlayers
      );

      // This will propagate the error since animateStateChange doesn't handle errors
      expect(() => handlers.handleSelectNewGoalie('3')).toThrow('Calculation failed');
    });
  });

  describe('integration', () => {
    it('should properly integrate with animation system', () => {
      const handlers = createGoalieHandlers(
        mockGameStateFactory,
        mockDependencies.stateUpdaters,
        mockDependencies.animationHooks,
        mockDependencies.modalHandlers,
        mockPlayers,
        mockPlayers
      );

      handlers.handleSelectNewGoalie('3');

      expect(animateStateChange).toHaveBeenCalledTimes(1);
      expect(animateStateChange).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Function),
        expect.any(Function),
        mockDependencies.animationHooks.setAnimationState,
        mockDependencies.animationHooks.setHideNextOffIndicator,
        mockDependencies.animationHooks.setRecentlySubstitutedPlayers
      );
    });

    it('should properly integrate with game state factory', () => {
      const handlers = createGoalieHandlers(
        mockGameStateFactory,
        mockDependencies.stateUpdaters,
        mockDependencies.animationHooks,
        mockDependencies.modalHandlers,
        mockPlayers,
        mockPlayers
      );

      handlers.goalieCallback();
      handlers.handleSelectNewGoalie('3');

      expect(mockGameStateFactory).toHaveBeenCalledTimes(2);
    });
  });
});