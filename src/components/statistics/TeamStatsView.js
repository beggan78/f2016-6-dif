import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, Calendar, TrendingUp, TrendingDown, Target, PieChart, Clock } from 'lucide-react';
import { useTeam } from '../../contexts/TeamContext';
import { getConfirmedMatches } from '../../services/matchStateManager';
import { MatchFiltersPanel } from './MatchFiltersPanel';

export function TeamStatsView({ startDate, endDate, onMatchSelect }) {
  const { currentTeam } = useTeam();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filter state
  const [typeFilter, setTypeFilter] = useState([]);
  const [outcomeFilter, setOutcomeFilter] = useState([]);
  const [venueFilter, setVenueFilter] = useState([]);
  const [opponentFilter, setOpponentFilter] = useState([]);
  const [playerFilter, setPlayerFilter] = useState([]);
  const [formatFilter, setFormatFilter] = useState([]);

  // Fetch matches from database
  useEffect(() => {
    async function fetchMatches() {
      if (!currentTeam?.id) {
        setMatches([]);
        return;
      }

      setLoading(true);
      setError(null);

      const result = await getConfirmedMatches(currentTeam.id, startDate, endDate);

      if (result.success) {
        setMatches(result.matches || []);
      } else {
        setError(result.error || 'Failed to load match data');
        setMatches([]);
      }

      setLoading(false);
    }

    fetchMatches();
  }, [currentTeam?.id, startDate, endDate]);

  // Function to clear all filters
  const clearAllFilters = () => {
    setTypeFilter([]);
    setOutcomeFilter([]);
    setVenueFilter([]);
    setOpponentFilter([]);
    setPlayerFilter([]);
    setFormatFilter([]);
  };

  // Apply filters to matches
  const filteredMatches = useMemo(() => {
    return matches.filter(match => {
      if (typeFilter.length > 0 && (!match.type || !typeFilter.includes(match.type))) return false;
      if (outcomeFilter.length > 0 && (!match.outcome || !outcomeFilter.includes(match.outcome))) return false;
      if (venueFilter.length > 0 && (!match.venueType || !venueFilter.includes(match.venueType))) return false;
      if (opponentFilter.length > 0 && (!match.opponent || !opponentFilter.includes(match.opponent))) return false;
      if (playerFilter.length > 0) {
        const matchPlayers = match.players || [];
        const hasSelectedPlayer = playerFilter.some(player => matchPlayers.includes(player));
        if (!hasSelectedPlayer) return false;
      }
      if (formatFilter.length > 0 && (!match.format || !formatFilter.includes(match.format))) return false;
      return true;
    });
  }, [matches, typeFilter, outcomeFilter, venueFilter, opponentFilter, playerFilter, formatFilter]);

  // Calculate stats from filtered matches
  const teamStats = useMemo(() => {
    if (filteredMatches.length === 0) return null;

    const totalMatches = filteredMatches.length;
    const wins = filteredMatches.filter(m => m.outcome === 'W').length;
    const draws = filteredMatches.filter(m => m.outcome === 'D').length;
    const losses = filteredMatches.filter(m => m.outcome === 'L').length;

    const goalsScored = filteredMatches.reduce((sum, m) => sum + m.goalsScored, 0);
    const goalsConceded = filteredMatches.reduce((sum, m) => sum + m.goalsConceded, 0);

    const averageGoalsScored = (goalsScored / totalMatches).toFixed(1);
    const averageGoalsConceded = (goalsConceded / totalMatches).toFixed(1);

    const cleanSheets = filteredMatches.filter(m => m.goalsConceded === 0).length;
    const cleanSheetPercentage = totalMatches > 0
      ? ((cleanSheets / totalMatches) * 100).toFixed(1)
      : '0.0';

    // Home/Away/Neutral records
    const homeMatches = filteredMatches.filter(m => m.venueType === 'home');
    const awayMatches = filteredMatches.filter(m => m.venueType === 'away');

    const homeRecord = {
      total: homeMatches.length,
      wins: homeMatches.filter(m => m.outcome === 'W').length,
      draws: homeMatches.filter(m => m.outcome === 'D').length,
      losses: homeMatches.filter(m => m.outcome === 'L').length
    };

    const awayRecord = {
      total: awayMatches.length,
      wins: awayMatches.filter(m => m.outcome === 'W').length,
      draws: awayMatches.filter(m => m.outcome === 'D').length,
      losses: awayMatches.filter(m => m.outcome === 'L').length
    };

    // Recent matches (last 5)
    const recentMatches = filteredMatches.slice(0, 5).map(match => ({
      id: match.id,
      date: new Date(match.date).toISOString().split('T')[0],
      opponent: match.opponent,
      score: `${match.goalsScored}-${match.goalsConceded}`,
      result: match.outcome
    }));

    return {
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
    };
  }, [filteredMatches]);

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

  // Show empty state if no matches at all
  if (!loading && matches.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-700 p-8 rounded-lg border border-slate-600 text-center">
          <div className="text-slate-400">No team statistics available</div>
        </div>
      </div>
    );
  }

  // Show message if filters resulted in no matches
  if (!loading && !teamStats && matches.length > 0) {
    return (
      <div className="space-y-6">
        {/* Filters */}
        <MatchFiltersPanel
          matches={matches}
          typeFilter={typeFilter}
          outcomeFilter={outcomeFilter}
          venueFilter={venueFilter}
          opponentFilter={opponentFilter}
          playerFilter={playerFilter}
          formatFilter={formatFilter}
          onTypeFilterChange={setTypeFilter}
          onOutcomeFilterChange={setOutcomeFilter}
          onVenueFilterChange={setVenueFilter}
          onOpponentFilterChange={setOpponentFilter}
          onPlayerFilterChange={setPlayerFilter}
          onFormatFilterChange={setFormatFilter}
          onClearAllFilters={clearAllFilters}
        />
        <div className="bg-slate-700 p-8 rounded-lg border border-slate-600 text-center">
          <div className="text-slate-400">No matches found with the selected filters</div>
          <p className="text-slate-500 text-sm mt-2">Try adjusting your filter criteria</p>
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
            <p className="text-slate-100 text-xl font-semibold" aria-label={`${title} value`}>
              {value}
            </p>
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
      {/* Filters */}
      <MatchFiltersPanel
        matches={matches}
        typeFilter={typeFilter}
        outcomeFilter={outcomeFilter}
        venueFilter={venueFilter}
        opponentFilter={opponentFilter}
        playerFilter={playerFilter}
        formatFilter={formatFilter}
        onTypeFilterChange={setTypeFilter}
        onOutcomeFilterChange={setOutcomeFilter}
        onVenueFilterChange={setVenueFilter}
        onOpponentFilterChange={setOpponentFilter}
        onPlayerFilterChange={setPlayerFilter}
        onFormatFilterChange={setFormatFilter}
        onClearAllFilters={clearAllFilters}
      />

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
