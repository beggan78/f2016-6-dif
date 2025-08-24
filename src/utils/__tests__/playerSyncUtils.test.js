/**
 * Tests for playerSyncUtils.js - Player Synchronization Utilities
 * 
 * Comprehensive test suite for player synchronization between team roster (Supabase)
 * and game state (localStorage). Tests cover data conversion, merging, sync logic,
 * localStorage operations, and performance scenarios.
 */

import {
  convertTeamPlayerToGamePlayer,
  mergePlayerData,
  syncTeamPlayersToGameState,
  syncPlayersToLocalStorage,
  syncTeamRosterToGameState,
  analyzePlayerSync
} from '../playerSyncUtils';

// Mock persistenceManager
jest.mock('../persistenceManager', () => ({
  createGamePersistenceManager: jest.fn(() => ({
    loadState: jest.fn(),
    saveState: jest.fn()
  }))
}));

describe('playerSyncUtils', () => {
  let mockPersistenceManager;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock console methods to avoid noise in test output
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    
    // Setup mock persistence manager - get the already mocked instance
    const { createGamePersistenceManager } = require('../persistenceManager');
    mockPersistenceManager = {
      loadState: jest.fn(),
      saveState: jest.fn()
    };
    createGamePersistenceManager.mockReturnValue(mockPersistenceManager);
  });

  afterEach(() => {
    // Restore console methods
    console.log.mockRestore();
    console.warn.mockRestore();
    console.error.mockRestore();
  });

  // Mock data for testing
  const mockTeamPlayer = {
    id: 'team-player-1',
    name: 'John Doe',
    jersey_number: 10,
    on_roster: true
  };

  const mockExistingGamePlayer = {
    id: 'team-player-1',
    name: 'John Smith', // Different name (will be updated)
    jerseyNumber: 5,    // Different jersey (will be updated)
    stats: {
      currentPosition: 'leftDefender',
      currentRole: 'defender',
      currentStatus: 'on_field',
      timeOnFieldSeconds: 450,
      timeAsDefenderSeconds: 300,
      timeAsAttackerSeconds: 0,
      timeAsGoalieSeconds: 0,
      timeAsMidfielderSeconds: 0,
      lastStintStartTimeEpoch: Date.now() - 450000,
      isInactive: false,
      isCaptain: false
    }
  };

  const mockGamePlayerWithoutMatch = {
    id: 'game-only-player',
    name: 'Local Player',
    jerseyNumber: 99,
    stats: {
      timeOnFieldSeconds: 0,
      isInactive: false
    }
  };

  describe('convertTeamPlayerToGamePlayer', () => {
    it('should convert team player to game player format', () => {
      const result = convertTeamPlayerToGamePlayer(mockTeamPlayer);

      expect(result).toEqual({
        id: 'team-player-1',
        name: 'John Doe',
        jerseyNumber: 10,
        stats: {
          currentPosition: null,
          currentRole: null,
          currentStatus: 'substitute',
          isCaptain: false,
          isInactive: false,
          lastStintStartTimeEpoch: null,
          startedMatchAs: null,
          timeAsAttackerSeconds: 0,
          timeAsDefenderSeconds: 0,
          timeAsGoalieSeconds: 0,
          timeAsMidfielderSeconds: 0,
          timeOnFieldSeconds: 0
        }
      });
    });

    it('should handle player without jersey number', () => {
      const playerWithoutJersey = { ...mockTeamPlayer };
      delete playerWithoutJersey.jersey_number;

      const result = convertTeamPlayerToGamePlayer(playerWithoutJersey);
      expect(result.jerseyNumber).toBe(null);
    });

    it('should handle minimal player data', () => {
      const minimalPlayer = {
        id: 'minimal-1',
        name: 'Minimal Player'
      };

      const result = convertTeamPlayerToGamePlayer(minimalPlayer);
      expect(result.id).toBe('minimal-1');
      expect(result.name).toBe('Minimal Player');
      expect(result.jerseyNumber).toBe(null);
      expect(result.stats).toBeDefined();
    });

    it('should create consistent stats structure', () => {
      const result = convertTeamPlayerToGamePlayer(mockTeamPlayer);
      
      expect(result.stats).toMatchObject({
        currentStatus: 'substitute',
        timeOnFieldSeconds: 0,
        timeAsDefenderSeconds: 0,
        timeAsAttackerSeconds: 0,
        timeAsGoalieSeconds: 0,
        timeAsMidfielderSeconds: 0
      });
    });
  });

  describe('mergePlayerData', () => {
    it('should merge team player data into existing game player', () => {
      const result = mergePlayerData(mockTeamPlayer, mockExistingGamePlayer);

      expect(result).toEqual({
        ...mockExistingGamePlayer,
        name: 'John Doe',        // Updated from team
        jerseyNumber: 10,        // Updated from team
        // stats preserved entirely
        stats: mockExistingGamePlayer.stats
      });
    });

    it('should preserve all game stats during merge', () => {
      const result = mergePlayerData(mockTeamPlayer, mockExistingGamePlayer);

      expect(result.stats).toEqual(mockExistingGamePlayer.stats);
      expect(result.stats.timeOnFieldSeconds).toBe(450);
      expect(result.stats.currentPosition).toBe('leftDefender');
      expect(result.stats.currentStatus).toBe('on_field');
    });

    it('should fallback to existing jersey number when team has none', () => {
      const teamPlayerNoJersey = { ...mockTeamPlayer };
      delete teamPlayerNoJersey.jersey_number;

      const result = mergePlayerData(teamPlayerNoJersey, mockExistingGamePlayer);
      expect(result.jerseyNumber).toBe(5); // Existing jersey preserved
    });

    it('should update name even when similar', () => {
      const teamPlayerSimilarName = {
        ...mockTeamPlayer,
        name: 'John DOE'  // Different capitalization
      };

      const result = mergePlayerData(teamPlayerSimilarName, mockExistingGamePlayer);
      expect(result.name).toBe('John DOE');
    });

    it('should handle null jersey number from team', () => {
      const teamPlayerNullJersey = {
        ...mockTeamPlayer,
        jersey_number: null
      };

      const result = mergePlayerData(teamPlayerNullJersey, mockExistingGamePlayer);
      expect(result.jerseyNumber).toBe(5); // Existing jersey preserved
    });
  });

  describe('syncTeamPlayersToGameState', () => {
    const mockTeamPlayers = [
      mockTeamPlayer,
      {
        id: 'team-player-2',
        name: 'Jane Smith',
        jersey_number: 7,
        on_roster: true
      }
    ];

    const mockExistingPlayers = [
      mockExistingGamePlayer,
      mockGamePlayerWithoutMatch
    ];

    it('should sync new and existing players correctly', () => {
      const result = syncTeamPlayersToGameState(mockTeamPlayers, mockExistingPlayers);

      expect(result).toHaveLength(3);
      
      // First player should be merged
      const mergedPlayer = result.find(p => p.id === 'team-player-1');
      expect(mergedPlayer.name).toBe('John Doe');
      expect(mergedPlayer.stats.timeOnFieldSeconds).toBe(450); // Stats preserved
      
      // Second player should be newly converted
      const newPlayer = result.find(p => p.id === 'team-player-2');
      expect(newPlayer.name).toBe('Jane Smith');
      expect(newPlayer.stats.timeOnFieldSeconds).toBe(0); // New player stats
      
      // Local player should be preserved
      const localPlayer = result.find(p => p.id === 'game-only-player');
      expect(localPlayer.name).toBe('Local Player');
    });

    it('should handle empty team players', () => {
      const result = syncTeamPlayersToGameState([], mockExistingPlayers);
      expect(result).toEqual(mockExistingPlayers);
    });

    it('should handle empty existing players', () => {
      const result = syncTeamPlayersToGameState(mockTeamPlayers, []);
      expect(result).toHaveLength(2);
      
      result.forEach(player => {
        expect(player.stats.timeOnFieldSeconds).toBe(0);
      });
    });

    it('should handle null inputs gracefully', () => {
      expect(syncTeamPlayersToGameState(null, mockExistingPlayers)).toEqual(mockExistingPlayers);
      expect(syncTeamPlayersToGameState(undefined, mockExistingPlayers)).toEqual(mockExistingPlayers);
      expect(syncTeamPlayersToGameState(mockTeamPlayers, null)).toHaveLength(2);
    });

    it('should preserve player order from team roster', () => {
      const result = syncTeamPlayersToGameState(mockTeamPlayers, []);
      
      expect(result[0].id).toBe('team-player-1');
      expect(result[1].id).toBe('team-player-2');
    });

    it('should handle players with missing IDs gracefully', () => {
      const playersWithMissingIds = [
        { name: 'No ID Player' },
        mockTeamPlayer,
        { id: '', name: 'Empty ID Player' }
      ];

      const result = syncTeamPlayersToGameState(playersWithMissingIds, []);
      
      // Should only process valid players with IDs
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('team-player-1');
    });
  });

  describe('syncPlayersToLocalStorage', () => {
    const mockUpdatedPlayers = [mockExistingGamePlayer];

    beforeEach(() => {
      mockPersistenceManager.loadState.mockReturnValue({
        allPlayers: [],
        otherGameState: 'preserved'
      });
      mockPersistenceManager.saveState.mockImplementation(() => {});
    });

    it('should save players to localStorage successfully', () => {
      const result = syncPlayersToLocalStorage(mockUpdatedPlayers, mockPersistenceManager);

      expect(result).toBe(true);
      expect(mockPersistenceManager.loadState).toHaveBeenCalled();
      expect(mockPersistenceManager.saveState).toHaveBeenCalledWith({
        allPlayers: mockUpdatedPlayers,
        otherGameState: 'preserved'
      });
    });

    it('should preserve other game state during save', () => {
      mockPersistenceManager.loadState.mockReturnValue({
        allPlayers: [{ id: 'old-player' }],
        currentPeriod: 2,
        matchStartTime: Date.now(),
        gameLog: ['event1', 'event2']
      });

      syncPlayersToLocalStorage(mockUpdatedPlayers, mockPersistenceManager);

      expect(mockPersistenceManager.saveState).toHaveBeenCalledWith({
        allPlayers: mockUpdatedPlayers,
        currentPeriod: 2,
        matchStartTime: expect.any(Number),
        gameLog: ['event1', 'event2']
      });
    });

    it('should handle localStorage save errors', () => {
      mockPersistenceManager.saveState.mockImplementation(() => {
        throw new Error('localStorage full');
      });

      const result = syncPlayersToLocalStorage(mockUpdatedPlayers, mockPersistenceManager);
      expect(result).toBe(false);
    });

    it('should handle localStorage load errors', () => {
      mockPersistenceManager.loadState.mockImplementation(() => {
        throw new Error('localStorage corrupted');
      });

      const result = syncPlayersToLocalStorage(mockUpdatedPlayers, mockPersistenceManager);
      expect(result).toBe(false);
    });
  });

  describe('syncTeamRosterToGameState', () => {
    const mockCurrentAllPlayers = [mockExistingGamePlayer];
    const mockTeamPlayers = [mockTeamPlayer];

    beforeEach(() => {
      mockPersistenceManager.loadState.mockReturnValue({ allPlayers: [] });
      mockPersistenceManager.saveState.mockImplementation(() => {});
    });

    it('should perform complete sync successfully', () => {
      const result = syncTeamRosterToGameState(mockTeamPlayers, mockCurrentAllPlayers, mockPersistenceManager);

      expect(result.success).toBe(true);
      expect(result.players).toHaveLength(1);
      expect(result.message).toBe('Synced 1 roster players to game state');
      expect(result.players[0].name).toBe('John Doe');
      expect(result.players[0].stats.timeOnFieldSeconds).toBe(450);
    });

    it('should handle localStorage save failure', () => {
      mockPersistenceManager.saveState.mockImplementation(() => {
        throw new Error('Save failed');
      });

      const result = syncTeamRosterToGameState(mockTeamPlayers, mockCurrentAllPlayers, mockPersistenceManager);

      expect(result.success).toBe(false);
      expect(result.players).toEqual(mockCurrentAllPlayers);
      expect(result.error).toBe('Failed to save to localStorage');
    });

    it('should handle sync logic errors', () => {
      // Mock an error in the syncPlayersToLocalStorage function
      mockPersistenceManager.loadState.mockImplementation(() => {
        throw new Error('Sync logic error');
      });

      const result = syncTeamRosterToGameState(mockTeamPlayers, mockCurrentAllPlayers, mockPersistenceManager);

      expect(result.success).toBe(false);
      expect(result.players).toEqual(mockCurrentAllPlayers);
      expect(result.error).toBe('Failed to save to localStorage');
    });
  });

  describe('analyzePlayerSync', () => {
    const mockTeamPlayers = [
      { id: 'player-1', name: 'Player 1' },
      { id: 'player-2', name: 'Player 2' },
      { id: 'player-3', name: 'Player 3' }
    ];

    const mockAllPlayers = [
      { id: 'player-1', name: 'Player 1' },
      { id: 'player-2', name: 'Player 2' },
      { id: 'player-4', name: 'Player 4' } // Extra player not in team
    ];

    it('should analyze sync requirements correctly', () => {
      const result = analyzePlayerSync(mockTeamPlayers, mockAllPlayers);

      expect(result.needsSync).toBe(true);
      expect(result.missingFromGame).toHaveLength(1);
      expect(result.missingFromGame[0].id).toBe('player-3');
      expect(result.extraInGame).toHaveLength(1);
      expect(result.extraInGame[0].id).toBe('player-4');
      expect(result.summary).toBe('Team: 3, Game: 3, Missing: 1');
    });

    it('should detect no sync needed when players match', () => {
      const matchingPlayers = [
        { id: 'player-1', name: 'Player 1' },
        { id: 'player-2', name: 'Player 2' }
      ];

      const result = analyzePlayerSync(matchingPlayers, matchingPlayers);

      expect(result.needsSync).toBe(false);
      expect(result.missingFromGame).toHaveLength(0);
      expect(result.extraInGame).toHaveLength(0);
    });

    it('should handle empty arrays', () => {
      const result = analyzePlayerSync([], []);
      
      expect(result.needsSync).toBe(false);
      expect(result.summary).toBe('Team: 0, Game: 0, Missing: 0');
    });

    it('should handle null/undefined inputs', () => {
      const result = analyzePlayerSync(null, undefined);
      
      expect(result.needsSync).toBe(false);
      expect(result.missingFromGame).toEqual([]);
      expect(result.extraInGame).toEqual([]);
    });

    it('should ignore players without IDs', () => {
      const playersWithoutIds = [
        { id: 'player-1', name: 'Player 1' },
        { name: 'No ID Player' },
        { id: '', name: 'Empty ID Player' }
      ];

      const result = analyzePlayerSync(playersWithoutIds, []);
      
      expect(result.summary).toContain('Team: 3'); // Counts all team players
      expect(result.missingFromGame).toHaveLength(1); // Only valid ID player
      expect(result.missingFromGame[0].id).toBe('player-1');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle malformed team player objects', () => {
      const malformedTeamPlayers = [
        null,
        undefined,
        {},
        { id: 'valid-1', name: 'Valid Player' },
        { name: 'No ID' },
        { id: '' }
      ];

      const result = syncTeamPlayersToGameState(malformedTeamPlayers, []);
      
      // Should only process the valid player
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('valid-1');
    });

    it('should handle circular references gracefully', () => {
      const circular1 = { id: 'circular-1', name: 'Circular 1' };
      const circular2 = { id: 'circular-2', name: 'Circular 2' };
      circular1.ref = circular2;
      circular2.ref = circular1;

      expect(() => {
        syncTeamPlayersToGameState([circular1], []);
      }).not.toThrow();
    });

    it('should handle very long player names', () => {
      const longNamePlayer = {
        id: 'long-name-1',
        name: 'A'.repeat(1000),
        jersey_number: 1
      };

      const result = convertTeamPlayerToGamePlayer(longNamePlayer);
      expect(result.name).toBe('A'.repeat(1000));
    });

    it('should handle special characters in player data', () => {
      const specialCharPlayer = {
        id: 'special-1',
        name: 'José María-González O\'Reilly 中文 🏆',
        jersey_number: 10
      };

      const result = convertTeamPlayerToGamePlayer(specialCharPlayer);
      expect(result.name).toBe('José María-González O\'Reilly 中文 🏆');
    });
  });

  describe('performance tests', () => {
    it('should handle large roster synchronization efficiently', () => {
      // Create large dataset
      const largeTeamRoster = Array.from({ length: 100 }, (_, i) => ({
        id: `team-player-${i + 1}`,
        name: `Team Player ${i + 1}`,
        jersey_number: i + 1
      }));

      const largeExistingPlayers = Array.from({ length: 50 }, (_, i) => ({
        id: `team-player-${i + 1}`,
        name: `Existing Player ${i + 1}`,
        jerseyNumber: i + 100,
        stats: {
          timeOnFieldSeconds: i * 30,
          currentStatus: 'substitute',
          isInactive: false
        }
      }));

      const startTime = Date.now();
      const result = syncTeamPlayersToGameState(largeTeamRoster, largeExistingPlayers);
      const duration = Date.now() - startTime;

      expect(result).toHaveLength(100);
      expect(duration).toBeLessThan(100); // Should complete in <100ms
    });

    it('should handle sync analysis for large datasets efficiently', () => {
      const largeTeamRoster = Array.from({ length: 500 }, (_, i) => ({
        id: `player-${i}`,
        name: `Player ${i}`
      }));

      const largeGamePlayers = Array.from({ length: 300 }, (_, i) => ({
        id: `player-${i + 100}`, // Overlap with some team players
        name: `Game Player ${i}`
      }));

      const startTime = Date.now();
      const result = analyzePlayerSync(largeTeamRoster, largeGamePlayers);
      const duration = Date.now() - startTime;

      expect(result.summary).toContain('Team: 500');
      expect(result.summary).toContain('Game: 300');
      expect(duration).toBeLessThan(50); // Analysis should be fast
    });
  });

  describe('integration scenarios', () => {
    it('should support complete roster management workflow', () => {
      // Initial team roster
      let teamRoster = [
        { id: 'player-1', name: 'Alice', jersey_number: 10 },
        { id: 'player-2', name: 'Bob', jersey_number: 7 }
      ];

      // Start with empty game state
      let gameState = [];

      // First sync - new players
      let syncResult = syncTeamRosterToGameState(teamRoster, gameState);
      expect(syncResult.success).toBe(true);
      gameState = syncResult.players;
      expect(gameState).toHaveLength(2);

      // Simulate some game activity
      gameState[0].stats.timeOnFieldSeconds = 300;
      gameState[0].stats.currentStatus = 'on_field';

      // Add new player to team roster
      teamRoster.push({ id: 'player-3', name: 'Charlie', jersey_number: 9 });

      // Second sync - preserve existing stats, add new player
      syncResult = syncTeamRosterToGameState(teamRoster, gameState);
      expect(syncResult.success).toBe(true);
      gameState = syncResult.players;
      expect(gameState).toHaveLength(3);

      // Verify existing player stats preserved
      const alice = gameState.find(p => p.id === 'player-1');
      expect(alice.stats.timeOnFieldSeconds).toBe(300);
      expect(alice.stats.currentStatus).toBe('on_field');

      // Verify new player properly initialized
      const charlie = gameState.find(p => p.id === 'player-3');
      expect(charlie.stats.timeOnFieldSeconds).toBe(0);
      expect(charlie.stats.currentStatus).toBe('substitute');
    });
  });
});