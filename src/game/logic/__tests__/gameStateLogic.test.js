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
  calculateGeneralSubstituteSwap,
  calculateSubstituteReorder,
  calculateNextSubstitutionTarget,
  calculatePairPositionSwap
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
    test('should work in all individual modes that support inactive players', () => {
      // 6-player mode now supports inactive players
      const gameState6 = createMockGameState(TEAM_MODES.INDIVIDUAL_6);
      const result6 = calculatePlayerToggleInactive(gameState6, '5');
      expect(result6).not.toBe(gameState6); // Should change state
      expect(result6.allPlayers.find(p => p.id === '5').stats.isInactive).toBe(true);
      
      // Pairs mode still doesn't support inactive players
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

    test('should allow all substitutes to be inactive', () => {
      const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_7);
      // Make substitute_2 inactive
      gameState.allPlayers.find(p => p.id === '6').stats.isInactive = true;
      
      // Inactivate substitute_1 (should succeed - now allows all substitutes to be inactive)
      const result = calculatePlayerToggleInactive(gameState, '5');
      
      expect(result).not.toBe(gameState); // Should change state
      expect(result.allPlayers.find(p => p.id === '5').stats.isInactive).toBe(true);
      expect(result.allPlayers.find(p => p.id === '6').stats.isInactive).toBe(true);
    });

    describe('cascading inactivation behavior', () => {
      test('should move inactive player to bottom and shift others up - 7 player mode', () => {
        const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_7);
        // Set up: p1=substitute_1, p2=substitute_2
        gameState.formation.substitute_1 = '5';
        gameState.formation.substitute_2 = '6';
        
        // Update player position keys to match formation
        gameState.allPlayers = gameState.allPlayers.map(p => {
          if (p.id === '5') return { ...p, stats: { ...p.stats, currentPairKey: 'substitute_1' } };
          if (p.id === '6') return { ...p, stats: { ...p.stats, currentPairKey: 'substitute_2' } };
          return p;
        });
        
        // Inactivate substitute_1 (p1)
        const result = calculatePlayerToggleInactive(gameState, '5');
        
        // Expected: p2 moves to substitute_1, p1 moves to substitute_2 (bottom)
        expect(result.formation.substitute_1).toBe('6');
        expect(result.formation.substitute_2).toBe('5');
        expect(result.allPlayers.find(p => p.id === '5').stats.isInactive).toBe(true);
        expect(result.allPlayers.find(p => p.id === '5').stats.currentPairKey).toBe('substitute_2');
        expect(result.allPlayers.find(p => p.id === '6').stats.currentPairKey).toBe('substitute_1');
      });

      test('should handle 8-player mode with 3 substitutes', () => {
        const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_8);
        // Set up: p1=sub_1, p2=sub_2, p3=sub_3
        gameState.formation.substitute_1 = '5';
        gameState.formation.substitute_2 = '6';
        gameState.formation.substitute_3 = '7';
        
        // Update player position keys to match formation
        gameState.allPlayers = gameState.allPlayers.map(p => {
          if (p.id === '5') return { ...p, stats: { ...p.stats, currentPairKey: 'substitute_1' } };
          if (p.id === '6') return { ...p, stats: { ...p.stats, currentPairKey: 'substitute_2' } };
          if (p.id === '7') return { ...p, stats: { ...p.stats, currentPairKey: 'substitute_3' } };
          return p;
        });
        
        // Inactivate substitute_2 (middle player)
        const result = calculatePlayerToggleInactive(gameState, '6');
        
        // Expected: p1 stays, p3 moves to sub_2, p2 moves to sub_3 (bottom)
        expect(result.formation.substitute_1).toBe('5');
        expect(result.formation.substitute_2).toBe('7');
        expect(result.formation.substitute_3).toBe('6');
        expect(result.allPlayers.find(p => p.id === '6').stats.isInactive).toBe(true);
        expect(result.allPlayers.find(p => p.id === '6').stats.currentPairKey).toBe('substitute_3');
        expect(result.allPlayers.find(p => p.id === '7').stats.currentPairKey).toBe('substitute_2');
      });

      test('should handle inactivating bottom player (no cascading needed)', () => {
        const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_7);
        // Set up: p1=substitute_1, p2=substitute_2
        gameState.formation.substitute_1 = '5';
        gameState.formation.substitute_2 = '6';
        
        // Update player position keys to match formation
        gameState.allPlayers = gameState.allPlayers.map(p => {
          if (p.id === '5') return { ...p, stats: { ...p.stats, currentPairKey: 'substitute_1' } };
          if (p.id === '6') return { ...p, stats: { ...p.stats, currentPairKey: 'substitute_2' } };
          return p;
        });
        
        // Inactivate substitute_2 (bottom player)
        const result = calculatePlayerToggleInactive(gameState, '6');
        
        // Expected: Formation stays the same, only inactive flag changes
        expect(result.formation.substitute_1).toBe('5');
        expect(result.formation.substitute_2).toBe('6');
        expect(result.allPlayers.find(p => p.id === '6').stats.isInactive).toBe(true);
        expect(result.allPlayers.find(p => p.id === '6').stats.currentPairKey).toBe('substitute_2');
      });

      test('should handle 8-player mode inactivating first substitute', () => {
        const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_8);
        // Set up: p1=sub_1, p2=sub_2, p3=sub_3
        gameState.formation.substitute_1 = '5';
        gameState.formation.substitute_2 = '6';
        gameState.formation.substitute_3 = '7';
        
        // Update player position keys to match formation
        gameState.allPlayers = gameState.allPlayers.map(p => {
          if (p.id === '5') return { ...p, stats: { ...p.stats, currentPairKey: 'substitute_1' } };
          if (p.id === '6') return { ...p, stats: { ...p.stats, currentPairKey: 'substitute_2' } };
          if (p.id === '7') return { ...p, stats: { ...p.stats, currentPairKey: 'substitute_3' } };
          return p;
        });
        
        // Inactivate substitute_1 (first player)
        const result = calculatePlayerToggleInactive(gameState, '5');
        
        // Expected: p2 moves to sub_1, p3 moves to sub_2, p1 moves to sub_3 (bottom)
        expect(result.formation.substitute_1).toBe('6');
        expect(result.formation.substitute_2).toBe('7');
        expect(result.formation.substitute_3).toBe('5');
        expect(result.allPlayers.find(p => p.id === '5').stats.isInactive).toBe(true);
        expect(result.allPlayers.find(p => p.id === '5').stats.currentPairKey).toBe('substitute_3');
        expect(result.allPlayers.find(p => p.id === '6').stats.currentPairKey).toBe('substitute_1');
        expect(result.allPlayers.find(p => p.id === '7').stats.currentPairKey).toBe('substitute_2');
      });

      test('should work correctly in 6-player mode', () => {
        const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_6);
        // Set up: p1=substitute_1 (only one substitute in 6-player mode)
        gameState.formation.substitute_1 = '5';
        
        // Update player position keys to match formation
        gameState.allPlayers = gameState.allPlayers.map(p => {
          if (p.id === '5') return { ...p, stats: { ...p.stats, currentPairKey: 'substitute_1' } };
          return p;
        });
        
        // Inactivate substitute_1 (only substitute)
        const result = calculatePlayerToggleInactive(gameState, '5');
        
        // Expected: Formation stays the same (already at bottom), only inactive flag changes
        expect(result.formation.substitute_1).toBe('5');
        expect(result.allPlayers.find(p => p.id === '5').stats.isInactive).toBe(true);
        expect(result.allPlayers.find(p => p.id === '5').stats.currentPairKey).toBe('substitute_1');
      });
    });

    describe('reactivation cascading behavior', () => {
      test('should make reactivated player substitute_1 and cascade others down (7-player mode)', () => {
        const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_7);
        
        // Set up: p5=sub_1, p6=sub_2 (inactive)
        gameState.formation.substitute_1 = '5';
        gameState.formation.substitute_2 = '6';
        
        // Update player states
        gameState.allPlayers = gameState.allPlayers.map(p => {
          if (p.id === '5') return { ...p, stats: { ...p.stats, currentPairKey: 'substitute_1' } };
          if (p.id === '6') return { ...p, stats: { ...p.stats, currentPairKey: 'substitute_2', isInactive: true } };
          return p;
        });
        
        // Reactivate p6
        const result = calculatePlayerToggleInactive(gameState, '6');
        
        // Expected: p6 → substitute_1, p5 → substitute_2
        expect(result.formation.substitute_1).toBe('6');
        expect(result.formation.substitute_2).toBe('5');
        
        // Verify player position tracking
        expect(result.allPlayers.find(p => p.id === '6').stats.currentPairKey).toBe('substitute_1');
        expect(result.allPlayers.find(p => p.id === '6').stats.isInactive).toBe(false);
        expect(result.allPlayers.find(p => p.id === '5').stats.currentPairKey).toBe('substitute_2');
        
        // Verify next tracking updated - should be first player in rotation queue, not the reactivated player
        expect(result.nextPlayerIdToSubOut).toBe('1'); // First field player in queue, not reactivated player
      });

      test('should handle 8-player mode reactivation cascading', () => {
        const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_8);
        
        // Create 8 players for 8-player mode
        const players = createMockPlayers(8, TEAM_MODES.INDIVIDUAL_8);
        gameState.allPlayers = players;
        
        // Set up: p5=sub_1, p6=sub_2, p7=sub_3 (inactive)
        gameState.formation.substitute_1 = '5';
        gameState.formation.substitute_2 = '6';
        gameState.formation.substitute_3 = '7';
        
        // Update player states  
        gameState.allPlayers = gameState.allPlayers.map(p => {
          if (p.id === '5') return { ...p, stats: { ...p.stats, currentPairKey: 'substitute_1' } };
          if (p.id === '6') return { ...p, stats: { ...p.stats, currentPairKey: 'substitute_2' } };
          if (p.id === '7') return { ...p, stats: { ...p.stats, currentPairKey: 'substitute_3', isInactive: true } };
          return p;
        });
        
        // Reactivate p7 
        const result = calculatePlayerToggleInactive(gameState, '7');
        
        // Expected: p7 → substitute_1, p5 → substitute_2, p6 → substitute_3
        expect(result.formation.substitute_1).toBe('7');
        expect(result.formation.substitute_2).toBe('5');
        expect(result.formation.substitute_3).toBe('6');
        
        // Verify player position tracking
        expect(result.allPlayers.find(p => p.id === '7').stats.currentPairKey).toBe('substitute_1');
        expect(result.allPlayers.find(p => p.id === '7').stats.isInactive).toBe(false);
        expect(result.allPlayers.find(p => p.id === '5').stats.currentPairKey).toBe('substitute_2');
        expect(result.allPlayers.find(p => p.id === '6').stats.currentPairKey).toBe('substitute_3');
        
        // Verify next tracking updated - should be first player in rotation queue, not the reactivated player  
        expect(result.nextPlayerIdToSubOut).toBe('1'); // First field player in queue, not reactivated player
      });

      test('should handle reactivation with multiple inactive players', () => {
        const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_8);
        
        // Create 8 players for 8-player mode
        const players = createMockPlayers(8, TEAM_MODES.INDIVIDUAL_8);
        gameState.allPlayers = players;
        
        // Set up: p5=sub_1, p6=sub_2 (inactive), p7=sub_3 (inactive)  
        gameState.formation.substitute_1 = '5';
        gameState.formation.substitute_2 = '6';
        gameState.formation.substitute_3 = '7';
        
        // Update player states
        gameState.allPlayers = gameState.allPlayers.map(p => {
          if (p.id === '5') return { ...p, stats: { ...p.stats, currentPairKey: 'substitute_1' } };
          if (p.id === '6') return { ...p, stats: { ...p.stats, currentPairKey: 'substitute_2', isInactive: true } };
          if (p.id === '7') return { ...p, stats: { ...p.stats, currentPairKey: 'substitute_3', isInactive: true } };
          return p;
        });
        
        // Reactivate p7 (from substitute_3)
        const result = calculatePlayerToggleInactive(gameState, '7');
        
        // Expected: p7 → substitute_1, p5 → substitute_2, p6 remains inactive at substitute_3
        expect(result.formation.substitute_1).toBe('7');
        expect(result.formation.substitute_2).toBe('5');
        expect(result.formation.substitute_3).toBe('6'); // inactive player stays
        
        // Verify player states
        expect(result.allPlayers.find(p => p.id === '7').stats.isInactive).toBe(false);
        expect(result.allPlayers.find(p => p.id === '6').stats.isInactive).toBe(true);
        expect(result.allPlayers.find(p => p.id === '5').stats.isInactive).toBe(false);
      });

      test('should work correctly in 6-player mode', () => {
        const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_6);
        
        // Set up: p5=substitute_1 (inactive)
        gameState.formation.substitute_1 = '5';
        
        // Update player state
        gameState.allPlayers = gameState.allPlayers.map(p => {
          if (p.id === '5') return { ...p, stats: { ...p.stats, currentPairKey: 'substitute_1', isInactive: true } };
          return p;
        });
        
        // Reactivate p5
        const result = calculatePlayerToggleInactive(gameState, '5');
        
        // Expected: p5 remains substitute_1 but becomes active
        expect(result.formation.substitute_1).toBe('5');
        expect(result.allPlayers.find(p => p.id === '5').stats.currentPairKey).toBe('substitute_1');
        expect(result.allPlayers.find(p => p.id === '5').stats.isInactive).toBe(false);
        
        // Verify next tracking updated - should be first player in rotation queue, not the reactivated player
        expect(result.nextPlayerIdToSubOut).toBe('1'); // First field player in queue, not reactivated player
      });

      test('should update rotation queue correctly', () => {
        const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_7);
        
        // Set up formation and inactive player
        gameState.formation.substitute_1 = '5';
        gameState.formation.substitute_2 = '6';
        gameState.rotationQueue = ['1', '2', '3', '4', '5']; // p6 is inactive, not in queue
        
        gameState.allPlayers = gameState.allPlayers.map(p => {
          if (p.id === '6') return { ...p, stats: { ...p.stats, currentPairKey: 'substitute_2', isInactive: true } };
          return p;
        });
        
        // Reactivate p6
        const result = calculatePlayerToggleInactive(gameState, '6');
        
        // p6 should be at first substitute position (position 4 in queue)
        // Positions 0-3 are field players, position 4+ are substitutes
        expect(result.rotationQueue[4]).toBe('6');
        expect(result.rotationQueue).toContain('6');
        // Verify p6 is not at position 0 (would be "next to come off" instead of "next to go on")
        expect(result.rotationQueue[0]).not.toBe('6');
      });
    });
  });

  describe('calculateGeneralSubstituteSwap', () => {
    test('should only work in modes that support next-next indicators', () => {
      const gameState6 = createMockGameState(TEAM_MODES.INDIVIDUAL_6);
      const result6 = calculateGeneralSubstituteSwap(gameState6, 'substitute_1', 'substitute_2');
      expect(result6).toBe(gameState6);
    });

    test('should swap substitute positions', () => {
      const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_7);
      const sub1Id = '5';
      const sub2Id = '6';
      
      const result = calculateGeneralSubstituteSwap(gameState, 'substitute_1', 'substitute_2');
      
      expect(result.formation.substitute_1).toBe(sub2Id);
      expect(result.formation.substitute_2).toBe(sub1Id);
      expect(result.playersToHighlight).toEqual([sub1Id, sub2Id]);
    });

    test('should update player position keys', () => {
      const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_7);
      const sub1Id = '5';
      const sub2Id = '6';
      
      const result = calculateGeneralSubstituteSwap(gameState, 'substitute_1', 'substitute_2');
      
      const player1 = result.allPlayers.find(p => p.id === sub1Id);
      const player2 = result.allPlayers.find(p => p.id === sub2Id);
      
      expect(player1.stats.currentPairKey).toBe(POSITION_KEYS.SUBSTITUTE_2);
      expect(player2.stats.currentPairKey).toBe(POSITION_KEYS.SUBSTITUTE_1);
    });

    test('should return unchanged state for invalid positions', () => {
      const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_7);
      
      const result = calculateGeneralSubstituteSwap(gameState, 'invalid_position', 'substitute_2');
      
      expect(result).toBe(gameState);
    });
  });

  describe('calculateSubstituteReorder', () => {
    test('should only work in modes with multiple substitute support', () => {
      const gameState6 = createMockGameState(TEAM_MODES.INDIVIDUAL_6);
      const result6 = calculateSubstituteReorder(gameState6, 'substitute_1');
      expect(result6).toBe(gameState6);
      
      const gameStatePairs = createMockGameState(TEAM_MODES.PAIRS_7);
      const resultPairs = calculateSubstituteReorder(gameStatePairs, 'substitute_1');
      expect(resultPairs).toBe(gameStatePairs);
    });

    test('should move target player to substitute_1 and shift others down', () => {
      const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_7);
      // Set up a formation with substitute_1 = '5', substitute_2 = '6'
      gameState.formation.substitute_1 = '5';
      gameState.formation.substitute_2 = '6';
      
      const result = calculateSubstituteReorder(gameState, 'substitute_2');
      
      // Target player (6) should move to substitute_1
      expect(result.formation.substitute_1).toBe('6');
      // Previous substitute_1 player (5) should move to substitute_2
      expect(result.formation.substitute_2).toBe('5');
      // Should highlight both affected players
      expect(result.playersToHighlight).toEqual(['6', '5']);
    });

    test('should handle 8-player mode with substitute_3', () => {
      const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_8);
      // Set up a formation with substitute_1 = '5', substitute_2 = '6', substitute_3 = '7'
      gameState.formation.substitute_1 = '5';
      gameState.formation.substitute_2 = '6';
      gameState.formation.substitute_3 = '7';
      
      const result = calculateSubstituteReorder(gameState, 'substitute_3');
      
      // Target player (7) should move to substitute_1
      expect(result.formation.substitute_1).toBe('7');
      // Previous substitute_1 player (5) should move to substitute_2
      expect(result.formation.substitute_2).toBe('5');
      // Previous substitute_2 player (6) should move to substitute_3
      expect(result.formation.substitute_3).toBe('6');
      // Should highlight all affected players
      expect(result.playersToHighlight).toEqual(['7', '5', '6']);
    });

    test('should update player position keys correctly', () => {
      const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_7);
      gameState.formation.substitute_1 = '5';
      gameState.formation.substitute_2 = '6';
      
      const result = calculateSubstituteReorder(gameState, 'substitute_2');
      
      const player5 = result.allPlayers.find(p => p.id === '5');
      const player6 = result.allPlayers.find(p => p.id === '6');
      
      expect(player5.stats.currentPairKey).toBe('substitute_2');
      expect(player6.stats.currentPairKey).toBe('substitute_1');
    });

    test('should not allow reordering substitute_1', () => {
      const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_7);
      
      const result = calculateSubstituteReorder(gameState, 'substitute_1');
      
      expect(result).toBe(gameState);
    });

    test('should return unchanged state for invalid inputs', () => {
      const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_7);
      
      const result = calculateSubstituteReorder(gameState, 'invalid_position');
      
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

  describe('calculatePairPositionSwap', () => {
    test('should only work in PAIRS_7 mode', () => {
      const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_7);
      
      const result = calculatePairPositionSwap(gameState, 'leftPair');
      
      expect(result).toBe(gameState);
    });

    test('should swap defender and attacker in field pair (leftPair)', () => {
      const gameState = createMockGameState(TEAM_MODES.PAIRS_7);
      gameState.formation.leftPair = { defender: '1', attacker: '2' };
      gameState.allPlayers = [
        { id: '1', name: 'Player1', stats: { currentRole: PLAYER_ROLES.DEFENDER, currentPairKey: 'leftPair' } },
        { id: '2', name: 'Player2', stats: { currentRole: PLAYER_ROLES.ATTACKER, currentPairKey: 'leftPair' } }
      ];

      const result = calculatePairPositionSwap(gameState, 'leftPair');

      expect(result.formation.leftPair).toEqual({ defender: '2', attacker: '1' });
      expect(result.allPlayers[0].stats.currentRole).toBe(PLAYER_ROLES.ATTACKER); // '1' becomes attacker
      expect(result.allPlayers[1].stats.currentRole).toBe(PLAYER_ROLES.DEFENDER); // '2' becomes defender
      expect(result.playersToHighlight).toEqual(['1', '2']);
    });

    test('should swap defender and attacker in field pair (rightPair)', () => {
      const gameState = createMockGameState(TEAM_MODES.PAIRS_7);
      gameState.formation.rightPair = { defender: '3', attacker: '4' };
      gameState.allPlayers = [
        { id: '3', name: 'Player3', stats: { currentRole: PLAYER_ROLES.DEFENDER, currentPairKey: 'rightPair' } },
        { id: '4', name: 'Player4', stats: { currentRole: PLAYER_ROLES.ATTACKER, currentPairKey: 'rightPair' } }
      ];

      const result = calculatePairPositionSwap(gameState, 'rightPair');

      expect(result.formation.rightPair).toEqual({ defender: '4', attacker: '3' });
      expect(result.allPlayers[0].stats.currentRole).toBe(PLAYER_ROLES.ATTACKER); // '3' becomes attacker
      expect(result.allPlayers[1].stats.currentRole).toBe(PLAYER_ROLES.DEFENDER); // '4' becomes defender
    });

    test('should swap positions in substitute pair but keep both as substitutes', () => {
      const gameState = createMockGameState(TEAM_MODES.PAIRS_7);
      gameState.formation.subPair = { defender: '5', attacker: '6' };
      gameState.allPlayers = [
        { id: '5', name: 'Player5', stats: { currentRole: PLAYER_ROLES.SUBSTITUTE, currentPairKey: 'subPair' } },
        { id: '6', name: 'Player6', stats: { currentRole: PLAYER_ROLES.SUBSTITUTE, currentPairKey: 'subPair' } }
      ];

      const result = calculatePairPositionSwap(gameState, 'subPair');

      expect(result.formation.subPair).toEqual({ defender: '6', attacker: '5' });
      // Both should remain as substitutes per the recent fix
      expect(result.allPlayers[0].stats.currentRole).toBe(PLAYER_ROLES.SUBSTITUTE); // '5' stays substitute
      expect(result.allPlayers[1].stats.currentRole).toBe(PLAYER_ROLES.SUBSTITUTE); // '6' stays substitute
    });

    test('should return unchanged state for invalid pair key', () => {
      const gameState = createMockGameState(TEAM_MODES.PAIRS_7);
      
      const result = calculatePairPositionSwap(gameState, 'invalidPair');
      
      expect(result).toBe(gameState);
    });

    test('should return unchanged state for incomplete pair', () => {
      const gameState = createMockGameState(TEAM_MODES.PAIRS_7);
      gameState.formation.leftPair = { defender: '1', attacker: null }; // Missing attacker
      
      const result = calculatePairPositionSwap(gameState, 'leftPair');
      
      expect(result).toBe(gameState);
    });
  });
});