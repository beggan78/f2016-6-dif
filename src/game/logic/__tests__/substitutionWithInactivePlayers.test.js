/**
 * Tests for substitution logic with inactive players
 * Verifies that active players cascade correctly when inactive players are present
 */

import { calculateSubstitution } from '../gameStateLogic';
import { TEAM_MODES } from '../../../constants/playerConstants';
import { createMockGameState, createMockPlayers } from '../../testUtils';

describe('substitution with inactive players', () => {
  describe('8-player mode with inactive players', () => {
    test('should move field player to bottom-most active substitute position', () => {
      const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_8);
      
      // Create 8 players for 8-player mode
      const players = createMockPlayers(8, TEAM_MODES.INDIVIDUAL_8);
      gameState.allPlayers = players;
      
      // Set up formation: p1=leftDefender (next off), p5=sub_1, p6=sub_2, p7=sub_3 (inactive), p8=sub_4 (inactive)
      // Note: 8-player mode has only substitute_1, substitute_2, substitute_3 (3 substitute positions)
      gameState.formation.leftDefender = '1'; // Player going off
      gameState.formation.substitute_1 = '5';
      gameState.formation.substitute_2 = '6';
      gameState.formation.substitute_3 = '7';
      
      // Set next player to substitute out
      gameState.nextPlayerIdToSubOut = '1';
      
      // Make last two players inactive
      gameState.allPlayers = gameState.allPlayers.map(p => {
        if (p.id === '7') return { ...p, stats: { ...p.stats, isInactive: true, currentPairKey: 'substitute_3' } };
        if (p.id === '8') return { ...p, stats: { ...p.stats, isInactive: true, currentPairKey: 'substitute_3' } }; // Also inactive, but offside
        if (p.id === '1') return { ...p, stats: { ...p.stats, currentPairKey: 'leftDefender' } };
        if (p.id === '5') return { ...p, stats: { ...p.stats, currentPairKey: 'substitute_1' } };
        if (p.id === '6') return { ...p, stats: { ...p.stats, currentPairKey: 'substitute_2' } };
        return p;
      });
      
      const result = calculateSubstitution(gameState);
      
      // Expected behavior:
      // p5 (sub_1) → leftDefender
      // p6 (sub_2) → substitute_1  
      // p1 (leftDefender) → substitute_2 (bottom-most active position, since substitute_3 has inactive player)
      // p7, p8 stay inactive at substitute_3
      
      expect(result.formation.leftDefender).toBe('5'); // substitute_1 goes to field
      expect(result.formation.substitute_1).toBe('6'); // substitute_2 moves up
      expect(result.formation.substitute_2).toBe('1'); // field player goes to bottom active position
      expect(result.formation.substitute_3).toBe('7'); // inactive player stays
      
      // Verify player position tracking
      const player1 = result.allPlayers.find(p => p.id === '1');
      const player5 = result.allPlayers.find(p => p.id === '5');
      const player6 = result.allPlayers.find(p => p.id === '6');
      const player7 = result.allPlayers.find(p => p.id === '7');
      const player8 = result.allPlayers.find(p => p.id === '8');
      
      expect(player1.stats.currentPairKey).toBe('substitute_2');
      expect(player5.stats.currentPairKey).toBe('leftDefender');
      expect(player6.stats.currentPairKey).toBe('substitute_1');
      expect(player7.stats.currentPairKey).toBe('substitute_3');
      expect(player8.stats.currentPairKey).toBe('substitute_3');
      
      // Verify inactive status preserved
      expect(player7.stats.isInactive).toBe(true);
      expect(player8.stats.isInactive).toBe(true);
    });
    
    test('should handle all active substitutes case', () => {
      const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_8);
      
      // Create 8 players for 8-player mode
      const players = createMockPlayers(8, TEAM_MODES.INDIVIDUAL_8);
      gameState.allPlayers = players;
      
      // Set up formation with all active substitutes
      gameState.formation.leftDefender = '1'; // Player going off
      gameState.formation.substitute_1 = '5';
      gameState.formation.substitute_2 = '6';
      gameState.formation.substitute_3 = '7';
      
      gameState.nextPlayerIdToSubOut = '1';
      
      // All players active
      gameState.allPlayers = gameState.allPlayers.map(p => {
        if (p.id === '1') return { ...p, stats: { ...p.stats, currentPairKey: 'leftDefender' } };
        if (p.id === '5') return { ...p, stats: { ...p.stats, currentPairKey: 'substitute_1' } };
        if (p.id === '6') return { ...p, stats: { ...p.stats, currentPairKey: 'substitute_2' } };
        if (p.id === '7') return { ...p, stats: { ...p.stats, currentPairKey: 'substitute_3' } };
        return p;
      });
      
      const result = calculateSubstitution(gameState);
      
      // Should use normal carousel pattern when no inactive players
      expect(result.formation.leftDefender).toBe('5'); // substitute_1 goes to field
      expect(result.formation.substitute_3).toBe('1'); // field player goes to substitute_3 (normal 8-player carousel)
    });
  });
  
  describe('7-player mode with inactive players', () => {
    test('should cascade active substitutes correctly', () => {
      const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_7);
      
      // Set up: p1=leftDefender (next off), p5=sub_1, p6=sub_2 (inactive)
      gameState.formation.leftDefender = '1';
      gameState.formation.substitute_1 = '5';
      gameState.formation.substitute_2 = '6';
      
      gameState.nextPlayerIdToSubOut = '1';
      
      // Make substitute_2 inactive
      gameState.allPlayers = gameState.allPlayers.map(p => {
        if (p.id === '6') return { ...p, stats: { ...p.stats, isInactive: true, currentPairKey: 'substitute_2' } };
        if (p.id === '1') return { ...p, stats: { ...p.stats, currentPairKey: 'leftDefender' } };
        if (p.id === '5') return { ...p, stats: { ...p.stats, currentPairKey: 'substitute_1' } };
        return p;
      });
      
      const result = calculateSubstitution(gameState);
      
      // Expected: p5 → field, p1 → substitute_1 (only active position), p6 stays inactive
      expect(result.formation.leftDefender).toBe('5');
      expect(result.formation.substitute_1).toBe('1');
      expect(result.formation.substitute_2).toBe('6'); // Inactive player stays
      
      // Verify inactive status preserved
      const player6 = result.allPlayers.find(p => p.id === '6');
      expect(player6.stats.isInactive).toBe(true);
    });
  });
  
  describe('6-player mode', () => {
    test('should work correctly with single substitute', () => {
      const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_6);
      
      gameState.formation.leftDefender = '1';
      gameState.formation.substitute_1 = '5';
      
      gameState.nextPlayerIdToSubOut = '1';
      
      gameState.allPlayers = gameState.allPlayers.map(p => {
        if (p.id === '1') return { ...p, stats: { ...p.stats, currentPairKey: 'leftDefender' } };
        if (p.id === '5') return { ...p, stats: { ...p.stats, currentPairKey: 'substitute_1' } };
        return p;
      });
      
      const result = calculateSubstitution(gameState);
      
      // Simple swap in 6-player mode
      expect(result.formation.leftDefender).toBe('5');
      expect(result.formation.substitute_1).toBe('1');
    });
  });
  
  describe('rotation queue integrity', () => {
    test('should maintain all active players in rotation queue', () => {
      const gameState = createMockGameState(TEAM_MODES.INDIVIDUAL_8);
      
      // Create 8 players for 8-player mode
      const players = createMockPlayers(8, TEAM_MODES.INDIVIDUAL_8);
      gameState.allPlayers = players;
      
      // Set up with some inactive players
      gameState.formation.leftDefender = '1';
      gameState.formation.substitute_1 = '5';
      gameState.formation.substitute_2 = '6';
      gameState.formation.substitute_3 = '7';
      
      gameState.nextPlayerIdToSubOut = '1';
      gameState.rotationQueue = ['1', '2', '3', '4', '5', '6', '7']; // 7 active players (8th is inactive)
      
      // Make last player inactive
      gameState.allPlayers = gameState.allPlayers.map(p => {
        if (p.id === '8') return { ...p, stats: { ...p.stats, isInactive: true, currentPairKey: 'substitute_3' } };
        return p;
      });
      
      const result = calculateSubstitution(gameState);
      
      // Verify rotation queue contains all active players
      const activePlayerIds = result.allPlayers
        .filter(p => !p.stats.isInactive && p.id !== result.formation.goalie)
        .map(p => p.id);
      
      // All active players should be in rotation queue
      activePlayerIds.forEach(playerId => {
        expect(result.rotationQueue).toContain(playerId);
      });
      
      // Inactive players should not be in rotation queue
      const inactivePlayerIds = result.allPlayers
        .filter(p => p.stats.isInactive)
        .map(p => p.id);
      
      inactivePlayerIds.forEach(playerId => {
        expect(result.rotationQueue).not.toContain(playerId);
      });
    });
  });
});