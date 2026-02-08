/**
 * Player Loan Service
 *
 * Handles CRUD operations for player loan records and loan weighting preferences.
 */

import { supabase } from '../lib/supabase';

const LOAN_MATCH_WEIGHT_KEY = 'loanMatchWeight';
const DEFAULT_LOAN_MATCH_WEIGHT = 0.5;

const normalizeDateValue = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'string') {
    if (value.length >= 10) {
      return value.slice(0, 10);
    }
    return value;
  }
  return null;
};

const normalizeTeamName = (value) => {
  if (!value) return '';
  return value.toString().trim();
};

export const getDefaultLoanMatchWeight = () => DEFAULT_LOAN_MATCH_WEIGHT;

export async function recordPlayerLoans(playerIds, { teamId, receivingTeamName, loanDate }) {
  try {
    if (!Array.isArray(playerIds) || playerIds.length === 0) {
      return { success: false, error: 'errors.loanPlayerRequired' };
    }
    if (!teamId) {
      return { success: false, error: 'Team ID is required' };
    }

    const normalizedTeamName = normalizeTeamName(receivingTeamName);
    if (!normalizedTeamName) {
      return { success: false, error: 'errors.loanTeamNameRequired' };
    }
    if (normalizedTeamName.length > 200) {
      return { success: false, error: 'errors.loanTeamNameTooLong' };
    }

    const normalizedLoanDate = normalizeDateValue(loanDate);
    if (!normalizedLoanDate) {
      return { success: false, error: 'errors.loanDateRequired' };
    }

    const loanRecords = playerIds.map(playerId => ({
      player_id: playerId,
      team_id: teamId,
      receiving_team_name: normalizedTeamName,
      loan_date: normalizedLoanDate
    }));

    const { data, error } = await supabase
      .from('player_loan')
      .insert(loanRecords)
      .select();

    if (error) {
      console.error('Error recording player loans:', error);
      return { success: false, error: error.message || 'errors.loanRecordFailed' };
    }

    return { success: true, loans: data || [] };
  } catch (error) {
    console.error('Exception recording player loans:', error);
    return { success: false, error: error.message || 'errors.loanRecordFailed' };
  }
}

export async function recordPlayerLoan(playerId, { teamId, receivingTeamName, loanDate }) {
  try {
    if (!playerId || !teamId) {
      return { success: false, error: 'Player ID and team ID are required' };
    }

    const normalizedTeamName = normalizeTeamName(receivingTeamName);
    if (!normalizedTeamName) {
      return { success: false, error: 'errors.loanTeamNameRequired' };
    }
    if (normalizedTeamName.length > 200) {
      return { success: false, error: 'errors.loanTeamNameTooLong' };
    }

    const normalizedLoanDate = normalizeDateValue(loanDate);
    if (!normalizedLoanDate) {
      return { success: false, error: 'errors.loanDateRequired' };
    }

    const { data, error } = await supabase
      .from('player_loan')
      .insert({
        player_id: playerId,
        team_id: teamId,
        receiving_team_name: normalizedTeamName,
        loan_date: normalizedLoanDate
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error recording player loan:', error);
      return { success: false, error: error.message || 'Failed to record player loan' };
    }

    return { success: true, loan: data };
  } catch (error) {
    console.error('Exception recording player loan:', error);
    return { success: false, error: error.message || 'Failed to record player loan' };
  }
}

export async function updatePlayerLoan(loanId, updates = {}) {
  try {
    if (!loanId) {
      return { success: false, error: 'Loan ID is required' };
    }

    const payload = {};
    if (updates.receivingTeamName !== undefined) {
      const normalizedTeamName = normalizeTeamName(updates.receivingTeamName);
      if (!normalizedTeamName) {
        return { success: false, error: 'errors.loanTeamNameRequired' };
      }
      if (normalizedTeamName.length > 200) {
        return { success: false, error: 'errors.loanTeamNameTooLong' };
      }
      payload.receiving_team_name = normalizedTeamName;
    }

    if (updates.loanDate !== undefined) {
      const normalizedLoanDate = normalizeDateValue(updates.loanDate);
      if (!normalizedLoanDate) {
        return { success: false, error: 'errors.loanDateRequired' };
      }
      payload.loan_date = normalizedLoanDate;
    }

    if (Object.keys(payload).length === 0) {
      return { success: false, error: 'No updates provided' };
    }

    const { data, error } = await supabase
      .from('player_loan')
      .update(payload)
      .eq('id', loanId)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating player loan:', error);
      return { success: false, error: error.message || 'Failed to update player loan' };
    }

    return { success: true, loan: data };
  } catch (error) {
    console.error('Exception updating player loan:', error);
    return { success: false, error: error.message || 'Failed to update player loan' };
  }
}

