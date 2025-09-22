import React, { useState, useMemo } from 'react';
import { 
  User, 
  Target, 
  Clock, 
  Trophy, 
  Award, 
  Shield, 
  TrendingUp,
  Calendar,
  ArrowUpDown,
  ChevronRight
} from 'lucide-react';
import { Button, Input } from '../shared/UI';
import { formatTime } from '../../utils/formatUtils';
import { getAllPlayerStats, calculatePlayerStats, mockMatches } from '../../data/mockStatisticsData';

export function PlayerStatsScreen({ playerId, onNavigateBack, onNavigateToPlayer }) {
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [searchTerm, setSearchTerm] = useState('');

  // Get all player stats if showing all players, or specific player stats
  const allPlayerStats = useMemo(() => getAllPlayerStats(), []);
  const specificPlayerStats = useMemo(() => {
    if (playerId === 'all' || !playerId) return null;
    return calculatePlayerStats(playerId);
  }, [playerId]);

  // Filter and sort players for the all players view
  const filteredAndSortedPlayers = useMemo(() => {
    if (playerId !== 'all') return [];

    let filtered = allPlayerStats.filter(player =>
      `${player.name} ${player.surname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.jersey_number.toString().includes(searchTerm)
    );

    return filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = `${a.name} ${a.surname}`.toLowerCase();
          bValue = `${b.name} ${b.surname}`.toLowerCase();
          break;
        case 'goals':
          aValue = a.goalsScored;
          bValue = b.goalsScored;
          break;
        case 'matches':
          aValue = a.matchesPlayed;
          bValue = b.matchesPlayed;
          break;
        case 'time':
          aValue = a.averageTimePerMatch;
          bValue = b.averageTimePerMatch;
          break;
        case 'captain':
          aValue = a.captainCount;
          bValue = b.captainCount;
          break;
        case 'fairplay':
          aValue = a.fairPlayAwards;
          bValue = b.fairPlayAwards;
          break;
        default:
          aValue = a.jersey_number;
          bValue = b.jersey_number;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [allPlayerStats, searchTerm, sortBy, sortOrder, playerId]);

  // Get matches for specific player
  const playerMatches = useMemo(() => {
    if (playerId === 'all' || !playerId) return [];
    return mockMatches.filter(match => match.player_stats[playerId]);
  }, [playerId]);

  // Handle sort
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Format percentage
  const formatPercentage = (value) => {
    return `${Math.round(value)}%`;
  };

  // Get position color
  const getPositionColor = (percentage) => {
    if (percentage > 50) return 'text-emerald-400';
    if (percentage > 25) return 'text-amber-400';
    if (percentage > 0) return 'text-sky-400';
    return 'text-slate-500';
  };

  // Render all players view
  if (playerId === 'all') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-sky-400">Player Statistics</h1>
            <p className="text-slate-400">View detailed statistics for all players</p>
          </div>
          <Button onClick={onNavigateBack} variant="secondary">
            Back
          </Button>
        </div>

        {/* Search and Controls */}
        <div className="flex flex-col sm:flex-row gap-4 bg-slate-700 p-4 rounded-lg">
          <div className="flex-1">
            <Input
              placeholder="Search players by name or jersey number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'name', label: 'Name' },
              { key: 'goals', label: 'Goals' },
              { key: 'matches', label: 'Matches' },
              { key: 'time', label: 'Time' },
              { key: 'captain', label: 'Captain' },
              { key: 'fairplay', label: 'Fair Play' }
            ].map(({ key, label }) => (
              <Button
                key={key}
                onClick={() => handleSort(key)}
                variant={sortBy === key ? 'primary' : 'secondary'}
                size="sm"
                className="whitespace-nowrap"
              >
                {label}
                {sortBy === key && (
                  <ArrowUpDown className="w-3 h-3 ml-1" />
                )}
              </Button>
            ))}
          </div>
        </div>

        {/* Players Table */}
        <div className="bg-slate-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-600">
                <tr>
                  <th className="text-left py-3 px-4 text-slate-300">Player</th>
                  <th className="text-center py-3 px-2 text-slate-300">Matches</th>
                  <th className="text-center py-3 px-2 text-slate-300">Goals</th>
                  <th className="text-center py-3 px-2 text-slate-300">Avg Time</th>
                  <th className="text-center py-3 px-2 text-slate-300">Defender</th>
                  <th className="text-center py-3 px-2 text-slate-300">Midfielder</th>
                  <th className="text-center py-3 px-2 text-slate-300">Attacker</th>
                  <th className="text-center py-3 px-2 text-slate-300">Goalkeeper</th>
                  <th className="text-center py-3 px-2 text-slate-300">Sub %</th>
                  <th className="text-center py-3 px-2 text-slate-300">Captain</th>
                  <th className="text-center py-3 px-2 text-slate-300">Fair Play</th>
                  <th className="text-center py-3 px-2 text-slate-300"></th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedPlayers.map((player) => (
                  <tr 
                    key={player.id} 
                    className="border-b border-slate-600/50 hover:bg-slate-600/50 cursor-pointer"
                    onClick={() => onNavigateToPlayer && onNavigateToPlayer(player.id)}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-sky-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                          {player.jersey_number}
                        </div>
                        <div>
                          <div className="font-medium text-slate-200">{player.name} {player.surname}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-center py-3 px-2 text-slate-300">{player.matchesPlayed}</td>
                    <td className="text-center py-3 px-2">
                      <span className="text-amber-400 font-medium">{player.goalsScored}</span>
                    </td>
                    <td className="text-center py-3 px-2 text-slate-300">
                      {formatTime(Math.round(player.averageTimePerMatch))}
                    </td>
                    <td className={`text-center py-3 px-2 ${getPositionColor(player.percentageDefender)}`}>
                      {formatPercentage(player.percentageDefender)}
                    </td>
                    <td className={`text-center py-3 px-2 ${getPositionColor(player.percentageMidfielder)}`}>
                      {formatPercentage(player.percentageMidfielder)}
                    </td>
                    <td className={`text-center py-3 px-2 ${getPositionColor(player.percentageAttacker)}`}>
                      {formatPercentage(player.percentageAttacker)}
                    </td>
                    <td className={`text-center py-3 px-2 ${getPositionColor(player.percentageGoalkeeper)}`}>
                      {formatPercentage(player.percentageGoalkeeper)}
                    </td>
                    <td className="text-center py-3 px-2 text-slate-300">
                      {formatPercentage(player.percentageStartsAsSubstitute)}
                    </td>
                    <td className="text-center py-3 px-2">
                      {player.captainCount > 0 ? (
                        <span className="text-amber-400 font-medium">{player.captainCount}</span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="text-center py-3 px-2">
                      {player.fairPlayAwards > 0 ? (
                        <span className="text-emerald-400 font-medium">{player.fairPlayAwards}</span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="text-center py-3 px-2">
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredAndSortedPlayers.length === 0 && (
          <div className="text-center text-slate-400 py-8">
            No players found matching your search criteria.
          </div>
        )}
      </div>
    );
  }

  // Render individual player view
  if (!specificPlayerStats) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-sky-400">Player Statistics</h1>
          <Button onClick={onNavigateBack} variant="secondary">
            Back
          </Button>
        </div>
        <div className="text-center text-slate-400 py-8">
          Player not found
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-sky-400">
            {specificPlayerStats.name} {specificPlayerStats.surname}
          </h1>
          <p className="text-slate-400">#{specificPlayerStats.jersey_number} • Player Statistics</p>
        </div>
        <Button onClick={onNavigateBack} variant="secondary">
          Back
        </Button>
      </div>

      {/* Player Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-700 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-sky-600 rounded-lg">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Matches Played</p>
              <p className="text-2xl font-bold text-sky-400">{specificPlayerStats.matchesPlayed}</p>
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
              <p className="text-2xl font-bold text-amber-400">{specificPlayerStats.goalsScored}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-700 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-600 rounded-lg">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Avg Time/Match</p>
              <p className="text-2xl font-bold text-emerald-400">
                {formatTime(Math.round(specificPlayerStats.averageTimePerMatch))}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-700 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-rose-600 rounded-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Sub Start %</p>
              <p className="text-2xl font-bold text-rose-400">
                {formatPercentage(specificPlayerStats.percentageStartsAsSubstitute)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Position Distribution */}
      <div className="bg-slate-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-sky-400 mb-4">Position Distribution</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-900/20 rounded-lg border border-blue-600/30">
            <Shield className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <div className="text-lg font-bold text-blue-400">
              {formatPercentage(specificPlayerStats.percentageDefender)}
            </div>
            <div className="text-sm text-blue-300">Defender</div>
          </div>
          <div className="text-center p-4 bg-emerald-900/20 rounded-lg border border-emerald-600/30">
            <User className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
            <div className="text-lg font-bold text-emerald-400">
              {formatPercentage(specificPlayerStats.percentageMidfielder)}
            </div>
            <div className="text-sm text-emerald-300">Midfielder</div>
          </div>
          <div className="text-center p-4 bg-rose-900/20 rounded-lg border border-rose-600/30">
            <Target className="w-6 h-6 text-rose-400 mx-auto mb-2" />
            <div className="text-lg font-bold text-rose-400">
              {formatPercentage(specificPlayerStats.percentageAttacker)}
            </div>
            <div className="text-sm text-rose-300">Attacker</div>
          </div>
          <div className="text-center p-4 bg-amber-900/20 rounded-lg border border-amber-600/30">
            <Trophy className="w-6 h-6 text-amber-400 mx-auto mb-2" />
            <div className="text-lg font-bold text-amber-400">
              {formatPercentage(specificPlayerStats.percentageGoalkeeper)}
            </div>
            <div className="text-sm text-amber-300">Goalkeeper</div>
          </div>
        </div>
      </div>

      {/* Awards and Recognition */}
      <div className="bg-slate-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-sky-400 mb-4">Awards & Recognition</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-4 p-4 bg-slate-600 rounded-lg">
            <div className="p-3 bg-amber-600 rounded-lg">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-lg font-bold text-amber-400">{specificPlayerStats.captainCount}</div>
              <div className="text-sm text-slate-400">Times as Captain</div>
            </div>
          </div>
          <div className="flex items-center space-x-4 p-4 bg-slate-600 rounded-lg">
            <div className="p-3 bg-emerald-600 rounded-lg">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-lg font-bold text-emerald-400">{specificPlayerStats.fairPlayAwards}</div>
              <div className="text-sm text-slate-400">Fair Play Awards</div>
            </div>
          </div>
        </div>
      </div>

      {/* Match History */}
      <div className="bg-slate-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-sky-400 mb-4">Recent Matches</h2>
        <div className="space-y-3">
          {playerMatches.slice(0, 5).map((match) => {
            const playerStats = match.player_stats[playerId];
            const totalTime = playerStats.total_field_time_seconds + playerStats.goalie_time_seconds;
            
            return (
              <div key={match.id} className="flex items-center justify-between p-4 bg-slate-600 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-sky-400">
                      {match.own_score}-{match.opponent_score}
                    </div>
                    <div className="text-xs text-slate-400">{new Date(match.date).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div className="font-medium text-slate-200">vs {match.opponent}</div>
                    <div className="text-sm text-slate-400 capitalize">
                      Started as {playerStats.started_as}
                    </div>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="flex items-center space-x-4">
                    {playerStats.goals_scored > 0 && (
                      <div className="flex items-center space-x-1">
                        <Target className="w-4 h-4 text-amber-400" />
                        <span className="text-amber-400 font-medium">{playerStats.goals_scored}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-300">{formatTime(totalTime)}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {playerStats.was_captain && (
                      <Award className="w-4 h-4 text-amber-400" title="Captain" />
                    )}
                    {playerStats.got_fair_play_award && (
                      <Trophy className="w-4 h-4 text-emerald-400" title="Fair Play Award" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {playerMatches.length === 0 && (
          <div className="text-center text-slate-400 py-4">
            No match history available
          </div>
        )}
      </div>
    </div>
  );
}