import React, { useState } from 'react';
import { ArrowLeft, Edit3, Save, X, Award, Shield } from 'lucide-react';
import { Button, Input, Select } from '../shared/UI';

export function MatchDetailsView({ match, onBack }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedMatch, setEditedMatch] = useState(match);

  const handleEdit = () => {
    setIsEditing(true);
    setEditedMatch({ ...match });
  };

  const handleSave = () => {
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedMatch(match);
  };

  const formatTime = (minutes) => `${minutes}m`;

  const getOutcomeColor = (outcome) => {
    switch (outcome) {
      case 'W': return 'text-emerald-400';
      case 'D': return 'text-yellow-400';
      case 'L': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const getOutcomeText = (outcome) => {
    switch (outcome) {
      case 'W': return 'Win';
      case 'D': return 'Draw';
      case 'L': return 'Loss';
      default: return outcome;
    }
  };

  const matchTypeOptions = [
    { value: 'League', label: 'League' },
    { value: 'Friendly', label: 'Friendly' },
    { value: 'Cup', label: 'Cup' },
    { value: 'Tournament', label: 'Tournament' }
  ];

  const homeAwayOptions = [
    { value: 'Home', label: 'Home' },
    { value: 'Away', label: 'Away' }
  ];

  const formatOptions = [
    { value: '5v5', label: '5v5' },
    { value: '7v7', label: '7v7' },
    { value: '9v9', label: '9v9' },
    { value: '11v11', label: '11v11' }
  ];

  const formationOptions = [
    { value: '2-2', label: '2-2' },
    { value: '1-2-1', label: '1-2-1' },
    { value: '3-1', label: '3-1' },
    { value: '1-3', label: '1-3' }
  ];

  const startingRoleOptions = [
    { value: 'goalkeeper', label: 'Goalkeeper' },
    { value: 'defender', label: 'Defender' },
    { value: 'midfielder', label: 'Midfielder' },
    { value: 'attacker', label: 'Attacker' },
    { value: 'substitute', label: 'Substitute' }
  ];

  const currentMatch = isEditing ? editedMatch : match;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            onClick={onBack}
            variant="secondary"
            Icon={ArrowLeft}
            size="sm"
          >
            Back to History
          </Button>
          <h2 className="text-xl font-bold text-sky-300">Match Details</h2>
        </div>
        {!isEditing ? (
          <Button
            onClick={handleEdit}
            variant="primary"
            Icon={Edit3}
            size="sm"
          >
            Edit Match
          </Button>
        ) : (
          <div className="flex space-x-2">
            <Button
              onClick={handleSave}
              variant="accent"
              Icon={Save}
              size="sm"
            >
              Save
            </Button>
            <Button
              onClick={handleCancel}
              variant="secondary"
              Icon={X}
              size="sm"
            >
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Match Information */}
      <div className="bg-slate-800 p-6 rounded-lg border border-slate-600">
        <h3 className="text-lg font-semibold text-sky-300 mb-4">Match Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Date</label>
            {isEditing ? (
              <Input
                type="date"
                value={editedMatch.date}
                onChange={(e) => setEditedMatch({...editedMatch, date: e.target.value})}
              />
            ) : (
              <p className="text-white">{new Date(currentMatch.date).toLocaleDateString()}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Opponent</label>
            {isEditing ? (
              <Input
                value={editedMatch.opponent}
                onChange={(e) => setEditedMatch({...editedMatch, opponent: e.target.value})}
              />
            ) : (
              <p className="text-white">{currentMatch.opponent}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Home/Away</label>
            {isEditing ? (
              <Select
                value={editedMatch.homeAway}
                onChange={(value) => setEditedMatch({...editedMatch, homeAway: value})}
                options={homeAwayOptions}
              />
            ) : (
              <p className="text-white">{currentMatch.homeAway}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Score</label>
            {isEditing ? (
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  value={editedMatch.ownScore}
                  onChange={(e) => setEditedMatch({...editedMatch, ownScore: parseInt(e.target.value) || 0})}
                  className="w-16 text-center"
                />
                <span className="text-slate-400">-</span>
                <Input
                  type="number"
                  value={editedMatch.opponentScore}
                  onChange={(e) => setEditedMatch({...editedMatch, opponentScore: parseInt(e.target.value) || 0})}
                  className="w-16 text-center"
                />
              </div>
            ) : (
              <p className="text-white font-mono text-lg">
                {currentMatch.ownScore}-{currentMatch.opponentScore}
                <span className={`ml-2 text-sm ${getOutcomeColor(currentMatch.outcome)}`}>
                  ({getOutcomeText(currentMatch.outcome)})
                </span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Type</label>
            {isEditing ? (
              <Select
                value={editedMatch.type}
                onChange={(value) => setEditedMatch({...editedMatch, type: value})}
                options={matchTypeOptions}
              />
            ) : (
              <p className="text-white">{currentMatch.type}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Format</label>
            {isEditing ? (
              <Select
                value={editedMatch.matchFormat}
                onChange={(value) => setEditedMatch({...editedMatch, matchFormat: value})}
                options={formatOptions}
              />
            ) : (
              <p className="text-white">{currentMatch.matchFormat}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Periods</label>
            {isEditing ? (
              <Input
                type="number"
                value={editedMatch.numberOfPeriods}
                onChange={(e) => setEditedMatch({...editedMatch, numberOfPeriods: parseInt(e.target.value) || 1})}
              />
            ) : (
              <p className="text-white">{currentMatch.numberOfPeriods}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Period Duration</label>
            {isEditing ? (
              <Input
                type="number"
                value={editedMatch.periodDuration}
                onChange={(e) => setEditedMatch({...editedMatch, periodDuration: parseInt(e.target.value) || 20})}
              />
            ) : (
              <p className="text-white">{currentMatch.periodDuration} minutes</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Formation</label>
            {isEditing ? (
              <Select
                value={editedMatch.teamFormation}
                onChange={(value) => setEditedMatch({...editedMatch, teamFormation: value})}
                options={formationOptions}
              />
            ) : (
              <p className="text-white">{currentMatch.teamFormation}</p>
            )}
          </div>
        </div>
      </div>

      {/* Player Statistics */}
      <div className="bg-slate-800 p-6 rounded-lg border border-slate-600">
        <h3 className="text-lg font-semibold text-sky-300 mb-4">Player Statistics</h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700 border-b border-slate-600">
              <tr>
                <th className="py-2 px-3 text-left text-sm font-medium text-slate-300">Player</th>
                <th className="py-2 px-2 text-center text-sm font-medium text-slate-300">Goals</th>
                <th className="py-2 px-2 text-center text-sm font-medium text-slate-300">Time</th>
                <th className="py-2 px-2 text-center text-sm font-medium text-slate-300">Def</th>
                <th className="py-2 px-2 text-center text-sm font-medium text-slate-300">Mid</th>
                <th className="py-2 px-2 text-center text-sm font-medium text-slate-300">Att</th>
                <th className="py-2 px-2 text-center text-sm font-medium text-slate-300">GK</th>
                <th className="py-2 px-2 text-center text-sm font-medium text-slate-300">Starting</th>
                <th className="py-2 px-2 text-center text-sm font-medium text-slate-300">Captain</th>
                <th className="py-2 px-2 text-center text-sm font-medium text-slate-300">Fair Play</th>
              </tr>
            </thead>
            <tbody>
              {currentMatch.playerStats?.map((player, index) => (
                <tr
                  key={player.playerId}
                  className={`border-b border-slate-700 hover:bg-slate-700/50 transition-colors ${
                    index % 2 === 0 ? 'bg-slate-800/50' : 'bg-slate-800/30'
                  }`}
                >
                  <td className="py-2 px-3 text-sm font-medium text-white">{player.playerName}</td>
                  <td className="py-2 px-2 text-sm text-slate-200 text-center">
                    {isEditing ? (
                      <Input
                        type="number"
                        value={player.goalsScored}
                        onChange={(e) => {
                          const newStats = [...editedMatch.playerStats];
                          newStats[index] = {...player, goalsScored: parseInt(e.target.value) || 0};
                          setEditedMatch({...editedMatch, playerStats: newStats});
                        }}
                        className="w-16 text-center text-sm"
                      />
                    ) : (
                      player.goalsScored
                    )}
                  </td>
                  <td className="py-2 px-2 text-sm text-slate-200 text-center">{formatTime(player.totalTimePlayed)}</td>
                  <td className="py-2 px-2 text-sm text-slate-200 text-center">{formatTime(player.timeAsDefender)}</td>
                  <td className="py-2 px-2 text-sm text-slate-200 text-center">{formatTime(player.timeAsMidfielder)}</td>
                  <td className="py-2 px-2 text-sm text-slate-200 text-center">{formatTime(player.timeAsAttacker)}</td>
                  <td className="py-2 px-2 text-sm text-slate-200 text-center">{formatTime(player.timeAsGoalkeeper)}</td>
                  <td className="py-2 px-2 text-sm text-slate-200 text-center">
                    {isEditing ? (
                      <Select
                        value={player.startingRole}
                        onChange={(value) => {
                          const newStats = [...editedMatch.playerStats];
                          newStats[index] = {...player, startingRole: value};
                          setEditedMatch({...editedMatch, playerStats: newStats});
                        }}
                        options={startingRoleOptions}
                      />
                    ) : (
                      <span className="capitalize">{player.startingRole}</span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-center">
                    {isEditing ? (
                      <input
                        type="checkbox"
                        checked={player.wasCaptain}
                        onChange={(e) => {
                          const newStats = [...editedMatch.playerStats];
                          newStats[index] = {...player, wasCaptain: e.target.checked};
                          setEditedMatch({...editedMatch, playerStats: newStats});
                        }}
                        className="w-4 h-4 text-sky-600 bg-slate-600 border-slate-500 rounded focus:ring-sky-500"
                      />
                    ) : (
                      player.wasCaptain && <Shield className="w-4 h-4 text-yellow-400 mx-auto" />
                    )}
                  </td>
                  <td className="py-2 px-2 text-center">
                    {isEditing ? (
                      <input
                        type="checkbox"
                        checked={player.receivedFairPlayAward}
                        onChange={(e) => {
                          const newStats = [...editedMatch.playerStats];
                          newStats[index] = {...player, receivedFairPlayAward: e.target.checked};
                          setEditedMatch({...editedMatch, playerStats: newStats});
                        }}
                        className="w-4 h-4 text-sky-600 bg-slate-600 border-slate-500 rounded focus:ring-sky-500"
                      />
                    ) : (
                      player.receivedFairPlayAward && <Award className="w-4 h-4 text-emerald-400 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isEditing && (
        <div className="bg-amber-900/20 border border-amber-600/50 p-4 rounded-lg">
          <p className="text-amber-300 text-sm">
            <strong>Note:</strong> Changes made here will be saved to the match record. This functionality would be connected to the database in the real implementation.
          </p>
        </div>
      )}
    </div>
  );
}