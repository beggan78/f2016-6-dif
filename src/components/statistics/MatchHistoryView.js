import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, MapPin, Trophy, Eye, Filter, History, ChevronDown, ChevronUp } from 'lucide-react';
import { Button, Select } from '../shared/UI';

// Mock data - replace with real data later
const mockMatches = [
  {
    id: 1,
    date: '2025-01-20T15:00:00Z',
    opponent: 'Hammarby IF',
    homeScore: 3,
    awayScore: 1,
    isHome: true,
    type: 'League',
    outcome: 'W',
    players: ['Alice Johnson', 'Bob Smith', 'Charlie Brown', 'David Wilson', 'Eva Davis']
  },
  {
    id: 2,
    date: '2025-01-15T14:30:00Z',
    opponent: 'AIK',
    homeScore: 2,
    awayScore: 2,
    isHome: false,
    type: 'Friendly',
    outcome: 'D',
    players: ['Alice Johnson', 'Bob Smith', 'Frank Miller', 'Grace Lee', 'Henry Taylor']
  },
  {
    id: 3,
    date: '2025-01-10T16:00:00Z',
    opponent: 'IFK Göteborg',
    homeScore: 1,
    awayScore: 2,
    isHome: true,
    type: 'Cup',
    outcome: 'L',
    players: ['Charlie Brown', 'David Wilson', 'Eva Davis', 'Frank Miller', 'Grace Lee']
  },
  {
    id: 4,
    date: '2025-01-05T13:00:00Z',
    opponent: 'Malmö FF',
    homeScore: 4,
    awayScore: 0,
    isHome: false,
    type: 'League',
    outcome: 'W',
    players: ['Alice Johnson', 'Bob Smith', 'Charlie Brown', 'Henry Taylor', 'Ian Clark']
  },
  {
    id: 5,
    date: '2024-12-20T15:30:00Z',
    opponent: 'Örebro SK',
    homeScore: 2,
    awayScore: 1,
    isHome: true,
    type: 'League',
    outcome: 'W',
    players: ['David Wilson', 'Eva Davis', 'Frank Miller', 'Grace Lee', 'Henry Taylor']
  },
  {
    id: 6,
    date: '2024-12-15T14:00:00Z',
    opponent: 'Helsingborgs IF',
    homeScore: 0,
    awayScore: 3,
    isHome: false,
    type: 'Friendly',
    outcome: 'L',
    players: ['Alice Johnson', 'Charlie Brown', 'Eva Davis', 'Ian Clark', 'Jack Wilson']
  },
  {
    id: 7,
    date: '2024-12-10T16:30:00Z',
    opponent: 'BK Häcken',
    homeScore: 1,
    awayScore: 1,
    isHome: true,
    type: 'League',
    outcome: 'D',
    players: ['Bob Smith', 'Frank Miller', 'Grace Lee', 'Henry Taylor', 'Ian Clark']
  },
  {
    id: 8,
    date: '2024-12-05T15:00:00Z',
    opponent: 'IFK Norrköping',
    homeScore: 3,
    awayScore: 2,
    isHome: false,
    type: 'Cup',
    outcome: 'W',
    players: ['Alice Johnson', 'Charlie Brown', 'David Wilson', 'Jack Wilson', 'Liam Brown']
  },
  {
    id: 9,
    date: '2024-11-30T14:30:00Z',
    opponent: 'Degerfors IF',
    homeScore: 2,
    awayScore: 0,
    isHome: true,
    type: 'League',
    outcome: 'W',
    players: ['Bob Smith', 'Eva Davis', 'Frank Miller', 'Ian Clark', 'Jack Wilson']
  },
  {
    id: 10,
    date: '2024-11-25T13:30:00Z',
    opponent: 'Varbergs BoIS',
    homeScore: 1,
    awayScore: 4,
    isHome: false,
    type: 'Friendly',
    outcome: 'L',
    players: ['Charlie Brown', 'Grace Lee', 'Henry Taylor', 'Liam Brown', 'Mike Davis']
  }
];

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
  const [typeFilter, setTypeFilter] = useState('All');
  const [outcomeFilter, setOutcomeFilter] = useState('All');
  const [homeAwayFilter, setHomeAwayFilter] = useState('All');
  const [opponentFilter, setOpponentFilter] = useState('All');
  const [playerFilter, setPlayerFilter] = useState('All');

  // Mobile detection and filter collapse state
  const [isMobile, setIsMobile] = useState(() => {
    return typeof window !== 'undefined' && window.innerWidth < 640;
  });
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(() => {
    return typeof window !== 'undefined' && window.innerWidth < 640;
  });

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 640; // sm breakpoint
      setIsMobile(mobile);

      // Don't auto-collapse if user has manually expanded filters
      // Only auto-collapse when transitioning from desktop to mobile
      if (mobile && !isMobile) {
        setIsFilterCollapsed(true);
      } else if (!mobile) {
        setIsFilterCollapsed(false);
      }
    };

    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [isMobile]);

  // Get unique opponents from matches
  const opponents = useMemo(() => {
    const uniqueOpponents = [...new Set(mockMatches.map(match => match.opponent))];
    return [
      { value: 'All', label: 'All' },
      ...uniqueOpponents.map(opponent => ({ value: opponent, label: opponent }))
    ];
  }, []);

  // Get unique players from matches
  const players = useMemo(() => {
    const uniquePlayers = [...new Set(mockMatches.flatMap(match => match.players || []))];
    return [
      { value: 'All', label: 'All' },
      ...uniquePlayers.sort().map(player => ({ value: player, label: player }))
    ];
  }, []);

  const filteredMatches = mockMatches.filter(match => {
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
    return true;
  });

  const getOutcomeBadge = (outcome) => {
    const baseClasses = "px-2 py-1 rounded text-xs font-medium";
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
    const baseClasses = "px-2 py-1 rounded text-xs font-medium";
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

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsFilterCollapsed(!isFilterCollapsed)}
        >
          <h3 className="text-lg font-semibold text-sky-400 flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter
          </h3>
          {isMobile && (
            <button className="text-sky-400 hover:text-sky-300 transition-colors">
              {isFilterCollapsed ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronUp className="h-5 w-5" />
              )}
            </button>
          )}
        </div>

        {/* Filter content - collapsible on mobile */}
        <div className={`${
          isMobile
            ? (isFilterCollapsed ? 'hidden' : 'block mt-4')
            : 'mt-4'
        }`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
          </div>
        </div>
      </div>

      {/* Match List */}
      <div className="bg-slate-700 rounded-lg border border-slate-600 overflow-hidden">
        <div className="p-4 border-b border-slate-600">
          <h3 className="text-lg font-semibold text-sky-400 flex items-center gap-2">
            <History className="h-5 w-5" />
            Match History
          </h3>
          <p className="text-slate-400 text-sm mt-1">
            {filteredMatches.length} matches found. Click on a match to view detailed statistics.
          </p>
        </div>

        <div className="divide-y divide-slate-600">
          {filteredMatches.map((match) => (
            <div
              key={match.id}
              className="p-4 hover:bg-slate-600 transition-colors cursor-pointer"
              onClick={() => onMatchSelect(match.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Date and Time */}
                  <div className="flex items-center space-x-2 text-slate-400">
                    <Calendar className="h-4 w-4" />
                    <div className="text-sm">
                      <div className="font-mono">{formatDate(match.date)}</div>
                      <div className="font-mono text-xs">{formatTime(match.date)}</div>
                    </div>
                  </div>

                  {/* Match Info */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="text-slate-200 font-medium">
                        {match.opponent}
                      </div>
                      <div className="flex items-center space-x-1 text-slate-400">
                        <MapPin className="h-3 w-3" />
                        <span className="text-xs">
                          {match.isHome ? 'Home' : 'Away'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={getTypeBadge(match.type)}>{match.type}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  {/* Score */}
                  <div className="text-right">
                    <div className="text-lg font-mono font-semibold text-slate-100">
                      {formatScore(match)}
                    </div>
                    <span className={getOutcomeBadge(match.outcome)}>
                      {match.outcome === 'W' ? 'Win' :
                       match.outcome === 'D' ? 'Draw' : 'Loss'}
                    </span>
                  </div>

                  {/* View Details Button */}
                  <Button
                    Icon={Eye}
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMatchSelect(match.id);
                    }}
                  >
                    Details
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredMatches.length === 0 && (
          <div className="p-8 text-center text-slate-400">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No matches found with the selected filters.</p>
            <p className="text-sm mt-1">Try adjusting your filter criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}