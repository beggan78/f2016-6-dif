import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getActiveMatches } from '../services/matchStateManager';

/**
 * Subscribe to real-time updates for team matches
 * Fetches initial active matches and subscribes to changes via Supabase Realtime
 *
 * @param {string} teamId - Team ID to subscribe to
 * @returns {{ matches: Array, loading: boolean, error: string|null, refetch: Function }}
 */
export function useRealtimeTeamMatches(teamId) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const subscriptionRef = useRef(null);

  useEffect(() => {
    if (!teamId) {
      setMatches([]);
      setLoading(false);
      return;
    }

    let isActive = true;

    // Fetch initial matches
    const fetchMatches = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getActiveMatches(teamId);

        if (result.success) {
          if (isActive) {
            setMatches(result.matches || []);
          }
        } else {
          if (isActive) {
            setError(result.error || 'Failed to load matches');
          }
        }
      } catch (err) {
        console.error('Error fetching active matches:', err);
        if (isActive) {
          setError('Failed to load matches');
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchMatches();

    // Subscribe to Realtime changes
    subscriptionRef.current = supabase
      .channel(`team_matches:${teamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match',
          filter: `team_id=eq.${teamId}`
        },
        (payload) => {
          if (!isActive) return;

          console.log('Match change detected:', payload);

          if (payload.eventType === 'INSERT') {
            const newMatch = payload.new;
            // Only add if it's pending or running
            if (newMatch.state === 'pending' || newMatch.state === 'running') {
              setMatches(prev => [
                {
                  id: newMatch.id,
                  opponent: newMatch.opponent || 'Internal Match',
                  state: newMatch.state,
                  createdAt: newMatch.created_at,
                  startedAt: newMatch.started_at,
                  type: newMatch.type,
                  venueType: newMatch.venue_type
                },
                ...prev
              ]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new;

            // Remove match if it became finished
            if (updated.state === 'finished') {
              setMatches(prev => prev.filter(m => m.id !== updated.id));
            } else if (updated.state === 'pending' || updated.state === 'running') {
              // Update existing match
              setMatches(prev => {
                const exists = prev.some(m => m.id === updated.id);

                if (exists) {
                  // Update existing
                  return prev.map(match =>
                    match.id === updated.id
                      ? {
                          id: updated.id,
                          opponent: updated.opponent || 'Internal Match',
                          state: updated.state,
                          createdAt: updated.created_at,
                          startedAt: updated.started_at,
                          type: updated.type,
                          venueType: updated.venue_type
                        }
                      : match
                  );
                } else {
                  // Add new (in case it transitioned from finished to running/pending)
                  return [
                    {
                      id: updated.id,
                      opponent: updated.opponent || 'Internal Match',
                      state: updated.state,
                      createdAt: updated.created_at,
                      startedAt: updated.started_at,
                      type: updated.type,
                      venueType: updated.venue_type
                    },
                    ...prev
                  ];
                }
              });
            }
          } else if (payload.eventType === 'DELETE') {
            // Remove deleted match
            setMatches(prev => prev.filter(m => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Cleanup on unmount
    return () => {
      isActive = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [teamId]);

  // Refetch function for manual refresh
  const refetch = async () => {
    if (!teamId) return;

    try {
      setError(null);
      const result = await getActiveMatches(teamId);

      if (result.success) {
        setMatches(result.matches || []);
      } else {
        setError(result.error || 'Failed to load matches');
      }
    } catch (err) {
      console.error('Error refetching active matches:', err);
      setError('Failed to load matches');
    }
  };

  return {
    matches,
    loading,
    error,
    refetch
  };
}
