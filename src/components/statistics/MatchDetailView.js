import React, { useState, useMemo } from 'react';
import { ArrowLeft, Edit2, Save, X, Calendar, Clock, MapPin, Trophy, Target, Users } from 'lucide-react';
import { Button, Input } from '../shared/UI';

/**
 * MatchDetailView - Displays detailed match information and player statistics
 * Allows admin users to edit match details and player stats
 */
export function MatchDetailView({ matchId, onNavigateBack, isAdmin = false }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);

  // Mock match data - in real implementation this would come from database based on matchId
  const mockMatch = {
    id: matchId,
    date: '2024-03-15',
    time: '14:00',
    opponent: 'AIK U12',
    venue: 'Djurgården Training Ground',
    homeScore: 3,
    awayScore: 2,
    isHome: true,
    result: 'win',
    duration: 45,
    type: 'league',
    formation: '2-2',
    periods: 2,
    periodDuration: 22.5,
    weather: 'Sunny, 18°C',
    referee: 'Anna Karlsson',
    goals: { scored: 3, conceded: 2 },
    playerStats: [
      {
        id: 1,
        name: 'Erik Andersson',
        goals: 2,
        timeOnField: 40.2,
        timeAsDefender: 20.1,
        timeAsMidfielder: 0,
        timeAsAttacker: 20.1,
        timeAsGoalkeeper: 0,
        startedAs: 'attacker',
        wasSubstitute: false,
        wasCaptain: true,
        fairPlayAward: false
      },
      {
        id: 2,
        name: 'Sofia Lindqvist',
        goals: 1,
        timeOnField: 42.5,
        timeAsDefender: 0,
        timeAsMidfielder: 22.5,
        timeAsAttacker: 20.0,
        timeAsGoalkeeper: 0,
        startedAs: 'midfielder',
        wasSubstitute: false,
        wasCaptain: false,
        fairPlayAward: true
      },
      {
        id: 3,
        name: 'Marcus Johnson',
        goals: 0,
        timeOnField: 45.0,
        timeAsDefender: 22.5,
        timeAsMidfielder: 22.5,
        timeAsAttacker: 0,
        timeAsGoalkeeper: 0,
        startedAs: 'defender',
        wasSubstitute: false,
        wasCaptain: false,
        fairPlayAward: false
      },
      {
        id: 4,
        name: 'Lisa Chen',
        goals: 0,
        timeOnField: 45.0,
        timeAsDefender: 0,
        timeAsMidfielder: 0,
        timeAsAttacker: 0,
        timeAsGoalkeeper: 45.0,
        startedAs: 'goalkeeper',
        wasSubstitute: false,
        wasCaptain: false,
        fairPlayAward: false
      },
      {
        id: 5,
        name: 'Oliver Nilsson',
        goals: 0,
        timeOnField: 22.5,
        timeAsDefender: 22.5,
        timeAsMidfielder: 0,
        timeAsAttacker: 0,
        timeAsGoalkeeper: 0,
        startedAs: 'defender',
        wasSubstitute: false,
        wasCaptain: false,
        fairPlayAward: false
      },
      {
        id: 6,
        name: 'Emma Karlsson',
        goals: 0,
        timeOnField: 22.5,
        timeAsDefender: 0,
        timeAsMidfielder: 0,
        timeAsAttacker: 22.5,
        timeAsGoalkeeper: 0,
        startedAs: 'attacker',
        wasSubstitute: false,
        wasCaptain: false,
        fairPlayAward: true
      },
      {
        id: 7,
        name: 'Liam Pettersson',
        goals: 0,
        timeOnField: 0,
        timeAsDefender: 0,
        timeAsMidfielder: 0,
        timeAsAttacker: 0,
        timeAsGoalkeeper: 0,
        startedAs: null,
        wasSubstitute: true,
        wasCaptain: false,
        fairPlayAward: false
      }
    ]
  };

  const [matchData] = useState(mockMatch);
  const [playerStats, setPlayerStats] = useState(mockMatch.playerStats);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (minutes) => {
    if (minutes === 0) return '--';
    const mins = Math.floor(minutes);
    const secs = Math.round((minutes - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getResultColor = (result) => {
    switch (result) {
      case 'win': return 'text-emerald-400 bg-emerald-900/20';
      case 'draw': return 'text-yellow-400 bg-yellow-900/20';
      case 'loss': return 'text-rose-400 bg-rose-900/20';
      default: return 'text-slate-400 bg-slate-900/20';
    }
  };

  const getResultText = (result) => {
    switch (result) {
      case 'win': return 'Victory';
      case 'draw': return 'Draw';
      case 'loss': return 'Defeat';
      default: return 'Unknown';
    }
  };

  const handleEditPlayer = (player) => {
    setEditingPlayer({ ...player });
  };

  const handleSavePlayer = () => {
    setPlayerStats(prev => prev.map(p => p.id === editingPlayer.id ? editingPlayer : p));
    setEditingPlayer(null);
  };

  const handleCancelEdit = () => {
    setEditingPlayer(null);
  };

  const updatePlayerField = (field, value) => {
    setEditingPlayer(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const matchSummary = useMemo(() => {
    const playersParticipated = playerStats.filter(p => p.timeOnField > 0 || p.wasSubstitute).length;
    const totalGoals = playerStats.reduce((sum, p) => sum + p.goals, 0);
    const captains = playerStats.filter(p => p.wasCaptain).length;
    const fairPlayAwards = playerStats.filter(p => p.fairPlayAward).length;
    const substitutes = playerStats.filter(p => p.wasSubstitute && p.timeOnField === 0).length;

    return {
      playersParticipated,
      totalGoals,
      captains,
      fairPlayAwards,
      substitutes
    };
  }, [playerStats]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            onClick={onNavigateBack}
            variant="secondary"
            size="sm"
            Icon={ArrowLeft}
          >
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-sky-400">Match Details</h1>
            <p className="text-slate-400">{formatDate(matchData.date)} vs {matchData.opponent}</p>
          </div>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setIsEditing(!isEditing)}
            variant={isEditing ? "danger" : "secondary"}
            Icon={isEditing ? X : Edit2}
          >
            {isEditing ? 'Cancel Edit' : 'Edit Match'}
          </Button>
        )}
      </div>

      {/* Match Summary Card */}
      <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Match Info */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-100">Match Information</h2>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${getResultColor(matchData.result)}`}>
                {getResultText(matchData.result)}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span className="text-slate-300">{formatDate(matchData.date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" />
                <span className="text-slate-300">{matchData.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span className="text-slate-300">{matchData.venue}</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-slate-400" />
                <span className="text-slate-300">{matchData.type.charAt(0).toUpperCase() + matchData.type.slice(1)}</span>
              </div>
            </div>
          </div>

          {/* Score Display */}
          <div className="text-center">
            <h3 className="text-lg font-medium text-slate-300 mb-4">Final Score</h3>
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <p className="text-lg font-medium text-slate-200">Djurgården U12</p>
                <p className="text-slate-400 text-sm">{matchData.isHome ? 'Home' : 'Away'}</p>
              </div>
              <div className="text-center px-6">
                <p className="text-4xl font-bold text-slate-100">
                  {matchData.isHome ? matchData.homeScore : matchData.awayScore} - {matchData.isHome ? matchData.awayScore : matchData.homeScore}
                </p>
                <p className="text-slate-400 text-sm">{matchData.duration} minutes</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-slate-200">{matchData.opponent}</p>
                <p className="text-slate-400 text-sm">{matchData.isHome ? 'Away' : 'Home'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Match Statistics Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-slate-700 rounded-lg p-3 border border-slate-600 text-center">
          <Users className="h-5 w-5 text-sky-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-slate-100">{matchSummary.playersParticipated}</p>
          <p className="text-slate-400 text-xs">Players Used</p>
        </div>
        <div className="bg-slate-700 rounded-lg p-3 border border-slate-600 text-center">
          <Target className="h-5 w-5 text-sky-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-sky-400">{matchSummary.totalGoals}</p>
          <p className="text-slate-400 text-xs">Goals Scored</p>
        </div>
        <div className="bg-slate-700 rounded-lg p-3 border border-slate-600 text-center">
          <p className="text-lg font-bold text-amber-400">{matchSummary.captains}</p>
          <p className="text-slate-400 text-xs">Captains</p>
        </div>
        <div className="bg-slate-700 rounded-lg p-3 border border-slate-600 text-center">
          <p className="text-lg font-bold text-cyan-400">{matchSummary.fairPlayAwards}</p>
          <p className="text-slate-400 text-xs">Fair Play</p>
        </div>
        <div className="bg-slate-700 rounded-lg p-3 border border-slate-600 text-center">
          <p className="text-lg font-bold text-orange-400">{matchSummary.substitutes}</p>
          <p className="text-slate-400 text-xs">Unused Subs</p>
        </div>
      </div>

      {/* Player Statistics Table */}
      <div className="bg-slate-700 rounded-lg border border-slate-600 overflow-hidden">
        <div className="p-4 border-b border-slate-600">
          <h2 className="text-lg font-semibold text-slate-100">Player Statistics</h2>
          <p className="text-slate-400 text-sm">Individual player performance for this match</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-600 border-b border-slate-500">
                <th className="px-3 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider sticky left-0 bg-slate-600 z-10">
                  Player
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Goals
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Time on Field
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Defender
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Midfielder
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Attacker
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Goalkeeper
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Started As
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Captain
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Fair Play
                </th>
                {isAdmin && isEditing && (
                  <th className="px-3 py-3 text-center text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-600">
              {playerStats.map((player, index) => (
                <tr
                  key={player.id}
                  className={`hover:bg-slate-600 transition-colors ${
                    index % 2 === 0 ? 'bg-slate-700' : 'bg-slate-750'
                  }`}
                >
                  <td className="px-3 py-2 text-sm font-medium text-slate-100 sticky left-0 bg-slate-700 z-10">
                    {editingPlayer?.id === player.id ? (
                      <Input
                        value={editingPlayer.name}
                        onChange={(e) => updatePlayerField('name', e.target.value)}
                        className="text-sm"
                      />
                    ) : (
                      player.name
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm text-center text-sky-400 font-medium">
                    {editingPlayer?.id === player.id ? (
                      <Input
                        type="number"
                        value={editingPlayer.goals}
                        onChange={(e) => updatePlayerField('goals', parseInt(e.target.value) || 0)}
                        className="text-sm text-center"
                      />
                    ) : (
                      player.goals
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm text-center text-slate-300 font-mono">
                    {formatTime(player.timeOnField)}
                  </td>
                  <td className="px-3 py-2 text-sm text-center text-emerald-400">
                    {formatTime(player.timeAsDefender)}
                  </td>
                  <td className="px-3 py-2 text-sm text-center text-yellow-400">
                    {formatTime(player.timeAsMidfielder)}
                  </td>
                  <td className="px-3 py-2 text-sm text-center text-rose-400">
                    {formatTime(player.timeAsAttacker)}
                  </td>
                  <td className="px-3 py-2 text-sm text-center text-purple-400">
                    {formatTime(player.timeAsGoalkeeper)}
                  </td>
                  <td className="px-3 py-2 text-sm text-center text-slate-300">
                    {player.startedAs ? player.startedAs.charAt(0).toUpperCase() + player.startedAs.slice(1) :
                     player.wasSubstitute ? 'Substitute' : '--'}
                  </td>
                  <td className="px-3 py-2 text-sm text-center">
                    {editingPlayer?.id === player.id ? (
                      <input
                        type="checkbox"
                        checked={editingPlayer.wasCaptain}
                        onChange={(e) => updatePlayerField('wasCaptain', e.target.checked)}
                        className="rounded"
                      />
                    ) : (
                      <span className={player.wasCaptain ? 'text-amber-400' : 'text-slate-400'}>
                        {player.wasCaptain ? '✓' : '--'}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm text-center">
                    {editingPlayer?.id === player.id ? (
                      <input
                        type="checkbox"
                        checked={editingPlayer.fairPlayAward}
                        onChange={(e) => updatePlayerField('fairPlayAward', e.target.checked)}
                        className="rounded"
                      />
                    ) : (
                      <span className={player.fairPlayAward ? 'text-cyan-400' : 'text-slate-400'}>
                        {player.fairPlayAward ? '✓' : '--'}
                      </span>
                    )}
                  </td>
                  {isAdmin && isEditing && (
                    <td className="px-3 py-2 text-sm text-center">
                      {editingPlayer?.id === player.id ? (
                        <div className="flex gap-1 justify-center">
                          <Button
                            onClick={handleSavePlayer}
                            variant="accent"
                            size="sm"
                            Icon={Save}
                          >
                            Save
                          </Button>
                          <Button
                            onClick={handleCancelEdit}
                            variant="secondary"
                            size="sm"
                            Icon={X}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => handleEditPlayer(player)}
                          variant="secondary"
                          size="sm"
                          Icon={Edit2}
                        >
                          Edit
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}