import React, { useState } from 'react';
import { ChevronRight, Filter } from 'lucide-react';
import { Button, Select } from '../shared/UI';
import { mockMatchHistory } from '../../data/mockStatisticsData';

export function MatchHistoryView({ onMatchSelect }) {
  const [filterType, setFilterType] = useState('all');
  const [filterOutcome, setFilterOutcome] = useState('all');

  const getOutcomeColor = (outcome) => {
    switch (outcome) {
      case 'W': return 'text-emerald-400';
      case 'D': return 'text-yellow-400';
      case 'L': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const getOutcomeText = (outcome) => {
    switch (outcome) {
      case 'W': return 'Win';
      case 'D': return 'Draw';
      case 'L': return 'Loss';
      default: return outcome;
    }
  };

  const getFilteredMatches = () => {
    return mockMatchHistory.filter(match => {
      const typeMatch = filterType === 'all' || match.type === filterType;
      const outcomeMatch = filterOutcome === 'all' || match.outcome === filterOutcome;
      return typeMatch && outcomeMatch;
    });
  };

  const filteredMatches = getFilteredMatches();

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'League', label: 'League' },
    { value: 'Friendly', label: 'Friendly' },
    { value: 'Cup', label: 'Cup' }
  ];

  const outcomeOptions = [
    { value: 'all', label: 'All Results' },
    { value: 'W', label: 'Wins' },
    { value: 'D', label: 'Draws' },
    { value: 'L', label: 'Losses' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-sky-300">Match History</h2>
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-400">Filters:</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center space-x-2">
          <label className="text-sm text-slate-300">Type:</label>
          <div className="w-32">
            <Select
              value={filterType}
              onChange={setFilterType}
              options={typeOptions}
            />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-sm text-slate-300">Result:</label>
          <div className="w-32">
            <Select
              value={filterOutcome}
              onChange={setFilterOutcome}
              options={outcomeOptions}
            />
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-slate-400">
        Showing {filteredMatches.length} of {mockMatchHistory.length} matches
      </div>

      {/* Matches Table */}
      <div className="bg-slate-800 rounded-lg border border-slate-600 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700 border-b border-slate-600">
              <tr>
                <th className="py-3 px-4 text-left text-sm font-medium text-slate-300">Date</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-slate-300">Opponent</th>
                <th className="py-3 px-4 text-center text-sm font-medium text-slate-300">H/A</th>
                <th className="py-3 px-4 text-center text-sm font-medium text-slate-300">Score</th>
                <th className="py-3 px-4 text-center text-sm font-medium text-slate-300">Result</th>
                <th className="py-3 px-4 text-center text-sm font-medium text-slate-300">Type</th>
                <th className="py-3 px-4 text-center text-sm font-medium text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMatches.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    No matches found with the current filters
                  </td>
                </tr>
              ) : (
                filteredMatches.map((match) => (
                  <tr
                    key={match.id}
                    className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors cursor-pointer"
                    onClick={() => onMatchSelect(match)}
                  >
                    <td className="py-3 px-4 text-sm text-slate-200">
                      {new Date(match.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-200 font-medium">{match.opponent}</td>
                    <td className="py-3 px-4 text-sm text-slate-300 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${
                        match.homeAway === 'Home'
                          ? 'bg-sky-900/50 text-sky-300'
                          : 'bg-slate-600/50 text-slate-300'
                      }`}>
                        {match.homeAway}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm font-mono text-white text-center">
                      {match.ownScore}-{match.opponentScore}
                    </td>
                    <td className={`py-3 px-4 text-sm font-semibold text-center ${getOutcomeColor(match.outcome)}`}>
                      {getOutcomeText(match.outcome)}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-300 text-center">
                      <span className="px-2 py-1 bg-slate-600/50 rounded text-xs">
                        {match.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Button
                        variant="secondary"
                        size="sm"
                        Icon={ChevronRight}
                        onClick={(e) => {
                          e.stopPropagation();
                          onMatchSelect(match);
                        }}
                      >
                        Details
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}