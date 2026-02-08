import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getOpponentNameHistory } from '../services/opponentNameService';

const DEFAULT_LIMIT = 100;

/**
 * Loads previously used opponent names for the active team and exposes helpers
 * to refresh the dataset on demand.
 *
 * @param {string|null} teamId - Current team identifier
 * @param {Object} [options]
 * @param {number} [options.limit=100] - Maximum number of names to request
 * @returns {{
 *   names: string[],
 *   loading: boolean,
 *   error: string|null,
 *   refresh: Function
 * }}
 */
export function useOpponentNameSuggestions(teamId, options = {}) {
  const { t } = useTranslation('common');
  const limit = typeof options.limit === 'number' && options.limit > 0 ? options.limit : DEFAULT_LIMIT;

  const [names, setNames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const lastTeamIdRef = useRef(null);
  const requestIdRef = useRef(0);

  const fetchNames = useCallback(async (activeTeamId) => {
    requestIdRef.current += 1;
    const currentRequestId = requestIdRef.current;

    if (!activeTeamId) {
      setNames([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const result = await getOpponentNameHistory(activeTeamId, { limit });

    if (requestIdRef.current !== currentRequestId) {
      return;
    }

    if (result.success) {
      setNames(result.names);
    } else {
      setError(result.error || t('errors.failedToLoadOpponentNames'));
      setNames([]);
    }

    setLoading(false);
  }, [limit, t]);

  useEffect(() => {
    if (teamId === lastTeamIdRef.current) {
      return;
    }

    lastTeamIdRef.current = teamId;
    fetchNames(teamId);
  }, [teamId, fetchNames]);

  const refresh = useCallback(() => {
    if (!teamId) return Promise.resolve();
    return fetchNames(teamId);
  }, [teamId, fetchNames]);

  return { names, loading, error, refresh };
}
