import React, { useState } from 'react';
import { Calendar, Clock, ChevronRight, Filter, Search } from 'lucide-react';
import { mockMatches, getOutcomeColor, getMatchTypeBadgeColor } from '../../data/mockStatisticsData';

export function MatchesList({ onMatchSelect }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedOutcome, setSelectedOutcome] = useState('all');

  const filteredMatches = mockMatches.filter(match => {
    const matchesSearch = match.opponent.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || match.type === selectedType;
    const matchesOutcome = selectedOutcome === 'all' || match.outcome === selectedOutcome;

    return matchesSearch && matchesType && matchesOutcome;
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getOutcomeText = (outcome) => {
    switch (outcome) {
      case 'win': return 'W';
      case 'loss': return 'L';
      case 'draw': return 'D';
      default: return '-';
    }
  };

  const getScoreDisplay = (match) => {
    return `${match.goalsScored}-${match.goalsConceded}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Match History</h2>
          <p className="text-slate-400 mt-1">
            {filteredMatches.length} of {mockMatches.length} matches
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search opponent..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
            />
          </div>

          {/* Match Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="league">League</option>
            <option value="cup">Cup</option>
            <option value="tournament">Tournament</option>
            <option value="friendly">Friendly</option>
            <option value="internal">Internal</option>
          </select>

          {/* Outcome Filter */}
          <select
            value={selectedOutcome}
            onChange={(e) => setSelectedOutcome(e.target.value)}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
          >
            <option value="all">All Results</option>
            <option value="win">Wins</option>
            <option value="draw">Draws</option>
            <option value="loss">Losses</option>
          </select>
        </div>
      </div>

      {/* Matches List */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        {filteredMatches.length === 0 ? (
          <div className="p-8 text-center">
            <Filter className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-200 mb-2">No matches found</h3>
            <p className="text-slate-400">Try adjusting your search or filter criteria.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {filteredMatches.map((match) => (
              <div
                key={match.id}
                onClick={() => onMatchSelect(match)}
                className="p-4 hover:bg-slate-700 cursor-pointer transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      {/* Date */}
                      <div className="flex items-center space-x-2 text-slate-400 min-w-0 flex-shrink-0">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {formatDate(match.date)}
                        </span>
                      </div>

                      {/* Match Type Badge */}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMatchTypeBadgeColor(match.type)} flex-shrink-0`}>
                        {match.type.charAt(0).toUpperCase() + match.type.slice(1)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      {/* Opponent and Score */}
                      <div className="flex items-center space-x-4 min-w-0 flex-1">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-medium text-slate-200 truncate">
                            vs {match.opponent}
                          </h3>
                          <div className="flex items-center space-x-2 text-sm text-slate-400">
                            <Clock className="w-3 h-3" />
                            <span>{match.periods} periods • {match.format}</span>
                          </div>
                        </div>

                        {/* Score and Result */}
                        <div className="flex items-center space-x-4 flex-shrink-0">
                          <div className="text-right">
                            <div className="text-xl font-bold text-slate-200">
                              {getScoreDisplay(match)}
                            </div>
                            <div className={`text-sm font-medium ${getOutcomeColor(match.outcome)}`}>
                              {getOutcomeText(match.outcome)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Arrow */}
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-200 transition-colors ml-4 flex-shrink-0" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {filteredMatches.length > 0 && (
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
          <h3 className="text-lg font-medium text-slate-200 mb-3">Filtered Results Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">
                {filteredMatches.filter(m => m.outcome === 'win').length}
              </div>
              <div className="text-sm text-slate-400">Wins</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {filteredMatches.filter(m => m.outcome === 'draw').length}
              </div>
              <div className="text-sm text-slate-400">Draws</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">
                {filteredMatches.filter(m => m.outcome === 'loss').length}
              </div>
              <div className="text-sm text-slate-400">Losses</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-sky-400">
                {filteredMatches.reduce((sum, m) => sum + m.goalsScored, 0)}
              </div>
              <div className="text-sm text-slate-400">Goals</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}