import { useEffect, useMemo, useState } from 'react';
import { getMatchPlayerAvailability } from '../services/matchIntegrationService';

export function useProviderAvailability(matches) {
  const [availabilityByMatch, setAvailabilityByMatch] = useState({});
  const [providerAvailabilityLoading, setProviderAvailabilityLoading] = useState(false);

  const matchIdsKey = useMemo(
    () => {
      if (!Array.isArray(matches)) {
        return '';
      }

      const uniqueIds = Array.from(
        new Set(
          matches
            .map((match) => match?.id)
            .filter((matchId) => Boolean(matchId))
            .map((matchId) => String(matchId))
        )
      );

      uniqueIds.sort();
      return JSON.stringify(uniqueIds);
    },
    [matches]
  );

  useEffect(() => {
    const matchIds = matchIdsKey ? JSON.parse(matchIdsKey) : [];

    if (matchIds.length === 0) {
      setAvailabilityByMatch({});
      setProviderAvailabilityLoading(false);
      return;
    }

    let isActive = true;
    setProviderAvailabilityLoading(true);

    getMatchPlayerAvailability(matchIds)
      .then((result) => {
        if (!isActive) return;

        if (result?.success) {
          setAvailabilityByMatch(result.availabilityByMatch || {});
        } else {
          setAvailabilityByMatch({});
        }
      })
      .catch((error) => {
        if (!isActive) return;
        console.error('Failed to load provider availability:', error);
        setAvailabilityByMatch({});
      })
      .finally(() => {
        if (!isActive) return;
        setProviderAvailabilityLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [matchIdsKey]);

  const providerUnavailableByMatch = useMemo(() => {
    const unavailableByMatch = {};

    Object.entries(availabilityByMatch || {}).forEach(([matchId, players]) => {
      const providerUnavailableIds = Object.entries(players || {})
        .filter(([, status]) => (
          status?.availability === 'unavailable' || status?.response === 'declined'
        ))
        .map(([playerId]) => playerId);

      if (providerUnavailableIds.length > 0) {
        unavailableByMatch[matchId] = providerUnavailableIds;
      }
    });

    return unavailableByMatch;
  }, [availabilityByMatch]);

  const providerResponseByMatch = useMemo(() => {
    const responseByMatch = {};
    Object.entries(availabilityByMatch || {}).forEach(([matchId, players]) => {
      const responses = {};
      Object.entries(players || {}).forEach(([playerId, status]) => {
        if (status?.response) {
          responses[playerId] = status.response;
        }
      });
      if (Object.keys(responses).length > 0) {
        responseByMatch[matchId] = responses;
      }
    });
    return responseByMatch;
  }, [availabilityByMatch]);

  return { providerUnavailableByMatch, providerResponseByMatch, providerAvailabilityLoading };
}
