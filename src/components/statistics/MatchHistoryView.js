import React, { useState } from 'react';
import { Calendar, MapPin, Trophy, Eye } from 'lucide-react';
import { Button } from '../shared/UI';

// Mock data - replace with real data later
const mockMatches = [
  {
    id: 1,
    date: '2024-01-20T15:00:00Z',
    opponent: 'Hammarby IF',
    homeScore: 3,
    awayScore: 1,
    isHome: true,
    type: 'League',
    outcome: 'W'
  },
  {
    id: 2,
    date: '2024-01-15T14:30:00Z',
    opponent: 'AIK',
    homeScore: 2,
    awayScore: 2,
    isHome: false,
    type: 'Friendly',
    outcome: 'D'
  },
  {
    id: 3,
    date: '2024-01-10T16:00:00Z',
    opponent: 'IFK Göteborg',
    homeScore: 1,
    awayScore: 2,
    isHome: true,
    type: 'Cup',
    outcome: 'L'
  },
  {
    id: 4,
    date: '2024-01-05T13:00:00Z',
    opponent: 'Malmö FF',
    homeScore: 4,
    awayScore: 0,
    isHome: false,
    type: 'League',
    outcome: 'W'
  },
  {
    id: 5,
    date: '2023-12-20T15:30:00Z',
    opponent: 'Örebro SK',
    homeScore: 2,
    awayScore: 1,
    isHome: true,
    type: 'League',
    outcome: 'W'
  },
  {
    id: 6,
    date: '2023-12-15T14:00:00Z',
    opponent: 'Helsingborgs IF',
    homeScore: 0,
    awayScore: 3,
    isHome: false,
    type: 'Friendly',
    outcome: 'L'
  },
  {
    id: 7,
    date: '2023-12-10T16:30:00Z',
    opponent: 'BK Häcken',
    homeScore: 1,
    awayScore: 1,
    isHome: true,
    type: 'League',
    outcome: 'D'
  },
  {
    id: 8,
    date: '2023-12-05T15:00:00Z',
    opponent: 'IFK Norrköping',
    homeScore: 3,
    awayScore: 2,
    isHome: false,
    type: 'Cup',
    outcome: 'W'
  },
  {
    id: 9,
    date: '2023-11-30T14:30:00Z',
    opponent: 'Degerfors IF',
    homeScore: 2,
    awayScore: 0,
    isHome: true,
    type: 'League',
    outcome: 'W'
  },
  {
    id: 10,
    date: '2023-11-25T13:30:00Z',
    opponent: 'Varbergs BoIS',
    homeScore: 1,
    awayScore: 4,
    isHome: false,
    type: 'Friendly',
    outcome: 'L'
  }
];

const MATCH_TYPES = ['All', 'League', 'Cup', 'Friendly'];
const OUTCOMES = ['All', 'W', 'D', 'L'];

export function MatchHistoryView({ onMatchSelect }) {
  const [typeFilter, setTypeFilter] = useState('All');
  const [outcomeFilter, setOutcomeFilter] = useState('All');

  const filteredMatches = mockMatches.filter(match => {
    if (typeFilter !== 'All' && match.type !== typeFilter) return false;
    if (outcomeFilter !== 'All' && match.outcome !== outcomeFilter) return false;
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
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
          <h3 className="text-slate-300 font-medium mb-2">Total Matches</h3>
          <div className="text-2xl font-bold text-sky-400">{mockMatches.length}</div>
        </div>

        <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
          <h3 className="text-slate-300 font-medium mb-2">Wins</h3>
          <div className="text-2xl font-bold text-emerald-400">
            {mockMatches.filter(m => m.outcome === 'W').length}
          </div>
        </div>

        <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
          <h3 className="text-slate-300 font-medium mb-2">Draws</h3>
          <div className="text-2xl font-bold text-slate-400">
            {mockMatches.filter(m => m.outcome === 'D').length}
          </div>
        </div>

        <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
          <h3 className="text-slate-300 font-medium mb-2">Losses</h3>
          <div className="text-2xl font-bold text-rose-400">
            {mockMatches.filter(m => m.outcome === 'L').length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">Filter Matches</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col">
            <label className="text-slate-300 text-sm mb-2">Match Type</label>
            <div className="flex gap-2">
              {MATCH_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    typeFilter === type
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-slate-300 text-sm mb-2">Outcome</label>
            <div className="flex gap-2">
              {OUTCOMES.map(outcome => (
                <button
                  key={outcome}
                  onClick={() => setOutcomeFilter(outcome)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    outcomeFilter === outcome
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                  }`}
                >
                  {outcome === 'All' ? 'All' :
                   outcome === 'W' ? 'Wins' :
                   outcome === 'D' ? 'Draws' : 'Losses'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Match List */}
      <div className="bg-slate-700 rounded-lg border border-slate-600 overflow-hidden">
        <div className="p-4 border-b border-slate-600">
          <h3 className="text-lg font-semibold text-slate-100">Match History</h3>
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
                        vs {match.opponent}
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