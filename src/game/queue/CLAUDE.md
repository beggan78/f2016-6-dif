# Rotation Queue Module - Claude Code Memory

## Purpose
Manages ordered list of players for substitution rotation with inactive player support. Provides queue manipulation operations and tracks inactive players separately from active rotation. Integrates with game logic for substitution decisions.

## Key Files

### `rotationQueue.js` - Player Rotation Management
**Main Class**: `RotationQueue` - Complete queue management with inactive player support

**Core Properties**:
- `queue`: Array of active player IDs in rotation order
- `inactivePlayers`: Array of inactive player IDs (removed from rotation)
- `getPlayerById`: Player lookup function for status checking

## Core Operations

### Queue Management
- `toArray()`: Returns current queue as array
- `getActiveQueue()`: Returns active players (same as toArray)
- `size()`: Total queue length
- `activeSize()`: Active players count
- `inactiveSize()`: Inactive players count

### Player Access
- `getNextActivePlayer(count = 1)`: Get next N players to be substituted
- `getInactivePlayers()`: Get all inactive players
- `contains(playerId)`: Check if player is in active queue
- `getPosition(playerId)`: Get player's position in queue

### Queue Manipulation
- `rotatePlayer(playerId)`: Move player to end of queue (standard substitution)
- `addPlayer(playerId, position)`: Add player at specific position
- `removePlayer(playerId)`: Remove player from queue entirely
- `moveToFront(playerId)`: Make player next to be substituted
- `insertBefore(playerIdToMove, targetPlayerId)`: Insert player before another

### Inactive Player Management
- `deactivatePlayer(playerId)`: Remove player from active rotation
- `reactivatePlayer(playerId)`: Return player to active rotation
- `isPlayerInactive(playerId)`: Check if player is inactive

### Advanced Operations
- `initialize()`: Separate active/inactive players based on player data
- `reorderByPositions(positionOrder)`: Completely reorder queue
- `reset(players)`: Replace entire queue and clear inactive list
- `clone()`: Create deep copy of queue including inactive players

## Usage Patterns

### Standard Queue Operations
```javascript
import { createRotationQueue } from './queue/rotationQueue';
import { createPlayerLookup } from '../utils/playerUtils';

// Create queue with player lookup for inactive status checking
const queueManager = createRotationQueue(
  gameState.rotationQueue, 
  createPlayerLookup(gameState.allPlayers)
);

// Initialize to separate active/inactive players
queueManager.initialize();

// Perform standard substitution
queueManager.rotatePlayer(substitutedPlayerId);

// Update game state
const newGameState = {
  ...gameState,
  rotationQueue: queueManager.toArray()
};
```

### Inactive Player Management (7-Player Mode)
```javascript
// Deactivate a substitute player
queueManager.deactivatePlayer(playerId);

// Reactivate player (goes to end of queue)
queueManager.reactivatePlayer(playerId);

// Check if player is inactive
if (queueManager.isPlayerInactive(playerId)) {
  // Handle inactive player logic
}
```

### Queue Reordering
```javascript
// Reorder based on time balance
const timeBasedOrder = players
  .sort((a, b) => a.stats.timeOnFieldSeconds - b.stats.timeOnFieldSeconds)
  .map(p => p.id);

queueManager.reorderByPositions(timeBasedOrder);
```

## Rotation Principles

### Round-Robin During Periods
- Rotation queue remains fixed during periods - no rebuilding based on playing times
- Players rotate in established order to ensure predictable, fair rotations
- Next player to substitute off is always the first player in the rotation queue
- After substitution, the outgoing player moves to the end of the queue

### Time-Based Initialization (Periods 2+)
- Rotation queue is rebuilt based on accumulated playing times from previous periods
- Players are sorted by total field time (ascending - least time first)
- The 4 players with least accumulated time are selected for field positions
- Remaining players become substitutes, ordered by playing time

## Team Configuration-Specific Behavior

### Individual Rotation Mode

#### 6-Player Squads
- Simple rotation: substituted player moves to end
- Next player is always queue[0]
- Single substitute position
- Compatible with all formations

#### 7+ Player Squads  
- Complex rotation with next/next-next tracking for multiple substitutes
- Inactive player support (players can be temporarily removed from rotation)
- Multiple substitute positions (`substitute_1`, `substitute_2`, etc.)
- Reactivation puts player at end of queue (lowest priority)
- Formation-independent behavior

## Example Rotation Flow (6-Player Mode)

### Period Start Queue
```
[Player A, Player B, Player C, Player D, Player E]
- Field: A, B, C, D (positions assigned by role balance)  
- Substitute: E
```

### After First Substitution
```
[Player B, Player C, Player D, Player E, Player A]
- Player A (most time) comes off → becomes substitute
- Player E comes on → takes Player A's position
- Queue rotates: A moves to end, B becomes next to rotate off
```

## Integration with Game Logic

### During Substitutions
```javascript
// In gameStateLogic.js - goalie switch example
const queueManager = createRotationQueue(gameState.rotationQueue, createPlayerLookup(allPlayers));
queueManager.initialize();

// Get new goalie's position in queue before removing them
const newGoalieQueuePosition = queueManager.getPosition(newGoalieId);

// Remove new goalie from queue (they're now goalie, not in rotation)
queueManager.removePlayer(newGoalieId);

// Former goalie takes new goalie's exact queue position
if (newGoalieQueuePosition >= 0) {
  queueManager.addPlayer(formation.goalie, newGoalieQueuePosition);
} else {
  queueManager.addPlayer(formation.goalie, 'end');
}
```

### Queue Integrity
- Manual player selection updates tracking but preserves queue order
- Inactive player management maintains queue structure
- Position switches between players don't affect rotation order

## Debugging Commands

### Queue State Inspection
```javascript
console.log('Active queue:', queue.getActiveQueue());
console.log('Inactive players:', queue.getInactivePlayers());
console.log('Next player:', queue.getNextActivePlayer());
console.log('Queue position for player:', queue.getPosition(playerId));
```

### Queue Validation
```javascript
// Check queue integrity
console.log('Active size:', queue.activeSize());
console.log('Total size:', queue.size());
console.log('Contains player:', queue.contains(playerId));
```

## Common Issues

### Queue Desync
- **Problem**: Queue doesn't match actual player positions
- **Solution**: Ensure `initialize()` called after loading state
- **Prevention**: Always initialize queue after state changes

### Inactive Player Bugs
- **Problem**: Inactive players appearing in rotation
- **Solution**: Check `getPlayerById` function for accurate inactive status
- **Prevention**: Use `initialize()` to separate active/inactive correctly

### Position Tracking
- **Problem**: Wrong player being substituted
- **Solution**: Verify queue order matches expected rotation
- **Prevention**: Use debugging commands to inspect queue state

## When to Modify
- Adding new queue ordering algorithms
- Implementing complex rotation rules  
- Adding queue validation logic
- Extending inactive player behavior
- Modifying formation-specific rotation patterns
- Adding new player status types that affect rotation
