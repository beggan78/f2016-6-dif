import React from 'react';
import { mockTeamStats, mockRecentMatches } from './mockData';

export function TeamStatsView() {
  const {
    totalMatches,
    goalsScored,
    goalsConceded,
    averageGoalsScored,
    averageGoalsConceded,
    wins,
    draws,
    losses,
    winPercentage,
    cleanSheets
  } = mockTeamStats;

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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-200 mb-4">Team Overview</h3>

        {/* Key Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-600 p-4 rounded-lg">
            <div className="text-2xl font-bold text-sky-400">{totalMatches}</div>
            <div className="text-sm text-slate-300">Total Matches</div>
          </div>
          <div className="bg-slate-600 p-4 rounded-lg">
            <div className="text-2xl font-bold text-sky-400">{wins}-{draws}-{losses}</div>
            <div className="text-sm text-slate-300">W-D-L</div>
          </div>
          <div className="bg-slate-600 p-4 rounded-lg">
            <div className="text-2xl font-bold text-sky-400">{winPercentage}%</div>
            <div className="text-sm text-slate-300">Win Rate</div>
          </div>
          <div className="bg-slate-600 p-4 rounded-lg">
            <div className="text-2xl font-bold text-sky-400">{cleanSheets}</div>
            <div className="text-sm text-slate-300">Clean Sheets</div>
          </div>
        </div>

        {/* Goals Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-slate-600 p-4 rounded-lg">
            <h4 className="text-md font-semibold text-slate-200 mb-3">Goals Scored</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-300">Total</span>
                <span className="text-sky-400 font-semibold">{goalsScored}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Average per match</span>
                <span className="text-sky-400 font-semibold">{averageGoalsScored}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-600 p-4 rounded-lg">
            <h4 className="text-md font-semibold text-slate-200 mb-3">Goals Conceded</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-300">Total</span>
                <span className="text-sky-400 font-semibold">{goalsConceded}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Average per match</span>
                <span className="text-sky-400 font-semibold">{averageGoalsConceded}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Matches */}
      <div>
        <h3 className="text-lg font-semibold text-slate-200 mb-4">Recent Matches</h3>
        <div className="bg-slate-600 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-500">
                  <th className="text-left py-2 px-3 text-sm font-medium text-slate-200">Date</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-slate-200">Opponent</th>
                  <th className="text-center py-2 px-3 text-sm font-medium text-slate-200">Score</th>
                  <th className="text-center py-2 px-3 text-sm font-medium text-slate-200">Result</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-slate-200">Type</th>
                  <th className="text-center py-2 px-3 text-sm font-medium text-slate-200">H/A</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-500">
                {mockRecentMatches.map((match) => (
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
                      {getResultBadge(match.result)}
                    </td>
                    <td className="py-2 px-3 text-sm text-slate-300">
                      {match.type}
                    </td>
                    <td className="py-2 px-3 text-sm text-center text-slate-300">
                      {match.homeTeam === 'Djurgården' ? 'H' : 'A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}