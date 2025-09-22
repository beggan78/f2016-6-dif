import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  Trophy, 
  Edit3, 
  Save, 
  X, 
  Users,
  Award
} from 'lucide-react';
import { Button, Input, Select } from '../shared/UI';
import { formatTime } from '../../utils/formatUtils';
import { getMatchDetails, mockPlayers } from '../../data/mockStatisticsData';

export function MatchDetailsScreen({ matchId, onNavigateBack, canEdit = true }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedMatch, setEditedMatch] = useState(null);

  // Get match details
  const matchDetails = useMemo(() => {
    if (matchId === 'all') return null;
    return getMatchDetails(matchId);
  }, [matchId]);

  // Initialize editing state
  const handleStartEdit = () => {
    setEditedMatch({ ...matchDetails });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditedMatch(null);
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    // In a real app, this would save to the database
    console.log('Saving match edits:', editedMatch);
    setIsEditing(false);
    setEditedMatch(null);
    // Show success message
  };

  // Update edited match
  const updateEditedMatch = (field, value) => {
    setEditedMatch(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Update player stats
  const updatePlayerStats = (playerId, field, value) => {
    setEditedMatch(prev => ({
      ...prev,
      player_stats: {
        ...prev.player_stats,
        [playerId]: {
          ...prev.player_stats[playerId],
          [field]: field === 'goals_scored' ? parseInt(value) || 0 : value
        }
      }
    }));
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Get outcome display
  const getOutcomeDisplay = (outcome) => {
    switch (outcome) {
      case 'win':
        return { text: 'Victory', color: 'text-emerald-400', bg: 'bg-emerald-900/30' };
      case 'loss':
        return { text: 'Defeat', color: 'text-rose-400', bg: 'bg-rose-900/30' };
      case 'draw':
        return { text: 'Draw', color: 'text-amber-400', bg: 'bg-amber-900/30' };
      default:
        return { text: 'Unknown', color: 'text-slate-400', bg: 'bg-slate-700' };
    }
  };

  if (!matchDetails) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-sky-400">Match Details</h1>
          <Button onClick={onNavigateBack} variant="secondary">
            Back
          </Button>
        </div>
        <div className="text-center text-slate-400 py-8">
          Match not found
        </div>
      </div>
    );
  }

  const currentMatch = isEditing ? editedMatch : matchDetails;
  const outcomeDisplay = getOutcomeDisplay(currentMatch.outcome);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-sky-400">Match Details</h1>
          <p className="text-slate-400">
            {formatDate(currentMatch.date)} vs {currentMatch.opponent}
          </p>
        </div>
        <div className="flex space-x-2">
          {canEdit && !isEditing && (
            <Button onClick={handleStartEdit} variant="accent">
              <Edit3 className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
          {isEditing && (
            <>
              <Button onClick={handleSaveEdit} variant="primary">
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button onClick={handleCancelEdit} variant="secondary">
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </>
          )}
          <Button onClick={onNavigateBack} variant="secondary">
            Back
          </Button>
        </div>
      </div>

      {/* Match Overview */}
      <div className="bg-slate-700 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Score */}
          <div className="text-center">
            <div className="text-sm text-slate-400 mb-2">Final Score</div>
            {isEditing ? (
              <div className="flex items-center justify-center space-x-4">
                <div className="text-center">
                  <Input
                    type="number"
                    value={editedMatch.own_score}
                    onChange={(e) => updateEditedMatch('own_score', parseInt(e.target.value) || 0)}
                    className="w-16 text-center text-2xl font-bold"
                    min="0"
                  />
                  <div className="text-sm text-slate-400 mt-1">Our Team</div>
                </div>
                <div className="text-2xl font-bold text-slate-400">-</div>
                <div className="text-center">
                  <Input
                    type="number"
                    value={editedMatch.opponent_score}
                    onChange={(e) => updateEditedMatch('opponent_score', parseInt(e.target.value) || 0)}
                    className="w-16 text-center text-2xl font-bold"
                    min="0"
                  />
                  <div className="text-sm text-slate-400 mt-1">{currentMatch.opponent}</div>
                </div>
              </div>
            ) : (
              <>
                <div className="text-4xl font-bold text-sky-400 mb-2">
                  {currentMatch.own_score} - {currentMatch.opponent_score}
                </div>
                <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${outcomeDisplay.bg} ${outcomeDisplay.color}`}>
                  {outcomeDisplay.text}
                </div>
              </>
            )}
          </div>

          {/* Match Info */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-slate-300">{formatDate(currentMatch.date)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Trophy className="w-4 h-4 text-slate-400" />
              {isEditing ? (
                <Select
                  value={editedMatch.type}
                  onChange={(value) => updateEditedMatch('type', value)}
                  options={[
                    'friendly',
                    'league',
                    'cup',
                    'tournament',
                    'internal'
                  ]}
                />
              ) : (
                <span className="text-slate-300 capitalize">{currentMatch.type}</span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-slate-400" />
              <span className="text-slate-300">{currentMatch.format} • {currentMatch.formation}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-slate-300">
                {currentMatch.periods} periods × {currentMatch.period_duration_minutes} min
              </span>
            </div>
          </div>

          {/* Special Awards */}
          <div className="space-y-3">
            <div>
              <div className="text-sm text-slate-400 mb-1">Captain</div>
              {isEditing ? (
                <Select
                  value={editedMatch.captain || ''}
                  onChange={(value) => updateEditedMatch('captain', value)}
                  options={[
                    { value: '', label: 'No Captain' },
                    ...mockPlayers.map(p => ({ 
                      value: p.id, 
                      label: `${p.name} ${p.surname} (#${p.jersey_number})` 
                    }))
                  ]}
                />
              ) : (
                <div className="flex items-center space-x-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span className="text-slate-300">
                    {currentMatch.captain ? 
                      mockPlayers.find(p => p.id === currentMatch.captain)?.name + ' ' + 
                      mockPlayers.find(p => p.id === currentMatch.captain)?.surname : 
                      'No Captain'
                    }
                  </span>
                </div>
              )}
            </div>
            <div>
              <div className="text-sm text-slate-400 mb-1">Fair Play Award</div>
              {isEditing ? (
                <Select
                  value={editedMatch.fair_play_award || ''}
                  onChange={(value) => updateEditedMatch('fair_play_award', value)}
                  options={[
                    { value: '', label: 'No Award' },
                    ...mockPlayers.map(p => ({ 
                      value: p.id, 
                      label: `${p.name} ${p.surname} (#${p.jersey_number})` 
                    }))
                  ]}
                />
              ) : (
                <div className="flex items-center space-x-2">
                  <Trophy className="w-4 h-4 text-emerald-400" />
                  <span className="text-slate-300">
                    {currentMatch.fair_play_award ? 
                      mockPlayers.find(p => p.id === currentMatch.fair_play_award)?.name + ' ' + 
                      mockPlayers.find(p => p.id === currentMatch.fair_play_award)?.surname : 
                      'No Award'
                    }
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Player Statistics */}
      <div className="bg-slate-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-sky-400 mb-4">Player Statistics</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-600">
                <th className="text-left py-2 text-slate-300">Player</th>
                <th className="text-center py-2 text-slate-300">Goals</th>
                <th className="text-center py-2 text-slate-300">Field Time</th>
                <th className="text-center py-2 text-slate-300">Goalie Time</th>
                <th className="text-center py-2 text-slate-300">Started As</th>
                <th className="text-center py-2 text-slate-300">Captain</th>
                <th className="text-center py-2 text-slate-300">Fair Play</th>
              </tr>
            </thead>
            <tbody>
              {currentMatch.playerStatsWithNames.map((playerStat) => (
                <tr key={playerStat.playerId} className="border-b border-slate-600/50">
                  <td className="py-3">
                    <div className="font-medium text-slate-200">{playerStat.playerName}</div>
                    <div className="text-sm text-slate-400">
                      #{mockPlayers.find(p => p.id === playerStat.playerId)?.jersey_number}
                    </div>
                  </td>
                  <td className="text-center py-3">
                    {isEditing ? (
                      <Input
                        type="number"
                        value={currentMatch.player_stats[playerStat.playerId]?.goals_scored || 0}
                        onChange={(e) => updatePlayerStats(playerStat.playerId, 'goals_scored', e.target.value)}
                        className="w-16 text-center"
                        min="0"
                      />
                    ) : (
                      <span className="text-amber-400 font-medium">{playerStat.goals_scored}</span>
                    )}
                  </td>
                  <td className="text-center py-3">
                    <span className="text-slate-300">
                      {formatTime(playerStat.total_field_time_seconds)}
                    </span>
                  </td>
                  <td className="text-center py-3">
                    <span className="text-slate-300">
                      {formatTime(playerStat.goalie_time_seconds)}
                    </span>
                  </td>
                  <td className="text-center py-3">
                    {isEditing ? (
                      <Select
                        value={currentMatch.player_stats[playerStat.playerId]?.started_as || 'substitute'}
                        onChange={(value) => updatePlayerStats(playerStat.playerId, 'started_as', value)}
                        options={[
                          'goalie',
                          'defender',
                          'midfielder',
                          'attacker',
                          'substitute'
                        ]}
                        className="text-sm"
                      />
                    ) : (
                      <span className="text-slate-300 capitalize">{playerStat.started_as}</span>
                    )}
                  </td>
                  <td className="text-center py-3">
                    {playerStat.was_captain ? (
                      <Award className="w-4 h-4 text-amber-400 mx-auto" />
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                  <td className="text-center py-3">
                    {playerStat.got_fair_play_award ? (
                      <Trophy className="w-4 h-4 text-emerald-400 mx-auto" />
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Time Distribution Chart */}
      <div className="bg-slate-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-sky-400 mb-4">Position Time Distribution</h2>
        <div className="space-y-4">
          {currentMatch.playerStatsWithNames.map((playerStat) => {
            const totalTime = playerStat.total_field_time_seconds + playerStat.goalie_time_seconds;
            if (totalTime === 0) return null;

            const goaliePercent = (playerStat.goalie_time_seconds / totalTime) * 100;
            const defenderPercent = (playerStat.defender_time_seconds / totalTime) * 100;
            const midfielderPercent = (playerStat.midfielder_time_seconds / totalTime) * 100;
            const attackerPercent = (playerStat.attacker_time_seconds / totalTime) * 100;

            return (
              <div key={playerStat.playerId} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 font-medium">{playerStat.playerName}</span>
                  <span className="text-sm text-slate-400">{formatTime(totalTime)}</span>
                </div>
                <div className="w-full bg-slate-600 rounded-full h-3 overflow-hidden">
                  <div className="h-full flex">
                    {goaliePercent > 0 && (
                      <div 
                        className="bg-amber-500" 
                        style={{ width: `${goaliePercent}%` }}
                        title={`Goalie: ${formatTime(playerStat.goalie_time_seconds)}`}
                      />
                    )}
                    {defenderPercent > 0 && (
                      <div 
                        className="bg-blue-500" 
                        style={{ width: `${defenderPercent}%` }}
                        title={`Defender: ${formatTime(playerStat.defender_time_seconds)}`}
                      />
                    )}
                    {midfielderPercent > 0 && (
                      <div 
                        className="bg-emerald-500" 
                        style={{ width: `${midfielderPercent}%` }}
                        title={`Midfielder: ${formatTime(playerStat.midfielder_time_seconds)}`}
                      />
                    )}
                    {attackerPercent > 0 && (
                      <div 
                        className="bg-rose-500" 
                        style={{ width: `${attackerPercent}%` }}
                        title={`Attacker: ${formatTime(playerStat.attacker_time_seconds)}`}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-4 mt-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-amber-500 rounded"></div>
            <span className="text-slate-300">Goalie</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span className="text-slate-300">Defender</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-emerald-500 rounded"></div>
            <span className="text-slate-300">Midfielder</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-rose-500 rounded"></div>
            <span className="text-slate-300">Attacker</span>
          </div>
        </div>
      </div>
    </div>
  );
}