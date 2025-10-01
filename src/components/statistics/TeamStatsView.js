import React, { useState, useEffect } from 'react';
import { Trophy, Calendar, TrendingUp, TrendingDown, Target, PieChart, Clock } from 'lucide-react';
import { useTeam } from '../../contexts/TeamContext';
import { getTeamStats } from '../../services/matchStateManager';

export function TeamStatsView({ startDate, endDate, onMatchSelect }) {
  const { currentTeam } = useTeam();
  const [teamStats, setTeamStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch team stats from database
  useEffect(() => {
    async function fetchTeamStats() {
      if (!currentTeam?.id) {
        setTeamStats(null);
        return;
      }

      setLoading(true);
      setError(null);

      const result = await getTeamStats(currentTeam.id, startDate, endDate);

      if (result.success) {
        setTeamStats(result.stats);
      } else {
        setError(result.error || 'Failed to load team statistics');
        setTeamStats(null);
      }

      setLoading(false);
    }

    fetchTeamStats();
  }, [currentTeam?.id, startDate, endDate]);

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-700 p-8 rounded-lg border border-slate-600 text-center">
          <div className="text-slate-400">Loading team statistics...</div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-700 p-8 rounded-lg border border-slate-600 text-center">
          <div className="text-red-400 mb-2">Error loading team statistics</div>
          <div className="text-slate-400 text-sm">{error}</div>
        </div>
      </div>
    );
  }

  // Show empty state if no stats
  if (!teamStats) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-700 p-8 rounded-lg border border-slate-600 text-center">
          <div className="text-slate-400">No team statistics available</div>
        </div>
      </div>
    );
  }

  const {
    totalMatches,
    wins,
    draws,
    losses,
    goalsScored,
    goalsConceded,
    averageGoalsScored,
    averageGoalsConceded,
    cleanSheets,
    cleanSheetPercentage,
    homeRecord,
    awayRecord,
    recentMatches
  } = teamStats;

  const formatPercentage = (count) => (
    totalMatches > 0 ? ((count / totalMatches) * 100).toFixed(1) : '0.0'
  );

  const winPercentage = formatPercentage(wins);
  const goalDifference = goalsScored - goalsConceded;

  const matchOutcomes = [
    { label: 'Matches Won', count: wins },
    { label: 'Matches Drawn', count: draws },
    { label: 'Matches Lost', count: losses }
  ];

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
            {matchOutcomes.map(({ label, count }) => (
              <div
                key={label}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-3"
              >
                <span className="text-slate-300">{label}</span>
                <span className="text-slate-100 font-semibold text-right tabular-nums min-w-[2.5rem]">
                  {count}
                </span>
                <span className="text-slate-400 text-sm text-right tabular-nums min-w-[3.5rem]">
                  ({formatPercentage(count)}%)
                </span>
              </div>
            ))}
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
            <div
              key={match.id}
              className={`bg-slate-800 p-3 rounded-lg border border-slate-600 ${
                onMatchSelect ? 'hover:bg-slate-750 transition-colors cursor-pointer' : ''
              }`}
              onClick={onMatchSelect ? () => onMatchSelect(match.id) : undefined}
            >
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
            <span className="text-xl font-semibold">{homeRecord.wins}</span>
            <span className="text-slate-400 text-sm ml-1">wins</span>
          </div>
          <div className="text-slate-400 text-sm">
            {homeRecord.draws} draws, {homeRecord.losses} {homeRecord.losses === 1 ? 'loss' : 'losses'}
            {homeRecord.total > 0 && ` (${homeRecord.total} total)`}
          </div>
        </div>

        <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
          <h4 className="text-slate-300 font-medium mb-2">Away Record</h4>
          <div className="text-slate-100">
            <span className="text-xl font-semibold">{awayRecord.wins}</span>
            <span className="text-slate-400 text-sm ml-1">wins</span>
          </div>
          <div className="text-slate-400 text-sm">
            {awayRecord.draws} draws, {awayRecord.losses} {awayRecord.losses === 1 ? 'loss' : 'losses'}
            {awayRecord.total > 0 && ` (${awayRecord.total} total)`}
          </div>
        </div>

        <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
          <h4 className="text-slate-300 font-medium mb-2">Clean Sheets</h4>
          <div className="text-slate-100">
            <span className="text-xl font-semibold">{cleanSheets}</span>
            <span className="text-slate-400 text-sm ml-1">matches</span>
          </div>
          <div className="text-slate-400 text-sm">{cleanSheetPercentage}% of total</div>
        </div>
      </div>
    </div>
  );
}
