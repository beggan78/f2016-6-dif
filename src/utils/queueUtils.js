/**
 * Queue utility functions for rotation queue operations
 * Centralizes common patterns for accessing and manipulating rotation queues
 */

/**
 * Safely get the first (next) active player from a rotation queue
 * Replaces direct queue[0] access throughout the codebase
 * @param {Array} queue - Rotation queue array
 * @returns {string|null} Next player ID or null if queue is empty
 */
export const getNextActivePlayer = (queue) => {
  if (!queue || !Array.isArray(queue) || queue.length === 0) {
    return null;
  }
  return queue[0] || null;
};

/**
 * Safely get the second (next-next) active player from a rotation queue
 * Replaces direct queue[1] access throughout the codebase
 * @param {Array} queue - Rotation queue array
 * @returns {string|null} Next-next player ID or null if not available
 */
export const getNextNextActivePlayer = (queue) => {
  if (!queue || !Array.isArray(queue) || queue.length < 2) {
    return null;
  }
  return queue[1] || null;
};

/**
 * Get multiple upcoming players from the rotation queue
 * @param {Array} queue - Rotation queue array
 * @param {number} count - Number of players to retrieve (default: 2)
 * @returns {Array} Array of player IDs (may be shorter than count if queue is small)
 */
export const getUpcomingPlayers = (queue, count = 2) => {
  if (!queue || !Array.isArray(queue)) {
    return [];
  }
  
  return queue.slice(0, count).filter(Boolean);
};

/**
 * Check if rotation queue has enough players for operation
 * @param {Array} queue - Rotation queue array
 * @param {number} minRequired - Minimum number of players required (default: 1)
 * @returns {boolean} True if queue has enough players, false otherwise
 */
export const hasEnoughPlayersInQueue = (queue, minRequired = 1) => {
  if (!queue || !Array.isArray(queue)) {
    return false;
  }
  
  const activeCount = queue.filter(Boolean).length;
  return activeCount >= minRequired;
};

/**
 * Move player to end of rotation queue (standard rotation)
 * @param {Array} queue - Rotation queue array
 * @param {string} playerId - Player ID to rotate
 * @returns {Array} New queue with player moved to end
 */
export const rotatePlayerToEnd = (queue, playerId) => {
  if (!queue || !Array.isArray(queue) || !playerId) {
    return queue || [];
  }
  
  const filteredQueue = queue.filter(id => id !== playerId);
  return [...filteredQueue, playerId];
};

/**
 * Remove player from rotation queue
 * @param {Array} queue - Rotation queue array
 * @param {string} playerId - Player ID to remove
 * @returns {Array} New queue without the player
 */
export const removePlayerFromQueue = (queue, playerId) => {
  if (!queue || !Array.isArray(queue) || !playerId) {
    return queue || [];
  }
  
  return queue.filter(id => id !== playerId);
};

/**
 * Add player to rotation queue at specific position
 * @param {Array} queue - Rotation queue array
 * @param {string} playerId - Player ID to add
 * @param {number} position - Position to insert at (0 = first, -1 = last)
 * @returns {Array} New queue with player added
 */
export const addPlayerToQueue = (queue, playerId, position = -1) => {
  if (!playerId) {
    return queue || [];
  }
  
  const workingQueue = queue || [];
  
  // Remove player if already exists to avoid duplicates
  const cleanQueue = workingQueue.filter(id => id !== playerId);
  
  if (position === -1 || position >= cleanQueue.length) {
    // Add to end
    return [...cleanQueue, playerId];
  } else if (position === 0) {
    // Add to beginning
    return [playerId, ...cleanQueue];
  } else {
    // Add at specific position
    const newQueue = [...cleanQueue];
    newQueue.splice(position, 0, playerId);
    return newQueue;
  }
};

/**
 * Get player's position in rotation queue
 * @param {Array} queue - Rotation queue array
 * @param {string} playerId - Player ID to find
 * @returns {number} Position in queue (0-based) or -1 if not found
 */
export const getPlayerPositionInQueue = (queue, playerId) => {
  if (!queue || !Array.isArray(queue) || !playerId) {
    return -1;
  }
  
  return queue.indexOf(playerId);
};

/**
 * Check if player is next in rotation queue
 * @param {Array} queue - Rotation queue array
 * @param {string} playerId - Player ID to check
 * @returns {boolean} True if player is next (position 0), false otherwise
 */
export const isPlayerNextInQueue = (queue, playerId) => {
  return getNextActivePlayer(queue) === playerId;
};

/**
 * Check if player is in rotation queue at all
 * @param {Array} queue - Rotation queue array
 * @param {string} playerId - Player ID to check
 * @returns {boolean} True if player is in queue, false otherwise
 */
export const isPlayerInQueue = (queue, playerId) => {
  return getPlayerPositionInQueue(queue, playerId) !== -1;
};

/**
 * Validate rotation queue structure and contents
 * @param {Array} queue - Rotation queue array
 * @param {Array} allPlayers - Array of all valid players for validation
 * @returns {Object} Validation result with isValid and errors properties
 */
export const validateRotationQueue = (queue, allPlayers = []) => {
  const errors = [];
  
  if (!queue || !Array.isArray(queue)) {
    errors.push('Queue must be an array');
    return { isValid: false, errors };
  }
  
  // Check for duplicates
  const uniqueIds = new Set(queue.filter(Boolean));
  if (uniqueIds.size !== queue.filter(Boolean).length) {
    errors.push('Queue contains duplicate player IDs');
  }
  
  // Validate player IDs exist if allPlayers provided
  if (allPlayers.length > 0) {
    const validPlayerIds = new Set(allPlayers.map(p => p.id));
    const invalidIds = queue.filter(id => id && !validPlayerIds.has(id));
    if (invalidIds.length > 0) {
      errors.push(`Queue contains invalid player IDs: ${invalidIds.join(', ')}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};