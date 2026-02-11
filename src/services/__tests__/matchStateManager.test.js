/**
 * Tests for Match State Management Service
 * 
 * Tests the complete lifecycle of match records and player statistics integration.
 * Follows established testing patterns for mocking Supabase and console methods.
 */

import {
  createMatch,
  createManualMatch,
  updateMatchToRunning,
  updateMatchToFinished,
  updateFinishedMatchMetadata,
  insertInitialPlayerMatchStats,
  upsertPlayerMatchStats,
  updatePlayerMatchStatsFairPlayAward,
  formatInitialPlayerStats,
  formatPlayerMatchStats,
  countPlayerGoals,
  mapFormationPositionToRole,
  mapStartingRoleToDBRole,
  deleteFinishedMatch,
  getActiveMatches
} from '../matchStateManager';
import { PLAYER_ROLES } from '../../constants/playerConstants';
import { supabase } from '../../lib/supabase';

// Mock the supabase client
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn()
  }
}));

const createUpdateChain = ({ finalResult = { data: null, error: null }, selectResult } = {}) => {
  const select = selectResult ? jest.fn().mockResolvedValue(selectResult) : null;
  const finalEq = jest.fn(() => (select ? { select } : Promise.resolve(finalResult)));
  const is = jest.fn(() => ({ eq: finalEq }));
  const firstEq = jest.fn(() => ({ is }));
  const update = jest.fn(() => ({ eq: firstEq }));
  return { update, firstEq, is, finalEq, select };
};

const createDeleteChain = ({ finalResult = { data: null, error: null } } = {}) => {
  const eq = jest.fn().mockResolvedValue(finalResult);
  const deleteFn = jest.fn(() => ({ eq }));
  return { delete: deleteFn, eq };
};

