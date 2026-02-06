import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Calendar, MapPin, Trophy, History, PlusCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTeam } from '../../contexts/TeamContext';
import { getFinishedMatches } from '../../services/matchStateManager';
import { filterMatchesByCriteria } from '../../utils/matchFilterUtils';
import { getOutcomeBadgeClasses, getMatchTypeBadgeClasses, getFormatBadgeClasses } from '../../utils/badgeUtils';
import { MatchFiltersPanel } from './MatchFiltersPanel';
import { useStatsFilters } from '../../hooks/useStatsFilters';
import { Button } from '../shared/UI';
import { BREAKPOINTS } from '../../constants/layoutConstants';

export function MatchHistoryView({ onMatchSelect, onCreateMatch, startDate, endDate, refreshKey = 0 }) {
  const { t } = useTranslation('statistics');
  const { currentTeam } = useTeam();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const {
    typeFilter,
    outcomeFilter,
    venueFilter,
    opponentFilter,
    playerFilter,
    formatFilter,
    setTypeFilter,
    setOutcomeFilter,
    setVenueFilter,
    setOpponentFilter,
    setPlayerFilter,
    setFormatFilter,
    clearFilters
  } = useStatsFilters();
  const isAtLeastSmBreakpoint = useCallback(() => {
    return typeof window !== 'undefined' && window.innerWidth >= BREAKPOINTS.SM;
  }, []);
  const [isAtLeastSm, setIsAtLeastSm] = useState(() => {
    return isAtLeastSmBreakpoint();
  });

  // Fetch match data from database
  useEffect(() => {
    async function fetchMatches() {
      if (!currentTeam?.id) {
        setMatches([]);
        return;
      }

      setLoading(true);
      setError(null);

      const result = await getFinishedMatches(currentTeam.id, startDate, endDate);

      if (result.success) {
        setMatches(result.matches || []);
      } else {
        setError(result.error || t('matchHistory.errorDetails'));
        setMatches([]);
      }

      setLoading(false);
    }

    fetchMatches();
  }, [currentTeam?.id, startDate, endDate, refreshKey, t]);

  // Detect screen size for responsive layout
  useEffect(() => {
    const checkScreenSize = () => {
      setIsAtLeastSm(isAtLeastSmBreakpoint());
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, [isAtLeastSmBreakpoint]);

  const clearAllFilters = clearFilters;

  const filteredMatches = filterMatchesByCriteria(matches, {
    typeFilter,
    outcomeFilter,
    venueFilter,
    opponentFilter,
    playerFilter,
    formatFilter,
    startDate,
    endDate
  });

  const formatScore = (match) => {
    // Always show team goals first (left), opponent goals second (right)
    return `${match.goalsScored}-${match.goalsConceded}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-700 p-8 rounded-lg border border-slate-600 text-center">
          <div className="text-slate-400">{t('matchHistory.loading')}</div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-700 p-8 rounded-lg border border-slate-600 text-center">
          <div className="text-red-400 mb-2">{t('matchHistory.error')}</div>
          <div className="text-slate-400 text-sm">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <MatchFiltersPanel
        matches={matches}
        typeFilter={typeFilter}
        outcomeFilter={outcomeFilter}
        venueFilter={venueFilter}
        opponentFilter={opponentFilter}
        playerFilter={playerFilter}
        formatFilter={formatFilter}
        onTypeFilterChange={setTypeFilter}
        onOutcomeFilterChange={setOutcomeFilter}
        onVenueFilterChange={setVenueFilter}
        onOpponentFilterChange={setOpponentFilter}
        onPlayerFilterChange={setPlayerFilter}
        onFormatFilterChange={setFormatFilter}
        onClearAllFilters={clearAllFilters}
      />

      {/* Match List */}
      <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="flex items-center space-x-2">
            <History className="h-5 w-5 text-sky-400" />
            <h3 className="text-lg font-semibold text-sky-400">{t('matchHistory.title')}</h3>
          </div>
          {onCreateMatch && (
            <Button onClick={onCreateMatch} Icon={PlusCircle} size="sm">
              {t('matchHistory.addMatch')}
            </Button>
          )}
        </div>
        <p className="text-slate-400 text-sm mb-4">
          {t('matchHistory.matchesFound', { count: filteredMatches.length })}
        </p>
        <div className="space-y-3">
          {filteredMatches.map((match) => (
            <div
              key={match.id}
              className="bg-slate-800 p-4 rounded-lg border border-slate-600 hover:bg-slate-750 transition-colors cursor-pointer"
              onClick={() => onMatchSelect(match.id)}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left Section: Date & Match Info */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {/* Date and Time */}
                  <div className="flex items-center gap-2 text-slate-400 shrink-0">
                    <Calendar className="h-4 w-4" />
                    <div className="text-sm">
                      <div className="font-mono">{formatDate(match.date)}</div>
                      <div className="font-mono text-xs opacity-75">{formatTime(match.date)}</div>
                    </div>
                  </div>

                  {/* Match Info */}
                  <div className="flex-1 min-w-0">
                    {/* Opponent Name */}
                    <div className="text-slate-200 font-semibold text-lg truncate">
                      {match.opponent}
                    </div>

                    {/* Match Details Row */}
                    <div className="flex items-center gap-3 mt-1">
                      {/* Venue Type - Hidden on extra narrow screens */}
                      {isAtLeastSm && (
                        <div className="flex items-center gap-1 text-slate-400">
                          <MapPin className="h-3 w-3" />
                          <span className="text-sm">
                            {match.venueType === 'home' ? t('matchHistory.venues.home') : match.venueType === 'neutral' ? t('matchHistory.venues.neutral') : t('matchHistory.venues.away')}
                          </span>
                        </div>
                      )}

                      {/* Match Type - Hidden on extra narrow screens */}
                      {isAtLeastSm && (
                        <span className={getMatchTypeBadgeClasses(match.type)}>{match.type}</span>
                      )}

                      {/* Match Format - Hidden on extra narrow screens */}
                      {isAtLeastSm && match.format && (
                        <span className={getFormatBadgeClasses(match.format)}>{match.format}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Section: Score & Result */}
                <div className="text-right shrink-0">
                  <div className="text-2xl font-mono font-bold text-slate-100 mb-1">
                    {formatScore(match)}
                  </div>
                  {/* Win/Loss/Draw - Hidden on extra narrow screens */}
                  {isAtLeastSm && (
                    <span className={getOutcomeBadgeClasses(match.outcome)}>
                      {match.outcome === 'W' ? t('matchHistory.outcomes.win') :
                       match.outcome === 'D' ? t('matchHistory.outcomes.draw') : t('matchHistory.outcomes.loss')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filteredMatches.length === 0 && (
            <div className="p-8 text-center text-slate-400">
              <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('matchHistory.noMatchesFiltered')}</p>
              <p className="text-sm mt-1">{t('matchHistory.adjustFilters')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

MatchHistoryView.propTypes = {
  onMatchSelect: PropTypes.func.isRequired,
  onCreateMatch: PropTypes.func,
  startDate: PropTypes.instanceOf(Date),
  endDate: PropTypes.instanceOf(Date),
  refreshKey: PropTypes.number
};
