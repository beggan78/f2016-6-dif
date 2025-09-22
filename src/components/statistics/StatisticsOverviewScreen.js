import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Trophy, 
  Target, 
  Users, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown,
  Minus,
  Clock,
  Award,
  Shield
} from 'lucide-react';
import { Button } from '../shared/UI';
import { formatTime } from '../../utils/formatUtils';
import { 
  mockMatches, 
  calculateTeamStats, 
  getAllPlayerStats
} from '../../data/mockStatisticsData';

export function StatisticsOverviewScreen({ onNavigateToMatch, onNavigateToPlayer, onNavigateBack }) {
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  
  // Calculate team statistics
  const teamStats = useMemo(() => calculateTeamStats(), []);
  
  // Calculate player statistics
  const playerStats = useMemo(() => getAllPlayerStats(), []);
  
  // Filter matches based on selected period
  const filteredMatches = useMemo(() => {
    if (selectedPeriod === 'all') return mockMatches;
    
    const now = new Date();
    const filterDate = new Date();
    
    switch (selectedPeriod) {
      case 'last7':
        filterDate.setDate(now.getDate() - 7);
        break;
      case 'last30':
        filterDate.setDate(now.getDate() - 30);
        break;
      case 'last90':
        filterDate.setDate(now.getDate() - 90);
        break;
      default:
        return mockMatches;
    }
    
    return mockMatches.filter(match => new Date(match.date) >= filterDate);
  }, [selectedPeriod]);

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Get outcome icon and color
  const getOutcomeDisplay = (outcome) => {
    switch (outcome) {
      case 'win':
        return { icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-900/30' };
      case 'loss':
        return { icon: TrendingDown, color: 'text-rose-400', bg: 'bg-rose-900/30' };
      case 'draw':
        return { icon: Minus, color: 'text-amber-400', bg: 'bg-amber-900/30' };
      default:
        return { icon: Minus, color: 'text-slate-400', bg: 'bg-slate-700' };
    }
  };

  // Top performers
  const topScorers = useMemo(() => {
    return playerStats
      .filter(player => player.goalsScored > 0)
      .sort((a, b) => b.goalsScored - a.goalsScored)
      .slice(0, 5);
  }, [playerStats]);

  const mostPlayTime = useMemo(() => {
    return playerStats
      .filter(player => player.averageTimePerMatch > 0)
      .sort((a, b) => b.averageTimePerMatch - a.averageTimePerMatch)
      .slice(0, 5);
  }, [playerStats]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-sky-400">Team Statistics</h1>
          <p className="text-slate-400">View team and player performance data</p>
        </div>
        <Button onClick={onNavigateBack} variant="secondary">
          Back
        </Button>
      </div>

      {/* Period Filter */}
      <div className="flex flex-wrap gap-2 p-4 bg-slate-700 rounded-lg">
        <span className="text-sm font-medium text-slate-300 mr-2">Period:</span>
        {[
          { value: 'all', label: 'All Time' },
          { value: 'last7', label: 'Last 7 Days' },
          { value: 'last30', label: 'Last 30 Days' },
          { value: 'last90', label: 'Last 90 Days' }
        ].map(period => (
          <Button
            key={period.value}
            onClick={() => setSelectedPeriod(period.value)}
            variant={selectedPeriod === period.value ? 'primary' : 'secondary'}
            size="sm"
          >
            {period.label}
          </Button>
        ))}
      </div>

      {/* Team Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-700 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-sky-600 rounded-lg">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Matches</p>
              <p className="text-2xl font-bold text-sky-400">{teamStats.totalMatches}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-700 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-600 rounded-lg">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Win Rate</p>
              <p className="text-2xl font-bold text-emerald-400">
                {teamStats.winPercentage.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-700 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-600 rounded-lg">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Goals Scored</p>
              <p className="text-2xl font-bold text-amber-400">{teamStats.totalGoalsScored}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-700 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-slate-600 rounded-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Goals Conceded</p>
              <p className="text-2xl font-bold text-slate-300">{teamStats.totalGoalsConceded}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Match Results Summary */}
      <div className="bg-slate-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-sky-400 mb-4">Match Results</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-emerald-900/20 rounded-lg border border-emerald-600/30">
            <div className="text-2xl font-bold text-emerald-400">{teamStats.wins}</div>
            <div className="text-sm text-emerald-300">Wins</div>
          </div>
          <div className="text-center p-4 bg-amber-900/20 rounded-lg border border-amber-600/30">
            <div className="text-2xl font-bold text-amber-400">{teamStats.draws}</div>
            <div className="text-sm text-amber-300">Draws</div>
          </div>
          <div className="text-center p-4 bg-rose-900/20 rounded-lg border border-rose-600/30">
            <div className="text-2xl font-bold text-rose-400">{teamStats.losses}</div>
            <div className="text-sm text-rose-300">Losses</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="text-center p-3 bg-slate-600 rounded-lg">
            <div className="text-lg font-semibold text-slate-200">
              {teamStats.averageGoalsScored.toFixed(1)}
            </div>
            <div className="text-sm text-slate-400">Avg Goals Scored</div>
          </div>
          <div className="text-center p-3 bg-slate-600 rounded-lg">
            <div className="text-lg font-semibold text-slate-200">
              {teamStats.averageGoalsConceded.toFixed(1)}
            </div>
            <div className="text-sm text-slate-400">Avg Goals Conceded</div>
          </div>
        </div>
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Scorers */}
        <div className="bg-slate-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-sky-400 mb-4 flex items-center">
            <Target className="w-5 h-5 mr-2" />
            Top Scorers
          </h2>
          <div className="space-y-3">
            {topScorers.length > 0 ? topScorers.map((player, index) => (
              <div 
                key={player.id} 
                className="flex items-center justify-between p-3 bg-slate-600 rounded-lg hover:bg-slate-500 transition-colors cursor-pointer"
                onClick={() => onNavigateToPlayer && onNavigateToPlayer(player.id)}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-slate-200">{player.name} {player.surname}</div>
                    <div className="text-sm text-slate-400">#{player.jersey_number}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-amber-400">{player.goalsScored}</div>
                  <div className="text-sm text-slate-400">goals</div>
                </div>
              </div>
            )) : (
              <div className="text-center text-slate-400 py-4">No goals scored yet</div>
            )}
          </div>
        </div>

        {/* Most Playing Time */}
        <div className="bg-slate-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-sky-400 mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Most Playing Time
          </h2>
          <div className="space-y-3">
            {mostPlayTime.slice(0, 5).map((player, index) => (
              <div 
                key={player.id} 
                className="flex items-center justify-between p-3 bg-slate-600 rounded-lg hover:bg-slate-500 transition-colors cursor-pointer"
                onClick={() => onNavigateToPlayer && onNavigateToPlayer(player.id)}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-sky-600 rounded-full flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-slate-200">{player.name} {player.surname}</div>
                    <div className="text-sm text-slate-400">#{player.jersey_number}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-sky-400">
                    {formatTime(Math.round(player.averageTimePerMatch))}
                  </div>
                  <div className="text-sm text-slate-400">avg/match</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Matches */}
      <div className="bg-slate-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-sky-400">Recent Matches</h2>
          <Button variant="secondary" size="sm">
            View All Matches
          </Button>
        </div>
        <div className="space-y-3">
          {filteredMatches.slice(0, 5).map((match) => {
            const outcome = getOutcomeDisplay(match.outcome);
            const OutcomeIcon = outcome.icon;
            
            return (
              <div 
                key={match.id} 
                className="flex items-center justify-between p-4 bg-slate-600 rounded-lg hover:bg-slate-500 transition-colors cursor-pointer"
                onClick={() => onNavigateToMatch && onNavigateToMatch(match.id)}
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg ${outcome.bg}`}>
                    <OutcomeIcon className={`w-5 h-5 ${outcome.color}`} />
                  </div>
                  <div>
                    <div className="font-medium text-slate-200">vs {match.opponent}</div>
                    <div className="text-sm text-slate-400">{formatDate(match.date)}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-lg font-bold text-slate-200">
                      {match.own_score} - {match.opponent_score}
                    </div>
                    <div className="text-sm text-slate-400 capitalize">{match.type}</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-slate-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-sky-400 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button 
            variant="primary" 
            className="w-full"
            onClick={() => onNavigateToPlayer && onNavigateToPlayer('all')}
          >
            <Users className="w-4 h-4 mr-2" />
            View All Players
          </Button>
          <Button 
            variant="secondary" 
            className="w-full"
            onClick={() => onNavigateToMatch && onNavigateToMatch('all')}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Match History
          </Button>
          <Button 
            variant="accent" 
            className="w-full"
            disabled
          >
            <Award className="w-4 h-4 mr-2" />
            Season Awards
          </Button>
        </div>
      </div>
    </div>
  );
}