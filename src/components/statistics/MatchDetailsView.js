import React, { useState } from 'react';
import { ArrowLeft, Edit, Save, X, Calendar, MapPin, Trophy, Users, Clock, Award } from 'lucide-react';
import { Button, Input, Select } from '../shared/UI';

// Mock data - replace with real data later
const mockMatchDetails = {
  1: {
    id: 1,
    date: '2024-01-20',
    time: '15:00',
    type: 'League',
    opponent: 'Hammarby IF',
    homeScore: 3,
    awayScore: 1,
    isHome: true,
    outcome: 'W',
    format: '5v5',
    periods: 2,
    periodDuration: 20, // minutes
    formation: '2-2',
    playerStats: [
      {
        id: 1,
        name: 'Erik Andersson',
        goalsScored: 2,
        totalTimePlayed: 38, // minutes
        timeAsDefender: 20,
        timeAsMidfielder: 8,
        timeAsAttacker: 10,
        timeAsGoalkeeper: 0,
        startingRole: 'Attacker',
        wasCaptain: true,
        receivedFairPlayAward: false
      },
      {
        id: 2,
        name: 'Liam Johansson',
        goalsScored: 1,
        totalTimePlayed: 40,
        timeAsDefender: 5,
        timeAsMidfielder: 15,
        timeAsAttacker: 20,
        timeAsGoalkeeper: 0,
        startingRole: 'Attacker',
        wasCaptain: false,
        receivedFairPlayAward: true
      },
      {
        id: 3,
        name: 'Oliver Lindqvist',
        goalsScored: 0,
        totalTimePlayed: 35,
        timeAsDefender: 30,
        timeAsMidfielder: 5,
        timeAsAttacker: 0,
        timeAsGoalkeeper: 0,
        startingRole: 'Defender',
        wasCaptain: false,
        receivedFairPlayAward: true
      },
      {
        id: 4,
        name: 'William Karlsson',
        goalsScored: 0,
        totalTimePlayed: 40,
        timeAsDefender: 0,
        timeAsMidfielder: 0,
        timeAsAttacker: 0,
        timeAsGoalkeeper: 40,
        startingRole: 'Goalkeeper',
        wasCaptain: false,
        receivedFairPlayAward: false
      },
      {
        id: 5,
        name: 'Lucas Svensson',
        goalsScored: 0,
        totalTimePlayed: 25,
        timeAsDefender: 15,
        timeAsMidfielder: 5,
        timeAsAttacker: 5,
        timeAsGoalkeeper: 0,
        startingRole: 'Substitute',
        wasCaptain: false,
        receivedFairPlayAward: false
      }
    ]
  }
};

const MATCH_TYPES = ['League', 'Cup', 'Friendly'];
const FORMATIONS = ['2-2', '1-2-1', '3-1'];
const STARTING_ROLES = ['Goalkeeper', 'Defender', 'Midfielder', 'Attacker', 'Substitute'];