describe('matchStateManager', () => {
  // Test data fixtures
  const mockMatchData = {
    teamId: 'team-123',
    format: '5v5',
    formation: '2-2',
    periods: 2,
    periodDurationMinutes: 20,
    type: 'friendly',
    opponent: 'Test Opponents',
    captainId: 'player-captain',
    venueType: 'home'
  };

  const mockSelectedSquadIds = ['player-1', 'player-2'];

  const mockPlayers = [
    {
      id: 'player-1',
      displayName: 'Player One',
      firstName: 'Player',
      lastName: 'One',
      stats: {
        startedMatchAs: PLAYER_ROLES.GOALIE,
        startedAtRole: PLAYER_ROLES.GOALIE,
        startedAtPosition: 'goalie',
        timeOnFieldSeconds: 0,
        timeAsGoalieSeconds: 1200,
        timeAsDefenderSeconds: 0,
        timeAsMidfielderSeconds: 0,
        timeAsAttackerSeconds: 0,
        currentRole: PLAYER_ROLES.GOALIE
      }
    },
    {
      id: 'player-2', 
      displayName: 'Player Two',
      firstName: 'Player',
      lastName: 'Two',
      stats: {
        startedMatchAs: PLAYER_ROLES.FIELD_PLAYER,
        startedAtRole: PLAYER_ROLES.DEFENDER,
        startedAtPosition: 'leftDefender',
        timeOnFieldSeconds: 800,
        timeAsGoalieSeconds: 0,
        timeAsDefenderSeconds: 800,
        timeAsMidfielderSeconds: 0,
        timeAsAttackerSeconds: 0,
        currentRole: PLAYER_ROLES.DEFENDER
      }
    },
    {
      id: 'player-3',
      displayName: 'Player Three',
      firstName: 'Player',
      lastName: 'Three',
      stats: {
        // No startedMatchAs or startedAtPosition - non-participating player
        timeOnFieldSeconds: 0,
        timeAsGoalieSeconds: 0,
        timeAsDefenderSeconds: 0,
        timeAsMidfielderSeconds: 0,
        timeAsAttackerSeconds: 0
      }
    }
  ];

  const mockGoalScorers = {
    'event-1': 'player-2',
    'event-2': 'player-2' // Player 2 scored twice
  };

  const mockMatchEvents = [
    { id: 'event-1', type: 'goal', playerId: 'player-2' },
    { id: 'event-2', type: 'goal', playerId: 'player-2' },
    { id: 'event-3', type: 'substitution', playerId: 'player-2' }
  ];

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

  describe('createMatch', () => {
    it('should create match successfully with player stats', async () => {
      const mockMatchId = 'match-123';
      
      // Mock the match creation
      supabase.from.mockReturnValueOnce({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { id: mockMatchId },
              error: null
            })
          }))
        }))
      });

      // Mock the player stats insertion (only 2 players have startedMatchAs/startedAtPosition)
      supabase.from.mockReturnValueOnce({
        insert: jest.fn(() => ({
          select: jest.fn().mockResolvedValue({
            data: [{ id: '1' }, { id: '2' }], // 2 participating players
            error: null
          })
        }))
      });

      const result = await createMatch(mockMatchData, mockPlayers, mockSelectedSquadIds);

      expect(result.success).toBe(true);
      expect(result.matchId).toBe(mockMatchId);
      expect(result.playerStatsInserted).toBe(2); // Only 2 players participating
    });

    it('should fail with missing required fields', async () => {
      const incompleteMatchData = { teamId: 'team-123' };
      
      const result = await createMatch(incompleteMatchData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required fields');
    });

    it('should handle database error gracefully', async () => {
      supabase.from.mockReturnValue({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          }))
        }))
      });

      const result = await createMatch(mockMatchData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error: Database error');
    });
  });

  describe('createManualMatch', () => {
    const baseManualPayload = {
      teamId: 'team-123',
      date: '2024-03-10',
      time: '14:30',
      type: 'league',
      venueType: 'home',
      format: '5v5',
      formation: '2-2',
      periods: 3,
      periodDuration: 15,
      goalsScored: 2,
      goalsConceded: 1
    };

    it('should create a finished match and insert player stats', async () => {
      const mockInsert = jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: { id: 'match-manual-1' }, error: null })
        }))
      }));

      const mockUpsert = jest.fn().mockResolvedValue({ error: null });

      supabase.from
        .mockReturnValueOnce({ insert: mockInsert })
        .mockReturnValueOnce({ upsert: mockUpsert });

      const playerStats = [
        {
          id: 1,
          playerId: 'player-1',
          displayName: 'Player One',
          firstName: 'Player',
          lastName: 'One',
          goalsScored: 1,
          timeAsDefender: 12,
          timeAsMidfielder: 6,
          timeAsAttacker: 0,
          timeAsGoalkeeper: 0,
          startingRole: 'Goalkeeper',
          wasCaptain: true,
          receivedFairPlayAward: true
        }
      ];

      const result = await createManualMatch(baseManualPayload, playerStats);

      expect(result.success).toBe(true);
      expect(result.matchId).toBe('match-manual-1');
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        team_id: baseManualPayload.teamId,
        state: 'finished',
        goals_scored: baseManualPayload.goalsScored,
        goals_conceded: baseManualPayload.goalsConceded
      }));
      expect(mockUpsert).toHaveBeenCalledWith(expect.any(Array), { onConflict: 'match_id,player_id' });
      const upsertPayload = mockUpsert.mock.calls[0][0];
      expect(upsertPayload).toHaveLength(1);
      expect(upsertPayload[0]).toMatchObject({
        match_id: 'match-manual-1',
        player_id: 'player-1',
        goals_scored: 1,
        started_as: 'goalie',
        was_captain: true,
        got_fair_play_award: true
      });
    });

    it('should validate required fields', async () => {
      const result = await createManualMatch({ teamId: 'team-123' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required fields');
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should handle database error when inserting match', async () => {
      const failingInsert = jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } })
        }))
      }));

      supabase.from.mockReturnValueOnce({ insert: failingInsert });

      const result = await createManualMatch(baseManualPayload, []);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error: Insert failed');
    });

    it('should handle player stats insertion error gracefully', async () => {
      const mockInsert = jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: { id: 'match-manual-2' }, error: null })
        }))
      }));

      const failingUpsert = jest.fn().mockResolvedValue({ error: { message: 'Stats upsert failed' } });

      supabase.from
        .mockReturnValueOnce({ insert: mockInsert })
        .mockReturnValueOnce({ upsert: failingUpsert });

      const result = await createManualMatch(baseManualPayload, [
        {
          id: 1,
          playerId: 'player-2',
          displayName: 'Player Two',
          firstName: 'Player',
          lastName: 'Two',
          goalsScored: 0,
          timeAsDefender: 10,
          timeAsMidfielder: 5,
          timeAsAttacker: 5,
          timeAsGoalkeeper: 0,
          startingRole: 'Midfielder',
          wasCaptain: false,
          receivedFairPlayAward: false
        }
      ]);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error: Stats upsert failed');
    });
  });

  describe('deleteFinishedMatch', () => {
    it('soft deletes finished match and related stats', async () => {
      const deleteChain = createDeleteChain();
      const updateMock = jest.fn(() => ({
        eq: jest.fn(() => ({
          is: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({ data: [{ id: 'match-1' }], error: null }))
          }))
        }))
      }));

      supabase.from
        .mockReturnValueOnce({ delete: deleteChain.delete })
        .mockReturnValueOnce({ update: updateMock });

      const result = await deleteFinishedMatch('match-1');

      expect(result.success).toBe(true);
      expect(deleteChain.delete).toHaveBeenCalled();
      expect(updateMock).toHaveBeenCalled();
    });

    it('returns error when matchId missing', async () => {
      const result = await deleteFinishedMatch();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Match ID is required');
    });

    it('propagates supabase errors', async () => {
      const deleteChain = createDeleteChain();
      const updateMock = jest.fn(() => ({
        eq: jest.fn(() => ({
          is: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({ data: null, error: { message: 'Failed' } }))
          }))
        }))
      }));

      supabase.from
        .mockReturnValueOnce({ delete: deleteChain.delete })
        .mockReturnValueOnce({ update: updateMock });

      const result = await deleteFinishedMatch('match-err');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error: Failed');
    });
  });

  describe('updateMatchToRunning', () => {
    it('should update match state to running successfully', async () => {
      const chain = createUpdateChain();
      supabase.from.mockReturnValue({ update: chain.update });

      const result = await updateMatchToRunning('match-123');

      expect(result.success).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('match');
    });

    it('should handle database error', async () => {
      const chain = createUpdateChain({ finalResult: { data: null, error: { message: 'Update failed' } } });
      supabase.from.mockReturnValue({ update: chain.update });

      const result = await updateMatchToRunning('match-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error: Update failed');
    });

    it('should fail without match ID', async () => {
      const result = await updateMatchToRunning(null);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Match ID is required');
    });
  });

  describe('updateMatchToFinished', () => {
    const finalStats = {
      matchDurationSeconds: 2400,
      goalsScored: 2,
      goalsConceded: 1,
      outcome: 'win',
      fairPlayAwardId: 'player-1'
    };

    it('should update match to finished successfully without player stats', async () => {
      // Mock successful match update (only one call to supabase.from)
      const chain = createUpdateChain({ selectResult: { data: [{ id: 'match-123' }], error: null } });
      supabase.from.mockReturnValue({ update: chain.update });

      // Call without allPlayers to avoid internal stats update calls
      const result = await updateMatchToFinished('match-123', finalStats);

      expect(result.success).toBe(true);
    });

    it('should fail with missing required stats', async () => {
      const incompleteStats = { matchDurationSeconds: 2400 };
      
      const result = await updateMatchToFinished('match-123', incompleteStats);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required final stats');
    });
  });

  describe('updateFinishedMatchMetadata', () => {
    it('should update finished match metadata successfully', async () => {
      const matchUpdateChain = createUpdateChain({ selectResult: { data: [{ id: 'match-123' }], error: null } });
      const clearAwardUpdate = {
        update: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({ data: [{ id: 'clear-1' }], error: null })
        }))
      };
      const setAwardUpdate = {
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              select: jest.fn().mockResolvedValue({ data: [{ id: 'stat-1' }], error: null })
            }))
          }))
        }))
      };

      supabase.from
        .mockReturnValueOnce({ update: matchUpdateChain.update })
        .mockReturnValueOnce(clearAwardUpdate)
        .mockReturnValueOnce(setAwardUpdate);

      const result = await updateFinishedMatchMetadata('match-123', { fairPlayAwardId: 'player-1' });

      expect(result.success).toBe(true);
      expect(matchUpdateChain.update).toHaveBeenCalled();
    });

    it('should return failure when no finished match is updated', async () => {
      const chain = createUpdateChain({ selectResult: { data: [], error: null } });
      supabase.from.mockReturnValue({ update: chain.update });

      const result = await updateFinishedMatchMetadata('missing-match', { fairPlayAwardId: null });

      expect(result.success).toBe(false);
    });
  });

  describe('insertInitialPlayerMatchStats', () => {
    it('should insert initial player stats successfully', async () => {
      supabase.from.mockReturnValue({
        insert: jest.fn(() => ({
          select: jest.fn().mockResolvedValue({
            data: [{ id: '1' }, { id: '2' }], // 2 participating players
            error: null
          })
        }))
      });

      const result = await insertInitialPlayerMatchStats('match-123', mockPlayers, 'player-captain', mockSelectedSquadIds);

      expect(result.success).toBe(true);
      expect(result.inserted).toBe(2);
      expect(supabase.from).toHaveBeenCalledWith('player_match_stats');
    });

    it('should handle empty player array', async () => {
      const result = await insertInitialPlayerMatchStats('match-123', [], 'player-captain', mockSelectedSquadIds);

      expect(result.success).toBe(true);
      expect(result.inserted).toBe(0);
    });

    it('should handle database insertion error', async () => {
      supabase.from.mockReturnValue({
        insert: jest.fn(() => ({
          select: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Insertion failed' }
          })
        }))
      });

      const result = await insertInitialPlayerMatchStats('match-123', mockPlayers, 'player-captain', mockSelectedSquadIds);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error: Insertion failed');
    });

    it('should exclude players not in the selected squad', async () => {
      const insertMock = jest.fn(() => ({
        select: jest.fn().mockResolvedValue({
          data: [{ id: '1' }, { id: '2' }],
          error: null
        })
      }));

      supabase.from.mockReturnValueOnce({
        insert: insertMock
      });

      const extraPlayer = {
        id: 'player-99',
        stats: {
          startedMatchAs: PLAYER_ROLES.FIELD_PLAYER,
          startedAtRole: PLAYER_ROLES.ATTACKER,
          startedAtPosition: 'leftAttacker'
        }
      };

      await insertInitialPlayerMatchStats(
        'match-123',
        [...mockPlayers, extraPlayer],
        'player-captain',
        mockSelectedSquadIds
      );

      const payload = insertMock.mock.calls[0][0];
      expect(payload.length).toBe(2);
      expect(payload.some(stat => stat.player_id === 'player-99')).toBe(false);
    });
  });

  describe('upsertPlayerMatchStats', () => {
    it('should upsert stats without deleting existing rows', async () => {
      const upsertMock = jest.fn(() => ({
        select: jest.fn().mockResolvedValue({
          data: [{ id: '1' }, { id: '2' }],
          error: null
        })
      }));

      supabase.from.mockReturnValueOnce({
        upsert: upsertMock
      });

      const result = await upsertPlayerMatchStats('match-123', mockPlayers, 'player-captain', ['player-1', 'player-2']);

      expect(result.success).toBe(true);
      expect(result.inserted).toBe(2);
      expect(upsertMock).toHaveBeenCalledTimes(1);
      const [payload, options] = upsertMock.mock.calls[0];
      expect(Array.isArray(payload)).toBe(true);
      expect(payload).toHaveLength(2);
      expect(options).toEqual({ onConflict: 'match_id,player_id' });
    });

    it('should handle upsert errors gracefully', async () => {
      const upsertMock = jest.fn(() => ({
        select: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Upsert failed' }
        })
      }));

      supabase.from.mockReturnValueOnce({
        upsert: upsertMock
      });

      const result = await upsertPlayerMatchStats('match-123', mockPlayers, 'player-captain', ['player-1', 'player-2']);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error: Upsert failed');
    });

    it('filters out players removed from the selected squad without deleting rows', async () => {
      const upsertMock = jest.fn(() => ({
        select: jest.fn().mockResolvedValue({
          data: [{ id: '1' }],
          error: null
        })
      }));

      supabase.from.mockReturnValueOnce({
        upsert: upsertMock
      });

      const result = await upsertPlayerMatchStats('match-123', mockPlayers, 'player-captain', ['player-1']);

      expect(result.success).toBe(true);
      const payload = upsertMock.mock.calls[0][0];
      expect(payload).toHaveLength(1);
      expect(payload[0].player_id).toBe('player-1');
    });
  });

  describe('updatePlayerMatchStatsFairPlayAward', () => {
    it('should update fair play award correctly', async () => {
      // Mock clearing existing awards
      supabase.from.mockReturnValueOnce({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          }))
        }))
      });

      // Mock setting new award
      supabase.from.mockReturnValueOnce({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              select: jest.fn().mockResolvedValue({
                data: [{ id: 'stats-123' }],
                error: null
              })
            }))
          }))
        }))
      });

      const result = await updatePlayerMatchStatsFairPlayAward('match-123', 'player-1');

      expect(result.success).toBe(true);
      expect(result.updated).toBe(1);
    });
  });

  describe('formatInitialPlayerStats', () => {
    it('should format initial stats for participating player', () => {
      const player = mockPlayers[0]; // Goalie
      const result = formatInitialPlayerStats(player, 'match-123', 'player-captain');

      expect(result).toEqual({
        player_id: 'player-1',
        match_id: 'match-123',
        started_as: 'goalie', // Mapped from formation position
        was_captain: false, // Not the captain
        goals_scored: 0,
        goalie_time_seconds: 0,
        defender_time_seconds: 0,
        midfielder_time_seconds: 0,
        attacker_time_seconds: 0,
        substitute_time_seconds: 0,
        total_field_time_seconds: 0,
        got_fair_play_award: false
      });
    });

    it('should return null for non-participating player', () => {
      const nonParticipatingPlayer = mockPlayers[2]; // Player without startedMatchAs/startedAtPosition

      const result = formatInitialPlayerStats(nonParticipatingPlayer, 'match-123', 'player-captain');

      expect(result).toBeNull();
    });

    it('should identify captain correctly', () => {
      const captainPlayer = mockPlayers[0];
      const result = formatInitialPlayerStats(captainPlayer, 'match-123', 'player-1');

      expect(result.was_captain).toBe(true);
    });
  });

  describe('formatPlayerMatchStats', () => {
    it('should format complete player match stats', () => {
      const player = mockPlayers[1]; // Field player
      const result = formatPlayerMatchStats(player, 'match-123', mockGoalScorers, mockMatchEvents);

      expect(result.player_id).toBe('player-2');
      expect(result.match_id).toBe('match-123');
      expect(result.goals_scored).toBe(2); // Two goals from goal scorers
      expect(result.total_field_time_seconds).toBe(800);
      expect(result.defender_time_seconds).toBe(800);
      expect(result.attacker_time_seconds).toBe(0);
      expect(result.started_as).toBe('defender');
    });

    it('should return null for non-participating player', () => {
      const nonParticipatingPlayer = mockPlayers[2]; // Player without startedMatchAs/startedAtPosition

      const result = formatPlayerMatchStats(nonParticipatingPlayer, 'match-123', mockGoalScorers, mockMatchEvents);

      expect(result).toBeNull();
    });

    it('should prefer stored starting role over current role changes', () => {
      const player = {
        ...mockPlayers[1],
        stats: {
          ...mockPlayers[1].stats,
          currentRole: PLAYER_ROLES.GOALIE, // Simulate role change during match
          startedAtRole: PLAYER_ROLES.DEFENDER
        }
      };

      const result = formatPlayerMatchStats(player, 'match-123');

      expect(result.started_as).toBe('defender');
    });
  });

  describe('countPlayerGoals', () => {
    it('should count goals from both sources correctly', () => {
      const goalsPlayer2 = countPlayerGoals(mockGoalScorers, mockMatchEvents, 'player-2');
      const goalsPlayer1 = countPlayerGoals(mockGoalScorers, mockMatchEvents, 'player-1');

      expect(goalsPlayer2).toBe(2); // Two goals
      expect(goalsPlayer1).toBe(0); // No goals
    });

    it('should handle empty goal data', () => {
      const goals = countPlayerGoals({}, [], 'player-1');
      expect(goals).toBe(0);
    });
  });

  describe('mapFormationPositionToRole', () => {
    it('should map formation positions to database roles correctly', () => {
      expect(mapFormationPositionToRole('goalie')).toBe('goalie');
      expect(mapFormationPositionToRole('leftDefender')).toBe('defender');
      expect(mapFormationPositionToRole('rightDefender')).toBe('defender');
      expect(mapFormationPositionToRole('leftAttacker')).toBe('attacker');
      expect(mapFormationPositionToRole('rightAttacker')).toBe('attacker');
      expect(mapFormationPositionToRole('leftMidfielder')).toBe('midfielder');
      expect(mapFormationPositionToRole('centerMidfielder')).toBe('midfielder');
    });

    it('should fall back to unknown for unmapped positions', () => {
      expect(mapFormationPositionToRole('unknownPosition')).toBe('unknown');
      expect(mapFormationPositionToRole(null)).toBe('unknown');
    });
  });

  describe('mapStartingRoleToDBRole', () => {
    it('should map starting roles to database roles correctly', () => {
      expect(mapStartingRoleToDBRole(PLAYER_ROLES.GOALIE)).toBe('goalie');
      expect(mapStartingRoleToDBRole(PLAYER_ROLES.DEFENDER)).toBe('defender');
      expect(mapStartingRoleToDBRole(PLAYER_ROLES.ATTACKER)).toBe('attacker');
      expect(mapStartingRoleToDBRole(PLAYER_ROLES.MIDFIELDER)).toBe('midfielder');
      expect(mapStartingRoleToDBRole(PLAYER_ROLES.SUBSTITUTE)).toBe('substitute');
      // Note: Testing actual behavior of FIELD_PLAYER mapping
    });

    it('should handle null/undefined roles', () => {
      expect(mapStartingRoleToDBRole(null)).toBe('unknown');
      expect(mapStartingRoleToDBRole(undefined)).toBe('unknown');
    });
  });

  describe('getActiveMatches', () => {
    const { getActiveMatches } = require('../matchStateManager');

    const createQueryChain = ({ data = [], error = null }) => {
      const order = jest.fn().mockResolvedValue({ data, error });
      const is = jest.fn(() => ({ order }));
      const inFn = jest.fn(() => ({ is }));
      const eq = jest.fn(() => ({ in: inFn }));
      const select = jest.fn(() => ({ eq }));
      return { select, eq, in: inFn, is, order };
    };

    describe('Successful Queries', () => {
      it('should fetch active matches for given teamId', async () => {
        const mockData = [
          {
            id: 'match-1',
            opponent: 'Team A',
            state: 'running',
            created_at: '2026-01-10T10:00:00Z',
            started_at: '2026-01-10T10:05:00Z',
            type: 'league',
            venue_type: 'home'
          },
          {
            id: 'match-2',
            opponent: 'Team B',
            state: 'pending',
            created_at: '2026-01-09T15:00:00Z',
            started_at: null,
            type: 'friendly',
            venue_type: 'away'
          }
        ];

        const chain = createQueryChain({ data: mockData });
        supabase.from.mockReturnValue(chain);

        const result = await getActiveMatches('team-123');

        expect(result.success).toBe(true);
        expect(result.matches).toHaveLength(2);
        expect(supabase.from).toHaveBeenCalledWith('match');
        expect(chain.select).toHaveBeenCalledWith('id, opponent, state, created_at, started_at, type, venue_type, upcoming_match(match_date, match_time)');
        expect(chain.eq).toHaveBeenCalledWith('team_id', 'team-123');
        expect(chain.in).toHaveBeenCalledWith('state', ['pending', 'running']);
        expect(chain.is).toHaveBeenCalledWith('deleted_at', null);
        expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
      });

      it('should transform database format to UI format', async () => {
        const mockData = [
          {
            id: 'match-1',
            opponent: 'Test Team',
            state: 'running',
            created_at: '2026-01-10T10:00:00Z',
            started_at: '2026-01-10T10:05:00Z',
            type: 'league',
            venue_type: 'home'
          }
        ];

        const chain = createQueryChain({ data: mockData });
        supabase.from.mockReturnValue(chain);

        const result = await getActiveMatches('team-123');

        expect(result.success).toBe(true);
        expect(result.matches[0]).toEqual({
          id: 'match-1',
          opponent: 'Test Team',
          state: 'running',
          createdAt: '2026-01-10T10:00:00Z',
          startedAt: '2026-01-10T10:05:00Z',
          type: 'league',
          venueType: 'home'
        });
      });

      it('should default opponent to "Internal Match" when null', async () => {
        const mockData = [
          {
            id: 'match-1',
            opponent: null,
            state: 'pending',
            created_at: '2026-01-10T10:00:00Z',
            started_at: null,
            type: 'friendly',
            venue_type: 'neutral'
          }
        ];

        const chain = createQueryChain({ data: mockData });
        supabase.from.mockReturnValue(chain);

        const result = await getActiveMatches('team-123');

        expect(result.success).toBe(true);
        expect(result.matches[0].opponent).toBe('Internal Match');
      });

      it('should return empty array when no matches found', async () => {
        const chain = createQueryChain({ data: [] });
        supabase.from.mockReturnValue(chain);

        const result = await getActiveMatches('team-123');

        expect(result.success).toBe(true);
        expect(result.matches).toEqual([]);
      });

      it('should filter by pending and running states only', async () => {
        const chain = createQueryChain({ data: [] });
        supabase.from.mockReturnValue(chain);

        await getActiveMatches('team-123');

        expect(chain.in).toHaveBeenCalledWith('state', ['pending', 'running']);
      });

      it('should exclude deleted matches', async () => {
        const chain = createQueryChain({ data: [] });
        supabase.from.mockReturnValue(chain);

        await getActiveMatches('team-123');

        expect(chain.is).toHaveBeenCalledWith('deleted_at', null);
      });

      it('should order by created_at descending', async () => {
        const chain = createQueryChain({ data: [] });
        supabase.from.mockReturnValue(chain);

        await getActiveMatches('team-123');

        expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
      });
    });

    describe('Error Handling', () => {
      it('should return error when teamId is missing', async () => {
        const result = await getActiveMatches(null);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Team ID is required');
        expect(supabase.from).not.toHaveBeenCalled();
      });

      it('should return error when teamId is undefined', async () => {
        const result = await getActiveMatches(undefined);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Team ID is required');
      });

      it('should return error when teamId is empty string', async () => {
        const result = await getActiveMatches('');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Team ID is required');
      });

      it('should handle database query errors', async () => {
        const chain = createQueryChain({
          data: null,
          error: { message: 'Database connection failed' }
        });
        supabase.from.mockReturnValue(chain);

        const result = await getActiveMatches('team-123');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Database error: Database connection failed');
        expect(console.error).toHaveBeenCalledWith(
          'Failed to get active matches:',
          expect.objectContaining({ message: 'Database connection failed' })
        );
      });

      it('should handle unexpected exceptions', async () => {
        supabase.from.mockImplementation(() => {
          throw new Error('Unexpected error');
        });

        const result = await getActiveMatches('team-123');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Unexpected error: Unexpected error');
        expect(console.error).toHaveBeenCalledWith(
          'Exception while getting active matches:',
          expect.any(Error)
        );
      });
    });

    describe('Data Transformation', () => {
      it('should map created_at to createdAt', async () => {
        const mockData = [{
          id: 'match-1',
          opponent: 'Team A',
          state: 'running',
          created_at: '2026-01-10T10:00:00Z',
          started_at: null,
          type: 'league',
          venue_type: 'home'
        }];

        const chain = createQueryChain({ data: mockData });
        supabase.from.mockReturnValue(chain);

        const result = await getActiveMatches('team-123');

        expect(result.matches[0].createdAt).toBe('2026-01-10T10:00:00Z');
        expect(result.matches[0].created_at).toBeUndefined();
      });

      it('should map started_at to startedAt', async () => {
        const mockData = [{
          id: 'match-1',
          opponent: 'Team A',
          state: 'running',
          created_at: '2026-01-10T10:00:00Z',
          started_at: '2026-01-10T10:05:00Z',
          type: 'league',
          venue_type: 'home'
        }];

        const chain = createQueryChain({ data: mockData });
        supabase.from.mockReturnValue(chain);

        const result = await getActiveMatches('team-123');

        expect(result.matches[0].startedAt).toBe('2026-01-10T10:05:00Z');
        expect(result.matches[0].started_at).toBeUndefined();
      });

      it('should map venue_type to venueType', async () => {
        const mockData = [{
          id: 'match-1',
          opponent: 'Team A',
          state: 'running',
          created_at: '2026-01-10T10:00:00Z',
          started_at: null,
          type: 'league',
          venue_type: 'away'
        }];

        const chain = createQueryChain({ data: mockData });
        supabase.from.mockReturnValue(chain);

        const result = await getActiveMatches('team-123');

        expect(result.matches[0].venueType).toBe('away');
        expect(result.matches[0].venue_type).toBeUndefined();
      });

      it('should map linked upcoming match schedule for pending matches', async () => {
        const mockData = [{
          id: 'match-1',
          opponent: 'Team A',
          state: 'pending',
          created_at: '2026-01-10T10:00:00Z',
          started_at: null,
          type: 'friendly',
          venue_type: 'home',
          upcoming_match: [{
            match_date: '2030-05-01',
            match_time: '18:00:00'
          }]
        }];

        const chain = createQueryChain({ data: mockData });
        supabase.from.mockReturnValue(chain);

        const result = await getActiveMatches('team-123');

        expect(result.matches[0].matchDate).toBe('2030-05-01');
        expect(result.matches[0].matchTime).toBe('18:00:00');
      });

      it('should preserve id, state, and type fields', async () => {
        const mockData = [{
          id: 'match-1',
          opponent: 'Team A',
          state: 'pending',
          created_at: '2026-01-10T10:00:00Z',
          started_at: null,
          type: 'friendly',
          venue_type: 'home'
        }];

        const chain = createQueryChain({ data: mockData });
        supabase.from.mockReturnValue(chain);

        const result = await getActiveMatches('team-123');

        expect(result.matches[0].id).toBe('match-1');
        expect(result.matches[0].state).toBe('pending');
        expect(result.matches[0].type).toBe('friendly');
      });

      it('should handle null startedAt for pending matches', async () => {
        const mockData = [{
          id: 'match-1',
          opponent: 'Team A',
          state: 'pending',
          created_at: '2026-01-10T10:00:00Z',
          started_at: null,
          type: 'league',
          venue_type: 'home'
        }];

        const chain = createQueryChain({ data: mockData });
        supabase.from.mockReturnValue(chain);

        const result = await getActiveMatches('team-123');

        expect(result.matches[0].startedAt).toBeNull();
      });
    });

    describe('Edge Cases', () => {
      it('should handle null data from Supabase', async () => {
        const chain = createQueryChain({ data: null });
        supabase.from.mockReturnValue(chain);

        const result = await getActiveMatches('team-123');

        expect(result.success).toBe(true);
        expect(result.matches).toEqual([]);
      });

      it('should handle matches with missing optional fields', async () => {
        const mockData = [{
          id: 'match-1',
          opponent: 'Team A',
          state: 'running',
          created_at: '2026-01-10T10:00:00Z',
          started_at: null,
          type: null,
          venue_type: null
        }];

        const chain = createQueryChain({ data: mockData });
        supabase.from.mockReturnValue(chain);

        const result = await getActiveMatches('team-123');

        expect(result.success).toBe(true);
        expect(result.matches[0].type).toBeNull();
        expect(result.matches[0].venueType).toBeNull();
      });

      it('should handle large result sets', async () => {
        const mockData = Array.from({ length: 100 }, (_, i) => ({
          id: `match-${i}`,
          opponent: `Team ${i}`,
          state: i % 2 === 0 ? 'running' : 'pending',
          created_at: '2026-01-10T10:00:00Z',
          started_at: i % 2 === 0 ? '2026-01-10T10:05:00Z' : null,
          type: 'league',
          venue_type: 'home'
        }));

        const chain = createQueryChain({ data: mockData });
        supabase.from.mockReturnValue(chain);

        const result = await getActiveMatches('team-123');

        expect(result.success).toBe(true);
        expect(result.matches).toHaveLength(100);
      });
    });
  });
});
