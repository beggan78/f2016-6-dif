import { supabase } from '../lib/supabase';
import { PLAYER_ROLES } from '../constants/playerConstants';
import { roleToDatabase, normalizeRole } from '../constants/roleConstants';
import { FORMATS } from '../constants/teamConfiguration';
import { createPersistenceManager } from './persistenceManager';
import { STORAGE_KEYS } from '../constants/storageKeys';

// Create persistence managers
const matchHistoryPersistence = createPersistenceManager(STORAGE_KEYS.MATCH_HISTORY, { matches: [] });
const teamIdPersistence = createPersistenceManager(STORAGE_KEYS.CURRENT_TEAM_ID, { teamId: null });

/**
 * DataSyncManager - Handles synchronization between localStorage and Supabase database
 * Provides hybrid functionality where anonymous users use localStorage only,
 * and authenticated users get enhanced cloud features
 */
export class DataSyncManager {
  constructor(userId = null) {
    this.userId = userId;
    this.isAuthenticated = !!userId;
  }

  // Update user ID when authentication state changes
  setUserId(userId) {
    this.userId = userId;
    this.isAuthenticated = !!userId;
  }

  /**
   * Save match data - routes to appropriate storage based on auth state
   */
  async saveMatch(matchData) {
    try {
      if (this.isAuthenticated) {
        return await this.saveMatchToCloud(matchData);
      } else {
        return this.saveMatchToLocal(matchData);
      }
    } catch (error) {
      console.error('Error saving match data:', error);
      // Fallback to localStorage if cloud save fails
      if (this.isAuthenticated) {
        return this.saveMatchToLocal(matchData);
      }
      throw error;
    }
  }

  /**
   * Save match data to localStorage (anonymous users)
   */
  saveMatchToLocal(matchData) {
    try {
      const matches = this.getLocalMatches();
      const newMatch = {
        id: `local_${Date.now()}`,
        ...matchData,
        savedAt: new Date().toISOString(),
        source: 'local'
      };
      
      matches.push(newMatch);

      // Keep only last 10 matches for anonymous users
      const recentMatches = matches.slice(-10);
      matchHistoryPersistence.saveState({ matches: recentMatches });

      return { success: true, match: newMatch, storage: 'local' };
    } catch (error) {
      console.error('Error saving match to localStorage:', error);
      return { success: false, error: error.message, storage: 'local' };
    }
  }

  /**
   * Save match data to Supabase cloud database
   */
  async saveMatchToCloud(matchData) {
    if (!this.userId) {
      throw new Error('User ID required for cloud storage');
    }

    try {
      // First, ensure we have a current team
      const teamId = await this.getCurrentTeamId();
      if (!teamId) {
        throw new Error('No current team selected. Please create or select a team first.');
      }

      const formatValue = matchData?.format || matchData?.teamConfig?.format || FORMATS.FORMAT_5V5;
      const formationValue = matchData?.teamConfig?.formation || matchData?.formation || '2-2';

      // Create match record
      const { data: match, error: matchError } = await supabase
        .from('match')
        .insert([{
          team_id: teamId,
          format: formatValue,
          formation: formationValue,
          periods: matchData.numPeriods || 3,
          period_duration_minutes: matchData.periodDurationMinutes || 15,
          match_duration_seconds: (matchData.periodDurationMinutes || 15) * (matchData.numPeriods || 3) * 60,
          finished_at: new Date().toISOString(),
          type: 'friendly',
          opponent: matchData.opponentTeam || 'Opponent',
          captain: matchData.captainId || null,
          goals_scored: matchData.ownScore || 0,
          goals_conceded: matchData.opponentScore || 0,
          outcome: this.calculateMatchOutcome(matchData.ownScore, matchData.opponentScore),
          state: 'finished'
        }])
        .select()
        .single();

      if (matchError) {
        throw new Error(`Failed to save match: ${matchError.message}`);
      }

      // Save player statistics
      if (matchData.players && matchData.players.length > 0) {
        await this.savePlayerStats(match.id, matchData.players, teamId);
      }

      // Save match events if available
      if (matchData.matchEvents && matchData.matchEvents.length > 0) {
        await this.saveMatchEvents(match.id, matchData.matchEvents);
      }

      return { 
        success: true, 
        match: match, 
        storage: 'cloud',
        message: 'Match saved to your history successfully!'
      };
    } catch (error) {
      console.error('Error saving match to cloud:', error);
      return { 
        success: false, 
        error: error.message, 
        storage: 'cloud' 
      };
    }
  }

