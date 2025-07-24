/**
 * DataSyncManager Tests
 * 
 * Comprehensive testing suite for the DataSyncManager - handles synchronization between
 * localStorage and Supabase database for match data persistence.
 * 
 * Test Coverage:
 * - Constructor and state management
 * - Match data persistence (local and cloud)
 * - Data retrieval operations
 * - Cloud synchronization and migration
 * - Error handling and fallback scenarios
 * - Integration with authentication state
 */

import { DataSyncManager, dataSyncManager, updateDataSyncUser } from '../DataSyncManager';

// Mock the Supabase module
jest.mock('../../lib/supabase', () => {
  const mockDatabase = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis()
  };

  return {
    supabase: {
      from: jest.fn(() => mockDatabase)
    }
  };
});

// Import the mocked supabase after setting up the mock
const { supabase } = require('../../lib/supabase');

describe('DataSyncManager', () => {
  let manager;
  let mockLocalStorage;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock localStorage
    mockLocalStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn()
    };
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });

    // Mock console methods to reduce noise in tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});

    // Create fresh instance for each test
    manager = new DataSyncManager();
  });

  afterEach(() => {
    // Restore console methods
    console.error.mockRestore();
    console.log.mockRestore();
  });

  describe('Constructor and State Management', () => {
    it('should initialize with null userId and unauthenticated state', () => {
      const manager = new DataSyncManager();
      
      expect(manager.userId).toBe(null);
      expect(manager.isAuthenticated).toBe(false);
    });

    it('should initialize with provided userId and authenticated state', () => {
      const userId = 'user_123';
      const manager = new DataSyncManager(userId);
      
      expect(manager.userId).toBe(userId);
      expect(manager.isAuthenticated).toBe(true);
    });

    it('should handle falsy userId as unauthenticated', () => {
      const manager = new DataSyncManager('');
      
      expect(manager.userId).toBe('');
      expect(manager.isAuthenticated).toBe(false);
    });

    it('should update userId and authentication state', () => {
      const manager = new DataSyncManager();
      
      expect(manager.isAuthenticated).toBe(false);
      
      manager.setUserId('user_456');
      
      expect(manager.userId).toBe('user_456');
      expect(manager.isAuthenticated).toBe(true);
    });

    it('should handle setting userId to null', () => {
      const manager = new DataSyncManager('user_123');
      
      expect(manager.isAuthenticated).toBe(true);
      
      manager.setUserId(null);
      
      expect(manager.userId).toBe(null);
      expect(manager.isAuthenticated).toBe(false);
    });
  });

  describe('Local Match Storage', () => {
    it('should save match to localStorage when unauthenticated', async () => {
      const matchData = {
        teamMode: 'INDIVIDUAL_6',
        numPeriods: 3,
        periodDurationMinutes: 15,
        homeScore: 2,
        awayScore: 1,
        players: []
      };

      mockLocalStorage.getItem.mockReturnValue('[]');

      const result = await manager.saveMatch(matchData);

      expect(result.success).toBe(true);
      expect(result.storage).toBe('local');
      expect(result.match).toHaveProperty('id');
      expect(result.match.id).toMatch(/^local_\d+$/);
      expect(result.match.source).toBe('local');
      expect(result.match.savedAt).toBeTruthy();
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'dif-coach-match-history',
        expect.any(String)
      );
    });

    it('should limit localStorage to 10 matches for anonymous users', () => {
      const existingMatches = Array.from({ length: 15 }, (_, i) => ({
        id: `local_${i}`,
        homeScore: i,
        awayScore: 0
      }));

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(existingMatches));

      const matchData = { homeScore: 3, awayScore: 1 };
      manager.saveMatchToLocal(matchData);

      // Should have been called with exactly 10 matches (9 existing + 1 new)
      const savedData = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
      expect(savedData).toHaveLength(10);
      expect(savedData[9].homeScore).toBe(3); // New match should be last
    });

    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const result = manager.saveMatchToLocal({ homeScore: 1, awayScore: 0 });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Storage quota exceeded');
      expect(result.storage).toBe('local');
    });

    it('should retrieve local matches correctly', () => {
      const storedMatches = [
        { id: 'local_1', homeScore: 1, awayScore: 0 },
        { id: 'local_2', homeScore: 0, awayScore: 2 }
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedMatches));

      const matches = manager.getLocalMatches();

      expect(matches).toEqual(storedMatches);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('dif-coach-match-history');
    });

    it('should handle corrupted localStorage data', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json-data');

      const matches = manager.getLocalMatches();

      expect(matches).toEqual([]);
      expect(console.error).toHaveBeenCalledWith('Error parsing local match history:', expect.any(Error));
    });

    it('should return empty array when no local data exists', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const matches = manager.getLocalMatches();

      expect(matches).toEqual([]);
    });
  });

  describe('Cloud Match Storage', () => {
    beforeEach(() => {
      manager.setUserId('user_123');
    });

    it('should save match to cloud when authenticated', async () => {
      const matchData = {
        teamMode: 'INDIVIDUAL_6',
        numPeriods: 3,
        periodDurationMinutes: 15,
        homeScore: 2,
        awayScore: 1,
        players: [],
        opponentTeamName: 'Rival Team'
      };

      const mockTeamId = 'team_456';
      const mockMatch = {
        id: 'match_789',
        team_id: mockTeamId,
        formation: 'INDIVIDUAL_6',
        goals_scored: 2,
        goals_conceded: 1
      };

      // Mock getCurrentTeamId
      manager.getCurrentTeamId = jest.fn().mockResolvedValue(mockTeamId);

      // Mock successful match insert
      supabase.from().single.mockResolvedValue({
        data: mockMatch,
        error: null
      });

      const result = await manager.saveMatch(matchData);

      expect(result.success).toBe(true);
      expect(result.storage).toBe('cloud');
      expect(result.match).toEqual(mockMatch);
      expect(result.message).toBe('Match saved to your history successfully!');
      expect(supabase.from).toHaveBeenCalledWith('match');
    });

    it('should require userId for cloud storage', async () => {
      manager.setUserId(null);

      const matchData = { homeScore: 1, awayScore: 0 };

      await expect(manager.saveMatchToCloud(matchData)).rejects.toThrow('User ID required for cloud storage');
    });

    it('should require team selection for cloud storage', async () => {
      manager.getCurrentTeamId = jest.fn().mockResolvedValue(null);

      const matchData = { homeScore: 1, awayScore: 0 };

      const result = await manager.saveMatchToCloud(matchData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No current team selected. Please create or select a team first.');
    });

    it('should handle cloud save errors', async () => {
      const matchData = { homeScore: 1, awayScore: 0 };
      manager.getCurrentTeamId = jest.fn().mockResolvedValue('team_123');

      supabase.from().single.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      });

      const result = await manager.saveMatchToCloud(matchData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to save match: Database connection failed');
      expect(result.storage).toBe('cloud');
    });

    it('should save player statistics with match', async () => {
      const matchData = {
        players: [
          {
            id: 'player_1',
            cloudId: 'cloud_player_1',
            isCaptain: true,
            stats: {
              startedMatchAs: 'goalie',
              goals: 1,
              substitutionsIn: 1,
              substitutionsOut: 0,
              timeAsGoalieSeconds: 900,
              timeAsDefenderSeconds: 0,
              timeAsAttackerSeconds: 1800,
              timeOnFieldSeconds: 2700,
              totalTimeSeconds: 2700
            }
          }
        ]
      };

      const mockTeamId = 'team_123';
      const mockMatch = { id: 'match_456', team_id: mockTeamId };

      manager.getCurrentTeamId = jest.fn().mockResolvedValue(mockTeamId);
      supabase.from().single.mockResolvedValue({ data: mockMatch, error: null });
      
      // Mock savePlayerStats method
      manager.savePlayerStats = jest.fn().mockResolvedValue();

      await manager.saveMatchToCloud(matchData);

      expect(manager.savePlayerStats).toHaveBeenCalledWith(
        mockMatch.id,
        matchData.players,
        mockTeamId
      );
    });

    it('should save match events with match', async () => {
      const matchData = {
        matchEvents: [
          {
            type: 'goal',
            playerId: 'player_1',
            timestamp: 450,
            period: 1,
            data: { assisted: false }
          }
        ]
      };

      const mockTeamId = 'team_123';
      const mockMatch = { id: 'match_456', team_id: mockTeamId };

      manager.getCurrentTeamId = jest.fn().mockResolvedValue(mockTeamId);
      supabase.from().single.mockResolvedValue({ data: mockMatch, error: null });
      
      // Mock saveMatchEvents method
      manager.saveMatchEvents = jest.fn().mockResolvedValue();

      await manager.saveMatchToCloud(matchData);

      expect(manager.saveMatchEvents).toHaveBeenCalledWith(
        mockMatch.id,
        matchData.matchEvents
      );
    });
  });

  describe('Data Retrieval Operations', () => {
    it('should route to local storage for unauthenticated users', async () => {
      manager.setUserId(null);
      const localMatches = [{ id: 'local_1', homeScore: 1 }];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(localMatches));

      const result = await manager.getMatchHistory();

      expect(result.success).toBe(true);
      expect(result.storage).toBe('local');
      expect(result.matches).toEqual(localMatches.reverse()); // Most recent first
    });

    it('should route to cloud storage for authenticated users', async () => {
      manager.setUserId('user_123');
      const cloudMatches = [
        { id: 'match_1', goals_scored: 2, goals_conceded: 1 },
        { id: 'match_2', goals_scored: 0, goals_conceded: 3 }
      ];

      supabase.from().limit.mockResolvedValue({
        data: cloudMatches,
        error: null
      });

      const result = await manager.getMatchHistory();

      expect(result.success).toBe(true);
      expect(result.storage).toBe('cloud');
      expect(result.matches).toEqual(cloudMatches);
    });

    it('should respect limit parameter for local matches', async () => {
      manager.setUserId(null);
      const localMatches = Array.from({ length: 20 }, (_, i) => ({ id: `local_${i}` }));
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(localMatches));

      const result = await manager.getMatchHistory(5);

      expect(result.matches).toHaveLength(5);
      // Should get the last 5 matches reversed (most recent first)
      expect(result.matches[0].id).toBe('local_19');
      expect(result.matches[4].id).toBe('local_15');
    });

    it('should handle cloud fetch errors with fallback to localStorage', async () => {
      manager.setUserId('user_123');
      const localMatches = [{ id: 'local_1', homeScore: 1 }];
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(localMatches));
      supabase.from().limit.mockRejectedValue(new Error('Network error'));

      const result = await manager.getMatchHistory();

      expect(result.success).toBe(true);
      expect(result.storage).toBe('local');
      expect(result.matches).toEqual(localMatches.reverse());
      expect(console.log).toHaveBeenCalledWith('Cloud fetch failed, falling back to localStorage');
    });

    it('should handle cloud authentication errors', async () => {
      manager.setUserId('user_123');

      supabase.from().limit.mockResolvedValue({
        data: null,
        error: { message: 'Authentication failed' }
      });

      const result = await manager.getCloudMatchHistory();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch match history: Authentication failed');
      expect(result.storage).toBe('cloud');
    });
  });

  describe('Cloud Synchronization and Migration', () => {
    beforeEach(() => {
      manager.setUserId('user_123');
    });

    it('should migrate local data to cloud successfully', async () => {
      const localMatches = [
        { id: 'local_1', homeScore: 2, awayScore: 1 },
        { id: 'local_2', homeScore: 0, awayScore: 1 }
      ];

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(localMatches));
      
      // Mock successful cloud saves
      manager.saveMatchToCloud = jest.fn()
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: true });

      const result = await manager.migrateLocalDataToCloud();

      expect(result.success).toBe(true);
      expect(result.migrated).toBe(2);
      expect(result.total).toBe(2);
      expect(result.errors).toEqual([]);
      expect(result.message).toBe('Successfully migrated 2 of 2 matches');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('dif-coach-match-history');
    });

    it('should handle partial migration failures', async () => {
      const localMatches = [
        { id: 'local_1', homeScore: 2, awayScore: 1 },
        { id: 'local_2', homeScore: 0, awayScore: 1 }
      ];

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(localMatches));
      
      // Mock mixed results
      manager.saveMatchToCloud = jest.fn()
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false, error: 'Database error' });

      const result = await manager.migrateLocalDataToCloud();

      expect(result.success).toBe(true);
      expect(result.migrated).toBe(1);
      expect(result.total).toBe(2);
      expect(result.errors).toEqual(['Match local_2: Database error']);
      expect(mockLocalStorage.removeItem).not.toHaveBeenCalled(); // Don't clear on partial failure
    });

    it('should require authentication for migration', async () => {
      manager.setUserId(null);

      await expect(manager.migrateLocalDataToCloud()).rejects.toThrow('User must be authenticated to migrate data');
    });

    it('should handle no local data to migrate', async () => {
      mockLocalStorage.getItem.mockReturnValue('[]');

      const result = await manager.migrateLocalDataToCloud();

      expect(result.success).toBe(true);
      expect(result.migrated).toBe(0);
      expect(result.message).toBe('No local data to migrate');
    });

    it('should handle migration exceptions', async () => {
      const localMatches = [{ id: 'local_1', homeScore: 1 }];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(localMatches));

      manager.saveMatchToCloud = jest.fn().mockRejectedValue(new Error('Network failure'));

      const result = await manager.migrateLocalDataToCloud();

      expect(result.success).toBe(true);
      expect(result.migrated).toBe(0);
      expect(result.errors).toEqual(['Match local_1: Network failure']);
    });
  });

  describe('Cloud Fallback Mechanisms', () => {
    beforeEach(() => {
      manager.setUserId('user_123');
    });

    it('should fallback to localStorage when cloud save fails', async () => {
      const matchData = { homeScore: 1, awayScore: 0 };
      
      // Mock cloud save failure
      manager.saveMatchToCloud = jest.fn().mockRejectedValue(new Error('Cloud unavailable'));
      
      // Mock successful local save
      mockLocalStorage.getItem.mockReturnValue('[]');

      const result = await manager.saveMatch(matchData);

      expect(result.success).toBe(true);
      expect(result.storage).toBe('local');
      expect(console.error).toHaveBeenCalledWith('Error saving match data:', expect.any(Error));
      expect(console.log).toHaveBeenCalledWith('Cloud save failed, falling back to localStorage');
    });

    it('should not fallback for unauthenticated users', async () => {
      manager.setUserId(null);
      const matchData = { homeScore: 1, awayScore: 0 };
      
      // Mock localStorage failure
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      await expect(manager.saveMatch(matchData)).rejects.toThrow('Storage error');
    });
  });

  describe('Helper Methods', () => {
    it('should calculate match outcomes correctly', () => {
      expect(manager.calculateMatchOutcome(2, 1)).toBe('win');
      expect(manager.calculateMatchOutcome(1, 2)).toBe('loss');
      expect(manager.calculateMatchOutcome(1, 1)).toBe('draw');
      expect(manager.calculateMatchOutcome(0, 0)).toBe('draw');
    });

    it('should map player roles to database format', () => {
      expect(manager.mapPlayerRoleToDatabase('goalie')).toBe('goalie');
      expect(manager.mapPlayerRoleToDatabase('on_field')).toBe('attacker');
      expect(manager.mapPlayerRoleToDatabase('substitute')).toBe('substitute');
      expect(manager.mapPlayerRoleToDatabase('unknown')).toBe('substitute');
    });

    it('should map event types to database format', () => {
      expect(manager.mapEventTypeToDatabase('goal')).toBe('goal_scored');
      expect(manager.mapEventTypeToDatabase('substitution')).toBe('substitution_in');
      expect(manager.mapEventTypeToDatabase('period_start')).toBe('period_started');
      expect(manager.mapEventTypeToDatabase('unknown_event')).toBe('unknown_event');
    });

    it('should get current team ID from localStorage', async () => {
      mockLocalStorage.getItem.mockReturnValue('team_789');

      const teamId = await manager.getCurrentTeamId();

      expect(teamId).toBe('team_789');
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('currentTeamId');
    });

    it('should fetch user team when no current team is set', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      supabase.from().limit.mockResolvedValue({
        data: [{ team_id: 'team_456' }],
        error: null
      });

      const teamId = await manager.getCurrentTeamId();

      expect(teamId).toBe('team_456');
      expect(supabase.from).toHaveBeenCalledWith('team_user');
    });

    it('should return null when user has no teams', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      supabase.from().limit.mockResolvedValue({
        data: [],
        error: null
      });

      const teamId = await manager.getCurrentTeamId();

      expect(teamId).toBe(null);
    });
  });

  describe('Singleton Instance and Utilities', () => {
    it('should provide singleton instance', () => {
      expect(dataSyncManager).toBeInstanceOf(DataSyncManager);
      expect(dataSyncManager.userId).toBe(null);
      expect(dataSyncManager.isAuthenticated).toBe(false);
    });

    it('should update singleton user via utility function', () => {
      updateDataSyncUser('user_999');
      
      expect(dataSyncManager.userId).toBe('user_999');
      expect(dataSyncManager.isAuthenticated).toBe(true);
    });

    it('should handle null user update', () => {
      updateDataSyncUser('user_123');
      expect(dataSyncManager.isAuthenticated).toBe(true);
      
      updateDataSyncUser(null);
      expect(dataSyncManager.userId).toBe(null);
      expect(dataSyncManager.isAuthenticated).toBe(false);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle authentication state changes during operations', async () => {
      // Start as unauthenticated
      manager.setUserId(null);
      const matchData = { homeScore: 1, awayScore: 0 };
      
      mockLocalStorage.getItem.mockReturnValue('[]');
      
      // Save should go to localStorage
      let result = await manager.saveMatch(matchData);
      expect(result.storage).toBe('local');
      
      // Change to authenticated mid-session
      manager.setUserId('user_123');
      manager.getCurrentTeamId = jest.fn().mockResolvedValue('team_123');
      supabase.from().single.mockResolvedValue({
        data: { id: 'match_cloud_1' },
        error: null
      });
      
      // Next save should go to cloud
      result = await manager.saveMatch(matchData);
      expect(result.storage).toBe('cloud');
    });

    it('should maintain data consistency across storage types', async () => {
      const matchData = {
        teamMode: 'INDIVIDUAL_6',
        homeScore: 2,
        awayScore: 1,
        players: []
      };

      // Save locally first
      manager.setUserId(null);
      mockLocalStorage.getItem.mockReturnValue('[]');
      
      const localResult = await manager.saveMatch(matchData);
      expect(localResult.match).toHaveProperty('id');
      expect(localResult.match).toHaveProperty('savedAt');
      expect(localResult.match).toHaveProperty('source', 'local');

      // Now save to cloud
      manager.setUserId('user_123');
      manager.getCurrentTeamId = jest.fn().mockResolvedValue('team_123');
      supabase.from().single.mockResolvedValue({
        data: { id: 'cloud_match_1', team_id: 'team_123' },
        error: null
      });

      const cloudResult = await manager.saveMatch(matchData);
      expect(cloudResult.match).toHaveProperty('id', 'cloud_match_1');
      expect(cloudResult.message).toBe('Match saved to your history successfully!');
    });
  });
});