export async function updateMatchLoans(matchKey = {}, updates = {}) {
  try {
    const normalizedTeamNameKey = normalizeTeamName(matchKey.receivingTeamName);
    const normalizedLoanDateKey = normalizeDateValue(matchKey.loanDate);

    if (!matchKey.teamId) {
      return { success: false, error: 'Team ID is required' };
    }
    if (!normalizedTeamNameKey) {
      return { success: false, error: 'errors.loanTeamNameRequired' };
    }
    if (!normalizedLoanDateKey) {
      return { success: false, error: 'errors.loanDateRequired' };
    }

    const payload = {};
    if (updates.receivingTeamName !== undefined) {
      const normalizedTeamName = normalizeTeamName(updates.receivingTeamName);
      if (!normalizedTeamName) {
        return { success: false, error: 'errors.loanTeamNameRequired' };
      }
      if (normalizedTeamName.length > 200) {
        return { success: false, error: 'errors.loanTeamNameTooLong' };
      }
      payload.receiving_team_name = normalizedTeamName;
    }

    if (updates.loanDate !== undefined) {
      const normalizedLoanDate = normalizeDateValue(updates.loanDate);
      if (!normalizedLoanDate) {
        return { success: false, error: 'errors.loanDateRequired' };
      }
      payload.loan_date = normalizedLoanDate;
    }

    if (Object.keys(payload).length === 0) {
      return { success: false, error: 'No updates provided' };
    }

    const { data, error } = await supabase
      .from('player_loan')
      .update(payload)
      .eq('team_id', matchKey.teamId)
      .eq('receiving_team_name', normalizedTeamNameKey)
      .eq('loan_date', normalizedLoanDateKey)
      .select();

    if (error) {
      console.error('Error updating match loans:', error);
      return { success: false, error: error.message || 'Failed to update match loans' };
    }

    return { success: true, loans: data || [], updatedCount: data?.length || 0 };
  } catch (error) {
    console.error('Exception updating match loans:', error);
    return { success: false, error: error.message || 'Failed to update match loans' };
  }
}

export async function deletePlayerLoan(loanId) {
  try {
    if (!loanId) {
      return { success: false, error: 'Loan ID is required' };
    }

    const { error } = await supabase
      .from('player_loan')
      .delete()
      .eq('id', loanId);

    if (error) {
      console.error('Error deleting player loan:', error);
      return { success: false, error: error.message || 'Failed to delete player loan' };
    }

    return { success: true };
  } catch (error) {
    console.error('Exception deleting player loan:', error);
    return { success: false, error: error.message || 'Failed to delete player loan' };
  }
}

export async function deleteMatchLoans({ teamId, receivingTeamName, loanDate } = {}) {
  try {
    if (!teamId) {
      return { success: false, error: 'Team ID is required' };
    }

    const normalizedTeamName = normalizeTeamName(receivingTeamName);
    if (!normalizedTeamName) {
      return { success: false, error: 'errors.loanTeamNameRequired' };
    }

    const normalizedLoanDate = normalizeDateValue(loanDate);
    if (!normalizedLoanDate) {
      return { success: false, error: 'errors.loanDateRequired' };
    }

    const { data, error } = await supabase
      .from('player_loan')
      .delete()
      .eq('team_id', teamId)
      .eq('receiving_team_name', normalizedTeamName)
      .eq('loan_date', normalizedLoanDate)
      .select();

    if (error) {
      console.error('Error deleting match loans:', error);
      return { success: false, error: error.message || 'Failed to delete match loans' };
    }

    return { success: true, deletedCount: data?.length || 0 };
  } catch (error) {
    console.error('Exception deleting match loans:', error);
    return { success: false, error: error.message || 'Failed to delete match loans' };
  }
}

export async function getPlayerLoans(playerId, options = {}) {
  try {
    if (!playerId) {
      return { success: false, error: 'Player ID is required' };
    }

    let query = supabase
      .from('player_loan')
      .select('id, player_id, team_id, receiving_team_name, loan_date, created_at, updated_at')
      .eq('player_id', playerId)
      .order('loan_date', { ascending: false });

    if (options.teamId) {
      query = query.eq('team_id', options.teamId);
    }

    const startDate = normalizeDateValue(options.startDate);
    const endDate = normalizeDateValue(options.endDate);

    if (startDate) {
      query = query.gte('loan_date', startDate);
    }
    if (endDate) {
      query = query.lte('loan_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching player loans:', error);
      return { success: false, error: error.message || 'Failed to fetch player loans' };
    }

    return { success: true, loans: data || [] };
  } catch (error) {
    console.error('Exception fetching player loans:', error);
    return { success: false, error: error.message || 'Failed to fetch player loans' };
  }
}

