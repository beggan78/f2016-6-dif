import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, MapPin, Trophy, Filter, History, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { Select, Button } from '../shared/UI';
import { useTeam } from '../../contexts/TeamContext';
import { getConfirmedMatches } from '../../services/matchStateManager';

const MATCH_TYPES = [
  { value: 'All', label: 'All' },
  { value: 'League', label: 'League' },
  { value: 'Cup', label: 'Cup' },
  { value: 'Friendly', label: 'Friendly' }
];

const OUTCOMES = [
  { value: 'All', label: 'All' },
  { value: 'W', label: 'Win' },
  { value: 'D', label: 'Draw' },
  { value: 'L', label: 'Loss' }
];

const HOME_AWAY = [
  { value: 'All', label: 'All' },
  { value: 'Home', label: 'Home' },
  { value: 'Away', label: 'Away' }
];

export function MatchHistoryView({ onMatchSelect, startDate, endDate }) {
  const { currentTeam } = useTeam();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [typeFilter, setTypeFilter] = useState('All');
  const [outcomeFilter, setOutcomeFilter] = useState('All');
  const [homeAwayFilter, setHomeAwayFilter] = useState('All');
  const [opponentFilter, setOpponentFilter] = useState('All');
  const [playerFilter, setPlayerFilter] = useState('All');
  const [formatFilter, setFormatFilter] = useState('All');

  // Fetch match data from database
  useEffect(() => {
    async function fetchMatches() {
      if (!currentTeam?.id) {
        setMatches([]);
        return;
      }

      setLoading(true);
      setError(null);

      const result = await getConfirmedMatches(currentTeam.id, startDate, endDate);

      if (result.success) {
        setMatches(result.matches || []);
      } else {
        setError(result.error || 'Failed to load match history');
        setMatches([]);
      }

      setLoading(false);
    }

    fetchMatches();
  }, [currentTeam?.id, startDate, endDate]);

  // Screen size detection and filter collapse state
  const [needsCollapse, setNeedsCollapse] = useState(() => {
    return typeof window !== 'undefined' && window.innerWidth < 1024; // lg breakpoint
  });
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(() => {
    return typeof window !== 'undefined' && window.innerWidth < 1024;
  });

  // Detect screen size that requires filter collapsing
  useEffect(() => {
    const checkScreenSize = () => {
      const shouldCollapse = window.innerWidth < 1024; // lg breakpoint - when filters wrap to multiple rows

      setNeedsCollapse(prevNeedsCollapse => {
        // Only update collapse state if needsCollapse actually changed
        if (prevNeedsCollapse !== shouldCollapse) {
          // Use a callback to ensure we're working with the latest state
          setIsFilterCollapsed(prevIsCollapsed => {
            // Don't auto-collapse if user has manually expanded filters
            // Only auto-collapse when transitioning from wide to narrow screen
            if (shouldCollapse && !prevNeedsCollapse) {
              return true;
            } else if (!shouldCollapse) {
              return false;
            }
            return prevIsCollapsed;
          });
        }
        return shouldCollapse;
      });
    };

    // Initial check
    checkScreenSize();

    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []); // Remove needsCollapse dependency to prevent race condition

  // Get unique opponents from matches
  const opponents = useMemo(() => {
    const uniqueOpponents = [...new Set(matches.map(match => match.opponent))];
    return [
      { value: 'All', label: 'All' },
      ...uniqueOpponents.map(opponent => ({ value: opponent, label: opponent }))
    ];
  }, [matches]);

  // Get unique players from matches
  const players = useMemo(() => {
    const uniquePlayers = [...new Set(matches.flatMap(match => match.players || []))];
    return [
      { value: 'All', label: 'All' },
      ...uniquePlayers.sort().map(player => ({ value: player, label: player }))
    ];
  }, [matches]);

  // Get unique formats from matches - only show filter if multiple formats exist
  const formats = useMemo(() => {
    const uniqueFormats = [...new Set(matches.map(match => match.format).filter(Boolean))];
    return [
      { value: 'All', label: 'All' },
      ...uniqueFormats.sort().map(format => ({ value: format, label: format }))
    ];
  }, [matches]);

  const shouldShowFormatFilter = formats.length > 2; // More than just 'All' option

  // Function to clear all filters
  const clearAllFilters = () => {
    setTypeFilter('All');
    setOutcomeFilter('All');
    setHomeAwayFilter('All');
    setOpponentFilter('All');
    setPlayerFilter('All');
    setFormatFilter('All');
  };

  const filteredMatches = matches.filter(match => {
    // Time range filter
    if (startDate || endDate) {
      const matchDate = new Date(match.date);
      if (startDate && matchDate < startDate) return false;
      if (endDate && matchDate > endDate) return false;
    }

    // Existing filters
    if (typeFilter !== 'All' && match.type !== typeFilter) return false;
    if (outcomeFilter !== 'All' && match.outcome !== outcomeFilter) return false;
    if (homeAwayFilter !== 'All') {
      const matchHomeAway = match.isHome ? 'Home' : 'Away';
      if (matchHomeAway !== homeAwayFilter) return false;
    }
    if (opponentFilter !== 'All' && match.opponent !== opponentFilter) return false;
    if (playerFilter !== 'All' && (!match.players || !match.players.includes(playerFilter))) return false;
    if (formatFilter !== 'All' && match.format !== formatFilter) return false;
    return true;
  });

  const getOutcomeBadge = (outcome) => {
    const baseClasses = "inline-flex items-center justify-center px-2 py-1 rounded text-xs font-medium w-12 text-center";
    switch (outcome) {
      case 'W':
        return `${baseClasses} bg-emerald-900/50 text-emerald-300 border border-emerald-600`;
      case 'D':
        return `${baseClasses} bg-slate-700 text-slate-300 border border-slate-600`;
      case 'L':
        return `${baseClasses} bg-rose-900/50 text-rose-300 border border-rose-600`;
      default:
        return `${baseClasses} bg-slate-700 text-slate-300`;
    }
  };

  const getTypeBadge = (type) => {
    const baseClasses = "inline-flex items-center justify-center px-2 py-1 rounded text-xs font-medium w-20 text-center";
    switch (type) {
      case 'League':
        return `${baseClasses} bg-sky-900/50 text-sky-300 border border-sky-600`;
      case 'Cup':
        return `${baseClasses} bg-purple-900/50 text-purple-300 border border-purple-600`;
      case 'Friendly':
        return `${baseClasses} bg-slate-700 text-slate-300 border border-slate-600`;
      default:
        return `${baseClasses} bg-slate-700 text-slate-300`;
    }
  };

  const formatScore = (match) => {
    if (match.isHome) {
      return `${match.homeScore}-${match.awayScore}`;
    } else {
      return `${match.awayScore}-${match.homeScore}`;
    }
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
          <div className="text-slate-400">Loading match history...</div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-700 p-8 rounded-lg border border-slate-600 text-center">
          <div className="text-red-400 mb-2">Error loading match history</div>
          <div className="text-slate-400 text-sm">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setIsFilterCollapsed(!isFilterCollapsed)}
          >
            <h3 className="text-lg font-semibold text-sky-400 flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter
            </h3>
            {needsCollapse && (
              <button className="text-sky-400 hover:text-sky-300 transition-colors">
                {isFilterCollapsed ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronUp className="h-5 w-5" />
                )}
              </button>
            )}
          </div>

          <Button
            onClick={clearAllFilters}
            Icon={RotateCcw}
            variant="ghost"
            size="sm"
            className="text-sky-400 hover:text-sky-300"
          >
            Clear All
          </Button>
        </div>

        {/* Filter content - collapsible when screen is narrow */}
        <div className={`${
          needsCollapse
            ? (isFilterCollapsed ? 'hidden' : 'block mt-4')
            : 'mt-4'
        }`}>
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${
            shouldShowFormatFilter ? 'lg:grid-cols-6' : 'lg:grid-cols-5'
          }`}>
          <div className="flex flex-col">
            <label className="text-slate-300 text-sm mb-2">Type</label>
            <Select
              value={typeFilter}
              onChange={setTypeFilter}
              options={MATCH_TYPES}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-slate-300 text-sm mb-2">Outcome</label>
            <Select
              value={outcomeFilter}
              onChange={setOutcomeFilter}
              options={OUTCOMES}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-slate-300 text-sm mb-2">Home/Away</label>
            <Select
              value={homeAwayFilter}
              onChange={setHomeAwayFilter}
              options={HOME_AWAY}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-slate-300 text-sm mb-2">Opponent</label>
            <Select
              value={opponentFilter}
              onChange={setOpponentFilter}
              options={opponents}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-slate-300 text-sm mb-2">With Player</label>
            <Select
              value={playerFilter}
              onChange={setPlayerFilter}
              options={players}
            />
          </div>

          {shouldShowFormatFilter && (
            <div className="flex flex-col">
              <label className="text-slate-300 text-sm mb-2">Format</label>
              <Select
                value={formatFilter}
                onChange={setFormatFilter}
                options={formats}
              />
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Match List */}
      <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
        <div className="flex items-center space-x-2 mb-4">
          <History className="h-5 w-5 text-sky-400" />
          <h3 className="text-lg font-semibold text-sky-400">Match History</h3>
        </div>
        <p className="text-slate-400 text-sm mb-4">
          {filteredMatches.length} matches found. Click on a match to view detailed statistics.
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
                      {/* Home/Away - Hidden on narrow screens */}
                      {!needsCollapse && (
                        <div className="flex items-center gap-1 text-slate-400">
                          <MapPin className="h-3 w-3" />
                          <span className="text-sm">
                            {match.isHome ? 'Home' : 'Away'}
                          </span>
                        </div>
                      )}

                      {/* Match Type - Hidden on narrow screens */}
                      {!needsCollapse && (
                        <span className={getTypeBadge(match.type)}>{match.type}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Section: Score & Result */}
                <div className="text-right shrink-0">
                  <div className="text-2xl font-mono font-bold text-slate-100 mb-1">
                    {formatScore(match)}
                  </div>
                  {/* Win/Loss/Draw - Hidden on narrow screens */}
                  {!needsCollapse && (
                    <span className={getOutcomeBadge(match.outcome)}>
                      {match.outcome === 'W' ? 'Win' :
                       match.outcome === 'D' ? 'Draw' : 'Loss'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filteredMatches.length === 0 && (
            <div className="p-8 text-center text-slate-400">
              <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No matches found with the selected filters.</p>
              <p className="text-sm mt-1">Try adjusting your filter criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
