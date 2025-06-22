/**
 * Manages player rotation queue with support for inactive players and manual reordering
 * Inactive players are physically removed from the queue and tracked separately
 */
export class RotationQueue {
  constructor(players = [], getPlayerById = null) {
    this.queue = [...players];
    this.inactivePlayers = []; // Track inactive players separately
    this.getPlayerById = getPlayerById || (() => null);
  }

  /**
   * Get the current queue as an array
   */
  toArray() {
    return [...this.queue];
  }

  /**
   * Get only active players from the queue (now just returns the queue since inactive players are removed)
   */
  getActiveQueue() {
    return [...this.queue];
  }

  /**
   * Get the next N active players in the queue
   */
  getNextActivePlayer(count = 1) {
    if (count === 1) {
      return this.queue[0] || null;
    }
    return this.queue.slice(0, count);
  }

  /**
   * Get all inactive players
   */
  getInactivePlayers() {
    return [...this.inactivePlayers];
  }

  /**
   * Rotate a player to the end of the queue
   */
  rotatePlayer(playerId) {
    console.log('🔄 rotatePlayer() called with:', {
      playerId,
      queueBefore: [...this.queue],
      playerIndex: this.queue.indexOf(playerId)
    });
    
    const playerIndex = this.queue.indexOf(playerId);
    if (playerIndex === -1) {
      console.log('⚠️ rotatePlayer() - Player not found in queue:', playerId);
      return;
    }

    // Remove player from current position
    this.queue.splice(playerIndex, 1);
    console.log('🔄 After removing player:', [...this.queue]);
    
    // Add to end of queue
    this.queue.push(playerId);
    console.log('🔄 After adding to end:', [...this.queue]);
  }

  /**
   * Add a player to the queue at a specific position
   */
  addPlayer(playerId, position = 'end') {
    // Remove if already exists
    this.removePlayer(playerId);
    
    if (position === 'start') {
      this.queue.unshift(playerId);
    } else if (position === 'end') {
      this.queue.push(playerId);
    } else if (typeof position === 'number') {
      this.queue.splice(position, 0, playerId);
    }
  }

  /**
   * Remove a player from the queue
   */
  removePlayer(playerId) {
    const index = this.queue.indexOf(playerId);
    if (index !== -1) {
      this.queue.splice(index, 1);
    }
  }

  /**
   * Move a player to the front of the queue (next to be substituted)
   */
  moveToFront(playerId) {
    this.addPlayer(playerId, 'start');
  }

  /**
   * Reorder queue to prioritize a specific player before another target player
   */
  insertBefore(playerIdToMove, targetPlayerId) {
    const targetIndex = this.queue.indexOf(targetPlayerId);
    if (targetIndex === -1) return;

    // Remove the player to move
    this.removePlayer(playerIdToMove);
    // Insert before target
    this.queue.splice(targetIndex, 0, playerIdToMove);
  }

  /**
   * Handle player becoming inactive - remove from queue and track separately
   */
  deactivatePlayer(playerId) {
    // Remove from active queue
    this.removePlayer(playerId);
    
    // Add to inactive players if not already there
    if (!this.inactivePlayers.includes(playerId)) {
      this.inactivePlayers.push(playerId);
    }
  }

  /**
   * Handle player becoming active again - remove from inactive list and add to end of queue
   */
  reactivatePlayer(playerId) {
    // Remove from inactive players
    const inactiveIndex = this.inactivePlayers.indexOf(playerId);
    if (inactiveIndex !== -1) {
      this.inactivePlayers.splice(inactiveIndex, 1);
    }
    
    // Add to end of queue (they should be last priority to come off field)
    // The "set as next to go in" logic in useGameState will handle making them substitute7_1
    this.addPlayer(playerId, 'end');
  }

  /**
   * Reorder the entire queue based on desired position order
   */
  reorderByPositions(positionOrder) {
    const newQueue = [];
    positionOrder.forEach(playerId => {
      if (playerId && this.queue.includes(playerId)) {
        newQueue.push(playerId);
      }
    });
    
    // Add any remaining players not in the position order
    this.queue.forEach(playerId => {
      if (!newQueue.includes(playerId)) {
        newQueue.push(playerId);
      }
    });
    
    this.queue = newQueue;
  }

  /**
   * Get queue length
   */
  size() {
    return this.queue.length;
  }

  /**
   * Get active queue length (same as queue length since inactive players are removed)
   */
  activeSize() {
    return this.queue.length;
  }

  /**
   * Get inactive players count
   */
  inactiveSize() {
    return this.inactivePlayers.length;
  }

  /**
   * Check if a player is in the queue
   */
  contains(playerId) {
    return this.queue.includes(playerId);
  }

  /**
   * Find the position of a player in the queue
   */
  getPosition(playerId) {
    return this.queue.indexOf(playerId);
  }

  /**
   * Find the position of a player in the active queue (same as regular position now)
   */
  getActivePosition(playerId) {
    return this.queue.indexOf(playerId);
  }

  /**
   * Check if a player is inactive
   */
  isPlayerInactive(playerId) {
    return this.inactivePlayers.includes(playerId);
  }

  /**
   * Initialize the queue by separating active and inactive players
   * Call this after creating the queue to properly separate existing inactive players
   */
  initialize() {
    console.log('🔄 initialize() called - queue before:', [...this.queue]);
    const inactivePlayersFound = [];
    const activePlayersFound = [];

    this.queue.forEach(playerId => {
      const player = this.getPlayerById(playerId);
      if (player?.stats?.isInactive) {
        inactivePlayersFound.push(playerId);
        console.log('🔄 Found inactive player:', playerId);
      } else {
        activePlayersFound.push(playerId);
        console.log('🔄 Found active player:', playerId);
      }
    });

    this.queue = activePlayersFound;
    this.inactivePlayers = inactivePlayersFound;
    console.log('🔄 initialize() complete - active queue:', [...this.queue], 'inactive:', [...this.inactivePlayers]);
  }

  /**
   * Reset the queue with new players and clear inactive list
   */
  reset(players = []) {
    this.queue = [...players];
    this.inactivePlayers = [];
  }

  /**
   * Clone the queue including inactive players
   */
  clone() {
    const cloned = new RotationQueue(this.queue, this.getPlayerById);
    cloned.inactivePlayers = [...this.inactivePlayers];
    return cloned;
  }
}

/**
 * Factory function to create a rotation queue
 */
export function createRotationQueue(players = [], getPlayerById = null) {
  return new RotationQueue(players, getPlayerById);
}