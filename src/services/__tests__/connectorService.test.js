/**
 * Tests for connectorService
 */

import {
  getTeamConnectors,
  connectProvider,
  disconnectProvider,
  triggerScraperWorkflow,
  triggerManualSync,
  getLatestSyncJob,
  getRecentSyncJobs,
  matchPlayerToConnectedPlayer,
  retryConnector,
  getPlayerConnectionDetails,
  getAttendanceStats,
  dismissGhostPlayer
} from '../connectorService';
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
    auth: {
      getUser: jest.fn()
    },
    functions: {
      invoke: jest.fn()
    }
  }
}));

const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

const buildUserProfileMock = (profileData, profileError = null) => {
  const single = jest.fn().mockResolvedValue({ data: profileData, error: profileError });
  const eq = jest.fn(() => ({ single }));
  const select = jest.fn(() => ({ eq }));

  return { select, eq, single };
};

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

  describe('triggerScraperWorkflow', () => {
    it('requires team id', async () => {
      await expect(triggerScraperWorkflow(null)).rejects.toThrow('Team ID is required');
    });

    it('returns success response when workflow triggered', async () => {
      const response = { success: true, message: 'Scraper workflow triggered successfully' };
      supabase.functions.invoke.mockResolvedValue({ data: response, error: null });

      const result = await triggerScraperWorkflow('team-123');

      expect(supabase.functions.invoke).toHaveBeenCalledWith('trigger-scraper-workflow', {
        body: { team_id: 'team-123' }
      });
      expect(result).toEqual(response);
    });

    it('returns failure on error without throwing', async () => {
      supabase.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'Server error' }
      });

      const result = await triggerScraperWorkflow('team-123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Server error');
    });

    it('catches and returns failure on exception', async () => {
      supabase.functions.invoke.mockRejectedValue(new Error('Network failure'));

      const result = await triggerScraperWorkflow('team-123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to trigger workflow');
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
    it('handles connected players with missing connector reference', async () => {
      const connectorOrder = jest.fn().mockResolvedValue({ data: [], error: null });
      const connectorEq = jest.fn(() => ({ order: connectorOrder }));
      const connectorSelect = jest.fn(() => ({ eq: connectorEq }));

      const connectedPlayerRecords = [
        {
          id: 'connected-1',
          player_id: null,
          player_name: 'Orphaned Player',
          connector: null
        }
      ];

      const connectedPlayerEqSecond = jest.fn().mockResolvedValue({
        data: connectedPlayerRecords,
        error: null
      });
      const connectedPlayerEq = jest.fn(() => ({ eq: connectedPlayerEqSecond }));
      const connectedPlayerSelect = jest.fn(() => ({ eq: connectedPlayerEq }));

      supabase.from.mockImplementation(table => {
        if (table === 'connector') {
          return { select: connectorSelect };
        }
        if (table === 'connected_player') {
          return { select: connectedPlayerSelect };
        }
        return { select: jest.fn() };
      });

      const result = await getPlayerConnectionDetails('team-1');

      expect(result.hasConnectedProvider).toBe(false);
      expect(result.matchedConnections.size).toBe(0);
      expect(result.unmatchedExternalPlayers).toEqual([
        {
          externalPlayerId: 'connected-1',
          providerName: 'Unknown connector',
          providerId: null,
          playerNameInProvider: 'Orphaned Player',
          connectorStatus: null,
          connectorId: null
        }
      ]);
    });

    it('groups matched connected players by roster player id', async () => {
      const connectors = [
        { id: 'connector-1', provider: 'sportadmin', status: 'connected', team_id: 'team-1' },
        { id: 'connector-2', provider: 'svenska_lag', status: 'connected', team_id: 'team-1' }
      ];
      const connectorOrder = jest.fn().mockResolvedValue({ data: connectors, error: null });
      const connectorEq = jest.fn(() => ({ order: connectorOrder }));
      const connectorSelect = jest.fn(() => ({ eq: connectorEq }));

      const connectedPlayerRecords = [
        {
          id: 'connected-1',
          player_id: 'player-1',
          player_name: 'Ebba Yngbrant',
          connector: connectors[0]
        },
        {
          id: 'connected-2',
          player_id: 'player-1',
          player_name: 'Ebba Yngbrant',
          connector: connectors[1]
        }
      ];

      const connectedPlayerEqSecond = jest.fn().mockResolvedValue({
        data: connectedPlayerRecords,
        error: null
      });
      const connectedPlayerEq = jest.fn(() => ({ eq: connectedPlayerEqSecond }));
      const connectedPlayerSelect = jest.fn(() => ({ eq: connectedPlayerEq }));

      supabase.from.mockImplementation(table => {
        if (table === 'connector') {
          return { select: connectorSelect };
        }
        if (table === 'connected_player') {
          return { select: connectedPlayerSelect };
        }
        return { select: jest.fn() };
      });

      const result = await getPlayerConnectionDetails('team-1');

      expect(result.hasConnectedProvider).toBe(true);
      expect(result.matchedConnections.size).toBe(1);

      const connections = result.matchedConnections.get('player-1');
      expect(connections).toEqual([
        {
          externalPlayerId: 'connected-1',
          providerName: 'SportAdmin',
          providerId: 'sportadmin',
          playerNameInProvider: 'Ebba Yngbrant',
          connectorStatus: 'connected',
          connectorId: 'connector-1'
        },
        {
          externalPlayerId: 'connected-2',
          providerName: 'Svenska Lag',
          providerId: 'svenska_lag',
          playerNameInProvider: 'Ebba Yngbrant',
          connectorStatus: 'connected',
          connectorId: 'connector-2'
        }
      ]);
    });

    describe('hasConnectedProvider flag', () => {
      const setupMockConnectors = (connectors) => {
        const connectorOrder = jest.fn().mockResolvedValue({ data: connectors, error: null });
        const connectorEq = jest.fn(() => ({ order: connectorOrder }));
        const connectorSelect = jest.fn(() => ({ eq: connectorEq }));

        const connectedPlayerEqSecond = jest.fn().mockResolvedValue({ data: [], error: null });
        const connectedPlayerEq = jest.fn(() => ({ eq: connectedPlayerEqSecond }));
        const connectedPlayerSelect = jest.fn(() => ({ eq: connectedPlayerEq }));

        supabase.from.mockImplementation(table => {
          if (table === 'connector') {
            return { select: connectorSelect };
          }
          if (table === 'connected_player') {
            return { select: connectedPlayerSelect };
          }
          return { select: jest.fn() };
        });
      };

      it('returns true when connector status is "connected"', async () => {
        const connectors = [{ id: 'c1', status: 'connected', provider: 'sportadmin' }];
        setupMockConnectors(connectors);

        const result = await getPlayerConnectionDetails('team-1');
        expect(result.hasConnectedProvider).toBe(true);
      });

      it('returns true when connector status is "verifying"', async () => {
        const connectors = [{ id: 'c1', status: 'verifying', provider: 'sportadmin' }];
        setupMockConnectors(connectors);

        const result = await getPlayerConnectionDetails('team-1');
        expect(result.hasConnectedProvider).toBe(true);
      });

      it('returns true when connector status is "error"', async () => {
        const connectors = [{ id: 'c1', status: 'error', provider: 'sportadmin' }];
        setupMockConnectors(connectors);

        const result = await getPlayerConnectionDetails('team-1');
        expect(result.hasConnectedProvider).toBe(true);
      });

      it('returns false when connector status is "disconnected"', async () => {
        const connectors = [{ id: 'c1', status: 'disconnected', provider: 'sportadmin' }];
        setupMockConnectors(connectors);

        const result = await getPlayerConnectionDetails('team-1');
        expect(result.hasConnectedProvider).toBe(false);
      });

      it('returns false when no connectors exist', async () => {
        setupMockConnectors([]);

        const result = await getPlayerConnectionDetails('team-1');
        expect(result.hasConnectedProvider).toBe(false);
      });

      it('returns true when multiple connectors exist with mixed statuses (at least one not disconnected)', async () => {
        const connectors = [
          { id: 'c1', status: 'verifying', provider: 'sportadmin' },
          { id: 'c2', status: 'disconnected', provider: 'svenska_lag' },
          { id: 'c3', status: 'error', provider: 'myclub' }
        ];
        setupMockConnectors(connectors);

        const result = await getPlayerConnectionDetails('team-1');
        expect(result.hasConnectedProvider).toBe(true);
      });

      it('returns false when all connectors are disconnected', async () => {
        const connectors = [
          { id: 'c1', status: 'disconnected', provider: 'sportadmin' },
          { id: 'c2', status: 'disconnected', provider: 'svenska_lag' }
        ];
        setupMockConnectors(connectors);

        const result = await getPlayerConnectionDetails('team-1');
        expect(result.hasConnectedProvider).toBe(false);
      });
    });

    describe('includeFormerPlayers parameter', () => {
      const teamId = 'team-1';
      const connector = {
        id: 'conn-1',
        provider: 'sportadmin',
        status: 'connected',
        team_id: teamId
      };

      const setupMockData = (connectedPlayerData, connectorData = [connector]) => {
        const connectorOrder = jest.fn().mockResolvedValue({ data: connectorData, error: null });
        const connectorEq = jest.fn(() => ({ order: connectorOrder }));
        const connectorSelect = jest.fn(() => ({ eq: connectorEq }));

        // Create a mock that works for both one .eq() and two .eq() calls
        const resolvedData = { data: connectedPlayerData, error: null };
        const connectedPlayerEqSecond = jest.fn().mockResolvedValue(resolvedData);
        // Make the first .eq() return an object that has both the resolved value AND another .eq()
        const connectedPlayerEq = jest.fn(() =>
          Object.assign(Promise.resolve(resolvedData), { eq: connectedPlayerEqSecond })
        );
        const connectedPlayerSelect = jest.fn(() => ({ eq: connectedPlayerEq }));

        supabase.from.mockImplementation(table => {
          if (table === 'connector') {
            return { select: connectorSelect };
          }
          if (table === 'connected_player') {
            return { select: connectedPlayerSelect };
          }
          return { select: jest.fn() };
        });
      };

      it('excludes dismissed ghost players by default', async () => {
        const connectedPlayerData = [
          {
            id: 'active-1',
            player_id: null,
            player_name: 'Active Ghost',
            connector
          },
          {
            id: 'dismissed-1',
            player_id: null,
            player_name: 'Dismissed Ghost',
            connector
          }
        ];

        // Filter to simulate the database query filtering out dismissed players
        const filteredData = connectedPlayerData.filter((_, index) => index === 0);
        setupMockData(filteredData);

        const result = await getPlayerConnectionDetails(teamId);

        expect(result.unmatchedExternalPlayers).toHaveLength(1);
        expect(result.unmatchedExternalPlayers[0].externalPlayerId).toBe('active-1');
        expect(
          result.unmatchedExternalPlayers.find(p => p.externalPlayerId === 'dismissed-1')
        ).toBeUndefined();
      });

      it('excludes dismissed ghost players when includeFormerPlayers is explicitly false', async () => {
        const connectedPlayerData = [
          {
            id: 'active-1',
            player_id: null,
            player_name: 'Active Ghost',
            connector
          }
        ];

        setupMockData(connectedPlayerData);

        const result = await getPlayerConnectionDetails(teamId, false);

        expect(result.unmatchedExternalPlayers).toHaveLength(1);
        expect(result.unmatchedExternalPlayers[0].externalPlayerId).toBe('active-1');
      });

      it('includes dismissed ghost players when includeFormerPlayers is true', async () => {
        const connectedPlayerData = [
          {
            id: 'active-1',
            player_id: null,
            player_name: 'Active Ghost',
            connector
          },
          {
            id: 'dismissed-1',
            player_id: null,
            player_name: 'Dismissed Ghost',
            connector
          }
        ];

        // When includeFormerPlayers is true, return all players
        setupMockData(connectedPlayerData);

        const result = await getPlayerConnectionDetails(teamId, true);

        expect(result.unmatchedExternalPlayers).toHaveLength(2);
        expect(
          result.unmatchedExternalPlayers.find(p => p.externalPlayerId === 'active-1')
        ).toBeDefined();
        expect(
          result.unmatchedExternalPlayers.find(p => p.externalPlayerId === 'dismissed-1')
        ).toBeDefined();
      });

      it('returns empty unmatchedExternalPlayers when all ghosts are dismissed and includeFormerPlayers is false', async () => {
        // All players are dismissed, so query returns empty array
        setupMockData([]);

        const result = await getPlayerConnectionDetails(teamId);

        expect(result.unmatchedExternalPlayers).toHaveLength(0);
      });

      it('does not include dismissed players that have been matched (player_id set)', async () => {
        const connectedPlayerData = [
          {
            id: 'matched-dismissed-1',
            player_id: 'player-123',
            player_name: 'Matched Then Dismissed',
            connector
          }
        ];

        setupMockData(connectedPlayerData);

        const result = await getPlayerConnectionDetails(teamId, true);

        // Matched players should not appear in unmatchedExternalPlayers
        expect(result.unmatchedExternalPlayers).toHaveLength(0);
        // They should appear in matchedConnections instead
        expect(result.matchedConnections.has('player-123')).toBe(true);
      });
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

  describe('matchPlayerToConnectedPlayer', () => {
    it('validates parameters', async () => {
      await expect(matchPlayerToConnectedPlayer(null, 'player')).rejects.toThrow(
        'External player ID and player ID are required'
      );
      await expect(matchPlayerToConnectedPlayer('connected-player', null)).rejects.toThrow(
        'External player ID and player ID are required'
      );
    });

    it('updates attendance record', async () => {
      const chain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null })
      };
      supabase.from.mockReturnValue(chain);

      await matchPlayerToConnectedPlayer('connected-player', 'player');

      expect(supabase.from).toHaveBeenCalledWith('connected_player');
      expect(chain.update).toHaveBeenCalledWith({ player_id: 'player' });
      expect(chain.eq).toHaveBeenCalledWith('id', 'connected-player');
    });

    it('throws on update failure', async () => {
      const chain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: { message: 'fail' } })
      };
      supabase.from.mockReturnValue(chain);

      await expect(matchPlayerToConnectedPlayer('connected-player', 'player')).rejects.toThrow('Failed to match player');
    });
  });

  describe('getAttendanceStats', () => {
    const teamId = 'team-123';
    const startDate = new Date('2025-01-01');
    const endDate = new Date('2025-01-31');
    let attendanceChain;

    const mockConnectors = [
      { id: 'connector-1', status: 'connected', provider: 'sportadmin' }
    ];

    const mockAttendanceData = [
      {
        id: 'att-1',
        year: 2025,
        month: 1,
        day_of_month: 5,
        total_practices: 5,
        total_attendance: 4,
        connected_player: {
          player_id: 'player-1',
          player_name: 'Alice Johnson',
          connector: { id: 'connector-1', provider: 'sportadmin' }
        }
      },
      {
        id: 'att-2',
        year: 2025,
        month: 1,
        day_of_month: 20,
        total_practices: 5,
        total_attendance: 5,
        connected_player: {
          player_id: 'player-1',
          player_name: 'Alice Johnson',
          connector: { id: 'connector-1', provider: 'sportadmin' }
        }
      },
      {
        id: 'att-3',
        year: 2025,
        month: 2,
        day_of_month: 2,
        total_practices: 8,
        total_attendance: 7,
        connected_player: {
          player_id: 'player-1',
          player_name: 'Alice Johnson',
          connector: { id: 'connector-1', provider: 'sportadmin' }
        }
      },
      {
        id: 'att-4',
        year: 2025,
        month: 1,
        day_of_month: 15,
        total_practices: 10,
        total_attendance: 8,
        connected_player: {
          player_id: 'player-2',
          player_name: 'Bob Smith',
          connector: { id: 'connector-1', provider: 'sportadmin' }
        }
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
      const attendanceOr = jest.fn(() => ({ order: yearOrder }));
      const attendanceNot = jest.fn(() => ({ or: attendanceOr, order: yearOrder }));
      const attendanceIn = jest.fn(() => ({ not: attendanceNot }));
      const attendanceSelect = jest.fn(() => ({ in: attendanceIn }));
      return { attendanceSelect, attendanceOr };
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
      attendanceChain = buildAttendanceChain(attendanceData, attendanceError);
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
      attendanceChain = null;
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
        totalPractices: 24, // Max total_attendance per date: 4 + 5 + 7 + 8
        totalAttendance: 16, // 4 + 5 + 7
        attendanceRate: 66.7,
        matchesPlayed: 2,
        practicesPerMatch: 8.0,
        attendanceRecords: expect.arrayContaining([
          { date: '2025-01-05', year: 2025, month: 1, day: 5, practices: 5, attendance: 4 },
          { date: '2025-01-20', year: 2025, month: 1, day: 20, practices: 5, attendance: 5 },
          { date: '2025-02-02', year: 2025, month: 2, day: 2, practices: 8, attendance: 7 }
        ])
      });

      const bob = result.find(p => p.playerId === 'player-2');
      expect(bob).toEqual({
        playerId: 'player-2',
        playerName: 'Bob Smith',
        totalPractices: 24,
        totalAttendance: 8,
        attendanceRate: 33.3,
        matchesPlayed: 1,
        practicesPerMatch: 8.0,
        attendanceRecords: [{ date: '2025-01-15', year: 2025, month: 1, day: 15, practices: 10, attendance: 8 }]
      });
    });

    it('filters attendance records by exact date range', async () => {
      const result = await getAttendanceStats(teamId, startDate, endDate);
      const expectedDateFilter =
        'and(or(year.gt.2025,and(year.eq.2025,month.gt.1),and(year.eq.2025,month.eq.1,day_of_month.gte.1)),or(year.lt.2025,and(year.eq.2025,month.lt.1),and(year.eq.2025,month.eq.1,day_of_month.lte.31)))';

      const alice = result.find(p => p.playerId === 'player-1');
      expect(alice.totalPractices).toBe(17); // Daily max attendance for January dates (4 + 8 + 5)
      expect(alice.totalAttendance).toBe(9);
      expect(alice.attendanceRecords).toHaveLength(2);
      expect(alice.attendanceRecords.every(r => r.month === 1)).toBe(true);

      const bob = result.find(p => p.playerId === 'player-2');
      expect(bob.totalPractices).toBe(17);
      expect(bob.totalAttendance).toBe(8);
      expect(attendanceChain.attendanceOr).toHaveBeenCalledWith(expectedDateFilter);
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
          year: 2025,
          month: 1,
          day_of_month: 10,
          total_practices: 0,
          total_attendance: 0,
          connected_player: {
            player_id: 'player-1',
            player_name: 'Alice Johnson',
            connector: { id: 'connector-1', provider: 'sportadmin' }
          }
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
          year: 2025,
          month: 1,
          day_of_month: 7,
          total_practices: 1,
          total_attendance: 1,
          connected_player: {
            player_id: null,
            player_name: 'Unmatched Player',
            connector: { id: 'connector-1', provider: 'sportadmin' }
          }
        }
      ];

      // Filter out null player_ids (simulating .not('player_id', 'is', null))
      const filteredAttendance = mixedAttendance.filter(
        (record) => record.connected_player?.player_id !== null
      );
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

  describe('dismissGhostPlayer', () => {
    // Phase 1: Critical Tests
    describe('parameter validation', () => {
      it('throws when externalPlayerId is null', async () => {
        await expect(dismissGhostPlayer(null)).rejects.toThrow('External player ID is required');
      });

      it('throws when externalPlayerId is undefined', async () => {
        await expect(dismissGhostPlayer(undefined)).rejects.toThrow('External player ID is required');
      });

      it('throws when externalPlayerId is empty string', async () => {
        await expect(dismissGhostPlayer('')).rejects.toThrow('External player ID is required');
      });
    });

    describe('success scenarios', () => {
      it('dismisses ghost player with authenticated user audit trail', async () => {
        const mockUser = { id: 'user-123', email: 'test@example.com' };
        supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

        const dismissedPlayer = {
          id: 'connected-player-1',
          player_id: null,
          is_dismissed: true,
          dismissed_at: '2025-12-25T10:30:00.000Z',
          dismissed_by: 'user-123'
        };

        const mockSelect = jest.fn().mockResolvedValue({ data: [dismissedPlayer], error: null });
        const mockIs = jest.fn(() => ({ select: mockSelect }));
        const mockEq = jest.fn(() => ({ is: mockIs }));
        const mockUpdate = jest.fn(() => ({ eq: mockEq }));
        const profileMock = buildUserProfileMock({ id: 'user-123' });
        supabase.from.mockImplementation((table) => {
          if (table === 'user_profile') {
            return { select: profileMock.select };
          }
          if (table === 'connected_player') {
            return { update: mockUpdate };
          }
          return {};
        });

        const result = await dismissGhostPlayer('connected-player-1');

        expect(supabase.auth.getUser).toHaveBeenCalled();
        expect(supabase.from).toHaveBeenCalledWith('connected_player');
        expect(mockUpdate).toHaveBeenCalledWith({
          is_dismissed: true,
          dismissed_at: expect.any(String),
          dismissed_by: 'user-123'
        });
        expect(mockEq).toHaveBeenCalledWith('id', 'connected-player-1');
        expect(mockIs).toHaveBeenCalledWith('player_id', null);
        expect(mockSelect).toHaveBeenCalled();
        expect(result).toEqual(dismissedPlayer);
      });

      it('dismisses ghost player without auth user (sets dismissed_by to null)', async () => {
        supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

        const dismissedPlayer = {
          id: 'connected-player-1',
          player_id: null,
          is_dismissed: true,
          dismissed_at: '2025-12-25T10:30:00.000Z',
          dismissed_by: null
        };

        const mockSelect = jest.fn().mockResolvedValue({ data: [dismissedPlayer], error: null });
        const mockIs = jest.fn(() => ({ select: mockSelect }));
        const mockEq = jest.fn(() => ({ is: mockIs }));
        const mockUpdate = jest.fn(() => ({ eq: mockEq }));
        supabase.from.mockReturnValue({ update: mockUpdate });

        const result = await dismissGhostPlayer('connected-player-1');

        expect(mockUpdate).toHaveBeenCalledWith({
          is_dismissed: true,
          dismissed_at: expect.any(String),
          dismissed_by: null
        });
        expect(result.dismissed_by).toBeNull();
      });
    });

    // Phase 2: Error Handling
    describe('error handling', () => {
      it('continues dismissal even when auth.getUser fails', async () => {
        supabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'Auth error' }
        });

        const dismissedPlayer = { id: 'connected-player-1', is_dismissed: true, dismissed_by: null };

        const mockSelect = jest.fn().mockResolvedValue({ data: [dismissedPlayer], error: null });
        const mockIs = jest.fn(() => ({ select: mockSelect }));
        const mockEq = jest.fn(() => ({ is: mockIs }));
        const mockUpdate = jest.fn(() => ({ eq: mockEq }));
        supabase.from.mockReturnValue({ update: mockUpdate });

        const result = await dismissGhostPlayer('connected-player-1');

        expect(mockConsoleError).toHaveBeenCalledWith('Error getting current user:', { message: 'Auth error' });
        expect(result).toEqual(dismissedPlayer);
      });

      it('throws when database update fails', async () => {
        supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });

        const dbError = { message: 'Database error', code: 'PGRST116' };
        const mockSelect = jest.fn().mockResolvedValue({ data: null, error: dbError });
        const mockIs = jest.fn(() => ({ select: mockSelect }));
        const mockEq = jest.fn(() => ({ is: mockIs }));
        const mockUpdate = jest.fn(() => ({ eq: mockEq }));
        const profileMock = buildUserProfileMock({ id: 'user-123' });
        supabase.from.mockImplementation((table) => {
          if (table === 'user_profile') {
            return { select: profileMock.select };
          }
          if (table === 'connected_player') {
            return { update: mockUpdate };
          }
          return {};
        });

        await expect(dismissGhostPlayer('connected-player-1')).rejects.toThrow('Failed to dismiss player');
        expect(mockConsoleError).toHaveBeenCalledWith('Error dismissing ghost player:', dbError);
      });

      it('throws when player has already been matched or dismissed (empty result)', async () => {
        supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });

        const mockSelect = jest.fn().mockResolvedValue({ data: [], error: null });
        const mockIs = jest.fn(() => ({ select: mockSelect }));
        const mockEq = jest.fn(() => ({ is: mockIs }));
        const mockUpdate = jest.fn(() => ({ eq: mockEq }));
        const profileMock = buildUserProfileMock({ id: 'user-123' });
        supabase.from.mockImplementation((table) => {
          if (table === 'user_profile') {
            return { select: profileMock.select };
          }
          if (table === 'connected_player') {
            return { update: mockUpdate };
          }
          return {};
        });

        await expect(dismissGhostPlayer('connected-player-1')).rejects.toThrow(
          'Player has already been matched or dismissed'
        );
      });
    });

    // Phase 3: Edge Cases
    describe('edge cases', () => {
      it('sets dismissed_at to valid ISO timestamp', async () => {
        supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });

        const dismissedPlayer = {
          id: 'connected-player-1',
          dismissed_at: '2025-12-25T10:30:00.000Z'
        };

        const mockSelect = jest.fn().mockResolvedValue({ data: [dismissedPlayer], error: null });
        const mockIs = jest.fn(() => ({ select: mockSelect }));
        const mockEq = jest.fn(() => ({ is: mockIs }));
        const mockUpdate = jest.fn(() => ({ eq: mockEq }));
        const profileMock = buildUserProfileMock({ id: 'user-123' });
        supabase.from.mockImplementation((table) => {
          if (table === 'user_profile') {
            return { select: profileMock.select };
          }
          if (table === 'connected_player') {
            return { update: mockUpdate };
          }
          return {};
        });

        await dismissGhostPlayer('connected-player-1');

        const updateCall = mockUpdate.mock.calls[0][0];
        expect(updateCall.dismissed_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        expect(new Date(updateCall.dismissed_at).toISOString()).toBe(updateCall.dismissed_at);
      });

      it('logs errors to console.error appropriately', async () => {
        supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });

        const dbError = { message: 'Connection lost', code: 'ECONNREFUSED' };
        const mockSelect = jest.fn().mockResolvedValue({ data: null, error: dbError });
        const mockIs = jest.fn(() => ({ select: mockSelect }));
        const mockEq = jest.fn(() => ({ is: mockIs }));
        const mockUpdate = jest.fn(() => ({ eq: mockEq }));
        const profileMock = buildUserProfileMock({ id: 'user-123' });
        supabase.from.mockImplementation((table) => {
          if (table === 'user_profile') {
            return { select: profileMock.select };
          }
          if (table === 'connected_player') {
            return { update: mockUpdate };
          }
          return {};
        });

        try {
          await dismissGhostPlayer('connected-player-1');
        } catch (error) {
          // Expected to throw
        }

        expect(mockConsoleError).toHaveBeenCalledWith('Error dismissing ghost player:', dbError);
      });
    });
  });
});
