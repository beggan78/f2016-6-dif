import React, { useState, useMemo } from 'react';
import { Calendar, TrendingUp, Target, Trophy, ChevronRight } from 'lucide-react';
import { Button } from '../shared/UI';

/**
 * StatisticsDashboard - Main statistics overview component
 * Shows team and player statistics over selectable time periods
 */
export function StatisticsDashboard({ onNavigateToMatches, onNavigateToPlayers, onNavigateToMatchDetail }) {
  const [selectedPeriod, setSelectedPeriod] = useState('season');

  // Mock data - in real implementation this would come from database
  const mockData = {
    season: {
      matches: {
        total: 24,
        won: 15,
        drawn: 4,
        lost: 5,
        goals: { scored: 48, conceded: 32 },
        averageGoals: { scored: 2.0, conceded: 1.3 }
      },
      recentMatches: [
        { id: 1, date: '2024-03-15', opponent: 'AIK U12', score: '3-2', result: 'win' },
        { id: 2, date: '2024-03-08', opponent: 'Hammarby U12', score: '1-1', result: 'draw' },
        { id: 3, date: '2024-03-01', opponent: 'IFK Göteborg U12', score: '2-1', result: 'win' },
        { id: 4, date: '2024-02-22', opponent: 'Malmö FF U12', score: '0-2', result: 'loss' },
        { id: 5, date: '2024-02-15', opponent: 'IFK Norrköping U12', score: '4-0', result: 'win' }
      ],
      topPlayers: [
        { id: 1, name: 'Erik Andersson', goals: 12, matches: 20, avgTime: 35 },
        { id: 2, name: 'Sofia Lindqvist', goals: 8, matches: 22, avgTime: 33 },
        { id: 3, name: 'Marcus Johnson', goals: 7, matches: 18, avgTime: 38 },
        { id: 4, name: 'Lisa Chen', goals: 6, matches: 24, avgTime: 31 },
        { id: 5, name: 'Oliver Nilsson', goals: 5, matches: 19, avgTime: 29 }
      ]
    }
  };

  const periodOptions = [
    { value: 'season', label: 'Full Season' },
    { value: 'last30', label: 'Last 30 Days' },
    { value: 'last90', label: 'Last 90 Days' },
    { value: 'custom', label: 'Custom Range' }
  ];

  const data = mockData[selectedPeriod] || mockData.season;

  const winRate = useMemo(() => {
    const total = data.matches.total;
    return total > 0 ? Math.round((data.matches.won / total) * 100) : 0;
  }, [data.matches]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getResultColor = (result) => {
    switch (result) {
      case 'win': return 'text-emerald-400';
      case 'draw': return 'text-yellow-400';
      case 'loss': return 'text-rose-400';
      default: return 'text-slate-400';
    }
  };

  const getResultIcon = (result) => {
    switch (result) {
      case 'win': return '✓';
      case 'draw': return '=';
      case 'loss': return '✗';
      default: return '-';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-sky-400">Team Statistics</h1>
          <p className="text-slate-400">Performance overview and detailed statistics</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400" />
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-slate-700 border border-slate-600 text-slate-200 px-3 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {periodOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Key Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Total Matches</p>
              <p className="text-2xl font-bold text-slate-100">{data.matches.total}</p>
            </div>
            <Trophy className="h-8 w-8 text-sky-400" />
          </div>
        </div>

        <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Win Rate</p>
              <p className="text-2xl font-bold text-emerald-400">{winRate}%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-emerald-400" />
          </div>
        </div>

        <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Goals For</p>
              <p className="text-2xl font-bold text-sky-400">{data.matches.goals.scored}</p>
            </div>
            <Target className="h-8 w-8 text-sky-400" />
          </div>
        </div>

        <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Goals Against</p>
              <p className="text-2xl font-bold text-rose-400">{data.matches.goals.conceded}</p>
            </div>
            <Target className="h-8 w-8 text-rose-400" />
          </div>
        </div>
      </div>

      {/* Match Record */}
      <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">Match Record</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-400">{data.matches.won}</p>
            <p className="text-slate-400 text-sm">Won</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-400">{data.matches.drawn}</p>
            <p className="text-slate-400 text-sm">Drawn</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-rose-400">{data.matches.lost}</p>
            <p className="text-slate-400 text-sm">Lost</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-300">{data.matches.goals.scored - data.matches.goals.conceded > 0 ? '+' : ''}{data.matches.goals.scored - data.matches.goals.conceded}</p>
            <p className="text-slate-400 text-sm">Goal Diff</p>
          </div>
        </div>
      </div>

      {/* Two-column layout for Recent Matches and Top Players */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Matches */}
        <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-100">Recent Matches</h2>
            <Button
              onClick={onNavigateToMatches}
              variant="secondary"
              size="sm"
              Icon={ChevronRight}
            >
              View All
            </Button>
          </div>
          <div className="space-y-3">
            {data.recentMatches.map(match => (
              <div
                key={match.id}
                className="flex items-center justify-between p-3 bg-slate-600 rounded-lg cursor-pointer hover:bg-slate-500 transition-colors"
                onClick={() => onNavigateToMatchDetail(match.id)}
              >
                <div className="flex-1">
                  <p className="text-slate-200 font-medium">{match.opponent}</p>
                  <p className="text-slate-400 text-sm">{formatDate(match.date)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-200 font-mono">{match.score}</span>
                  <span className={`w-6 text-center font-bold ${getResultColor(match.result)}`}>
                    {getResultIcon(match.result)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Players */}
        <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-100">Top Scorers</h2>
            <Button
              onClick={onNavigateToPlayers}
              variant="secondary"
              size="sm"
              Icon={ChevronRight}
            >
              View All
            </Button>
          </div>
          <div className="space-y-3">
            {data.topPlayers.map((player, index) => (
              <div key={player.id} className="flex items-center justify-between p-3 bg-slate-600 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-sky-600 rounded-full flex items-center justify-center text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-slate-200 font-medium">{player.name}</p>
                    <p className="text-slate-400 text-sm">{player.matches} matches</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sky-400 font-bold">{player.goals}</p>
                  <p className="text-slate-400 text-xs">goals</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}