import React, { useState } from 'react';
import { ArrowLeft, Calendar, Clock, MapPin, Edit3, Save, X, Target, Trophy, Award } from 'lucide-react';
import { mockMatchDetails, formatPlayTime, getOutcomeColor, getMatchTypeBadgeColor } from '../../data/mockStatisticsData';

export function MatchDetails({ match, onNavigateBack, canEdit = false }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedMatch, setEditedMatch] = useState(match);
  const [editedPlayerStats, setEditedPlayerStats] = useState(
    mockMatchDetails[match?.id]?.playerStats || []
  );

  const matchData = mockMatchDetails[match?.id];

  if (!match || !matchData) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-400">Match details not found.</p>
      </div>
    );
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleSave = () => {
    // In a real app, this would save to the database
    console.log('Saving match details:', { editedMatch, editedPlayerStats });
    setIsEditing(false);
    // Show success message
    alert('Match details updated successfully!');
  };

  const handleCancel = () => {
    setEditedMatch(match);
    setEditedPlayerStats(mockMatchDetails[match.id]?.playerStats || []);
    setIsEditing(false);
  };

  const updatePlayerStat = (playerId, field, value) => {
    setEditedPlayerStats(prev =>
      prev.map(player =>
        player.playerId === playerId
          ? { ...player, [field]: parseInt(value) || 0 }
          : player
      )
    );
  };

  const updateMatchDetails = (field, value) => {
    setEditedMatch(prev => ({
      ...prev,
      [field]: field === 'goalsScored' || field === 'goalsConceded' ? parseInt(value) || 0 : value
    }));
  };

  const EditableInput = ({ value, onChange, type = 'text', className = '', min, max }) => (
    isEditing ? (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        className={`bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400 ${className}`}
      />
    ) : (
      <span>{value}</span>
    )
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onNavigateBack}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Match Details</h1>
            <p className="text-slate-400">
              {formatDate(match.date)} vs {match.opponent}
            </p>
          </div>
        </div>

        {/* Edit Controls */}
        {canEdit && (
          <div className="flex items-center space-x-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Save</span>
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center space-x-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 rounded-lg text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 rounded-lg text-white transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Match Summary */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Score */}
          <div className="text-center">
            <h3 className="text-sm font-medium text-slate-400 mb-2">Final Score</h3>
            <div className="flex items-center justify-center space-x-2">
              <EditableInput
                value={isEditing ? editedMatch.goalsScored : match.goalsScored}
                onChange={(value) => updateMatchDetails('goalsScored', value)}
                type="number"
                min="0"
                max="20"
                className="w-16 text-center text-2xl font-bold"
              />
              <span className="text-2xl font-bold text-slate-400">-</span>
              <EditableInput
                value={isEditing ? editedMatch.goalsConceded : match.goalsConceded}
                onChange={(value) => updateMatchDetails('goalsConceded', value)}
                type="number"
                min="0"
                max="20"
                className="w-16 text-center text-2xl font-bold"
              />
            </div>
            <div className={`text-sm font-medium mt-1 ${getOutcomeColor(match.outcome)}`}>
              {match.outcome.charAt(0).toUpperCase() + match.outcome.slice(1)}
            </div>
          </div>

          {/* Match Info */}
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-2">Match Details</h3>
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-sm">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-slate-200">{formatDate(match.date)}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-slate-200">{match.periods} periods • {Math.round(match.duration / 60)} min</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span className="text-slate-200">{match.format}</span>
              </div>
            </div>
          </div>

          {/* Opponent */}
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-2">Opponent</h3>
            <div className="text-lg font-medium text-slate-200 mb-2">
              {isEditing ? (
                <EditableInput
                  value={editedMatch.opponent}
                  onChange={(value) => updateMatchDetails('opponent', value)}
                  className="w-full"
                />
              ) : (
                match.opponent
              )}
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMatchTypeBadgeColor(match.type)}`}>
              {match.type.charAt(0).toUpperCase() + match.type.slice(1)}
            </span>
          </div>

          {/* Team Stats */}
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-2">Team Performance</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Players Used:</span>
                <span className="text-slate-200">{matchData.playerStats.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Goals:</span>
                <span className="text-emerald-400">
                  {matchData.playerStats.reduce((sum, p) => sum + p.goalsScored, 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Captains:</span>
                <span className="text-amber-400">
                  {matchData.playerStats.filter(p => p.wasCaptain).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Fair Play Awards:</span>
                <span className="text-green-400">
                  {matchData.playerStats.filter(p => p.gotFairPlayAward).length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Player Statistics */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-slate-100">Individual Player Statistics</h2>
          <p className="text-slate-400 mt-1">Performance breakdown for each player in this match</p>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-200">Player</th>
                <th className="px-3 py-3 text-center text-sm font-medium text-slate-200">
                  <Target className="w-4 h-4 inline" />
                </th>
                <th className="px-3 py-3 text-center text-sm font-medium text-slate-200">
                  <Clock className="w-4 h-4 inline" />
                </th>
                <th className="px-3 py-3 text-center text-sm font-medium text-slate-200">DEF</th>
                <th className="px-3 py-3 text-center text-sm font-medium text-slate-200">MID</th>
                <th className="px-3 py-3 text-center text-sm font-medium text-slate-200">ATT</th>
                <th className="px-3 py-3 text-center text-sm font-medium text-slate-200">GK</th>
                <th className="px-3 py-3 text-center text-sm font-medium text-slate-200">Started As</th>
                <th className="px-3 py-3 text-center text-sm font-medium text-slate-200">
                  <Trophy className="w-4 h-4 inline" />
                </th>
                <th className="px-3 py-3 text-center text-sm font-medium text-slate-200">
                  <Award className="w-4 h-4 inline" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {editedPlayerStats.map((player) => (
                <tr key={player.playerId} className="hover:bg-slate-700 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-200">{player.name}</span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    {isEditing ? (
                      <input
                        type="number"
                        value={player.goalsScored}
                        onChange={(e) => updatePlayerStat(player.playerId, 'goalsScored', e.target.value)}
                        min="0"
                        max="10"
                        className="w-16 text-center bg-slate-600 border border-slate-500 rounded px-2 py-1 text-emerald-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
                      />
                    ) : (
                      <span className="text-emerald-400 font-medium">{player.goalsScored}</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center text-slate-200 text-sm">
                    {formatPlayTime(player.totalPlayTime)}
                  </td>
                  <td className="px-3 py-3 text-center text-blue-400 text-sm">
                    {formatPlayTime(player.defenderTime)}
                  </td>
                  <td className="px-3 py-3 text-center text-purple-400 text-sm">
                    {formatPlayTime(player.midfielderTime)}
                  </td>
                  <td className="px-3 py-3 text-center text-red-400 text-sm">
                    {formatPlayTime(player.attackerTime)}
                  </td>
                  <td className="px-3 py-3 text-center text-yellow-400 text-sm">
                    {formatPlayTime(player.goalieTime)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="px-2 py-1 bg-slate-600 rounded text-xs text-slate-200">
                      {player.startedAs}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    {player.wasCaptain ? (
                      <Trophy className="w-4 h-4 text-amber-400 mx-auto" />
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {player.gotFairPlayAward ? (
                      <Award className="w-4 h-4 text-green-400 mx-auto" />
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden p-4 space-y-4">
          {editedPlayerStats.map((player) => (
            <div key={player.playerId} className="bg-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-slate-200">{player.name}</h3>
                <div className="flex items-center space-x-2">
                  {player.wasCaptain && <Trophy className="w-4 h-4 text-amber-400" />}
                  {player.gotFairPlayAward && <Award className="w-4 h-4 text-green-400" />}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-slate-400">Goals:</span>
                  {isEditing ? (
                    <input
                      type="number"
                      value={player.goalsScored}
                      onChange={(e) => updatePlayerStat(player.playerId, 'goalsScored', e.target.value)}
                      min="0"
                      max="10"
                      className="ml-2 w-16 bg-slate-600 border border-slate-500 rounded px-2 py-1 text-emerald-400"
                    />
                  ) : (
                    <span className="ml-2 font-medium text-emerald-400">{player.goalsScored}</span>
                  )}
                </div>
                <div>
                  <span className="text-slate-400">Total Time:</span>
                  <span className="ml-2 text-slate-200">{formatPlayTime(player.totalPlayTime)}</span>
                </div>
                <div>
                  <span className="text-slate-400">Defender:</span>
                  <span className="ml-2 text-blue-400">{formatPlayTime(player.defenderTime)}</span>
                </div>
                <div>
                  <span className="text-slate-400">Midfielder:</span>
                  <span className="ml-2 text-purple-400">{formatPlayTime(player.midfielderTime)}</span>
                </div>
                <div>
                  <span className="text-slate-400">Attacker:</span>
                  <span className="ml-2 text-red-400">{formatPlayTime(player.attackerTime)}</span>
                </div>
                <div>
                  <span className="text-slate-400">Goalie:</span>
                  <span className="ml-2 text-yellow-400">{formatPlayTime(player.goalieTime)}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400">Started as:</span>
                  <span className="ml-2 px-2 py-1 bg-slate-600 rounded text-xs text-slate-200">
                    {player.startedAs}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}