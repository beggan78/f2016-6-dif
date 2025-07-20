import { createFieldPositionHandlers } from './fieldPositionHandlers';
import { TEAM_MODES } from '../../constants/playerConstants';
import { 
  createMockPlayers, 
  createMockFormation, 
  createMockDependencies 
} from '../testUtils';

describe('createFieldPositionHandlers', () => {
  let mockDependencies;
  let mockPlayers;
  let mockFormation;
  let mockModalHandlers;

  beforeEach(() => {
    mockDependencies = createMockDependencies();
    mockModalHandlers = mockDependencies.modalHandlers;
    mockPlayers = createMockPlayers(7, TEAM_MODES.INDIVIDUAL_7);
    mockFormation = createMockFormation(TEAM_MODES.INDIVIDUAL_7);
  });

  describe('INDIVIDUAL_7 mode', () => {
    it('should create all required callback functions for individual 7 mode', () => {
      const handlers = createFieldPositionHandlers(
        TEAM_MODES.INDIVIDUAL_7,
        mockFormation,
        mockPlayers,
        '1',
        mockModalHandlers
      );

      expect(handlers.leftDefenderCallback).toBeDefined();
      expect(handlers.rightDefenderCallback).toBeDefined();
      expect(handlers.leftAttackerCallback).toBeDefined();
      expect(handlers.rightAttackerCallback).toBeDefined();
      expect(handlers.substitute_1Callback).toBeDefined();
      expect(handlers.substitute_2Callback).toBeDefined();
      expect(typeof handlers.leftDefenderCallback).toBe('function');
    });

    it('should handle field player long press correctly', () => {
      const handlers = createFieldPositionHandlers(
        TEAM_MODES.INDIVIDUAL_7,
        mockFormation,
        mockPlayers,
        '1',
        mockModalHandlers
      );

      handlers.leftDefenderCallback();

      expect(mockModalHandlers.openFieldPlayerModal).toHaveBeenCalledWith({
        type: 'player',
        target: 'leftDefender',
        playerName: 'Player 1',
        sourcePlayerId: '1',
        availablePlayers: [],
        showPositionOptions: false
      });
    });

    it('should handle substitute long press for substitute_1', () => {
      const handlers = createFieldPositionHandlers(
        TEAM_MODES.INDIVIDUAL_7,
        mockFormation,
        mockPlayers,
        '1',
        mockModalHandlers
      );

      handlers.substitute_1Callback();

      expect(mockModalHandlers.openSubstituteModal).toHaveBeenCalledWith({
        playerId: '5',
        playerName: 'Player 5',
        isCurrentlyInactive: false,
        canSetAsNextToGoIn: false
      });
    });

    it('should handle substitute long press for substitute_2 with next to go in option', () => {
      const handlers = createFieldPositionHandlers(
        TEAM_MODES.INDIVIDUAL_7,
        mockFormation,
        mockPlayers,
        '1',
        mockModalHandlers
      );

      handlers.substitute_2Callback();

      expect(mockModalHandlers.openSubstituteModal).toHaveBeenCalledWith({
        playerId: '6',
        playerName: 'Player 6',
        isCurrentlyInactive: false,
        canSetAsNextToGoIn: true
      });
    });

    it('should not allow setting as next to go in when player is already next', () => {
      const handlers = createFieldPositionHandlers(
        TEAM_MODES.INDIVIDUAL_7,
        mockFormation,
        mockPlayers,
        '6',
        mockModalHandlers
      );

      handlers.substitute_2Callback();

      expect(mockModalHandlers.openSubstituteModal).toHaveBeenCalledWith({
        playerId: '6',
        playerName: 'Player 6',
        isCurrentlyInactive: false,
        canSetAsNextToGoIn: false
      });
    });

    it('should handle inactive player correctly', () => {
      const inactivePlayers = mockPlayers.map(p => 
        p.id === '5' ? { ...p, stats: { ...p.stats, isInactive: true } } : p
      );

      const handlers = createFieldPositionHandlers(
        TEAM_MODES.INDIVIDUAL_7,
        mockFormation,
        inactivePlayers,
        '1',
        mockModalHandlers
      );

      handlers.substitute_1Callback();

      expect(mockModalHandlers.openSubstituteModal).toHaveBeenCalledWith({
        playerId: '5',
        playerName: 'Player 5',
        isCurrentlyInactive: true,
        canSetAsNextToGoIn: false
      });
    });
  });

  describe('PAIRS_7 mode', () => {
    beforeEach(() => {
      mockPlayers = createMockPlayers(7, TEAM_MODES.PAIRS_7);
      mockFormation = createMockFormation(TEAM_MODES.PAIRS_7);
    });

    it('should create all required callback functions for pairs mode', () => {
      const handlers = createFieldPositionHandlers(
        TEAM_MODES.PAIRS_7,
        mockFormation,
        mockPlayers,
        '1',
        mockModalHandlers
      );

      expect(handlers.leftPairCallback).toBeDefined();
      expect(handlers.rightPairCallback).toBeDefined();
      expect(handlers.subPairCallback).toBeDefined();
      expect(typeof handlers.leftPairCallback).toBe('function');
    });

    it('should handle pair long press correctly', () => {
      const handlers = createFieldPositionHandlers(
        TEAM_MODES.PAIRS_7,
        mockFormation,
        mockPlayers,
        '1',
        mockModalHandlers
      );

      handlers.leftPairCallback();

      expect(mockModalHandlers.openFieldPlayerModal).toHaveBeenCalledWith({
        type: 'pair',
        target: 'leftPair',
        playerName: 'Player 1 / Player 2',
        sourcePlayerId: null,
        availablePlayers: [],
        showPositionOptions: false
      });
    });

    it('should handle right pair long press correctly', () => {
      const handlers = createFieldPositionHandlers(
        TEAM_MODES.PAIRS_7,
        mockFormation,
        mockPlayers,
        '1',
        mockModalHandlers
      );

      handlers.rightPairCallback();

      expect(mockModalHandlers.openFieldPlayerModal).toHaveBeenCalledWith({
        type: 'pair',
        target: 'rightPair',
        playerName: 'Player 3 / Player 4',
        sourcePlayerId: null,
        availablePlayers: [],
        showPositionOptions: false
      });
    });

    it('should handle missing pair data gracefully', () => {
      const emptyFormation = { ...mockFormation, leftPair: undefined };
      
      const handlers = createFieldPositionHandlers(
        TEAM_MODES.PAIRS_7,
        emptyFormation,
        mockPlayers,
        '1',
        mockModalHandlers
      );

      handlers.leftPairCallback();

      expect(mockModalHandlers.openFieldPlayerModal).not.toHaveBeenCalled();
    });
  });

  describe('INDIVIDUAL_6 mode', () => {
    beforeEach(() => {
      mockPlayers = createMockPlayers(6, TEAM_MODES.INDIVIDUAL_6);
      mockFormation = createMockFormation(TEAM_MODES.INDIVIDUAL_6);
    });

    it('should create all required callback functions for individual 6 mode', () => {
      const handlers = createFieldPositionHandlers(
        TEAM_MODES.INDIVIDUAL_6,
        mockFormation,
        mockPlayers,
        '1',
        mockModalHandlers
      );

      expect(handlers.leftDefenderCallback).toBeDefined();
      expect(handlers.rightDefenderCallback).toBeDefined();
      expect(handlers.leftAttackerCallback).toBeDefined();
      expect(handlers.rightAttackerCallback).toBeDefined();
      expect(handlers.substitute_1Callback).toBeDefined();
      expect(typeof handlers.leftDefenderCallback).toBe('function');
    });

    it('should handle field player long press in 6-player mode', () => {
      const handlers = createFieldPositionHandlers(
        TEAM_MODES.INDIVIDUAL_6,
        mockFormation,
        mockPlayers,
        '1',
        mockModalHandlers
      );

      handlers.leftDefenderCallback();

      expect(mockModalHandlers.openFieldPlayerModal).toHaveBeenCalledWith({
        type: 'player',
        target: 'leftDefender',
        playerName: 'Player 1',
        sourcePlayerId: '1',
        availablePlayers: [],
        showPositionOptions: false
      });
    });

    it('should open substitute modal for substitute_1 in 6-player mode', () => {
      const handlers = createFieldPositionHandlers(
        TEAM_MODES.INDIVIDUAL_6,
        mockFormation,
        mockPlayers,
        '1',
        mockModalHandlers
      );

      handlers.substitute_1Callback();

      expect(mockModalHandlers.openSubstituteModal).toHaveBeenCalledWith({
        playerId: '5',
        playerName: 'Player 5',
        isCurrentlyInactive: false,
        canSetAsNextToGoIn: false // 6-player mode doesn't support next-next indicators
      });
      expect(mockModalHandlers.openFieldPlayerModal).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle missing player data gracefully', () => {
      const playersWithMissingData = mockPlayers.slice(0, 5);
      
      const handlers = createFieldPositionHandlers(
        TEAM_MODES.INDIVIDUAL_7,
        mockFormation,
        playersWithMissingData,
        '1',
        mockModalHandlers
      );

      handlers.substitute_2Callback();

      expect(mockModalHandlers.openSubstituteModal).toHaveBeenCalledWith({
        playerId: '6',
        playerName: 'N/A',
        isCurrentlyInactive: false,
        canSetAsNextToGoIn: true
      });
    });

    it('should handle empty formation gracefully', () => {
      const handlers = createFieldPositionHandlers(
        TEAM_MODES.INDIVIDUAL_7,
        {},
        mockPlayers,
        '1',
        mockModalHandlers
      );

      handlers.leftDefenderCallback();

      expect(mockModalHandlers.openFieldPlayerModal).toHaveBeenCalledWith({
        type: 'player',
        target: 'leftDefender',
        playerName: 'N/A',
        sourcePlayerId: undefined,
        availablePlayers: [],
        showPositionOptions: false
      });
    });
  });

  describe('callback generation', () => {
    it('should generate callbacks for all positions in individual modes', () => {
      const handlers = createFieldPositionHandlers(
        TEAM_MODES.INDIVIDUAL_7,
        mockFormation,
        mockPlayers,
        '1',
        mockModalHandlers
      );

      const expectedCallbacks = [
        'leftDefenderCallback',
        'rightDefenderCallback', 
        'leftAttackerCallback',
        'rightAttackerCallback',
        'substitute_1Callback',
        'substitute_2Callback'
      ];

      expectedCallbacks.forEach(callback => {
        expect(handlers[callback]).toBeDefined();
        expect(typeof handlers[callback]).toBe('function');
      });
    });

    it('should only generate pair callbacks for pairs mode', () => {
      const handlers = createFieldPositionHandlers(
        TEAM_MODES.PAIRS_7,
        mockFormation,
        mockPlayers,
        '1',
        mockModalHandlers
      );

      expect(handlers.leftPairCallback).toBeDefined();
      expect(handlers.rightPairCallback).toBeDefined();
      expect(handlers.subPairCallback).toBeDefined();
      expect(handlers.leftDefenderCallback).toBeUndefined();
      expect(handlers.substitute_1Callback).toBeUndefined();
    });

    it('should generate callbacks for substitute_4 and substitute_5 in 9-player and 10-player modes', () => {
      // Test 9-player mode
      const handlers9 = createFieldPositionHandlers(
        TEAM_MODES.INDIVIDUAL_9,
        mockFormation,
        mockPlayers,
        '1',
        mockModalHandlers
      );

      const expectedCallbacks9 = [
        'leftDefenderCallback',
        'rightDefenderCallback', 
        'leftAttackerCallback',
        'rightAttackerCallback',
        'substitute_1Callback',
        'substitute_2Callback',
        'substitute_3Callback',
        'substitute_4Callback'
      ];

      expectedCallbacks9.forEach(callback => {
        expect(handlers9[callback]).toBeDefined();
        expect(typeof handlers9[callback]).toBe('function');
      });

      // Test 10-player mode
      const handlers10 = createFieldPositionHandlers(
        TEAM_MODES.INDIVIDUAL_10,
        mockFormation,
        mockPlayers,
        '1',
        mockModalHandlers
      );

      const expectedCallbacks10 = [
        'leftDefenderCallback',
        'rightDefenderCallback', 
        'leftAttackerCallback',
        'rightAttackerCallback',
        'substitute_1Callback',
        'substitute_2Callback',
        'substitute_3Callback',
        'substitute_4Callback',
        'substitute_5Callback'
      ];

      expectedCallbacks10.forEach(callback => {
        expect(handlers10[callback]).toBeDefined();
        expect(typeof handlers10[callback]).toBe('function');
      });
    });
  });
});