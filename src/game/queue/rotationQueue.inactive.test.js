import { createRotationQueue } from './rotationQueue';

describe('RotationQueue - Inactive Player Bug Prevention', () => {
  let queue;
  let mockPlayers;

  beforeEach(() => {
    // Create players where some are inactive
    mockPlayers = [
      { id: '1', stats: { isInactive: false } },
      { id: '2', stats: { isInactive: true } },   // Initially inactive
      { id: '3', stats: { isInactive: false } },
      { id: '4', stats: { isInactive: true } },   // Initially inactive
      { id: '5', stats: { isInactive: false } }
    ];
    
    const getPlayerById = (id) => mockPlayers.find(p => p.id === id);
    queue = createRotationQueue(['1', '2', '3', '4', '5'], getPlayerById);
    queue.initialize(); // Properly separate active and inactive players
  });

  test('inactive players are physically removed from active queue on initialization', () => {
    // Only active players should be in the main queue
    expect(queue.toArray()).toEqual(['1', '3', '5']);
    // Inactive players should be tracked separately
    expect(queue.getInactivePlayers()).toEqual(['2', '4']);
  });

  test('getNextActivePlayer only returns active players (no bugs with inactive players)', () => {
    // Should never return an inactive player
    expect(queue.getNextActivePlayer()).toBe('1');
    expect(queue.getNextActivePlayer(2)).toEqual(['1', '3']);
    expect(queue.getNextActivePlayer(3)).toEqual(['1', '3', '5']);
    
    // Should never include inactive players in results
    const next5 = queue.getNextActivePlayer(5);
    expect(next5).not.toContain('2');
    expect(next5).not.toContain('4');
  });

  test('rotating inactive players does nothing (prevents bugs)', () => {
    const beforeQueue = queue.toArray();
    
    // Try to rotate an inactive player - should do nothing
    queue.rotatePlayer('2');
    queue.rotatePlayer('4');
    
    // Queue should be unchanged
    expect(queue.toArray()).toEqual(beforeQueue);
    expect(queue.getInactivePlayers()).toEqual(['2', '4']);
  });

  test('deactivating a player removes them completely from rotation', () => {
    // Deactivate an active player
    queue.deactivatePlayer('3');
    
    // They should be removed from active queue
    expect(queue.toArray()).toEqual(['1', '5']);
    // And added to inactive list
    expect(queue.getInactivePlayers()).toEqual(['2', '4', '3']);
    
    // getNextActivePlayer should never return the deactivated player
    expect(queue.getNextActivePlayer()).toBe('1');
    expect(queue.getNextActivePlayer(5)).toEqual(['1', '5']);
  });

  test('reactivating a player puts them at end of queue', () => {
    // Reactivate player '2'
    queue.reactivatePlayer('2');
    
    // They should be at end of active queue
    expect(queue.toArray()).toEqual(['1', '3', '5', '2']);
    // And removed from inactive list
    expect(queue.getInactivePlayers()).toEqual(['4']);
    
    // Next to be substituted should still be the first player
    expect(queue.getNextActivePlayer()).toBe('1');
  });

  test('complex scenario: deactivate, rotate, reactivate maintains correct order', () => {
    // Start: active=['1', '3', '5'], inactive=['2', '4']
    
    // Deactivate player '1'
    queue.deactivatePlayer('1');
    expect(queue.toArray()).toEqual(['3', '5']);
    expect(queue.getInactivePlayers()).toEqual(['2', '4', '1']);
    
    // Rotate player '3' to end
    queue.rotatePlayer('3');
    expect(queue.toArray()).toEqual(['5', '3']);
    
    // Reactivate player '4' - should go to end
    queue.reactivatePlayer('4');
    expect(queue.toArray()).toEqual(['5', '3', '4']);
    expect(queue.getInactivePlayers()).toEqual(['2', '1']);
    
    // Next player should be '5' (the first in queue)
    expect(queue.getNextActivePlayer()).toBe('5');
    expect(queue.getNextActivePlayer(3)).toEqual(['5', '3', '4']);
  });

  test('queue size methods work correctly with inactive players', () => {
    expect(queue.size()).toBe(3); // Only active players
    expect(queue.activeSize()).toBe(3); // Same as size
    expect(queue.inactiveSize()).toBe(2); // Inactive players
    
    // Deactivate one more
    queue.deactivatePlayer('1');
    expect(queue.size()).toBe(2);
    expect(queue.activeSize()).toBe(2);
    expect(queue.inactiveSize()).toBe(3);
  });

  test('reset clears both active and inactive players', () => {
    queue.reset(['a', 'b', 'c']);
    
    expect(queue.toArray()).toEqual(['a', 'b', 'c']);
    expect(queue.getInactivePlayers()).toEqual([]);
    expect(queue.inactiveSize()).toBe(0);
  });

  test('clone preserves both active and inactive player lists', () => {
    queue.deactivatePlayer('1');
    const cloned = queue.clone();
    
    expect(cloned.toArray()).toEqual(queue.toArray());
    expect(cloned.getInactivePlayers()).toEqual(queue.getInactivePlayers());
    
    // Changes to clone don't affect original
    cloned.reactivatePlayer('2');
    expect(queue.getInactivePlayers()).toContain('2'); // Original unchanged
  });

  test('bug fix: reactivated player should not become next to substitute out', () => {
    // Recreate the exact bug scenario from the issue report
    // Initial setup with 7 players (typical 7-player individual mode)
    const players = ['FieldA', 'FieldB', 'FieldC', 'FieldD', 'OtherSub', 'PlayerWithInjury'];
    const getPlayerById = (id) => ({ id, name: id, stats: { isInactive: false } });
    
    const bugTestQueue = createRotationQueue(players, getPlayerById);
    bugTestQueue.initialize();
    
    // Initial state: [FieldA, FieldB, FieldC, FieldD, OtherSub, PlayerWithInjury]
    expect(bugTestQueue.toArray()).toEqual(['FieldA', 'FieldB', 'FieldC', 'FieldD', 'OtherSub', 'PlayerWithInjury']);
    expect(bugTestQueue.getNextActivePlayer()).toBe('FieldA'); // Correct - field player
    
    // Step 1: Inactivate PlayerWithInjury
    bugTestQueue.deactivatePlayer('PlayerWithInjury');
    expect(bugTestQueue.toArray()).toEqual(['FieldA', 'FieldB', 'FieldC', 'FieldD', 'OtherSub']);
    expect(bugTestQueue.getInactivePlayers()).toEqual(['PlayerWithInjury']);
    expect(bugTestQueue.getNextActivePlayer()).toBe('FieldA'); // Still correct
    
    // Step 2: Reactivate PlayerWithInjury (THE FIX)
    bugTestQueue.reactivatePlayer('PlayerWithInjury');
    expect(bugTestQueue.toArray()).toEqual(['FieldA', 'FieldB', 'FieldC', 'FieldD', 'OtherSub', 'PlayerWithInjury']);
    expect(bugTestQueue.getInactivePlayers()).toEqual([]);
    
    // CRITICAL: Next player should still be FieldA, NOT PlayerWithInjury
    expect(bugTestQueue.getNextActivePlayer()).toBe('FieldA'); // ✅ Fixed - field player, not substitute
    
    // Step 4: Simulate first substitution (FieldA comes off)
    bugTestQueue.rotatePlayer('FieldA'); // FieldA goes to end
    expect(bugTestQueue.toArray()).toEqual(['FieldB', 'FieldC', 'FieldD', 'OtherSub', 'PlayerWithInjury', 'FieldA']);
    expect(bugTestQueue.getNextActivePlayer()).toBe('FieldB'); // ✅ Correct - next field player
    
    // Step 5: Simulate second substitution (FieldB comes off)
    bugTestQueue.rotatePlayer('FieldB'); // FieldB goes to end  
    expect(bugTestQueue.toArray()).toEqual(['FieldC', 'FieldD', 'OtherSub', 'PlayerWithInjury', 'FieldA', 'FieldB']);
    expect(bugTestQueue.getNextActivePlayer()).toBe('FieldC'); // ✅ Correct - next field player
    
    // Verify PlayerWithInjury is NOT at the front of the queue
    expect(bugTestQueue.getNextActivePlayer()).not.toBe('PlayerWithInjury');
  });

  test('bug fix: reactivated player goes to end, preserving field player priority', () => {
    // Test that field players always have priority over substitute players
    const players = ['Field1', 'Field2', 'Sub1', 'Sub2'];
    const getPlayerById = (id) => ({ id, name: id, stats: { isInactive: false } });
    
    const priorityTestQueue = createRotationQueue(players, getPlayerById);
    priorityTestQueue.initialize();
    
    // Inactivate Sub2
    priorityTestQueue.deactivatePlayer('Sub2');
    expect(priorityTestQueue.toArray()).toEqual(['Field1', 'Field2', 'Sub1']);
    
    // Reactivate Sub2 - should go to END, not start
    priorityTestQueue.reactivatePlayer('Sub2');
    expect(priorityTestQueue.toArray()).toEqual(['Field1', 'Field2', 'Sub1', 'Sub2']);
    
    // Field players should still have priority for substitution
    expect(priorityTestQueue.getNextActivePlayer()).toBe('Field1');
    expect(priorityTestQueue.getNextActivePlayer(2)).toEqual(['Field1', 'Field2']);
  });
});