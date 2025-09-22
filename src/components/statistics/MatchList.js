import React, { useState } from 'react';
import { Calendar, Filter, Trophy, Target, Clock, Users } from 'lucide-react';

// Mock match data - replace with actual database queries
const mockMatches = [
  {
    id: 1,
    date: '2024-01-15',
    opponent: 'Hammarby',
    homeScore: 3,
    awayScore: 1,
    result: 'W',
    type: 'League',
    format: '5v5',
    duration: 45,
    playersUsed: 8,
    captain: 'Sofia Karlsson',
    fairPlayWinner: 'Emma Andersson'
  },
  {
    id: 2,
    date: '2024-01-08',
    opponent: 'AIK',
    homeScore: 2,
    awayScore: 2,
    result: 'D',
    type: 'Friendly',
    format: '5v5',
    duration: 40,
    playersUsed: 10,
    captain: 'Lucas Eriksson',
    fairPlayWinner: 'Oliver Johansson'
  },
  {
    id: 3,
    date: '2024-01-01',
    opponent: 'IFK Göteborg',
    homeScore: 4,
    awayScore: 0,
    result: 'W',
    type: 'Cup',
    format: '5v5',
    duration: 45,
    playersUsed: 9,
    captain: 'Sofia Karlsson',
    fairPlayWinner: 'Maja Lindqvist'
  },
  {
    id: 4,
    date: '2023-12-18',
    opponent: 'Malmö FF',
    homeScore: 1,
    awayScore: 2,
    result: 'L',
    type: 'League',
    format: '5v5',
    duration: 45,
    playersUsed: 7,
    captain: 'Emma Andersson',
    fairPlayWinner: 'Filip Gustafsson'
  },
  {
    id: 5,
    date: '2023-12-11',
    opponent: 'IFK Norrköping',
    homeScore: 2,
    awayScore: 0,
    result: 'W',
    type: 'League',
    format: '5v5',
    duration: 45,
    playersUsed: 8,
    captain: 'Sofia Karlsson',
    fairPlayWinner: 'Sofia Karlsson'
  },
  {
    id: 6,
    date: '2023-12-04',
    opponent: 'Örebro SK',
    homeScore: 1,
    awayScore: 1,
    result: 'D',
    type: 'Friendly',
    format: '5v5',
    duration: 30,
    playersUsed: 11,
    captain: 'Lucas Eriksson',
    fairPlayWinner: null
  },
  {
    id: 7,
    date: '2023-11-27',
    opponent: 'BK Häcken',
    homeScore: 3,
    awayScore: 2,
    result: 'W',
    type: 'Cup',
    format: '5v5',
    duration: 45,
    playersUsed: 9,
    captain: 'Emma Andersson',
    fairPlayWinner: 'Lucas Eriksson'
  },
  {
    id: 8,
    date: '2023-11-20',
    opponent: 'Elfsborg',
    homeScore: 0,
    awayScore: 3,
    result: 'L',
    type: 'League',
    format: '5v5',
    duration: 45,
    playersUsed: 6,
    captain: 'Sofia Karlsson',
    fairPlayWinner: 'Oliver Johansson'
  }
];

const FILTER_OPTIONS = {
  ALL: 'all',
  WINS: 'wins',
  DRAWS: 'draws',
  LOSSES: 'losses',
  LEAGUE: 'league',
  CUP: 'cup',
  FRIENDLY: 'friendly'
};

