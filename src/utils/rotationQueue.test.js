import { RotationQueue, createRotationQueue } from './rotationQueue';

describe('RotationQueue', () => {
  let queue;
  let mockPlayers;

  beforeEach(() => {
    mockPlayers = [
      { id: '1', stats: { isInactive: false } },
      { id: '2', stats: { isInactive: false } },
      { id: '3', stats: { isInactive: true } },
      { id: '4', stats: { isInactive: false } },
      { id: '5', stats: { isInactive: false } }
    ];
    
    const getPlayerById = (id) => mockPlayers.find(p => p.id === id);
    queue = new RotationQueue(['1', '2', '3', '4', '5'], getPlayerById);
  });

  describe('basic operations', () => {
    test('creates queue with initial players', () => {
      expect(queue.toArray()).toEqual(['1', '2', '3', '4', '5']);
      expect(queue.size()).toBe(5);
    });

    test('separates active and inactive players on initialization', () => {
      queue.initialize();
      expect(queue.getActiveQueue()).toEqual(['1', '2', '4', '5']);
      expect(queue.getInactivePlayers()).toEqual(['3']);
      expect(queue.activeSize()).toBe(4);
      expect(queue.inactiveSize()).toBe(1);
    });

    test('gets next active player after initialization', () => {
      queue.initialize();
      expect(queue.getNextActivePlayer()).toBe('1');
      expect(queue.getNextActivePlayer(2)).toEqual(['1', '2']);
      expect(queue.getNextActivePlayer(3)).toEqual(['1', '2', '4']);
    });
  });

  describe('rotation operations', () => {
    test('rotates player to end of queue', () => {
      queue.rotatePlayer('1');
      expect(queue.toArray()).toEqual(['2', '3', '4', '5', '1']);
      expect(queue.getNextActivePlayer()).toBe('2');
    });

    test('handles rotating non-existent player', () => {
      queue.rotatePlayer('999');
      expect(queue.toArray()).toEqual(['1', '2', '3', '4', '5']);
    });
  });

  describe('add/remove operations', () => {
    test('adds player to end by default', () => {
      queue.addPlayer('6');
      expect(queue.toArray()).toEqual(['1', '2', '3', '4', '5', '6']);
    });

    test('adds player to start', () => {
      queue.addPlayer('6', 'start');
      expect(queue.toArray()).toEqual(['6', '1', '2', '3', '4', '5']);
    });

    test('adds player at specific position', () => {
      queue.addPlayer('6', 2);
      expect(queue.toArray()).toEqual(['1', '2', '6', '3', '4', '5']);
    });

    test('removes existing player before adding', () => {
      queue.addPlayer('3', 'start');
      expect(queue.toArray()).toEqual(['3', '1', '2', '4', '5']);
    });

    test('removes player from queue', () => {
      queue.removePlayer('3');
      expect(queue.toArray()).toEqual(['1', '2', '4', '5']);
    });

    test('moves player to front', () => {
      queue.moveToFront('4');
      expect(queue.toArray()).toEqual(['4', '1', '2', '3', '5']);
    });
  });

  describe('reordering operations', () => {
    test('inserts player before target', () => {
      queue.insertBefore('5', '2');
      expect(queue.toArray()).toEqual(['1', '5', '2', '3', '4']);
    });

    test('reorders by position array', () => {
      queue.reorderByPositions(['5', '1', '3']);
      expect(queue.toArray()).toEqual(['5', '1', '3', '2', '4']);
    });
  });

  describe('activation/deactivation', () => {
    beforeEach(() => {
      queue.initialize(); // Start with properly separated active/inactive players
    });

    test('deactivates player by removing from queue and tracking separately', () => {
      queue.deactivatePlayer('2');
      expect(queue.toArray()).toEqual(['1', '4', '5']); // '2' removed from active queue
      expect(queue.getInactivePlayers()).toEqual(['3', '2']); // '2' added to inactive list
    });

    test('reactivates player by moving from inactive to front of queue', () => {
      queue.reactivatePlayer('3'); // '3' was inactive
      expect(queue.toArray()).toEqual(['3', '1', '2', '4', '5']); // '3' at front
      expect(queue.getInactivePlayers()).toEqual([]); // '3' removed from inactive list
    });

    test('handles reactivating player not in inactive list', () => {
      queue.reactivatePlayer('6'); // Player not in queue at all
      expect(queue.toArray()).toEqual(['6', '1', '2', '4', '5']); // '6' added to front
      expect(queue.getInactivePlayers()).toEqual(['3']); // Inactive list unchanged
    });

    test('checks if player is inactive', () => {
      expect(queue.isPlayerInactive('3')).toBe(true);
      expect(queue.isPlayerInactive('1')).toBe(false);
    });
  });

  describe('utility methods', () => {
    test('checks if player is in queue', () => {
      expect(queue.contains('3')).toBe(true);
      expect(queue.contains('999')).toBe(false);
    });

    test('gets player position', () => {
      expect(queue.getPosition('3')).toBe(2);
      expect(queue.getPosition('999')).toBe(-1);
    });

    test('gets active position', () => {
      queue.initialize(); // Need to initialize to separate active/inactive
      expect(queue.getActivePosition('4')).toBe(2); // '4' is 3rd active player (after '1', '2')
      expect(queue.getActivePosition('3')).toBe(-1); // '3' is inactive
    });

    test('resets queue and clears inactive players', () => {
      queue.initialize();
      queue.deactivatePlayer('1');
      queue.reset(['a', 'b', 'c']);
      expect(queue.toArray()).toEqual(['a', 'b', 'c']);
      expect(queue.getInactivePlayers()).toEqual([]);
    });

    test('clones queue including inactive players', () => {
      queue.initialize();
      queue.deactivatePlayer('1');
      const cloned = queue.clone();
      expect(cloned.toArray()).toEqual(queue.toArray());
      expect(cloned.getInactivePlayers()).toEqual(queue.getInactivePlayers());
      cloned.addPlayer('6');
      expect(queue.toArray()).not.toContain('6');
    });
  });

  describe('factory function', () => {
    test('creates queue using factory', () => {
      const factoryQueue = createRotationQueue(['a', 'b'], () => null);
      expect(factoryQueue).toBeInstanceOf(RotationQueue);
      expect(factoryQueue.toArray()).toEqual(['a', 'b']);
    });
  });
});