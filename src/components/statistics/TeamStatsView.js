import React from 'react';
import { Trophy, Target, Shield, Calendar } from 'lucide-react';
import { mockTeamStats } from '../../data/mockStatisticsData';

export function TeamStatsView() {
  const formatPercentage = (wins, total) => {
    if (total === 0) return '0%';
    return `${((wins / total) * 100).toFixed(1)}%`;
  };

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

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-sky-300">Team Statistics</h2>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-600">
          <div className="flex items-center space-x-3">
            <Calendar className="w-8 h-8 text-sky-400" />
            <div>
              <p className="text-2xl font-bold text-white">{mockTeamStats.totalMatches}</p>
              <p className="text-sm text-slate-300">Total Matches</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 p-4 rounded-lg border border-slate-600">
          <div className="flex items-center space-x-3">
            <Target className="w-8 h-8 text-emerald-400" />
            <div>
              <p className="text-2xl font-bold text-white">{mockTeamStats.totalGoalsScored}</p>
              <p className="text-sm text-slate-300">Goals Scored</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 p-4 rounded-lg border border-slate-600">
          <div className="flex items-center space-x-3">
            <Shield className="w-8 h-8 text-red-400" />
            <div>
              <p className="text-2xl font-bold text-white">{mockTeamStats.totalGoalsConceded}</p>
              <p className="text-sm text-slate-300">Goals Conceded</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 p-4 rounded-lg border border-slate-600">
          <div className="flex items-center space-x-3">
            <Trophy className="w-8 h-8 text-yellow-400" />
            <div>
              <p className="text-2xl font-bold text-white">{formatPercentage(mockTeamStats.matchesWon, mockTeamStats.totalMatches)}</p>
              <p className="text-sm text-slate-300">Win Rate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Goal Statistics */}
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-600">
          <h3 className="text-lg font-semibold text-sky-300 mb-4">Goal Statistics</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-300">Average Goals Scored</span>
              <span className="text-white font-semibold">{mockTeamStats.averageGoalsScored}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">Average Goals Conceded</span>
              <span className="text-white font-semibold">{mockTeamStats.averageGoalsConceded}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">Goal Difference</span>
              <span className="text-emerald-400 font-semibold">
                +{mockTeamStats.totalGoalsScored - mockTeamStats.totalGoalsConceded}
              </span>
            </div>
          </div>
        </div>

        {/* Match Results */}
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-600">
          <h3 className="text-lg font-semibold text-sky-300 mb-4">Match Results</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-300">Wins</span>
              <span className="text-emerald-400 font-semibold">
                {mockTeamStats.matchesWon} ({formatPercentage(mockTeamStats.matchesWon, mockTeamStats.totalMatches)})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">Draws</span>
              <span className="text-yellow-400 font-semibold">
                {mockTeamStats.matchesDrawn} ({formatPercentage(mockTeamStats.matchesDrawn, mockTeamStats.totalMatches)})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">Losses</span>
              <span className="text-red-400 font-semibold">
                {mockTeamStats.matchesLost} ({formatPercentage(mockTeamStats.matchesLost, mockTeamStats.totalMatches)})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Matches */}
      <div className="bg-slate-800 p-4 rounded-lg border border-slate-600">
        <h3 className="text-lg font-semibold text-sky-300 mb-4">5 Most Recent Matches</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-slate-600">
                <th className="py-2 text-sm font-medium text-slate-300">Date</th>
                <th className="py-2 text-sm font-medium text-slate-300">Opponent</th>
                <th className="py-2 text-sm font-medium text-slate-300">H/A</th>
                <th className="py-2 text-sm font-medium text-slate-300">Score</th>
                <th className="py-2 text-sm font-medium text-slate-300">Result</th>
                <th className="py-2 text-sm font-medium text-slate-300">Type</th>
              </tr>
            </thead>
            <tbody>
              {mockTeamStats.recentMatches.map((match) => (
                <tr key={match.id} className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors">
                  <td className="py-2 text-sm text-slate-200">
                    {new Date(match.date).toLocaleDateString()}
                  </td>
                  <td className="py-2 text-sm text-slate-200">{match.opponent}</td>
                  <td className="py-2 text-sm text-slate-300">{match.homeAway}</td>
                  <td className="py-2 text-sm font-mono text-white">
                    {match.ownScore}-{match.opponentScore}
                  </td>
                  <td className={`py-2 text-sm font-semibold ${getOutcomeColor(match.outcome)}`}>
                    {getOutcomeText(match.outcome)}
                  </td>
                  <td className="py-2 text-sm text-slate-300">{match.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}