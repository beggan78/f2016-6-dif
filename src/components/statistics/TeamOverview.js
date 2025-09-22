import React from 'react';
import { Trophy, Target, TrendingUp, Calendar } from 'lucide-react';

// Mock data - replace with actual database queries
const mockTeamStats = {
  totalMatches: 24,
  wins: 15,
  draws: 4,
  losses: 5,
  goalsScored: 68,
  goalsConceded: 42,
  averageGoalsScored: 2.8,
  averageGoalsConceded: 1.8,
  winPercentage: 62.5,
  recentForm: ['W', 'W', 'D', 'W', 'L'], // Last 5 matches
};

const mockRecentMatches = [
  {
    id: 1,
    date: '2024-01-15',
    opponent: 'Hammarby',
    homeScore: 3,
    awayScore: 1,
    result: 'W',
    type: 'League'
  },
  {
    id: 2,
    date: '2024-01-08',
    opponent: 'AIK',
    homeScore: 2,
    awayScore: 2,
    result: 'D',
    type: 'Friendly'
  },
  {
    id: 3,
    date: '2024-01-01',
    opponent: 'IFK Göteborg',
    homeScore: 4,
    awayScore: 0,
    result: 'W',
    type: 'Cup'
  },
  {
    id: 4,
    date: '2023-12-18',
    opponent: 'Malmö FF',
    homeScore: 1,
    awayScore: 2,
    result: 'L',
    type: 'League'
  },
  {
    id: 5,
    date: '2023-12-11',
    opponent: 'IFK Norrköping',
    homeScore: 2,
    awayScore: 0,
    result: 'W',
    type: 'League'
  }
];

export function TeamOverview({ dateRange }) {
  const getResultColor = (result) => {
    switch (result) {
      case 'W': return 'text-emerald-400 bg-emerald-900/20';
      case 'D': return 'text-yellow-400 bg-yellow-900/20';
      case 'L': return 'text-red-400 bg-red-900/20';
      default: return 'text-slate-400 bg-slate-700';
    }
  };

  const getFormBadgeColor = (result) => {
    switch (result) {
      case 'W': return 'bg-emerald-600';
      case 'D': return 'bg-yellow-600';
      case 'L': return 'bg-red-600';
      default: return 'bg-slate-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-sky-300 mb-2">Team Performance Overview</h2>
        <p className="text-slate-400">
          {dateRange.start ? `From ${dateRange.start.toLocaleDateString()} to ${dateRange.end.toLocaleDateString()}` : 'All time statistics'}
        </p>
      </div>

      {/* Key Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-700 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Total Matches</p>
              <p className="text-2xl font-bold text-sky-400">{mockTeamStats.totalMatches}</p>
            </div>
            <Calendar className="h-8 w-8 text-slate-500" />
          </div>
        </div>

        <div className="bg-slate-700 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Win Rate</p>
              <p className="text-2xl font-bold text-emerald-400">{mockTeamStats.winPercentage}%</p>
            </div>
            <Trophy className="h-8 w-8 text-slate-500" />
          </div>
        </div>

        <div className="bg-slate-700 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Goals Scored</p>
              <p className="text-2xl font-bold text-sky-400">{mockTeamStats.goalsScored}</p>
            </div>
            <Target className="h-8 w-8 text-slate-500" />
          </div>
        </div>

        <div className="bg-slate-700 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Goals Conceded</p>
              <p className="text-2xl font-bold text-red-400">{mockTeamStats.goalsConceded}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-slate-500" />
          </div>
        </div>
      </div>

      {/* Match Results Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Results Breakdown */}
        <div className="bg-slate-700 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-sky-300 mb-4">Match Results</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Wins</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-slate-600 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full"
                    style={{ width: `${(mockTeamStats.wins / mockTeamStats.totalMatches) * 100}%` }}
                  ></div>
                </div>
                <span className="text-emerald-400 font-bold w-8">{mockTeamStats.wins}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Draws</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-slate-600 rounded-full h-2">
                  <div
                    className="bg-yellow-500 h-2 rounded-full"
                    style={{ width: `${(mockTeamStats.draws / mockTeamStats.totalMatches) * 100}%` }}
                  ></div>
                </div>
                <span className="text-yellow-400 font-bold w-8">{mockTeamStats.draws}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Losses</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-slate-600 rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full"
                    style={{ width: `${(mockTeamStats.losses / mockTeamStats.totalMatches) * 100}%` }}
                  ></div>
                </div>
                <span className="text-red-400 font-bold w-8">{mockTeamStats.losses}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Goal Statistics */}
        <div className="bg-slate-700 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-sky-300 mb-4">Goal Statistics</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-slate-300">Average Goals Scored</span>
              <span className="text-sky-400 font-bold">{mockTeamStats.averageGoalsScored}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">Average Goals Conceded</span>
              <span className="text-red-400 font-bold">{mockTeamStats.averageGoalsConceded}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">Goal Difference</span>
              <span className="text-emerald-400 font-bold">+{mockTeamStats.goalsScored - mockTeamStats.goalsConceded}</span>
            </div>
            <div className="pt-2 border-t border-slate-600">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Recent Form</span>
                <div className="flex space-x-1">
                  {mockTeamStats.recentForm.map((result, index) => (
                    <span
                      key={index}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${getFormBadgeColor(result)}`}
                    >
                      {result}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Matches */}
      <div className="bg-slate-700 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-sky-300 mb-4">Recent Matches</h3>
        <div className="space-y-2">
          {mockRecentMatches.map((match) => (
            <div key={match.id} className="flex items-center justify-between p-3 bg-slate-600 rounded-lg hover:bg-slate-500 transition-colors cursor-pointer">
              <div className="flex items-center space-x-4">
                <span className={`px-2 py-1 rounded text-xs font-bold ${getResultColor(match.result)}`}>
                  {match.result}
                </span>
                <div>
                  <p className="text-slate-200 font-medium">vs {match.opponent}</p>
                  <p className="text-slate-400 text-sm">{new Date(match.date).toLocaleDateString()} • {match.type}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-slate-200 font-bold">{match.homeScore} - {match.awayScore}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}