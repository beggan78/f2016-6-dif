/**
 * Tests for connectorService
 */

import {
  getTeamConnectors,
  connectProvider,
  disconnectProvider,
  triggerManualSync,
  getLatestSyncJob,
  getRecentSyncJobs,
  matchPlayerToAttendance,
  retryConnector,
  getPlayerConnectionDetails,
  getAttendanceStats
} from '../connectorService';
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
    functions: {
      invoke: jest.fn()
    }
  }
}));

const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('connectorService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('getTeamConnectors', () => {
    it('throws when teamId is missing', async () => {
      await expect(getTeamConnectors(null)).rejects.toThrow('Team ID is required');
    });

    it('returns connector list on success', async () => {
      const connectors = [{ id: '1' }];
      const order = jest.fn().mockResolvedValue({ data: connectors, error: null });
      const eq = jest.fn(() => ({ order }));
      const select = jest.fn(() => ({ eq }));
      supabase.from.mockReturnValue({ select });

      const result = await getTeamConnectors('team-1');

      expect(supabase.from).toHaveBeenCalledWith('connector');
      expect(select).toHaveBeenCalledWith('*');
      expect(eq).toHaveBeenCalledWith('team_id', 'team-1');
      expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result).toEqual(connectors);
    });

    it('propagates supabase errors', async () => {
      const order = jest.fn().mockResolvedValue({ data: null, error: { message: 'db error' } });
      const eq = jest.fn(() => ({ order }));
      const select = jest.fn(() => ({ eq }));
      supabase.from.mockReturnValue({ select });

      await expect(getTeamConnectors('team-1')).rejects.toThrow('Failed to load connectors');
      expect(console.error).toHaveBeenCalledWith('Error fetching team connectors:', { message: 'db error' });
    });
  });

  describe('connectProvider', () => {
    const teamId = 'team-1';
    const provider = 'sportadmin';
    const credentials = { username: 'coach', password: 'secret' };

    it('validates required parameters', async () => {
      await expect(connectProvider(null, provider, credentials)).rejects.toThrow(
        'Team ID, provider, username, and password are required'
      );
      await expect(connectProvider(teamId, null, credentials)).rejects.toThrow(
        'Team ID, provider, username, and password are required'
      );
      await expect(connectProvider(teamId, provider, { username: '', password: '' })).rejects.toThrow(
        'Team ID, provider, username, and password are required'
      );
    });

    it('validates credential length', async () => {
      const longUsername = 'x'.repeat(101);
      await expect(
        connectProvider(teamId, provider, { username: longUsername, password: 'pass' })
      ).rejects.toThrow('Username must be 100 characters or less');

      const longPassword = 'y'.repeat(201);
      await expect(
        connectProvider(teamId, provider, { username: 'user', password: longPassword })
      ).rejects.toThrow('Password must be 200 characters or less');
    });

    it('invokes supabase function and returns payload on success', async () => {
      const payload = { connector_id: 'abc' };
      supabase.functions.invoke.mockResolvedValue({ data: payload, error: null });

      const result = await connectProvider(teamId, provider, credentials);

      expect(supabase.functions.invoke).toHaveBeenCalledWith('connect-provider', {
        body: {
          team_id: teamId,
          provider,
          username: credentials.username,
          password: credentials.password
        }
      });
      expect(result).toEqual(payload);
    });

    it('throws when invoke returns an error payload', async () => {
      supabase.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'Server unavailable' }
      });

      await expect(connectProvider(teamId, provider, credentials)).rejects.toThrow('Server unavailable');
    });

    it('throws friendly message when edge function is not deployed', async () => {
      const relayError = new Error('FunctionsRelayError: not deployed');
      supabase.functions.invoke.mockRejectedValue(relayError);

      await expect(connectProvider(teamId, provider, credentials)).rejects.toThrow(
        'The connector service is not yet deployed. This feature will be available once the backend Edge Function is set up.'
      );
    });

    it('rethrows unexpected invoke errors', async () => {
      const unexpected = new Error('boom');
      supabase.functions.invoke.mockRejectedValue(unexpected);

      await expect(connectProvider(teamId, provider, credentials)).rejects.toThrow('boom');
    });
  });

  describe('disconnectProvider', () => {
    it('requires connector id', async () => {
      await expect(disconnectProvider()).rejects.toThrow('Connector ID is required');
    });

    it('calls delete on supabase', async () => {
      const chain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null })
      };
      supabase.from.mockReturnValue(chain);

      await disconnectProvider('connector-1');

      expect(supabase.from).toHaveBeenCalledWith('connector');
      expect(chain.delete).toHaveBeenCalled();
      expect(chain.eq).toHaveBeenCalledWith('id', 'connector-1');
    });

    it('throws when supabase returns error', async () => {
      const chain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: { message: 'nope' } })
      };
      supabase.from.mockReturnValue(chain);

      await expect(disconnectProvider('connector-1')).rejects.toThrow('Failed to disconnect provider');
    });
  });

  describe('triggerManualSync', () => {
    it('throws when connector id missing', async () => {
      await expect(triggerManualSync()).rejects.toThrow('Connector ID is required');
    });

    it('calls rpc and returns job id', async () => {
      supabase.rpc.mockResolvedValue({ data: 'job-1', error: null });

      const jobId = await triggerManualSync('connector-1');

      expect(supabase.rpc).toHaveBeenCalledWith('create_manual_sync_job', {
        p_connector_id: 'connector-1'
      });
      expect(jobId).toBe('job-1');
    });

    it('throws when rpc errors', async () => {
      supabase.rpc.mockResolvedValue({ data: null, error: { message: 'rpc failed' } });

      await expect(triggerManualSync('connector-1')).rejects.toThrow('Failed to trigger manual sync');
    });
  });

  describe('retryConnector', () => {
    it('requires connector id', async () => {
      await expect(retryConnector()).rejects.toThrow('Connector ID is required');
    });

    it('updates status and triggers manual sync', async () => {
      const eq = jest.fn().mockResolvedValue({ error: null });
      const update = jest.fn(() => ({ eq }));
      supabase.from.mockReturnValue({ update });
      supabase.rpc.mockResolvedValue({ data: 'job-123', error: null });

      await retryConnector('connector-1');

      expect(supabase.from).toHaveBeenCalledWith('connector');
      expect(update).toHaveBeenCalledWith({
        status: 'verifying',
        last_error: null
      });
      expect(eq).toHaveBeenCalledWith('id', 'connector-1');
      expect(supabase.rpc).toHaveBeenCalledWith('create_manual_sync_job', {
        p_connector_id: 'connector-1'
      });
    });

    it('reverts status when manual sync fails', async () => {
      const initialEq = jest.fn().mockResolvedValue({ error: null });
      const initialUpdate = jest.fn(() => ({ eq: initialEq }));

      const revertEq = jest.fn().mockResolvedValue({ error: null });
      const revertUpdate = jest.fn(() => ({ eq: revertEq }));

      supabase.from
        .mockReturnValueOnce({ update: initialUpdate })
        .mockReturnValueOnce({ update: revertUpdate });

      supabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'rpc failed' }
      });

      await expect(retryConnector('connector-1')).rejects.toThrow('Failed to queue verification job');

      expect(supabase.rpc).toHaveBeenCalledWith('create_manual_sync_job', {
        p_connector_id: 'connector-1'
      });
      expect(console.error).toHaveBeenCalledWith('Error triggering manual sync:', { message: 'rpc failed' });
      expect(console.error).toHaveBeenCalledWith(
        'Error triggering manual sync during retry:',
        expect.any(Error)
      );
      expect(revertUpdate).toHaveBeenCalledWith({
        status: 'error',
        last_error: 'Failed to queue verification job. Please try again.'
      });
      expect(revertEq).toHaveBeenCalledWith('id', 'connector-1');
    });
  });

  describe('getLatestSyncJob', () => {
    it('returns most recent job', async () => {
      const jobs = [{ id: 'latest' }];
      const limit = jest.fn().mockResolvedValue({ data: jobs, error: null });
      const order = jest.fn(() => ({ limit }));
      const eq = jest.fn(() => ({ order }));
      const select = jest.fn(() => ({ eq }));
      supabase.from.mockReturnValue({ select });

      const result = await getLatestSyncJob('connector-1');

      expect(supabase.from).toHaveBeenCalledWith('connector_sync_job');
      expect(limit).toHaveBeenCalledWith(1);
      expect(result).toEqual(jobs[0]);
    });

    it('returns null when no jobs found', async () => {
      const limit = jest.fn().mockResolvedValue({ data: [], error: null });
      const order = jest.fn(() => ({ limit }));
      const eq = jest.fn(() => ({ order }));
      const select = jest.fn(() => ({ eq }));
      supabase.from.mockReturnValue({ select });

      const result = await getLatestSyncJob('connector-1');
      expect(result).toBeNull();
    });
  });

  describe('getPlayerConnectionDetails', () => {
    it('handles attendance records with missing connector reference', async () => {
      const connectorOrder = jest.fn().mockResolvedValue({ data: [], error: null });
      const connectorEq = jest.fn(() => ({ order: connectorOrder }));
      const connectorSelect = jest.fn(() => ({ eq: connectorEq }));

      const attendanceRecords = [
        {
          id: 'att-1',
          player_id: null,
          player_name: 'Orphaned Player',
          last_synced_at: '2024-01-01T00:00:00Z',
          connector: null
        }
      ];

      const attendanceEq = jest.fn().mockResolvedValue({
        data: attendanceRecords,
        error: null
      });
      const attendanceSelect = jest.fn(() => ({ eq: attendanceEq }));

      supabase.from.mockImplementation(table => {
        if (table === 'connector') {
          return { select: connectorSelect };
        }
        if (table === 'player_attendance') {
          return { select: attendanceSelect };
        }
        return { select: jest.fn() };
      });

      const result = await getPlayerConnectionDetails('team-1');

      expect(result.hasConnectedProvider).toBe(false);
      expect(result.matchedConnections.size).toBe(0);
      expect(result.unmatchedAttendance).toEqual([
        {
          attendanceId: 'att-1',
          providerName: 'Unknown connector',
          providerId: null,
          playerNameInProvider: 'Orphaned Player',
          lastSynced: '2024-01-01T00:00:00Z',
          connectorStatus: null,
          connectorId: null
        }
      ]);
    });

    it('deduplicates matched attendance records per connector using the latest sync', async () => {
      const connectors = [
        { id: 'connector-1', provider: 'sportadmin', status: 'connected', team_id: 'team-1' }
      ];
      const connectorOrder = jest.fn().mockResolvedValue({ data: connectors, error: null });
      const connectorEq = jest.fn(() => ({ order: connectorOrder }));
      const connectorSelect = jest.fn(() => ({ eq: connectorEq }));

      const attendanceRecords = [
        {
          id: 'att-old',
          player_id: 'player-1',
          player_name: 'Ebba Yngbrant',
          last_synced_at: '2024-01-10T00:00:00Z',
          connector: connectors[0]
        },
        {
          id: 'att-new',
          player_id: 'player-1',
          player_name: 'Ebba Yngbrant',
          last_synced_at: '2024-02-15T00:00:00Z',
          connector: connectors[0]
        }
      ];

      const attendanceEq = jest.fn().mockResolvedValue({
        data: attendanceRecords,
        error: null
      });
      const attendanceSelect = jest.fn(() => ({ eq: attendanceEq }));

      supabase.from.mockImplementation(table => {
        if (table === 'connector') {
          return { select: connectorSelect };
        }
        if (table === 'player_attendance') {
          return { select: attendanceSelect };
        }
        return { select: jest.fn() };
      });

      const result = await getPlayerConnectionDetails('team-1');

      expect(result.hasConnectedProvider).toBe(true);
      expect(result.matchedConnections.size).toBe(1);

      const connections = result.matchedConnections.get('player-1');
      expect(connections).toEqual([
        {
          attendanceId: 'att-new',
          providerName: 'SportAdmin',
          providerId: 'sportadmin',
          playerNameInProvider: 'Ebba Yngbrant',
          lastSynced: '2024-02-15T00:00:00Z',
          connectorStatus: 'connected',
          connectorId: 'connector-1'
        }
      ]);
    });
  });

  describe('getRecentSyncJobs', () => {
    it('fetches jobs for connector', async () => {
      const jobs = [{ id: 'job-1' }];
      const limit = jest.fn().mockResolvedValue({ data: jobs, error: null });
      const order = jest.fn(() => ({ limit }));
      const eq = jest.fn(() => ({ order }));
      const select = jest.fn(() => ({ eq }));
      supabase.from.mockReturnValue({ select });

      const result = await getRecentSyncJobs('connector-1', 5);

      expect(supabase.from).toHaveBeenCalledWith('connector_sync_job');
      expect(select).toHaveBeenCalledWith('*');
      expect(eq).toHaveBeenCalledWith('connector_id', 'connector-1');
      expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(limit).toHaveBeenCalledWith(5);
      expect(result).toEqual(jobs);
    });

    it('throws when connector id missing', async () => {
      await expect(getRecentSyncJobs(null)).rejects.toThrow('Connector ID is required');
    });

    it('throws when supabase errors', async () => {
      const limit = jest.fn().mockResolvedValue({ data: null, error: { message: 'oops' } });
      const order = jest.fn(() => ({ limit }));
      const eq = jest.fn(() => ({ order }));
      const select = jest.fn(() => ({ eq }));
      supabase.from.mockReturnValue({ select });

      await expect(getRecentSyncJobs('connector-1')).rejects.toThrow('Failed to load sync jobs');
    });
  });

  describe('matchPlayerToAttendance', () => {
    it('validates parameters', async () => {
      await expect(matchPlayerToAttendance(null, 'player')).rejects.toThrow(
        'Attendance ID and player ID are required'
      );
      await expect(matchPlayerToAttendance('attendance', null)).rejects.toThrow(
        'Attendance ID and player ID are required'
      );
    });

    it('updates attendance record', async () => {
      const chain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null })
      };
      supabase.from.mockReturnValue(chain);

      await matchPlayerToAttendance('attendance', 'player');

      expect(supabase.from).toHaveBeenCalledWith('player_attendance');
      expect(chain.update).toHaveBeenCalledWith({ player_id: 'player' });
      expect(chain.eq).toHaveBeenCalledWith('id', 'attendance');
    });

    it('throws on update failure', async () => {
      const chain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: { message: 'fail' } })
      };
      supabase.from.mockReturnValue(chain);

      await expect(matchPlayerToAttendance('attendance', 'player')).rejects.toThrow('Failed to match player');
    });
  });

  describe('getAttendanceStats', () => {
    const teamId = 'team-123';
    const startDate = new Date('2025-01-01');
    const endDate = new Date('2025-01-31');

    const mockConnectors = [
      { id: 'connector-1', status: 'connected', provider: 'sportadmin' }
    ];

    const mockAttendanceData = [
      {
        id: 'att-1',
        player_id: 'player-1',
        player_name: 'Alice Johnson',
        year: 2025,
        month: 1,
        day_of_month: 5,
        total_practices: 5,
        total_attendance: 4,
        connector: { id: 'connector-1', provider: 'sportadmin' }
      },
      {
        id: 'att-2',
        player_id: 'player-1',
        player_name: 'Alice Johnson',
        year: 2025,
        month: 1,
        day_of_month: 20,
        total_practices: 5,
        total_attendance: 5,
        connector: { id: 'connector-1', provider: 'sportadmin' }
      },
      {
        id: 'att-3',
        player_id: 'player-1',
        player_name: 'Alice Johnson',
        year: 2025,
        month: 2,
        day_of_month: 2,
        total_practices: 8,
        total_attendance: 7,
        connector: { id: 'connector-1', provider: 'sportadmin' }
      },
      {
        id: 'att-4',
        player_id: 'player-2',
        player_name: 'Bob Smith',
        year: 2025,
        month: 1,
        day_of_month: 15,
        total_practices: 10,
        total_attendance: 8,
        connector: { id: 'connector-1', provider: 'sportadmin' }
      }
    ];

    const mockPlayers = [
      { id: 'player-1', display_name: 'Alice Johnson', first_name: 'Alice' },
      { id: 'player-2', display_name: 'Bob Smith', first_name: 'Bob' }
    ];

    const mockMatchStats = [
      {
        player_id: 'player-1',
        match: {
          id: 'match-1',
          team_id: teamId,
          state: 'finished',
          deleted_at: null,
          started_at: '2025-01-15T10:00:00Z'
        }
      },
      {
        player_id: 'player-1',
        match: {
          id: 'match-2',
          team_id: teamId,
          state: 'finished',
          deleted_at: null,
          started_at: '2025-01-20T10:00:00Z'
        }
      },
      {
        player_id: 'player-2',
        match: {
          id: 'match-1',
          team_id: teamId,
          state: 'finished',
          deleted_at: null,
          started_at: '2025-01-15T10:00:00Z'
        }
      }
    ];

    const buildConnectorsChain = (data, error = null) => {
      const connectorsOrder = jest.fn().mockResolvedValue({ data, error });
      const connectorsEq = jest.fn(() => ({ order: connectorsOrder }));
      const connectorsSelect = jest.fn(() => ({ eq: connectorsEq }));
      return { connectorsSelect };
    };

    const buildAttendanceChain = (data, error = null) => {
      const dayOrder = jest.fn().mockResolvedValue({ data, error });
      const monthOrder = jest.fn(() => ({ order: dayOrder }));
      const yearOrder = jest.fn(() => ({ order: monthOrder }));
      const attendanceNot = jest.fn(() => ({ order: yearOrder }));
      const attendanceIn = jest.fn(() => ({ not: attendanceNot }));
      const attendanceSelect = jest.fn(() => ({ in: attendanceIn }));
      return { attendanceSelect };
    };

    const buildPlayersChain = (data, error = null) => {
      const playersEq = jest.fn().mockResolvedValue({ data, error });
      const playersIn = jest.fn(() => ({ eq: playersEq }));
      const playersSelect = jest.fn(() => ({ in: playersIn }));
      return { playersSelect };
    };

    const buildMatchStatsChain = (data, error = null) => {
      const matchStatsIn = jest.fn().mockResolvedValue({ data, error });
      const matchStatsSelect = jest.fn(() => ({ in: matchStatsIn }));
      return { matchStatsSelect };
    };

    const setupSupabase = ({
      connectorsData = mockConnectors,
      connectorsError = null,
      attendanceData = mockAttendanceData,
      attendanceError = null,
      playersData = mockPlayers,
      playersError = null,
      matchStatsData = mockMatchStats,
      matchStatsError = null
    } = {}) => {
      const connectorChain = buildConnectorsChain(connectorsData, connectorsError);
      const attendanceChain = buildAttendanceChain(attendanceData, attendanceError);
      const playersChain = buildPlayersChain(playersData, playersError);
      const matchStatsChain = buildMatchStatsChain(matchStatsData, matchStatsError);

      supabase.from.mockImplementation((table) => {
        if (table === 'connector') {
          return { select: connectorChain.connectorsSelect };
        }
        if (table === 'player_attendance') {
          return { select: attendanceChain.attendanceSelect };
        }
        if (table === 'player') {
          return { select: playersChain.playersSelect };
        }
        if (table === 'player_match_stats') {
          return { select: matchStatsChain.matchStatsSelect };
        }
        return { select: jest.fn() };
      });
    };

    beforeEach(() => {
      setupSupabase();
    });

    it('requires team id', async () => {
      await expect(getAttendanceStats(null)).rejects.toThrow('Team ID is required');
    });

    it('returns empty array when no connectors are connected', async () => {
      setupSupabase({
        connectorsData: [
          { id: 'connector-1', status: 'verifying', provider: 'sportadmin' }
        ],
        attendanceData: []
      });

      const result = await getAttendanceStats(teamId);
      expect(result).toEqual([]);
    });

    it('returns empty array when only verifying/error connectors exist', async () => {
      setupSupabase({
        connectorsData: [
          { id: 'connector-1', status: 'verifying', provider: 'sportadmin' },
          { id: 'connector-2', status: 'error', provider: 'svenska_lag' }
        ],
        attendanceData: []
      });

      const result = await getAttendanceStats(teamId);
      expect(result).toEqual([]);
    });

    it('fetches and aggregates attendance data correctly', async () => {
      const result = await getAttendanceStats(teamId);

      expect(result).toHaveLength(2);

      const alice = result.find(p => p.playerId === 'player-1');
      expect(alice).toEqual({
        playerId: 'player-1',
        playerName: 'Alice Johnson',
        totalPractices: 18, // 5 + 5 + 8
        totalAttendance: 16, // 4 + 5 + 7
        attendanceRate: 88.9,
        matchesPlayed: 2,
        practicesPerMatch: 8.0,
        attendanceRecords: expect.arrayContaining([
          { date: '2025-01-05', year: 2025, month: 1, day: 5, practices: 5, attendance: 4 },
          { date: '2025-01-20', year: 2025, month: 1, day: 20, practices: 5, attendance: 5 },
          { date: '2025-02-02', year: 2025, month: 2, day: 2, practices: 8, attendance: 7 }
        ]),
        monthlyRecords: expect.arrayContaining([
          { date: '2025-01-05', year: 2025, month: 1, day: 5, practices: 5, attendance: 4 },
          { date: '2025-01-20', year: 2025, month: 1, day: 20, practices: 5, attendance: 5 },
          { date: '2025-02-02', year: 2025, month: 2, day: 2, practices: 8, attendance: 7 }
        ])
      });

      const bob = result.find(p => p.playerId === 'player-2');
      expect(bob).toEqual({
        playerId: 'player-2',
        playerName: 'Bob Smith',
        totalPractices: 10,
        totalAttendance: 8,
        attendanceRate: 80.0,
        matchesPlayed: 1,
        practicesPerMatch: 8.0,
        attendanceRecords: [{ date: '2025-01-15', year: 2025, month: 1, day: 15, practices: 10, attendance: 8 }],
        monthlyRecords: [{ date: '2025-01-15', year: 2025, month: 1, day: 15, practices: 10, attendance: 8 }]
      });
    });

    it('filters attendance records by exact date range', async () => {
      const result = await getAttendanceStats(teamId, startDate, endDate);

      const alice = result.find(p => p.playerId === 'player-1');
      expect(alice.totalPractices).toBe(10); // Only January entries
      expect(alice.totalAttendance).toBe(9);
      expect(alice.attendanceRecords).toHaveLength(2);
      expect(alice.attendanceRecords.every(r => r.month === 1)).toBe(true);

      const bob = result.find(p => p.playerId === 'player-2');
      expect(bob.totalPractices).toBe(10);
      expect(bob.totalAttendance).toBe(8);
    });

    it('sorts results by player name', async () => {
      const result = await getAttendanceStats(teamId);

      expect(result[0].playerName).toBe('Alice Johnson');
      expect(result[1].playerName).toBe('Bob Smith');
    });

    it('uses display_name when available, falls back to first_name', async () => {
      setupSupabase({
        playersData: [
          { id: 'player-1', display_name: null, first_name: 'Alice' },
          { id: 'player-2', display_name: 'Bob Smith', first_name: 'Bob' }
        ]
      });

      const result = await getAttendanceStats(teamId);

      const alice = result.find(p => p.playerId === 'player-1');
      expect(alice.playerName).toBe('Alice');
    });

    it('handles missing player records gracefully', async () => {
      setupSupabase({ playersData: [] });

      const result = await getAttendanceStats(teamId);
      expect(result[0].playerName).toBe('Unknown Player');
    });

    it('filters match stats by team id', async () => {
      const mixedMatchStats = [
        ...mockMatchStats,
        {
          player_id: 'player-1',
          match: {
            id: 'match-other',
            team_id: 'other-team',
            state: 'finished',
            deleted_at: null,
            started_at: '2025-01-15T10:00:00Z'
          }
        }
      ];

      setupSupabase({ matchStatsData: mixedMatchStats });

      const result = await getAttendanceStats(teamId);
      const alice = result.find(p => p.playerId === 'player-1');
      expect(alice.matchesPlayed).toBe(2); // Should not count other-team match
    });

    it('filters match stats by finished state', async () => {
      const mixedMatchStats = [
        mockMatchStats[0],
        {
          player_id: 'player-1',
          match: {
            id: 'match-running',
            team_id: teamId,
            state: 'running',
            deleted_at: null,
            started_at: '2025-01-20T10:00:00Z'
          }
        }
      ];

      setupSupabase({ matchStatsData: mixedMatchStats });

      const result = await getAttendanceStats(teamId);
      const alice = result.find(p => p.playerId === 'player-1');
      expect(alice.matchesPlayed).toBe(1); // Should not count running match
    });

    it('excludes deleted matches', async () => {
      const mixedMatchStats = [
        mockMatchStats[0],
        {
          player_id: 'player-1',
          match: {
            id: 'match-deleted',
            team_id: teamId,
            state: 'finished',
            deleted_at: '2025-01-25T10:00:00Z',
            started_at: '2025-01-20T10:00:00Z'
          }
        }
      ];

      setupSupabase({ matchStatsData: mixedMatchStats });

      const result = await getAttendanceStats(teamId);
      const alice = result.find(p => p.playerId === 'player-1');
      expect(alice.matchesPlayed).toBe(1); // Should not count deleted match
    });

    it('filters matches by date range when provided', async () => {
      const result = await getAttendanceStats(teamId, startDate, endDate);

      // Both matches in mockMatchStats are within Jan 2025
      const alice = result.find(p => p.playerId === 'player-1');
      expect(alice.matchesPlayed).toBe(2);
    });

    it('excludes matches outside date range', async () => {
      const mixedMatchStats = [
        mockMatchStats[0],
        {
          player_id: 'player-1',
          match: {
            id: 'match-future',
            team_id: teamId,
            state: 'finished',
            deleted_at: null,
            started_at: '2025-02-15T10:00:00Z' // Outside date range
          }
        }
      ];

      setupSupabase({ matchStatsData: mixedMatchStats });

      const result = await getAttendanceStats(teamId, startDate, endDate);
      const alice = result.find(p => p.playerId === 'player-1');
      expect(alice.matchesPlayed).toBe(1); // Should not count future match
    });

    it('handles zero matches played correctly', async () => {
      setupSupabase({ matchStatsData: [] });

      const result = await getAttendanceStats(teamId);
      const alice = result.find(p => p.playerId === 'player-1');
      expect(alice.matchesPlayed).toBe(0);
      expect(alice.practicesPerMatch).toBe(0);
    });

    it('handles zero practices correctly', async () => {
      const zeroAttendance = [
        {
          id: 'att-1',
          player_id: 'player-1',
          player_name: 'Alice Johnson',
          year: 2025,
          month: 1,
          day_of_month: 10,
          total_practices: 0,
          total_attendance: 0,
          connector: { id: 'connector-1', provider: 'sportadmin' }
        }
      ];

      setupSupabase({ attendanceData: zeroAttendance });

      const result = await getAttendanceStats(teamId);
      const alice = result.find(p => p.playerId === 'player-1');
      expect(alice.attendanceRate).toBe(0);
    });

    it('only includes matched players (player_id not null)', async () => {
      const mixedAttendance = [
        ...mockAttendanceData,
        {
          id: 'att-unmatched',
          player_id: null, // Unmatched
          player_name: 'Unmatched Player',
          year: 2025,
          month: 1,
          day_of_month: 7,
          total_practices: 1,
          total_attendance: 1,
          connector: { id: 'connector-1', provider: 'sportadmin' }
        }
      ];

      // Filter out null player_ids (simulating .not('player_id', 'is', null))
      const filteredAttendance = mixedAttendance.filter(a => a.player_id !== null);
      setupSupabase({ attendanceData: filteredAttendance });

      const result = await getAttendanceStats(teamId);

      // Should only have 2 players (Alice and Bob), not the unmatched one
      expect(result).toHaveLength(2);
      expect(result.every(p => p.playerId)).toBe(true);
    });

    it('throws when attendance data fetch fails', async () => {
      setupSupabase({ attendanceData: null, attendanceError: { message: 'db error' } });

      await expect(getAttendanceStats(teamId)).rejects.toThrow('Failed to load attendance data');
    });

    it('throws when player data fetch fails', async () => {
      setupSupabase({ playersData: null, playersError: { message: 'player error' } });

      await expect(getAttendanceStats(teamId)).rejects.toThrow('Failed to load player data');
    });

    it('throws when match stats fetch fails', async () => {
      setupSupabase({ matchStatsData: null, matchStatsError: { message: 'match error' } });

      await expect(getAttendanceStats(teamId)).rejects.toThrow('Failed to load match statistics');
    });
  });
});
