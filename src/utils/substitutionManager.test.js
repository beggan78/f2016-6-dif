/**
 * Test file for the SubstitutionManager
 * This will help us verify the logic works correctly before integrating
 */

import { SubstitutionManager } from './substitutionManager';
import { FORMATION_TYPES } from './gameLogic';

// Test data
const mockPlayers = {
  'p1': { id: 'p1', name: 'Player 1' },
  'p2': { id: 'p2', name: 'Player 2' },
  'p3': { id: 'p3', name: 'Player 3' },
  'p4': { id: 'p4', name: 'Player 4' },
  'p5': { id: 'p5', name: 'Player 5' },
  'p6': { id: 'p6', name: 'Player 6' },
  'p7': { id: 'p7', name: 'Player 7' }
};

// Test 6-player individual mode
function test6PlayerIndividual() {
  console.log('Testing 6-Player Individual Mode...');
  
  const initialState = {
    currentFormation: {
      goalie: 'p1',
      leftDefender: 'p2',
      rightDefender: 'p3',
      leftAttacker: 'p4',
      rightAttacker: 'p5',
      substitute: 'p6'
    },
    rotationQueue: ['p2', 'p3', 'p4', 'p5', 'p6'],
    goalieId: 'p1',
    nextOffIndex: 0,
    inactivePlayerIds: [],
    formationType: FORMATION_TYPES.INDIVIDUAL_6
  };

  const manager = new SubstitutionManager(initialState);

  // Test getting next player
  const nextPlayer = manager.getNextPlayerToSubOut();
  console.log('Next player to sub out:', nextPlayer);
  console.assert(nextPlayer.playerId === 'p2', 'Next player should be p2');

  // Test performing substitution
  const newState = manager.performSubstitution();
  console.log('After substitution - formation:', newState.currentFormation);
  console.log('After substitution - queue:', newState.rotationQueue);
  
  // Verify p6 is now on field and p2 is substitute
  console.assert(newState.currentFormation.leftDefender === 'p6', 'p6 should be on field');
  console.assert(newState.currentFormation.substitute === 'p2', 'p2 should be substitute');
  
  // Test goalie swap
  const swappedState = manager.swapGoalie('p1', 'p3');
  console.log('After goalie swap - formation:', swappedState.currentFormation);
  console.assert(swappedState.currentFormation.goalie === 'p3', 'p3 should be goalie');
  console.assert(swappedState.currentFormation.rightDefender === 'p1', 'p1 should be right defender');

  console.log('✅ 6-Player Individual Mode tests passed!\n');
}

// Test 7-player pairs mode
function test7PlayerPairs() {
  console.log('Testing 7-Player Pairs Mode...');
  
  const initialState = {
    currentFormation: {
      goalie: 'p1',
      leftPair: { defender: 'p2', attacker: 'p3' },
      rightPair: { defender: 'p4', attacker: 'p5' },
      subPair: { defender: 'p6', attacker: 'p7' }
    },
    rotationQueue: [],
    goalieId: 'p1',
    nextOffIndex: 0, // 0 = leftPair, 1 = rightPair
    inactivePlayerIds: [],
    formationType: FORMATION_TYPES.PAIRS_7
  };

  const manager = new SubstitutionManager(initialState);

  // Test getting next pair
  const nextPair = manager.getNextPlayerToSubOut();
  console.log('Next pair to sub out:', nextPair);
  console.assert(nextPair.pairKey === 'leftPair', 'Next pair should be leftPair');

  // Test performing substitution
  const newState = manager.performSubstitution();
  console.log('After substitution - formation:', newState.currentFormation);
  
  // Verify left pair and sub pair swapped
  console.assert(newState.currentFormation.leftPair.defender === 'p6', 'p6 should be left defender');
  console.assert(newState.currentFormation.leftPair.attacker === 'p7', 'p7 should be left attacker');
  console.assert(newState.currentFormation.subPair.defender === 'p2', 'p2 should be sub defender');
  console.assert(newState.currentFormation.subPair.attacker === 'p3', 'p3 should be sub attacker');

  console.log('✅ 7-Player Pairs Mode tests passed!\n');
}

// Jest tests
describe('SubstitutionManager', () => {
  test('6-player individual mode substitution', () => {
    const initialState = {
      currentFormation: {
        goalie: 'p1',
        leftDefender: 'p2',
        rightDefender: 'p3',
        leftAttacker: 'p4',
        rightAttacker: 'p5',
        substitute: 'p6'
      },
      rotationQueue: ['p2', 'p3', 'p4', 'p5', 'p6'],
      goalieId: 'p1',
      nextOffIndex: 0,
      inactivePlayerIds: [],
      formationType: FORMATION_TYPES.INDIVIDUAL_6
    };

    const manager = new SubstitutionManager(initialState);
    
    // Test getting next player
    const nextPlayer = manager.getNextPlayerToSubOut();
    expect(nextPlayer.playerId).toBe('p2');
    
    // Test performing substitution
    const result = manager.performSubstitution();
    
    // Verify p6 is now on field and p2 is substitute
    expect(result.newState.currentFormation.leftDefender).toBe('p6');
    expect(result.newState.currentFormation.substitute).toBe('p2');
    expect(result.playerStatsUpdates).toHaveLength(2);
  });

  test('7-player pairs mode substitution', () => {
    const initialState = {
      currentFormation: {
        goalie: 'p1',
        leftPair: { defender: 'p2', attacker: 'p3' },
        rightPair: { defender: 'p4', attacker: 'p5' },
        subPair: { defender: 'p6', attacker: 'p7' }
      },
      rotationQueue: [],
      goalieId: 'p1',
      nextOffIndex: 0,
      inactivePlayerIds: [],
      formationType: FORMATION_TYPES.PAIRS_7
    };

    const manager = new SubstitutionManager(initialState);
    
    // Test getting next pair
    const nextPair = manager.getNextPlayerToSubOut();
    expect(nextPair.pairKey).toBe('leftPair');
    
    // Test performing substitution
    const result = manager.performSubstitution();
    
    // Verify left pair and sub pair swapped
    expect(result.newState.currentFormation.leftPair.defender).toBe('p6');
    expect(result.newState.currentFormation.leftPair.attacker).toBe('p7');
    expect(result.newState.currentFormation.subPair.defender).toBe('p2');
    expect(result.newState.currentFormation.subPair.attacker).toBe('p3');
    expect(result.playerStatsUpdates).toHaveLength(4);
  });
});