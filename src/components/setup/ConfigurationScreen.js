import React, { useState, useEffect, useRef } from 'react';
import { Settings, Play, Shuffle, Cloud, Upload, Layers, UserPlus, Save, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Select, Button, NotificationModal, ThreeOptionModal } from '../shared/UI';
import { PERIOD_OPTIONS, DURATION_OPTIONS, getAlertOptions } from '../../constants/gameConfig';
import { FORMATIONS, FORMATS, FORMAT_CONFIGS, getValidFormations, FORMATION_DEFINITIONS, createTeamConfig, getMinimumPlayersForFormat, getMaximumPlayersForFormat } from '../../constants/teamConfiguration';
import { getInitialFormationTemplate } from '../../constants/gameModes';
import { sanitizeNameInput } from '../../utils/inputSanitization';
import { getRandomPlayers, randomizeGoalieAssignments } from '../../utils/debugUtils';
import { formatPlayerName } from '../../utils/formatUtils';
import { shouldShowRosterConnectorOnboarding } from '../../utils/playerUtils';
import { scrollToTopSmooth } from '../../utils/scrollUtils';
import { createPersistenceManager } from '../../utils/persistenceManager';
import { copyLiveMatchUrlToClipboard } from '../../utils/liveMatchLinkUtils';
import { convertTeamPlayerToGamePlayer } from '../../utils/playerSyncUtils';
import { useAuth } from '../../contexts/AuthContext';
import { useTeam } from '../../contexts/TeamContext';
import { useFormationVotes } from '../../hooks/useFormationVotes';
import { TeamManagement } from '../team/TeamManagement';
import { RosterConnectorOnboarding } from '../team/RosterConnectorOnboarding';
import { UnmappedPlayersBanner } from '../team/UnmappedPlayersBanner';
import { dataSyncManager } from '../../utils/DataSyncManager';
import { FeatureGate } from '../auth/FeatureGate';
import { FormationPreview } from './FormationPreview';
import { OpponentNameAutocomplete } from './OpponentNameAutocomplete';
import FeatureVoteModal from '../shared/FeatureVoteModal';
import { VIEWS } from '../../constants/viewConstants';
import { getMatchTypeOptions } from '../../constants/matchTypes';
import { getVenueTypeOptions, DEFAULT_VENUE_TYPE } from '../../constants/matchVenues';
import { TAB_VIEWS } from '../../constants/teamManagementTabs';
import { DETECTION_TYPES } from '../../services/sessionDetectionService';
import { checkForPendingMatches, createResumeDataForConfiguration } from '../../services/pendingMatchService';
import { discardPendingMatch, getPlayerStats } from '../../services/matchStateManager';
import { getPlayerConnectionDetails } from '../../services/connectorService';
import { getTemporaryPlayersForMatch } from '../../services/playerService';
import { PendingMatchResumeModal } from '../match/PendingMatchResumeModal';
import { suggestUpcomingOpponent } from '../../services/opponentPrefillService';
import { STORAGE_KEYS } from '../../constants/storageKeys';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = (value) => typeof value === 'string' && UUID_REGEX.test(value);
const teamPreferencesCacheManager = createPersistenceManager(STORAGE_KEYS.TEAM_PREFERENCES_CACHE, { teamId: null, fetchedAt: 0, preferences: {} });
const teamManagementTabCacheManager = createPersistenceManager(
  STORAGE_KEYS.TEAM_MANAGEMENT_ACTIVE_TAB,
  { tab: TAB_VIEWS.OVERVIEW }
);
const TEAM_PREFERENCES_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function ConfigurationScreen({ 
  allPlayers, 
  setAllPlayers,
  selectedSquadIds, 
  setSelectedSquadIds, 
  numPeriods, 
  setNumPeriods, 
  periodDurationMinutes, 
  setPeriodDurationMinutes, 
  periodGoalieIds, 
  setPeriodGoalieIds, 
  teamConfig,
  updateTeamConfig,
  selectedFormation,
  setSelectedFormation,
  updateFormationSelection,
  createTeamConfigFromSquadSize,
  formation,
  setFormation,
  alertMinutes,
  setAlertMinutes,
  handleStartPeriodSetup, 
  handleSaveConfiguration,
  selectedSquadPlayers,
  opponentTeam,
  setOpponentTeam,
  matchType,
  setMatchType,
  venueType,
  setVenueType,
  captainId,
  setCaptain,
  debugMode = false,
  authModal,
  syncPlayersFromTeamRoster,
  setCurrentMatchId,
  currentMatchId,
  setMatchCreated,
  hasActiveConfiguration,
  setHasActiveConfiguration,
  clearStoredState,
  configurationSessionId = 0,
  resumeMatchId,
  onNavigateBack,
  onNavigateTo,
  onOpenTemporaryPlayerModal,
  pushNavigationState,
  removeFromNavigationStack
}) {
  // Translation hook
  const { t } = useTranslation(['configuration', 'common']);

  const [isVoteModalOpen, setIsVoteModalOpen] = React.useState(false);
  const [formationToVoteFor, setFormationToVoteFor] = React.useState(null);
  const [playerSyncStatus, setPlayerSyncStatus] = React.useState({ loading: false, message: '' });
  const [saveConfigStatus, setSaveConfigStatus] = React.useState({ loading: false, message: '', error: null });
  const [shareLinkNotification, setShareLinkNotification] = React.useState({ isOpen: false, title: '', message: '' });
  const [showAddPlayerOptionsModal, setShowAddPlayerOptionsModal] = useState(false);
  
  // Direct pending match state (no navigation complexity)
  const [pendingMatches, setPendingMatches] = useState([]);
  const [showPendingMatchModal, setShowPendingMatchModal] = useState(false);
  const [pendingMatchLoading, setPendingMatchLoading] = useState(false);
  const [pendingMatchModalClosed, setPendingMatchModalClosed] = useState(() => {
    // Initialize from sessionStorage if available to prevent race condition on mount
    try {
      return sessionStorage.getItem('sport-wizard-pending-modal-closed') === 'true';
    } catch {
      return false;
    }
  });
  const [pendingMatchError, setPendingMatchError] = useState(null);
  const [resumeData, setResumeData] = useState(null);
  // Track if current match is a resumed match to prevent inappropriate state clearing
  const [isResumedMatch, setIsResumedMatch] = useState(false);
  const [teamPreferences, setTeamPreferences] = useState(null);
  const [captainHistoryCounts, setCaptainHistoryCounts] = useState({});

  // Track connection details to determine if connector onboarding should show
  const [connectionDetails, setConnectionDetails] = useState({
    matchedConnections: new Map(),
    unmatchedExternalPlayers: [],
    hasConnectedProvider: false
  });

  const currentFormat = teamConfig?.format || FORMATS.FORMAT_5V5;
  const effectiveVenueType = venueType ?? DEFAULT_VENUE_TYPE;
  const minPlayersRequired = React.useMemo(() => getMinimumPlayersForFormat(currentFormat), [currentFormat]);
  const maxPlayersAllowed = React.useMemo(() => getMaximumPlayersForFormat(currentFormat), [currentFormat]);
  const formatLabel = FORMAT_CONFIGS[currentFormat]?.label || currentFormat;
  const meetsMinimumSelection = selectedSquadIds.length >= minPlayersRequired;
  const exceedsFormatMaximum = selectedSquadIds.length > maxPlayersAllowed;
  const withinFormatBounds = meetsMinimumSelection && !exceedsFormatMaximum;
  // Ref to track resume data processing to prevent infinite loops
  const resumeDataProcessedRef = useRef(false);
  // Ref to track if resume data has been applied to prevent reapplication
  const resumeDataAppliedRef = useRef(false);
  // Ref to track team sync completion to coordinate with resume data processing
  const teamSyncCompletedRef = useRef(false);
  const isProcessingResumeDataRef = useRef(false);
  const processingTimeoutRef = useRef(null);
  const lastConfigSessionIdRef = useRef(configurationSessionId);
  const pendingMatchCheckQueuedRef = useRef(false);
  const resumeMatchRequestRef = useRef(null);
  const queuedResumeMatchIdRef = useRef(null);
  const pendingCheckAfterLoadingRef = useRef(false);
  const opponentPrefillAttemptedTeamRef = useRef(null);
  // Consolidated preference application state to avoid scattered refs
  const preferenceStateRef = useRef({
    status: 'idle', // idle | applying
    appliedSessionId: null,
    pendingSessionId: null
  });

  const updatePreferenceState = React.useCallback((updates) => {
    preferenceStateRef.current = { ...preferenceStateRef.current, ...updates };
  }, []);

  const resetPreferenceState = React.useCallback(() => {
    preferenceStateRef.current = { status: 'idle', appliedSessionId: null, pendingSessionId: null };
  }, []);

  const beginPreferenceApplication = React.useCallback(() => {
    updatePreferenceState({ status: 'applying' });
  }, [updatePreferenceState]);

  const completePreferenceApplication = React.useCallback((sessionId) => {
    const { pendingSessionId } = preferenceStateRef.current;
    updatePreferenceState({
      status: 'idle',
      appliedSessionId: sessionId,
      pendingSessionId: pendingSessionId === sessionId ? null : pendingSessionId
    });
  }, [updatePreferenceState]);

  const setAppliedPreferencesSession = React.useCallback((sessionId) => {
    updatePreferenceState({ appliedSessionId: sessionId });
  }, [updatePreferenceState]);

  const setPendingPreferencesSession = React.useCallback((sessionId) => {
    updatePreferenceState({ pendingSessionId: sessionId });
  }, [updatePreferenceState]);
  
  // Component unmount cleanup to prevent memory leaks
  React.useEffect(() => {
    return () => {
      // Reset all resume processing refs on component unmount

      resumeDataProcessedRef.current = false;
      resumeDataAppliedRef.current = false;
      isProcessingResumeDataRef.current = false;
      teamSyncCompletedRef.current = false;
      resetPreferenceState();
      
      // Clear any pending timeout
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
        processingTimeoutRef.current = null;
      }
    };
  }, [resetPreferenceState]); // Empty dependency array ensures this only runs on mount/unmount
  
  // Auth and Team hooks (must be before useEffect that use these values)
  const { isAuthenticated, user, sessionDetectionResult } = useAuth();
  const { currentTeam, teamPlayers, hasTeams, hasClubs, loading: teamLoading, loadTeamPreferences } = useTeam();
  const sessionDetectionType = sessionDetectionResult?.type;
  const isPageRefresh = sessionDetectionType === DETECTION_TYPES.PAGE_REFRESH;
  const teamLoadingRef = React.useRef(teamLoading);
  const hasActiveConfigurationRef = React.useRef(hasActiveConfiguration);
  const teamConfigRef = React.useRef(teamConfig);
  const selectedSquadCountRef = React.useRef(selectedSquadIds.length);
  const formationGoalieRef = React.useRef(formation?.goalie || null);
  const isResumedMatchRef = React.useRef(isResumedMatch);

  React.useEffect(() => {
    teamLoadingRef.current = teamLoading;
  }, [teamLoading]);

  React.useEffect(() => {
    hasActiveConfigurationRef.current = hasActiveConfiguration;
  }, [hasActiveConfiguration]);

  React.useEffect(() => {
    teamConfigRef.current = teamConfig;
  }, [teamConfig]);

  React.useEffect(() => {
    selectedSquadCountRef.current = selectedSquadIds.length;
  }, [selectedSquadIds.length]);

  React.useEffect(() => {
    formationGoalieRef.current = formation?.goalie || null;
  }, [formation?.goalie]);

  React.useEffect(() => {
    isResumedMatchRef.current = isResumedMatch;
  }, [isResumedMatch]);
  
  
  // Reset pending match modal closure state when user signs out
  React.useEffect(() => {
    if (!user?.id) {
      // User signed out - reset closure state (sign-in state is handled by initializer)
      setPendingMatchModalClosed(false);
    }
  }, [user?.id]);

  // Browser back integration
  React.useEffect(() => {
    if (pushNavigationState) {
      pushNavigationState(() => {
        // Close any open modals
        setShowPendingMatchModal(false);
        setIsVoteModalOpen(false);

        // Navigate back
        onNavigateBack();
      });
    }

    return () => {
      if (removeFromNavigationStack) {
        removeFromNavigationStack();
      }
    };
  }, [pushNavigationState, removeFromNavigationStack, onNavigateBack]);

  // Load captain history for dropdown context (last 6 months)
  React.useEffect(() => {
    let isActive = true;

    const fetchCaptainHistory = async () => {
      if (!isAuthenticated || !currentTeam?.id) {
        setCaptainHistoryCounts({});
        return;
      }

      try {
        const now = new Date();
        const sixMonthsAgo = new Date(now);
        sixMonthsAgo.setMonth(now.getMonth() - 6);

        const result = await getPlayerStats(currentTeam.id, sixMonthsAgo, now);
        if (!isActive) {
          return;
        }

        if (result?.success && Array.isArray(result.players)) {
          const captainCounts = {};
          result.players.forEach(player => {
            if (!player.id) {
              return;
            }
            captainCounts[player.id] = player.matchesAsCaptain || 0;
          });
          setCaptainHistoryCounts(captainCounts);
        } else {
          if (result?.error) {
            console.error('Failed to load captain history:', result.error);
          }
          setCaptainHistoryCounts({});
        }
      } catch (error) {
        if (isActive) {
          setCaptainHistoryCounts({});
        }
        console.error('Captain history load error:', error);
      }
    };

    fetchCaptainHistory();

    return () => {
      isActive = false;
    };
  }, [isAuthenticated, currentTeam?.id]);
  
  // Function to load pending matches with error handling
  const loadPendingMatches = React.useCallback(async (teamId, showLoadingState = false) => {
    try {
      if (showLoadingState) {
        setPendingMatchLoading(true);
      }
      setPendingMatchError(null);
      
      const result = await checkForPendingMatches(teamId);
      if (result.shouldShow && result.pendingMatches.length > 0) {
        setPendingMatches(result.pendingMatches);
        setShowPendingMatchModal(true);
      }
    } catch (error) {
      console.error('❌ Failed to check for pending matches:', error);
      setPendingMatchError({
        message: t('configuration:pendingMatch.errors.checkFailed'),
        detail: error.message,
        canRetry: true
      });
    } finally {
      setPendingMatchLoading(false);
    }
  }, [t]);

  // Direct pending match detection (no navigation complexity)
  React.useEffect(() => {
    if (sessionDetectionResult?.type === DETECTION_TYPES.NEW_SIGN_IN && 
        currentTeam?.id && 
        !teamLoading && 
        !pendingMatchModalClosed) {
      // Add 1 second delay before showing the modal so user sees main UI first
      setTimeout(() => {
        loadPendingMatches(currentTeam.id, false);
      }, 1500); // 1.5 seconds delay
    }
  }, [sessionDetectionResult, currentTeam?.id, teamLoading, pendingMatchModalClosed, loadPendingMatches]);
  
  // Retry handler for pending match loading
  const retryLoadPendingMatches = React.useCallback(() => {
    if (currentTeam?.id) {
      loadPendingMatches(currentTeam.id, true);
    }
  }, [currentTeam?.id, loadPendingMatches]);

  const triggerPendingMatchesForNewSession = React.useCallback((teamId) => {
    if (!teamId) {
      return;
    }

    if (pendingMatchLoading) {
      pendingCheckAfterLoadingRef.current = true;
      return;
    }

    pendingCheckAfterLoadingRef.current = false;
    setPendingMatchError(null);
    setPendingMatches([]);
    setShowPendingMatchModal(false);
    setPendingMatchModalClosed(false);

    try {
      sessionStorage.removeItem('sport-wizard-pending-modal-closed');
    } catch {
      // Ignore storage access errors (e.g., Safari private mode)
    }

    loadPendingMatches(teamId, true);
  }, [loadPendingMatches, pendingMatchLoading]);

  const fetchTeamPreferences = React.useCallback(async (teamId) => {
    if (!teamId || !loadTeamPreferences) {
      return null;
    }

    const preferences = await loadTeamPreferences(teamId, { forceRefresh: true });
    setTeamPreferences(preferences || null);
    return preferences;
  }, [loadTeamPreferences, setTeamPreferences]);

  const applyPreferences = React.useCallback((preferences) => {
    if (!preferences || Object.keys(preferences).length === 0) {
      return;
    }

    const snapshotTeamConfig = teamConfigRef.current;
    const preferredFormat = preferences.matchFormat;
    const formatIsSupported = Object.values(FORMATS).includes(preferredFormat);
    const fallbackFormat = snapshotTeamConfig?.format || FORMATS.FORMAT_5V5;
    const formatToUse = formatIsSupported ? preferredFormat : fallbackFormat;

    const minPlayersForFormat = getMinimumPlayersForFormat(formatToUse);
    const maxPlayersForFormat = getMaximumPlayersForFormat(formatToUse);
    const baseSquadSize = snapshotTeamConfig?.squadSize || selectedSquadCountRef.current || minPlayersForFormat;
    const boundedSquadSize = Math.min(Math.max(baseSquadSize, minPlayersForFormat), maxPlayersForFormat);

    const validFormations = getValidFormations(formatToUse, boundedSquadSize);
    const preferredFormation = preferences.formation;
    const formatDefaultFormation = FORMAT_CONFIGS[formatToUse]?.defaultFormation || FORMATIONS.FORMATION_2_2;
    const formationDefinition = preferredFormation ? FORMATION_DEFINITIONS[preferredFormation] : null;
    const formationSupported = preferredFormation && validFormations.includes(preferredFormation) && formationDefinition?.status !== 'coming-soon';
    const formationToUse = formationSupported ? preferredFormation : formatDefaultFormation;

    const newTeamConfig = createTeamConfig(formatToUse, boundedSquadSize, formationToUse);

    updateTeamConfig(newTeamConfig);
    setSelectedFormation(formationToUse);

    const initialTemplate = getInitialFormationTemplate(newTeamConfig, formationGoalieRef.current);
    if (initialTemplate && typeof setFormation === 'function') {
      setFormation(initialTemplate);
    }

    if (PERIOD_OPTIONS.includes(preferences.numPeriods)) {
      setNumPeriods(preferences.numPeriods);
    }

    if (DURATION_OPTIONS.includes(preferences.periodLength)) {
      setPeriodDurationMinutes(preferences.periodLength);
    }
  }, [updateTeamConfig, setSelectedFormation, setFormation, setNumPeriods, setPeriodDurationMinutes]);

  const applyTeamPreferencesForSession = React.useCallback(async (sessionId) => {
    if (!currentTeam?.id) {
      return;
    }

    const hasAppliedForSession = preferenceStateRef.current.appliedSessionId === sessionId;
    const isResumeBlocked = () => isProcessingResumeDataRef.current || resumeDataAppliedRef.current || isResumedMatchRef.current;

    if (hasAppliedForSession) {
      return;
    }

    const shouldQueueApplication = teamLoadingRef.current || preferenceStateRef.current.status === 'applying' || isResumeBlocked();
    if (shouldQueueApplication) {
      setPendingPreferencesSession(sessionId);
      return;
    }

    beginPreferenceApplication();
    let shouldMarkApplied = true;

    try {
      const preferences = await fetchTeamPreferences(currentTeam.id);

      if (isResumeBlocked()) {
        setPendingPreferencesSession(sessionId);
        shouldMarkApplied = false;
        return;
      }

      if (hasActiveConfigurationRef.current) {
        // User already configuring; only capture captain preference but skip overriding configuration
        return;
      }

      applyPreferences(preferences);
    } catch (error) {
      console.error('Failed to apply team preferences:', error);
    } finally {
      if (shouldMarkApplied) {
        completePreferenceApplication(sessionId);
      } else {
        updatePreferenceState({ status: 'idle' });
      }

      const queuedSessionId = preferenceStateRef.current.pendingSessionId;
      if (queuedSessionId && queuedSessionId !== sessionId && currentTeam?.id && !teamLoadingRef.current) {
        setPendingPreferencesSession(null);
        applyTeamPreferencesForSession(queuedSessionId);
      }
    }
  }, [currentTeam?.id, fetchTeamPreferences, applyPreferences, setPendingPreferencesSession, beginPreferenceApplication, completePreferenceApplication, updatePreferenceState]);

  React.useEffect(() => {
    if (configurationSessionId === undefined || configurationSessionId === null) {
      return;
    }

    if (lastConfigSessionIdRef.current === configurationSessionId) {
      return;
    }

    lastConfigSessionIdRef.current = configurationSessionId;
    opponentPrefillAttemptedTeamRef.current = null;

    if (!configurationSessionId) {
      return;
    }

    if (currentTeam?.id && !teamLoading) {
      triggerPendingMatchesForNewSession(currentTeam.id);
    } else {
      pendingMatchCheckQueuedRef.current = true;
    }
  }, [configurationSessionId, currentTeam?.id, teamLoading, triggerPendingMatchesForNewSession]);

  React.useEffect(() => {
    if (!pendingMatchCheckQueuedRef.current) {
      return;
    }

    if (!currentTeam?.id || teamLoading) {
      return;
    }

    pendingMatchCheckQueuedRef.current = false;
    triggerPendingMatchesForNewSession(currentTeam.id);
  }, [currentTeam?.id, teamLoading, triggerPendingMatchesForNewSession]);

  React.useEffect(() => {
    if (configurationSessionId === undefined || configurationSessionId === null) {
      return;
    }

    if (!sessionDetectionType) {
      return;
    }

    const { appliedSessionId } = preferenceStateRef.current;

    if (isPageRefresh && appliedSessionId === null) {
      // Preserve in-progress configuration on page reloads; allow reapplication only for new sessions
      setAppliedPreferencesSession(configurationSessionId);
      setPendingPreferencesSession(null);
      return;
    }

    if (appliedSessionId === configurationSessionId) {
      return;
    }

    if (!currentTeam?.id || teamLoading) {
      setPendingPreferencesSession(configurationSessionId);
      return;
    }

    applyTeamPreferencesForSession(configurationSessionId);
  }, [configurationSessionId, currentTeam?.id, teamLoading, applyTeamPreferencesForSession, sessionDetectionType, isPageRefresh, setAppliedPreferencesSession, setPendingPreferencesSession]);

  React.useEffect(() => {
    if (!currentTeam?.id || teamLoading) {
      return;
    }

    const pendingPreferencesSessionId = preferenceStateRef.current.pendingSessionId;
    if (pendingPreferencesSessionId === null || pendingPreferencesSessionId === undefined) {
      return;
    }

    if (preferenceStateRef.current.appliedSessionId === pendingPreferencesSessionId) {
      setPendingPreferencesSession(null);
      return;
    }

    applyTeamPreferencesForSession(pendingPreferencesSessionId);
  }, [currentTeam?.id, teamLoading, applyTeamPreferencesForSession, setPendingPreferencesSession]);

  React.useEffect(() => {
    if (pendingMatchLoading) {
      return;
    }

    if (!pendingCheckAfterLoadingRef.current) {
      return;
    }

    pendingCheckAfterLoadingRef.current = false;

    if (currentTeam?.id && !teamLoading) {
      triggerPendingMatchesForNewSession(currentTeam.id);
    } else {
      pendingMatchCheckQueuedRef.current = true;
    }
  }, [pendingMatchLoading, currentTeam?.id, teamLoading, triggerPendingMatchesForNewSession]);
  
  // Modal closure handler - defined early so other handlers can use it
  // When "Configure New Match" is clicked, it should reset the same way as "New Game" from Hamburger Menu
  const handleClosePendingMatchModal = React.useCallback(() => {
    setShowPendingMatchModal(false);
    setPendingMatchModalClosed(true);
    sessionStorage.setItem('sport-wizard-pending-modal-closed', 'true');

    // Reset state to match "New Game" behavior from Hamburger Menu
    setOpponentTeam('');  // Clear opponent team name
    setMatchType('league');  // Reset to default match type
    setVenueType(DEFAULT_VENUE_TYPE);
    setCaptain(null);     // Clear captain selection

    // Clear resumed match state and data
    setIsResumedMatch(false);
    setResumeData(null);
    resumeDataAppliedRef.current = false;
    setAppliedPreferencesSession(null);
    setPendingPreferencesSession(configurationSessionId);

    clearStoredState();   // Clear localStorage and match state

    // Re-apply team preferences for the active configuration session
    applyTeamPreferencesForSession(configurationSessionId);
  }, [setOpponentTeam, setMatchType, setVenueType, setCaptain, clearStoredState, configurationSessionId, applyTeamPreferencesForSession, setAppliedPreferencesSession, setPendingPreferencesSession]);
  React.useEffect(() => {
    setTeamPreferences(null);
  }, [currentTeam?.id, configurationSessionId]);

  // Modal closure handler specifically for resume flow - does NOT clear stored state
  const handleResumeMatchModalClose = React.useCallback(() => {
    setShowPendingMatchModal(false);
    setPendingMatchModalClosed(true);
    sessionStorage.setItem('sport-wizard-pending-modal-closed', 'true');
    // NOTE: No clearStoredState() call - preserve resumed match ID and state
  }, []);

  const loadTemporaryPlayersForMatch = React.useCallback(async (matchId) => {
    if (!matchId) {
      return;
    }

    const result = await getTemporaryPlayersForMatch(matchId);
    if (!result.success || result.players.length === 0) {
      return;
    }

    const gamePlayers = result.players.map(player => ({
      ...convertTeamPlayerToGamePlayer(player),
      isTemporary: true,
      matchId: player.match_id
    }));

    setAllPlayers(prev => {
      const existingIds = new Set(prev.map(player => player.id));
      const newPlayers = gamePlayers.filter(player => !existingIds.has(player.id));
      return newPlayers.length > 0 ? [...prev, ...newPlayers] : prev;
    });
  }, [setAllPlayers]);

  const applyPendingMatchResume = React.useCallback(async (pendingMatch) => {
    if (!pendingMatch?.initial_config) {
      console.error('❌ MATCH SELECTION ERROR: No match found or missing initial_config');
      return;
    }

    setPendingMatchLoading(true);
    try {
      const resumeDataForConfig = createResumeDataForConfiguration(pendingMatch.initial_config);

      if (resumeDataForConfig) {
        // Use resume-specific closure to avoid clearing stored state
        handleResumeMatchModalClose();

        // Set resume data directly - no navigation needed
        setResumeData(resumeDataForConfig);

        // CRITICAL: Set currentMatchId to the resumed match
        setCurrentMatchId(pendingMatch.id);
        setMatchCreated(true);
        console.log('✅ Resume match: Set currentMatchId to', pendingMatch.id, 'and matchCreated to true');
        await loadTemporaryPlayersForMatch(pendingMatch.id);
      } else {
        console.error('❌ Failed to create resume data from pending match');
        handleResumeMatchModalClose();
      }
    } catch (error) {
      console.error('❌ Error resuming pending match:', error);
      handleResumeMatchModalClose();
    } finally {
      setPendingMatchLoading(false);
    }
  }, [
    handleResumeMatchModalClose,
    setCurrentMatchId,
    setMatchCreated,
    loadTemporaryPlayersForMatch,
    setPendingMatchLoading,
    setResumeData
  ]);

  const resolvePendingMatchById = React.useCallback(async (matchId) => {
    if (!matchId) {
      return null;
    }

    const existingMatch = pendingMatches.find(match => match.id === matchId);
    if (existingMatch?.initial_config) {
      return existingMatch;
    }

    if (!currentTeam?.id) {
      return null;
    }

    const result = await checkForPendingMatches(currentTeam.id);
    return result.pendingMatches.find(match => match.id === matchId) || null;
  }, [pendingMatches, currentTeam?.id]);

  const resumePendingMatchById = React.useCallback(async (matchId, options = {}) => {
    const { trackRequest = false } = options;

    if (!matchId || (trackRequest && resumeMatchRequestRef.current === matchId)) {
      return;
    }

    try {
      const matchToResume = await resolvePendingMatchById(matchId);

      if (!matchToResume?.initial_config) {
        console.error('❌ MATCH SELECTION ERROR: No match found or missing initial_config');
        return;
      }

      await applyPendingMatchResume(matchToResume);
    } catch (error) {
      console.error('❌ Error resuming pending match:', error);
    } finally {
      if (trackRequest) {
        resumeMatchRequestRef.current = matchId;
      }
      if (queuedResumeMatchIdRef.current === matchId) {
        queuedResumeMatchIdRef.current = null;
      }
    }
  }, [applyPendingMatchResume, resolvePendingMatchById]);

  const [syncStatus, setSyncStatus] = useState({ loading: false, message: '', error: null });
  const [showMigration, setShowMigration] = useState(false);
  
  // Formation voting hook
  const { 
    submitVote, 
    loading: voteLoading, 
    error: voteError, 
    successMessage: voteSuccessMessage, 
    infoMessage: voteInfoMessage,
    clearMessages: clearVoteMessages,
    isAuthenticated: isVoteAuthenticated
  } = useFormationVotes();

  // Sync team roster to game state on mount and when team/players change
  React.useEffect(() => {
    // Guard: Skip team sync if resume processing is currently happening
    if (isProcessingResumeDataRef.current) {
      return;
    }
    
    // Check sync requirements with descriptive variables
    const hasCurrentTeam = !!currentTeam;
    const rosterPlayers = (teamPlayers || []).filter(player => player.on_roster !== false);
    const hasTeamPlayers = rosterPlayers.length > 0;
    const hasSyncFunction = !!syncPlayersFromTeamRoster;
    
    
    if (!hasCurrentTeam || !hasTeamPlayers || !hasSyncFunction) {
      // Mark sync as "completed" when skipped so resume processing doesn't wait indefinitely
      teamSyncCompletedRef.current = true;
      return; // No team selected or no sync function available
    }

    const performSync = async () => {
      setPlayerSyncStatus({ loading: true, message: t('configuration:sync.syncing') });
      teamSyncCompletedRef.current = false;

      try {
        const result = syncPlayersFromTeamRoster(rosterPlayers);

        if (result.success) {
          setPlayerSyncStatus({
            loading: false,
            message: result.message === 'No sync needed' ? '' : t('configuration:sync.syncSuccess', { message: result.message })
          });
          
          // Mark team sync as completed
          teamSyncCompletedRef.current = true;
          
          // Clear success message after 3 seconds
          if (result.message !== 'No sync needed') {
            setTimeout(() => {
              setPlayerSyncStatus(prev => ({ ...prev, message: '' }));
            }, 3000);
          }
        } else {
          setPlayerSyncStatus({ 
            loading: false, 
            message: `⚠️ Sync failed: ${result.error}` 
          });
          teamSyncCompletedRef.current = false;
        }
      } catch (error) {
        console.error('ConfigurationScreen sync error:', error);
        setPlayerSyncStatus({ 
          loading: false, 
          message: `⚠️ Sync error: ${error.message}` 
        });
        teamSyncCompletedRef.current = false;
      }
    };

    performSync();
  }, [currentTeam, currentTeam?.id, teamPlayers, syncPlayersFromTeamRoster, t]);

  const handleFormationChange = (newFormation) => {
    const definition = FORMATION_DEFINITIONS[newFormation];
    if (definition && definition.status === 'coming-soon') {
      setFormationToVoteFor(newFormation);
      setIsVoteModalOpen(true);
    } else {
      updateFormationSelection(newFormation);
    }
  };

  const handleVoteConfirm = async () => {
    if (!formationToVoteFor) return;
    
    // Clear any previous messages
    clearVoteMessages();
    
    // Check if user is authenticated
    if (!isVoteAuthenticated) {
      console.error('User must be authenticated to vote');
      // The modal will handle showing authentication requirement
      return;
    }
    
    // Submit the vote for the actively selected format
    const result = await submitVote(formationToVoteFor, currentFormat);
    
    if (result.success) {
      // Close modal on success after a brief delay to show success message
      setTimeout(() => {
        setIsVoteModalOpen(false);
        // Clear the formation to vote for
        setFormationToVoteFor(null);
      }, 2000);
    }
    // On error, keep modal open to show error message
  };

  // Update DataSyncManager when user changes
  useEffect(() => {
    if (user?.id) {
      dataSyncManager.setUserId(user.id);

      // Check if user has local data that could be migrated
      const localMatches = dataSyncManager.getLocalMatches();
      const hasLocalMatches = Array.isArray(localMatches) && localMatches.length > 0;
      setShowMigration(hasLocalMatches);
    } else {
      dataSyncManager.setUserId(null);
      setShowMigration(false);
    }
  }, [user]);

  // Load player connection details to determine if connector onboarding should show
  useEffect(() => {
    const loadConnectionDetails = async () => {
      if (!currentTeam?.id || !isAuthenticated) {
        setConnectionDetails({
          matchedConnections: new Map(),
          unmatchedExternalPlayers: [],
          hasConnectedProvider: false
        });
        return;
      }

      try {
        const details = await getPlayerConnectionDetails(currentTeam.id);
        setConnectionDetails(details);
      } catch (error) {
        console.error('Error loading connection details:', error);
        // Keep default state on error
      }
    };

    loadConnectionDetails();
  }, [currentTeam?.id, isAuthenticated]);

  // Determine which players to show and if team has no players
  const rosterPlayers = (teamPlayers || []).filter(player => player.on_roster !== false);
  const hasNoTeamPlayers = isAuthenticated && currentTeam && rosterPlayers.length === 0;
  const temporaryPlayersForMatch = React.useMemo(() => {
    if (!currentMatchId) {
      return [];
    }

    return allPlayers.filter(player => player.isTemporary && player.matchId === currentMatchId);
  }, [allPlayers, currentMatchId]);

  const rosterPlayersForList = rosterPlayers.map(player => ({
    id: player.id,
    displayName: player.display_name,
    firstName: player.first_name,
    lastName: player.last_name,
    jerseyNumber: player.jersey_number,
    isTemporary: false
  }));

  const temporaryPlayersForList = temporaryPlayersForMatch.map(player => ({
    id: player.id,
    displayName: player.displayName,
    firstName: player.firstName,
    lastName: player.lastName,
    jerseyNumber: player.jerseyNumber,
    isTemporary: true
  }));

  const playersToShow = React.useMemo(() => {
    if (!isAuthenticated || !currentTeam) {
      return allPlayers;
    }

    const rosterIds = new Set(rosterPlayersForList.map(player => player.id));
    return [
      ...rosterPlayersForList,
      ...temporaryPlayersForList.filter(player => !rosterIds.has(player.id))
    ];
  }, [isAuthenticated, currentTeam, allPlayers, rosterPlayersForList, temporaryPlayersForList]);
  const selectedIdsSet = React.useMemo(() => new Set(selectedSquadIds), [selectedSquadIds]);
  const areAllEligibleSelected = playersToShow.length > 0 &&
    playersToShow.every(player => selectedIdsSet.has(player.id)) &&
    selectedSquadIds.length === playersToShow.length;

  // Determine if connector onboarding should be shown
  const hasConnectedProvider = connectionDetails?.hasConnectedProvider ?? false;
  const shouldShowOnboarding = Boolean(currentTeam && isAuthenticated) && shouldShowRosterConnectorOnboarding(
    teamPlayers,
    hasConnectedProvider
  );

  // Determine if unmapped players banner should be shown
  const activeRosterCount = rosterPlayers.length;
  const unmappedFromConnected = (connectionDetails?.unmatchedExternalPlayers || [])
    .filter(record => record.connectorStatus === 'connected');
  const hasUnmappedPlayers = unmappedFromConnected.length > 0;
  const firstProviderName = hasUnmappedPlayers
    ? unmappedFromConnected[0].providerName
    : '';

  const shouldShowUnmappedBanner =
    Boolean(currentTeam && isAuthenticated) &&
    activeRosterCount < 4 &&
    hasUnmappedPlayers;

  // Clear selectedSquadIds when team has no players to avoid showing orphaned selections
  // Only clear on NEW_SIGN_IN to preserve squad selection on page refresh
  // BUT: Skip this cleanup when resume data is being processed to avoid clearing resumed selections
  React.useEffect(() => {
    // Skip cleanup if resume data is present or being processed or this is a resumed match
    if (isProcessingResumeDataRef.current || isResumedMatch) {
      return;
    }

    if (hasNoTeamPlayers && selectedSquadIds.length > 0 &&
        sessionDetectionResult?.type === DETECTION_TYPES.NEW_SIGN_IN) {
      setSelectedSquadIds([]);
    }
  }, [hasNoTeamPlayers, selectedSquadIds.length, setSelectedSquadIds, sessionDetectionResult, isResumedMatch]);

  // Reset resume processing flags on NEW_SIGN_IN to ensure each sign-in can process resume data independently
  React.useEffect(() => {
    if (sessionDetectionResult?.type === DETECTION_TYPES.NEW_SIGN_IN) {
      // Reset flags to allow new resume data to be processed
      resumeDataProcessedRef.current = false;
      resumeDataAppliedRef.current = false;
      isProcessingResumeDataRef.current = false;

      // Clear any pending timeout on NEW_SIGN_IN
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
        processingTimeoutRef.current = null;
      }
    }
  }, [sessionDetectionResult]);

  // Add "already processed" guard flag to prevent infinite loops
  const [newSignInProcessed, setNewSignInProcessed] = useState(false);

  // Reset processing flag when session changes (to handle new sign-ins)
  React.useEffect(() => {
    if (sessionDetectionResult?.type !== DETECTION_TYPES.NEW_SIGN_IN) {
      setNewSignInProcessed(false);
    }
  }, [sessionDetectionResult?.type]);

  // Smart NEW_SIGN_IN state clearing - only clear if no active configuration is in progress
  React.useEffect(() => {
    if (sessionDetectionResult?.type === DETECTION_TYPES.NEW_SIGN_IN &&
        !hasActiveConfiguration &&
        !isResumedMatch &&
        !isProcessingResumeDataRef.current &&
        !newSignInProcessed &&
        clearStoredState) {

      // Mark as processed to prevent infinite loops
      setNewSignInProcessed(true);

      // Clear stored state and configuration data
      clearStoredState();

      // Explicitly clear configuration-specific state that might persist
      setOpponentTeam('');
      setPeriodGoalieIds({});
      setCaptain(null); // Always reset on new sign-in; preference reapply will set permanent captain if configured

      // Allow preferences to reapply for this session after cleanup
      setAppliedPreferencesSession(null);
      setPendingPreferencesSession(configurationSessionId);

      // Note: selectedSquadIds will be cleared by the existing effect below when team has no players
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionDetectionResult, hasActiveConfiguration, isResumedMatch, newSignInProcessed, clearStoredState, configurationSessionId, setAppliedPreferencesSession, setPendingPreferencesSession]);

  // Ensure allPlayers is updated with team data when authenticated
  // This is necessary for selectedSquadPlayers to work correctly with team data
  React.useEffect(() => {
    if (!isAuthenticated || !currentTeam) {
      return;
    }

    if (rosterPlayers.length === 0 && temporaryPlayersForMatch.length === 0) {
      return;
    }

    const transformedTeamPlayers = rosterPlayers.map(player => ({
      id: player.id,
      displayName: player.display_name,
      firstName: player.first_name,
      lastName: player.last_name,
      jerseyNumber: player.jersey_number,
      // Initialize player stats if not present (required for game logic)
      stats: {
        timeOnFieldSeconds: 0,
        timeAsAttackerSeconds: 0,
        timeAsDefenderSeconds: 0,
        timeAsGoalieSeconds: 0,
        timeAsMidfielderSeconds: 0,
        currentStatus: 'substitute',
        currentPosition: null,
        currentRole: null,
        isInactive: false,
        lastStintStartTimeEpoch: null
      }
    }));

    const rosterIds = new Set(transformedTeamPlayers.map(player => player.id));
    const mergedPlayers = [
      ...transformedTeamPlayers,
      ...temporaryPlayersForMatch.filter(player => !rosterIds.has(player.id))
    ];

    // Only update allPlayers if the data has actually changed
    const currentNames = allPlayers.map(player => ({ id: player.id, name: player.displayName }));
    const newNames = mergedPlayers.map(player => ({ id: player.id, name: player.displayName }));
    if (JSON.stringify(currentNames) !== JSON.stringify(newNames)) {
      setAllPlayers(mergedPlayers);
    }
  }, [isAuthenticated, currentTeam, rosterPlayers, temporaryPlayersForMatch, allPlayers, setAllPlayers]);

  // Handle resume data from pending match
  React.useEffect(() => {
    
    // Guard: Skip if team sync is currently in progress (avoid interference)
    if (playerSyncStatus.loading) {
      return;
    }
    
    
    // Process resume data from pending match modal selection (only apply once)
    if (resumeData && !isProcessingResumeDataRef.current && !resumeDataAppliedRef.current) {
      // Mark as processing to prevent concurrent execution
      isProcessingResumeDataRef.current = true;
      
      // Set timeout protection to auto-reset stuck processing state
      processingTimeoutRef.current = setTimeout(() => {
        if (isProcessingResumeDataRef.current) {
          console.warn('⚠️ Resume processing timeout - auto-resetting stuck state after 10 seconds');
          isProcessingResumeDataRef.current = false;
          processingTimeoutRef.current = null;
        }
      }, 10000); // 10-second timeout

      try {
        // CRITICAL: Set team config atomically with formation to prevent state timing issues
        // This prevents formation compatibility checks from overriding the restored config
        if (resumeData.teamConfig) {
          console.log('🔄 RESUME: Restoring team config:', {
            fullConfig: resumeData.teamConfig
          });
          updateTeamConfig(resumeData.teamConfig);

          // Separately sync the formation UI state without triggering compatibility logic
          if (resumeData.formation || resumeData.teamConfig.formation) {
            const formationToSet = resumeData.formation || resumeData.teamConfig.formation;
            console.log('🔄 RESUME: Syncing formation UI state:', formationToSet);
            setSelectedFormation(formationToSet);
          }
        }

        // Pre-populate match configuration
        if (resumeData.periods) {
          setNumPeriods(resumeData.periods);
        }

        if (resumeData.periodDurationMinutes) {
          setPeriodDurationMinutes(resumeData.periodDurationMinutes);
        }

        if (resumeData.opponentTeam !== undefined) {
          setOpponentTeam(resumeData.opponentTeam);
        }

        if (resumeData.matchType) {
          setMatchType(resumeData.matchType);
        }

        if (resumeData.venueType) {
          setVenueType(resumeData.venueType);
        }

        if (resumeData.captainId) {
          setCaptain(resumeData.captainId);
        }

        // CRITICAL: Set squad selection LAST to prevent auto-config from overriding team config
        if (resumeData.squadSelection) {
          console.log('🔄 RESUME: Restoring squad selection (final step):', resumeData.squadSelection);
          setSelectedSquadIds(resumeData.squadSelection);
        }
        
        if (resumeData.periodGoalies) {
          setPeriodGoalieIds(resumeData.periodGoalies);
        }

        // CRITICAL: Restore formation data with position assignments
        if (resumeData.formationData) {
          console.log('🔄 RESUME: Restoring formation data with position assignments:', resumeData.formationData);
          setFormation(resumeData.formationData);
        }

        // Mark resume data as processed and applied
        resumeDataProcessedRef.current = true;
        resumeDataAppliedRef.current = true;
        isProcessingResumeDataRef.current = false;

        // Set flags for resumed match state
        setIsResumedMatch(true);
        setHasActiveConfiguration(true);

        // Clear the timeout since processing completed successfully
        if (processingTimeoutRef.current) {
          clearTimeout(processingTimeoutRef.current);
          processingTimeoutRef.current = null;
        }

        // DON'T clear resumeData - keep it for navigation persistence
        // setResumeData(null); // Removed - preserve resume data until new match starts
      } catch (error) {
        // Error handling: Reset refs and log the error
        console.error('❌ Resume data processing failed:', error);
        
        // Reset refs to prevent stuck states
        resumeDataProcessedRef.current = false;
        resumeDataAppliedRef.current = false;
        isProcessingResumeDataRef.current = false;

        // Clear the timeout since processing failed
        if (processingTimeoutRef.current) {
          clearTimeout(processingTimeoutRef.current);
          processingTimeoutRef.current = null;
        }

        // Don't clear resumeData on error - let user retry or manually clear
        // setResumeData(null); // Removed - preserve resume data for retry
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeData, setSelectedSquadIds, setNumPeriods, setPeriodDurationMinutes, 
      setOpponentTeam, setMatchType, setCaptain, updateTeamConfig, updateFormationSelection, 
      setPeriodGoalieIds]);

  // Reset the processing flag when resume data is cleared (for cleanup)
  // Note: alreadyProcessed flag is kept for debugging but no longer blocks processing
  React.useEffect(() => {
    if (!resumeData) {
      // Only reset processing flag - alreadyProcessed is kept for debugging
      isProcessingResumeDataRef.current = false;
      
      // Clear any pending timeout when resume data is cleared
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
        processingTimeoutRef.current = null;
      }
    }
  }, [resumeData]);
  const applySquadSelection = React.useCallback((updater) => {
    setSelectedSquadIds(prev => {
      const proposedIds = typeof updater === 'function' ? updater(prev) : updater;
      const uniqueIds = Array.isArray(proposedIds) ? Array.from(new Set(proposedIds)) : [];
      const isSameSelection = uniqueIds.length === prev.length && uniqueIds.every(id => prev.includes(id));

      if (isSameSelection) {
        return prev;
      }

      // Mark as active configuration when squad selection changes
      if (uniqueIds.length > 0) {
        setHasActiveConfiguration(true);
      }

      // Auto-create team configuration based on squad size
      // GUARD: Skip auto-configuration during resume data processing to prevent override
      if (uniqueIds.length >= minPlayersRequired && uniqueIds.length <= maxPlayersAllowed && !isProcessingResumeDataRef.current) {
        console.log('⚡ AUTO-CONFIG: Squad selection changed, triggering createTeamConfigFromSquadSize:', {
          squadSize: uniqueIds.length,
          currentTeamConfig: teamConfig
        });
        createTeamConfigFromSquadSize(uniqueIds.length, currentFormat);
      } else if (isProcessingResumeDataRef.current) {
        console.log('🛡️ AUTO-CONFIG: Skipped during resume processing to prevent override');
      }

      // Clear captain if the captain is being deselected
      if (captainId && !uniqueIds.includes(captainId)) {
        setCaptain(null);
      }

      return uniqueIds;
    });
  }, [setSelectedSquadIds, maxPlayersAllowed, setHasActiveConfiguration, minPlayersRequired, isProcessingResumeDataRef, createTeamConfigFromSquadSize, currentFormat, teamConfig, captainId, setCaptain]);


  const togglePlayerSelection = (playerId) => {
    applySquadSelection(prev => prev.includes(playerId)
      ? prev.filter(id => id !== playerId)
      : [...prev, playerId]);
  };

  const preferredCaptainId = React.useMemo(() => {
    const captainPreference = teamPreferences?.teamCaptain;
    if (!captainPreference) {
      return null;
    }

    return isUuid(captainPreference) ? captainPreference : null;
  }, [teamPreferences]);

  React.useEffect(() => {
    if (!preferredCaptainId) {
      return;
    }

    if (captainId) {
      return;
    }

    if (selectedSquadIds.length < minPlayersRequired) {
      return;
    }

    if (!selectedSquadIds.includes(preferredCaptainId)) {
      return;
    }

    setCaptain(preferredCaptainId);
  }, [preferredCaptainId, captainId, selectedSquadIds, minPlayersRequired, setCaptain]);

  React.useEffect(() => {
    if (captainId) {
      return;
    }

    if (!currentTeam?.id) {
      return;
    }

    if (selectedSquadIds.length < minPlayersRequired) {
      return;
    }

    const cached = teamPreferencesCacheManager.loadState();
    if (!cached?.teamId || cached.teamId !== currentTeam.id) {
      return;
    }

    if (!cached.fetchedAt || Date.now() - cached.fetchedAt > TEAM_PREFERENCES_CACHE_TTL_MS) {
      return;
    }

    const cachedCaptain = cached.preferences?.teamCaptain;
    if (!cachedCaptain || cachedCaptain === 'none' || !isUuid(cachedCaptain)) {
      return;
    }

    if (!selectedSquadIds.includes(cachedCaptain)) {
      return;
    }

    setTeamPreferences((prev) => prev || cached.preferences || null);
  }, [captainId, currentTeam?.id, selectedSquadIds, minPlayersRequired, setTeamPreferences]);

  const handleSelectAllPlayers = React.useCallback(() => {
    if (areAllEligibleSelected || playersToShow.length === 0) {
      return;
    }

    const rosterIds = playersToShow.map(player => player.id);
    applySquadSelection(rosterIds);
  }, [areAllEligibleSelected, playersToShow, applySquadSelection]);

  const handleOpenAddPlayerOptionsModal = React.useCallback(() => {
    setShowAddPlayerOptionsModal(true);

    if (pushNavigationState) {
      pushNavigationState(() => {
        setShowAddPlayerOptionsModal(false);
      }, 'add-player-options');
    }
  }, [pushNavigationState]);

  const handleCloseAddPlayerOptionsModal = React.useCallback(() => {
    setShowAddPlayerOptionsModal(false);

    if (removeFromNavigationStack) {
      removeFromNavigationStack();
    }
  }, [removeFromNavigationStack]);

  const handleAddPlayerToTeam = React.useCallback(() => {
    handleCloseAddPlayerOptionsModal();
    if (onNavigateTo) {
      onNavigateTo(VIEWS.TEAM_MANAGEMENT, {
        openToTab: TAB_VIEWS.ROSTER,
        openAddRosterPlayerModal: true
      });
    }
  }, [handleCloseAddPlayerOptionsModal, onNavigateTo]);

  const handleAddTemporaryPlayer = React.useCallback(() => {
    handleCloseAddPlayerOptionsModal();
    if (onOpenTemporaryPlayerModal) {
      onOpenTemporaryPlayerModal();
    }
  }, [handleCloseAddPlayerOptionsModal, onOpenTemporaryPlayerModal]);

  const handleGoalieChange = (period, playerId) => {
    // Mark as active configuration when goalie assignments change
    setHasActiveConfiguration(true);

    setPeriodGoalieIds(prev => {
      const newGoalieIds = { ...prev, [period]: playerId };
      if (period === 1) {
        for (let i = 2; i <= numPeriods; i++) {
          if (prev[i] === prev[1] || !prev[i]) {
            newGoalieIds[i] = playerId;
          }
        }
      }
      return newGoalieIds;
    });
  };

  const handleCaptainChange = (playerId) => {
    // Empty string means no captain selected
    const captainId = playerId === "" ? null : playerId;

    // Mark as active configuration when captain changes (but allow clearing captain)
    if (captainId) {
      setHasActiveConfiguration(true);
    }

    setCaptain(captainId);
  };

  const captainOptions = React.useMemo(() => {
    const squadOptions = selectedSquadPlayers
      .map(player => {
        const captainCount = captainHistoryCounts[player.id] ?? 0;
        const playerLabel = formatPlayerName(player);
        return {
          value: player.id,
          label: `${playerLabel} (${captainCount})`,
          captainCount,
          playerLabel
        };
      })
      .sort((a, b) => {
        if (a.captainCount !== b.captainCount) {
          return a.captainCount - b.captainCount;
        }
        return a.playerLabel.localeCompare(b.playerLabel, undefined, { sensitivity: 'base' });
      })
      .map(({ value, label }) => ({ value, label }));

    return [
      { value: "", label: t('configuration:captain.noCaptain') },
      ...squadOptions
    ];
  }, [captainHistoryCounts, selectedSquadPlayers, t]);

  const setOpponentTeamValue = React.useCallback((value, options = {}) => {
    const { markActive = true } = options;
    const sanitizedValue = sanitizeNameInput(value);

    if (markActive && sanitizedValue.trim()) {
      setHasActiveConfiguration(true);
    }

    setOpponentTeam(sanitizedValue);
  }, [setHasActiveConfiguration, setOpponentTeam]);

  const handleOpponentTeamChange = React.useCallback((value) => {
    setOpponentTeamValue(value);
  }, [setOpponentTeamValue]);

  const handleOpponentSuggestionSelect = React.useCallback((name) => {
    handleOpponentTeamChange(name);
  }, [handleOpponentTeamChange]);

  const handleMatchTypeChange = (value) => {
    setMatchType(value);
    setHasActiveConfiguration(true);
  };

  const handleVenueTypeChange = (value) => {
    setVenueType(value);
    setHasActiveConfiguration(true);
  };

  // Navigate to Team Management Connectors tab
  const handleNavigateToConnectors = () => {
    teamManagementTabCacheManager.saveState({ tab: TAB_VIEWS.CONNECTORS });
    onNavigateTo(VIEWS.TEAM_MANAGEMENT);
  };

  // Navigate to Team Management Roster tab
  const handleNavigateToRoster = () => {
    teamManagementTabCacheManager.saveState({ tab: TAB_VIEWS.ROSTER });
    onNavigateTo(VIEWS.TEAM_MANAGEMENT);
  };

  const handleFormatChange = React.useCallback((newFormat) => {
    if (!teamConfig) return;

    const formatConfig = FORMAT_CONFIGS[newFormat] || FORMAT_CONFIGS[FORMATS.FORMAT_5V5];
    const availableFormations = getValidFormations(newFormat, selectedSquadIds.length);
    const fallbackFormation = formatConfig.defaultFormation || FORMATIONS.FORMATION_2_2;
    const nextFormation = availableFormations.includes(selectedFormation)
      ? selectedFormation
      : fallbackFormation;

    const squadSize = teamConfig.squadSize || selectedSquadIds.length || (formatConfig.fieldPlayers + 1);
    const newTeamConfig = createTeamConfig(
      newFormat,
      squadSize,
      nextFormation
    );

    setSelectedFormation(nextFormation);
    updateTeamConfig(newTeamConfig);
    const initialTemplate = getInitialFormationTemplate(newTeamConfig, formation?.goalie || null);
    if (initialTemplate && typeof setFormation === 'function') {
      setFormation(initialTemplate);
    }
    setHasActiveConfiguration(true);
  }, [teamConfig, selectedSquadIds.length, selectedFormation, formation, setFormation, setSelectedFormation, updateTeamConfig, setHasActiveConfiguration]);

  const randomizeConfiguration = () => {
    // Clear existing selections
    setSelectedSquadIds([]);
    setPeriodGoalieIds({});
    setCaptain(null);

    // Determine format and squad size based on current format selection
    const isCurrently7v7 = currentFormat === FORMATS.FORMAT_7V7;
    const squadSize = isCurrently7v7 ? 10 : 7;
    const format = isCurrently7v7 ? FORMATS.FORMAT_7V7 : FORMATS.FORMAT_5V5;

    // Randomly select players based on format
    const randomPlayers = getRandomPlayers(playersToShow, squadSize);
    const randomPlayerIds = randomPlayers.map(p => p.id);
    setSelectedSquadIds(randomPlayerIds);

    // Select formation based on format
    let randomFormation;

    if (isCurrently7v7) {
      // 7v7: Randomly select between available 7v7 formations
      const formations7v7 = [FORMATIONS.FORMATION_2_2_2, FORMATIONS.FORMATION_2_3_1]
        .filter(formation => FORMATION_DEFINITIONS[formation]?.status === 'available');

      // Fallback to first available formation if filtering yields no results
      randomFormation = formations7v7.length > 0
        ? formations7v7[Math.floor(Math.random() * formations7v7.length)]
        : FORMAT_CONFIGS[FORMATS.FORMAT_7V7].defaultFormation;
    } else {
      // 5v5: Always select 2-2 formation (single substitution system)
      randomFormation = FORMATIONS.FORMATION_2_2;
    }

    handleFormatChange(format);
    updateFormationSelection(randomFormation);

    // Create team config based on format
    createTeamConfigFromSquadSize(squadSize, format);

    // Randomize goalie assignments (use current numPeriods setting)
    const goalieAssignments = randomizeGoalieAssignments(randomPlayers, numPeriods);
    setPeriodGoalieIds(goalieAssignments);

    // Set a random opponent name
    const opponentNames = ['Lions FC', 'Eagles United', 'Sharks', 'Thunder', 'Storm', 'Wildcats'];
    const randomOpponent = opponentNames[Math.floor(Math.random() * opponentNames.length)];
    setOpponentTeamValue(randomOpponent);
  };

  // Autofill opponent using connector data when available
  React.useEffect(() => {
    const teamId = currentTeam?.id;

    if (!teamId || teamLoading) {
      return;
    }

    if (isResumedMatch) {
      return;
    }

    const sessionKey = `${teamId}-${configurationSessionId || 0}`;

    if (opponentTeam && opponentTeam.trim().length > 0) {
      if (opponentPrefillAttemptedTeamRef.current !== sessionKey) {
        opponentPrefillAttemptedTeamRef.current = sessionKey;
      }
      return;
    }
    if (opponentPrefillAttemptedTeamRef.current === sessionKey) {
      return;
    }

    let isCancelled = false;

    const prefillOpponent = async () => {
      opponentPrefillAttemptedTeamRef.current = sessionKey;

      try {
        const result = await suggestUpcomingOpponent(teamId);
        if (!isCancelled && result?.opponent) {
          setOpponentTeamValue(result.opponent, { markActive: false });
        }
      } catch (error) {
        console.error('Failed to auto-populate opponent from upcoming matches:', error);
      }
    };

    prefillOpponent();

    return () => {
      isCancelled = true;
    };
  }, [currentTeam?.id, teamLoading, opponentTeam, isResumedMatch, setOpponentTeamValue, configurationSessionId]);

  const handleMigrateData = async () => {
    setSyncStatus({ loading: true, message: 'Migrating local data to cloud...', error: null });

    try {
      const result = await dataSyncManager.migrateLocalDataToCloud();

      if (result.success) {
        setSyncStatus({
          loading: false,
          message: result.message,
          error: null
        });
        setShowMigration(false);

        // Clear success message after 5 seconds
        setTimeout(() => {
          setSyncStatus({ loading: false, message: '', error: null });
        }, 5000);
      } else {
        setSyncStatus({
          loading: false,
          message: '',
          error: result.error || 'Migration failed'
        });
      }
    } catch (error) {
      setSyncStatus({
        loading: false,
        message: '',
        error: 'Migration failed: ' + error.message
      });
    }
  };

  const handleDismissMigration = () => {
    setShowMigration(false);
  };

  // Direct pending match modal handlers (no navigation complexity)
  const handleResumePendingMatch = React.useCallback(async (matchId) => {
    await resumePendingMatchById(matchId);
  }, [resumePendingMatchById]);

  const handleDiscardPendingMatch = React.useCallback(async (matchId) => {
    if (!matchId) return;

    setPendingMatchLoading(true);
    try {
      await discardPendingMatch(matchId);
      
      // Remove the discarded match from the array
      setPendingMatches(prev => prev.filter(match => match.id !== matchId));
      
      // If no matches remain, close the modal using consistent closure logic
      if (pendingMatches.length <= 1) {
        handleClosePendingMatchModal();
      }
    } catch (error) {
      console.error('❌ Error discarding pending match:', error);
      handleClosePendingMatchModal();
    } finally {
      setPendingMatchLoading(false);
    }
  }, [pendingMatches, handleClosePendingMatchModal]);

  React.useEffect(() => {
    if (resumeMatchId && resumeMatchRequestRef.current !== resumeMatchId) {
      queuedResumeMatchIdRef.current = resumeMatchId;
    }

    const matchIdToResume = queuedResumeMatchIdRef.current;

    if (!matchIdToResume || resumeMatchRequestRef.current === matchIdToResume) {
      return;
    }

    if (!currentTeam?.id || teamLoading || pendingMatchLoading) {
      return;
    }

    resumePendingMatchById(matchIdToResume, { trackRequest: true });
  }, [resumeMatchId, currentTeam?.id, teamLoading, pendingMatchLoading, resumePendingMatchById]);

  React.useEffect(() => {
    return () => {
      queuedResumeMatchIdRef.current = null;
      resumeMatchRequestRef.current = null;
    };
  }, []);

  const handleSaveConfigClick = async () => {
    if (!handleSaveConfiguration) {
      console.warn('handleSaveConfiguration is not provided');
      return;
    }

    setSaveConfigStatus({ loading: true, message: 'Saving configuration...', error: null });

    try {
      const result = await handleSaveConfiguration();
      
      if (result.success) {
        setSaveConfigStatus({
          loading: false,
          message: `✅ ${result.message || 'Configuration saved successfully'}`,
          error: null
        });
        
        // Scroll to top to show success banner
        scrollToTopSmooth();
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSaveConfigStatus(prev => ({ ...prev, message: '' }));
        }, 3000);
      } else {
        setSaveConfigStatus({
          loading: false,
          message: '',
          error: result.error || t('configuration:saveConfig.errors.failed')
        });
      }
    } catch (error) {
      console.error('Save configuration error:', error);
      setSaveConfigStatus({
        loading: false,
        message: '',
        error: t('configuration:saveConfig.errors.failedWithMessage', { error: error.message })
      });
    }
  };

  const handleGetLiveLinkClick = async () => {
    if (!handleSaveConfiguration) {
      console.warn('handleSaveConfiguration is not provided');
      return;
    }

    if (!isAuthenticated || !currentTeam) {
      setShareLinkNotification({
        isOpen: true,
        title: t('configuration:liveLinkNotifications.authRequired'),
        message: t('configuration:liveLinkNotifications.authRequiredMessage')
      });
      return;
    }

    setSaveConfigStatus({ loading: true, message: t('configuration:liveLinkNotifications.creating'), error: null });

    try {
      const result = await handleSaveConfiguration();

      if (result.success) {
        const matchId = result.matchId;

        if (!matchId) {
          throw new Error(t('configuration:saveConfig.errors.noMatchId'));
        }

        const copyResult = await copyLiveMatchUrlToClipboard(matchId);

        if (copyResult.success) {
          setShareLinkNotification({
            isOpen: true,
            title: t('configuration:liveLinkNotifications.linkCopied'),
            message: t('configuration:liveLinkNotifications.linkCopiedMessage')
          });
        } else {
          setShareLinkNotification({
            isOpen: true,
            title: t('configuration:liveLinkNotifications.liveMatchUrl'),
            message: copyResult.url
          });
        }

        setSaveConfigStatus({ loading: false, message: '', error: null });
      } else {
        setSaveConfigStatus({
          loading: false,
          message: '',
          error: result.error || t('configuration:liveLinkNotifications.failed')
        });
      }
    } catch (error) {
      console.error('Get live link error:', error);
      setSaveConfigStatus({
        loading: false,
        message: '',
        error: t('configuration:liveLinkNotifications.failedWithError', { error: error.message })
      });
    }
  };

  // Show team management for authenticated users who need to set up teams
  // If user has no clubs at all, they need to create/join a club first
  // If user has clubs but no teams, they need to create/join a team
  if (isAuthenticated && (!hasClubs || (hasClubs && !hasTeams) || !currentTeam)) {
    return (
      <div className="space-y-4">
        <TeamManagement />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isAuthenticated && currentTeam && (
        <div className="p-3 bg-sky-600/20 border border-sky-500 rounded-lg">
          <div className="text-sky-200 font-medium">Team: {currentTeam.club?.name} {currentTeam.name}</div>
          {playerSyncStatus.loading && (
            <div className="text-sky-300 text-sm mt-1">
              🔄 {playerSyncStatus.message}
            </div>
          )}
          {!playerSyncStatus.loading && playerSyncStatus.message && (
            <div className="text-sky-300 text-sm mt-1">
              {playerSyncStatus.message}
            </div>
          )}
        </div>
      )}
      
      {/* Pending Match Error Display */}
      {pendingMatchError && (
        <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
          <div className="flex items-start space-x-3">
            <div className="flex-1">
              <div className="text-red-300 font-medium text-sm">{t('configuration:pendingMatch.errors.title')}</div>
              <div className="text-red-200 text-sm mt-1">
                {pendingMatchError.message}
              </div>
              {process.env.NODE_ENV === 'development' && pendingMatchError.detail && (
                <div className="text-red-400 text-xs mt-1 font-mono">
                  {pendingMatchError.detail}
                </div>
              )}
              {pendingMatchError.canRetry && (
                <div className="mt-2">
                  <Button
                    onClick={retryLoadPendingMatches}
                    variant="outline"
                    size="sm"
                    disabled={pendingMatchLoading}
                    className="text-red-300 border-red-500/50 hover:bg-red-500/20"
                  >
                    {pendingMatchLoading ? t('configuration:pendingMatch.errors.retrying') : t('configuration:pendingMatch.errors.tryAgain')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cloud Data Sync Section */}
      {isAuthenticated ? (
        <div className="space-y-3">
          {/* Data Migration Alert */}
          {showMigration && (
            <div className="p-4 bg-emerald-900/30 border border-emerald-600/50 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Upload className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-emerald-300 text-sm">{t('configuration:dataMigration.title')}</h3>
                  <p className="text-emerald-200 text-sm mt-1">
                    {t('configuration:dataMigration.description')}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button
                      onClick={handleMigrateData}
                      variant="primary"
                      size="sm"
                      disabled={syncStatus.loading}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      {syncStatus.loading ? t('configuration:dataMigration.migrating') : t('configuration:dataMigration.migrateButton')}
                    </Button>
                    <Button
                      onClick={handleDismissMigration}
                      variant="secondary"
                      size="sm"
                      disabled={syncStatus.loading}
                    >
                      {t('configuration:dataMigration.laterButton')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sync Status Messages */}
          {syncStatus.message && (
            <div className="p-3 bg-emerald-900/20 border border-emerald-600 rounded-lg">
              <p className="text-emerald-200 text-sm">✓ {syncStatus.message}</p>
            </div>
          )}

          {syncStatus.error && (
            <div className="p-3 bg-rose-900/20 border border-rose-600 rounded-lg">
              <p className="text-rose-200 text-sm">❌ {syncStatus.error}</p>
            </div>
          )}

          {/* Save Configuration Status Messages */}
          {saveConfigStatus.message && (
            <div className="p-3 bg-emerald-900/20 border border-emerald-600 rounded-lg">
              <p className="text-emerald-200 text-sm">{saveConfigStatus.message}</p>
            </div>
          )}

          {saveConfigStatus.error && (
            <div className="p-3 bg-rose-900/20 border border-rose-600 rounded-lg">
              <p className="text-rose-200 text-sm">❌ {saveConfigStatus.error}</p>
            </div>
          )}
        </div>
      ) : (
        /* Cloud Sync Features for Anonymous Users */
        <FeatureGate
          feature="cloud synchronization"
          description={t('configuration:cloudSync.featureDescription')}
          variant="inline"
          authModal={authModal}
        >
          <div className="p-4 bg-slate-800 border border-slate-600 rounded-lg opacity-50">
            <div className="flex items-center space-x-3">
              <Cloud className="w-8 h-8 text-slate-400" />
              <div>
                <div className="text-slate-300 font-medium">{t('configuration:cloudSync.available')}</div>
                <div className="text-slate-400 text-sm">{t('configuration:cloudSync.description')}</div>
              </div>
            </div>
          </div>
        </FeatureGate>
      )}

      <h2 className="text-xl font-semibold text-sky-300 flex items-center">
        <Settings className="mr-2 h-6 w-6" />{t('configuration:header.title')}
      </h2>

      {/* Squad Selection */}
      <div className="p-3 bg-slate-700 rounded-md">
        <h3 className="text-base font-medium text-sky-200 mb-2">
          {hasNoTeamPlayers
            ? t('configuration:squad.addPlayerTitle')
            : t('configuration:squad.selectTitle', { count: selectedSquadIds.length })
          }
        </h3>
        {hasNoTeamPlayers ? (
          <div className="text-center py-8">
            {shouldShowUnmappedBanner ? (
              /* Show ONLY unmapped players banner when available */
              <UnmappedPlayersBanner
                firstProviderName={firstProviderName}
                onNavigateToRoster={handleNavigateToRoster}
              />
            ) : (
              /* Show empty state when no unmapped players */
              <>
                <UserPlus className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                <p className="text-lg font-medium text-slate-300 mb-2">{t('configuration:squad.noPlayers.title')}</p>
                <p className="text-sm text-slate-400 mb-4">
                  {t('configuration:squad.noPlayers.description')}
                </p>
                <div className="flex justify-center">
                  <Button
                    onClick={handleOpenAddPlayerOptionsModal}
                    variant="primary"
                    Icon={UserPlus}
                  >
                    {t('configuration:squad.addPlayer')}
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Unmapped Players Banner */}
            {shouldShowUnmappedBanner && (
              <div className="mb-3">
                <UnmappedPlayersBanner
                  firstProviderName={firstProviderName}
                  onNavigateToRoster={handleNavigateToRoster}
                />
              </div>
            )}

            <div className="flex justify-end mb-2">
              <Button
                onClick={handleSelectAllPlayers}
                variant="secondary"
                size="sm"
                disabled={areAllEligibleSelected || playersToShow.length === 0}
              >
                {areAllEligibleSelected ? t('configuration:squad.allSelected') : t('configuration:squad.selectAll')}
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {playersToShow.map(player => (
                <label key={player.id} className={`flex items-center space-x-2 p-1.5 rounded-md cursor-pointer transition-all ${selectedSquadIds.includes(player.id) ? 'bg-sky-600 text-white' : 'bg-slate-600 hover:bg-slate-500'}`}>
                  <input
                    type="checkbox"
                    checked={selectedSquadIds.includes(player.id)}
                    onChange={() => togglePlayerSelection(player.id)}
                    className="form-checkbox h-5 w-5 text-sky-500 bg-slate-800 border-slate-500 rounded focus:ring-sky-400"
                  />
                  <span>{formatPlayerName(player)}</span>
                  {player.isTemporary && (
                    <span className="text-xs text-slate-300">{t('configuration:squad.temporaryLabel')}</span>
                  )}
                </label>
              ))}
            </div>
            <div className="flex justify-center mt-3">
              <Button
                onClick={handleOpenAddPlayerOptionsModal}
                variant="secondary"
                size="sm"
                Icon={UserPlus}
              >
                {t('configuration:squad.addPlayer')}
              </Button>
            </div>
            {exceedsFormatMaximum && (
              <p className="mt-2 text-xs text-amber-300">
                {t('configuration:squad.exceededFormat', { count: selectedSquadIds.length, format: formatLabel, max: maxPlayersAllowed })}
              </p>
            )}
          </>
        )}
      </div>

      {/* Connector Onboarding - shown when 0-3 players and no connected provider */}
      {shouldShowOnboarding && (
        <div className="mt-4">
          <RosterConnectorOnboarding onNavigateToConnectors={handleNavigateToConnectors} />
        </div>
      )}

      {/* Match Details */}
      <div className="p-3 bg-slate-700 rounded-md space-y-4">
        <div>
          <label htmlFor="opponentTeam" className="block text-sm font-medium text-sky-200 mb-1">{t('configuration:matchDetails.opponentLabel')}</label>
          <OpponentNameAutocomplete
            teamId={currentTeam?.id}
            value={opponentTeam}
            onChange={handleOpponentTeamChange}
            onSelect={handleOpponentSuggestionSelect}
            inputId="opponentTeam"
            placeholder={t('configuration:matchDetails.opponentPlaceholder')}
          />
        </div>

        <div>
          <label htmlFor="matchType" className="block text-sm font-medium text-sky-200 mb-1">{t('configuration:matchDetails.matchTypeLabel')}</label>
          <Select
            id="matchType"
            value={matchType}
            onChange={handleMatchTypeChange}
            options={getMatchTypeOptions(t).map(option => ({
              value: option.value,
              label: option.label
            }))}
          />
        </div>

        <div>
          <label htmlFor="venueType" className="block text-sm font-medium text-sky-200 mb-1">{t('configuration:matchDetails.venueLabel')}</label>
          <Select
            id="venueType"
            value={effectiveVenueType}
            onChange={handleVenueTypeChange}
            options={getVenueTypeOptions(t).map(option => ({
              value: option.value,
              label: option.label
            }))}
          />
        </div>
      </div>

      {/* Game Settings */}
      <div className="p-3 bg-slate-700 rounded-md grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="numPeriods" className="block text-sm font-medium text-sky-200 mb-1">{t('configuration:gameSettings.periodsLabel')}</label>
          <Select value={numPeriods} onChange={value => setNumPeriods(Number(value))} options={PERIOD_OPTIONS} id="numPeriods" />
        </div>
        <div>
          <label htmlFor="periodDuration" className="block text-sm font-medium text-sky-200 mb-1">{t('configuration:gameSettings.durationLabel')}</label>
          <Select value={periodDurationMinutes} onChange={value => setPeriodDurationMinutes(Number(value))} options={DURATION_OPTIONS} id="periodDuration" />
        </div>
        <div>
          <label htmlFor="alertMinutes" className="block text-sm font-medium text-sky-200 mb-1">{t('configuration:gameSettings.alertLabel')}</label>
          <Select value={alertMinutes} onChange={value => setAlertMinutes(Number(value))} options={getAlertOptions(t)} id="alertMinutes" />
        </div>
      </div>

      <div className="p-3 bg-slate-700 rounded-md">
        <h3 className="text-base font-medium text-sky-200 mb-2 flex items-center">
          <Layers className="mr-2 h-4 w-4" />
          {t('configuration:formation.header')}
        </h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="matchFormat" className="block text-sm font-medium text-sky-200 mb-1">{t('configuration:formation.formatLabel')}</label>
            <Select
              id="matchFormat"
              value={currentFormat}
              onChange={value => handleFormatChange(value)}
              options={Object.values(FORMATS).map(format => ({
                value: format,
                label: FORMAT_CONFIGS[format]?.label || format
              }))}
            />
          </div>

          <div className="space-y-3">
            <div>
              <label htmlFor="formation" className="block text-sm font-medium text-sky-200 mb-1">
                {t('configuration:formation.formationLabel')}
              </label>
              <Select
                id="formation"
                value={selectedFormation}
                onChange={value => handleFormationChange(value)}
                options={getValidFormations(currentFormat, selectedSquadIds.length).map(formation => ({
                  value: formation,
                  label: FORMATION_DEFINITIONS[formation].label
                }))}
              />
            </div>

            <FormationPreview formation={selectedFormation} className="mt-3" />
          </div>

          {!withinFormatBounds && meetsMinimumSelection && (
            <p className="text-xs text-amber-300">
              {t('configuration:formation.formatExceeded', { count: selectedSquadIds.length, format: formatLabel, max: maxPlayersAllowed })}
            </p>
          )}
        </div>
      </div>


      {/* Goalie Assignment */}
      {withinFormatBounds && (
        <div className="p-3 bg-slate-700 rounded-md">
          <h3 className="text-base font-medium text-sky-200 mb-2">{t('configuration:goalies.header')}</h3>
          <div className="space-y-2">
            {Array.from({ length: numPeriods }, (_, i) => i + 1).map(period => (
              <div key={period}>
                <label htmlFor={`goalie_p${period}`} className="block text-sm font-medium text-sky-200 mb-1">{t('configuration:goalies.periodLabel', { period })}</label>
                <Select
                  id={`goalie_p${period}`}
                  value={periodGoalieIds[period] || ""}
                  onChange={value => handleGoalieChange(period, value)}
                  options={selectedSquadPlayers.map(p => ({ value: p.id, label: formatPlayerName(p) }))}
                  placeholder={t('configuration:goalies.placeholder')}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Captain Assignment */}
      {selectedSquadIds.length >= minPlayersRequired && teamPreferences?.teamCaptain !== 'none' && (
        <div className="p-3 bg-slate-700 rounded-md">
          <h3 className="text-base font-medium text-sky-200 mb-2">{t('configuration:captain.header')}</h3>
          <div>
            <label htmlFor="captain" className="block text-sm font-medium text-sky-200 mb-1">{t('configuration:captain.label')}</label>
            <Select
              id="captain"
              value={captainId || ""}
              onChange={value => handleCaptainChange(value)}
              options={captainOptions}
            />
            <p className="text-xs text-slate-400 mt-1">{t('configuration:captain.hint')}</p>
          </div>
        </div>
      )}

      {/* Save Configuration Button - Only show for authenticated users with team context */}
      {isAuthenticated && currentTeam && handleSaveConfiguration && (
        <Button
          onClick={handleSaveConfigClick}
          disabled={
            saveConfigStatus.loading ||
            !withinFormatBounds
          }
          variant="secondary"
          Icon={Save}
        >
          {saveConfigStatus.loading ? t('configuration:buttons.savingConfig') : t('configuration:buttons.saveConfig')}
        </Button>
      )}

      {/* Get Live Match Link Button - Only show for authenticated users with team context */}
      {isAuthenticated && currentTeam && handleSaveConfiguration && (
        <Button
          onClick={handleGetLiveLinkClick}
          disabled={
            saveConfigStatus.loading ||
            !withinFormatBounds
          }
          variant="secondary"
          Icon={Share2}
        >
          {saveConfigStatus.loading ? t('configuration:buttons.creatingLink') : t('configuration:buttons.getLiveLink')}
        </Button>
      )}

      <Button
        onClick={handleStartPeriodSetup}
        disabled={
          (!withinFormatBounds) ||
          !Array.from({ length: numPeriods }, (_, i) => periodGoalieIds[i + 1]).every(Boolean)
        }
        Icon={Play}
      >
        {t('configuration:buttons.proceedToPeriod')}
      </Button>

      {/* Debug Mode Randomize Button */}
      {debugMode && (
        <Button 
          onClick={randomizeConfiguration} 
          variant="warning"
          Icon={Shuffle}
          className="bg-amber-600 hover:bg-amber-700 text-white"
        >
          {t('configuration:buttons.randomize')}
        </Button>
      )}

      <FeatureVoteModal
        isOpen={isVoteModalOpen}
        onClose={() => {
          setIsVoteModalOpen(false);
          setFormationToVoteFor(null);
          clearVoteMessages();
        }}
        onConfirm={handleVoteConfirm}
        featureName={formationToVoteFor}
        loading={voteLoading}
        error={voteError}
        successMessage={voteSuccessMessage}
        infoMessage={voteInfoMessage}
        isAuthenticated={isVoteAuthenticated}
        authModal={authModal}
      >
        <p>{t('configuration:formationVoting.description')}</p>
      </FeatureVoteModal>

      <ThreeOptionModal
        isOpen={showAddPlayerOptionsModal}
        onPrimary={handleAddPlayerToTeam}
        onSecondary={handleAddTemporaryPlayer}
        onTertiary={handleCloseAddPlayerOptionsModal}
        title={t('configuration:addPlayerModal.title')}
        message={t('configuration:addPlayerModal.message')}
        primaryText={t('configuration:addPlayerModal.addToTeam')}
        secondaryText={t('configuration:addPlayerModal.addTemporary')}
        tertiaryText={t('configuration:addPlayerModal.cancel')}
        primaryVariant="primary"
        secondaryVariant="secondary"
        tertiaryVariant="secondary"
      />

      {/* Direct Pending Match Resume Modal (no navigation complexity) */}
      <PendingMatchResumeModal
        isOpen={showPendingMatchModal}
        onResume={handleResumePendingMatch}
        onDiscard={handleDiscardPendingMatch}
        onClose={handleClosePendingMatchModal}
        pendingMatches={pendingMatches}
        isLoading={pendingMatchLoading}
      />

      {/* Notification modal for live link sharing */}
      <NotificationModal
        isOpen={shareLinkNotification.isOpen}
        onClose={() => setShareLinkNotification({ isOpen: false, title: '', message: '' })}
        title={shareLinkNotification.title}
        message={shareLinkNotification.message}
      />
    </div>
  );
}
