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
  getPlayerConnectionDetails
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
});