  /**
   * Save player statistics to cloud database
   */
  async savePlayerStats(matchId, players, teamId) {
    try {
      const playerStats = players
        .filter(player => player.stats.startedMatchAs !== null)
        .map(player => ({
          match_id: matchId,
          player_id: player.cloudId || null, // Will be null for local-only players
          goals_scored: player.stats.goals || 0,
          substitutions_in: player.stats.substitutionsIn || 0,
          substitutions_out: player.stats.substitutionsOut || 0,
          goalie_time_seconds: player.stats.timeAsGoalieSeconds || 0,
          defender_time_seconds: player.stats.timeAsDefenderSeconds || 0,
          midfielder_time_seconds: player.stats.timeAsMidfielderSeconds || 0,
          attacker_time_seconds: player.stats.timeAsAttackerSeconds || 0,
          substitute_time_seconds: (player.stats.totalTimeSeconds || 0) - (player.stats.timeOnFieldSeconds || 0),
          started_as: this.mapPlayerRoleToDatabase(player.stats.startedAtRole || player.stats.startedMatchAs),
          was_captain: player.isCaptain || false,
          got_fair_play_award: player.fairPlayAward || false,
          team_mode: players[0]?.teamMode || 'individual_6'
        }));

      if (playerStats.length > 0) {
        const { error } = await supabase
          .from('player_match_stats')
          .insert(playerStats);

        if (error) {
          console.error('Error saving player stats:', error);
        }
      }
    } catch (error) {
      console.error('Error in savePlayerStats:', error);
    }
  }

  /**
   * Save match events to cloud database
   */
  async saveMatchEvents(matchId, matchEvents) {
    try {
      const events = matchEvents.map(event => ({
        match_id: matchId,
        player_id: event.playerId || null,
        event_type: this.mapEventTypeToDatabase(event.type),
        data: event.data || {},
        correlation_id: event.correlationId || null,
        occurred_at_seconds: event.timestamp || 0,
        period: event.period || 1
      }));

      if (events.length > 0) {
        const { error } = await supabase
          .from('match_log_event')
          .insert(events);

        if (error) {
          console.error('Error saving match events:', error);
        }
      }
    } catch (error) {
      console.error('Error in saveMatchEvents:', error);
    }
  }

  /**
   * Get match history - routes to appropriate storage
   */
  async getMatchHistory(limit = 50) {
    try {
      if (this.isAuthenticated) {
        return await this.getCloudMatchHistory(limit);
      } else {
        return this.getLocalMatchHistory(limit);
      }
    } catch (error) {
      console.error('Error getting match history:', error);
      // Fallback to localStorage if cloud fetch fails
      if (this.isAuthenticated) {
        return this.getLocalMatchHistory(limit);
      }
      return { success: false, matches: [], error: error.message };
    }
  }

  /**
   * Get local match history from localStorage
   */
  getLocalMatchHistory(limit = 50) {
    try {
      const matches = this.getLocalMatches();
      return { 
        success: true, 
        matches: matches.slice(-limit).reverse(), // Most recent first
        storage: 'local',
        total: matches.length 
      };
    } catch (error) {
      console.error('Error getting local match history:', error);
      return { success: false, matches: [], error: error.message, storage: 'local' };
    }
  }

