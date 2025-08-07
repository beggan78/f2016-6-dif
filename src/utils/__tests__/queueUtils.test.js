/**
 * Tests for queueUtils.js - Queue utility functions
 */

import {
  getNextActivePlayer,
  getNextNextActivePlayer,
  getUpcomingPlayers,
  hasEnoughPlayersInQueue,
  rotatePlayerToEnd,
  removePlayerFromQueue,
  addPlayerToQueue,
  getPlayerPositionInQueue,
  isPlayerNextInQueue,
  isPlayerInQueue,
  validateRotationQueue
} from '../queueUtils';

describe('queueUtils', () => {
  const mockPlayers = [
    { id: 'p1', name: 'Player 1' },
    { id: 'p2', name: 'Player 2' },
    { id: 'p3', name: 'Player 3' },
    { id: 'p4', name: 'Player 4' },
    { id: 'p5', name: 'Player 5' }
  ];

  describe('getNextActivePlayer', () => {
    it('should return first player from valid queue', () => {
      expect(getNextActivePlayer(['p1', 'p2', 'p3'])).toBe('p1');
      expect(getNextActivePlayer(['p2'])).toBe('p2');
    });

    it('should handle empty or invalid queues', () => {
      expect(getNextActivePlayer([])).toBe(null);
      expect(getNextActivePlayer(null)).toBe(null);
      expect(getNextActivePlayer(undefined)).toBe(null);
      expect(getNextActivePlayer('not-array')).toBe(null);
    });

    it('should handle queue with null/undefined entries', () => {
      expect(getNextActivePlayer([null, 'p2', 'p3'])).toBe(null);
      expect(getNextActivePlayer([undefined, 'p2', 'p3'])).toBe(null);
      expect(getNextActivePlayer(['', 'p2', 'p3'])).toBe(null); // Empty string is falsy and becomes null
    });
  });

  describe('getNextNextActivePlayer', () => {
    it('should return second player from valid queue', () => {
      expect(getNextNextActivePlayer(['p1', 'p2', 'p3'])).toBe('p2');
      expect(getNextNextActivePlayer(['p1', 'p2'])).toBe('p2');
    });

    it('should handle queues with insufficient players', () => {
      expect(getNextNextActivePlayer(['p1'])).toBe(null);
      expect(getNextNextActivePlayer([])).toBe(null);
      expect(getNextNextActivePlayer(null)).toBe(null);
      expect(getNextNextActivePlayer(undefined)).toBe(null);
    });

    it('should handle queue with null/undefined entries', () => {
      expect(getNextNextActivePlayer(['p1', null, 'p3'])).toBe(null);
      expect(getNextNextActivePlayer(['p1', undefined])).toBe(null);
      expect(getNextNextActivePlayer(['p1', ''])).toBe(null); // Empty string is falsy and becomes null
    });
  });

  describe('getUpcomingPlayers', () => {
    it('should return specified number of players', () => {
      const queue = ['p1', 'p2', 'p3', 'p4'];
      expect(getUpcomingPlayers(queue, 2)).toEqual(['p1', 'p2']);
      expect(getUpcomingPlayers(queue, 3)).toEqual(['p1', 'p2', 'p3']);
      expect(getUpcomingPlayers(queue, 1)).toEqual(['p1']);
    });

    it('should default to 2 players when count not specified', () => {
      expect(getUpcomingPlayers(['p1', 'p2', 'p3'])).toEqual(['p1', 'p2']);
    });

    it('should handle requests exceeding queue length', () => {
      expect(getUpcomingPlayers(['p1', 'p2'], 5)).toEqual(['p1', 'p2']);
      expect(getUpcomingPlayers(['p1'], 2)).toEqual(['p1']);
    });

    it('should filter out falsy values', () => {
      expect(getUpcomingPlayers(['p1', null, 'p3', undefined, 'p5'], 5)).toEqual(['p1', 'p3', 'p5']);
      expect(getUpcomingPlayers([null, undefined, 'p1'], 3)).toEqual(['p1']); // Only 'p1' survives filtering
    });

    it('should handle empty or invalid queues', () => {
      expect(getUpcomingPlayers([])).toEqual([]);
      expect(getUpcomingPlayers(null)).toEqual([]);
      expect(getUpcomingPlayers(undefined)).toEqual([]);
    });
  });

  describe('hasEnoughPlayersInQueue', () => {
    it('should check minimum player requirements', () => {
      expect(hasEnoughPlayersInQueue(['p1', 'p2', 'p3'], 3)).toBe(true);
      expect(hasEnoughPlayersInQueue(['p1', 'p2'], 2)).toBe(true);
      expect(hasEnoughPlayersInQueue(['p1'], 1)).toBe(true);
    });

    it('should default to minimum of 1 player', () => {
      expect(hasEnoughPlayersInQueue(['p1'])).toBe(true);
      expect(hasEnoughPlayersInQueue([])).toBe(false);
    });

    it('should handle insufficient players', () => {
      expect(hasEnoughPlayersInQueue(['p1'], 2)).toBe(false);
      expect(hasEnoughPlayersInQueue([], 1)).toBe(false);
      expect(hasEnoughPlayersInQueue(['p1', 'p2'], 3)).toBe(false);
    });

    it('should filter out falsy values when counting', () => {
      expect(hasEnoughPlayersInQueue(['p1', null, 'p3'], 2)).toBe(true);
      expect(hasEnoughPlayersInQueue(['p1', null, undefined], 2)).toBe(false);
      expect(hasEnoughPlayersInQueue([null, undefined], 1)).toBe(false);
    });

    it('should handle invalid queues', () => {
      expect(hasEnoughPlayersInQueue(null, 1)).toBe(false);
      expect(hasEnoughPlayersInQueue(undefined, 1)).toBe(false);
    });
  });

  describe('rotatePlayerToEnd', () => {
    it('should move player to end of queue', () => {
      expect(rotatePlayerToEnd(['p1', 'p2', 'p3'], 'p1')).toEqual(['p2', 'p3', 'p1']);
      expect(rotatePlayerToEnd(['p1', 'p2', 'p3'], 'p2')).toEqual(['p1', 'p3', 'p2']);
      expect(rotatePlayerToEnd(['p1', 'p2', 'p3'], 'p3')).toEqual(['p1', 'p2', 'p3']);
    });

    it('should handle player not in queue', () => {
      expect(rotatePlayerToEnd(['p1', 'p2', 'p3'], 'p4')).toEqual(['p1', 'p2', 'p3', 'p4']); // Adds player to end
    });

    it('should handle single player queue', () => {
      expect(rotatePlayerToEnd(['p1'], 'p1')).toEqual(['p1']); // Player moves to end (same position)
      expect(rotatePlayerToEnd(['p1'], 'p2')).toEqual(['p1', 'p2']); // Adds p2 to end
    });

    it('should handle empty or invalid inputs', () => {
      expect(rotatePlayerToEnd([], 'p1')).toEqual(['p1']); // Adds player to empty queue
      expect(rotatePlayerToEnd(null, 'p1')).toEqual([]); // Returns empty array for null queue
      expect(rotatePlayerToEnd(['p1', 'p2'], null)).toEqual(['p1', 'p2']); // Null player ignored
      expect(rotatePlayerToEnd(['p1', 'p2'], undefined)).toEqual(['p1', 'p2']); // Undefined player ignored
    });

    it('should handle duplicate players', () => {
      expect(rotatePlayerToEnd(['p1', 'p2', 'p1'], 'p1')).toEqual(['p2', 'p1']);
    });
  });

  describe('removePlayerFromQueue', () => {
    it('should remove player from queue', () => {
      expect(removePlayerFromQueue(['p1', 'p2', 'p3'], 'p1')).toEqual(['p2', 'p3']);
      expect(removePlayerFromQueue(['p1', 'p2', 'p3'], 'p2')).toEqual(['p1', 'p3']);
      expect(removePlayerFromQueue(['p1', 'p2', 'p3'], 'p3')).toEqual(['p1', 'p2']);
    });

    it('should handle player not in queue', () => {
      expect(removePlayerFromQueue(['p1', 'p2', 'p3'], 'p4')).toEqual(['p1', 'p2', 'p3']);
    });

    it('should remove all instances of player', () => {
      expect(removePlayerFromQueue(['p1', 'p2', 'p1', 'p3'], 'p1')).toEqual(['p2', 'p3']);
    });

    it('should handle empty or invalid inputs', () => {
      expect(removePlayerFromQueue([], 'p1')).toEqual([]);
      expect(removePlayerFromQueue(null, 'p1')).toEqual([]);
      expect(removePlayerFromQueue(['p1', 'p2'], null)).toEqual(['p1', 'p2']);
    });

    it('should result in empty queue when removing last player', () => {
      expect(removePlayerFromQueue(['p1'], 'p1')).toEqual([]);
    });
  });

  describe('addPlayerToQueue', () => {
    it('should add player to end by default', () => {
      expect(addPlayerToQueue(['p1', 'p2'], 'p3')).toEqual(['p1', 'p2', 'p3']);
      expect(addPlayerToQueue(['p1'], 'p2')).toEqual(['p1', 'p2']);
    });

    it('should add player to beginning when position is 0', () => {
      expect(addPlayerToQueue(['p1', 'p2'], 'p3', 0)).toEqual(['p3', 'p1', 'p2']);
    });

    it('should add player at specific position', () => {
      expect(addPlayerToQueue(['p1', 'p2', 'p4'], 'p3', 2)).toEqual(['p1', 'p2', 'p3', 'p4']);
      expect(addPlayerToQueue(['p1', 'p3'], 'p2', 1)).toEqual(['p1', 'p2', 'p3']);
    });

    it('should handle position beyond queue length', () => {
      expect(addPlayerToQueue(['p1', 'p2'], 'p3', 5)).toEqual(['p1', 'p2', 'p3']);
    });

    it('should remove existing player before adding to avoid duplicates', () => {
      expect(addPlayerToQueue(['p1', 'p2', 'p3'], 'p2')).toEqual(['p1', 'p3', 'p2']);
      expect(addPlayerToQueue(['p1', 'p2', 'p3'], 'p2', 0)).toEqual(['p2', 'p1', 'p3']);
    });

    it('should handle empty queue', () => {
      expect(addPlayerToQueue([], 'p1')).toEqual(['p1']);
      expect(addPlayerToQueue(null, 'p1')).toEqual(['p1']);
      expect(addPlayerToQueue(undefined, 'p1')).toEqual(['p1']);
    });

    it('should handle invalid player ID', () => {
      expect(addPlayerToQueue(['p1', 'p2'], null)).toEqual(['p1', 'p2']);
      expect(addPlayerToQueue(['p1', 'p2'], undefined)).toEqual(['p1', 'p2']);
    });
  });

  describe('getPlayerPositionInQueue', () => {
    it('should return correct position for player in queue', () => {
      const queue = ['p1', 'p2', 'p3'];
      expect(getPlayerPositionInQueue(queue, 'p1')).toBe(0);
      expect(getPlayerPositionInQueue(queue, 'p2')).toBe(1);
      expect(getPlayerPositionInQueue(queue, 'p3')).toBe(2);
    });

    it('should return -1 for player not in queue', () => {
      expect(getPlayerPositionInQueue(['p1', 'p2'], 'p3')).toBe(-1);
    });

    it('should return position of first occurrence for duplicates', () => {
      expect(getPlayerPositionInQueue(['p1', 'p2', 'p1'], 'p1')).toBe(0);
    });

    it('should handle empty or invalid inputs', () => {
      expect(getPlayerPositionInQueue([], 'p1')).toBe(-1);
      expect(getPlayerPositionInQueue(null, 'p1')).toBe(-1);
      expect(getPlayerPositionInQueue(['p1', 'p2'], null)).toBe(-1);
    });
  });

  describe('isPlayerNextInQueue', () => {
    it('should return true if player is first in queue', () => {
      expect(isPlayerNextInQueue(['p1', 'p2', 'p3'], 'p1')).toBe(true);
    });

    it('should return false if player is not first', () => {
      expect(isPlayerNextInQueue(['p1', 'p2', 'p3'], 'p2')).toBe(false);
      expect(isPlayerNextInQueue(['p1', 'p2', 'p3'], 'p3')).toBe(false);
    });

    it('should return false for player not in queue', () => {
      expect(isPlayerNextInQueue(['p1', 'p2'], 'p3')).toBe(false);
    });

    it('should handle empty or invalid inputs', () => {
      expect(isPlayerNextInQueue([], 'p1')).toBe(false);
      expect(isPlayerNextInQueue(null, 'p1')).toBe(false);
    });
  });

  describe('isPlayerInQueue', () => {
    it('should return true if player is in queue', () => {
      expect(isPlayerInQueue(['p1', 'p2', 'p3'], 'p1')).toBe(true);
      expect(isPlayerInQueue(['p1', 'p2', 'p3'], 'p2')).toBe(true);
      expect(isPlayerInQueue(['p1', 'p2', 'p3'], 'p3')).toBe(true);
    });

    it('should return false if player is not in queue', () => {
      expect(isPlayerInQueue(['p1', 'p2'], 'p3')).toBe(false);
    });

    it('should handle empty or invalid inputs', () => {
      expect(isPlayerInQueue([], 'p1')).toBe(false);
      expect(isPlayerInQueue(null, 'p1')).toBe(false);
    });
  });

  describe('validateRotationQueue', () => {
    it('should validate valid queue', () => {
      const result = validateRotationQueue(['p1', 'p2', 'p3']);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect invalid queue types', () => {
      let result = validateRotationQueue(null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Queue must be an array');

      result = validateRotationQueue('not-array');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Queue must be an array');
    });

    it('should detect duplicate player IDs', () => {
      const result = validateRotationQueue(['p1', 'p2', 'p1']);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Queue contains duplicate player IDs');
    });

    it('should validate against player list when provided', () => {
      const result = validateRotationQueue(['p1', 'p2', 'p99'], mockPlayers);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Queue contains invalid player IDs: p99');
    });

    it('should handle multiple validation errors', () => {
      const result = validateRotationQueue(['p1', 'p1', 'p99'], mockPlayers);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors).toContain('Queue contains duplicate player IDs');
      expect(result.errors).toContain('Queue contains invalid player IDs: p99');
    });

    it('should ignore null/undefined values in duplicates check', () => {
      const result = validateRotationQueue(['p1', null, 'p2', undefined]);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate empty queue', () => {
      const result = validateRotationQueue([]);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('integration scenarios', () => {
    it('should support complete queue management workflow', () => {
      let queue = ['p1', 'p2', 'p3'];

      // Check if we have enough players
      expect(hasEnoughPlayersInQueue(queue, 2)).toBe(true);

      // Get next players
      expect(getNextActivePlayer(queue)).toBe('p1');
      expect(getNextNextActivePlayer(queue)).toBe('p2');

      // Rotate first player
      queue = rotatePlayerToEnd(queue, 'p1');
      expect(queue).toEqual(['p2', 'p3', 'p1']);

      // Add new player
      queue = addPlayerToQueue(queue, 'p4', 1);
      expect(queue).toEqual(['p2', 'p4', 'p3', 'p1']);

      // Remove a player
      queue = removePlayerFromQueue(queue, 'p3');
      expect(queue).toEqual(['p2', 'p4', 'p1']);

      // Validate final queue
      const validation = validateRotationQueue(queue, mockPlayers);
      expect(validation.isValid).toBe(true);
    });

    it('should handle edge case workflow with empty queue', () => {
      let queue = [];

      expect(hasEnoughPlayersInQueue(queue)).toBe(false);
      expect(getNextActivePlayer(queue)).toBe(null);
      expect(getUpcomingPlayers(queue)).toEqual([]);

      queue = addPlayerToQueue(queue, 'p1');
      expect(queue).toEqual(['p1']);
      expect(hasEnoughPlayersInQueue(queue)).toBe(true);
    });
  });
});