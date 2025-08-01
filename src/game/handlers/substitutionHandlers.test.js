import { createSubstitutionHandlers } from './substitutionHandlers';
import { animateStateChange } from '../animation/animationSupport';
import { 
  calculateSubstitution, 
  calculatePositionSwitch,
  calculatePlayerToggleInactive,
  calculateSubstituteSwap,
  calculateUndo,
  calculateSubstituteReorder
} from '../logic/gameStateLogic';
import { findPlayerById, getOutfieldPlayers, hasActiveSubstitutes } from '../../utils/playerUtils';
import { TEAM_MODES } from '../../constants/playerConstants';
import { 
  createMockPlayers, 
  createMockGameState,
  createMockDependencies 
} from '../testUtils';

jest.mock('../animation/animationSupport');
jest.mock('../logic/gameStateLogic');
jest.mock('../../utils/playerUtils');

describe('createSubstitutionHandlers', () => {
  let mockDependencies;
  let mockPlayers;
  let mockGameState;
  let mockGameStateFactory;
  let mockLastSubstitution;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDependencies = createMockDependencies();
    mockPlayers = createMockPlayers(7, TEAM_MODES.INDIVIDUAL_7);
    // Ensure all mock players are explicitly active (not inactive)
    mockPlayers = mockPlayers.map(p => ({
      ...p,
      stats: {
        ...p.stats,
        isInactive: false
      }
    }));
    mockGameState = createMockGameState(TEAM_MODES.INDIVIDUAL_7);
    // Update mock game state to use the updated players
    mockGameState.allPlayers = mockPlayers;
    mockGameStateFactory = jest.fn(() => mockGameState);
    mockLastSubstitution = {
      timestamp: 1000,
      beforeFormation: mockGameState.formation,
      beforeNextPair: 'leftPair',
      beforeNextPlayer: 'leftDefender',
      beforeNextPlayerId: '1',
      beforeNextNextPlayerId: '2',
      playersComingOnOriginalStats: [],
      playersComingOnIds: ['5'],
      playersGoingOffIds: ['1'],
      teamMode: TEAM_MODES.INDIVIDUAL_7,
      subTimerSecondsAtSubstitution: 120
    };

    // Mock state updaters
    const mockStateUpdaters = {
      ...mockDependencies.stateUpdaters,
      setShouldSubstituteNow: jest.fn(),
      setLastSubstitution: jest.fn(),
      setLastSubstitutionTimestamp: jest.fn(),
      resetSubTimer: jest.fn(),
      handleUndoSubstitutionTimer: jest.fn()
    };
    mockDependencies.stateUpdaters = mockStateUpdaters;

    // Mock utility functions
    findPlayerById.mockImplementation((players, id) => 
      players.find(p => p.id === id)
    );
    
    getOutfieldPlayers.mockImplementation((players, squadIds, goalieId) => 
      players.filter(p => p.id !== goalieId)
    );

    hasActiveSubstitutes.mockImplementation((allPlayers, teamMode) => {
      // For test purposes, return true if there are any substitute players that are not inactive
      const { getSubstitutePositions } = require('../../constants/gameModes');
      const substitutePositions = getSubstitutePositions(teamMode);
      if (!substitutePositions.length) return false;
      
      const substitutePlayers = allPlayers.filter(player => 
        substitutePositions.includes(player.stats?.currentPairKey)
      );
      
      return substitutePlayers.some(player => !player.stats?.isInactive);
    });

    // Mock animation and calculation functions
    animateStateChange.mockImplementation((gameState, calculateFn, applyFn) => {
      const newState = calculateFn(gameState);
      applyFn(newState);
    });

    calculateSubstitution.mockImplementation((gameState) => ({
      ...gameState,
      playersToHighlight: ['5'],
      formation: { ...gameState.formation, substitute_1: '1' }
    }));

    calculatePositionSwitch.mockImplementation((gameState) => gameState);
    calculatePlayerToggleInactive.mockImplementation((gameState) => gameState);
    calculateSubstituteSwap.mockImplementation((gameState) => gameState);
    calculateSubstituteReorder.mockImplementation((gameState) => gameState);
    calculateUndo.mockImplementation((gameState) => gameState);
  });

  describe('handler creation', () => {
    it('should create all required handler functions', () => {
      const handlers = createSubstitutionHandlers(
        mockGameStateFactory,
        mockDependencies.stateUpdaters,
        mockDependencies.animationHooks,
        mockDependencies.modalHandlers,
        TEAM_MODES.INDIVIDUAL_7
      );

      expect(handlers.handleSetNextSubstitution).toBeDefined();
      expect(handlers.handleSubstituteNow).toBeDefined();
      expect(handlers.handleCancelFieldPlayerModal).toBeDefined();
      expect(handlers.handleSetAsNextToGoIn).toBeDefined();
      expect(handlers.handleInactivatePlayer).toBeDefined();
      expect(handlers.handleActivatePlayer).toBeDefined();
      expect(handlers.handleCancelSubstituteModal).toBeDefined();
      expect(handlers.handleSubstitutionWithHighlight).toBeDefined();
      expect(handlers.handleChangePosition).toBeDefined();
      expect(handlers.handleUndo).toBeDefined();
    });
  });

  describe('handleSetNextSubstitution', () => {
    it('should set next pair substitution for pairs mode', () => {
      const handlers = createSubstitutionHandlers(
        mockGameStateFactory,
        mockDependencies.stateUpdaters,
        mockDependencies.animationHooks,
        mockDependencies.modalHandlers,
        TEAM_MODES.PAIRS_7
      );

      const fieldPlayerModal = { type: 'pair', target: 'leftPair' };
      handlers.handleSetNextSubstitution(fieldPlayerModal);

      expect(mockDependencies.stateUpdaters.setNextPhysicalPairToSubOut).toHaveBeenCalledWith('leftPair');
      expect(mockDependencies.modalHandlers.closeFieldPlayerModal).toHaveBeenCalled();
    });

    it('should set next player substitution for individual mode', () => {
      const handlers = createSubstitutionHandlers(
        mockGameStateFactory,
        mockDependencies.stateUpdaters,
        mockDependencies.animationHooks,
        mockDependencies.modalHandlers,
        TEAM_MODES.INDIVIDUAL_7
      );

      const fieldPlayerModal = { type: 'player', target: 'leftDefender' };
      handlers.handleSetNextSubstitution(fieldPlayerModal);

      expect(mockDependencies.stateUpdaters.setNextPlayerToSubOut).toHaveBeenCalledWith('leftDefender', false);
      expect(mockDependencies.modalHandlers.closeFieldPlayerModal).toHaveBeenCalled();
    });
  });

  describe('handleSubstituteNow', () => {
    it('should set next substitution and trigger immediate substitution', () => {
      const handlers = createSubstitutionHandlers(
        mockGameStateFactory,
        mockDependencies.stateUpdaters,
        mockDependencies.animationHooks,
        mockDependencies.modalHandlers,
        TEAM_MODES.INDIVIDUAL_7
      );

      const fieldPlayerModal = { type: 'player', target: 'leftDefender' };
      handlers.handleSubstituteNow(fieldPlayerModal);

      expect(mockDependencies.stateUpdaters.setNextPlayerToSubOut).toHaveBeenCalledWith('leftDefender', false);
      expect(mockDependencies.stateUpdaters.setShouldSubstituteNow).toHaveBeenCalledWith(true);
      expect(mockDependencies.modalHandlers.closeFieldPlayerModal).toHaveBeenCalled();
    });
  });

  describe('handleSetAsNextToGoIn', () => {
    it('should reorder substitute positions in individual 7 mode', () => {
      const handlers = createSubstitutionHandlers(
        mockGameStateFactory,
        mockDependencies.stateUpdaters,
        mockDependencies.animationHooks,
        mockDependencies.modalHandlers,
        TEAM_MODES.INDIVIDUAL_7
      );

      const substituteModal = { playerId: '6' };
      const formation = { substitute_1: '5', substitute_2: '6' };
      
      handlers.handleSetAsNextToGoIn(substituteModal, formation);

      expect(animateStateChange).toHaveBeenCalled();
      expect(calculateSubstituteReorder).toHaveBeenCalledWith(mockGameState, 'substitute_2');
      expect(mockDependencies.modalHandlers.closeSubstituteModal).toHaveBeenCalled();
    });

    it('should not reorder if player is substitute_1', () => {
      const handlers = createSubstitutionHandlers(
        mockGameStateFactory,
        mockDependencies.stateUpdaters,
        mockDependencies.animationHooks,
        mockDependencies.modalHandlers,
        TEAM_MODES.INDIVIDUAL_7
      );

      const substituteModal = { playerId: '5' };
      const formation = { substitute_1: '5', substitute_2: '6' };
      
      handlers.handleSetAsNextToGoIn(substituteModal, formation);

      expect(animateStateChange).not.toHaveBeenCalled();
      expect(mockDependencies.modalHandlers.closeSubstituteModal).toHaveBeenCalled();
    });

    it('should not reorder if not in individual mode with multiple substitutes', () => {
      const handlers = createSubstitutionHandlers(
        mockGameStateFactory,
        mockDependencies.stateUpdaters,
        mockDependencies.animationHooks,
        mockDependencies.modalHandlers,
        TEAM_MODES.INDIVIDUAL_6
      );

      const substituteModal = { playerId: '5' };
      const formation = { substitute: '5' };
      
      handlers.handleSetAsNextToGoIn(substituteModal, formation);

      expect(animateStateChange).not.toHaveBeenCalled();
      expect(mockDependencies.modalHandlers.closeSubstituteModal).toHaveBeenCalled();
    });
  });

  describe('handleInactivatePlayer', () => {
    it('should inactivate substitute_2 without animation', () => {
      const playersWithSub7_2 = mockPlayers.map(p => 
        p.id === '6' ? { ...p, stats: { ...p.stats, currentPairKey: 'substitute_2' }} : p
      );
      
      findPlayerById.mockReturnValue(playersWithSub7_2.find(p => p.id === '6'));

      const handlers = createSubstitutionHandlers(
        mockGameStateFactory,
        mockDependencies.stateUpdaters,
        mockDependencies.animationHooks,
        mockDependencies.modalHandlers,
        TEAM_MODES.INDIVIDUAL_7
      );

      const substituteModal = { playerId: '6' };
      
      handlers.handleInactivatePlayer(substituteModal, playersWithSub7_2, mockGameState.formation);

      expect(animateStateChange).not.toHaveBeenCalled();
      expect(calculatePlayerToggleInactive).toHaveBeenCalledWith(mockGameState, '6');
      expect(mockDependencies.stateUpdaters.setFormation).toHaveBeenCalled();
    });

    it('should inactivate substitute_1 with animation', () => {
      const playersWithSub7_1 = mockPlayers.map(p => 
        p.id === '5' ? { ...p, stats: { ...p.stats, currentPairKey: 'substitute_1' }} : p
      );
      
      findPlayerById.mockReturnValue(playersWithSub7_1.find(p => p.id === '5'));

      const handlers = createSubstitutionHandlers(
        mockGameStateFactory,
        mockDependencies.stateUpdaters,
        mockDependencies.animationHooks,
        mockDependencies.modalHandlers,
        TEAM_MODES.INDIVIDUAL_7
      );

      const substituteModal = { playerId: '5' };
      
      handlers.handleInactivatePlayer(substituteModal, playersWithSub7_1, mockGameState.formation);

      expect(animateStateChange).toHaveBeenCalled();
      expect(calculatePlayerToggleInactive).toHaveBeenCalledWith(mockGameState, '5');
    });

    it('should handle INDIVIDUAL_6 mode without animation (only one substitute position)', () => {
      const playersWithSub6_1 = mockPlayers.slice(0, 6).map(p => 
        p.id === '5' ? { ...p, stats: { ...p.stats, currentPairKey: 'substitute_1' }} : p
      );
      
      findPlayerById.mockReturnValue(playersWithSub6_1.find(p => p.id === '5'));

      const handlers = createSubstitutionHandlers(
        mockGameStateFactory,
        mockDependencies.stateUpdaters,
        mockDependencies.animationHooks,
        mockDependencies.modalHandlers,
        TEAM_MODES.INDIVIDUAL_6
      );

      const substituteModal = { playerId: '5' };
      
      handlers.handleInactivatePlayer(substituteModal, playersWithSub6_1, { ...mockGameState.formation, substitute: '5' });

      expect(animateStateChange).not.toHaveBeenCalled();
      expect(calculatePlayerToggleInactive).toHaveBeenCalledWith(mockGameState, '5');
    });
  });

  describe('handleActivatePlayer', () => {
    it('should activate player with animation in individual 7 mode', () => {
      const handlers = createSubstitutionHandlers(
        mockGameStateFactory,
        mockDependencies.stateUpdaters,
        mockDependencies.animationHooks,
        mockDependencies.modalHandlers,
        TEAM_MODES.INDIVIDUAL_7
      );

      const substituteModal = { playerId: '5' };
      
      handlers.handleActivatePlayer(substituteModal);

      expect(animateStateChange).toHaveBeenCalled();
      expect(calculatePlayerToggleInactive).toHaveBeenCalledWith(mockGameState, '5');
      expect(mockDependencies.modalHandlers.closeSubstituteModal).toHaveBeenCalled();
    });

    it('should activate player with animation in INDIVIDUAL_6 mode (now supports inactive players)', () => {
      const handlers = createSubstitutionHandlers(
        mockGameStateFactory,
        mockDependencies.stateUpdaters,
        mockDependencies.animationHooks,
        mockDependencies.modalHandlers,
        TEAM_MODES.INDIVIDUAL_6
      );

      const substituteModal = { playerId: '5' };
      
      handlers.handleActivatePlayer(substituteModal);

      expect(animateStateChange).toHaveBeenCalled();
      expect(calculatePlayerToggleInactive).toHaveBeenCalledWith(mockGameState, '5');
      expect(mockDependencies.modalHandlers.closeSubstituteModal).toHaveBeenCalled();
    });
  });

  describe('handleSubstitutionWithHighlight', () => {
    it('should perform substitution with animation and save undo data', () => {
      // Ensure substitute players are explicitly active (not inactive)
      const playersWithActiveSubstitutes = mockPlayers.map(p => ({
        ...p,
        stats: {
          ...p.stats,
          isInactive: false // Explicitly set all players as active
        }
      }));

      const mockGameStateWithTimer = {
        ...mockGameState,
        allPlayers: playersWithActiveSubstitutes,
        subTimerSeconds: 120
      };
      mockGameStateFactory.mockReturnValue(mockGameStateWithTimer);

      const handlers = createSubstitutionHandlers(
        mockGameStateFactory,
        mockDependencies.stateUpdaters,
        mockDependencies.animationHooks,
        mockDependencies.modalHandlers,
        TEAM_MODES.INDIVIDUAL_7
      );

      handlers.handleSubstitutionWithHighlight();

      expect(animateStateChange).toHaveBeenCalled();
      expect(calculateSubstitution).toHaveBeenCalledWith(mockGameStateWithTimer);
      expect(mockDependencies.stateUpdaters.setLastSubstitution).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(Number),
          beforeFormation: mockGameStateWithTimer.formation,
          teamMode: TEAM_MODES.INDIVIDUAL_7,
          subTimerSecondsAtSubstitution: 120
        })
      );
      expect(mockDependencies.stateUpdaters.resetSubTimer).toHaveBeenCalled();
    });
  });

  describe('handleChangePosition', () => {
    it('should sort available players by role when showing position options', () => {
      const formation = {
        goalie: '7',
        leftDefender: '1',
        rightDefender: '2',
        leftAttacker: '3',
        rightAttacker: '4',
        substitute_1: '5',
        substitute_2: '6',
      };

      const playersInFormation = mockPlayers.map(p => {
        const position = Object.keys(formation).find(key => formation[key] === p.id);
        return {
          ...p,
          stats: {
            ...p.stats,
            currentPairKey: position || null,
          },
        };
      });

      const mockGameStateWithModal = {
        ...mockGameState,
        formation,
        allPlayers: playersInFormation,
        fieldPlayerModal: {
          type: 'player',
          target: 'leftDefender', // Source player is a Defender
          playerName: 'Player 1',
          sourcePlayerId: '1',
        },
        selectedSquadPlayers: playersInFormation,
      };
      mockGameStateFactory.mockReturnValue(mockGameStateWithModal);

      const handlers = createSubstitutionHandlers(
        mockGameStateFactory,
        mockDependencies.stateUpdaters,
        mockDependencies.animationHooks,
        mockDependencies.modalHandlers,
        TEAM_MODES.INDIVIDUAL_7
      );

      handlers.handleChangePosition('show-options');

      const openModalCall = mockDependencies.modalHandlers.openFieldPlayerModal.mock.calls[0][0];
      const availablePlayers = openModalCall.availablePlayers;

      // Source player '1' is a Defender.
      // Expected order: Attackers ('3', '4'), then the other Defender ('2').
      expect(availablePlayers.map(p => p.id)).toEqual(['3', '4', '2']);
    });

    it('should show alert for pairs mode position change', () => {
      const mockGameStateWithModal = {
        ...mockGameState,
        teamMode: TEAM_MODES.PAIRS_7,
        fieldPlayerModal: {
          type: 'pair',
          target: 'leftPair'
        }
      };
      mockGameStateFactory.mockReturnValue(mockGameStateWithModal);

      global.alert = jest.fn();

      const handlers = createSubstitutionHandlers(
        mockGameStateFactory,
        mockDependencies.stateUpdaters,
        mockDependencies.animationHooks,
        mockDependencies.modalHandlers,
        TEAM_MODES.PAIRS_7
      );

      handlers.handleChangePosition('show-options');

      expect(global.alert).toHaveBeenCalledWith(
        expect.stringContaining('Position change between pairs is not supported')
      );
      expect(mockDependencies.modalHandlers.closeFieldPlayerModal).toHaveBeenCalled();
    });

    it('should perform position switch with animation', () => {
      const mockGameStateWithModal = {
        ...mockGameState,
        fieldPlayerModal: {
          type: 'player',
          target: 'leftDefender',
          sourcePlayerId: '1'
        }
      };
      mockGameStateFactory.mockReturnValue(mockGameStateWithModal);

      const handlers = createSubstitutionHandlers(
        mockGameStateFactory,
        mockDependencies.stateUpdaters,
        mockDependencies.animationHooks,
        mockDependencies.modalHandlers,
        TEAM_MODES.INDIVIDUAL_7
      );

      handlers.handleChangePosition('3');

      expect(animateStateChange).toHaveBeenCalled();
      expect(calculatePositionSwitch).toHaveBeenCalledWith(mockGameStateWithModal, '1', '3');
      expect(mockDependencies.modalHandlers.closeFieldPlayerModal).toHaveBeenCalled();
    });

    it('should go back to main options when action is null', () => {
      const mockGameStateWithModal = {
        ...mockGameState,
        fieldPlayerModal: {
          type: 'player',
          target: 'leftDefender',
          playerName: 'Player 1',
          sourcePlayerId: '1'
        }
      };
      mockGameStateFactory.mockReturnValue(mockGameStateWithModal);

      const handlers = createSubstitutionHandlers(
        mockGameStateFactory,
        mockDependencies.stateUpdaters,
        mockDependencies.animationHooks,
        mockDependencies.modalHandlers,
        TEAM_MODES.INDIVIDUAL_7
      );

      handlers.handleChangePosition(null);

      expect(mockDependencies.modalHandlers.openFieldPlayerModal).toHaveBeenCalledWith(
        expect.objectContaining({
          showPositionOptions: false
        })
      );
    });
  });

  describe('handleUndo', () => {
    it('should perform undo with animation', () => {
      const handlers = createSubstitutionHandlers(
        mockGameStateFactory,
        mockDependencies.stateUpdaters,
        mockDependencies.animationHooks,
        mockDependencies.modalHandlers,
        TEAM_MODES.INDIVIDUAL_7
      );

      handlers.handleUndo(mockLastSubstitution);

      expect(animateStateChange).toHaveBeenCalled();
      expect(calculateUndo).toHaveBeenCalledWith(mockGameState, mockLastSubstitution);
      expect(mockDependencies.stateUpdaters.handleUndoSubstitutionTimer).toHaveBeenCalledWith(120, 1000);
    });

    it('should handle missing lastSubstitution gracefully', () => {
      console.warn = jest.fn();

      const handlers = createSubstitutionHandlers(
        mockGameStateFactory,
        mockDependencies.stateUpdaters,
        mockDependencies.animationHooks,
        mockDependencies.modalHandlers,
        TEAM_MODES.INDIVIDUAL_7
      );

      handlers.handleUndo(null);

      expect(animateStateChange).not.toHaveBeenCalled();
    });

    it('should handle missing undo timer function gracefully', () => {
      const stateUpdatersWithoutUndo = {
        ...mockDependencies.stateUpdaters,
        handleUndoSubstitutionTimer: undefined
      };

      const handlers = createSubstitutionHandlers(
        mockGameStateFactory,
        stateUpdatersWithoutUndo,
        mockDependencies.animationHooks,
        mockDependencies.modalHandlers,
        TEAM_MODES.INDIVIDUAL_7
      );

      expect(() => handlers.handleUndo(mockLastSubstitution)).not.toThrow();
    });
  });

  describe('modal cancellation handlers', () => {
    it('should handle field player modal cancellation', () => {
      const handlers = createSubstitutionHandlers(
        mockGameStateFactory,
        mockDependencies.stateUpdaters,
        mockDependencies.animationHooks,
        mockDependencies.modalHandlers,
        TEAM_MODES.INDIVIDUAL_7
      );

      handlers.handleCancelFieldPlayerModal();

      expect(mockDependencies.modalHandlers.closeFieldPlayerModal).toHaveBeenCalled();
      expect(mockDependencies.modalHandlers.removeModalFromStack).toHaveBeenCalled();
    });

    it('should handle substitute modal cancellation', () => {
      const handlers = createSubstitutionHandlers(
        mockGameStateFactory,
        mockDependencies.stateUpdaters,
        mockDependencies.animationHooks,
        mockDependencies.modalHandlers,
        TEAM_MODES.INDIVIDUAL_7
      );

      handlers.handleCancelSubstituteModal();

      expect(mockDependencies.modalHandlers.closeSubstituteModal).toHaveBeenCalled();
      expect(mockDependencies.modalHandlers.removeModalFromStack).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle missing game state factory gracefully', () => {
      const handlers = createSubstitutionHandlers(
        () => null,
        mockDependencies.stateUpdaters,
        mockDependencies.animationHooks,
        mockDependencies.modalHandlers,
        TEAM_MODES.INDIVIDUAL_7
      );

      // This will throw because the handler expects a valid game state
      expect(() => handlers.handleSubstitutionWithHighlight()).toThrow();
    });

    it('should handle missing field player modal gracefully', () => {
      const mockGameStateWithoutModal = {
        ...mockGameState,
        fieldPlayerModal: undefined
      };
      mockGameStateFactory.mockReturnValue(mockGameStateWithoutModal);

      const handlers = createSubstitutionHandlers(
        mockGameStateFactory,
        mockDependencies.stateUpdaters,
        mockDependencies.animationHooks,
        mockDependencies.modalHandlers,
        TEAM_MODES.INDIVIDUAL_7
      );

      // This will throw because the handler expects a field player modal
      expect(() => handlers.handleChangePosition('show-options')).toThrow();
    });
  });
});