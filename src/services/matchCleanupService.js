import { supabase } from '../lib/supabase';

/**
 * Service for automatically cleaning up orphaned match records
 *
 * Removes matches that have been abandoned or left unfinished:
 * - Running matches older than 5 hours (likely abandoned)
 *
 * Respects existing RLS policies - only marks matches the user manages as deleted.
 */

/**
 * Clean up orphaned match records based on age and state
 *
 * @returns {Promise<{success: boolean, cleanedRunning: number, cleanedFinished: number, error?: string}>}
 */
export async function cleanupAbandonedMatches() {
  try {
    // Calculate cutoff dates
    const now = new Date();
    const runningCutoff = new Date(now.getTime() - 5 * 60 * 60 * 1000); // 5 hours ago
    const nowIso = now.toISOString();

    const softDeletePayload = {
      deleted_at: nowIso
    };

    // Clean up running matches older than 5 hours using started_at to avoid deleting newly resumed games
    const { data: runningCandidates, error: runningFetchError } = await supabase
      .from('match')
      .select('id')
      .eq('state', 'running')
      .is('deleted_at', null)
      .not('started_at', 'is', null)
      .lt('started_at', runningCutoff.toISOString());

    if (runningFetchError) {
      console.error('❌ Failed to fetch running matches for cleanup:', runningFetchError);
      return {
        success: false,
        cleanedRunning: 0,
        cleanedFinished: 0,
        error: `Failed to fetch running matches: ${runningFetchError.message}`
      };
    }

    const runningIds = runningCandidates?.map(match => match.id) || [];

    if (runningIds.length > 0) {
      const { error: runningUpdateError } = await supabase
        .from('match')
        .update(softDeletePayload, { returning: 'minimal' })
        .in('id', runningIds);

      if (runningUpdateError) {
        console.error('❌ Failed to cleanup running matches:', runningUpdateError);
        return {
          success: false,
          cleanedRunning: 0,
          cleanedFinished: 0,
          error: `Failed to cleanup running matches: ${runningUpdateError.message}`
        };
      }
    }

    const cleanedRunning = runningIds.length;
    const cleanedFinished = 0;
    const totalCleaned = cleanedRunning + cleanedFinished;

    if (totalCleaned > 0) {
      // Log in production only when cleanup actually occurred
      console.log(`🧹 Cleaned up ${totalCleaned} orphaned matches (${cleanedRunning} running, ${cleanedFinished} finished)`);
    }

    return {
      success: true,
      cleanedRunning,
      cleanedFinished
    };

  } catch (error) {
    console.error('❌ Exception during match cleanup:', error);
    return {
      success: false,
      cleanedRunning: 0,
      cleanedFinished: 0,
      error: `Unexpected error: ${error.message}`
    };
  }
}

/**
 * Get statistics about potentially orphaned matches without deleting them
 * Useful for monitoring and debugging
 *
 * @returns {Promise<{success: boolean, runningCount: number, finishedCount: number, error?: string}>}
 */
export async function getOrphanedMatchStats() {
  try {
    const now = new Date();
    const runningCutoff = new Date(now.getTime() - 5 * 60 * 60 * 1000); // 5 hours ago

    // Count running matches older than 5 hours
    const { count: runningCount, error: runningError } = await supabase
      .from('match')
      .select('id', { count: 'exact', head: true })
      .eq('state', 'running')
      .is('deleted_at', null)
      .not('started_at', 'is', null)
      .lt('started_at', runningCutoff.toISOString());

    if (runningError) {
      return {
        success: false,
        runningCount: 0,
        finishedCount: 0,
        error: `Failed to count running matches: ${runningError.message}`
      };
    }

    return {
      success: true,
      runningCount: runningCount || 0,
      finishedCount: 0
    };

  } catch (error) {
    console.error('❌ Exception while getting orphaned match stats:', error);
    return {
      success: false,
      runningCount: 0,
      finishedCount: 0,
      error: `Unexpected error: ${error.message}`
    };
  }
}
