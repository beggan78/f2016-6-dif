import React, { useState, useMemo } from 'react';
import { Search, Filter, ArrowLeft, ChevronRight, Clock } from 'lucide-react';
import { Button, Input } from '../shared/UI';

/**
 * MatchList - Displays a filterable list of matches with dates, opponents, and scores
 */
export function MatchList({ onNavigateBack, onNavigateToMatchDetail }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterResult, setFilterResult] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  // Mock match data - in real implementation this would come from database
  const mockMatches = useMemo(() => [
    {
      id: 1,
      date: '2024-03-15',
      opponent: 'AIK U12',
      homeScore: 3,
      awayScore: 2,
      isHome: true,
      result: 'win',
      duration: 45,
      type: 'league',
      goals: { scored: 3, conceded: 2 }
    },
    {
      id: 2,
      date: '2024-03-08',
      opponent: 'Hammarby U12',
      homeScore: 1,
      awayScore: 1,
      isHome: false,
      result: 'draw',
      duration: 45,
      type: 'friendly',
      goals: { scored: 1, conceded: 1 }
    },
    {
      id: 3,
      date: '2024-03-01',
      opponent: 'IFK Göteborg U12',
      homeScore: 2,
      awayScore: 1,
      isHome: true,
      result: 'win',
      duration: 45,
      type: 'cup',
      goals: { scored: 2, conceded: 1 }
    },
    {
      id: 4,
      date: '2024-02-22',
      opponent: 'Malmö FF U12',
      homeScore: 0,
      awayScore: 2,
      isHome: false,
      result: 'loss',
      duration: 45,
      type: 'league',
      goals: { scored: 0, conceded: 2 }
    },
    {
      id: 5,
      date: '2024-02-15',
      opponent: 'IFK Norrköping U12',
      homeScore: 4,
      awayScore: 0,
      isHome: true,
      result: 'win',
      duration: 45,
      type: 'friendly',
      goals: { scored: 4, conceded: 0 }
    },
    {
      id: 6,
      date: '2024-02-08',
      opponent: 'BK Häcken U12',
      homeScore: 1,
      awayScore: 3,
      isHome: false,
      result: 'loss',
      duration: 45,
      type: 'league',
      goals: { scored: 1, conceded: 3 }
    },
    {
      id: 7,
      date: '2024-02-01',
      opponent: 'Örebro SK U12',
      homeScore: 2,
      awayScore: 2,
      isHome: true,
      result: 'draw',
      duration: 45,
      type: 'friendly',
      goals: { scored: 2, conceded: 2 }
    },
    {
      id: 8,
      date: '2024-01-25',
      opponent: 'Kalmar FF U12',
      homeScore: 3,
      awayScore: 1,
      isHome: false,
      result: 'win',
      duration: 45,
      type: 'cup',
      goals: { scored: 3, conceded: 1 }
    }
  ], []);

  const filteredAndSortedMatches = useMemo(() => {
    let filtered = mockMatches;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(match =>
        match.opponent.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by result
    if (filterResult !== 'all') {
      filtered = filtered.filter(match => match.result === filterResult);
    }

    // Sort matches
    filtered.sort((a, b) => {
      let aVal, bVal;

      switch (sortBy) {
        case 'date':
          aVal = new Date(a.date);
          bVal = new Date(b.date);
          break;
        case 'opponent':
          aVal = a.opponent.toLowerCase();
          bVal = b.opponent.toLowerCase();
          break;
        case 'goals':
          aVal = a.goals.scored;
          bVal = b.goals.scored;
          break;
        default:
          aVal = new Date(a.date);
          bVal = new Date(b.date);
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [searchTerm, filterResult, sortBy, sortOrder, mockMatches]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getResultColor = (result) => {
    switch (result) {
      case 'win': return 'text-emerald-400 bg-emerald-900/20';
      case 'draw': return 'text-yellow-400 bg-yellow-900/20';
      case 'loss': return 'text-rose-400 bg-rose-900/20';
      default: return 'text-slate-400 bg-slate-900/20';
    }
  };

  const getResultIcon = (result) => {
    switch (result) {
      case 'win': return '✓';
      case 'draw': return '=';
      case 'loss': return '✗';
      default: return '-';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'league': return 'text-sky-400 bg-sky-900/20';
      case 'cup': return 'text-purple-400 bg-purple-900/20';
      case 'friendly': return 'text-emerald-400 bg-emerald-900/20';
      default: return 'text-slate-400 bg-slate-900/20';
    }
  };

  const statistics = useMemo(() => {
    const total = filteredAndSortedMatches.length;
    const won = filteredAndSortedMatches.filter(m => m.result === 'win').length;
    const drawn = filteredAndSortedMatches.filter(m => m.result === 'draw').length;
    const lost = filteredAndSortedMatches.filter(m => m.result === 'loss').length;
    const goalsScored = filteredAndSortedMatches.reduce((sum, m) => sum + m.goals.scored, 0);
    const goalsConceded = filteredAndSortedMatches.reduce((sum, m) => sum + m.goals.conceded, 0);

    return {
      total,
      won,
      drawn,
      lost,
      goalsScored,
      goalsConceded,
      winRate: total > 0 ? Math.round((won / total) * 100) : 0
    };
  }, [filteredAndSortedMatches]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          onClick={onNavigateBack}
          variant="secondary"
          size="sm"
          Icon={ArrowLeft}
        >
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-sky-400">Match History</h1>
          <p className="text-slate-400">Complete list of matches with results</p>
        </div>
      </div>

      {/* Statistics Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-slate-700 rounded-lg p-3 border border-slate-600 text-center">
          <p className="text-lg font-bold text-slate-100">{statistics.total}</p>
          <p className="text-slate-400 text-xs">Total</p>
        </div>
        <div className="bg-slate-700 rounded-lg p-3 border border-slate-600 text-center">
          <p className="text-lg font-bold text-emerald-400">{statistics.won}</p>
          <p className="text-slate-400 text-xs">Won</p>
        </div>
        <div className="bg-slate-700 rounded-lg p-3 border border-slate-600 text-center">
          <p className="text-lg font-bold text-yellow-400">{statistics.drawn}</p>
          <p className="text-slate-400 text-xs">Drawn</p>
        </div>
        <div className="bg-slate-700 rounded-lg p-3 border border-slate-600 text-center">
          <p className="text-lg font-bold text-rose-400">{statistics.lost}</p>
          <p className="text-slate-400 text-xs">Lost</p>
        </div>
        <div className="bg-slate-700 rounded-lg p-3 border border-slate-600 text-center">
          <p className="text-lg font-bold text-sky-400">{statistics.goalsScored}</p>
          <p className="text-slate-400 text-xs">Goals For</p>
        </div>
        <div className="bg-slate-700 rounded-lg p-3 border border-slate-600 text-center">
          <p className="text-lg font-bold text-rose-400">{statistics.goalsConceded}</p>
          <p className="text-slate-400 text-xs">Goals Against</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <Search className="inline h-4 w-4 mr-1" />
              Search Opponent
            </label>
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by opponent name..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <Filter className="inline h-4 w-4 mr-1" />
              Filter Result
            </label>
            <select
              value={filterResult}
              onChange={(e) => setFilterResult(e.target.value)}
              className="w-full bg-slate-600 border border-slate-500 text-slate-100 py-2 px-3 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="all">All Results</option>
              <option value="win">Wins</option>
              <option value="draw">Draws</option>
              <option value="loss">Losses</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-slate-600 border border-slate-500 text-slate-100 py-2 px-3 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="date">Date</option>
              <option value="opponent">Opponent</option>
              <option value="goals">Goals Scored</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Order</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full bg-slate-600 border border-slate-500 text-slate-100 py-2 px-3 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Match List */}
      <div className="space-y-3">
        {filteredAndSortedMatches.length === 0 ? (
          <div className="bg-slate-700 rounded-lg p-8 border border-slate-600 text-center">
            <p className="text-slate-400">No matches found matching your criteria.</p>
          </div>
        ) : (
          filteredAndSortedMatches.map(match => (
            <div
              key={match.id}
              className="bg-slate-700 rounded-lg p-4 border border-slate-600 cursor-pointer hover:bg-slate-600 transition-colors"
              onClick={() => onNavigateToMatchDetail(match.id)}
            >
              <div className="flex items-center justify-between">
                {/* Date and Type */}
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <p className="text-slate-300 font-medium">{formatDate(match.date)}</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(match.type)}`}>
                      {match.type.charAt(0).toUpperCase() + match.type.slice(1)}
                    </span>
                  </div>
                </div>

                {/* Match Details */}
                <div className="flex-1 flex items-center justify-center gap-4">
                  <div className="text-right">
                    <p className="text-slate-200 font-medium">Djurgården U12</p>
                  </div>
                  <div className="text-center px-4">
                    <p className="text-xl font-bold text-slate-100">
                      {match.isHome ? match.homeScore : match.awayScore} - {match.isHome ? match.awayScore : match.homeScore}
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-slate-400" />
                      <span className="text-xs text-slate-400">{match.duration}min</span>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-slate-200 font-medium">{match.opponent}</p>
                    <p className="text-xs text-slate-400">{match.isHome ? 'Home' : 'Away'}</p>
                  </div>
                </div>

                {/* Result and Actions */}
                <div className="flex items-center gap-3">
                  <div className={`px-3 py-1 rounded-full ${getResultColor(match.result)}`}>
                    <span className="font-bold text-sm">
                      {getResultIcon(match.result)}
                    </span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Results Summary */}
      {filteredAndSortedMatches.length > 0 && (
        <div className="text-center text-slate-400 text-sm">
          Showing {filteredAndSortedMatches.length} matches
          {searchTerm || filterResult !== 'all' ? ` (filtered from ${mockMatches.length} total)` : ''}
        </div>
      )}
    </div>
  );
}