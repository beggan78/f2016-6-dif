import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit, Save, X, Trophy, Clock, Users, Calendar, Award } from 'lucide-react';
import { Button } from '../shared/UI';
import { useAuth } from '../../contexts/AuthContext';
import { useTeam } from '../../contexts/TeamContext';

// Mock match data - replace with actual database queries
const mockMatchDetails = {
  1: {
    id: 1,
    date: '2024-01-15',
    opponent: 'Hammarby',
    homeScore: 3,
    awayScore: 1,
    result: 'W',
    type: 'League',
    format: '5v5',
    duration: 45,
    captain: 'Sofia Karlsson',
    fairPlayWinner: 'Emma Andersson',
    playerStats: [
      {
        playerId: 1,
        name: 'Emma Andersson',
        goalsScored: 1,
        timeOnField: 42,
        timeAsDefender: 15,
        timeAsMidfielder: 12,
        timeAsAttacker: 15,
        timeAsGoalie: 0,
        startedAs: 'Defender',
        wasCaptain: false,
        gotFairPlayAward: true
      },
      {
        playerId: 2,
        name: 'Lucas Eriksson',
        goalsScored: 2,
        timeOnField: 38,
        timeAsDefender: 0,
        timeAsMidfielder: 18,
        timeAsAttacker: 20,
        timeAsGoalie: 0,
        startedAs: 'Attacker',
        wasCaptain: false,
        gotFairPlayAward: false
      },
      {
        playerId: 3,
        name: 'Sofia Karlsson',
        goalsScored: 0,
        timeOnField: 45,
        timeAsDefender: 0,
        timeAsMidfielder: 15,
        timeAsAttacker: 15,
        timeAsGoalie: 15,
        startedAs: 'Midfielder',
        wasCaptain: true,
        gotFairPlayAward: false
      },
      {
        playerId: 4,
        name: 'Oliver Johansson',
        goalsScored: 0,
        timeOnField: 35,
        timeAsDefender: 25,
        timeAsMidfielder: 10,
        timeAsAttacker: 0,
        timeAsGoalie: 0,
        startedAs: 'Defender',
        wasCaptain: false,
        gotFairPlayAward: false
      },
      {
        playerId: 5,
        name: 'Maja Lindqvist',
        goalsScored: 0,
        timeOnField: 40,
        timeAsDefender: 0,
        timeAsMidfielder: 0,
        timeAsAttacker: 0,
        timeAsGoalie: 40,
        startedAs: 'Goalie',
        wasCaptain: false,
        gotFairPlayAward: false
      }
    ]
  }
};

