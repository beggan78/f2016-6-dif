import React from 'react';
import { TrendingUp, Target, Shield, Trophy, Calendar } from 'lucide-react';
import { mockTeamStats } from '../../data/mockStatisticsData';

export function TeamStatistics() {
  const stats = mockTeamStats;

  const statCards = [
    {
      title: 'Total Matches',
      value: stats.totalMatches,
      icon: Calendar,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20'
    },
    {
      title: 'Wins',
      value: stats.wins,
      subtitle: `${Math.round((stats.wins / stats.totalMatches) * 100)}% win rate`,
      icon: Trophy,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20'
    },
    {
      title: 'Draws',
      value: stats.draws,
      subtitle: `${Math.round((stats.draws / stats.totalMatches) * 100)}%`,
      icon: Target,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20'
    },
    {
      title: 'Losses',
      value: stats.losses,
      subtitle: `${Math.round((stats.losses / stats.totalMatches) * 100)}%`,
      icon: Shield,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20'
    }
  ];

  const goalStats = [
    {
      title: 'Goals Scored',
      value: stats.goalsScored,
      average: stats.averageGoalsScored,
      icon: TrendingUp,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20'
    },
    {
      title: 'Goals Conceded',
      value: stats.goalsConceded,
      average: stats.averageGoalsConceded,
      icon: Shield,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20'
    }
  ];

  const goalDifference = stats.goalsScored - stats.goalsConceded;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-100 mb-2">Team Performance Overview</h2>
        <p className="text-slate-400">Complete statistics for the current season</p>
      </div>

      {/* Match Results Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className={`p-6 rounded-lg border ${stat.bgColor} ${stat.borderColor} backdrop-blur-sm`}
            >
              <div className="flex items-center justify-between mb-4">
                <Icon className={`w-8 h-8 ${stat.color}`} />
                <span className={`text-3xl font-bold ${stat.color}`}>
                  {stat.value}
                </span>
              </div>
              <h3 className="text-slate-200 font-medium mb-1">{stat.title}</h3>
              {stat.subtitle && (
                <p className="text-slate-400 text-sm">{stat.subtitle}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Goals Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {goalStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className={`p-6 rounded-lg border ${stat.bgColor} ${stat.borderColor} backdrop-blur-sm`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                  <h3 className="text-slate-200 font-medium">{stat.title}</h3>
                </div>
                <span className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Average per match</span>
                  <span className={`font-medium ${stat.color}`}>
                    {stat.average.toFixed(1)}
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${stat.color.replace('text-', 'bg-')}`}
                    style={{ width: `${Math.min((stat.average / 5) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Goal Difference Summary */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <div className="text-center">
          <h3 className="text-xl font-bold text-slate-200 mb-2">Goal Difference</h3>
          <div className="flex items-center justify-center space-x-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-400">{stats.goalsScored}</div>
              <div className="text-sm text-slate-400">Scored</div>
            </div>
            <div className="text-2xl text-slate-400">-</div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-400">{stats.goalsConceded}</div>
              <div className="text-sm text-slate-400">Conceded</div>
            </div>
            <div className="text-2xl text-slate-400">=</div>
            <div className="text-center">
              <div className={`text-4xl font-bold ${goalDifference >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {goalDifference >= 0 ? '+' : ''}{goalDifference}
              </div>
              <div className="text-sm text-slate-400">Difference</div>
            </div>
          </div>

          {/* Win Rate Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-400">Season Progress</span>
              <span className="text-sm font-medium text-slate-200">
                {Math.round((stats.wins / stats.totalMatches) * 100)}% Win Rate
              </span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3">
              <div className="flex h-3 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500"
                  style={{ width: `${(stats.wins / stats.totalMatches) * 100}%` }}
                ></div>
                <div
                  className="bg-yellow-500"
                  style={{ width: `${(stats.draws / stats.totalMatches) * 100}%` }}
                ></div>
                <div
                  className="bg-red-500"
                  style={{ width: `${(stats.losses / stats.totalMatches) * 100}%` }}
                ></div>
              </div>
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>Wins: {stats.wins}</span>
              <span>Draws: {stats.draws}</span>
              <span>Losses: {stats.losses}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}