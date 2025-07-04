/**
 * Integration test to verify that rotation queue state is actually updated
 * when goalie handlers are called. This tests the complete flow from
 * handler invocation to state application.
 */

import { createGoalieHandlers } from '../../game/handlers/goalieHandlers';
import { gameStateScenarios } from '../fixtures/mockGameData';
import { TEAM_MODES } from '../../constants/playerConstants';

describe('Goalie Queue State Update Integration', () => {
  
  it('should actually update rotation queue state when goalie switch is called', () => {
    // Create a test state for individual_6 mode
    const gameState = gameStateScenarios.freshGame(TEAM_MODES.INDIVIDUAL_6);
    const currentGoalieId = gameState.periodFormation.goalie;
    const newGoalieId = gameState.rotationQueue[0]; // First player in queue
    const originalQueuePosition = 0;
    
    console.log('Original queue:', gameState.rotationQueue);
    console.log('Current goalie:', currentGoalieId);
    console.log('New goalie:', newGoalieId, 'at position:', originalQueuePosition);
    
    // Track state updates to verify they're called
    let updatedRotationQueue = null;
    let updatedPeriodFormation = null;
    let updatedAllPlayers = null;
    
    // Mock state updaters that capture calls
    const mockStateUpdaters = {
      setPeriodFormation: jest.fn((newFormation) => {
        updatedPeriodFormation = newFormation;
      }),
      setAllPlayers: jest.fn((newPlayers) => {
        updatedAllPlayers = newPlayers;
      }),
      setRotationQueue: jest.fn((newQueue) => {
        updatedRotationQueue = newQueue;
        console.log('setRotationQueue called with:', newQueue);
      })
    };
    
    // Mock animation hooks
    const mockAnimationHooks = {
      setAnimationState: jest.fn(),
      setHideNextOffIndicator: jest.fn(),
      setRecentlySubstitutedPlayers: jest.fn()
    };
    
    // Mock modal handlers
    const mockModalHandlers = {
      openGoalieModal: jest.fn(),
      closeGoalieModal: jest.fn(),
      removeModalFromStack: jest.fn()
    };
    
    // Create goalie handlers
    const goalieHandlers = createGoalieHandlers(
      () => gameState, // gameStateFactory
      mockStateUpdaters,
      mockAnimationHooks,
      mockModalHandlers,
      gameState.allPlayers,
      gameState.allPlayers // selectedSquadPlayers
    );
    
    // Call the goalie switch handler
    goalieHandlers.handleSelectNewGoalie(newGoalieId);
    
    // Verify that setRotationQueue was called
    expect(mockStateUpdaters.setRotationQueue).toHaveBeenCalledTimes(1);
    expect(updatedRotationQueue).not.toBeNull();
    
    // Verify the rotation queue was updated correctly
    expect(updatedRotationQueue).toEqual(expect.arrayContaining([currentGoalieId]));
    expect(updatedRotationQueue).not.toContain(newGoalieId);
    
    // Verify former goalie took new goalie's position
    expect(updatedRotationQueue[originalQueuePosition]).toBe(currentGoalieId);
    
    console.log('Updated queue:', updatedRotationQueue);
    console.log('✅ Former goalie', currentGoalieId, 'is now at position', originalQueuePosition);
    console.log('✅ New goalie', newGoalieId, 'is removed from queue');
    
    // Verify other state updaters were also called
    expect(mockStateUpdaters.setPeriodFormation).toHaveBeenCalledTimes(1);
    expect(mockStateUpdaters.setAllPlayers).toHaveBeenCalledTimes(1);
    
    // Verify the formation was updated correctly
    expect(updatedPeriodFormation.goalie).toBe(newGoalieId);
    
    // Verify modal was closed
    expect(mockModalHandlers.closeGoalieModal).toHaveBeenCalledTimes(1);
  });
  
  it('should handle multiple team modes correctly', () => {
    const teamModes = [TEAM_MODES.INDIVIDUAL_6, TEAM_MODES.INDIVIDUAL_7, TEAM_MODES.PAIRS_7];
    
    teamModes.forEach(teamMode => {
      console.log(`\nTesting ${teamMode} queue state update`);
      
      const gameState = gameStateScenarios.freshGame(teamMode);
      const currentGoalieId = gameState.periodFormation.goalie;
      const newGoalieId = gameState.rotationQueue[1]; // Second player in queue
      const originalQueuePosition = 1;
      
      let updatedRotationQueue = null;
      
      const mockStateUpdaters = {
        setPeriodFormation: jest.fn(),
        setAllPlayers: jest.fn(),
        setRotationQueue: jest.fn((newQueue) => {
          updatedRotationQueue = newQueue;
        })
      };
      
      const mockAnimationHooks = {
        setAnimationState: jest.fn(),
        setHideNextOffIndicator: jest.fn(),
        setRecentlySubstitutedPlayers: jest.fn()
      };
      
      const mockModalHandlers = {
        openGoalieModal: jest.fn(),
        closeGoalieModal: jest.fn(),
        removeModalFromStack: jest.fn()
      };
      
      const goalieHandlers = createGoalieHandlers(
        () => gameState,
        mockStateUpdaters,
        mockAnimationHooks,
        mockModalHandlers,
        gameState.allPlayers,
        gameState.allPlayers
      );
      
      goalieHandlers.handleSelectNewGoalie(newGoalieId);
      
      // Verify rotation queue was updated for this team mode
      expect(mockStateUpdaters.setRotationQueue).toHaveBeenCalledTimes(1);
      expect(updatedRotationQueue).not.toBeNull();
      expect(updatedRotationQueue[originalQueuePosition]).toBe(currentGoalieId);
      expect(updatedRotationQueue).not.toContain(newGoalieId);
      
      console.log(`${teamMode}: ✅ Queue updated correctly`);
    });
  });
});