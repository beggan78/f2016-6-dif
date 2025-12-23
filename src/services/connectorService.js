/**
 * Connector Service
 *
 * API client for connector operations (SportAdmin, Svenska Lag, etc.)
 * Handles communication with Supabase for connector management, sync jobs, and scraped data
 */

import { supabase } from '../lib/supabase';
import { getProviderById } from '../constants/connectorProviders';
import { parseExternalPlayerName } from '../utils/playerUtils';

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
    .select(`
      *,
      connected_player:connected_player_id (
        connector_id,
        player_id,
        player_name
      )
    `)
    .eq('connected_player.connector_id', connectorId)
    .eq('year', currentYear)
    .order('connected_player.player_name', { ascending: true })
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
 * Includes both matched and unmatched connected_player records
 * @param {string} teamId - Team UUID
 * @returns {Promise<Object>} Object with matched and unmatched connection details
 */
export async function getPlayerConnectionDetails(teamId) {
  if (!teamId) {
    throw new Error('Team ID is required');
  }

  // Get all connectors for the team
  const connectors = await getTeamConnectors(teamId);

  // Get all connected_player records with connector info
  const { data: connectedPlayerData, error } = await supabase
    .from('connected_player')
    .select(`
      id,
      player_id,
      player_name,
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
  const unmatchedExternalPlayers = []; // connected_player records without player_id
  // Banner should hide if ANY connector exists that isn't disconnected
  // This includes 'verifying', 'connected', and 'error' states
  const hasConnectedProvider = connectors.some(c => c.status !== 'disconnected');

  connectedPlayerData?.forEach(record => {
    const connector = record.connector;

    if (!connector) {
      unmatchedExternalPlayers.push({
        externalPlayerId: record.id,
        providerName: 'Unknown connector',
        providerId: null,
        playerNameInProvider: record.player_name,
        connectorStatus: null,
        connectorId: null
      });
      return;
    }

    const provider = getProviderById(connector.provider);
    const connectionDetail = {
      externalPlayerId: record.id,
      providerName: provider?.name || connector.provider,
      providerId: connector.provider,
      playerNameInProvider: record.player_name,
      connectorStatus: connector.status,
      connectorId: connector.id
    };

    if (record.player_id) {
      // Matched connection - one connected_player per connector, so no duplicates possible
      const existingConnections = matchedConnections.get(record.player_id) || [];
      matchedConnections.set(record.player_id, [...existingConnections, connectionDetail]);
    } else {
      // Unmatched connected_player record
      unmatchedExternalPlayers.push(connectionDetail);
    }
  });

  return {
    matchedConnections,
    unmatchedExternalPlayers,
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
 * Match a connected_player record to a roster player
 * Updates the player_id field in the connected_player record
 * @param {string} externalPlayerId - connected_player record UUID
 * @param {string} playerId - player UUID from roster
 * @returns {Promise<void>}
 */
export async function matchPlayerToConnectedPlayer(externalPlayerId, playerId) {
  if (!externalPlayerId || !playerId) {
    throw new Error('External player ID and player ID are required');
  }

  const { error } = await supabase
    .from('connected_player')
    .update({ player_id: playerId })
    .eq('id', externalPlayerId);

  if (error) {
    console.error('Error matching player to connected_player:', error);
    throw new Error('Failed to match player');
  }
}

/**
 * Accept a ghost player and add them to the roster
 * Creates a new roster player from connected_player data and links them
 * @param {string} externalPlayerId - connected_player record UUID
 * @param {string} teamId - Team UUID
 * @param {Function} addRosterPlayerFn - Function to create roster player (from TeamContext)
 * @returns {Promise<Object>} The newly created player object
 */
export async function acceptGhostPlayer(externalPlayerId, teamId, addRosterPlayerFn) {
  if (!externalPlayerId || !teamId || !addRosterPlayerFn) {
    throw new Error('External player ID, team ID, and addRosterPlayer function are required');
  }

  // 1. Fetch the connected_player record to get player_name
  const { data: connectedPlayer, error: fetchError } = await supabase
    .from('connected_player')
    .select('id, player_name, player_id')
    .eq('id', externalPlayerId)
    .single();

  if (fetchError) {
    console.error('Error fetching connected_player:', fetchError);
    throw new Error('Failed to fetch player data from provider');
  }

  if (!connectedPlayer) {
    throw new Error('Connected player not found');
  }

  // Check if already matched
  if (connectedPlayer.player_id) {
    throw new Error('This player has already been added to the roster');
  }

  // 2. Parse the external player name
  let parsedName;
  try {
    parsedName = parseExternalPlayerName(connectedPlayer.player_name);
  } catch (parseError) {
    console.error('Error parsing player name:', parseError);
    throw new Error(`Invalid player name format: ${parseError.message}`);
  }

  // 3. Create roster player
  const playerData = {
    first_name: parsedName.first_name,
    last_name: parsedName.last_name,
    display_name: parsedName.display_name,
    on_roster: true,
    jersey_number: null // No jersey number assigned initially
  };

  let newPlayer;
  try {
    newPlayer = await addRosterPlayerFn(teamId, playerData);
  } catch (createError) {
    console.error('Error creating roster player:', createError);
    throw new Error(`Failed to add player to roster: ${createError.message}`);
  }

  // 4. Match the connected_player to the new roster player
  try {
    const { data: matchData, error: matchError } = await supabase
      .from('connected_player')
      .update({ player_id: newPlayer.id })
      .eq('id', externalPlayerId)
      .is('player_id', null)
      .select('id');

    if (matchError) {
      throw matchError;
    }

    if (!matchData || matchData.length === 0) {
      throw new Error('Connected player already matched');
    }
  } catch (matchError) {
    console.error('Error matching player to connected_player:', matchError);
    const { error: cleanupError } = await supabase
      .from('player')
      .delete()
      .eq('id', newPlayer.id);

    if (cleanupError) {
      console.error('Error cleaning up roster player after match failure:', cleanupError);
    }

    if (matchError.message === 'Connected player already matched') {
      throw new Error('This player has already been added to the roster');
    }

    throw new Error('Player added to roster but failed to link to provider data');
  }

  return newPlayer;
}

/**
 * Get unmatched connected_player records for a connector
 * These are external players that haven't been matched to a roster player yet
 * @param {string} connectorId - Connector UUID
 * @returns {Promise<Array>} Array of unmatched connected_player objects
 */
export async function getUnmatchedConnectedPlayers(connectorId) {
  if (!connectorId) {
    throw new Error('Connector ID is required');
  }

  const { data, error } = await supabase
    .from('connected_player')
    .select('*')
    .eq('connector_id', connectorId)
    .is('player_id', null)
    .order('player_name', { ascending: true });

  if (error) {
    console.error('Error fetching unmatched connected players:', error);
    throw new Error('Failed to load unmatched players');
  }

  return data || [];
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

// Build a PostgREST filter that compares year/month/day parts without needing a date column
function buildAttendanceDateFilter(startDate, endDate) {
  const filters = [];

  if (startDate) {
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth() + 1;
    const startDay = startDate.getDate();
    filters.push(
      `or(year.gt.${startYear},and(year.eq.${startYear},month.gt.${startMonth}),and(year.eq.${startYear},month.eq.${startMonth},day_of_month.gte.${startDay}))`
    );
  }

  if (endDate) {
    const endYear = endDate.getFullYear();
    const endMonth = endDate.getMonth() + 1;
    const endDay = endDate.getDate();
    filters.push(
      `or(year.lt.${endYear},and(year.eq.${endYear},month.lt.${endMonth}),and(year.eq.${endYear},month.eq.${endMonth},day_of_month.lte.${endDay}))`
    );
  }

  if (filters.length === 0) {
    return null;
  }

  return filters.length === 1 ? filters[0] : `and(${filters.join(',')})`;
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

    const normalizedStart = toStartOfDay(startDate);
    const normalizedEnd = toEndOfDay(endDate);
    const attendanceDateFilter = buildAttendanceDateFilter(normalizedStart, normalizedEnd);

    // Fetch attendance data for all connectors with optional date filtering
    const connectorIds = connectedConnectors.map(c => c.id);

    let attendanceQuery = supabase
      .from('player_attendance')
      .select(`
        id,
        year,
        month,
        day_of_month,
        total_practices,
        total_attendance,
        connected_player:connected_player_id (
          player_id,
          player_name,
          connector:connector_id (
            id,
            provider
          )
        )
      `)
      .in('connected_player.connector.id', connectorIds)
      .not('connected_player.player_id', 'is', null); // Only include matched players

    if (attendanceDateFilter) {
      attendanceQuery = attendanceQuery.or(attendanceDateFilter);
    }

    const { data: attendanceData, error: attendanceError } = await attendanceQuery
      .order('year', { ascending: true })
      .order('month', { ascending: true })
      .order('day_of_month', { ascending: true });

    if (attendanceError) {
      console.error('Error fetching attendance data:', attendanceError);
      throw new Error('Failed to load attendance data');
    }

    const attendanceRecords = (attendanceData || []).filter(record => {
      if (!normalizedStart && !normalizedEnd) {
        return true;
      }

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
    const dailyPracticeCounts = new Map();

    attendanceRecords.forEach(record => {
      const playerId = record.connected_player?.player_id;
      if (!playerId) return; // Skip if no player_id (should not happen due to filter)

      const dateKey = formatAttendanceDate(record);
      const attendanceCount = Number.isFinite(record.total_attendance)
        ? record.total_attendance
        : 0;
      const currentDailyMax = dailyPracticeCounts.get(dateKey) || 0;

      if (attendanceCount > currentDailyMax) {
        dailyPracticeCounts.set(dateKey, attendanceCount);
      }

      if (!playerAttendanceMap.has(playerId)) {
        playerAttendanceMap.set(playerId, {
          playerId,
          totalAttendance: 0,
          attendanceRecords: []
        });
      }

      const playerData = playerAttendanceMap.get(playerId);
      playerData.totalAttendance += attendanceCount;
      playerData.attendanceRecords.push({
        date: dateKey,
        year: record.year,
        month: record.month,
        day: record.day_of_month || 1,
        practices: record.total_practices,
        attendance: record.total_attendance
      });
    });

    const totalPracticesForPeriod = Array.from(dailyPracticeCounts.values())
      .filter(count => count > 0)
      .reduce((sum, count) => sum + count, 0);

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
      const attendanceRate = totalPracticesForPeriod > 0
        ? (attendanceData.totalAttendance / totalPracticesForPeriod) * 100
        : 0;
      const practicesPerMatch = matchesPlayed > 0
        ? attendanceData.totalAttendance / matchesPlayed
        : 0;

      return {
        playerId,
        playerName,
        totalPractices: totalPracticesForPeriod,
        totalAttendance: attendanceData.totalAttendance,
        attendanceRate: Math.round(attendanceRate * 10) / 10, // 1 decimal place
        matchesPlayed,
        practicesPerMatch: Math.round(practicesPerMatch * 100) / 100, // 2 decimal places
        attendanceRecords: attendanceData.attendanceRecords
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
