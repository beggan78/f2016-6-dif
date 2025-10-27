/**
 * Connector Service
 *
 * API client for connector operations (SportAdmin, Svenska Lag, etc.)
 * Handles communication with Supabase for connector management, sync jobs, and scraped data
 */

import { supabase } from '../lib/supabase';

/**
 * Get all connectors for a team
 * @param {string} teamId - Team UUID
 * @returns {Promise<Array>} Array of connector objects
 */
export async function getTeamConnectors(teamId) {
  if (!teamId) {
    throw new Error('Team ID is required');
  }

  const { data, error } = await supabase
    .from('connector')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching team connectors:', error);
    throw new Error('Failed to load connectors');
  }

  return data || [];
}

/**
 * Get connector status for a specific team and provider
 * Uses the get_connector RPC function
 * @param {string} teamId - Team UUID
 * @param {string} provider - Provider ID ('sportadmin', 'svenska_lag')
 * @returns {Promise<Object|null>} Connector object or null if not found
 */
export async function getConnectorStatus(teamId, provider) {
  if (!teamId || !provider) {
    throw new Error('Team ID and provider are required');
  }

  const { data, error } = await supabase
    .rpc('get_connector', {
      p_team_id: teamId,
      p_provider: provider
    });

  if (error) {
    console.error('Error fetching connector status:', error);
    throw new Error('Failed to load connector status');
  }

  return data?.[0] || null;
}

/**
 * Connect a provider (create connector with encrypted credentials)
 * Calls the Edge Function connect-provider
 * @param {string} teamId - Team UUID
 * @param {string} provider - Provider ID ('sportadmin', 'svenska_lag')
 * @param {Object} credentials - { username, password }
 * @returns {Promise<Object>} Created connector object
 */
export async function connectProvider(teamId, provider, credentials) {
  if (!teamId || !provider || !credentials?.username || !credentials?.password) {
    throw new Error('Team ID, provider, username, and password are required');
  }

  // Validate input lengths (match database constraints)
  if (credentials.username.length > 100) {
    throw new Error('Username must be 100 characters or less');
  }
  if (credentials.password.length > 200) {
    throw new Error('Password must be 200 characters or less');
  }

  try {
    const { data, error } = await supabase.functions.invoke('connect-provider', {
      body: {
        team_id: teamId,
        provider,
        username: credentials.username,
        password: credentials.password
      }
    });

    if (error) {
      console.error('Error connecting provider:', error);
      throw new Error(error.message || 'Failed to connect provider');
    }

    if (!data || data.error) {
      throw new Error(data?.error || 'Failed to connect provider');
    }

    return data;
  } catch (err) {
    // Handle Edge Function not deployed yet (for development)
    const errorMsg = err.message || '';
    const isNotDeployed =
      errorMsg.includes('FunctionsRelayError') ||
      errorMsg.includes('not found') ||
      errorMsg.includes('Failed to send a request') ||
      errorMsg.includes('CORS') ||
      err.name === 'FunctionsFetchError';

    if (isNotDeployed) {
      throw new Error('The connector service is not yet deployed. This feature will be available once the backend Edge Function is set up.');
    }
    throw err;
  }
}

/**
 * Disconnect a provider (delete connector)
 * @param {string} connectorId - Connector UUID
 * @returns {Promise<void>}
 */
export async function disconnectProvider(connectorId) {
  if (!connectorId) {
    throw new Error('Connector ID is required');
  }

  const { error } = await supabase
    .from('connector')
    .delete()
    .eq('id', connectorId);

  if (error) {
    console.error('Error disconnecting provider:', error);
    throw new Error('Failed to disconnect provider');
  }
}

/**
 * Trigger a manual sync for a connector
 * Uses the create_manual_sync_job RPC function
 * @param {string} connectorId - Connector UUID
 * @returns {Promise<string>} Created job ID
 */
export async function triggerManualSync(connectorId) {
  if (!connectorId) {
    throw new Error('Connector ID is required');
  }

  const { data, error } = await supabase
    .rpc('create_manual_sync_job', {
      p_connector_id: connectorId
    });

  if (error) {
    console.error('Error triggering manual sync:', error);
    throw new Error('Failed to trigger manual sync');
  }

  return data;
}

/**
 * Get recent sync jobs for a connector
 * @param {string} connectorId - Connector UUID
 * @param {number} limit - Maximum number of jobs to return (default: 10)
 * @returns {Promise<Array>} Array of sync job objects
 */
export async function getRecentSyncJobs(connectorId, limit = 10) {
  if (!connectorId) {
    throw new Error('Connector ID is required');
  }

  const { data, error } = await supabase
    .from('connector_sync_job')
    .select('*')
    .eq('connector_id', connectorId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching sync jobs:', error);
    throw new Error('Failed to load sync jobs');
  }

  return data || [];
}

/**
 * Get the most recent sync job for a connector
 * @param {string} connectorId - Connector UUID
 * @returns {Promise<Object|null>} Most recent sync job or null
 */
export async function getLatestSyncJob(connectorId) {
  const jobs = await getRecentSyncJobs(connectorId, 1);
  return jobs?.[0] || null;
}

/**
 * Get player attendance data for a connector
 * @param {string} connectorId - Connector UUID
 * @param {number} year - Year to filter by (optional, defaults to current year)
 * @returns {Promise<Array>} Array of player attendance objects
 */
export async function getPlayerAttendance(connectorId, year = null) {
  if (!connectorId) {
    throw new Error('Connector ID is required');
  }

  const currentYear = year || new Date().getFullYear();

  const { data, error } = await supabase
    .from('player_attendance')
    .select('*')
    .eq('connector_id', connectorId)
    .eq('year', currentYear)
    .order('player_name', { ascending: true });

  if (error) {
    console.error('Error fetching player attendance:', error);
    throw new Error('Failed to load player attendance');
  }

  return data || [];
}

/**
 * Get upcoming matches for a connector
 * @param {string} connectorId - Connector UUID
 * @returns {Promise<Array>} Array of upcoming match objects
 */
export async function getUpcomingMatches(connectorId) {
  if (!connectorId) {
    throw new Error('Connector ID is required');
  }

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const { data, error } = await supabase
    .from('upcoming_match')
    .select('*')
    .eq('connector_id', connectorId)
    .gte('match_date', today)
    .order('match_date', { ascending: true });

  if (error) {
    console.error('Error fetching upcoming matches:', error);
    throw new Error('Failed to load upcoming matches');
  }

  return data || [];
}

/**
 * Retry a failed connector (update status to verifying)
 * Used when user wants to retry after an error
 * @param {string} connectorId - Connector UUID
 * @returns {Promise<void>}
 */
export async function retryConnector(connectorId) {
  if (!connectorId) {
    throw new Error('Connector ID is required');
  }

  const { error } = await supabase
    .from('connector')
    .update({
      status: 'verifying',
      last_error: null
    })
    .eq('id', connectorId);

  if (error) {
    console.error('Error retrying connector:', error);
    throw new Error('Failed to retry connector');
  }

  // Trigger a verification sync job
  await triggerManualSync(connectorId);
}
