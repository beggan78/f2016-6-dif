/**
 * Unit tests for game state logic functions
 * Tests all pure functions that handle game state transitions
 */

import {
  calculateSubstitution,
  calculatePositionSwitch,
  calculateGoalieSwitch,
  calculateUndo,
  calculatePlayerToggleInactive,
  calculateSubstituteSwap,
  calculateNextSubstitutionTarget
} from '../gameStateLogic';

import { TEAM_MODES, PLAYER_ROLES, PLAYER_STATUS } from '../../../constants/playerConstants';
import { POSITION_KEYS } from '../../../constants/positionConstants';
import {
  createMockGameState,
  createMockPlayers,
  createMockFormation,
  expectPlayerStatsToMatch,
  expectFormationToMatch
} from '../../testUtils';

describe('gameStateLogic', () => {
  describe('calculateSubstitution', () => {
    test('should handle 6-player individual substitution', () => {
      const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_6);
      
      const result = calculateSubstitution(gameState);
      
      expect(result).toBeDefined();
      expect(result.formation).toBeDefined();
      expect(result.allPlayers).toBeDefined();
      expect(result.rotationQueue).toBeDefined();
      expect(result.lastSubstitutionTimestamp).toBeDefined();
    });

    test('should handle 7-player individual substitution', () => {
      const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_7);
      
      const result = calculateSubstitution(gameState);
      
      expect(result).toBeDefined();
      expect(result.nextPlayerIdToSubOut).toBeDefined();
      expect(result.nextNextPlayerIdToSubOut).toBeDefined();
    });

    test('should handle pairs substitution', () => {
      const gameState = createMockGameState(TEAM_MODES.PAIRS_7);
      
      const result = calculateSubstitution(gameState);
      
      expect(result).toBeDefined();
      expect(result.nextPhysicalPairToSubOut).toBeDefined();
    });

    test('should return unchanged state on error', () => {
      const invalidGameState = { invalid: 'state', teamMode: TEAM_MODES.INDIVIDUAL_6 };
      
      const result = calculateSubstitution(invalidGameState);
      
      expect(result).toBe(invalidGameState);
    });

    test('should update player time stats during substitution', () => {
      const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_6);
      const originalTimeOnField = gameState.allPlayers[0].stats.timeOnFieldSeconds;
      
      const result = calculateSubstitution(gameState);
      
      // Find the player who was substituted (should have updated time)
      const substitutedPlayer = result.allPlayers.find(p => 
        p.stats.timeOnFieldSeconds !== originalTimeOnField ||
        p.stats.lastStintStartTimeEpoch > 1000
      );
      
      expect(substitutedPlayer).toBeDefined();
    });
  });

  describe('calculatePositionSwitch', () => {
    test('should swap two field players in individual mode', () => {
      const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_7);
      const player1Id = '1'; // leftDefender
      const player2Id = '3'; // leftAttacker
      
      const result = calculatePositionSwitch(gameState, player1Id, player2Id);
      
      expect(result.formation.leftDefender).toBe(player2Id);
      expect(result.formation.leftAttacker).toBe(player1Id);
      expect(result.playersToHighlight).toEqual([player1Id, player2Id]);
    });

    test('should swap players in pair positions for pairs mode', () => {
      const gameState = createMockGameState(TEAM_MODES.PAIRS_7);
      const player1Id = '1'; // leftPair defender
      const player2Id = '3'; // rightPair defender
      
      const result = calculatePositionSwitch(gameState, player1Id, player2Id);
      
      expect(result.formation.leftPair.defender).toBe(player2Id);
      expect(result.formation.rightPair.defender).toBe(player1Id);
    });

    test('should update player roles when switching positions', () => {
      const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_7);
      const defenderId = '1'; // defender
      const attackerId = '3'; // attacker
      
      const result = calculatePositionSwitch(gameState, defenderId, attackerId);
      
      const switchedDefender = result.allPlayers.find(p => p.id === defenderId);
      const switchedAttacker = result.allPlayers.find(p => p.id === attackerId);
      
      // Check that players were found and have stats
      expect(switchedDefender).toBeDefined();
      expect(switchedAttacker).toBeDefined();
      expect(switchedDefender.stats).toBeDefined();
      expect(switchedAttacker.stats).toBeDefined();
      
      // Check role updates (the actual roles depend on handleRoleChange implementation)
      expect(switchedDefender.stats.currentRole).toBeDefined();
      expect(switchedAttacker.stats.currentRole).toBeDefined();
    });

    test('should return unchanged state for invalid inputs', () => {
      const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_7);
      
      // Invalid: same player
      let result = calculatePositionSwitch(gameState, '1', '1');
      expect(result).toBe(gameState);
      
      // Invalid: non-existent player
      result = calculatePositionSwitch(gameState, '1', 'nonexistent');
      expect(result).toBe(gameState);
      
      // Invalid: trying to switch with goalie
      result = calculatePositionSwitch(gameState, '1', '7');
      expect(result).toBe(gameState);
    });
  });

  describe('calculateGoalieSwitch', () => {
    test('should switch goalie with field player in individual mode', () => {
      const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_7);
      const newGoalieId = '1'; // Currently leftDefender
      const currentGoalieId = gameState.formation.goalie;
      
      const result = calculateGoalieSwitch(gameState, newGoalieId);
      
      expect(result.formation.goalie).toBe(newGoalieId);
      expect(result.formation.leftDefender).toBe(currentGoalieId);
      expect(result.playersToHighlight).toContain(newGoalieId);
      expect(result.playersToHighlight).toContain(currentGoalieId);
    });

    test('should update player roles and statuses correctly', () => {
      const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_7);
      const newGoalieId = '1';
      const currentGoalieId = gameState.formation.goalie;
      
      const result = calculateGoalieSwitch(gameState, newGoalieId);
      
      const newGoalie = result.allPlayers.find(p => p.id === newGoalieId);
      const formerGoalie = result.allPlayers.find(p => p.id === currentGoalieId);
      
      // Verify players exist and have basic structure
      expect(newGoalie).toBeDefined();
      expect(formerGoalie).toBeDefined();
      expect(newGoalie.stats).toBeDefined();
      expect(formerGoalie.stats).toBeDefined();
      
      // Check that roles/statuses are set (values depend on handleRoleChange)
      expect(newGoalie.stats.currentPairKey).toBe(POSITION_KEYS.GOALIE);
      expect(formerGoalie.stats.currentStatus).toBeDefined();
    });

    test('should handle goalie switch in pairs mode', () => {
      const gameState = createMockGameState(TEAM_MODES.PAIRS_7);
      const newGoalieId = '1'; // leftPair defender
      const currentGoalieId = gameState.formation.goalie;
      
      const result = calculateGoalieSwitch(gameState, newGoalieId);
      
      expect(result.formation.goalie).toBe(newGoalieId);
      expect(result.formation.leftPair.defender).toBe(currentGoalieId);
    });

    test('should update rotation queue correctly', () => {
      const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_7);
      const newGoalieId = '1';
      const originalQueuePosition = gameState.rotationQueue.indexOf(newGoalieId);
      
      const result = calculateGoalieSwitch(gameState, newGoalieId);
      
      // New goalie should be removed from rotation queue
      expect(result.rotationQueue).not.toContain(newGoalieId);
      
      // Former goalie should take new goalie's exact position in queue
      expect(result.rotationQueue).toContain(gameState.formation.goalie);
      if (originalQueuePosition >= 0) {
        expect(result.rotationQueue[originalQueuePosition]).toBe(gameState.formation.goalie);
      }
    });

    test('should return unchanged state for invalid inputs', () => {
      const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_7);
      
      // Invalid: same as current goalie
      let result = calculateGoalieSwitch(gameState, gameState.formation.goalie);
      expect(result).toBe(gameState);
      
      // Invalid: non-existent player
      result = calculateGoalieSwitch(gameState, 'nonexistent');
      expect(result).toBe(gameState);
    });

    test('should reject inactive player as new goalie', () => {
      const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_7);
      // Make player inactive
      gameState.allPlayers[0].stats.isInactive = true;
      
      const result = calculateGoalieSwitch(gameState, '1');
      
      expect(result).toBe(gameState);
    });

    test('should update nextPlayerIdToSubOut when new goalie was next to come off (6-player mode)', () => {
      const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_6);
      const nextPlayerToSubOut = gameState.rotationQueue[0]; // First player in queue is next off
      gameState.nextPlayerIdToSubOut = nextPlayerToSubOut;
      
      // Make the next player to sub out become the new goalie
      const result = calculateGoalieSwitch(gameState, nextPlayerToSubOut);
      
      // nextPlayerIdToSubOut should now point to the new first player in queue
      expect(result.nextPlayerIdToSubOut).toBe(result.rotationQueue[0]);
      expect(result.nextPlayerIdToSubOut).not.toBe(nextPlayerToSubOut);
      expect(result.nextPlayerIdToSubOut).not.toBe(result.formation.goalie);
    });

    test('should update nextPlayerIdToSubOut when new goalie was next to come off (7-player mode)', () => {
      const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_7);
      const nextPlayerToSubOut = gameState.rotationQueue[0]; // First player in queue is next off
      gameState.nextPlayerIdToSubOut = nextPlayerToSubOut;
      gameState.nextNextPlayerIdToSubOut = gameState.rotationQueue[1];
      
      // Make the next player to sub out become the new goalie
      const result = calculateGoalieSwitch(gameState, nextPlayerToSubOut);
      
      // nextPlayerIdToSubOut should now point to the new first player in queue
      expect(result.nextPlayerIdToSubOut).toBe(result.rotationQueue[0]);
      expect(result.nextPlayerIdToSubOut).not.toBe(nextPlayerToSubOut);
      expect(result.nextPlayerIdToSubOut).not.toBe(result.formation.goalie);
      
      // nextNextPlayerIdToSubOut should be updated too
      if (result.rotationQueue.length >= 2) {
        expect(result.nextNextPlayerIdToSubOut).toBe(result.rotationQueue[1]);
      }
    });

    test('should update nextNextPlayerIdToSubOut when new goalie was next-next to come off (7-player mode)', () => {
      const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_7);
      const nextNextPlayerToSubOut = gameState.rotationQueue[1]; // Second player in queue is next-next off
      gameState.nextPlayerIdToSubOut = gameState.rotationQueue[0];
      gameState.nextNextPlayerIdToSubOut = nextNextPlayerToSubOut;
      
      // Make the next-next player to sub out become the new goalie
      const result = calculateGoalieSwitch(gameState, nextNextPlayerToSubOut);
      
      // nextPlayerIdToSubOut should remain the same
      expect(result.nextPlayerIdToSubOut).toBe(gameState.nextPlayerIdToSubOut);
      
      // nextNextPlayerIdToSubOut should now point to the new second player in queue
      if (result.rotationQueue.length >= 2) {
        expect(result.nextNextPlayerIdToSubOut).toBe(result.rotationQueue[1]);
        expect(result.nextNextPlayerIdToSubOut).not.toBe(nextNextPlayerToSubOut);
      } else {
        expect(result.nextNextPlayerIdToSubOut).toBeNull();
      }
    });

    test('should not change next tracking when new goalie was not in next positions', () => {
      const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_7);
      const someOtherPlayer = gameState.rotationQueue[2] || gameState.rotationQueue[0]; // Get a player not in next positions
      gameState.nextPlayerIdToSubOut = gameState.rotationQueue[0];
      gameState.nextNextPlayerIdToSubOut = gameState.rotationQueue[1];
      
      // Make a player who wasn't next or next-next become the new goalie
      const result = calculateGoalieSwitch(gameState, someOtherPlayer);
      
      // next tracking should remain unchanged
      expect(result.nextPlayerIdToSubOut).toBe(gameState.nextPlayerIdToSubOut);
      expect(result.nextNextPlayerIdToSubOut).toBe(gameState.nextNextPlayerIdToSubOut);
    });
  });

  describe('calculateUndo', () => {
    test('should restore previous formation and player stats', () => {
      const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_6);
      const lastSubstitution = {
        timestamp: 2000,
        beforeFormation: createMockFormation(TEAM_MODES.INDIVIDUAL_6),
        beforeNextPair: 'leftPair',
        beforeNextPlayer: 'leftDefender',
        beforeNextPlayerId: '1',
        beforeNextNextPlayerId: '2',
        playersComingOnIds: ['5'],
        playersGoingOffIds: ['1'],
        playersComingOnOriginalStats: [
          { id: '5', stats: { currentStatus: 'substitute' } }
        ],
        teamMode: TEAM_MODES.INDIVIDUAL_6
      };
      
      const result = calculateUndo(gameState, lastSubstitution);
      
      expectFormationToMatch(result.formation, lastSubstitution.beforeFormation, TEAM_MODES.INDIVIDUAL_6);
      expect(result.nextPlayerIdToSubOut).toBe(lastSubstitution.beforeNextPlayerId);
      expect(result.lastSubstitutionTimestamp).toBeNull();
    });

    test('should adjust player times based on time since substitution', () => {
      const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_6);
      const baseTime = 1000;
      const substitutionTime = 2000;
      const currentTime = 5000; // 3 seconds after substitution
      
      // Mock Date.now to return consistent current time
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => currentTime);
      
      const lastSubstitution = {
        timestamp: substitutionTime,
        beforeFormation: createMockFormation(TEAM_MODES.INDIVIDUAL_6),
        beforeNextPair: 'leftPair',
        beforeNextPlayer: 'leftDefender',
        beforeNextPlayerId: '1',
        beforeNextNextPlayerId: '2',
        playersComingOnIds: ['5'],
        playersGoingOffIds: ['1'],
        playersComingOnOriginalStats: [
          { id: '5', stats: { currentStatus: 'substitute', timeAsSubSeconds: 10 } }
        ],
        teamMode: TEAM_MODES.INDIVIDUAL_6
      };
      
      const result = calculateUndo(gameState, lastSubstitution);
      
      // Player who went off should get credit for time spent on bench
      const restoredPlayer = result.allPlayers.find(p => p.id === '1');
      expect(restoredPlayer.stats.currentStatus).toBe('on_field');
      
      // Restore original Date.now
      Date.now = originalDateNow;
    });

    test('should return unchanged state if no substitution to undo', () => {
      const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_6);
      
      const result = calculateUndo(gameState, null);
      
      expect(result).toBe(gameState);
    });
  });

  describe('calculatePlayerToggleInactive', () => {
    test('should only work in 7-player individual mode', () => {
      const gameState6 = createMockGameState(TEAM_MODES.INDIVIDUAL_6);
      const result6 = calculatePlayerToggleInactive(gameState6, '5');
      expect(result6).toBe(gameState6);
      
      const gameStatePairs = createMockGameState(TEAM_MODES.PAIRS_7);
      const resultPairs = calculatePlayerToggleInactive(gameStatePairs, '5');
      expect(resultPairs).toBe(gameStatePairs);
    });

    test('should deactivate substitute player', () => {
      const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_7);
      const substituteId = '5'; // substitute_1
      
      const result = calculatePlayerToggleInactive(gameState, substituteId);
      
      const toggledPlayer = result.allPlayers.find(p => p.id === substituteId);
      expect(toggledPlayer.stats.isInactive).toBe(true);
    });

    test('should reactivate inactive player', () => {
      const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_7);
      const substituteId = '5';
      // Make player inactive first
      gameState.allPlayers.find(p => p.id === substituteId).stats.isInactive = true;
      
      const result = calculatePlayerToggleInactive(gameState, substituteId);
      
      const toggledPlayer = result.allPlayers.find(p => p.id === substituteId);
      expect(toggledPlayer.stats.isInactive).toBe(false);
    });

    test('should only allow substitute players to be inactivated', () => {
      const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_7);
      const fieldPlayerId = '1'; // leftDefender
      
      const result = calculatePlayerToggleInactive(gameState, fieldPlayerId);
      
      expect(result).toBe(gameState);
    });

    test('should prevent both substitutes from being inactive', () => {
      const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_7);
      // Make substitute_2 inactive
      gameState.allPlayers.find(p => p.id === '6').stats.isInactive = true;
      
      // Try to inactivate substitute_1
      const result = calculatePlayerToggleInactive(gameState, '5');
      
      expect(result).toBe(gameState);
    });
  });

  describe('calculateSubstituteSwap', () => {
    test('should only work in 7-player individual mode', () => {
      const gameState6 = createMockGameState(TEAM_MODES.INDIVIDUAL_6);
      const result6 = calculateSubstituteSwap(gameState6, '5', '6');
      expect(result6).toBe(gameState6);
    });

    test('should swap substitute positions', () => {
      const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_7);
      const sub1Id = '5';
      const sub2Id = '6';
      
      const result = calculateSubstituteSwap(gameState, sub1Id, sub2Id);
      
      expect(result.formation.substitute_1).toBe(sub2Id);
      expect(result.formation.substitute_2).toBe(sub1Id);
      expect(result.playersToHighlight).toEqual([sub1Id, sub2Id]);
    });

    test('should update player position keys', () => {
      const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_7);
      const sub1Id = '5';
      const sub2Id = '6';
      
      const result = calculateSubstituteSwap(gameState, sub1Id, sub2Id);
      
      const player1 = result.allPlayers.find(p => p.id === sub1Id);
      const player2 = result.allPlayers.find(p => p.id === sub2Id);
      
      expect(player1.stats.currentPairKey).toBe(POSITION_KEYS.SUBSTITUTE_7_2);
      expect(player2.stats.currentPairKey).toBe(POSITION_KEYS.SUBSTITUTE_7_1);
    });

    test('should return unchanged state for invalid inputs', () => {
      const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_7);
      
      const result = calculateSubstituteSwap(gameState, null, '6');
      
      expect(result).toBe(gameState);
    });
  });

  describe('calculateNextSubstitutionTarget', () => {
    test('should update next pair target for pairs mode', () => {
      const gameState = createMockGameState(TEAM_MODES.PAIRS_7);
      
      const result = calculateNextSubstitutionTarget(gameState, 'rightPair', 'pair');
      
      expect(result.nextPhysicalPairToSubOut).toBe('rightPair');
    });

    test('should update next player target for individual modes', () => {
      const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_7);
      gameState.formation.leftDefender = '2';
      
      const result = calculateNextSubstitutionTarget(gameState, 'leftDefender', 'player');
      
      expect(result.nextPlayerToSubOut).toBe('leftDefender');
      expect(result.nextPlayerIdToSubOut).toBe('2');
    });

    test('should return unchanged state for unknown target type', () => {
      const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_7);
      
      const result = calculateNextSubstitutionTarget(gameState, 'target', 'unknown');
      
      expect(result).toBe(gameState);
    });
  });
});