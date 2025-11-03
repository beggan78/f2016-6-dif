import { renderHook, act, waitFor } from '@testing-library/react';
import { useTeamConnector } from '../useTeamConnector';
import * as connectorService from '../../services/connectorService';

jest.mock('../../services/connectorService', () => ({
  getTeamConnectors: jest.fn(),
  connectProvider: jest.fn(),
  disconnectProvider: jest.fn(),
  triggerManualSync: jest.fn(),
  retryConnector: jest.fn(),
  getPlayerAttendance: jest.fn(),
  getUpcomingMatches: jest.fn(),
  getRecentSyncJobs: jest.fn(),
  getLatestSyncJob: jest.fn(),
  getConnectorStatus: jest.fn()
}));

describe('useTeamConnector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads connectors when teamId is provided', async () => {
    const connectors = [{ id: 'connector-1' }];
    connectorService.getTeamConnectors.mockResolvedValueOnce(connectors);

    const { result } = renderHook(() => useTeamConnector('team-1'));

    await waitFor(() => {
      expect(result.current.connectors).toEqual(connectors);
      expect(result.current.loading).toBe(false);
    });

    expect(connectorService.getTeamConnectors).toHaveBeenCalledWith('team-1');
  });

  it('skips loading connectors when teamId is missing', async () => {
    connectorService.getTeamConnectors.mockResolvedValue([]);

    renderHook(() => useTeamConnector(null));

    await waitFor(() => {
      expect(connectorService.getTeamConnectors).not.toHaveBeenCalled();
    });
  });

  it('connectProvider reloads connectors on success', async () => {
    connectorService.getTeamConnectors
      .mockResolvedValueOnce([{ id: 'initial' }])
      .mockResolvedValueOnce([{ id: 'connected' }]);
    connectorService.connectProvider.mockResolvedValue();

    const { result } = renderHook(() => useTeamConnector('team-1'));

    await waitFor(() => expect(result.current.connectors).toEqual([{ id: 'initial' }]));

    await act(async () => {
      await result.current.connectProvider('sportadmin', { username: 'coach', password: 'pw' });
    });

    expect(connectorService.connectProvider).toHaveBeenCalledWith('team-1', 'sportadmin', {
      username: 'coach',
      password: 'pw'
    });

    await waitFor(() => {
      expect(result.current.connectors).toEqual([{ id: 'connected' }]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  it('connectProvider surfaces errors and preserves them for the caller', async () => {
    connectorService.getTeamConnectors.mockResolvedValueOnce([]);
    const failure = new Error('connect failed');
    connectorService.connectProvider.mockRejectedValue(failure);

    const { result } = renderHook(() => useTeamConnector('team-1'));

    await waitFor(() => expect(connectorService.getTeamConnectors).toHaveBeenCalled());

    let caught;
    await act(async () => {
      try {
        await result.current.connectProvider('sportadmin', { username: 'coach', password: 'pw' });
      } catch (err) {
        caught = err;
      }
    });

    expect(caught).toBe(failure);

    await waitFor(() => {
      expect(result.current.error).toBe('connect failed');
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('manualSync triggers the service call and clears syncing id afterwards', async () => {
    connectorService.getTeamConnectors
      .mockResolvedValueOnce([{ id: 'initial' }])
      .mockResolvedValueOnce([{ id: 'initial' }]);
    connectorService.triggerManualSync.mockResolvedValue('job-1');

    const { result } = renderHook(() => useTeamConnector('team-1'));
    await waitFor(() => expect(result.current.connectors).toEqual([{ id: 'initial' }]));

    await act(async () => {
      await result.current.manualSync('connector-1');
    });

    expect(connectorService.triggerManualSync).toHaveBeenCalledWith('connector-1');
    expect(result.current.syncingConnectorId).toBeNull();
  });
});
