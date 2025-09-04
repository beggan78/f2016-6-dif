/**
 * Edge case tests for pending match functionality
 * Tests error scenarios, data corruption, and edge cases
 */

import {
  loadPendingMatchData,
  resumePendingMatch,
  deletePendingMatch,
  reconstructGameStateFromDatabase,
  validatePendingMatchData,
  parseSubstitutionConfigToTeamConfig
} from '../pendingMatchService';
import { checkForPendingMatches } from '../matchRecoveryService';
import { SUBSTITUTION_TYPES, PAIR_ROLE_ROTATION_TYPES } from '../../constants/teamConfiguration';
import { PLAYER_ROLES } from '../../constants/playerConstants';

// Mock Supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      delete: jest.fn().mockReturnThis()
    }))
  }
}));

// Mock dependencies
jest.mock('../matchStateManager', () => ({
  updateMatchToRunning: jest.fn()
}));

const { supabase } = require('../../lib/supabase');

describe('Pending Match Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Data Corruption Scenarios', () => {
    test('should handle corrupted match data gracefully', async () => {
      // Mock corrupted match data
      const corruptedMatch = {
        id: 'match-1',
        team_id: 'team-1',
        state: 'pending',
        // Missing required fields: periods, period_duration_minutes, opponent_team
        created_at: '2023-01-01T00:00:00Z'
      };

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: corruptedMatch,
          error: null
        })
      });

      const result = await loadPendingMatchData('match-1');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid match data');
    });

    test('should handle missing player stats gracefully', async () => {
      const validMatch = {
        id: 'match-1',
        team_id: 'team-1',
        state: 'pending',
        periods: 2,
        period_duration_minutes: 15,
        opponent_team: 'Test Opponent',
        formation: '2-2',
        substitution_config: {}
      };

      // Mock match query to return valid match but no player stats
      const mockMatchQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: validMatch,
          error: null
        })
      };

      const mockStatsQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null, // No stats found
          error: { message: 'No player stats found' }
        })
      };

      supabase.from
        .mockReturnValueOnce(mockMatchQuery)  // First call for match
        .mockReturnValueOnce(mockStatsQuery); // Second call for stats

      const result = await loadPendingMatchData('match-1');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No player statistics found');
    });

    test('should handle malformed substitution config', async () => {
      const malformedConfigs = [
        { type: 'invalid_type' },
        { type: 'pairs', invalidField: true },
        'not_an_object',
        null
      ];

      malformedConfigs.forEach(config => {
        const result = parseSubstitutionConfigToTeamConfig(config);
        
        // Should fallback to individual substitution
        expect(result.substitutionType).toBe(SUBSTITUTION_TYPES.INDIVIDUAL);
        expect(result.pairRoleRotation).toBeNull();
      });
    });

    test('should handle invalid player role mappings', async () => {
      const invalidPlayerStats = [
        {
          player_id: 'player-1',
          started_as: 'invalid_role', // Invalid role
          match_id: 'match-1'
        },
        {
          player_id: 'player-2',
          started_as: null, // Null role
          match_id: 'match-1'
        }
      ];

      const result = reconstructGameStateFromDatabase({
        id: 'match-1',
        formation: '2-2',
        periods: 2,
        period_duration_minutes: 15,
        opponent_team: 'Test Opponent',
        substitution_config: {}
      }, invalidPlayerStats);

      // Should handle invalid roles by mapping to unknown
      expect(result.success).toBe(true);
      expect(result.gameState.selectedSquadIds).toEqual(['player-1', 'player-2']);
    });
  });

  describe('Network and Database Error Scenarios', () => {
    test('should handle database connection errors', async () => {
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(new Error('Connection failed'))
      });

      const result = await loadPendingMatchData('match-1');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to load pending match');
    });

    test('should handle database timeout errors', async () => {
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(new Error('Request timeout'))
      });

      const result = await checkForPendingMatches('team-1');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle permission errors gracefully', async () => {
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'permission denied for table match' }
        })
      });

      const result = await loadPendingMatchData('match-1');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('permission denied');
    });
  });

  describe('Business Logic Edge Cases', () => {
    test('should handle very old pending matches', async () => {
      const oldMatch = {
        id: 'match-1',
        team_id: 'team-1',
        state: 'pending',
        periods: 2,
        period_duration_minutes: 15,
        opponent_team: 'Test Opponent',
        formation: '2-2',
        substitution_config: {},
        created_at: '2020-01-01T00:00:00Z' // Very old date
      };

      const validationResult = validatePendingMatchData(oldMatch, []);
      
      // Should still be valid (business decides if too old)
      expect(validationResult.isValid).toBe(true);
    });

    test('should handle matches with large squad sizes', async () => {
      const playerStats = Array.from({ length: 20 }, (_, i) => ({
        player_id: `player-${i + 1}`,
        started_as: PLAYER_ROLES.SUBSTITUTE,
        match_id: 'match-1'
      }));

      const result = reconstructGameStateFromDatabase({
        id: 'match-1',
        formation: '2-2',
        periods: 2,
        period_duration_minutes: 15,
        opponent_team: 'Test Opponent',
        substitution_config: { type: SUBSTITUTION_TYPES.INDIVIDUAL }
      }, playerStats);

      expect(result.success).toBe(true);
      expect(result.gameState.selectedSquadIds).toHaveLength(20);
    });

    test('should handle deletion of non-existent match', async () => {
      supabase.from.mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'No rows deleted' }
        })
      });

      const result = await deletePendingMatch('non-existent-match');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No rows deleted');
    });

    test('should handle concurrent deletion attempts', async () => {
      let callCount = 0;
      supabase.from.mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({ data: { id: 'match-1' }, error: null });
          } else {
            return Promise.resolve({ 
              data: null, 
              error: { message: 'Match already deleted' } 
            });
          }
        })
      });

      // First deletion should succeed
      const result1 = await deletePendingMatch('match-1');
      expect(result1.success).toBe(true);

      // Second deletion should fail gracefully
      const result2 = await deletePendingMatch('match-1');
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('Match already deleted');
    });
  });

  describe('State Validation Edge Cases', () => {
    test('should validate match belongs to correct team', async () => {
      const matchFromDifferentTeam = {
        id: 'match-1',
        team_id: 'different-team',
        state: 'pending',
        periods: 2,
        period_duration_minutes: 15,
        opponent_team: 'Test Opponent',
        formation: '2-2',
        substitution_config: {}
      };

      const validation = validatePendingMatchData(matchFromDifferentTeam, [], 'team-1');
      
      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Match belongs to different team');
    });

    test('should handle empty formation configurations', async () => {
      const result = reconstructGameStateFromDatabase({
        id: 'match-1',
        formation: '', // Empty formation
        periods: 2,
        period_duration_minutes: 15,
        opponent_team: 'Test Opponent',
        substitution_config: {}
      }, []);

      expect(result.success).toBe(true);
      // Should fallback to default formation
      expect(result.gameState.selectedFormation).toBeDefined();
    });

    test('should handle matches with inconsistent player counts', async () => {
      const playerStats = [
        { player_id: 'player-1', started_as: PLAYER_ROLES.GOALIE, match_id: 'match-1' }
        // Only 1 player for a match that typically needs more
      ];

      const validation = validatePendingMatchData({
        id: 'match-1',
        team_id: 'team-1',
        state: 'pending',
        periods: 2,
        period_duration_minutes: 15,
        opponent_team: 'Test Opponent',
        formation: '2-2',
        substitution_config: {}
      }, playerStats);

      expect(validation.isValid).toBe(true); // Still valid, just warning
      expect(validation.warnings).toContain('Very small squad size (1 players)');
    });
  });

  describe('Complex Substitution Configuration Edge Cases', () => {
    test('should handle pairs config with missing role rotation', async () => {
      const config = {
        type: SUBSTITUTION_TYPES.PAIRS
        // Missing pairRoleRotation field
      };

      const result = parseSubstitutionConfigToTeamConfig(config);
      
      expect(result.substitutionType).toBe(SUBSTITUTION_TYPES.PAIRS);
      expect(result.pairRoleRotation).toBe(PAIR_ROLE_ROTATION_TYPES.KEEP_THROUGHOUT_PERIOD);
    });

    test('should handle deeply nested config objects', async () => {
      const complexConfig = {
        type: SUBSTITUTION_TYPES.PAIRS,
        pairRoleRotation: PAIR_ROLE_ROTATION_TYPES.SWAP_EVERY_ROTATION,
        metadata: {
          version: '1.0',
          customSettings: {
            nested: {
              deeply: true
            }
          }
        }
      };

      const result = parseSubstitutionConfigToTeamConfig(complexConfig);
      
      expect(result.substitutionType).toBe(SUBSTITUTION_TYPES.PAIRS);
      expect(result.pairRoleRotation).toBe(PAIR_ROLE_ROTATION_TYPES.SWAP_EVERY_ROTATION);
    });
  });
});