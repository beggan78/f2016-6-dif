/**
 * Connector Service
 *
 * API client for connector operations (SportAdmin, Svenska Lag, etc.)
 * Handles communication with Supabase for connector management, sync jobs, and scraped data
 */

import { supabase } from '../lib/supabase';
import { getProviderById } from '../constants/connectorProviders';

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
 * @returns {Promise<Array>} Array of daily player attendance objects
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
    .order('player_name', { ascending: true })
    .order('month', { ascending: true })
    .order('day_of_month', { ascending: true });

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
  try {
    await triggerManualSync(connectorId);
  } catch (syncError) {
    console.error('Error triggering manual sync during retry:', syncError);

    const { error: revertError } = await supabase
      .from('connector')
      .update({
        status: 'error',
        last_error: 'Failed to queue verification job. Please try again.'
      })
      .eq('id', connectorId);

    if (revertError) {
      console.error('Error reverting connector status after sync failure:', revertError);
    }

    throw new Error('Failed to queue verification job');
  }
}

/**
 * Get player attendance records with connector info for a team's roster
 * Returns a map of player_id -> provider name
 * @param {string} teamId - Team UUID
 * @returns {Promise<Map>} Map of player_id to provider name ('SportAdmin', 'Svenska Lag')
 */
export async function getPlayerConnectorMappings(teamId) {
  if (!teamId) {
    throw new Error('Team ID is required');
  }

  const { data, error } = await supabase
    .from('player_attendance')
    .select(`
      player_id,
      connector:connector_id (
        provider,
        team_id
      )
    `)
    .not('player_id', 'is', null)
    .eq('connector.team_id', teamId);

  if (error) {
    console.error('Error fetching player connector mappings:', error);
    throw new Error('Failed to load player connections');
  }

  // Create a map of player_id -> provider name
  const mappings = new Map();
  data?.forEach(record => {
    if (record.player_id && record.connector?.provider) {
      const provider = getProviderById(record.connector.provider);
      mappings.set(record.player_id, provider?.name || record.connector.provider);
    }
  });

  return mappings;
}

/**
 * Get comprehensive connection details for all players in a team
 * Includes both matched and unmatched attendance records
 * @param {string} teamId - Team UUID
 * @returns {Promise<Object>} Object with matched and unmatched connection details
 */
export async function getPlayerConnectionDetails(teamId) {
  if (!teamId) {
    throw new Error('Team ID is required');
  }

  // Get all connectors for the team
  const connectors = await getTeamConnectors(teamId);

  // Get all attendance records with connector info
  const { data: attendanceData, error } = await supabase
    .from('player_attendance')
    .select(`
      id,
      player_id,
      player_name,
      last_synced_at,
      connector:connector_id (
        id,
        provider,
        status,
        team_id
      )
    `)
    .eq('connector.team_id', teamId);

  if (error) {
    console.error('Error fetching player connection details:', error);
    throw new Error('Failed to load player connection details');
  }

  // Organize data by player_id
  const matchedConnections = new Map(); // player_id -> array of connection details
  const unmatchedAttendance = []; // attendance records without player_id
  const hasConnectedProvider = connectors.some(c => c.status === 'connected');

  attendanceData?.forEach(record => {
    const connector = record.connector;

    if (!connector) {
      unmatchedAttendance.push({
        attendanceId: record.id,
        providerName: 'Unknown connector',
        providerId: null,
        playerNameInProvider: record.player_name,
        lastSynced: record.last_synced_at,
        connectorStatus: null,
        connectorId: null
      });
      return;
    }

    const provider = getProviderById(connector.provider);
    const connectionDetail = {
      attendanceId: record.id,
      providerName: provider?.name || connector.provider,
      providerId: connector.provider,
      playerNameInProvider: record.player_name,
      lastSynced: record.last_synced_at,
      connectorStatus: connector.status,
      connectorId: connector.id
    };

    if (record.player_id) {
      // Matched connection - keep only the latest record per connector to avoid duplicates
      const existingConnections = matchedConnections.get(record.player_id) || [];
      const existingIndex = existingConnections.findIndex(
        conn => conn.connectorId === connector.id
      );

      if (existingIndex === -1) {
        matchedConnections.set(record.player_id, [...existingConnections, connectionDetail]);
      } else {
        const existingConnection = existingConnections[existingIndex];
        const existingSynced = existingConnection.lastSynced
          ? new Date(existingConnection.lastSynced).getTime()
          : 0;
        const newSynced = connectionDetail.lastSynced
          ? new Date(connectionDetail.lastSynced).getTime()
          : 0;

        // Replace the stored connection if this record is more recent
        const shouldReplace = newSynced > existingSynced;
        const updatedConnections = [...existingConnections];
        updatedConnections[existingIndex] = shouldReplace ? connectionDetail : existingConnection;
        matchedConnections.set(record.player_id, updatedConnections);
      }
    } else {
      // Unmatched attendance record
      unmatchedAttendance.push(connectionDetail);
    }
  });

  return {
    matchedConnections,
    unmatchedAttendance,
    hasConnectedProvider
  };
}