export async function getTeamLoans(teamId, options = {}) {
  try {
    if (!teamId) {
      return { success: false, error: 'Team ID is required' };
    }

    let query = supabase
      .from('player_loan')
      .select(`
        id,
        player_id,
        team_id,
        receiving_team_name,
        loan_date,
        created_at,
        updated_at,
        player:player_id (
          id,
          display_name,
          first_name,
          last_name,
          jersey_number
        )
      `)
      .eq('team_id', teamId)
      .order('loan_date', { ascending: false });

    const startDate = normalizeDateValue(options.startDate);
    const endDate = normalizeDateValue(options.endDate);

    if (startDate) {
      query = query.gte('loan_date', startDate);
    }
    if (endDate) {
      query = query.lte('loan_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching team loans:', error);
      return { success: false, error: error.message || 'Failed to fetch team loans' };
    }

    return { success: true, loans: data || [] };
  } catch (error) {
    console.error('Exception fetching team loans:', error);
    return { success: false, error: error.message || 'Failed to fetch team loans' };
  }
}

export async function getTeamLoanMatchWeight(teamId) {
  try {
    if (!teamId) {
      return { success: false, weight: DEFAULT_LOAN_MATCH_WEIGHT, error: 'Team ID is required' };
    }

    const { data, error } = await supabase
      .from('team_preference')
      .select('value')
      .eq('team_id', teamId)
      .eq('key', LOAN_MATCH_WEIGHT_KEY)
      .maybeSingle();

    if (error) {
      console.error('Error loading loan match weight preference:', error);
      return { success: false, weight: DEFAULT_LOAN_MATCH_WEIGHT, error: error.message || 'Failed to load loan match weight' };
    }

    const parsed = data?.value ? parseFloat(data.value) : DEFAULT_LOAN_MATCH_WEIGHT;
    const weight = Number.isNaN(parsed) ? DEFAULT_LOAN_MATCH_WEIGHT : parsed;

    return { success: true, weight };
  } catch (error) {
    console.error('Exception loading loan match weight preference:', error);
    return { success: false, weight: DEFAULT_LOAN_MATCH_WEIGHT, error: error.message || 'Failed to load loan match weight' };
  }
}

export async function updateTeamLoanMatchWeight(teamId, weight) {
  try {
    if (!teamId) {
      return { success: false, error: 'Team ID is required' };
    }

    const parsedWeight = typeof weight === 'number' ? weight : parseFloat(weight);
    if (Number.isNaN(parsedWeight)) {
      return { success: false, error: 'Loan match weight must be a number' };
    }

    const { error } = await supabase
      .from('team_preference')
      .upsert({
        team_id: teamId,
        key: LOAN_MATCH_WEIGHT_KEY,
        value: parsedWeight.toString(),
        category: 'statistics',
        description: 'Weight applied to loan matches when calculating player statistics'
      }, {
        onConflict: 'team_id,key',
        ignoreDuplicates: false
      });

    if (error) {
      console.error('Error updating loan match weight preference:', error);
      return { success: false, error: error.message || 'Failed to update loan match weight' };
    }

    return { success: true, weight: parsedWeight };
  } catch (error) {
    console.error('Exception updating loan match weight preference:', error);
    return { success: false, error: error.message || 'Failed to update loan match weight' };
  }
}

export function calculateWeightedMatches(regularMatches, loanMatches, loanWeight = DEFAULT_LOAN_MATCH_WEIGHT) {
  const normalizedRegular = Number.isFinite(regularMatches) ? regularMatches : 0;
  const normalizedLoans = Number.isFinite(loanMatches) ? loanMatches : 0;
  const parsedWeight = Number.isFinite(loanWeight) ? loanWeight : DEFAULT_LOAN_MATCH_WEIGHT;
  const weightedLoanMatches = normalizedLoans * parsedWeight;
  const totalWeighted = normalizedRegular + weightedLoanMatches;

  return {
    totalWeighted,
    weightedLoanMatches,
    regularMatches: normalizedRegular,
    loanMatches: normalizedLoans,
    loanWeight: parsedWeight
  };
}
