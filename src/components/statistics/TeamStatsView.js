import React, { useMemo } from 'react';
import { Trophy, Calendar, TrendingUp, TrendingDown, Target, PieChart, Clock } from 'lucide-react';

// Mock data - replace with real data later
const mockTeamStats = {
  totalMatches: 15,
  wins: 8,
  draws: 4,
  losses: 3,
  goalsScored: 42,
  goalsConceded: 28,
  averageGoalsScored: 2.8,
  averageGoalsConceded: 1.9,
  recentMatches: [
    { id: 1, date: '2024-01-20', opponent: 'Hammarby IF', score: '3-1', result: 'W' },
    { id: 2, date: '2024-01-15', opponent: 'AIK', score: '2-2', result: 'D' },
    { id: 3, date: '2024-01-10', opponent: 'IFK Göteborg', score: '1-2', result: 'L' },
    { id: 4, date: '2024-01-05', opponent: 'Malmö FF', score: '4-0', result: 'W' },
    { id: 5, date: '2023-12-20', opponent: 'Örebro SK', score: '2-1', result: 'W' }
  ]
};

export function TeamStatsView({ startDate, endDate }) {
  // Filter matches based on time range
  const filteredMatches = useMemo(() => {
    if (!startDate && !endDate) {
      return mockTeamStats.recentMatches;
    }

    return mockTeamStats.recentMatches.filter(match => {
      const matchDate = new Date(match.date);
      if (startDate && matchDate < startDate) return false;
      if (endDate && matchDate > endDate) return false;
      return true;
    });
  }, [startDate, endDate]);

  // Calculate filtered stats
  const filteredStats = useMemo(() => {
    if (!startDate && !endDate) {
      return mockTeamStats;
    }

    const totalMatches = filteredMatches.length;
    const wins = filteredMatches.filter(match => match.result === 'W').length;
    const draws = filteredMatches.filter(match => match.result === 'D').length;
    const losses = filteredMatches.filter(match => match.result === 'L').length;

    // Calculate goals from scores
    let goalsScored = 0;
    let goalsConceded = 0;

    filteredMatches.forEach(match => {
      const [scored, conceded] = match.score.split('-').map(Number);
      goalsScored += scored;
      goalsConceded += conceded;
    });

    const averageGoalsScored = totalMatches > 0 ? (goalsScored / totalMatches) : 0;
    const averageGoalsConceded = totalMatches > 0 ? (goalsConceded / totalMatches) : 0;

    return {
      totalMatches,
      wins,
      draws,
      losses,
      goalsScored,
      goalsConceded,
      averageGoalsScored: Math.round(averageGoalsScored * 10) / 10,
      averageGoalsConceded: Math.round(averageGoalsConceded * 10) / 10,
      recentMatches: filteredMatches.slice(0, 5) // Show top 5 recent matches
    };
  }, [filteredMatches]);

  const {
    totalMatches,
    wins,
    draws,
    losses,
    goalsScored,
    goalsConceded,
    averageGoalsScored,
    averageGoalsConceded,
    recentMatches
  } = filteredStats;

  const winPercentage = totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : 0;
  const goalDifference = goalsScored - goalsConceded;

  const StatCard = ({ icon: Icon, title, value, subtitle, trend }) => (
    <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg">
            <Icon className="h-5 w-5 text-sky-400" />
          </div>
          <div>
            <p className="text-slate-400 text-sm">{title}</p>
            <p className="text-slate-100 text-xl font-semibold">{value}</p>
            {subtitle && <p className="text-slate-400 text-xs">{subtitle}</p>}
          </div>
        </div>
        {trend && (
          <div className={`flex items-center text-sm ${
            trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-rose-400' : 'text-slate-400'
          }`}>
            {trend > 0 ? <TrendingUp className="h-4 w-4 mr-1" /> :
             trend < 0 ? <TrendingDown className="h-4 w-4 mr-1" /> : null}
            {trend !== 0 && `${Math.abs(trend)}%`}
          </div>
        )}
      </div>
    </div>
  );

  const getResultBadge = (result) => {
    const baseClasses = "px-2 py-1 rounded text-xs font-medium w-12 text-center";
    switch (result) {
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

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Calendar}
          title="Total Matches"
          value={totalMatches}
          subtitle={`${wins}W ${draws}D ${losses}L`}
        />

        <StatCard
          icon={Trophy}
          title="Win Rate"
          value={`${winPercentage}%`}
          subtitle={`${wins} victories`}
        />

        <StatCard
          icon={TrendingUp}
          title="Avg. Goals Scored"
          value={averageGoalsScored}
          subtitle={`${goalsScored} total goals`}
        />

        <StatCard
          icon={TrendingDown}
          title="Avg. Goals Conceded"
          value={averageGoalsConceded}
          subtitle={`${goalsConceded} total goals`}
        />
      </div>

      {/* Goals and Match Outcomes Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Goals Section */}
        <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
          <div className="flex items-center space-x-2 mb-4">
            <Target className="h-5 w-5 text-sky-400" />
            <h3 className="text-lg font-semibold text-sky-400">Goals</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Goals Scored</span>
              <span className="text-slate-100 font-semibold">{goalsScored}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Goals Conceded</span>
              <span className="text-slate-100 font-semibold">{goalsConceded}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-medium">Goal Difference</span>
              <span className={`font-bold ${
                goalDifference > 0 ? 'text-emerald-400' :
                goalDifference < 0 ? 'text-rose-400' : 'text-slate-400'
              }`}>
                {goalDifference > 0 ? '+' : ''}{goalDifference}
              </span>
            </div>
          </div>
        </div>

        {/* Match Outcomes Section */}
        <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
          <div className="flex items-center space-x-2 mb-4">
            <PieChart className="h-5 w-5 text-sky-400" />
            <h3 className="text-lg font-semibold text-sky-400">Match Outcomes</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Matches Won</span>
              <div className="text-right">
                <span className="text-slate-100 font-semibold">{wins}</span>
                <span className="text-slate-400 text-sm ml-2">({((wins / totalMatches) * 100).toFixed(1)}%)</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Matches Drawn</span>
              <div className="text-right">
                <span className="text-slate-100 font-semibold">{draws}</span>
                <span className="text-slate-400 text-sm ml-2">({((draws / totalMatches) * 100).toFixed(1)}%)</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Matches Lost</span>
              <div className="text-right">
                <span className="text-slate-100 font-semibold">{losses}</span>
                <span className="text-slate-400 text-sm ml-2">({((losses / totalMatches) * 100).toFixed(1)}%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Matches */}
      <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
        <div className="flex items-center space-x-2 mb-4">
          <Clock className="h-5 w-5 text-sky-400" />
          <h3 className="text-lg font-semibold text-sky-400">Recent Matches</h3>
        </div>
        <div className="space-y-3">
          {recentMatches.map((match) => (
            <div key={match.id} className="bg-slate-800 p-3 rounded-lg border border-slate-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-slate-400 text-sm font-mono">
                    {match.date}
                  </div>
                  <div className="text-slate-200 font-medium">
                    {match.opponent}
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-slate-100 font-mono font-semibold">
                    {match.score}
                  </div>
                  <span className={getResultBadge(match.result)}>
                    {match.result === 'W' ? 'Win' : match.result === 'D' ? 'Draw' : 'Loss'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
          <h4 className="text-slate-300 font-medium mb-2">Home Record</h4>
          <div className="text-slate-100">
            <span className="text-xl font-semibold">5</span>
            <span className="text-slate-400 text-sm ml-1">wins</span>
          </div>
          <div className="text-slate-400 text-sm">2 draws, 1 loss</div>
        </div>

        <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
          <h4 className="text-slate-300 font-medium mb-2">Away Record</h4>
          <div className="text-slate-100">
            <span className="text-xl font-semibold">3</span>
            <span className="text-slate-400 text-sm ml-1">wins</span>
          </div>
          <div className="text-slate-400 text-sm">2 draws, 2 losses</div>
        </div>

        <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
          <h4 className="text-slate-300 font-medium mb-2">Clean Sheets</h4>
          <div className="text-slate-100">
            <span className="text-xl font-semibold">4</span>
            <span className="text-slate-400 text-sm ml-1">matches</span>
          </div>
          <div className="text-slate-400 text-sm">26.7% of total</div>
        </div>
      </div>
    </div>
  );
}