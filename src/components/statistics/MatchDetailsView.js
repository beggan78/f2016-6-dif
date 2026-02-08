import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { ArrowLeft, Edit, Save, X, Calendar, MapPin, Trophy, Users, User, Clock, Award, Layers2, Layers, ChartColumn, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, Input, Select, ConfirmationModal } from '../shared/UI';
import { getOutcomeBadgeClasses } from '../../utils/badgeUtils';
import { getMatchTypeOptions, DEFAULT_MATCH_TYPE } from '../../constants/matchTypes';
import { FORMATS, FORMAT_CONFIGS, getValidFormations, FORMATION_DEFINITIONS } from '../../constants/teamConfiguration';
import { getMatchDetails, updateMatchDetails, updatePlayerMatchStatsBatch, createManualMatch, calculateMatchOutcome, deleteFinishedMatch } from '../../services/matchStateManager';

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

const getSafeGoalValue = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return 0;
    }
    const parsed = parseInt(trimmed, 10);
    return Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
  }

  return 0;
};


// VENUE_OPTIONS is built inside the component with translations
const STARTING_ROLES = ['Goalkeeper', 'Defender', 'Midfielder', 'Attacker', 'Substitute'];

const DEFAULT_PERIODS = 3;
const DEFAULT_PERIOD_DURATION = 15;
const DEFAULT_FORMAT = FORMATS.FORMAT_5V5;
const DEFAULT_STARTING_ROLE = STARTING_ROLES[4];

const normalizeIntegerValue = (value, fallback = 0) => {
  if (value === '' || value === null || value === undefined) {
    return fallback;
  }
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return Math.max(0, parsed);
};

const normalizeFloatValue = (value, fallback = 0) => {
  if (value === '' || value === null || value === undefined) {
    return fallback;
  }
  const parsed = parseFloat(value);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return Math.max(0, parsed);
};

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

const resolvePlayerDisplayName = (player, fallback = 'Unnamed Player') => {
  if (!player) {
    return fallback;
  }

  return player.displayName ||
    player.display_name ||
    player.firstName ||
    player.first_name ||
    fallback;
};


