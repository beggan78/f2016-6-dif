/**
 * Goalie Queue Position Fix Integration Tests
 * 
 * Verifies that when a goalie is replaced, the former goalie takes the
 * new goalie's exact position in the rotation queue instead of going
 * to the end. This ensures fair rotation for all players.
 */

import { calculateGoalieSwitch } from '../../game/logic/gameStateLogic';
import { gameStateScenarios } from '../fixtures/mockGameData';
import { TEAM_MODES } from '../../constants/playerConstants';

describe('Goalie Queue Position Fix Integration Tests', () => {
  
  it('should preserve queue position across team modes', () => {
    const teamModes = [TEAM_MODES.INDIVIDUAL_6, TEAM_MODES.INDIVIDUAL_7, TEAM_MODES.PAIRS_7];
    
    teamModes.forEach(teamMode => {
      console.log(`Testing ${teamMode} queue position preservation`);
      
      const gameState = gameStateScenarios.freshGame(teamMode);
      const currentGoalieId = gameState.formation.goalie;
      
      // Find a suitable replacement goalie that's in the rotation queue
      let newGoalieId;
      let originalQueuePosition = -1;
      
      // Try to find a player in the queue to switch with
      for (const playerId of gameState.rotationQueue) {
        if (playerId !== currentGoalieId) {
          newGoalieId = playerId;
          originalQueuePosition = gameState.rotationQueue.indexOf(playerId);
          break;
        }
      }
      
      // If no player found in queue, use a field player
      if (!newGoalieId) {
        if (teamMode === TEAM_MODES.PAIRS_7) {
          newGoalieId = gameState.formation.leftPair.defender;
        } else if (teamMode === TEAM_MODES.INDIVIDUAL_6) {
          newGoalieId = gameState.formation.leftDefender;
        } else {
          newGoalieId = gameState.formation.leftDefender;
        }
        originalQueuePosition = gameState.rotationQueue.indexOf(newGoalieId);
      }
      
      console.log(`${teamMode}: Switching goalie ${currentGoalieId} with ${newGoalieId} (queue pos: ${originalQueuePosition})`);
      
      // Perform goalie switch
      const resultState = calculateGoalieSwitch(gameState, newGoalieId);
      
      // Verify new goalie is removed from queue
      expect(resultState.rotationQueue).not.toContain(newGoalieId);
      
      // Verify former goalie is in the queue
      expect(resultState.rotationQueue).toContain(currentGoalieId);
      
      // Key test: former goalie should be at new goalie's original position
      if (originalQueuePosition >= 0) {
        expect(resultState.rotationQueue[originalQueuePosition]).toBe(currentGoalieId);
        console.log(`${teamMode}: ✅ Former goalie correctly placed at position ${originalQueuePosition}`);
      } else {
        // If new goalie wasn't in queue, former goalie should be at end
        expect(resultState.rotationQueue[resultState.rotationQueue.length - 1]).toBe(currentGoalieId);
        console.log(`${teamMode}: ✅ Former goalie added to end (new goalie wasn't in queue)`);
      }
      
      // Verify queue length is preserved (same number of players)
      expect(resultState.rotationQueue.length).toBe(gameState.rotationQueue.length);
    });
  });
  
  it('should handle edge case where new goalie is not in rotation queue', () => {
    const gameState = gameStateScenarios.freshGame(TEAM_MODES.INDIVIDUAL_6);
    const currentGoalieId = gameState.formation.goalie;
    const newGoalieId = gameState.formation.leftDefender; // Field player not in queue
    
    // Ensure new goalie is NOT in the rotation queue
    const modifiedGameState = {
      ...gameState,
      rotationQueue: gameState.rotationQueue.filter(id => id !== newGoalieId)
    };
    
    const originalQueueLength = modifiedGameState.rotationQueue.length;
    
    // Perform goalie switch
    const resultState = calculateGoalieSwitch(modifiedGameState, newGoalieId);
    
    // Verify former goalie is added to end of queue
    expect(resultState.rotationQueue).toContain(currentGoalieId);
    expect(resultState.rotationQueue[resultState.rotationQueue.length - 1]).toBe(currentGoalieId);
    expect(resultState.rotationQueue.length).toBe(originalQueueLength + 1);
  });
  
  it('should maintain queue order for other players', () => {
    const gameState = gameStateScenarios.freshGame(TEAM_MODES.INDIVIDUAL_7);
    const currentGoalieId = gameState.formation.goalie;
    const newGoalieId = gameState.rotationQueue[2]; // Pick player at position 2
    
    const originalQueue = [...gameState.rotationQueue];
    const originalPosition = 2;
    
    // Perform goalie switch
    const resultState = calculateGoalieSwitch(gameState, newGoalieId);
    
    // Verify former goalie takes position 2
    expect(resultState.rotationQueue[originalPosition]).toBe(currentGoalieId);
    
    // Verify other players maintain their relative positions
    // Players before position 2 should remain in same positions
    for (let i = 0; i < originalPosition; i++) {
      expect(resultState.rotationQueue[i]).toBe(originalQueue[i]);
    }
    
    // Players after position 2 should remain in same positions (shifted by new goalie removal)
    for (let i = originalPosition + 1; i < originalQueue.length; i++) {
      if (originalQueue[i] !== newGoalieId) {
        // Find where this player ended up in result queue
        const resultIndex = resultState.rotationQueue.indexOf(originalQueue[i]);
        expect(resultIndex).toBeGreaterThan(originalPosition);
      }
    }
  });
  
  it('should work with rapid successive goalie switches', () => {
    let gameState = gameStateScenarios.freshGame(TEAM_MODES.INDIVIDUAL_6);
    
    // Perform multiple goalie switches
    const switches = [
      { newGoalie: gameState.formation.leftDefender },
      { newGoalie: gameState.formation.rightDefender },
      { newGoalie: gameState.formation.substitute_1 }
    ];
    
    for (const switchOp of switches) {
      const previousGoalieId = gameState.formation.goalie;
      const newGoalieId = switchOp.newGoalie;
      const originalPosition = gameState.rotationQueue.indexOf(newGoalieId);
      
      console.log(`Switch: ${previousGoalieId} -> ${newGoalieId} (pos: ${originalPosition})`);
      
      gameState = calculateGoalieSwitch(gameState, newGoalieId);
      
      // Verify queue integrity after each switch
      expect(gameState.rotationQueue).not.toContain(newGoalieId);
      expect(gameState.rotationQueue).toContain(previousGoalieId);
      
      if (originalPosition >= 0) {
        expect(gameState.rotationQueue[originalPosition]).toBe(previousGoalieId);
      }
    }
  });
  
  it('should preserve queue fairness metrics', () => {
    const gameState = gameStateScenarios.freshGame(TEAM_MODES.INDIVIDUAL_7);
    const currentGoalieId = gameState.formation.goalie;
    const newGoalieId = gameState.rotationQueue[1]; // Second player in queue
    
    const originalQueuePosition = 1;
    
    // Perform goalie switch
    const resultState = calculateGoalieSwitch(gameState, newGoalieId);
    
    // Verify fairness: former goalie doesn't get sent to back of line
    expect(resultState.rotationQueue[originalQueuePosition]).toBe(currentGoalieId);
    
    // Verify the former goalie is not at the end (which would be unfair)
    expect(resultState.rotationQueue[resultState.rotationQueue.length - 1]).not.toBe(currentGoalieId);
    
    // Count how many players are now ahead of the former goalie
    const playersAheadOfFormerGoalie = originalQueuePosition;
    expect(playersAheadOfFormerGoalie).toBe(1); // Only 1 player should be ahead
    
    console.log(`Fairness test: Former goalie has ${playersAheadOfFormerGoalie} players ahead (should be 1)`);
  });
});