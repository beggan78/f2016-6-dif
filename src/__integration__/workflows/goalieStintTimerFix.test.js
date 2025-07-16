/**
 * Goalie Stint Timer Fix Verification Test
 * 
 * This test specifically verifies that the former goalie's stint timer
 * is properly initialized after a goalie replacement, ensuring their
 * time ticks up correctly.
 */

import { calculateGoalieSwitch } from '../../game/logic/gameStateLogic';
import { gameStateScenarios } from '../fixtures/mockGameData';
import { TEAM_MODES } from '../../constants/playerConstants';
import { isIndividualMode } from '../../constants/gameModes';

describe('Goalie Stint Timer Fix Verification', () => {
  
  it('should properly initialize lastStintStartTimeEpoch for former goalie', () => {
    // Setup a game state with an active goalie
    const gameState = gameStateScenarios.freshGame(TEAM_MODES.INDIVIDUAL_6);
    const currentGoalieId = gameState.formation.goalie;
    const newGoalieId = gameState.formation.leftDefender;
    
    // Perform goalie switch
    const resultState = calculateGoalieSwitch(gameState, newGoalieId);
    
    // Find the former goalie in the result
    const formerGoalie = resultState.allPlayers.find(p => p.id === currentGoalieId);
    const newGoalie = resultState.allPlayers.find(p => p.id === newGoalieId);
    
    // Verify former goalie has proper stint timer initialization
    expect(formerGoalie).toBeDefined();
    expect(formerGoalie.stats.lastStintStartTimeEpoch).toBeDefined();
    expect(formerGoalie.stats.lastStintStartTimeEpoch).not.toBeNull();
    expect(formerGoalie.stats.lastStintStartTimeEpoch).toBeGreaterThan(0);
    expect(formerGoalie.stats.currentStatus).toBe('on_field');
    
    // Verify new goalie has proper stint timer initialization
    expect(newGoalie).toBeDefined();
    expect(newGoalie.stats.lastStintStartTimeEpoch).toBeDefined();
    expect(newGoalie.stats.lastStintStartTimeEpoch).not.toBeNull();
    expect(newGoalie.stats.lastStintStartTimeEpoch).toBeGreaterThan(0);
    expect(newGoalie.stats.currentStatus).toBe('goalie');
    
    // Verify both players have the same stint start time (synchronized)
    expect(formerGoalie.stats.lastStintStartTimeEpoch).toBe(newGoalie.stats.lastStintStartTimeEpoch);
  });
  
  it('should work correctly across all team modes', () => {
    const teamModes = [TEAM_MODES.INDIVIDUAL_6, TEAM_MODES.INDIVIDUAL_7, TEAM_MODES.INDIVIDUAL_8, TEAM_MODES.PAIRS_7];
    
    teamModes.forEach(teamMode => {
      const gameState = gameStateScenarios.freshGame(teamMode);
      const currentGoalieId = gameState.formation.goalie;
      
      // Find a suitable replacement goalie
      let newGoalieId;
      if (teamMode === TEAM_MODES.PAIRS_7) {
        newGoalieId = gameState.formation.leftPair.defender;
      } else if (isIndividualMode(teamMode)) {
        newGoalieId = gameState.formation.leftDefender;
      }
      
      // Perform goalie switch
      const resultState = calculateGoalieSwitch(gameState, newGoalieId);
      
      // Find the former goalie
      const formerGoalie = resultState.allPlayers.find(p => p.id === currentGoalieId);
      
      // Verify stint timer is properly initialized
      expect(formerGoalie.stats.lastStintStartTimeEpoch).toBeDefined();
      expect(formerGoalie.stats.lastStintStartTimeEpoch).not.toBeNull();
      expect(formerGoalie.stats.lastStintStartTimeEpoch).toBeGreaterThan(0);
      
      console.log(`${teamMode}: Former goalie ${currentGoalieId} has lastStintStartTimeEpoch: ${formerGoalie.stats.lastStintStartTimeEpoch}`);
    });
  });
  
  it('should preserve time field initialization from startNewStint', () => {
    const gameState = gameStateScenarios.freshGame(TEAM_MODES.INDIVIDUAL_7);
    const currentGoalieId = gameState.formation.goalie;
    const newGoalieId = gameState.formation.leftDefender;
    
    // Perform goalie switch
    const resultState = calculateGoalieSwitch(gameState, newGoalieId);
    
    // Find the former goalie
    const formerGoalie = resultState.allPlayers.find(p => p.id === currentGoalieId);
    
    // Verify all time fields are properly initialized (not undefined/NaN)
    expect(formerGoalie.stats.timeOnFieldSeconds).toBeDefined();
    expect(formerGoalie.stats.timeAsAttackerSeconds).toBeDefined();
    expect(formerGoalie.stats.timeAsDefenderSeconds).toBeDefined();
    expect(formerGoalie.stats.timeAsSubSeconds).toBeDefined();
    expect(formerGoalie.stats.timeAsGoalieSeconds).toBeDefined();
    
    // Verify they are numbers, not NaN
    expect(typeof formerGoalie.stats.timeOnFieldSeconds).toBe('number');
    expect(typeof formerGoalie.stats.timeAsAttackerSeconds).toBe('number');
    expect(typeof formerGoalie.stats.timeAsDefenderSeconds).toBe('number');
    expect(typeof formerGoalie.stats.timeAsSubSeconds).toBe('number');
    expect(typeof formerGoalie.stats.timeAsGoalieSeconds).toBe('number');
    
    expect(isNaN(formerGoalie.stats.timeOnFieldSeconds)).toBe(false);
    expect(isNaN(formerGoalie.stats.timeAsAttackerSeconds)).toBe(false);
    expect(isNaN(formerGoalie.stats.timeAsDefenderSeconds)).toBe(false);
    expect(isNaN(formerGoalie.stats.timeAsSubSeconds)).toBe(false);
    expect(isNaN(formerGoalie.stats.timeAsGoalieSeconds)).toBe(false);
  });
});