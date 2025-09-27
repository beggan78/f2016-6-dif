import { supabase } from '../lib/supabase';

/**
 * Service for automatically cleaning up orphaned match records
 *
 * Removes matches that have been abandoned or left unfinished:
 * - Running matches older than 5 hours (likely abandoned)
 * - Finished matches older than 14 days (user forgot to save)
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
    const finishedCutoff = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000); // 14 days ago
    const nowIso = now.toISOString();

    const softDeletePayload = {
      deleted_at: nowIso
    };

    // Clean up running matches older than 5 hours using started_at to avoid deleting newly resumed games
    const { data: deletedRunning, error: runningError } = await supabase
      .from('match')
      .update(softDeletePayload)
      .eq('state', 'running')
      .is('deleted_at', null)
      .not('started_at', 'is', null)
      .lt('started_at', runningCutoff.toISOString())
      .select('id');

    if (runningError) {
      console.error('❌ Failed to cleanup running matches:', runningError);
      return {
        success: false,
        cleanedRunning: 0,
        cleanedFinished: 0,
        error: `Failed to cleanup running matches: ${runningError.message}`
      };
    }

    // Clean up finished matches older than 14 days
    const { data: deletedFinished, error: finishedError } = await supabase
      .from('match')
      .update(softDeletePayload)
      .eq('state', 'finished')
      .is('deleted_at', null)
      .not('finished_at', 'is', null)
      .lt('finished_at', finishedCutoff.toISOString())
      .select('id');

    if (finishedError) {
      console.error('❌ Failed to cleanup finished matches:', finishedError);
      return {
        success: false,
        cleanedRunning: deletedRunning?.length || 0,
        cleanedFinished: 0,
        error: `Failed to cleanup finished matches: ${finishedError.message}`
      };
    }

    const cleanedRunning = deletedRunning?.length || 0;
    const cleanedFinished = deletedFinished?.length || 0;
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
    const finishedCutoff = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000); // 14 days ago

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

    // Count finished matches older than 14 days
    const { count: finishedCount, error: finishedError } = await supabase
      .from('match')
      .select('id', { count: 'exact', head: true })
      .eq('state', 'finished')
      .is('deleted_at', null)
      .not('finished_at', 'is', null)
      .lt('finished_at', finishedCutoff.toISOString());

    if (finishedError) {
      return {
        success: false,
        runningCount: runningCount || 0,
        finishedCount: 0,
        error: `Failed to count finished matches: ${finishedError.message}`
      };
    }

    return {
      success: true,
      runningCount: runningCount || 0,
      finishedCount: finishedCount || 0
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
