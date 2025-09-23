import React, { useState } from 'react';
import { Button, Select } from '../shared/UI';
import { Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { mockMatchHistory } from './mockData';

const SORT_FIELDS = {
  DATE: 'date',
  OPPONENT: 'opponent',
  TYPE: 'type',
  RESULT: 'result'
};

const FILTER_TYPES = {
  ALL: 'all',
  LEAGUE: 'League',
  CUP: 'Cup',
  FRIENDLY: 'Friendly'
};

export function MatchHistoryView({ onNavigateToMatchDetails, isAdminUser }) {
  const [sortField, setSortField] = useState(SORT_FIELDS.DATE);
  const [sortDirection, setSortDirection] = useState('desc');
  const [filterType, setFilterType] = useState(FILTER_TYPES.ALL);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === SORT_FIELDS.DATE ? 'desc' : 'asc');
    }
  };

  const filteredMatches = mockMatchHistory.filter(match =>
    filterType === FILTER_TYPES.ALL || match.type === filterType
  );

  const sortedMatches = [...filteredMatches].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    if (sortField === 'date') {
      aValue = new Date(aValue);
      bValue = new Date(bValue);
    } else if (sortField === 'opponent') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    } else if (sortField === 'result') {
      // Custom result sorting: W > D > L
      const resultOrder = { 'W': 3, 'D': 2, 'L': 1 };
      aValue = resultOrder[getMatchResult(a)];
      bValue = resultOrder[getMatchResult(b)];
    }

    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const getSortIcon = (field) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  const getMatchResult = (match) => {
    const isHome = match.homeTeam === 'Djurgården';
    const ourScore = isHome ? match.homeScore : match.awayScore;
    const theirScore = isHome ? match.awayScore : match.homeScore;

    if (ourScore > theirScore) return 'W';
    if (ourScore < theirScore) return 'L';
    return 'D';
  };

  const getResultBadge = (result) => {
    switch (result) {
      case 'W':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-900 text-green-200">W</span>;
      case 'D':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-900 text-yellow-200">D</span>;
      case 'L':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-900 text-red-200">L</span>;
      default:
        return null;
    }
  };

  const getScoreDisplay = (match) => {
    const isHome = match.homeTeam === 'Djurgården';
    if (isHome) {
      return `${match.homeScore}-${match.awayScore}`;
    } else {
      return `${match.awayScore}-${match.homeScore}`;
    }
  };

  const SortableHeader = ({ field, children, className = "" }) => (
    <th
      className={`py-2 px-3 text-sm font-medium text-slate-200 cursor-pointer hover:bg-slate-400 transition-colors ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center justify-between">
        <span>{children}</span>
        {getSortIcon(field)}
      </div>
    </th>
  );

  const typeOptions = [
    { value: FILTER_TYPES.ALL, label: 'All Types' },
    { value: FILTER_TYPES.LEAGUE, label: 'League' },
    { value: FILTER_TYPES.CUP, label: 'Cup' },
    { value: FILTER_TYPES.FRIENDLY, label: 'Friendly' }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-200">Match History</h3>

        {/* Filter */}
        <div className="w-40">
          <Select
            value={filterType}
            onChange={setFilterType}
            options={typeOptions}
          />
        </div>
      </div>

      <div className="bg-slate-600 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-500">
                <SortableHeader field={SORT_FIELDS.DATE} className="text-left">
                  Date
                </SortableHeader>
                <SortableHeader field={SORT_FIELDS.OPPONENT} className="text-left">
                  Opponent
                </SortableHeader>
                <th className="py-2 px-3 text-sm font-medium text-slate-200 text-center">Score</th>
                <SortableHeader field={SORT_FIELDS.RESULT} className="text-center">
                  Result
                </SortableHeader>
                <SortableHeader field={SORT_FIELDS.TYPE} className="text-left">
                  Type
                </SortableHeader>
                <th className="py-2 px-3 text-sm font-medium text-slate-200 text-center">H/A</th>
                <th className="py-2 px-3 text-sm font-medium text-slate-200 text-center">Format</th>
                <th className="py-2 px-3 text-sm font-medium text-slate-200 text-center">Formation</th>
                <th className="py-2 px-3 text-sm font-medium text-slate-200 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-500">
              {sortedMatches.map((match) => (
                <tr key={match.id} className="hover:bg-slate-500/50 transition-colors">
                  <td className="py-2 px-3 text-sm text-slate-300">
                    {new Date(match.date).toLocaleDateString('sv-SE')}
                  </td>
                  <td className="py-2 px-3 text-sm text-slate-200 font-medium">
                    {match.opponent}
                  </td>
                  <td className="py-2 px-3 text-sm text-center text-slate-200 font-mono">
                    {getScoreDisplay(match)}
                  </td>
                  <td className="py-2 px-3 text-center">
                    {getResultBadge(getMatchResult(match))}
                  </td>
                  <td className="py-2 px-3 text-sm text-slate-300">
                    {match.type}
                  </td>
                  <td className="py-2 px-3 text-sm text-center text-slate-300">
                    {match.location}
                  </td>
                  <td className="py-2 px-3 text-sm text-center text-slate-300">
                    {match.format}
                  </td>
                  <td className="py-2 px-3 text-sm text-center text-slate-300">
                    {match.formation}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <Button
                      onClick={() => onNavigateToMatchDetails && onNavigateToMatchDetails(match.id)}
                      variant="primary"
                      size="sm"
                      Icon={Eye}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {sortedMatches.length === 0 && (
        <div className="text-center py-8 text-slate-400">
          <p>No matches found for the selected filter.</p>
        </div>
      )}

      {/* Summary */}
      <div className="bg-slate-600 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-slate-200 mb-2">
          Summary ({sortedMatches.length} matches)
        </h4>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="text-green-400 font-semibold">
              {sortedMatches.filter(m => getMatchResult(m) === 'W').length}
            </div>
            <div className="text-slate-400">Wins</div>
          </div>
          <div className="text-center">
            <div className="text-yellow-400 font-semibold">
              {sortedMatches.filter(m => getMatchResult(m) === 'D').length}
            </div>
            <div className="text-slate-400">Draws</div>
          </div>
          <div className="text-center">
            <div className="text-red-400 font-semibold">
              {sortedMatches.filter(m => getMatchResult(m) === 'L').length}
            </div>
            <div className="text-slate-400">Losses</div>
          </div>
        </div>
      </div>
    </div>
  );
}