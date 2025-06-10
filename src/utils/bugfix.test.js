/**
 * Test to verify the bug fix for the reactivation issue
 * This test reproduces the exact steps from the bug report
 */

import { createRotationQueue } from './rotationQueue';

describe('Bug Fix - Reactivation Queue Issue', () => {
  test('reactivated player should not become next to substitute out', () => {
    // Initial setup with 7 players
    const players = ['FieldA', 'FieldB', 'FieldC', 'FieldD', 'OtherSub', 'PlayerWithInjury'];
    const getPlayerById = (id) => ({ id, name: id, stats: { isInactive: false } });
    
    const queue = createRotationQueue(players, getPlayerById);
    queue.initialize();
    
    // Initial state: [FieldA, FieldB, FieldC, FieldD, OtherSub, PlayerWithInjury]
    expect(queue.toArray()).toEqual(['FieldA', 'FieldB', 'FieldC', 'FieldD', 'OtherSub', 'PlayerWithInjury']);
    expect(queue.getNextActivePlayer()).toBe('FieldA'); // Correct - field player
    
    // Step 1: Inactivate PlayerWithInjury
    queue.deactivatePlayer('PlayerWithInjury');
    expect(queue.toArray()).toEqual(['FieldA', 'FieldB', 'FieldC', 'FieldD', 'OtherSub']);
    expect(queue.getInactivePlayers()).toEqual(['PlayerWithInjury']);
    expect(queue.getNextActivePlayer()).toBe('FieldA'); // Still correct
    
    // Step 2: Reactivate PlayerWithInjury (THE FIX)
    queue.reactivatePlayer('PlayerWithInjury');
    expect(queue.toArray()).toEqual(['FieldA', 'FieldB', 'FieldC', 'FieldD', 'OtherSub', 'PlayerWithInjury']);
    expect(queue.getInactivePlayers()).toEqual([]);
    
    // CRITICAL: Next player should still be FieldA, NOT PlayerWithInjury
    expect(queue.getNextActivePlayer()).toBe('FieldA'); // ✅ Fixed - field player, not substitute
    
    // Step 4: Simulate first substitution (FieldA comes off)
    queue.rotatePlayer('FieldA'); // FieldA goes to end
    expect(queue.toArray()).toEqual(['FieldB', 'FieldC', 'FieldD', 'OtherSub', 'PlayerWithInjury', 'FieldA']);
    expect(queue.getNextActivePlayer()).toBe('FieldB'); // ✅ Correct - next field player
    
    // Step 5: Simulate second substitution (FieldB comes off)
    queue.rotatePlayer('FieldB'); // FieldB goes to end  
    expect(queue.toArray()).toEqual(['FieldC', 'FieldD', 'OtherSub', 'PlayerWithInjury', 'FieldA', 'FieldB']);
    expect(queue.getNextActivePlayer()).toBe('FieldC'); // ✅ Correct - next field player
    
    // Verify PlayerWithInjury is NOT at the front of the queue
    expect(queue.getNextActivePlayer()).not.toBe('PlayerWithInjury');
  });
  
  test('reactivated player goes to end, preserving field player priority', () => {
    const players = ['Field1', 'Field2', 'Sub1', 'Sub2'];
    const getPlayerById = (id) => ({ id, name: id, stats: { isInactive: false } });
    
    const queue = createRotationQueue(players, getPlayerById);
    queue.initialize();
    
    // Inactivate Sub2
    queue.deactivatePlayer('Sub2');
    expect(queue.toArray()).toEqual(['Field1', 'Field2', 'Sub1']);
    
    // Reactivate Sub2 - should go to END, not start
    queue.reactivatePlayer('Sub2');
    expect(queue.toArray()).toEqual(['Field1', 'Field2', 'Sub1', 'Sub2']);
    
    // Field players should still have priority for substitution
    expect(queue.getNextActivePlayer()).toBe('Field1');
    expect(queue.getNextActivePlayer(2)).toEqual(['Field1', 'Field2']);
  });
});