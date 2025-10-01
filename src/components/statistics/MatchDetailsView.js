import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit, Save, X, Calendar, MapPin, Trophy, Users, User, Clock, Award, Layers2, Layers, ChartColumn, ChevronUp, ChevronDown } from 'lucide-react';
import { Button, Input, Select } from '../shared/UI';
import { MATCH_TYPE_OPTIONS } from '../../constants/matchTypes';
import { FORMATS, FORMAT_CONFIGS, getValidFormations, FORMATION_DEFINITIONS } from '../../constants/teamConfiguration';
import { getMatchDetails, updateMatchDetails, updatePlayerMatchStat } from '../../services/matchStateManager';

const SmartTimeInput = ({ value, onChange, className = '' }) => {
  const [displayValue, setDisplayValue] = useState('');

  React.useEffect(() => {
    const totalSeconds = Math.round((value || 0) * 60);
    if (totalSeconds >= 3600) { // 60 minutes or more
      const hours = Math.floor(totalSeconds / 3600);
      const mins = Math.floor((totalSeconds % 3600) / 60);
      const secs = totalSeconds % 60;
      setDisplayValue(`${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    } else {
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      setDisplayValue(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    }
  }, [value]);

  const parseTimeInput = (input) => {
    if (!input) return 0;

    // If no colon, treat as minutes only
    if (!input.includes(':')) {
      const minutes = parseInt(input, 10) || 0;
      return minutes;
    }

    const parts = input.split(':');

    // If two colons, parse as HH:MM:SS
    if (parts.length === 3) {
      const [hours, mins, secs] = parts.map(num => parseInt(num, 10) || 0);
      return (hours * 60) + mins + (secs / 60);
    }

    // Parse MM:SS format
    const [mins, secs] = parts.map(num => parseInt(num, 10) || 0);
    return mins + (secs / 60);
  };

  const handleBlur = (e) => {
    const inputValue = e.target.value.trim();
    const parsedMinutes = parseTimeInput(inputValue);

    // Format and update display
    const totalSeconds = Math.round(parsedMinutes * 60);
    let formatted;
    if (totalSeconds >= 3600) { // 60 minutes or more
      const hours = Math.floor(totalSeconds / 3600);
      const mins = Math.floor((totalSeconds % 3600) / 60);
      const secs = totalSeconds % 60;
      formatted = `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    setDisplayValue(formatted);
    onChange(parsedMinutes);
  };

  return (
    <Input
      type="text"
      value={displayValue}
      onChange={(e) => setDisplayValue(e.target.value)}
      onBlur={handleBlur}
      className={`w-20 text-center font-mono ${className}`}
      placeholder="0:00:00"
    />
  );
};


const VENUE_OPTIONS = [
  { value: 'home', label: 'Home' },
  { value: 'away', label: 'Away' },
  { value: 'neutral', label: 'Neutral' }
];
const STARTING_ROLES = ['Goalkeeper', 'Defender', 'Midfielder', 'Attacker', 'Substitute'];

// Helper function to get formation options for selected format
const getFormationOptionsForFormat = (format) => {
  const validFormations = getValidFormations(format, 15); // Use max squad size to get all formations
  return validFormations.map(formation => ({
    value: formation,
    label: FORMATION_DEFINITIONS[formation]?.label || formation
  }));
};

// Helper function to get format options
const getFormatOptions = () => {
  return Object.values(FORMATS).map(format => ({
    value: format,
    label: FORMAT_CONFIGS[format]?.label || format
  }));
};

// Helper function to convert total minutes to HH:MM:SS format
const formatTimeAsHours = (minutes) => {
  const totalSeconds = Math.round(minutes * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatTimeAsMinutesSeconds = (minutes) => {
  const totalSeconds = Math.round(minutes * 60);

  if (totalSeconds >= 3600) { // 60 minutes or more
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
};


export function MatchDetailsView({ matchId, onNavigateBack }) {
  const [isEditing, setIsEditing] = useState(false);
  const [matchData, setMatchData] = useState(null);
  const [editData, setEditData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [saveError, setSaveError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch match data from database
  useEffect(() => {
    async function fetchMatchData() {
      if (!matchId) {
        setError('No match ID provided');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const result = await getMatchDetails(matchId);

      if (result.success) {
        const data = {
          ...result.match,
          playerStats: result.playerStats
        };
        setMatchData(data);
        setEditData(data);
      } else {
        setError(result.error || 'Failed to load match details');
      }

      setLoading(false);
    }

    fetchMatchData();
  }, [matchId]);

  if (loading) {
    return (
      <div className="text-center py-8 text-slate-400">
        <p>Loading match details...</p>
      </div>
    );
  }

  if (error || !matchData || !editData) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400 mb-2">{error || 'Match not found'}</p>
        <Button onClick={onNavigateBack} variant="secondary" className="mt-4">
          Back to Match History
        </Button>
      </div>
    );
  }

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      // Update match details
      const matchResult = await updateMatchDetails(matchId, {
        opponent: editData.opponent,
        goalsScored: editData.goalsScored,
        goalsConceded: editData.goalsConceded,
        venueType: editData.venueType,
        type: editData.type,
        format: editData.format,
        formation: editData.formation,
        periods: editData.periods,
        periodDuration: editData.periodDuration,
        matchDurationSeconds: editData.matchDurationSeconds,
        date: editData.date,
        time: editData.time
      });

      if (!matchResult.success) {
        throw new Error(matchResult.error || 'Failed to update match details');
      }

      // Update player stats for each player
      for (const player of editData.playerStats) {
        const playerResult = await updatePlayerMatchStat(matchId, player.playerId, {
          goalsScored: player.goalsScored,
          timeAsDefender: player.timeAsDefender,
          timeAsMidfielder: player.timeAsMidfielder,
          timeAsAttacker: player.timeAsAttacker,
          timeAsGoalkeeper: player.timeAsGoalkeeper,
          startingRole: player.startingRole,
          wasCaptain: player.wasCaptain,
          receivedFairPlayAward: player.receivedFairPlayAward
        });

        if (!playerResult.success) {
          throw new Error(playerResult.error || `Failed to update stats for ${player.name}`);
        }
      }

      // Refresh data from database
      const result = await getMatchDetails(matchId);
      if (result.success) {
        const data = {
          ...result.match,
          playerStats: result.playerStats
        };
        setMatchData(data);
        setEditData(data);
      }

      setIsEditing(false);
    } catch (err) {
      console.error('Error saving match data:', err);
      setSaveError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditData({
      ...matchData,
      playerStats: [...matchData.playerStats]
    });
    setSaveError(null);
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
      playerStats: prev.playerStats.map(player => {
        if (player.id === playerId) {
          const updatedPlayer = { ...player, [field]: value };

          // If updating role times, recalculate total time (excluding goalie time)
          if (['timeAsDefender', 'timeAsMidfielder', 'timeAsAttacker', 'timeAsGoalkeeper'].includes(field)) {
            updatedPlayer.totalTimePlayed =
              (updatedPlayer.timeAsDefender || 0) +
              (updatedPlayer.timeAsMidfielder || 0) +
              (updatedPlayer.timeAsAttacker || 0);
          }

          return updatedPlayer;
        }
        return player;
      })
    }));
  };

  const getMaxMatchDuration = () => {
    return (editData.matchDurationSeconds || 0) / 60;
  };

  const checkTimeInconsistency = (player) => {
    const maxDuration = getMaxMatchDuration();
    return player.totalTimePlayed > maxDuration;
  };

  const formatScore = () => {
    // Always show team goals first (left), opponent goals second (right)
    return `${editData.goalsScored}-${editData.goalsConceded}`;
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

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortedPlayers = () => {
    if (!sortField) return editData.playerStats;

    return [...editData.playerStats].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle string sorting
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      let result = 0;
      if (aValue < bValue) result = -1;
      if (aValue > bValue) result = 1;

      return sortDirection === 'desc' ? -result : result;
    });
  };

  const SortableHeader = ({ children, field, align = 'center' }) => {
    const isActive = sortField === field;
    const showSort = field && !['wasCaptain', 'receivedFairPlayAward'].includes(field);
    const alignClass = align === 'left' ? 'text-left' : 'text-center';
    const justifyClass = align === 'left' ? 'justify-start' : 'justify-center';

    return (
      <th className={`px-3 py-2 ${alignClass} text-xs font-medium text-sky-200 tracking-wider`}>
        {showSort ? (
          <button
            onClick={() => handleSort(field)}
            className={`flex items-center ${justifyClass} space-x-1 hover:text-sky-100 transition-colors w-full`}
          >
            <span>{children}</span>
            {isActive && (
              sortDirection === 'asc' ?
                <ChevronUp className="h-3 w-3" /> :
                <ChevronDown className="h-3 w-3" />
            )}
          </button>
        ) : (
          <span>{children}</span>
        )}
      </th>
    );
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
            <div className="flex items-center space-x-2">
              <ChartColumn className="h-6 w-6 text-sky-400" />
              <h2 className="text-2xl font-bold text-sky-400">Match Details</h2>
            </div>
            <p className="text-slate-400 text-sm">{editData.opponent}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {isEditing ? (
            <>
              <Button
                onClick={handleSave}
                Icon={Save}
                variant="primary"
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                onClick={handleCancel}
                Icon={X}
                variant="secondary"
                disabled={isSaving}
              >
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

      {/* Save Error Message */}
      {saveError && (
        <div className="bg-red-900/50 border border-red-600 rounded-lg p-4">
          <p className="text-red-200 font-medium">Error saving changes:</p>
          <p className="text-red-300 text-sm mt-1">{saveError}</p>
        </div>
      )}

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
                    value={editData.goalsScored}
                    onChange={(e) => updateMatchDetail('goalsScored', parseInt(e.target.value) || 0)}
                    className="w-16 text-center"
                    min="0"
                  />
                  <span className="text-slate-400 text-xl">-</span>
                  <Input
                    type="number"
                    value={editData.goalsConceded}
                    onChange={(e) => updateMatchDetail('goalsConceded', parseInt(e.target.value) || 0)}
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
                    <div className="text-slate-100 font-mono flex flex-col sm:flex-row sm:space-x-2">
                      <span>{editData.date}</span>
                      <span className="text-slate-300">{editData.time}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Details Row */}
        <div className="px-4 py-3 border-t border-slate-600">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="flex items-center space-x-2">
              <Trophy className="h-4 w-4 text-slate-400" />
              <div>
                <div className="text-xs text-slate-400 tracking-wide">Type</div>
                {isEditing ? (
                  <Select
                    value={editData.type}
                    onChange={(value) => updateMatchDetail('type', value)}
                    options={MATCH_TYPE_OPTIONS.map(option => ({
                      value: option.value,
                      label: option.label
                    }))}
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
                <div className="text-xs text-slate-400 tracking-wide">Venue</div>
                {isEditing ? (
                  <Select
                    value={editData.venueType}
                    onChange={(value) => updateMatchDetail('venueType', value)}
                    options={VENUE_OPTIONS}
                    className="text-sm"
                  />
                ) : (
                  <div className="text-sm text-slate-100 font-medium">
                    {editData.venueType === 'home' ? 'Home' : editData.venueType === 'neutral' ? 'Neutral' : 'Away'}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Layers2 className="h-4 w-4 text-slate-400" />
              <div>
                <div className="text-xs text-slate-400 tracking-wide">Format</div>
                {isEditing ? (
                  <Select
                    value={editData.format}
                    onChange={(value) => updateMatchDetail('format', value)}
                    options={getFormatOptions()}
                    className="text-sm"
                  />
                ) : (
                  <div className="text-sm text-slate-100 font-medium">{editData.format}</div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Layers className="h-4 w-4 text-slate-400" />
              <div>
                <div className="text-xs text-slate-400 tracking-wide">Formation</div>
                {isEditing ? (
                  <Select
                    value={editData.formation}
                    onChange={(value) => updateMatchDetail('formation', value)}
                    options={getFormationOptionsForFormat(editData.format)}
                    className="text-sm"
                  />
                ) : (
                  <div className="text-sm text-slate-100 font-medium">{editData.formation}</div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-slate-400" />
              <div>
                <div className="text-xs text-slate-400 tracking-wide">Periods</div>
                {isEditing ? (
                  <Input
                    type="number"
                    value={editData.periods}
                    onChange={(e) => updateMatchDetail('periods', parseInt(e.target.value) || 0)}
                    className="text-sm"
                    min="1"
                  />
                ) : (
                  <div className="text-sm text-slate-100 font-medium">{editData.periods}</div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-slate-400" />
              <div>
                <div className="text-xs text-slate-400 tracking-wide">Total Time</div>
                {isEditing ? (
                  <SmartTimeInput
                    value={(editData.matchDurationSeconds || 0) / 60}
                    onChange={(minutes) => updateMatchDetail('matchDurationSeconds', minutes * 60)}
                    className="text-sm"
                  />
                ) : (
                  <div className="text-sm text-slate-100 font-medium">
                    {formatTimeAsHours((editData.matchDurationSeconds || 0) / 60)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Player Statistics */}
      <div className="bg-slate-700 rounded-lg border border-slate-600 overflow-hidden">
        <div className="p-4 border-b border-slate-600">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-sky-400" />
            <h3 className="text-lg font-semibold text-sky-400">Player Statistics</h3>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Individual player performance for this match
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-800">
              <tr>
                <SortableHeader field="name" align="left">Player</SortableHeader>
                <SortableHeader field="goalsScored">Goals</SortableHeader>
                <SortableHeader field="totalTimePlayed">Total Time</SortableHeader>
                <SortableHeader field="timeAsDefender">Defender</SortableHeader>
                <SortableHeader field="timeAsMidfielder">Midfielder</SortableHeader>
                <SortableHeader field="timeAsAttacker">Attacker</SortableHeader>
                <SortableHeader field="timeAsGoalkeeper">Goalkeeper</SortableHeader>
                <SortableHeader field="startingRole">Starting Role</SortableHeader>
                <SortableHeader field="wasCaptain">Captain</SortableHeader>
                <SortableHeader field="receivedFairPlayAward">Fair Play</SortableHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-600">
              {getSortedPlayers().map((player, index) => (
                <tr
                  key={player.id}
                  className={`${
                    index % 2 === 0 ? 'bg-slate-700' : 'bg-slate-800'
                  } hover:bg-slate-600 transition-colors`}
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-slate-400" />
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
                      <div className="flex flex-col items-center space-y-1">
                        <span className="text-slate-300 font-mono">{formatTimeAsMinutesSeconds(player.totalTimePlayed)}</span>
                        {checkTimeInconsistency(player) && (
                          <div className="text-xs text-red-400 text-center">
                            ⚠️ Exceeds match duration
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-300 font-mono">{formatTimeAsMinutesSeconds(player.totalTimePlayed)}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-center">
                    {isEditing ? (
                      <SmartTimeInput
                        value={player.timeAsDefender}
                        onChange={(minutes) => updatePlayerStat(player.id, 'timeAsDefender', minutes)}
                      />
                    ) : (
                      <span className="text-slate-300 font-mono">{formatTimeAsMinutesSeconds(player.timeAsDefender)}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-center">
                    {isEditing ? (
                      <SmartTimeInput
                        value={player.timeAsMidfielder}
                        onChange={(minutes) => updatePlayerStat(player.id, 'timeAsMidfielder', minutes)}
                      />
                    ) : (
                      <span className="text-slate-300 font-mono">{formatTimeAsMinutesSeconds(player.timeAsMidfielder)}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-center">
                    {isEditing ? (
                      <SmartTimeInput
                        value={player.timeAsAttacker}
                        onChange={(minutes) => updatePlayerStat(player.id, 'timeAsAttacker', minutes)}
                      />
                    ) : (
                      <span className="text-slate-300 font-mono">{formatTimeAsMinutesSeconds(player.timeAsAttacker)}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-center">
                    {isEditing ? (
                      <SmartTimeInput
                        value={player.timeAsGoalkeeper}
                        onChange={(minutes) => updatePlayerStat(player.id, 'timeAsGoalkeeper', minutes)}
                      />
                    ) : (
                      <span className="text-slate-300 font-mono">{formatTimeAsMinutesSeconds(player.timeAsGoalkeeper)}</span>
                    )}
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
                      player.wasCaptain && <span className="text-yellow-400 font-bold text-lg mx-auto block text-center">C</span>
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
