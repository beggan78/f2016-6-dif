/**
 * useTeamConnector Hook
 *
 * Manages connector state and operations for a team
 * Provides functions to connect/disconnect providers, trigger syncs, and fetch data
 */

import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import * as connectorService from '../services/connectorService';

export function useTeamConnector(teamId) {
  const { t } = useTranslation('common');
  const [connectors, setConnectors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [syncingConnectorId, setSyncingConnectorId] = useState(null);

  // Load all connectors for the team
  const loadConnectors = useCallback(async () => {
    if (!teamId) {
      setConnectors([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await connectorService.getTeamConnectors(teamId);
      setConnectors(data);
    } catch (err) {
      console.error('Error loading connectors:', err);
      setError(err.message || t('errors.failedToLoadConnectors'));
    } finally {
      setLoading(false);
    }
  }, [teamId, t]);

  // Load connectors when teamId changes
  useEffect(() => {
    loadConnectors();
  }, [loadConnectors]);

  // Connect a new provider
  const connectProvider = useCallback(async (provider, credentials) => {
    if (!teamId) {
      throw new Error('Team ID is required');
    }

    try {
      setLoading(true);
      setError(null);
      await connectorService.connectProvider(teamId, provider, credentials);
      // Reload connectors to show the new connection
      await loadConnectors();
    } catch (err) {
      console.error('Error connecting provider:', err);
      setError(err.message || t('errors.failedToConnectProvider'));
      throw err; // Re-throw so modal can handle it
    } finally {
      setLoading(false);
    }
  }, [teamId, loadConnectors, t]);

  // Disconnect a provider
  const disconnectProvider = useCallback(async (connectorId) => {
    try {
      setLoading(true);
      setError(null);
      await connectorService.disconnectProvider(connectorId);
      // Reload connectors to reflect the disconnection
      await loadConnectors();
    } catch (err) {
      console.error('Error disconnecting provider:', err);
      setError(err.message || t('errors.failedToDisconnectProvider'));
      throw err; // Re-throw so modal can handle it
    } finally {
      setLoading(false);
    }
  }, [loadConnectors, t]);

  // Trigger a manual sync
  const manualSync = useCallback(async (connectorId) => {
    try {
      setSyncingConnectorId(connectorId);
      setError(null);
      await connectorService.triggerManualSync(connectorId);
      // Reload connectors to show updated sync status
      await loadConnectors();
    } catch (err) {
      console.error('Error triggering manual sync:', err);
      setError(err.message || t('errors.failedToTriggerSync'));
      throw err;
    } finally {
      setSyncingConnectorId(null);
    }
  }, [loadConnectors, t]);

  // Retry a failed connector
  const retryConnector = useCallback(async (connectorId) => {
    try {
      setLoading(true);
      setError(null);
      await connectorService.retryConnector(connectorId);
      // Reload connectors to show updated status
      await loadConnectors();
    } catch (err) {
      console.error('Error retrying connector:', err);
      setError(err.message || t('errors.failedToRetryConnector'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadConnectors, t]);

  // Get attendance data for a connector
  const getAttendanceData = useCallback(async (connectorId, year = null) => {
    try {
      return await connectorService.getPlayerAttendance(connectorId, year);
    } catch (err) {
      console.error('Error fetching attendance data:', err);
      throw err;
    }
  }, []);

  // Get upcoming matches for a connector
  const getUpcomingMatches = useCallback(async (connectorId) => {
    try {
      return await connectorService.getUpcomingMatches(connectorId);
    } catch (err) {
      console.error('Error fetching upcoming matches:', err);
      throw err;
    }
  }, []);

  // Get recent sync jobs for a connector
  const getRecentSyncJobs = useCallback(async (connectorId, limit = 10) => {
    try {
      return await connectorService.getRecentSyncJobs(connectorId, limit);
    } catch (err) {
      console.error('Error fetching sync jobs:', err);
      throw err;
    }
  }, []);

  // Get latest sync job for a connector
  const getLatestSyncJob = useCallback(async (connectorId) => {
    try {
      return await connectorService.getLatestSyncJob(connectorId);
    } catch (err) {
      console.error('Error fetching latest sync job:', err);
      throw err;
    }
  }, []);

  // Get connector status for a specific provider
  const getConnectorStatus = useCallback(async (provider) => {
    if (!teamId) {
      return null;
    }

    try {
      return await connectorService.getConnectorStatus(teamId, provider);
    } catch (err) {
      console.error('Error fetching connector status:', err);
      throw err;
    }
  }, [teamId]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    connectors,
    loading,
    error,
    syncingConnectorId,
    loadConnectors,
    connectProvider,
    disconnectProvider,
    manualSync,
    retryConnector,
    getAttendanceData,
    getUpcomingMatches,
    getRecentSyncJobs,
    getLatestSyncJob,
    getConnectorStatus,
    clearError
  };
}
