import React, { useState } from 'react';
import { Button, Input, Select } from '../shared/UI';
import { ArrowLeft, Edit, Save, X, Check } from 'lucide-react';
import { mockMatchDetails, mockMatchHistory } from './mockData';

export function MatchDetailsScreen({
  matchId,
  onNavigateBack,
  isAdminUser = false
}) {
  const match = mockMatchHistory.find(m => m.id === parseInt(matchId));
  const matchDetails = mockMatchDetails[matchId];

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(null);

  if (!match || !matchDetails) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button
            onClick={onNavigateBack}
            variant="secondary"
            size="sm"
            Icon={ArrowLeft}
          >
            Back
          </Button>
          <h2 className="text-2xl font-bold text-sky-300">Match Not Found</h2>
        </div>
        <div className="text-slate-400">
          The requested match could not be found.
        </div>
      </div>
    );
  }

  const handleStartEdit = () => {
    setEditData({
      ...match,
      playerStats: [...matchDetails.playerStats]
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditData(null);
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    // In a real implementation, this would save to the database
    console.log('Saving match details:', editData);
    setIsEditing(false);
    setEditData(null);
    // Show success message
  };

  const updateMatchField = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updatePlayerStat = (playerId, field, value) => {
    setEditData(prev => ({
      ...prev,
      playerStats: prev.playerStats.map(player =>
        player.id === playerId ? { ...player, [field]: value } : player
      )
    }));
  };

  const currentData = isEditing ? editData : { ...match, playerStats: matchDetails.playerStats };

  const getScoreDisplay = () => {
    const isHome = currentData.homeTeam === 'Djurgården';
    if (isHome) {
      return `${currentData.homeScore}-${currentData.awayScore}`;
    } else {
      return `${currentData.awayScore}-${currentData.homeScore}`;
    }
  };

  const getMatchResult = () => {
    const isHome = currentData.homeTeam === 'Djurgården';
    const ourScore = isHome ? currentData.homeScore : currentData.awayScore;
    const theirScore = isHome ? currentData.awayScore : currentData.homeScore;

    if (ourScore > theirScore) return 'W';
    if (ourScore < theirScore) return 'L';
    return 'D';
  };

  const getResultBadge = (result) => {
    switch (result) {
      case 'W':
        return <span className="inline-flex items-center px-3 py-1 rounded text-sm font-medium bg-green-900 text-green-200">Win</span>;
      case 'D':
        return <span className="inline-flex items-center px-3 py-1 rounded text-sm font-medium bg-yellow-900 text-yellow-200">Draw</span>;
      case 'L':
        return <span className="inline-flex items-center px-3 py-1 rounded text-sm font-medium bg-red-900 text-red-200">Loss</span>;
      default:
        return null;
    }
  };

  const formatTime = (minutes) => `${Math.round(minutes)}m`;

  const roleOptions = [
    { value: 'goalkeeper', label: 'Goalkeeper' },
    { value: 'defender', label: 'Defender' },
    { value: 'midfielder', label: 'Midfielder' },
    { value: 'attacker', label: 'Attacker' },
    { value: 'substitute', label: 'Substitute' }
  ];

  const typeOptions = [
    { value: 'League', label: 'League' },
    { value: 'Cup', label: 'Cup' },
    { value: 'Friendly', label: 'Friendly' }
  ];

  const formatOptions = [
    { value: '5v5', label: '5v5' },
    { value: '7v7', label: '7v7' },
    { value: '11v11', label: '11v11' }
  ];

  const formationOptions = [
    { value: '2-2', label: '2-2' },
    { value: '1-2-1', label: '1-2-1' },
    { value: '3-1', label: '3-1' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            onClick={onNavigateBack}
            variant="secondary"
            size="sm"
            Icon={ArrowLeft}
          >
            Back
          </Button>
          <h2 className="text-2xl font-bold text-sky-300">Match Details</h2>
        </div>

        {isAdminUser && (
          <div className="flex space-x-2">
            {isEditing ? (
              <>
                <Button
                  onClick={handleSaveEdit}
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
              </>
            ) : (
              <Button
                onClick={handleStartEdit}
                variant="primary"
                size="sm"
                Icon={Edit}
              >
                Edit
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Match Information */}
      <div className="bg-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-200 mb-4">Match Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Date</label>
              {isEditing ? (
                <Input
                  type="date"
                  value={currentData.date}
                  onChange={(e) => updateMatchField('date', e.target.value)}
                />
              ) : (
                <div className="text-slate-200">{new Date(currentData.date).toLocaleDateString('sv-SE')}</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Opponent</label>
              {isEditing ? (
                <Input
                  value={currentData.opponent}
                  onChange={(e) => updateMatchField('opponent', e.target.value)}
                />
              ) : (
                <div className="text-slate-200">{currentData.opponent}</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Type</label>
              {isEditing ? (
                <Select
                  value={currentData.type}
                  onChange={(value) => updateMatchField('type', value)}
                  options={typeOptions}
                />
              ) : (
                <div className="text-slate-200">{currentData.type}</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Format</label>
              {isEditing ? (
                <Select
                  value={currentData.format}
                  onChange={(value) => updateMatchField('format', value)}
                  options={formatOptions}
                />
              ) : (
                <div className="text-slate-200">{currentData.format}</div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Score</label>
              <div className="flex items-center space-x-4">
                <div className="text-2xl font-bold text-slate-200">{getScoreDisplay()}</div>
                {getResultBadge(getMatchResult())}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Periods</label>
              {isEditing ? (
                <Input
                  type="number"
                  value={currentData.periods}
                  onChange={(e) => updateMatchField('periods', parseInt(e.target.value))}
                  min="1"
                  max="4"
                />
              ) : (
                <div className="text-slate-200">{currentData.periods}</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Period Duration (minutes)</label>
              {isEditing ? (
                <Input
                  type="number"
                  value={currentData.periodDuration}
                  onChange={(e) => updateMatchField('periodDuration', parseInt(e.target.value))}
                  min="5"
                  max="45"
                />
              ) : (
                <div className="text-slate-200">{currentData.periodDuration}</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Formation</label>
              {isEditing ? (
                <Select
                  value={currentData.formation}
                  onChange={(value) => updateMatchField('formation', value)}
                  options={formationOptions}
                />
              ) : (
                <div className="text-slate-200">{currentData.formation}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Player Statistics */}
      <div className="bg-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-200 mb-4">Player Statistics</h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-600">
                <th className="text-left py-2 px-3 text-sm font-medium text-slate-200">Player</th>
                <th className="text-center py-2 px-3 text-sm font-medium text-slate-200">Goals</th>
                <th className="text-center py-2 px-3 text-sm font-medium text-slate-200">Total Time</th>
                <th className="text-center py-2 px-3 text-sm font-medium text-slate-200">DEF</th>
                <th className="text-center py-2 px-3 text-sm font-medium text-slate-200">MID</th>
                <th className="text-center py-2 px-3 text-sm font-medium text-slate-200">ATT</th>
                <th className="text-center py-2 px-3 text-sm font-medium text-slate-200">GK</th>
                <th className="text-center py-2 px-3 text-sm font-medium text-slate-200">Starting Role</th>
                <th className="text-center py-2 px-3 text-sm font-medium text-slate-200">Captain</th>
                <th className="text-center py-2 px-3 text-sm font-medium text-slate-200">Fair Play</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-600">
              {currentData.playerStats.map((player) => (
                <tr key={player.id} className="hover:bg-slate-600/50 transition-colors">
                  <td className="py-2 px-3 text-sm text-slate-200 font-medium">
                    {player.name}
                  </td>
                  <td className="py-2 px-3 text-center">
                    {isEditing ? (
                      <Input
                        type="number"
                        value={player.goalsScored}
                        onChange={(e) => updatePlayerStat(player.id, 'goalsScored', parseInt(e.target.value) || 0)}
                        className="w-16 text-center"
                        min="0"
                      />
                    ) : (
                      <span className="text-sm text-slate-300">{player.goalsScored}</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-center">
                    {isEditing ? (
                      <Input
                        type="number"
                        value={player.totalTimePlayed}
                        onChange={(e) => updatePlayerStat(player.id, 'totalTimePlayed', parseInt(e.target.value) || 0)}
                        className="w-16 text-center"
                        min="0"
                      />
                    ) : (
                      <span className="text-sm text-slate-300">{formatTime(player.totalTimePlayed)}</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-center">
                    {isEditing ? (
                      <Input
                        type="number"
                        value={player.timeAsDefender}
                        onChange={(e) => updatePlayerStat(player.id, 'timeAsDefender', parseInt(e.target.value) || 0)}
                        className="w-16 text-center"
                        min="0"
                      />
                    ) : (
                      <span className="text-sm text-slate-300">{formatTime(player.timeAsDefender)}</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-center">
                    {isEditing ? (
                      <Input
                        type="number"
                        value={player.timeAsMidfielder}
                        onChange={(e) => updatePlayerStat(player.id, 'timeAsMidfielder', parseInt(e.target.value) || 0)}
                        className="w-16 text-center"
                        min="0"
                      />
                    ) : (
                      <span className="text-sm text-slate-300">{formatTime(player.timeAsMidfielder)}</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-center">
                    {isEditing ? (
                      <Input
                        type="number"
                        value={player.timeAsAttacker}
                        onChange={(e) => updatePlayerStat(player.id, 'timeAsAttacker', parseInt(e.target.value) || 0)}
                        className="w-16 text-center"
                        min="0"
                      />
                    ) : (
                      <span className="text-sm text-slate-300">{formatTime(player.timeAsAttacker)}</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-center">
                    {isEditing ? (
                      <Input
                        type="number"
                        value={player.timeAsGoalkeeper}
                        onChange={(e) => updatePlayerStat(player.id, 'timeAsGoalkeeper', parseInt(e.target.value) || 0)}
                        className="w-16 text-center"
                        min="0"
                      />
                    ) : (
                      <span className="text-sm text-slate-300">{formatTime(player.timeAsGoalkeeper)}</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-center">
                    {isEditing ? (
                      <Select
                        value={player.startingRole}
                        onChange={(value) => updatePlayerStat(player.id, 'startingRole', value)}
                        options={roleOptions}
                      />
                    ) : (
                      <span className="text-sm text-slate-300 capitalize">{player.startingRole}</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-center">
                    {isEditing ? (
                      <input
                        type="checkbox"
                        checked={player.wasCaptain}
                        onChange={(e) => updatePlayerStat(player.id, 'wasCaptain', e.target.checked)}
                        className="rounded border-slate-400 bg-slate-600 text-sky-600 focus:ring-sky-500"
                      />
                    ) : (
                      player.wasCaptain ? (
                        <Check size={16} className="text-sky-400 mx-auto" />
                      ) : (
                        <span className="text-slate-500">-</span>
                      )
                    )}
                  </td>
                  <td className="py-2 px-3 text-center">
                    {isEditing ? (
                      <input
                        type="checkbox"
                        checked={player.receivedFairPlayAward}
                        onChange={(e) => updatePlayerStat(player.id, 'receivedFairPlayAward', e.target.checked)}
                        className="rounded border-slate-400 bg-slate-600 text-sky-600 focus:ring-sky-500"
                      />
                    ) : (
                      player.receivedFairPlayAward ? (
                        <Check size={16} className="text-sky-400 mx-auto" />
                      ) : (
                        <span className="text-slate-500">-</span>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}