export function MatchDetailsView({ matchId, onNavigateBack }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(null);

  const matchData = mockMatchDetails[matchId];

  React.useEffect(() => {
    if (matchData && !editData) {
      setEditData({
        ...matchData,
        playerStats: [...matchData.playerStats]
      });
    }
  }, [matchData, editData]);

  if (!matchData || !editData) {
    return (
      <div className="text-center py-8 text-slate-400">
        <p>Match not found</p>
        <Button onClick={onNavigateBack} variant="secondary" className="mt-4">
          Back to Match History
        </Button>
      </div>
    );
  }

  const handleSave = () => {
    // In real implementation, save to database
    console.log('Saving match data:', editData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({
      ...matchData,
      playerStats: [...matchData.playerStats]
    });
    setIsEditing(false);
  };

  const updateMatchDetail = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updatePlayerStat = (playerId, field, value) => {
    setEditData(prev => ({
      ...prev,
      playerStats: prev.playerStats.map(player =>
        player.id === playerId
          ? { ...player, [field]: value }
          : player
      )
    }));
  };

  const formatScore = () => {
    if (editData.isHome) {
      return `${editData.homeScore}-${editData.awayScore}`;
    } else {
      return `${editData.awayScore}-${editData.homeScore}`;
    }
  };

  const getOutcomeBadge = (outcome) => {
    const baseClasses = "px-2 py-1 rounded text-xs font-medium";
    switch (outcome) {
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            onClick={onNavigateBack}
            Icon={ArrowLeft}
            variant="secondary"
            size="md"
          >
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-sky-300">Match Details</h2>
            <p className="text-slate-400 text-sm">{editData.opponent}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {isEditing ? (
            <>
              <Button onClick={handleSave} Icon={Save} variant="primary">
                Save Changes
              </Button>
              <Button onClick={handleCancel} Icon={X} variant="secondary">
                Cancel
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)} Icon={Edit} variant="secondary">
              Edit Match
            </Button>
          )}
        </div>
      </div>

      {/* Match Summary */}
      <div className="bg-slate-700 rounded-lg border border-slate-600 overflow-hidden">
        {/* Main Match Info Row */}
        <div className="p-4 bg-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Left: Opponent & Outcome */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <span className="text-xl font-semibold text-slate-100">{editData.opponent}</span>
              </div>
              <span className={getOutcomeBadge(editData.outcome)}>
                {editData.outcome === 'W' ? 'Win' :
                 editData.outcome === 'D' ? 'Draw' : 'Loss'}
              </span>
            </div>

            {/* Center: Score */}
            <div className="text-center">
              {isEditing ? (
                <div className="flex items-center justify-center space-x-2">
                  <Input
                    type="number"
                    value={editData.isHome ? editData.homeScore : editData.awayScore}
                    onChange={(e) => updateMatchDetail(
                      editData.isHome ? 'homeScore' : 'awayScore',
                      parseInt(e.target.value) || 0
                    )}
                    className="w-16 text-center"
                    min="0"
                  />
                  <span className="text-slate-400 text-xl">-</span>
                  <Input
                    type="number"
                    value={editData.isHome ? editData.awayScore : editData.homeScore}
                    onChange={(e) => updateMatchDetail(
                      editData.isHome ? 'awayScore' : 'homeScore',
                      parseInt(e.target.value) || 0
                    )}
                    className="w-16 text-center"
                    min="0"
                  />
                </div>
              ) : (
                <div className="text-3xl font-bold text-sky-300">{formatScore()}</div>
              )}
            </div>

            {/* Right: Date & Time */}
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              <div className="text-right">
                {isEditing ? (
                  <div className="flex flex-col space-y-1">
                    <Input
                      type="date"
                      value={editData.date}
                      onChange={(e) => updateMatchDetail('date', e.target.value)}
                      className="w-32 text-sm"
                    />
                    <Input
                      type="time"
                      value={editData.time}
                      onChange={(e) => updateMatchDetail('time', e.target.value)}
                      className="w-32 text-sm"
                    />
                  </div>
                ) : (
                  <div className="text-sm">
                    <div className="text-slate-100 font-mono">
                      {editData.date}
                    </div>
                    <div className="text-slate-300">
                      {editData.time}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Details Row */}
        <div className="px-4 py-3 border-t border-slate-600">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <Trophy className="h-4 w-4 text-slate-400" />
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-wide">Type</div>
                {isEditing ? (
                  <Select
                    value={editData.type}
                    onChange={(value) => updateMatchDetail('type', value)}
                    options={MATCH_TYPES}
                    className="text-sm"
                  />
                ) : (
                  <div className="text-sm text-slate-100 font-medium">{editData.type}</div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-slate-400" />
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-wide">Venue</div>
                <div className="text-sm text-slate-100 font-medium">
                  {editData.isHome ? 'Home' : 'Away'}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-slate-400" />
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-wide">Format</div>
                {isEditing ? (
                  <Input
                    value={editData.format}
                    onChange={(e) => updateMatchDetail('format', e.target.value)}
                    className="text-sm"
                  />
                ) : (
                  <div className="text-sm text-slate-100 font-medium">{editData.format}</div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className="h-4 w-4 bg-slate-500 rounded-sm flex items-center justify-center">
                <div className="text-xs text-slate-100 font-bold">F</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-wide">Formation</div>
                {isEditing ? (
                  <Select
                    value={editData.formation}
                    onChange={(value) => updateMatchDetail('formation', value)}
                    options={FORMATIONS}
                    className="text-sm"
                  />
                ) : (
                  <div className="text-sm text-slate-100 font-medium">{editData.formation}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Player Statistics */}
      <div className="bg-slate-700 rounded-lg border border-slate-600 overflow-hidden">
        <div className="p-4 border-b border-slate-600">
          <h3 className="text-lg font-semibold text-slate-100">Player Statistics</h3>
          <p className="text-slate-400 text-sm mt-1">
            Individual player performance for this match
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-800">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-sky-200 uppercase tracking-wider">
                  Player
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-sky-200 uppercase tracking-wider">
                  Goals
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-sky-200 uppercase tracking-wider">
                  Total Time
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-sky-200 uppercase tracking-wider">
                  Defender
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-sky-200 uppercase tracking-wider">
                  Midfielder
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-sky-200 uppercase tracking-wider">
                  Attacker
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-sky-200 uppercase tracking-wider">
                  Goalkeeper
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-sky-200 uppercase tracking-wider">
                  Starting Role
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-sky-200 uppercase tracking-wider">
                  Captain
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-sky-200 uppercase tracking-wider">
                  Fair Play
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-600">
              {editData.playerStats.map((player, index) => (
                <tr
                  key={player.id}
                  className={`${
                    index % 2 === 0 ? 'bg-slate-700' : 'bg-slate-800'
                  } hover:bg-slate-600 transition-colors`}
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-100 font-medium">{player.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-center">
                    {isEditing ? (
                      <Input
                        type="number"
                        value={player.goalsScored}
                        onChange={(e) => updatePlayerStat(player.id, 'goalsScored', parseInt(e.target.value) || 0)}
                        className="w-16 text-center"
                        min="0"
                      />
                    ) : (
                      <span className="text-slate-300 font-mono">{player.goalsScored}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-center">
                    {isEditing ? (
                      <div className="flex items-center justify-center space-x-1">
                        <Input
                          type="number"
                          value={player.totalTimePlayed}
                          onChange={(e) => updatePlayerStat(player.id, 'totalTimePlayed', parseInt(e.target.value) || 0)}
                          className="w-16 text-center"
                          min="0"
                        />
                        <span className="text-xs text-slate-400">min</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-1">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span className="text-slate-300 font-mono">{player.totalTimePlayed}min</span>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-center">
                    <span className="text-slate-300 font-mono">{player.timeAsDefender}min</span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-center">
                    <span className="text-slate-300 font-mono">{player.timeAsMidfielder}min</span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-center">
                    <span className="text-slate-300 font-mono">{player.timeAsAttacker}min</span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-center">
                    <span className="text-slate-300 font-mono">{player.timeAsGoalkeeper}min</span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-center">
                    {isEditing ? (
                      <Select
                        value={player.startingRole}
                        onChange={(value) => updatePlayerStat(player.id, 'startingRole', value)}
                        options={STARTING_ROLES}
                      />
                    ) : (
                      <span className="text-slate-300 text-sm">{player.startingRole}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-center">
                    {isEditing ? (
                      <input
                        type="checkbox"
                        checked={player.wasCaptain}
                        onChange={(e) => updatePlayerStat(player.id, 'wasCaptain', e.target.checked)}
                        className="rounded border-slate-500 bg-slate-600 text-sky-600 focus:ring-sky-500"
                      />
                    ) : (
                      player.wasCaptain && <Award className="h-4 w-4 text-yellow-400 mx-auto" />
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-center">
                    {isEditing ? (
                      <input
                        type="checkbox"
                        checked={player.receivedFairPlayAward}
                        onChange={(e) => updatePlayerStat(player.id, 'receivedFairPlayAward', e.target.checked)}
                        className="rounded border-slate-500 bg-slate-600 text-emerald-600 focus:ring-emerald-500"
                      />
                    ) : (
                      player.receivedFairPlayAward && <Award className="h-4 w-4 text-emerald-400 mx-auto" />
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