  /**
   * Get cloud match history from Supabase
   */
  async getCloudMatchHistory(limit = 50) {
    if (!this.userId) {
      throw new Error('User ID required for cloud storage');
    }

    try {
      const { data: matches, error } = await supabase
        .from('match')
        .select(`
          *,
          team:team_id (
            id,
            name,
            club:club_id (
              name,
              short_name
            )
          ),
          player_match_stats (*)
        `)
        .eq('team.team_user.user_id', this.userId)
        .is('deleted_at', null)
        .order('finished_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch match history: ${error.message}`);
      }

      return { 
        success: true, 
        matches: matches || [], 
        storage: 'cloud',
        total: matches?.length || 0 
      };
    } catch (error) {
      console.error('Error getting cloud match history:', error);
      return { success: false, matches: [], error: error.message, storage: 'cloud' };
    }
  }

  /**
   * Migration utility: Move localStorage data to cloud for new users
   */
  async migrateLocalDataToCloud() {
    if (!this.isAuthenticated) {
      throw new Error('User must be authenticated to migrate data');
    }

    try {
      const localMatches = this.getLocalMatches();
      if (localMatches.length === 0) {
        return { success: true, migrated: 0, message: 'No local data to migrate' };
      }

      let migratedCount = 0;
      const errors = [];

      for (const localMatch of localMatches) {
        try {
          const result = await this.saveMatchToCloud(localMatch);
          if (result.success) {
            migratedCount++;
          } else {
            errors.push(`Match ${localMatch.id}: ${result.error}`);
          }
        } catch (error) {
          errors.push(`Match ${localMatch.id}: ${error.message}`);
        }
      }

      // Clear localStorage after successful migration
      if (migratedCount > 0 && errors.length === 0) {
        matchHistoryPersistence.clearState();
      }

      return {
        success: true,
        migrated: migratedCount,
        total: localMatches.length,
        errors: errors,
        message: `Successfully migrated ${migratedCount} of ${localMatches.length} matches`
      };
    } catch (error) {
      console.error('Error migrating local data to cloud:', error);
      return { success: false, error: error.message };
    }
  }

  // Helper methods

  getLocalMatches() {
    const stored = matchHistoryPersistence.loadState();
    return Array.isArray(stored.matches) ? stored.matches : [];
  }

  async getCurrentTeamId() {
    // Get current team from TeamContext via PersistenceManager
    const stored = teamIdPersistence.loadState();
    if (stored.teamId) {
      return stored.teamId;
    }
    
    // If no team is selected, try to get user's first team
    const { data: userTeams, error } = await supabase
      .from('team_user')
      .select('team_id')
      .eq('user_id', this.userId)
      .limit(1);

    if (error || !userTeams || userTeams.length === 0) {
      return null;
    }

    return userTeams[0].team_id;
  }

  calculateMatchOutcome(ownScore, opponentScore) {
    if (ownScore > opponentScore) return 'win';
    if (ownScore < opponentScore) return 'loss';
    return 'draw';
  }

  mapPlayerRoleToDatabase(role) {
    const normalized = normalizeRole(role);
    if (normalized && normalized !== PLAYER_ROLES.UNKNOWN) {
      return roleToDatabase(normalized);
    }

    // Default to substitute when we cannot determine a meaningful role
    return roleToDatabase(PLAYER_ROLES.SUBSTITUTE);
  }

  mapEventTypeToDatabase(eventType) {
    const eventMap = {
      'goal': 'goal_scored',
      'substitution': 'substitution_in',
      'period_start': 'period_started',
      'period_end': 'period_ended',
      'match_start': 'match_started',
      'match_end': 'match_ended'
    };
    return eventMap[eventType] || eventType;
  }
}

// Singleton instance for use throughout the app
export const dataSyncManager = new DataSyncManager();

// Helper function to update the manager when auth state changes
export const updateDataSyncUser = (userId) => {
  dataSyncManager.setUserId(userId);
};