export function MatchDetailsView({
  matchId,
  onNavigateBack,
  mode = 'view',
  teamId,
  teamPlayers = [],
  onManualMatchCreated,
  onMatchUpdated,
  onMatchDeleted
}) {
  const { t } = useTranslation('navigation');
  const { t: tStats } = useTranslation('statistics');
  const isCreateMode = mode === 'create';

  const unnamedPlayerLabel = tStats('matchDetails.unnamedPlayer');

  const VENUE_OPTIONS = useMemo(() => [
    { value: 'home', label: tStats('matchDetails.venues.home') },
    { value: 'away', label: tStats('matchDetails.venues.away') },
    { value: 'neutral', label: tStats('matchDetails.venues.neutral') }
  ], [tStats]);

  const ROLE_LABEL_MAP = useMemo(() => ({
    Goalkeeper: tStats('matchDetails.playerStats.goalkeeper'),
    Defender: tStats('matchDetails.playerStats.defender'),
    Midfielder: tStats('matchDetails.playerStats.midfielder'),
    Attacker: tStats('matchDetails.playerStats.attacker'),
    Substitute: tStats('matchDetails.playerStats.substitute')
  }), [tStats]);

  const startingRoleOptions = useMemo(() =>
    STARTING_ROLES.map(role => ({
      value: role,
      label: ROLE_LABEL_MAP[role] || role
    })),
    [ROLE_LABEL_MAP]
  );

  const [playerToAdd, setPlayerToAdd] = useState('');

  const defaultPlayerStats = useMemo(() => {
    return (Array.isArray(teamPlayers) ? teamPlayers : []).map((player, index) => ({
      id: player.id || `player-${index}`,
      playerId: player.id,
      displayName: resolvePlayerDisplayName(player, unnamedPlayerLabel),
      goalsScored: 0,
      totalTimePlayed: 0,
      timeAsDefender: 0,
      timeAsMidfielder: 0,
      timeAsAttacker: 0,
      timeAsGoalkeeper: 0,
      startingRole: DEFAULT_STARTING_ROLE,
      wasCaptain: false,
      receivedFairPlayAward: false
    }));
  }, [teamPlayers, unnamedPlayerLabel]);

  const createModeDefaults = useMemo(() => {
    if (!isCreateMode) {
      return null;
    }

    const now = new Date();
    const isoDate = now.toISOString();
    const defaultFormation = FORMAT_CONFIGS[DEFAULT_FORMAT]?.defaultFormation || '2-2';
    const durationSeconds = DEFAULT_PERIODS * DEFAULT_PERIOD_DURATION * 60;

    return {
      id: null,
      opponent: '',
      goalsScored: 0,
      goalsConceded: 0,
      venueType: 'home',
      type: DEFAULT_MATCH_TYPE,
      format: DEFAULT_FORMAT,
      formation: defaultFormation,
      periods: DEFAULT_PERIODS,
      periodDuration: DEFAULT_PERIOD_DURATION,
      matchDurationSeconds: durationSeconds,
      date: isoDate.split('T')[0],
      time: isoDate.slice(11, 16),
      outcome: 'D',
      playerStats: defaultPlayerStats
    };
  }, [defaultPlayerStats, isCreateMode]);

  const [isEditing, setIsEditing] = useState(isCreateMode);
  const [matchData, setMatchData] = useState(() => (isCreateMode ? createModeDefaults : null));
  const [editData, setEditData] = useState(() => (isCreateMode ? createModeDefaults : null));
  const [loading, setLoading] = useState(!isCreateMode);
  const [error, setError] = useState(null);
  const [sortField, setSortField] = useState('displayName');
  const [sortDirection, setSortDirection] = useState('asc');
  const [saveError, setSaveError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [goalWarning, setGoalWarning] = useState(null);
  const [roleWarning, setRoleWarning] = useState(null);
  const assignedPlayerIds = useMemo(() => {
    return new Set((editData?.playerStats || []).map(player => player.playerId));
  }, [editData?.playerStats]);

  const availablePlayers = useMemo(() => {
    return (teamPlayers || [])
      .filter(player => !assignedPlayerIds.has(player.id))
      .map(player => ({
        ...player,
        displayName: resolvePlayerDisplayName(player, unnamedPlayerLabel)
      }));
  }, [teamPlayers, assignedPlayerIds, unnamedPlayerLabel]);

  // Initialise create mode defaults when roster data becomes available
  useEffect(() => {
    if (!isCreateMode) {
      return;
    }

    if (createModeDefaults) {
      setMatchData((prev) => {
        if (prev && Array.isArray(prev.playerStats) && prev.playerStats.length > 0) {
          return prev;
        }
        return createModeDefaults;
      });

      setEditData((prev) => {
        if (prev && Array.isArray(prev.playerStats) && prev.playerStats.length > 0) {
          return prev;
        }
        return createModeDefaults;
      });
    }

    setLoading(false);
    setError(null);
  }, [createModeDefaults, isCreateMode]);

  // Fetch match data from database when viewing existing records
  useEffect(() => {
    if (isCreateMode) {
      return;
    }

    if (!matchId) {
      setError(tStats('matchDetails.noMatchId'));
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function fetchMatchData() {
      setLoading(true);
      setError(null);
      setSaveError(null);
      setMatchData(null);
      setEditData(null);

      const result = await getMatchDetails(matchId);

      if (!isMounted) {
        return;
      }

      if (result.success) {
        const normalizedPlayerStats = (result.playerStats || []).map((player, index) => ({
          ...player,
          id: player.playerId || player.id || `player-${index}`
        }));
        const data = {
          ...result.match,
          playerStats: normalizedPlayerStats
        };
        setMatchData(data);
        setEditData(data);
      } else {
        setError(result.error || tStats('matchDetails.failedToLoadDetails'));
      }

      setLoading(false);
    }

    fetchMatchData();

    return () => {
      isMounted = false;
    };
  }, [isCreateMode, matchId, tStats]);

  useEffect(() => {
    if (playerToAdd && !availablePlayers.some(player => player.id === playerToAdd)) {
      setPlayerToAdd('');
    }
  }, [availablePlayers, playerToAdd]);

  const evaluateGoalConsistency = useCallback((data) => {
    if (!isEditing || !data) {
      setGoalWarning(null);
      return;
    }

    const teamGoals = getSafeGoalValue(data.goalsScored);
    const playerGoals = (data.playerStats || []).reduce(
      (sum, player) => sum + getSafeGoalValue(player?.goalsScored),
      0
    );

    if (playerGoals > teamGoals) {
      setGoalWarning({ teamGoals, playerGoals });
    } else {
      setGoalWarning(null);
    }
  }, [isEditing]);

  const evaluateRoleConsistency = useCallback((data) => {
    if (!isEditing || !data) {
      setRoleWarning(null);
      return;
    }

    const playerStats = data.playerStats || [];

    // Count goalies
    const goalieCount = playerStats.filter(p => p.startingRole === 'Goalkeeper').length;

    // Count outfield players (Defender, Midfielder, Attacker)
    const outfieldCount = playerStats.filter(p =>
      ['Defender', 'Midfielder', 'Attacker'].includes(p.startingRole)
    ).length;

    // Determine expected outfield count based on format
    const format = data.format || DEFAULT_FORMAT;
    const expectedOutfieldCount = format === FORMATS.FORMAT_5V5 ? 4 : 6;

    const issues = [];

    if (goalieCount !== 1) {
      issues.push(tStats('matchDetails.playerStats.goalkeeperCountIssue', { count: goalieCount }));
    }

    if (outfieldCount !== expectedOutfieldCount) {
      issues.push(tStats('matchDetails.playerStats.outfieldCountIssue', { count: outfieldCount, expected: expectedOutfieldCount, format }));
    }

    if (issues.length > 0) {
      setRoleWarning({ issues });
    } else {
      setRoleWarning(null);
    }
  }, [isEditing, tStats]);

  // Check for goal and role inconsistencies when entering/leaving edit mode
  useEffect(() => {
    if (!isEditing) {
      setGoalWarning(null);
      setRoleWarning(null);
    } else {
      // When entering edit mode, check for inconsistencies
      evaluateGoalConsistency(editData);
      evaluateRoleConsistency(editData);
    }
  }, [isEditing, editData, evaluateGoalConsistency, evaluateRoleConsistency]);

  if (loading) {
    return (
      <div className="text-center py-8 text-slate-400">
        <p>{tStats('matchDetails.loading')}</p>
      </div>
    );
  }

  if (error || !matchData || !editData) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400 mb-2">{error || tStats('matchDetails.notFound')}</p>
        <Button onClick={onNavigateBack} variant="secondary" className="mt-4">
          {t('backTo.matchHistory')}
        </Button>
      </div>
    );
  }

  const handleSave = async () => {
    if (!editData) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const sanitizedMatch = sanitizeMatchDetailsForSave(editData);
      const sanitizedPlayerStats = sanitizedMatch.playerStats;

      if (isCreateMode || !matchId) {
        if (!teamId) {
          throw new Error(tStats('matchDetails.teamRequired'));
        }

        const fairPlayAwardPlayerId = sanitizedPlayerStats.find((player) => player.receivedFairPlayAward)?.playerId || null;
        const captainPlayerId = sanitizedPlayerStats.find((player) => player.wasCaptain)?.playerId || null;

        const manualResult = await createManualMatch({
          ...sanitizedMatch,
          teamId,
          fairPlayAwardPlayerId,
          captainId: captainPlayerId
        }, sanitizedPlayerStats);

        if (!manualResult.success) {
          throw new Error(manualResult.error || tStats('matchDetails.failedToCreate'));
        }

        setMatchData(sanitizedMatch);
        setEditData(sanitizedMatch);
        setIsEditing(false);

        if (onManualMatchCreated) {
          onManualMatchCreated(manualResult.matchId);
        }

        return;
      }

      const matchResult = await updateMatchDetails(matchId, {
        opponent: sanitizedMatch.opponent,
        goalsScored: sanitizedMatch.goalsScored,
        goalsConceded: sanitizedMatch.goalsConceded,
        venueType: sanitizedMatch.venueType,
        type: sanitizedMatch.type,
        format: sanitizedMatch.format,
        formation: sanitizedMatch.formation,
        periods: sanitizedMatch.periods,
        periodDuration: sanitizedMatch.periodDuration,
        matchDurationSeconds: sanitizedMatch.matchDurationSeconds,
        date: sanitizedMatch.date,
        time: sanitizedMatch.time
      });

      if (!matchResult.success) {
        throw new Error(matchResult.error || tStats('matchDetails.failedToUpdateDetails'));
      }

      const playerResult = await updatePlayerMatchStatsBatch(matchId, sanitizedPlayerStats);

      if (!playerResult.success) {
        throw new Error(playerResult.error || tStats('matchDetails.failedToUpdatePlayerStats'));
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

      if (onMatchUpdated) {
        onMatchUpdated();
      }
    } catch (err) {
      console.error('Error saving match data:', err);
      setSaveError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (isCreateMode) {
      if (onNavigateBack) {
        onNavigateBack();
      }
      return;
    }

    if (!matchData) {
      if (onNavigateBack) {
        onNavigateBack();
      }
      return;
    }

    const safePlayerStats = Array.isArray(matchData.playerStats) ? matchData.playerStats : [];

    setEditData({
      ...matchData,
      playerStats: safePlayerStats.map((player) => ({ ...player }))
    });
    setSaveError(null);
    setIsEditing(false);
  };

  const updateMatchDetail = (field, value, options = {}) => {
    const { validateGoals = false } = options;

    setEditData((prev) => {
      if (!prev) {
        return prev;
      }

      const updated = {
        ...prev,
        [field]: value
      };

      if (field === 'format') {
        const options = getFormationOptionsForFormat(value);
        if (options.length > 0 && !options.some((option) => option.value === updated.formation)) {
          updated.formation = options[0].value;
        }
      }

      if (field === 'goalsScored' || field === 'goalsConceded') {
        const goalsFor = field === 'goalsScored' ? value : updated.goalsScored;
        const goalsAgainst = field === 'goalsConceded' ? value : updated.goalsConceded;
        const outcome = calculateMatchOutcome(goalsFor || 0, goalsAgainst || 0);
        updated.outcome = outcome === 'win' ? 'W' : outcome === 'draw' ? 'D' : 'L';
      }

      if (validateGoals && field === 'goalsScored') {
        evaluateGoalConsistency(updated);
      }

      return updated;
    });
  };

  const handleMatchIntegerChange = (field) => (event) => {
    const { value } = event.target;
    if (value === '') {
      updateMatchDetail(field, '');
      return;
    }

    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      updateMatchDetail(field, '');
      return;
    }

    updateMatchDetail(field, Math.max(0, parsed));
  };

  const handleMatchIntegerBlur = (field, fallback = 0) => () => {
    if (!editData) {
      return;
    }

    const normalized = normalizeIntegerValue(editData[field], fallback);
    updateMatchDetail(field, normalized, {
      validateGoals: field === 'goalsScored'
    });
  };

  const handlePlayerIntegerChange = (playerId, field) => (event) => {
    const { value } = event.target;
    if (value === '') {
      updatePlayerStat(playerId, field, '');
      return;
    }

    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      updatePlayerStat(playerId, field, '');
      return;
    }

    updatePlayerStat(playerId, field, Math.max(0, parsed));
  };

  const handlePlayerIntegerBlur = (playerId, field, fallback = 0) => () => {
    const player = editData?.playerStats?.find((p) => p.id === playerId);
    if (!player) {
      return;
    }

    const normalized = normalizeIntegerValue(player[field], fallback);
    updatePlayerStat(playerId, field, normalized, {
      validateGoals: field === 'goalsScored'
    });
  };

  const sanitizePlayerStatsForSave = (stats = []) => {
    return (stats || []).map((player) => {
      const timeAsDefender = normalizeFloatValue(player.timeAsDefender, 0);
      const timeAsMidfielder = normalizeFloatValue(player.timeAsMidfielder, 0);
      const timeAsAttacker = normalizeFloatValue(player.timeAsAttacker, 0);
      const timeAsGoalkeeper = normalizeFloatValue(player.timeAsGoalkeeper, 0);
      const totalTimePlayed = timeAsDefender + timeAsMidfielder + timeAsAttacker;

      return {
        ...player,
        goalsScored: normalizeIntegerValue(player.goalsScored, 0),
        timeAsDefender,
        timeAsMidfielder,
        timeAsAttacker,
        timeAsGoalkeeper,
        totalTimePlayed,
        wasCaptain: Boolean(player.wasCaptain),
        receivedFairPlayAward: Boolean(player.receivedFairPlayAward)
      };
    });
  };

  const sanitizeMatchDetailsForSave = (data) => {
    const sanitizedPlayerStats = sanitizePlayerStatsForSave(data.playerStats);
    const sanitizedPeriods = normalizeIntegerValue(data.periods, DEFAULT_PERIODS);
    const sanitizedPeriodDuration = normalizeIntegerValue(data.periodDuration, DEFAULT_PERIOD_DURATION);
    const sanitizedGoalsScored = normalizeIntegerValue(data.goalsScored, 0);
    const sanitizedGoalsConceded = normalizeIntegerValue(data.goalsConceded, 0);
    const sanitizedMatchDurationSeconds = normalizeFloatValue(
      data.matchDurationSeconds,
      sanitizedPeriods * sanitizedPeriodDuration * 60
    );

    return {
      ...data,
      goalsScored: sanitizedGoalsScored,
      goalsConceded: sanitizedGoalsConceded,
      periods: sanitizedPeriods,
      periodDuration: sanitizedPeriodDuration,
      matchDurationSeconds: sanitizedMatchDurationSeconds,
      playerStats: sanitizedPlayerStats
    };
  };

  const updatePlayerStat = (playerRowId, field, value, options = {}) => {
    const { validateGoals = false, validateRoles = false } = options;

    setEditData(prev => {
      if (!prev) {
        return prev;
      }

      const nextPlayerStats = Array.isArray(prev.playerStats)
        ? prev.playerStats.map(player => {
            if (player.id !== playerRowId) {
              return player;
            }

            const updatedPlayer = { ...player, [field]: value };

            // If updating role times, recalculate total time (excluding goalie time)
            if (['timeAsDefender', 'timeAsMidfielder', 'timeAsAttacker', 'timeAsGoalkeeper'].includes(field)) {
              updatedPlayer.totalTimePlayed =
                (updatedPlayer.timeAsDefender || 0) +
                (updatedPlayer.timeAsMidfielder || 0) +
                (updatedPlayer.timeAsAttacker || 0);
            }

            return updatedPlayer;
          })
        : [];

      const updated = {
        ...prev,
        playerStats: nextPlayerStats
      };

      if (validateGoals && field === 'goalsScored') {
        evaluateGoalConsistency(updated);
      }

      if (validateRoles && field === 'startingRole') {
        evaluateRoleConsistency(updated);
      }

      return updated;
    });
  };

  const handleRemovePlayer = (playerRowId) => {
    setEditData(prev => {
      if (!prev) {
        return prev;
      }

      const nextPlayerStats = Array.isArray(prev.playerStats)
        ? prev.playerStats.filter(player => player.id !== playerRowId)
        : [];

      const updated = {
        ...prev,
        playerStats: nextPlayerStats
      };

      evaluateGoalConsistency(updated);

      return updated;
    });
  };

  const handleAddPlayer = () => {
    if (!playerToAdd) {
      return;
    }

    const rosterPlayer = (teamPlayers || []).find(player => player.id === playerToAdd);
    if (!rosterPlayer) {
      return;
    }

    const newPlayerStats = {
      id: rosterPlayer.id,
      playerId: rosterPlayer.id,
      displayName: resolvePlayerDisplayName(rosterPlayer, unnamedPlayerLabel),
      goalsScored: 0,
      totalTimePlayed: 0,
      timeAsDefender: 0,
      timeAsMidfielder: 0,
      timeAsAttacker: 0,
      timeAsGoalkeeper: 0,
      startingRole: DEFAULT_STARTING_ROLE,
      wasCaptain: false,
      receivedFairPlayAward: false
    };

    setEditData(prev => ({
      ...prev,
      playerStats: Array.isArray(prev.playerStats)
        ? [...prev.playerStats, newPlayerStats]
        : [newPlayerStats]
    }));
    setPlayerToAdd('');
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

  const getOutcomeBadge = (outcome) => getOutcomeBadgeClasses(outcome, {
    baseClasses: 'px-2 py-1 rounded text-xs font-medium'
  });

  const getMatchTypeLabel = (type) => {
    const options = getMatchTypeOptions(t);
    const option = options.find(matchType => matchType.value === type);
    if (option) {
      return option.label;
    }

    if (!type) {
      return tStats('matchDetails.unknownType');
    }

    return type.charAt(0).toUpperCase() + type.slice(1);
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
    if (!editData?.playerStats) {
      return [];
    }

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
            {t('back')}
          </Button>
          <div>
            <div className="flex items-center space-x-2">
              <ChartColumn className="h-6 w-6 text-sky-400" />
              <h2 className="text-2xl font-bold text-sky-400">{tStats('matchDetails.title')}</h2>
            </div>
            <p className="text-slate-400 text-sm">{editData.opponent || tStats('matchDetails.newMatch')}</p>
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
                {isSaving ? tStats('matchDetails.saving') : tStats('matchDetails.saveChanges')}
              </Button>
              <Button
                onClick={handleCancel}
                Icon={X}
                variant="secondary"
                disabled={isSaving}
              >
                {tStats('matchDetails.cancel')}
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setIsEditing(true)} Icon={Edit} variant="secondary">
                {tStats('matchDetails.editMatch')}
              </Button>
              {!isCreateMode && (
                <Button
                  onClick={() => {
                    if (isDeleting) return;
                    setDeleteError(null);
                    setIsDeleteModalOpen(true);
                  }}
                  Icon={Trash2}
                  variant="secondary"
                  disabled={isDeleting}
                >
                  {isDeleting ? tStats('matchDetails.deleting') : tStats('matchDetails.delete')}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Save Error Message */}
      {saveError && (
        <div className="bg-red-900/50 border border-red-600 rounded-lg p-4">
          <p className="text-red-200 font-medium">{tStats('matchDetails.errorSaving')}</p>
          <p className="text-red-300 text-sm mt-1">{saveError}</p>
        </div>
      )}

      {/* Delete Error Message */}
      {deleteError && (
        <div className="bg-red-900/50 border border-red-600 rounded-lg p-4">
          <p className="text-red-200 font-medium">{tStats('matchDetails.errorDeleting')}</p>
          <p className="text-red-300 text-sm mt-1">{deleteError}</p>
        </div>
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onCancel={() => {
          if (isDeleting) return;
          setIsDeleteModalOpen(false);
        }}
        onConfirm={async () => {
          if (isDeleting) return;
          setIsDeleting(true);
          setDeleteError(null);

          const result = await deleteFinishedMatch(matchId);

          if (!result.success) {
            setDeleteError(result.error || tStats('matchDetails.failedToDelete'));
            setIsDeleting(false);
            setIsDeleteModalOpen(false);
            return;
          }

          setIsDeleting(false);
          setIsDeleteModalOpen(false);
          if (onMatchDeleted) {
            onMatchDeleted(matchId);
          }
          onNavigateBack();
        }}
        title={tStats('matchDetails.deleteTitle')}
        message={tStats('matchDetails.deleteConfirm')}
        confirmText={isDeleting ? tStats('matchDetails.deletingEllipsis') : tStats('matchDetails.delete')}
        cancelText={tStats('matchDetails.cancel')}
        variant="danger"
      />

      {/* Match Summary */}
      <div className="bg-slate-700 rounded-lg border border-slate-600 overflow-hidden">
        {/* Main Match Info Row */}
        <div className="p-4 bg-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Left: Opponent & Outcome */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                {isEditing ? (
                  <Input
                    type="text"
                    value={editData.opponent}
                    onChange={(e) => updateMatchDetail('opponent', e.target.value)}
                    className="w-48 text-lg font-semibold"
                    placeholder={tStats('matchDetails.opponentName')}
                  />
                ) : (
                  <span className="text-xl font-semibold text-slate-100">{editData.opponent}</span>
                )}
              </div>
              <span className={getOutcomeBadge(editData.outcome)}>
                {editData.outcome === 'W' ? tStats('matchDetails.outcomes.win') :
                 editData.outcome === 'D' ? tStats('matchDetails.outcomes.draw') : tStats('matchDetails.outcomes.loss')}
              </span>
            </div>

            {/* Center: Score */}
            <div className="text-center">
              {isEditing ? (
                <div className="flex items-center justify-center space-x-2">
                  <Input
                    type="number"
                    value={editData.goalsScored === '' ? '' : editData.goalsScored}
                    onChange={handleMatchIntegerChange('goalsScored')}
                    onBlur={handleMatchIntegerBlur('goalsScored', 0)}
                    className="w-16 text-center"
                    min="0"
                  />
                  <span className="text-slate-400 text-xl">-</span>
                  <Input
                    type="number"
                    value={editData.goalsConceded === '' ? '' : editData.goalsConceded}
                    onChange={handleMatchIntegerChange('goalsConceded')}
                    onBlur={handleMatchIntegerBlur('goalsConceded', 0)}
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

        {isEditing && goalWarning && (
          <div className="px-4 py-2 bg-slate-800 border-t border-slate-600 text-xs text-red-300" role="status">
            <div className="flex items-center justify-center gap-2">
              <span aria-hidden="true">⚠️</span>
              <span>
                {tStats('matchDetails.playerStats.goalWarning', { playerGoals: goalWarning.playerGoals, teamGoals: goalWarning.teamGoals })}
              </span>
            </div>
          </div>
        )}

        {isEditing && roleWarning && (
          <div className="px-4 py-2 bg-slate-800 border-t border-slate-600 text-xs text-red-300" role="status">
            <div className="flex items-center justify-center gap-2">
              <span aria-hidden="true">⚠️</span>
              <span>
                {tStats('matchDetails.playerStats.roleWarning', { issues: roleWarning.issues.join(', ') })}
              </span>
            </div>
          </div>
        )}

        {/* Secondary Details Row */}
        <div className="px-4 py-3 border-t border-slate-600">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
            <div className="flex items-center space-x-2">
              <Trophy className="h-4 w-4 text-slate-400" />
              <div>
                <div className="text-xs text-slate-400 tracking-wide">{tStats('matchDetails.type')}</div>
                {isEditing ? (
                  <Select
                    value={editData.type}
                    onChange={(value) => updateMatchDetail('type', value)}
                    options={getMatchTypeOptions(t).map(option => ({
                      value: option.value,
                      label: option.label
                    }))}
                    className="text-sm"
                  />
                ) : (
                  <div className="text-sm text-slate-100 font-medium">{getMatchTypeLabel(editData.type)}</div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-slate-400" />
              <div>
                <div className="text-xs text-slate-400 tracking-wide">{tStats('matchDetails.venue')}</div>
                {isEditing ? (
                  <Select
                    value={editData.venueType}
                    onChange={(value) => updateMatchDetail('venueType', value)}
                    options={VENUE_OPTIONS}
                    className="text-sm"
                  />
                ) : (
                  <div className="text-sm text-slate-100 font-medium">
                    {editData.venueType === 'home' ? tStats('matchDetails.venues.home') : editData.venueType === 'neutral' ? tStats('matchDetails.venues.neutral') : tStats('matchDetails.venues.away')}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Layers2 className="h-4 w-4 text-slate-400" />
              <div>
                <div className="text-xs text-slate-400 tracking-wide">{tStats('matchDetails.format')}</div>
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
                <div className="text-xs text-slate-400 tracking-wide">{tStats('matchDetails.formation')}</div>
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
                <div className="text-xs text-slate-400 tracking-wide">{tStats('matchDetails.periods')}</div>
                {isEditing ? (
                  <Input
                    type="number"
                    value={editData.periods === '' ? '' : editData.periods}
                    onChange={handleMatchIntegerChange('periods')}
                    onBlur={handleMatchIntegerBlur('periods', 1)}
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
                <div className="text-xs text-slate-400 tracking-wide">{tStats('matchDetails.periodDuration')}</div>
                {isEditing ? (
                  <Input
                    type="number"
                    value={editData.periodDuration === '' ? '' : editData.periodDuration}
                    onChange={handleMatchIntegerChange('periodDuration')}
                    onBlur={handleMatchIntegerBlur('periodDuration', DEFAULT_PERIOD_DURATION)}
                    className="text-sm w-16"
                    min="1"
                  />
                ) : (
                  <div className="text-sm text-slate-100 font-medium">{editData.periodDuration} min</div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-slate-400" />
              <div>
                <div className="text-xs text-slate-400 tracking-wide">{tStats('matchDetails.totalTime')}</div>
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
            <h3 className="text-lg font-semibold text-sky-400">{tStats('matchDetails.playerStats.title')}</h3>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            {tStats('matchDetails.playerStats.subtitle')}
          </p>
        </div>

        {isCreateMode && isEditing && (
          <div className="p-4 border-b border-slate-600 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select
                value={playerToAdd}
                onChange={setPlayerToAdd}
                options={availablePlayers.map(player => ({
                  value: player.id,
                  label: resolvePlayerDisplayName(player, unnamedPlayerLabel)
                }))}
                placeholder={availablePlayers.length === 0 ? tStats('matchDetails.playerStats.allPlayersIncluded') : tStats('matchDetails.playerStats.selectPlayer')}
                disabled={availablePlayers.length === 0}
              />
              <Button
                onClick={handleAddPlayer}
                variant="secondary"
                size="sm"
                disabled={!playerToAdd}
              >
                {tStats('matchDetails.playerStats.addPlayer')}
              </Button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-800">
              <tr>
                <SortableHeader field="displayName" align="left">{tStats('matchDetails.playerStats.player')}</SortableHeader>
                <SortableHeader field="goalsScored">{tStats('matchDetails.playerStats.goals')}</SortableHeader>
                <SortableHeader field="totalTimePlayed">{tStats('matchDetails.playerStats.outfieldTime')}</SortableHeader>
                <SortableHeader field="timeAsDefender">{tStats('matchDetails.playerStats.defender')}</SortableHeader>
                <SortableHeader field="timeAsMidfielder">{tStats('matchDetails.playerStats.midfielder')}</SortableHeader>
                <SortableHeader field="timeAsAttacker">{tStats('matchDetails.playerStats.attacker')}</SortableHeader>
                <SortableHeader field="timeAsGoalkeeper">{tStats('matchDetails.playerStats.goalkeeper')}</SortableHeader>
                <SortableHeader field="startingRole">{tStats('matchDetails.playerStats.startingRole')}</SortableHeader>
                <SortableHeader field="wasCaptain">{tStats('matchDetails.playerStats.captain')}</SortableHeader>
                <SortableHeader field="receivedFairPlayAward">{tStats('matchDetails.playerStats.fairPlay')}</SortableHeader>
                {isCreateMode && isEditing && (
                  <th className="px-3 py-2 text-center text-xs font-medium text-sky-200 tracking-wider">
                    {tStats('matchDetails.playerStats.actions')}
                  </th>
                )}
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
                      <span className="text-slate-100 font-medium">{resolvePlayerDisplayName(player, unnamedPlayerLabel)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-center">
                    {isEditing ? (
                      <Input
                        type="number"
                        value={player.goalsScored === '' ? '' : player.goalsScored}
                        onChange={handlePlayerIntegerChange(player.id, 'goalsScored')}
                        onBlur={handlePlayerIntegerBlur(player.id, 'goalsScored', 0)}
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
                            {tStats('matchDetails.playerStats.exceedsMatchDuration')}
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
                        onChange={(value) => updatePlayerStat(player.id, 'startingRole', value, { validateRoles: true })}
                        options={startingRoleOptions}
                      />
                    ) : (
                      <span className="text-slate-300 text-sm">{ROLE_LABEL_MAP[player.startingRole] || player.startingRole}</span>
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
                  {isCreateMode && isEditing && (
                    <td className="px-3 py-2 whitespace-nowrap text-center">
                      <Button
                        onClick={() => handleRemovePlayer(player.id)}
                        Icon={Trash2}
                        variant="secondary"
                        size="sm"
                      >
                        {tStats('matchDetails.playerStats.remove')}
                      </Button>
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

MatchDetailsView.propTypes = {
  matchId: PropTypes.string,
  onNavigateBack: PropTypes.func.isRequired,
  mode: PropTypes.oneOf(['view', 'create']),
  teamId: PropTypes.string,
  teamPlayers: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string
  })),
  onManualMatchCreated: PropTypes.func,
  onMatchUpdated: PropTypes.func,
  onMatchDeleted: PropTypes.func
};