export function MatchList({ onMatchClick, dateRange }) {
  const [filter, setFilter] = useState(FILTER_OPTIONS.ALL);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  const getResultColor = (result) => {
    switch (result) {
      case 'W': return 'text-emerald-400 bg-emerald-900/20 border-emerald-500/30';
      case 'D': return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30';
      case 'L': return 'text-red-400 bg-red-900/20 border-red-500/30';
      default: return 'text-slate-400 bg-slate-700 border-slate-600';
    }
  };

  const getMatchTypeColor = (type) => {
    switch (type.toLowerCase()) {
      case 'league': return 'bg-blue-900/20 text-blue-400 border-blue-500/30';
      case 'cup': return 'bg-purple-900/20 text-purple-400 border-purple-500/30';
      case 'friendly': return 'bg-gray-900/20 text-gray-400 border-gray-500/30';
      default: return 'bg-slate-700 text-slate-400 border-slate-600';
    }
  };

  const filteredMatches = mockMatches.filter(match => {
    if (filter === FILTER_OPTIONS.ALL) return true;
    if (filter === FILTER_OPTIONS.WINS) return match.result === 'W';
    if (filter === FILTER_OPTIONS.DRAWS) return match.result === 'D';
    if (filter === FILTER_OPTIONS.LOSSES) return match.result === 'L';
    if (filter === FILTER_OPTIONS.LEAGUE) return match.type.toLowerCase() === 'league';
    if (filter === FILTER_OPTIONS.CUP) return match.type.toLowerCase() === 'cup';
    if (filter === FILTER_OPTIONS.FRIENDLY) return match.type.toLowerCase() === 'friendly';
    return true;
  });

  const sortedMatches = [...filteredMatches].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];

    if (sortBy === 'date') {
      aVal = new Date(aVal);
      bVal = new Date(bVal);
    }

    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (field) => {
    if (sortBy === field) {
      return sortOrder === 'asc' ? '↑' : '↓';
    }
    return '';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-sky-300 mb-2">Match History</h2>
          <p className="text-slate-400">
            {dateRange.start ? `From ${dateRange.start.toLocaleDateString()} to ${dateRange.end.toLocaleDateString()}` : 'All matches played'}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-slate-400" />
          <span className="text-slate-300">{sortedMatches.length} Matches</span>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-slate-700 border border-slate-600 text-slate-200 px-3 py-2 rounded-md text-sm"
          >
            <option value={FILTER_OPTIONS.ALL}>All Matches</option>
            <option value={FILTER_OPTIONS.WINS}>Wins Only</option>
            <option value={FILTER_OPTIONS.DRAWS}>Draws Only</option>
            <option value={FILTER_OPTIONS.LOSSES}>Losses Only</option>
            <option value={FILTER_OPTIONS.LEAGUE}>League</option>
            <option value={FILTER_OPTIONS.CUP}>Cup</option>
            <option value={FILTER_OPTIONS.FRIENDLY}>Friendly</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-sm text-slate-400">Sort by:</span>
          <button
            onClick={() => handleSort('date')}
            className="text-sm text-sky-400 hover:text-sky-300 underline"
          >
            Date {getSortIcon('date')}
          </button>
          <span className="text-slate-600">|</span>
          <button
            onClick={() => handleSort('opponent')}
            className="text-sm text-sky-400 hover:text-sky-300 underline"
          >
            Opponent {getSortIcon('opponent')}
          </button>
        </div>
      </div>

      {/* Matches Grid */}
      <div className="grid gap-4">
        {sortedMatches.map((match) => (
          <div
            key={match.id}
            onClick={() => onMatchClick(match.id)}
            className="bg-slate-700 rounded-lg p-4 hover:bg-slate-600 transition-all duration-200 cursor-pointer border border-slate-600 hover:border-slate-500"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              {/* Match Result and Score */}
              <div className="flex items-center space-x-4">
                <div className={`px-3 py-1 rounded-full text-xs font-bold border ${getResultColor(match.result)}`}>
                  {match.result}
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-200">
                    {match.homeScore} - {match.awayScore}
                  </div>
                  <div className="text-xs text-slate-400">Djurgården vs {match.opponent}</div>
                </div>
              </div>

              {/* Match Details */}
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-300">{new Date(match.date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium border ${getMatchTypeColor(match.type)}`}>
                    {match.type}
                  </span>
                  <span className="text-xs text-slate-400">{match.format}</span>
                </div>
              </div>

              {/* Match Stats */}
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-300">{match.duration} minutes</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-300">{match.playersUsed} players used</span>
                </div>
              </div>

              {/* Special Awards */}
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Trophy className="h-4 w-4 text-amber-400" />
                  <span className="text-sm text-slate-300">Captain: {match.captain}</span>
                </div>
                {match.fairPlayWinner && (
                  <div className="flex items-center space-x-2">
                    <Target className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm text-slate-300">Fair Play: {match.fairPlayWinner}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {sortedMatches.length === 0 && (
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-slate-500 mx-auto mb-4" />
          <p className="text-slate-400">No matches found for the selected filter.</p>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-slate-700 p-4 rounded-lg">
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-400">
              {sortedMatches.filter(m => m.result === 'W').length}
            </p>
            <p className="text-sm text-slate-400">Wins</p>
          </div>
        </div>
        <div className="bg-slate-700 p-4 rounded-lg">
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-400">
              {sortedMatches.filter(m => m.result === 'D').length}
            </p>
            <p className="text-sm text-slate-400">Draws</p>
          </div>
        </div>
        <div className="bg-slate-700 p-4 rounded-lg">
          <div className="text-center">
            <p className="text-2xl font-bold text-red-400">
              {sortedMatches.filter(m => m.result === 'L').length}
            </p>
            <p className="text-sm text-slate-400">Losses</p>
          </div>
        </div>
        <div className="bg-slate-700 p-4 rounded-lg">
          <div className="text-center">
            <p className="text-2xl font-bold text-sky-400">
              {Math.round((sortedMatches.filter(m => m.result === 'W').length / sortedMatches.length) * 100) || 0}%
            </p>
            <p className="text-sm text-slate-400">Win Rate</p>
          </div>
        </div>
      </div>
    </div>
  );
}