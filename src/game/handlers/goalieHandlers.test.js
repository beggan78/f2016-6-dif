import { createGoalieHandlers } from './goalieHandlers';
import { animateStateChange } from '../animation/animationSupport';
import { calculateGoalieSwitch } from '../logic/gameStateLogic';
import { getPlayerName, getOutfieldPlayers } from '../../utils/playerUtils';
import { 
  createMockPlayers, 
  createMockGameState,
  createMockDependencies
} from '../testUtils';
import { TEAM_CONFIGS } from '../testUtils';
import { PLAYER_STATUS } from '../../constants/playerConstants';

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
    mockPlayers = createMockPlayers(7, TEAM_CONFIGS.INDIVIDUAL_7);
    mockGameState = createMockGameState(TEAM_CONFIGS.INDIVIDUAL_7);
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
      formation: { ...gameState.formation, goalie: newGoalieId },
      allPlayers: gameState.allPlayers.map(p => 
        p.id === newGoalieId 
          ? { ...p, stats: { ...p.stats, currentStatus: PLAYER_STATUS.GOALIE }}
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

      expect(handlers.handleGoalieQuickTap).toBeDefined();
      expect(handlers.handleSelectNewGoalie).toBeDefined();
      expect(handlers.handleCancelGoalieModal).toBeDefined();
      expect(handlers.goalieCallback).toBeDefined();
      expect(typeof handlers.goalieCallback).toBe('function');
    });
  });

  describe('handleGoalieQuickTap', () => {
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
      handlers.handleGoalieQuickTap(mockFormation);

      expect(getPlayerName).toHaveBeenCalledWith(mockPlayers, '7');
      expect(getOutfieldPlayers).toHaveBeenCalledWith(mockPlayers, expect.any(Array), '7');
      expect(mockDependencies.modalHandlers.openGoalieModal).toHaveBeenCalledWith({
        currentGoalieName: 'Player 7',
        availablePlayers: expect.arrayContaining([
          { id: expect.any(String), name: expect.any(String), isInactive: expect.any(Boolean) }
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
      handlers.handleGoalieQuickTap(mockFormation);

      expect(mockDependencies.modalHandlers.openGoalieModal).toHaveBeenCalledWith({
        currentGoalieName: 'Player undefined',
        availablePlayers: expect.any(Array)
      });
    });

    it('should filter out non-outfield players from available options', () => {
      const playersWithGoalie = mockPlayers.map(p => 
        p.id === '7' ? { ...p, stats: { ...p.stats, currentStatus: PLAYER_STATUS.GOALIE } } : p
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
      handlers.handleGoalieQuickTap(mockFormation);

      expect(mockDependencies.modalHandlers.openGoalieModal).toHaveBeenCalledWith({
        currentGoalieName: 'Player 7',
        availablePlayers: expect.arrayContaining([
          { id: '1', name: 'Player 1', isInactive: false },
          { id: '2', name: 'Player 2', isInactive: false },
          { id: '3', name: 'Player 3', isInactive: false },
          { id: '4', name: 'Player 4', isInactive: false },
          { id: '5', name: 'Player 5', isInactive: false },
          { id: '6', name: 'Player 6', isInactive: false }
        ])
      });
    });

    it('should include isInactive property for inactive players', () => {
      // Mock players with some inactive
      const playersWithInactive = mockPlayers.map(p => 
        p.id === '3' ? { ...p, stats: { ...p.stats, isInactive: true }} : p
      );

      getOutfieldPlayers.mockReturnValue(playersWithInactive.slice(0, 6));

      const handlers = createGoalieHandlers(
        mockGameStateFactory,
        mockDependencies.stateUpdaters,
        mockDependencies.animationHooks,
        mockDependencies.modalHandlers,
        playersWithInactive,
        playersWithInactive
      );

      const mockFormation = { goalie: '7' };
      handlers.handleGoalieQuickTap(mockFormation);

      expect(mockDependencies.modalHandlers.openGoalieModal).toHaveBeenCalledWith({
        currentGoalieName: 'Player 7',
        availablePlayers: expect.arrayContaining([
          { id: '1', name: 'Player 1', isInactive: false },
          { id: '2', name: 'Player 2', isInactive: false },
          { id: '3', name: 'Player 3', isInactive: true },
          { id: '4', name: 'Player 4', isInactive: false },
          { id: '5', name: 'Player 5', isInactive: false },
          { id: '6', name: 'Player 6', isInactive: false }
        ])
      });
    });

    it('should sort players with active players first, then inactive players', () => {
      // Mock players with mixed inactive status and names for sorting test
      const playersWithMixedStatus = [
        { id: '1', name: 'Zoe Smith', stats: { isInactive: true }},
        { id: '2', name: 'Alice Brown', stats: { isInactive: false }},
        { id: '3', name: 'Bob Wilson', stats: { isInactive: true }},
        { id: '4', name: 'Charlie Davis', stats: { isInactive: false }},
        { id: '5', name: 'Anna Johnson', stats: { isInactive: false }},
        { id: '6', name: 'David Lee', stats: { isInactive: true }}
      ];

      getOutfieldPlayers.mockReturnValue(playersWithMixedStatus);

      const handlers = createGoalieHandlers(
        mockGameStateFactory,
        mockDependencies.stateUpdaters,
        mockDependencies.animationHooks,
        mockDependencies.modalHandlers,
        playersWithMixedStatus,
        playersWithMixedStatus
      );

      const mockFormation = { goalie: '7' };
      handlers.handleGoalieQuickTap(mockFormation);

      // Get the actual call arguments to verify order
      const callArgs = mockDependencies.modalHandlers.openGoalieModal.mock.calls[0][0];
      const availablePlayers = callArgs.availablePlayers;

      // Verify that active players come first
      const activePlayersEnd = availablePlayers.findIndex(p => p.isInactive === true);
      const inactivePlayersStart = activePlayersEnd === -1 ? availablePlayers.length : activePlayersEnd;
      
      // Check that all players before the first inactive player are active
      for (let i = 0; i < inactivePlayersStart; i++) {
        expect(availablePlayers[i].isInactive).toBe(false);
      }
      
      // Check that all players from the first inactive player onwards are inactive
      for (let i = inactivePlayersStart; i < availablePlayers.length; i++) {
        expect(availablePlayers[i].isInactive).toBe(true);
      }

      // Verify alphabetical order within active players
      const activeNames = availablePlayers.slice(0, inactivePlayersStart).map(p => p.name);
      const sortedActiveNames = [...activeNames].sort();
      expect(activeNames).toEqual(sortedActiveNames);

      // Verify alphabetical order within inactive players
      const inactiveNames = availablePlayers.slice(inactivePlayersStart).map(p => p.name);
      const sortedInactiveNames = [...inactiveNames].sort();
      expect(inactiveNames).toEqual(sortedInactiveNames);
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
        formation: { ...mockGameState.formation, goalie: '3' },
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

      expect(mockDependencies.stateUpdaters.setFormation).toHaveBeenCalledWith(newGameState.formation);
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

    it('should remove modal from stack if removeFromNavigationStack is available', () => {
      const handlers = createGoalieHandlers(
        mockGameStateFactory,
        mockDependencies.stateUpdaters,
        mockDependencies.animationHooks,
        mockDependencies.modalHandlers,
        mockPlayers,
        mockPlayers
      );

      handlers.handleCancelGoalieModal();

      expect(mockDependencies.modalHandlers.removeFromNavigationStack).toHaveBeenCalled();
    });

    it('should handle missing removeFromNavigationStack gracefully', () => {
      const modalHandlersWithoutRemove = {
        ...mockDependencies.modalHandlers,
        removeFromNavigationStack: undefined
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
    it('should get game state and call handleGoalieQuickTap', () => {
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
      handlers.handleGoalieQuickTap(mockFormation);

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