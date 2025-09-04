import { 
  loadPendingMatchData,
  loadGameStateFromInitialConfig,
  deletePendingMatch,
  validatePlayerRoster,
  resumePendingMatch
} from '../pendingMatchService';
import { supabase } from '../../lib/supabase';
import { SUBSTITUTION_TYPES, PAIR_ROLE_ROTATION_TYPES } from '../../constants/teamConfiguration';

// Mock the supabase client
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          order: jest.fn(() => ({
            // Return the chain for method chaining
          }))
        }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn()
      }))
    }))
  }
}));

describe('pendingMatchService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock console methods for clean test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('loadPendingMatchData', () => {
    it('should successfully load pending match data', async () => {
      const mockMatchData = {
        id: 'match-1',
        team_id: 'team-1',
        state: 'pending',
        opponent: 'Test Team',
        formation: '2-2',
        periods: 3,
        period_duration_minutes: 15,
        initial_config: { 
          teamConfig: { substitutionType: 'individual' },
          matchConfig: {},
          squadSelection: [],
          formation: {},
          periodGoalies: {}
        }
      };
      
      const mockPlayerStats = [
        { player_id: 'player-1', started_as: 'defender', match_id: 'match-1' },
        { player_id: 'player-2', started_as: 'attacker', match_id: 'match-1' },
        { player_id: 'player-3', started_as: 'attacker', match_id: 'match-1' },
        { player_id: 'player-4', started_as: 'defender', match_id: 'match-1' },
        { player_id: 'player-5', started_as: 'goalie', match_id: 'match-1' }
      ];

      // Mock the supabase chain for match query
      const mockSingle = jest.fn().mockResolvedValue({ data: mockMatchData, error: null });
      const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect1 = jest.fn().mockReturnValue({ eq: mockEq1 });

      // Mock the supabase chain for player stats query  
      const mockOrder = jest.fn().mockResolvedValue({ data: mockPlayerStats, error: null });
      const mockEq3 = jest.fn().mockReturnValue({ order: mockOrder });
      const mockSelect2 = jest.fn().mockReturnValue({ eq: mockEq3 });

      supabase.from
        .mockReturnValueOnce({ select: mockSelect1 }) // First call for match
        .mockReturnValueOnce({ select: mockSelect2 }); // Second call for player stats

      const result = await loadPendingMatchData('match-1');

      expect(result.success).toBe(true);
      expect(result.matchData).toEqual(mockMatchData);
      expect(result.playerStats).toEqual(mockPlayerStats);
      expect(supabase.from).toHaveBeenCalledWith('match');
      expect(supabase.from).toHaveBeenCalledWith('player_match_stats');
    });

    it('should handle missing match ID', async () => {
      const result = await loadPendingMatchData();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Match ID is required');
    });

    it('should handle match not found error', async () => {
      const mockError = { code: 'PGRST116', message: 'No rows found' };
      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: mockError });
      const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });

      supabase.from.mockReturnValue({ select: mockSelect });

      const result = await loadPendingMatchData('match-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Pending match not found or not accessible');
    });
  });


  describe('loadGameStateFromInitialConfig', () => {
    it('should reconstruct game state from database data', () => {
      const matchData = {
        id: 'match-1',
        format: '5v5',
        formation: '2-2',
        opponent: 'Test Team',
        periods: 3,
        period_duration_minutes: 15,
        type: 'friendly',
        captain: 'player-1',
        initial_config: { 
          teamConfig: { substitutionType: 'individual' },
          matchConfig: {},
          squadSelection: [],
          formation: {},
          periodGoalies: {}
        }
      };

      const playerStats = [
        { player_id: 'player-1', started_as: 'defender' },
        { player_id: 'player-2', started_as: 'attacker' }
      ];

      const result = loadGameStateFromInitialConfig(matchData, playerStats);

      expect(result.teamConfig.format).toBe('5v5');
      expect(result.teamConfig.formation).toBe('2-2');
      expect(result.teamConfig.squadSize).toBe(2);
      expect(result.teamConfig.substitutionType).toBe(SUBSTITUTION_TYPES.INDIVIDUAL);
      expect(result.selectedFormation).toBe('2-2');
      expect(result.selectedSquadIds).toEqual(['player-1', 'player-2']);
      expect(result.opponentTeam).toBe('Test Team');
      expect(result.currentMatchId).toBe('match-1');
      expect(result.playerStatsForReconstruction).toEqual(playerStats);
    });

    it('should handle missing substitution config', () => {
      const matchData = {
        id: 'match-1',
        format: '5v5',
        formation: '2-2'
      };

      const playerStats = [
        { player_id: 'player-1', started_as: 'defender' }
      ];

      const result = loadGameStateFromInitialConfig(matchData, playerStats);

      expect(result.teamConfig.substitutionType).toBe(SUBSTITUTION_TYPES.INDIVIDUAL);
      expect(result.teamConfig.pairRoleRotation).toBe(null);
    });

    it('should throw error for invalid input', () => {
      expect(() => {
        loadGameStateFromInitialConfig(null, []);
      }).toThrow('Invalid match data provided');

      expect(() => {
        loadGameStateFromInitialConfig({}, 'not-an-array');
      }).toThrow('Invalid match data provided');
    });
  });

  describe('deletePendingMatch', () => {
    it('should successfully delete pending match', async () => {
      const mockEq2 = jest.fn().mockResolvedValue({ error: null });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockDelete = jest.fn().mockReturnValue({ eq: mockEq1 });
      supabase.from.mockReturnValue({ delete: mockDelete });

      const result = await deletePendingMatch('match-1');

      expect(result.success).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('match');
      expect(mockEq1).toHaveBeenCalledWith('id', 'match-1');
      expect(mockEq2).toHaveBeenCalledWith('state', 'pending');
    });

    it('should handle missing match ID', async () => {
      const result = await deletePendingMatch();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Match ID is required');
    });

    it('should handle database error', async () => {
      const mockError = { message: 'Database error' };
      const mockEq2 = jest.fn().mockResolvedValue({ error: mockError });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockDelete = jest.fn().mockReturnValue({ eq: mockEq1 });
      supabase.from.mockReturnValue({ delete: mockDelete });

      const result = await deletePendingMatch('match-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unable to access match data. Please try again.');
    });
  });

  describe('validatePlayerRoster', () => {
    it('should validate matching rosters', () => {
      const playerStats = [
        { player_id: 'player-1' },
        { player_id: 'player-2' },
        { player_id: 'player-3' },
        { player_id: 'player-4' },
        { player_id: 'player-5' }
      ];

      const currentPlayers = [
        { id: 'player-1' },
        { id: 'player-2' },
        { id: 'player-3' },
        { id: 'player-4' },
        { id: 'player-5' },
        { id: 'player-6' }
      ];

      const result = validatePlayerRoster(playerStats, currentPlayers);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.missingPlayerIds).toHaveLength(0);
      expect(result.availablePlayerIds).toHaveLength(5);
    });

    it('should detect missing players', () => {
      const playerStats = [
        { player_id: 'player-1' },
        { player_id: 'player-2' },
        { player_id: 'player-missing' }
      ];

      const currentPlayers = [
        { id: 'player-1' },
        { id: 'player-2' }
      ];

      const result = validatePlayerRoster(playerStats, currentPlayers);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('1 player(s) from the saved match are no longer on the team');
      expect(result.issues).toContain('Not enough available players to resume match (minimum 5 required)');
      expect(result.missingPlayerIds).toContain('player-missing');
      expect(result.availablePlayerIds).toHaveLength(2);
    });

    it('should handle invalid input', () => {
      const result = validatePlayerRoster('invalid', null);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Invalid player data provided');
    });
  });

  describe('resumePendingMatch', () => {
    it('should successfully resume pending match', async () => {
      const mockMatchData = {
        id: 'match-1',
        team_id: 'team-1',
        state: 'pending',
        formation: '2-2',
        periods: 3,
        period_duration_minutes: 15,
        initial_config: { 
          teamConfig: { substitutionType: 'individual' },
          matchConfig: {},
          squadSelection: [],
          formation: {},
          periodGoalies: {}
        }
      };
      
      const mockPlayerStats = [
        { player_id: 'player-1', started_as: 'defender', match_id: 'match-1' },
        { player_id: 'player-2', started_as: 'attacker', match_id: 'match-1' },
        { player_id: 'player-3', started_as: 'attacker', match_id: 'match-1' },
        { player_id: 'player-4', started_as: 'defender', match_id: 'match-1' },
        { player_id: 'player-5', started_as: 'goalie', match_id: 'match-1' }
      ];

      // Mock loadPendingMatchData
      const mockSingle = jest.fn().mockResolvedValue({ data: mockMatchData, error: null });
      const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect1 = jest.fn().mockReturnValue({ eq: mockEq1 });

      const mockOrder = jest.fn().mockResolvedValue({ data: mockPlayerStats, error: null });
      const mockEq3 = jest.fn().mockReturnValue({ order: mockOrder });
      const mockSelect2 = jest.fn().mockReturnValue({ eq: mockEq3 });

      supabase.from
        .mockReturnValueOnce({ select: mockSelect1 })
        .mockReturnValueOnce({ select: mockSelect2 });

      const result = await resumePendingMatch('match-1');

      expect(result.success).toBe(true);
      expect(result.gameState).toBeDefined();
      expect(result.gameState.currentMatchId).toBe('match-1');
      expect(result.gameState.selectedFormation).toBe('2-2');
    });

    it('should handle load error', async () => {
      const mockError = { code: 'PGRST116', message: 'No rows found' };
      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: mockError });
      const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });

      supabase.from.mockReturnValue({ select: mockSelect });

      const result = await resumePendingMatch('match-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Pending match not found or not accessible');
    });
  });
});