export function MatchDetails({ matchId, onBack }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedMatch, setEditedMatch] = useState(null);
  const [editedPlayerStats, setEditedPlayerStats] = useState([]);
  const { user } = useAuth();
  const { canManageTeam } = useTeam();

  const match = mockMatchDetails[matchId];

  useEffect(() => {
    if (match) {
      setEditedMatch({
        date: match.date,
        opponent: match.opponent,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        type: match.type,
        captain: match.captain,
        fairPlayWinner: match.fairPlayWinner
      });
      setEditedPlayerStats([...match.playerStats]);
    }
  }, [match]);

  if (!match) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-400">Match not found.</p>
        <Button onClick={onBack} className="mt-4">Back to Match List</Button>
      </div>
    );
  }

  const handleSave = () => {
    // TODO: Save changes to database
    console.log('Saving match changes:', editedMatch, editedPlayerStats);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedMatch({
      date: match.date,
      opponent: match.opponent,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      type: match.type,
      captain: match.captain,
      fairPlayWinner: match.fairPlayWinner
    });
    setEditedPlayerStats([...match.playerStats]);
    setIsEditing(false);
  };

  const updatePlayerStat = (playerId, field, value) => {
    setEditedPlayerStats(prev =>
      prev.map(player =>
        player.playerId === playerId
          ? { ...player, [field]: value }
          : player
      )
    );
  };

  const getResultColor = (result) => {
    switch (result) {
      case 'W': return 'text-emerald-400 bg-emerald-900/20 border-emerald-500/30';
      case 'D': return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30';
      case 'L': return 'text-red-400 bg-red-900/20 border-red-500/30';
      default: return 'text-slate-400 bg-slate-700 border-slate-600';
    }
  };

  const canEdit = user && canManageTeam;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            onClick={onBack}
            variant="secondary"
            size="sm"
            Icon={ArrowLeft}
          >
            Back to Matches
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-sky-300">Match Details</h2>
            <p className="text-slate-400">
              {new Date(match.date).toLocaleDateString()} vs {match.opponent}
            </p>
          </div>
        </div>

        {canEdit && (
          <div className="flex space-x-2">
            {isEditing ? (
              <>
                <Button
                  onClick={handleSave}
                  variant="primary"
                  size="sm"
                  Icon={Save}
                >
                  Save
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="secondary"
                  size="sm"
                  Icon={X}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setIsEditing(true)}
                variant="secondary"
                size="sm"
                Icon={Edit}
              >
                Edit Match
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Match Overview */}
      <div className="bg-slate-700 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Score and Result */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-sky-300">Match Result</h3>
            <div className="flex items-center space-x-4">
              <div className={`px-3 py-1 rounded-full text-sm font-bold border ${getResultColor(match.result)}`}>
                {match.result}
              </div>
              <div className="text-center">
                {isEditing ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={editedMatch.homeScore}
                      onChange={(e) => setEditedMatch(prev => ({ ...prev, homeScore: parseInt(e.target.value) || 0 }))}
                      className="w-16 bg-slate-600 border border-slate-500 rounded px-2 py-1 text-center text-xl font-bold"
                      min="0"
                    />
                    <span className="text-xl font-bold">-</span>
                    <input
                      type="number"
                      value={editedMatch.awayScore}
                      onChange={(e) => setEditedMatch(prev => ({ ...prev, awayScore: parseInt(e.target.value) || 0 }))}
                      className="w-16 bg-slate-600 border border-slate-500 rounded px-2 py-1 text-center text-xl font-bold"
                      min="0"
                    />
                  </div>
                ) : (
                  <div className="text-3xl font-bold text-slate-200">
                    {match.homeScore} - {match.awayScore}
                  </div>
                )}
                <div className="text-sm text-slate-400">
                  Djurgården vs {isEditing ? (
                    <input
                      type="text"
                      value={editedMatch.opponent}
                      onChange={(e) => setEditedMatch(prev => ({ ...prev, opponent: e.target.value }))}
                      className="bg-slate-600 border border-slate-500 rounded px-2 py-1 text-sm"
                    />
                  ) : match.opponent}
                </div>
              </div>
            </div>
          </div>

          {/* Match Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-sky-300">Match Information</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span className="text-slate-300">
                  {isEditing ? (
                    <input
                      type="date"
                      value={editedMatch.date}
                      onChange={(e) => setEditedMatch(prev => ({ ...prev, date: e.target.value }))}
                      className="bg-slate-600 border border-slate-500 rounded px-2 py-1 text-sm"
                    />
                  ) : new Date(match.date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Trophy className="h-4 w-4 text-slate-400" />
                <span className="text-slate-300">
                  Type: {isEditing ? (
                    <select
                      value={editedMatch.type}
                      onChange={(e) => setEditedMatch(prev => ({ ...prev, type: e.target.value }))}
                      className="bg-slate-600 border border-slate-500 rounded px-2 py-1 text-sm ml-1"
                    >
                      <option value="League">League</option>
                      <option value="Cup">Cup</option>
                      <option value="Friendly">Friendly</option>
                      <option value="Tournament">Tournament</option>
                    </select>
                  ) : match.type}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-slate-400" />
                <span className="text-slate-300">Duration: {match.duration} minutes</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-slate-400" />
                <span className="text-slate-300">Format: {match.format}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Special Awards */}
        <div className="mt-6 pt-6 border-t border-slate-600">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-amber-400" />
              <span className="text-slate-300">
                Captain: {isEditing ? (
                  <select
                    value={editedMatch.captain}
                    onChange={(e) => setEditedMatch(prev => ({ ...prev, captain: e.target.value }))}
                    className="bg-slate-600 border border-slate-500 rounded px-2 py-1 text-sm ml-1"
                  >
                    {match.playerStats.map(player => (
                      <option key={player.playerId} value={player.name}>{player.name}</option>
                    ))}
                  </select>
                ) : match.captain}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Award className="h-5 w-5 text-emerald-400" />
              <span className="text-slate-300">
                Fair Play: {isEditing ? (
                  <select
                    value={editedMatch.fairPlayWinner || ''}
                    onChange={(e) => setEditedMatch(prev => ({ ...prev, fairPlayWinner: e.target.value || null }))}
                    className="bg-slate-600 border border-slate-500 rounded px-2 py-1 text-sm ml-1"
                  >
                    <option value="">Not awarded</option>
                    {match.playerStats.map(player => (
                      <option key={player.playerId} value={player.name}>{player.name}</option>
                    ))}
                  </select>
                ) : (match.fairPlayWinner || 'Not awarded')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Player Statistics */}
      <div className="bg-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-sky-300 mb-4">Player Statistics</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-sky-200 uppercase tracking-wider">Player</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-sky-200 uppercase tracking-wider">Started As</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-sky-200 uppercase tracking-wider">Goals</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-sky-200 uppercase tracking-wider">Time on Field</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-sky-200 uppercase tracking-wider">Defender</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-sky-200 uppercase tracking-wider">Midfielder</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-sky-200 uppercase tracking-wider">Attacker</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-sky-200 uppercase tracking-wider">Goalie</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-sky-200 uppercase tracking-wider">Captain</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-sky-200 uppercase tracking-wider">Fair Play</th>
              </tr>
            </thead>
            <tbody className="bg-slate-700 divide-y divide-slate-600">
              {(isEditing ? editedPlayerStats : match.playerStats).map((player) => (
                <tr key={player.playerId} className="hover:bg-slate-600">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-100">
                    {player.name}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">
                    {isEditing ? (
                      <select
                        value={player.startedAs}
                        onChange={(e) => updatePlayerStat(player.playerId, 'startedAs', e.target.value)}
                        className="bg-slate-600 border border-slate-500 rounded px-2 py-1 text-xs"
                      >
                        <option value="Goalie">Goalie</option>
                        <option value="Defender">Defender</option>
                        <option value="Midfielder">Midfielder</option>
                        <option value="Attacker">Attacker</option>
                        <option value="Substitute">Substitute</option>
                      </select>
                    ) : player.startedAs}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">
                    {isEditing ? (
                      <input
                        type="number"
                        value={player.goalsScored}
                        onChange={(e) => updatePlayerStat(player.playerId, 'goalsScored', parseInt(e.target.value) || 0)}
                        className="w-16 bg-slate-600 border border-slate-500 rounded px-2 py-1 text-xs"
                        min="0"
                      />
                    ) : player.goalsScored}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300 font-mono">
                    {isEditing ? (
                      <input
                        type="number"
                        value={player.timeOnField}
                        onChange={(e) => updatePlayerStat(player.playerId, 'timeOnField', parseInt(e.target.value) || 0)}
                        className="w-16 bg-slate-600 border border-slate-500 rounded px-2 py-1 text-xs"
                        min="0"
                      />
                    ) : `${player.timeOnField}m`}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300 font-mono">
                    {isEditing ? (
                      <input
                        type="number"
                        value={player.timeAsDefender}
                        onChange={(e) => updatePlayerStat(player.playerId, 'timeAsDefender', parseInt(e.target.value) || 0)}
                        className="w-16 bg-slate-600 border border-slate-500 rounded px-2 py-1 text-xs"
                        min="0"
                      />
                    ) : `${player.timeAsDefender}m`}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300 font-mono">
                    {isEditing ? (
                      <input
                        type="number"
                        value={player.timeAsMidfielder}
                        onChange={(e) => updatePlayerStat(player.playerId, 'timeAsMidfielder', parseInt(e.target.value) || 0)}
                        className="w-16 bg-slate-600 border border-slate-500 rounded px-2 py-1 text-xs"
                        min="0"
                      />
                    ) : `${player.timeAsMidfielder}m`}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300 font-mono">
                    {isEditing ? (
                      <input
                        type="number"
                        value={player.timeAsAttacker}
                        onChange={(e) => updatePlayerStat(player.playerId, 'timeAsAttacker', parseInt(e.target.value) || 0)}
                        className="w-16 bg-slate-600 border border-slate-500 rounded px-2 py-1 text-xs"
                        min="0"
                      />
                    ) : `${player.timeAsAttacker}m`}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300 font-mono">
                    {isEditing ? (
                      <input
                        type="number"
                        value={player.timeAsGoalie}
                        onChange={(e) => updatePlayerStat(player.playerId, 'timeAsGoalie', parseInt(e.target.value) || 0)}
                        className="w-16 bg-slate-600 border border-slate-500 rounded px-2 py-1 text-xs"
                        min="0"
                      />
                    ) : `${player.timeAsGoalie}m`}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">
                    {isEditing ? (
                      <input
                        type="checkbox"
                        checked={player.wasCaptain}
                        onChange={(e) => updatePlayerStat(player.playerId, 'wasCaptain', e.target.checked)}
                        className="rounded bg-slate-600 border-slate-500"
                      />
                    ) : (player.wasCaptain ? '✓' : '-')}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">
                    {isEditing ? (
                      <input
                        type="checkbox"
                        checked={player.gotFairPlayAward}
                        onChange={(e) => updatePlayerStat(player.playerId, 'gotFairPlayAward', e.target.checked)}
                        className="rounded bg-slate-600 border-slate-500"
                      />
                    ) : (player.gotFairPlayAward ? '🏆' : '-')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {!canEdit && (
        <div className="bg-slate-700 p-4 rounded-lg border border-amber-500/30">
          <p className="text-amber-200 text-sm">
            ℹ️ Only team managers can edit match details and player statistics.
          </p>
        </div>
      )}
    </div>
  );
}