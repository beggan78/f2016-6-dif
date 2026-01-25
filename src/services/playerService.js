import { supabase } from '../lib/supabase';

const MAX_NAME_LENGTH = 100;

export const buildNameParts = (displayName) => {
  const trimmedName = displayName.trim();

  if (trimmedName.length > MAX_NAME_LENGTH) {
    throw new Error('Player name too long');
  }

  const sanitizedName = trimmedName.replace(/[<>]/g, '').trim();

  if (!sanitizedName) {
    throw new Error('Player name is required');
  }

  const nameParts = sanitizedName.split(' ').filter(Boolean);

  return {
    displayName: sanitizedName,
    firstName: nameParts[0] || sanitizedName,
    lastName: nameParts.length > 1 ? nameParts.slice(1).join(' ') : null
  };
};

/**
 * Create a temporary player scoped to a specific match.
 */
export async function createTemporaryPlayer({ teamId, matchId, displayName }) {
  try {
    if (!teamId || !matchId) {
      return { success: false, error: 'Team ID and match ID are required' };
    }

    if (!displayName || !displayName.trim()) {
      return { success: false, error: 'Player name is required' };
    }

    const { displayName: normalizedName, firstName, lastName } = buildNameParts(displayName);

    const playerData = {
      team_id: teamId,
      match_id: matchId,
      first_name: firstName,
      last_name: lastName,
      display_name: normalizedName,
      on_roster: false,
      jersey_number: null
    };

    const { data, error } = await supabase
      .from('player')
      .insert(playerData)
      .select()
      .single();

    if (error) {
      console.error('Failed to create temporary player:', error);
      return { success: false, error: error.message };
    }

    return { success: true, player: data };
  } catch (error) {
    console.error('Exception creating temporary player:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get temporary players for a specific match.
 */
export async function getTemporaryPlayersForMatch(matchId) {
  try {
    if (!matchId) {
      return { success: false, error: 'Match ID is required' };
    }

    const { data, error } = await supabase
      .from('player')
      .select('*')
      .eq('match_id', matchId)
      .eq('on_roster', false);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, players: data || [] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