/**
 * Get unmatched player attendance records for a specific connector
 * Returns records where player_id is NULL
 * @param {string} connectorId - Connector UUID
 * @returns {Promise<Array>} Array of unmatched attendance records
 */
export async function getUnmatchedPlayerAttendance(connectorId) {
  if (!connectorId) {
    throw new Error('Connector ID is required');
  }

  const { data, error } = await supabase
    .from('player_attendance')
    .select('*')
    .eq('connector_id', connectorId)
    .is('player_id', null)
    .order('player_name', { ascending: true });

  if (error) {
    console.error('Error fetching unmatched player attendance:', error);
    throw new Error('Failed to load unmatched players');
  }

  return data || [];
}

/**
 * Match a player attendance record to a roster player
 * Updates the player_id field in the attendance record
 * @param {string} attendanceId - player_attendance record UUID
 * @param {string} playerId - player UUID from roster
 * @returns {Promise<void>}
 */
export async function matchPlayerToAttendance(attendanceId, playerId) {
  if (!attendanceId || !playerId) {
    throw new Error('Attendance ID and player ID are required');
  }

  const { error } = await supabase
    .from('player_attendance')
    .update({ player_id: playerId })
    .eq('id', attendanceId);

  if (error) {
    console.error('Error matching player to attendance:', error);
    throw new Error('Failed to match player');
  }
}

// Normalize dates so comparisons are inclusive and time-agnostic
function toStartOfDay(date) {
  if (!date) return null;
  const normalized = new Date(date);
  if (Number.isNaN(normalized.getTime())) return null;
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function toEndOfDay(date) {
  if (!date) return null;
  const normalized = new Date(date);
  if (Number.isNaN(normalized.getTime())) return null;
  normalized.setHours(23, 59, 59, 999);
  return normalized;
}

function createAttendanceDate(record) {
  const safeYear = typeof record.year === 'number' ? record.year : 1970;
  const safeMonth = typeof record.month === 'number' ? record.month : 1;
  const safeDay =
    typeof record.day_of_month === 'number' && !Number.isNaN(record.day_of_month)
      ? record.day_of_month
      : 1;

  return new Date(safeYear, safeMonth - 1, safeDay, 0, 0, 0, 0);
}

function formatAttendanceDate({ year, month, day_of_month: dayOfMonth }) {
  const safeYear = typeof year === 'number' && !Number.isNaN(year) ? year : 1970;
  const safeDay =
    typeof dayOfMonth === 'number' && !Number.isNaN(dayOfMonth) ? dayOfMonth : 1;
  const safeMonth = typeof month === 'number' && !Number.isNaN(month) ? month : 1;
  const paddedMonth = String(safeMonth).padStart(2, '0');
  const paddedDay = String(safeDay).padStart(2, '0');
  return `${safeYear}-${paddedMonth}-${paddedDay}`;
}

/**
 * Get attendance statistics for all players in a team
 * Combines attendance data from connectors with match stats
 * @param {string} teamId - Team UUID
 * @param {Date|null} startDate - Start date filter (optional)
 * @param {Date|null} endDate - End date filter (optional)
 * @returns {Promise<Array>} Array of player attendance stat objects
 */
export async function getAttendanceStats(teamId, startDate = null, endDate = null) {
  if (!teamId) {
    throw new Error('Team ID is required');
  }

  try {
    // Get all connectors for the team
    const connectors = await getTeamConnectors(teamId);
    const connectedConnectors = connectors.filter(c => c.status === 'connected');

    if (connectedConnectors.length === 0) {
      return [];
    }

    // Fetch all attendance data for all connectors
    const connectorIds = connectedConnectors.map(c => c.id);

    const { data: attendanceData, error: attendanceError } = await supabase
      .from('player_attendance')
      .select(`
        id,
        player_id,
        player_name,
        year,
        month,
        day_of_month,
        total_practices,
        total_attendance,
        connector:connector_id (
          id,
          provider
        )
      `)
      .in('connector_id', connectorIds)
      .not('player_id', 'is', null) // Only include matched players
      .order('year', { ascending: true })
      .order('month', { ascending: true })
      .order('day_of_month', { ascending: true });

    if (attendanceError) {
      console.error('Error fetching attendance data:', attendanceError);
      throw new Error('Failed to load attendance data');
    }

    const normalizedStart = toStartOfDay(startDate);
    const normalizedEnd = toEndOfDay(endDate);

    const filteredAttendance = (attendanceData || []).filter(record => {
      const attendanceDate = createAttendanceDate(record);

      if (normalizedStart && attendanceDate < normalizedStart) {
        return false;
      }

      if (normalizedEnd && attendanceDate > normalizedEnd) {
        return false;
      }

      return true;
    });

    // Aggregate attendance data by player
    const playerAttendanceMap = new Map();

    filteredAttendance.forEach(record => {
      const playerId = record.player_id;

      if (!playerAttendanceMap.has(playerId)) {
        playerAttendanceMap.set(playerId, {
          playerId,
          totalPractices: 0,
          totalAttendance: 0,
          attendanceRecords: []
        });
      }

      const playerData = playerAttendanceMap.get(playerId);
      playerData.totalPractices += record.total_practices || 0;
      playerData.totalAttendance += record.total_attendance || 0;
      playerData.attendanceRecords.push({
        date: formatAttendanceDate(record),
        year: record.year,
        month: record.month,
        day: record.day_of_month || 1,
        practices: record.total_practices,
        attendance: record.total_attendance
      });
    });

    // Get player info and match stats
    const playerIds = Array.from(playerAttendanceMap.keys());

    if (playerIds.length === 0) {
      return [];
    }

    // Fetch player names
    const { data: players, error: playersError } = await supabase
      .from('player')
      .select('id, display_name, first_name')
      .in('id', playerIds)
      .eq('team_id', teamId);

    if (playersError) {
      console.error('Error fetching players:', playersError);
      throw new Error('Failed to load player data');
    }

    // Create player name map
    const playerNameMap = new Map();
    (players || []).forEach(player => {
      playerNameMap.set(player.id, player.display_name || player.first_name || 'Unknown Player');
    });

    // Fetch match stats to get matches played
    // We use the same date filter as for attendance
    let matchStatsQuery = supabase
      .from('player_match_stats')
      .select(`
        player_id,
        match:match_id (
          id,
          team_id,
          state,
          deleted_at,
          started_at
        )
      `)
      .in('player_id', playerIds);

    const { data: matchStatsData, error: matchStatsError } = await matchStatsQuery;

    if (matchStatsError) {
      console.error('Error fetching match stats:', matchStatsError);
      throw new Error('Failed to load match statistics');
    }

    // Count matches per player (only finished matches within date range)
    const matchesPlayedMap = new Map();

    (matchStatsData || []).forEach(stat => {
      if (!stat.match || stat.match.team_id !== teamId) return;
      if (stat.match.state !== 'finished') return;
      if (stat.match.deleted_at !== null) return;

      // Apply date filters
      if (startDate || endDate) {
        const matchDate = new Date(stat.match.started_at);
        if (startDate && matchDate < startDate) return;
        if (endDate && matchDate > endDate) return;
      }

      const playerId = stat.player_id;
      matchesPlayedMap.set(playerId, (matchesPlayedMap.get(playerId) || 0) + 1);
    });

    // Combine all data
    const result = Array.from(playerAttendanceMap.entries()).map(([playerId, attendanceData]) => {
      const playerName = playerNameMap.get(playerId) || 'Unknown Player';
      const matchesPlayed = matchesPlayedMap.get(playerId) || 0;
      const attendanceRate = attendanceData.totalPractices > 0
        ? (attendanceData.totalAttendance / attendanceData.totalPractices) * 100
        : 0;
      const practicesPerMatch = matchesPlayed > 0
        ? attendanceData.totalAttendance / matchesPlayed
        : 0;

      return {
        playerId,
        playerName,
        totalPractices: attendanceData.totalPractices,
        totalAttendance: attendanceData.totalAttendance,
        attendanceRate: Math.round(attendanceRate * 10) / 10, // 1 decimal place
        matchesPlayed,
        practicesPerMatch: Math.round(practicesPerMatch * 100) / 100, // 2 decimal places
        attendanceRecords: attendanceData.attendanceRecords,
        monthlyRecords: attendanceData.attendanceRecords
      };
    });

    // Sort by player name
    result.sort((a, b) => a.playerName.localeCompare(b.playerName));

    return result;
  } catch (error) {
    console.error('Error getting attendance stats:', error);
    throw error;
  }
}
